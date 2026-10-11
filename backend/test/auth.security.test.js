import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import User from "../src/models/User.js";
import EmailVerification from "../src/models/EmailVerification.js";
import RefreshToken from "../src/models/RefreshToken.js";
import PasswordReset from "../src/models/PasswordReset.js";
import ProfileOtp from "../src/models/ProfileOtp.js";
import { registerUser, loginWithGoogle, loginUser, verifyRegistrationOtp, resendRegistrationOtp } from "../src/services/auth.service.js";
import { requestPasswordReset, verifyPasswordResetOtp, resetPassword } from "../src/services/passwordReset.service.js";
import { hashOtp, matchesOtp } from "../src/utils/otp.js";
import { verifyAccessToken, hashToken } from "../src/utils/token.js";
import { registerSchema } from "../src/validators/auth.validator.js";
import { OAuth2Client } from "google-auth-library";
import { verifyGoogleCredential } from "../src/services/googleAuth.service.js";

// Deliberately separate from other integration fixtures. Never load .env or
// accept a target URI; sender injection prevents any real email/provider call.
before(async () => {
  process.env.JWT_ACCESS_SECRET = "fyce-auth-security-test-only-access";
  process.env.JWT_REFRESH_SECRET = "fyce-auth-security-test-only-refresh";
  process.env.JWT_ACCESS_EXPIRES = "1h";
  await mongoose.connect("mongodb://127.0.0.1:27028/fyce_auth_security_test", { serverSelectionTimeoutMS: 5000 });
  assert.equal(mongoose.connection.name, "fyce_auth_security_test");
  await mongoose.connection.dropDatabase();
  await Promise.all([User.init(), EmailVerification.init(), RefreshToken.init(), PasswordReset.init(), ProfileOtp.init()]);
});
after(async () => {
  if (mongoose.connection.readyState === 1) {
    assert.equal(mongoose.connection.name, "fyce_auth_security_test");
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});

let fixture = 0;
const pending = async () => {
  const n = ++fixture;
  const payload = { fullName: "Pending QA", username: `pendingqa${n}`, email: `pendingqa${n}@example.test`, phone: "0901234567", password: "OriginalPassword123" };
  let sent;
  const result = await registerUser(payload, { send: async value => { sent = value; } });
  return { payload, result, sent };
};
const pauseNextHash = () => {
  const original = bcrypt.hash;
  let release, started;
  const gate = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { started = resolve; });
  bcrypt.hash = async (...args) => { started(); await gate; return original(...args); };
  return { ready, resume: () => { bcrypt.hash = original; release(); } };
};

test("Google claim discards attacker-set unverified password and pending credentials", async () => {
  const { payload, result } = await pending();
  const expiresAt = new Date(Date.now() + 60000);
  await RefreshToken.create({ userId: result.userId, tokenHash: hashToken("old-unverified-session"), expiresAt });
  await ProfileOtp.create({ userId: result.userId, hash: "old-profile-otp", expiresAt });
  await PasswordReset.create({ userId: result.userId, email: payload.email, otpHash: "old-reset-otp", otpExpiresAt: expiresAt, expiresAt });
  const google = await loginWithGoogle({ emailAuthoritative: true, googleId: "google-claim-qa", email: payload.email, fullName: "Verified owner" });
  const current = await User.findById(result.userId).select("+password");
  assert.equal(current.password, undefined);
  assert.equal(current.isActive, true);
  assert.equal(current.fullName, "Verified owner");
  assert.equal(current.authVersion, 1);
  assert.equal(verifyAccessToken(google.accessToken).ver, 1);
  await assert.rejects(loginUser({ identifier: payload.email, password: payload.password }), /INVALID_CREDENTIALS/);
  for (const Model of [EmailVerification, ProfileOtp, PasswordReset]) assert.equal(await Model.countDocuments({ userId: current._id }), 0);
  assert.equal(await RefreshToken.countDocuments({ userId: current._id }), 1);
  await assert.rejects(registerUser({ ...payload, userId: result.userId, registrationToken: result.registrationToken }, { send: async () => {} }), /ACCOUNT_ALREADY_ACTIVE/);
});

test("Google linking keeps a verified local password and accepts short email prefixes", async () => {
  const member = await User.create({ username: "verifiedlocal", email: "verifiedlocal@example.test", fullName: "Local owner", password: await bcrypt.hash("VerifiedPassword123", 12), isActive: true });
  const linked = await loginWithGoogle({ emailAuthoritative: true, googleId: "google-local-qa", email: member.email, fullName: "Local owner" });
  assert.equal(linked.user.id, String(member._id));
  assert.ok((await loginUser({ identifier: member.email, password: "VerifiedPassword123" })).accessToken);
  const short = await loginWithGoogle({ emailAuthoritative: true, googleId: "google-short-qa", email: "a@example.test", fullName: "Short QA" });
  assert.ok(short.user.username.length >= 3);
});

test("third-party Google email cannot automatically claim a local account but stable linked identity works", async () => {
  const member = await User.create({ username: "thirdpartylocal", email: "thirdpartylocal@example.test", fullName: "Local owner", password: await bcrypt.hash("VerifiedPassword123", 12), isActive: true });
  await assert.rejects(loginWithGoogle({ googleId: "third-party-qa", email: member.email, fullName: "QA", emailAuthoritative: false }), error => error.status === 403);
  assert.equal((await User.findById(member._id)).googleId, undefined);
  await User.updateOne({ _id: member._id }, { googleId: "already-linked-third-party" });
  const linked = await loginWithGoogle({ googleId: "already-linked-third-party", email: member.email, fullName: "QA", emailAuthoritative: false });
  assert.equal(linked.user.id, member.id);
});

test("Google email authority is derived only from verified Gmail or hosted-domain claims", async () => {
  process.env.GOOGLE_CLIENT_ID = "qa-google-client";
  const original = OAuth2Client.prototype.verifyIdToken;
  let claims;
  OAuth2Client.prototype.verifyIdToken = async () => ({ getPayload: () => claims });
  try {
    for (const [email, hd, authoritative] of [["owner@gmail.com", undefined, true], ["owner@example.test", "example.test", true], ["owner@example.test", undefined, false]]) {
      claims = { sub: "google-sub-qa", email, email_verified: true, hd, iss: "https://accounts.google.com", aud: "qa-google-client", exp: Math.floor(Date.now() / 1000) + 300 };
      assert.equal((await verifyGoogleCredential("mock-verified-credential")).emailAuthoritative, authoritative);
    }
    claims.email_verified = "true";
    await assert.rejects(verifyGoogleCredential("mock-verified-credential"), /GOOGLE_EMAIL_NOT_VERIFIED/);
  } finally { OAuth2Client.prototype.verifyIdToken = original; }
});

test("non-authoritative Google email cannot preclaim a new active account or issue credentials", async () => {
  const candidate = { googleId: "untrusted-new-google-qa", email: "untrusted-new-google@example.test", fullName: "QA" };
  const tokensBefore = await RefreshToken.countDocuments();
  for (const emailAuthoritative of [false, undefined]) {
    await assert.rejects(loginWithGoogle({ ...candidate, emailAuthoritative }), error => error.status === 403);
  }
  assert.equal(await User.countDocuments({ email: candidate.email }), 0);
  assert.equal(await User.countDocuments({ googleId: candidate.googleId }), 0);
  assert.equal(await RefreshToken.countDocuments(), tokensBefore);
});

test("registration continuation requires proof, rotates it, and never becomes an access JWT", async () => {
  const { payload, result } = await pending();
  const edited = { ...payload, userId: result.userId, password: "ChangedPassword456", email: "edited-pending@example.test" };
  await assert.rejects(registerUser(edited, { send: async () => {} }), error => error.status === 403);
  assert.throws(() => verifyAccessToken(result.registrationToken));
  const other = await pending();
  await assert.rejects(registerUser({ ...edited, registrationToken: other.result.registrationToken }, { send: async () => {} }), error => error.status === 403);
  const originalNow = Date.now;
  Date.now = () => originalNow() + 25 * 60 * 60 * 1000;
  try {
    await assert.rejects(registerUser({ ...edited, registrationToken: result.registrationToken }, { send: async () => {} }), error => error.status === 403);
  } finally { Date.now = originalNow; }
  const newer = await registerUser({ ...edited, registrationToken: result.registrationToken }, { send: async () => {} });
  assert.notEqual(newer.registrationToken, result.registrationToken);
  await assert.rejects(registerUser({ ...edited, registrationToken: result.registrationToken }, { send: async () => {} }), error => error.status === 403);
  const stored = await User.findById(result.userId).select("+password");
  assert.equal(stored.email, edited.email);
  assert.ok(await bcrypt.compare(edited.password, stored.password));
});

test("legacy same-password continuation works but cannot modify inactive admins", async () => {
  const { payload, result } = await pending();
  const resumed = await registerUser({ ...payload, userId: result.userId, fullName: "Resumed QA" }, { send: async () => {} });
  assert.ok(resumed.registrationToken);
  const inactiveAdmin = await User.create({ username: "inactiveadminqa", email: "inactiveadminqa@example.test", fullName: "Inactive admin", password: await bcrypt.hash(payload.password, 12), role: "admin", isActive: false });
  await assert.rejects(registerUser({ ...payload, userId: inactiveAdmin.id, email: inactiveAdmin.email, username: inactiveAdmin.username }, { send: async () => {} }), error => error.status === 403);
});

test("signup can recover a failed email without a pending ID only with the original password", async () => {
  const n = ++fixture;
  const payload = { fullName: "Delivery QA", username: `deliveryqa${n}`, email: `deliveryqa${n}@example.test`, phone: "0901234567", password: "OriginalPassword123" };
  await assert.rejects(registerUser(payload, { send: async () => { throw new Error("QA email failure"); } }), /EMAIL_SEND_FAILED/);
  const pendingUser = await User.findOne({ email: payload.email }).select("+password");
  assert.equal(pendingUser.isActive, false);
  assert.equal(await EmailVerification.countDocuments({ userId: pendingUser._id }), 0);
  let deliveries = 0, sent;
  const send = async value => { deliveries += 1; sent = value; };
  await assert.rejects(registerUser({ ...payload, password: "AttackerPassword456" }, { send }), /EMAIL_EXISTS/);
  await assert.rejects(registerUser({ ...payload, registrationToken: "invalid-supplied-proof" }, { send }), /EMAIL_EXISTS/);
  assert.equal(deliveries, 0);
  assert.equal((await User.findById(pendingUser._id).select("+password")).password, pendingUser.password);
  const recovered = await registerUser(payload, { send });
  assert.equal(recovered.userId, pendingUser.id);
  assert.ok(recovered.registrationToken);
  assert.equal(deliveries, 1);
  assert.equal(await User.countDocuments({ email: payload.email }), 1);
  await verifyRegistrationOtp({ userId: recovered.userId, otp: sent.otp });
  assert.ok((await loginUser({ identifier: payload.email, password: payload.password })).accessToken);
});

test("signup without pending ID cannot overwrite active, blocked, trashed, admin or Google accounts", async () => {
  const password = "OriginalPassword123";
  const passwordHash = await bcrypt.hash(password, 12);
  for (const guard of [{ isActive: true }, { isBlocked: true }, { deletedAt: new Date() }, { role: "admin" }, { googleId: "protected-recovery-google" }]) {
    const n = ++fixture;
    const account = await User.create({ username: `protectedqa${n}`, email: `protectedqa${n}@example.test`, fullName: "Protected QA", password: passwordHash, isActive: false, ...guard });
    await assert.rejects(registerUser({ fullName: "Changed QA", username: account.username, email: account.email, phone: "0901234567", password }, { send: async () => { assert.fail("protected account must not send a signup email"); } }), /EMAIL_EXISTS/);
    const after = await User.findById(account._id).select("+password");
    assert.equal(after.fullName, "Protected QA");
    assert.equal(after.password, passwordHash);
    assert.equal(await EmailVerification.countDocuments({ userId: account._id }), 0);
  }
});

test("continuation suspended at password hashing cannot overwrite Google activation", async () => {
  const { payload, result } = await pending();
  const gate = pauseNextHash();
  const update = registerUser({ ...payload, userId: result.userId, registrationToken: result.registrationToken, password: "AttackerChanged456", email: "race-attacker@example.test" }, { send: async () => {} });
  update.catch(() => {});
  try {
    await gate.ready;
    await loginWithGoogle({ emailAuthoritative: true, googleId: "google-race-qa", email: payload.email, fullName: "Real owner" });
  } finally { gate.resume(); }
  await assert.rejects(update, /ACCOUNT_ALREADY_ACTIVE/);
  const stored = await User.findById(result.userId).select("+password");
  assert.equal(stored.email, payload.email);
  assert.equal(stored.password, undefined);
  assert.equal(stored.googleId, "google-race-qa");
  assert.equal(await EmailVerification.countDocuments({ userId: result.userId }), 0);
});

test("continuation suspended at hashing cannot overwrite OTP activation", async () => {
  const { payload, result, sent } = await pending();
  const gate = pauseNextHash();
  const update = registerUser({ ...payload, userId: result.userId, registrationToken: result.registrationToken, password: "AttackerChanged456" }, { send: async () => {} });
  update.catch(() => {});
  try {
    await gate.ready;
    await verifyRegistrationOtp({ userId: result.userId, otp: sent.otp });
  } finally { gate.resume(); }
  await assert.rejects(update, /ACCOUNT_ALREADY_ACTIVE/);
  assert.ok((await loginUser({ identifier: payload.email, password: payload.password })).accessToken);
  await assert.rejects(loginUser({ identifier: payload.email, password: "AttackerChanged456" }), /INVALID_CREDENTIALS/);
});

test("registration validation rejects bcrypt truncation for ASCII and UTF-8 passwords", () => {
  const candidate = { fullName: "QA User", username: "validationqa", email: "validation@example.test", phone: "0901234567", termsAccepted: true };
  for (const password of ["Aa1" + "x".repeat(70), "Aa1" + "ế".repeat(24)]) {
    assert.equal(registerSchema.safeParse({ ...candidate, password, confirmPassword: password }).success, false);
  }
  const password = "Aa1" + "x".repeat(69);
  assert.equal(registerSchema.safeParse({ ...candidate, password, confirmPassword: password }).success, true);
});

const activeMember = async () => {
  const n = ++fixture;
  return User.create({ username: `activeqa${n}`, email: `activeqa${n}@example.test`,
    fullName: "Active QA", password: "qa-unused-password-hash", isActive: true });
};
const blockedSender = () => {
  let started, fail;
  const ready = new Promise(resolve => { started = resolve; });
  const delivery = new Promise((_, reject) => { fail = () => reject(new Error("QA delayed sender failure")); });
  return { ready, fail, send: async value => { started(value); await delivery; } };
};

test("OTP HMAC binds purpose, account and server secret; each generation has a fresh nonce", () => {
  const otp = "123456";
  const first = hashOtp(otp, "registration", "qa-user-a");
  const second = hashOtp(otp, "registration", "qa-user-a");
  assert.match(first, /^hmac-v1:[a-f0-9]{32}:[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.equal(matchesOtp(otp, first, "registration", "qa-user-a"), true);
  assert.equal(matchesOtp(otp, first, "registration", "qa-user-b"), false);
  assert.equal(matchesOtp(otp, first, "password-reset", "qa-user-a"), false);
  assert.equal(matchesOtp("654321", first, "registration", "qa-user-a"), false);
  const secret = process.env.JWT_REFRESH_SECRET;
  try {
    process.env.JWT_REFRESH_SECRET = "qa-another-server-secret";
    assert.equal(matchesOtp(otp, first, "registration", "qa-user-a"), false);
  } finally { process.env.JWT_REFRESH_SECRET = secret; }
  for (const invalid of [null, {}, "hmac-v1:broken", "123456"]) {
    assert.equal(matchesOtp(otp, invalid, "registration", "qa-user-a"), false);
  }
  assert.throws(() => hashOtp(otp), /OTP_CONTEXT_REQUIRED/);
});

test("unexpired legacy SHA-256 registration and reset codes still work once after upgrade", async () => {
  const { result } = await pending();
  const otp = "234567";
  const legacy = crypto.createHash("sha256").update(otp).digest("hex");
  await EmailVerification.updateOne({ userId: result.userId }, { otpHash: legacy });
  await verifyRegistrationOtp({ userId: result.userId, otp });
  await assert.rejects(verifyRegistrationOtp({ userId: result.userId, otp }), /OTP_NOT_FOUND/);
  const member = await User.findById(result.userId);
  await PasswordReset.create({ userId: member._id, email: member.email, otpHash: legacy,
    otpExpiresAt: new Date(Date.now() + 60000), expiresAt: new Date(Date.now() + 60000) });
  assert.ok((await verifyPasswordResetOtp({ email: member.email, otp })).resetToken);
  await assert.rejects(verifyPasswordResetOtp({ email: member.email, otp }), /RESET_OTP_ALREADY_VERIFIED/);
});

test("registration OTP uses the stored canonical account ID for equivalent uppercase ObjectIds", async () => {
  const { result, sent } = await pending();
  const verified = await verifyRegistrationOtp({ userId: result.userId.toUpperCase(), otp: sent.otp });
  assert.equal(String(verified.id), result.userId);
  assert.equal(verified.isActive, true);
});

test("concurrent registration resends commit exactly one OTP and one email", async () => {
  const { result } = await pending();
  await EmailVerification.updateOne({ userId: result.userId }, { expiresAt: new Date(Date.now() - 1000) });
  const sent = [];
  const attempts = await Promise.allSettled(Array.from({ length: 12 }, () =>
    resendRegistrationOtp({ userId: result.userId }, { send: async value => { sent.push(value); } })));
  assert.equal(attempts.filter(item => item.status === "fulfilled").length, 1);
  assert.ok(attempts.filter(item => item.status === "rejected").every(item => item.reason.message === "OTP_STILL_ACTIVE"));
  assert.equal(sent.length, 1);
  assert.equal(await EmailVerification.countDocuments({ userId: result.userId }), 1);
  const current = await EmailVerification.findOne({ userId: result.userId });
  assert.equal(matchesOtp(sent[0].otp, current.otpHash, "registration", result.userId), true);
  const activations = await Promise.allSettled(Array.from({ length: 8 }, () =>
    verifyRegistrationOtp({ userId: result.userId, otp: sent[0].otp })));
  assert.equal(activations.filter(item => item.status === "fulfilled").length, 1);
});

test("concurrent reset requests send once and cooldown cannot reset the OTP attempt budget", async () => {
  const member = await activeMember();
  const sent = [];
  const send = async value => { sent.push(value); };
  const requests = await Promise.all(Array.from({ length: 12 }, () => requestPasswordReset(member.email, { send })));
  assert.ok(requests.every(value => value.accepted === true));
  assert.equal(sent.length, 1);
  assert.equal(await PasswordReset.countDocuments({ userId: member._id }), 1);
  const current = await PasswordReset.findOne({ userId: member._id });
  assert.equal(matchesOtp(sent[0].otp, current.otpHash, "password-reset", member.id), true);
  const wrongOtp = sent[0].otp === "123456" ? "654321" : "123456";
  await Promise.allSettled(Array.from({ length: 12 }, () => verifyPasswordResetOtp({ email: member.email, otp: wrongOtp })));
  assert.equal((await PasswordReset.findById(current._id)).attempts, 5);
  await requestPasswordReset(member.email, { send });
  assert.equal(sent.length, 1);
  assert.equal((await PasswordReset.findById(current._id)).attempts, 5);
  await assert.rejects(verifyPasswordResetOtp({ email: member.email, otp: sent[0].otp }), /RESET_OTP_MAX_ATTEMPTS/);
});

test("a delayed registration resend failure preserves a newer OTP even when digits repeat", async () => {
  const { result } = await pending();
  const originalRandom = crypto.randomInt;
  crypto.randomInt = () => 345678;
  const delayed = blockedSender();
  let oldRequest;
  try {
    await EmailVerification.updateOne({ userId: result.userId }, { expiresAt: new Date(Date.now() - 1000) });
    oldRequest = resendRegistrationOtp({ userId: result.userId }, { send: delayed.send });
    oldRequest.catch(() => {});
    await delayed.ready;
    const old = await EmailVerification.findOne({ userId: result.userId });
    await EmailVerification.updateOne({ _id: old._id }, { expiresAt: new Date(Date.now() - 1000) });
    await resendRegistrationOtp({ userId: result.userId }, { send: async () => {} });
    const newer = await EmailVerification.findOne({ userId: result.userId });
    assert.notEqual(newer.otpHash, old.otpHash);
    delayed.fail();
    await assert.rejects(oldRequest, /EMAIL_SEND_FAILED/);
    assert.equal((await EmailVerification.findById(newer._id)).otpHash, newer.otpHash);
    await verifyRegistrationOtp({ userId: result.userId, otp: "345678" });
  } finally {
    crypto.randomInt = originalRandom;
    delayed.fail();
    await oldRequest?.catch(() => {});
  }
});

test("a delayed reset email failure preserves a newer same-digit OTP and its verified token", async () => {
  const member = await activeMember();
  const originalRandom = crypto.randomInt;
  crypto.randomInt = () => 456789;
  const delayed = blockedSender();
  let oldRequest;
  try {
    oldRequest = requestPasswordReset(member.email, { send: delayed.send });
    oldRequest.catch(() => {});
    await delayed.ready;
    const old = await PasswordReset.findOne({ userId: member._id });
    await PasswordReset.collection.updateOne({ _id: old._id }, { $set: { createdAt: new Date(Date.now() - 61000) } });
    await requestPasswordReset(member.email, { send: async () => {} });
    const newer = await PasswordReset.findOne({ userId: member._id });
    assert.notEqual(newer.otpHash, old.otpHash);
    const { resetToken } = await verifyPasswordResetOtp({ email: member.email, otp: "456789" });
    delayed.fail();
    await assert.rejects(oldRequest, /PASSWORD_RESET_EMAIL_FAILED/);
    assert.equal((await PasswordReset.findById(newer._id)).otpHash, newer.otpHash);
    await resetPassword({ resetToken, password: "ResetSecurePassword456" });
    assert.ok((await loginUser({ identifier: member.email, password: "ResetSecurePassword456" })).accessToken);
  } finally {
    crypto.randomInt = originalRandom;
    delayed.fail();
    await oldRequest?.catch(() => {});
  }
});

test("expiry cleanup of an old registration record cannot delete a newly resent code", async () => {
  const { result } = await pending();
  await EmailVerification.updateOne({ userId: result.userId }, { expiresAt: new Date(Date.now() - 1000) });
  const originalDelete = EmailVerification.deleteOne;
  let ready, resume;
  const started = new Promise(resolve => { ready = resolve; });
  const gate = new Promise(resolve => { resume = resolve; });
  EmailVerification.deleteOne = async (...args) => { ready(); await gate; return originalDelete.apply(EmailVerification, args); };
  const expired = verifyRegistrationOtp({ userId: result.userId, otp: "123456" });
  expired.catch(() => {});
  let sent;
  try {
    await started;
    await resendRegistrationOtp({ userId: result.userId }, { send: async value => { sent = value; } });
  } finally { EmailVerification.deleteOne = originalDelete; resume(); }
  await assert.rejects(expired, /OTP_EXPIRED/);
  await verifyRegistrationOtp({ userId: result.userId, otp: sent.otp });
});

test("expiry cleanup of an old reset token cannot delete a new reset request", async () => {
  const member = await activeMember();
  let sent;
  await requestPasswordReset(member.email, { send: async value => { sent = value; } });
  const { resetToken } = await verifyPasswordResetOtp({ email: member.email, otp: sent.otp });
  const old = await PasswordReset.findOne({ userId: member._id });
  await PasswordReset.collection.updateOne({ _id: old._id }, { $set: {
    createdAt: new Date(Date.now() - 61000), resetTokenExpiresAt: new Date(Date.now() - 1000)
  } });
  const originalDelete = PasswordReset.deleteOne;
  let ready, resume;
  const started = new Promise(resolve => { ready = resolve; });
  const gate = new Promise(resolve => { resume = resolve; });
  PasswordReset.deleteOne = async (...args) => { ready(); await gate; return originalDelete.apply(PasswordReset, args); };
  const expired = resetPassword({ resetToken, password: "ResetSecurePassword456" });
  expired.catch(() => {});
  try {
    await started;
    await requestPasswordReset(member.email, { send: async value => { sent = value; } });
  } finally { PasswordReset.deleteOne = originalDelete; resume(); }
  await assert.rejects(expired, /RESET_TOKEN_EXPIRED/);
  assert.ok((await verifyPasswordResetOtp({ email: member.email, otp: sent.otp })).resetToken);
});

test("reset token issued before an account is disabled cannot reactivate it", async () => {
  const member = await activeMember();
  let sent;
  await requestPasswordReset(member.email, { send: async value => { sent = value; } });
  const { resetToken } = await verifyPasswordResetOtp({ email: member.email, otp: sent.otp });
  await User.updateOne({ _id: member._id }, { isActive: false });
  await assert.rejects(resetPassword({ resetToken, password: "ResetSecurePassword456" }), error => error.status === 403);
  const stored = await User.findById(member._id).select("+password");
  assert.equal(stored.isActive, false);
  assert.equal(stored.password, "qa-unused-password-hash");
});

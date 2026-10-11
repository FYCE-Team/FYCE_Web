import mongoose from "mongoose";
import ProfileOtp from "../models/ProfileOtp.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import PasswordReset from "../models/PasswordReset.js";
import RefreshToken from "../models/RefreshToken.js";
import { sendPasswordResetOtpEmail } from "./email.service.js";
import { generateOtp, hashOtp, matchesOtp } from "../utils/otp.js";

const OTP_EXPIRES_MS = 5 * 60 * 1000;
const RESET_TOKEN_EXPIRES_MS = 10 * 60 * 1000;
const RECORD_EXPIRES_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const normalizeEmail = (email) => {
  if (typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
};

const hashValue = (value) =>
  crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");

const generateResetToken = () =>
  crypto.randomBytes(48).toString("hex");

const validateNewPassword = (password) => {
  if (typeof password !== "string") {
    throw new Error("PASSWORD_INVALID");
  }

  if (password.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  if (Buffer.byteLength(password) > 72) {
    throw new Error("PASSWORD_TOO_LONG");
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error("PASSWORD_NO_UPPERCASE");
  }

  if (!/[a-z]/.test(password)) {
    throw new Error("PASSWORD_NO_LOWERCASE");
  }

  if (!/[0-9]/.test(password)) {
    throw new Error("PASSWORD_NO_NUMBER");
  }
};

export const requestPasswordReset = async (email, { send = sendPasswordResetOtpEmail } = {}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("EMAIL_INVALID");
  const existing = await User.findOne({ email: normalizedEmail });
  if (!existing?.isActive || existing.isBlocked || existing.deletedAt) return { accepted: true };

  const otp = generateOtp();
  let user, resetRequest;
  await mongoose.connection.transaction(async session => {
    // The driver may retry this callback after a transient write conflict.
    // Only the record created by the committed attempt may trigger an email.
    resetRequest = null;
    // Share an account-row write with password/account changes. This prevents
    // concurrent first requests from creating multiple OTPs without a new index.
    user = await User.findOneAndUpdate({
      _id: existing._id, email: normalizedEmail, isActive: true,
      isBlocked: { $ne: true }, deletedAt: null
    }, { $inc: { __v: 1 } }, { session, timestamps: false, returnDocument: "after" });
    if (!user) return;
    const now = new Date();
    const recent = await PasswordReset.exists({
      userId: user._id, createdAt: { $gt: new Date(now.getTime() - RESEND_COOLDOWN_MS) }
    }).session(session);
    // Same public response for missing, inactive and cooling-down accounts.
    if (recent) return;
    await PasswordReset.deleteMany({ userId: user._id }, { session });
    [resetRequest] = await PasswordReset.create([{
      _id: user._id, userId: user._id, email: normalizedEmail,
      otpHash: hashOtp(otp, "password-reset", user._id),
      otpExpiresAt: new Date(now.getTime() + OTP_EXPIRES_MS),
      attempts: 0, verified: false, resetTokenHash: null, resetTokenExpiresAt: null,
      expiresAt: new Date(now.getTime() + RECORD_EXPIRES_MS)
    }], { session });
  });
  if (!resetRequest) return { accepted: true };
  try {
    await send({ to: normalizedEmail, otp, expiresMinutes: 5, fullName: user.fullName });
  } catch {
    await PasswordReset.deleteOne({ _id: resetRequest._id, otpHash: resetRequest.otpHash, verified: false });
    throw new Error("PASSWORD_RESET_EMAIL_FAILED");
  }
  return { accepted: true };
};

export const verifyPasswordResetOtp = async ({
  email,
  otp
}) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("EMAIL_INVALID");
  }

  if (
    typeof otp !== "string" ||
    !/^\d{6}$/.test(otp)
  ) {
    throw new Error("OTP_INVALID");
  }

  const resetRequest =
    await PasswordReset.findOne({
      email: normalizedEmail
    }).sort({
      createdAt: -1
    });

  if (!resetRequest) {
    throw new Error(
      "RESET_REQUEST_NOT_FOUND"
    );
  }

  if (resetRequest.verified) {
    throw new Error(
      "RESET_OTP_ALREADY_VERIFIED"
    );
  }

  if (
    resetRequest.otpExpiresAt.getTime() <=
    Date.now()
  ) {
    throw new Error("RESET_OTP_EXPIRED");
  }

  if (
    resetRequest.attempts >=
    MAX_OTP_ATTEMPTS
  ) {
    throw new Error(
      "RESET_OTP_MAX_ATTEMPTS"
    );
  }

  const otpHash = resetRequest.otpHash;

  if (!matchesOtp(otp, otpHash, "password-reset", resetRequest.userId)) {
    await PasswordReset.updateOne({
      _id: resetRequest._id, otpHash: resetRequest.otpHash, verified: false,
      attempts: { $lt: MAX_OTP_ATTEMPTS }, otpExpiresAt: { $gt: new Date() }
    }, { $inc: { attempts: 1 } });

    throw new Error("RESET_OTP_INVALID");
  }

  const resetToken = generateResetToken();
  const resetTokenHash =
    hashValue(resetToken);

  const verified = await PasswordReset.findOneAndUpdate({
    _id: resetRequest._id, otpHash, verified: false,
    attempts: { $lt: MAX_OTP_ATTEMPTS }, otpExpiresAt: { $gt: new Date() }
  }, { $set: {
    verified: true, resetTokenHash,
    resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRES_MS)
  } }, { returnDocument: "after" });
  if (!verified) throw new Error("RESET_OTP_ALREADY_VERIFIED");

  return {
    resetToken
  };
};

export const resendPasswordResetOtp = async (email, options) => {
  return requestPasswordReset(email, options);
};

export const resetPassword = async ({
  resetToken,
  password
}) => {
  if (
    typeof resetToken !== "string" ||
    !resetToken.trim()
  ) {
    throw new Error("RESET_TOKEN_INVALID");
  }

  validateNewPassword(password);

  const resetTokenHash =
    hashValue(resetToken);

  const resetRequest =
    await PasswordReset.findOne({
      resetTokenHash,
      verified: true
    });

  if (!resetRequest) {
    throw new Error("RESET_TOKEN_INVALID");
  }

  if (
    !resetRequest.resetTokenExpiresAt ||
    resetRequest.resetTokenExpiresAt.getTime() <=
      Date.now()
  ) {
    await PasswordReset.deleteOne({
      _id: resetRequest._id, resetTokenHash
    });

    throw new Error("RESET_TOKEN_EXPIRED");
  }

  const user = await User.findById(
    resetRequest.userId
  ).select("+password");

  if (!user) {
    await PasswordReset.deleteOne({
      _id: resetRequest._id, resetTokenHash
    });

    throw new Error("USER_NOT_FOUND");
  }

  const isSamePassword = user.password &&
    await bcrypt.compare(
      password,
      user.password
    );

  if (isSamePassword) {
    throw new Error(
      "PASSWORD_SAME_AS_OLD"
    );
  }

  const passwordHash =
    await bcrypt.hash(password, 12);

  await mongoose.connection.transaction(async session => {
    const consumed = await PasswordReset.findOneAndDelete({
      _id: resetRequest._id, resetTokenHash, verified: true,
      resetTokenExpiresAt: { $gt: new Date() }
    }, { session });
    if (!consumed) throw new Error("RESET_TOKEN_INVALID");
    const changed = await User.updateOne({
      _id: user._id, isActive: true, isBlocked: { $ne: true }, deletedAt: null
    }, {
      $set: { password: passwordHash }, $inc: { authVersion: 1 }
    }, { session });
    if (!changed.matchedCount) throw Object.assign(new Error("Tài khoản không còn hoạt động."), { status: 403 });
    await RefreshToken.deleteMany({ userId: user._id }, { session });
    await PasswordReset.deleteMany({ userId: user._id }, { session });
    await ProfileOtp.deleteMany({ userId: user._id }, { session });
  });

  return {
    success: true
  };
};

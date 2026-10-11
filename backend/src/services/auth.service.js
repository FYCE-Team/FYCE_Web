import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import PasswordReset from "../models/PasswordReset.js";
import ProfileOtp from "../models/ProfileOtp.js";

import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import EmailVerification from "../models/EmailVerification.js";

import {
    generateAccessToken,
    generateRefreshToken,
    hashToken
} from "../utils/token.js";

import {
    generateOtp,
    hashOtp,
    matchesOtp
} from "../utils/otp.js";

import {
    sendVerificationEmail
} from "./email.service.js";

const DUMMY_HASH =
    "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9tR1E1uR6f2N6QJ8j5N6I7A2k7x";

const OTP_EXPIRE_MINUTES = 5;

export const loginUser = async ({
    identifier,
    password,
    rememberMe
}) => {
    const normalizedIdentifier =
        identifier.trim().toLowerCase();

    const user = await User.findOne({
        $or: [
            {
                email:
                    normalizedIdentifier
            },
            {
                username:
                    normalizedIdentifier
            }
        ]
    }).select("+password");

    if (!user) {
        await bcrypt.compare(
            password,
            DUMMY_HASH
        );

        throw new Error(
            "INVALID_CREDENTIALS"
        );
    }

    if (!user.isActive || user.isBlocked) {
        throw new Error(
            "ACCOUNT_NOT_ACTIVE"
        );
    }

    if (!user.password) throw new Error("INVALID_CREDENTIALS");

    const isPasswordCorrect =
        await bcrypt.compare(
            password,
            user.password
        );

    if (!isPasswordCorrect) {
        throw new Error(
            "INVALID_CREDENTIALS"
        );
    }

    const accessToken =
        generateAccessToken(user);

    const refreshToken =
        generateRefreshToken();

    const refreshTokenHash =
        hashToken(refreshToken);

    const refreshTokenDays =
        rememberMe ? 7 : 1;

    const expiresAt = new Date(
        Date.now() +
            refreshTokenDays *
                24 *
                60 *
                60 *
                1000
    );

    await RefreshToken.create({
        userId: user._id,
        authVersion: user.authVersion || 0,
        tokenHash: refreshTokenHash,
        expiresAt
    });

    return {
        accessToken,
        refreshToken,
        expiresIn:
            process.env.JWT_ACCESS_EXPIRES,
        user: {
            id: user._id.toString(),
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            avatarUrl: user.avatarUrl || "",
            role: user.role,
            isActive: user.isActive
        }
    };
};

const pendingRegistrationFilter = {
    isActive: false, isBlocked: { $ne: true }, deletedAt: null,
    role: "user", googleId: null
};
const registrationProof = (user, expires) => {
    if (!process.env.JWT_REFRESH_SECRET) throw new Error("REFRESH_SECRET_NOT_CONFIGURED");
    return createHmac("sha256", process.env.JWT_REFRESH_SECRET)
        .update(JSON.stringify(["fyce-registration-v1", String(user._id), user.email,
            user.username, user.password, user.authVersion || 0, expires]))
        .digest("hex");
};
const makeRegistrationToken = user => {
    const expires = Date.now() + 24 * 60 * 60 * 1000;
    return `${expires}.${registrationProof(user, expires)}`;
};
const hasRegistrationProof = (user, token) => {
    if (typeof token !== "string" || !/^\d{13}\.[a-f0-9]{64}$/.test(token)) return false;
    const [expiry, supplied] = token.split(".");
    const expires = Number(expiry);
    if (expires <= Date.now()) return false;
    const expected = registrationProof(user, expires);
    return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
};
const registrationDenied = () => Object.assign(
    new Error("Phiên chỉnh sửa đăng ký không hợp lệ. Hãy nhập lại mật khẩu đã dùng hoặc xác thực email."),
    { status: 403 }
);

export const registerUser = async ({
    userId, registrationToken, fullName, username, email, phone, password
}, { send = sendVerificationEmail } = {}) => {
    const normalizedFullName = fullName.trim();
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    if (typeof password !== "string" || Buffer.byteLength(password) > 72) {
        throw Object.assign(new Error("Mật khẩu tối đa 72 byte."), { status: 400 });
    }
    let previous = null;
    if (userId) {
        previous = await User.findById(userId).select("+password");
        if (!previous) throw new Error("REGISTRATION_NOT_FOUND");
        if (previous.isActive) throw new Error("ACCOUNT_ALREADY_ACTIVE");
        if (previous.isBlocked || previous.deletedAt || previous.googleId || previous.role !== "user") {
            throw registrationDenied();
        }
        // Older clients can resume with the original password; changing it requires
        // the opaque proof returned to the browser that began the registration.
        const authorized = hasRegistrationProof(previous, registrationToken)
            || (!registrationToken && previous.password && await bcrypt.compare(password, previous.password));
        if (!authorized) throw registrationDenied();
    }
    const emailOwner = await User.findOne({ email: normalizedEmail }).select("+password");
    // Delivery can fail before the browser receives a pending ID/proof. Recover
    // that signup only with its original password, never with email alone.
    if (!previous && emailOwner && !registrationToken && !emailOwner.isActive
        && !emailOwner.isBlocked && !emailOwner.deletedAt && !emailOwner.googleId
        && emailOwner.role === "user" && emailOwner.password
        && await bcrypt.compare(password, emailOwner.password)) {
        previous = emailOwner;
    }
    if (emailOwner && (!previous || String(emailOwner._id) !== String(previous._id))) throw new Error("EMAIL_EXISTS");
    const usernameOwner = await User.findOne({ username: normalizedUsername });
    if (usernameOwner && (!previous || String(usernameOwner._id) !== String(previous._id))) throw new Error("USERNAME_EXISTS");

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);
    const payload = { fullName: normalizedFullName, username: normalizedUsername,
        email: normalizedEmail, phone: normalizedPhone, password: passwordHash };
    let user, verification;
    await mongoose.connection.transaction(async session => {
        if (previous) {
            user = await User.findOneAndUpdate({
                _id: previous._id, ...pendingRegistrationFilter,
                password: previous.password, email: previous.email, username: previous.username
            }, { $set: payload }, { returnDocument: "after", runValidators: true, session }).select("+password");
            if (!user) throw Object.assign(new Error("ACCOUNT_ALREADY_ACTIVE"), { status: 409 });
        } else {
            [user] = await User.create([{ ...payload, role: "user", isActive: false }], { session });
        }
        await EmailVerification.deleteMany({ userId: user._id }, { session });
        [verification] = await EmailVerification.create([{
            _id: user._id, userId: user._id,
            otpHash: hashOtp(otp, "registration", user._id), expiresAt, attempts: 0
        }], { session });
    });
    try {
        await send({ email: user.email, fullName: user.fullName, otp });
    } catch {
        // A delayed sender failure must not remove a newer registration's OTP.
        await EmailVerification.deleteOne({ _id: verification._id, otpHash: verification.otpHash });
        throw new Error("EMAIL_SEND_FAILED");
    }
    return { userId: String(user._id), email: user.email, expiresAt,
        registrationToken: makeRegistrationToken(user) };
};

export const verifyRegistrationOtp = async ({
    userId,
    otp
}) => {
    const verification =
        await EmailVerification.findOne({
            userId
        });

    if (!verification) {
        throw new Error(
            "OTP_NOT_FOUND"
        );
    }

    if (
        verification.expiresAt.getTime() <
        Date.now()
    ) {
        await EmailVerification.deleteOne({
            _id: verification._id, otpHash: verification.otpHash
        });

        throw new Error(
            "OTP_EXPIRED"
        );
    }

    if (verification.attempts >= 5) {
        throw new Error(
            "OTP_TOO_MANY_ATTEMPTS"
        );
    }

    const otpHash = verification.otpHash;

    if (
        !matchesOtp(otp, otpHash, "registration", verification.userId)
    ) {
        await EmailVerification.updateOne({
            _id: verification._id, otpHash: verification.otpHash,
            attempts: { $lt: 5 }, expiresAt: { $gt: new Date() }
        }, { $inc: { attempts: 1 } });

        throw new Error(
            "INVALID_OTP"
        );
    }

    const user =
        await User.findById(userId);

    if (!user) {
        throw new Error(
            "USER_NOT_FOUND"
        );
    }

    await mongoose.connection.transaction(async session => {
        const consumed = await EmailVerification.findOneAndDelete({
            _id: verification._id, userId, otpHash,
            attempts: { $lt: 5 }, expiresAt: { $gt: new Date() }
        }, { session });
        if (!consumed) throw new Error("OTP_NOT_FOUND");
        const activated = await User.updateOne({ _id: userId, ...pendingRegistrationFilter },
            { $set: { isActive: true } }, { session });
        if (!activated.matchedCount) throw Object.assign(new Error("Tài khoản không còn hoạt động."), { status: 403 });
    });
    user.isActive = true;

    return {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
            avatarUrl: user.avatarUrl || "",
        role: user.role,
        isActive: user.isActive
    };
};

export const resendRegistrationOtp = async ({ userId }, { send = sendVerificationEmail } = {}) => {
    const existing = await User.findById(userId);
    if (!existing) throw new Error("USER_NOT_FOUND");
    if (existing.isActive) throw new Error("ACCOUNT_ALREADY_ACTIVE");
    if (existing.isBlocked || existing.deletedAt || existing.googleId || existing.role !== "user") throw registrationDenied();
    const otp = generateOtp();
    let user, verification;
    await mongoose.connection.transaction(async session => {
        // Serialize against registration edits and account activation, not only
        // other resend calls. Internal version changes do not touch updatedAt.
        user = await User.findOneAndUpdate({ _id: userId, ...pendingRegistrationFilter },
            { $inc: { __v: 1 } }, { session, timestamps: false, returnDocument: "after" });
        if (!user) throw registrationDenied();
        const now = new Date();
        const current = await EmailVerification.findOne({ userId }).sort({ createdAt: -1 }).session(session);
        if (current && current.expiresAt > now) throw new Error("OTP_STILL_ACTIVE");
        const expiresAt = new Date(now.getTime() + OTP_EXPIRE_MINUTES * 60 * 1000);
        await EmailVerification.deleteMany({ userId }, { session });
        [verification] = await EmailVerification.create([{
            _id: user._id, userId: user._id, otpHash: hashOtp(otp, "registration", user._id),
            expiresAt, attempts: 0
        }], { session });
    });
    try {
        await send({ email: user.email, fullName: user.fullName, otp });
    } catch {
        await EmailVerification.deleteOne({ _id: verification._id, otpHash: verification.otpHash });
        throw new Error("EMAIL_SEND_FAILED");
    }
    return { userId: String(user._id), email: user.email, expiresAt: verification.expiresAt };
};

export const loginWithGoogle = async ({ googleId, email, fullName, emailAuthoritative = false }) => {
    if (!googleId || typeof googleId !== "string") throw new Error("GOOGLE_ID_INVALID");
    if (!email || typeof email !== "string") throw new Error("GOOGLE_EMAIL_INVALID");
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName?.trim() || "Google User";
    let user;
    await mongoose.connection.transaction(async session => {
        user = await User.findOne({ googleId }).select("+password").session(session);
        const alreadyLinked = Boolean(user);
        if (!user) {
            user = await User.findOne({ email: normalizedEmail }).select("+password").session(session);
            if (user?.googleId) throw new Error("GOOGLE_ACCOUNT_MISMATCH");
        }
        if (user) {
            if (user.isBlocked || user.deletedAt || (!user.isActive && user.role !== "user")) {
                throw new Error("ACCOUNT_NOT_ACTIVE");
            }
            if (!alreadyLinked && emailAuthoritative !== true) {
                throw Object.assign(new Error("Email này cần được xác minh lại trước khi liên kết Google. Vui lòng đăng nhập bằng mật khẩu hoặc dùng Quên mật khẩu."), { status: 403 });
            }
            if (!user.isActive) {
                // Email ownership was never proved for this password. Keeping it
                // would let a pre-registration attacker log into the Google owner.
                user.password = undefined;
                user.authVersion = (user.authVersion || 0) + 1;
                user.fullName = normalizedFullName;
                user.phone = "";
                await RefreshToken.deleteMany({ userId: user._id }, { session });
                await PasswordReset.deleteMany({ userId: user._id }, { session });
                await ProfileOtp.deleteMany({ userId: user._id }, { session });
            }
            user.googleId = googleId;
            user.isActive = true;
            if (!user.fullName || user.fullName === "Google User") user.fullName = normalizedFullName;
            // This write conflicts with continuation/OTP activation transactions;
            // a retry reads the latest account instead of saving an old snapshot.
            await user.save({ session });
            await EmailVerification.deleteMany({ userId: user._id }, { session });
        } else {
            // A newly created account also needs current email ownership. An old
            // third-party Google address could otherwise preclaim the account
            // before its present email owner registers or recovers a password.
            if (emailAuthoritative !== true) {
                throw Object.assign(new Error("Email này chưa được Google xác minh quyền sở hữu hiện tại. Vui lòng đăng ký bằng email và xác thực mã OTP."), { status: 403 });
            }
            const emailPrefix = normalizedEmail.split("@")[0].replace(/[^a-z0-9_]/g, "").slice(0, 20);
            const base = emailPrefix.length >= 3 ? emailPrefix : "googleuser";
            let username = base;
            if (await User.exists({ username }).session(session)) username = `${base}_${randomBytes(4).toString("hex")}`;
            [user] = await User.create([{
                username, fullName: normalizedFullName, email: normalizedEmail,
                phone: "", googleId, role: "user", isActive: true
            }], { session });
        }
    });

    /*
     * ------------------------------------------------
     * 4. Access Token
     * ------------------------------------------------
     */
    const accessToken =
        generateAccessToken(user);

    /*
     * ------------------------------------------------
     * 5. Refresh Token
     * ------------------------------------------------
     */
    const refreshToken =
        generateRefreshToken();

    const refreshTokenHash =
        hashToken(refreshToken);

    const expiresAt =
        new Date(
            Date.now() +
                7 *
                24 *
                60 *
                60 *
                1000
        );

    await RefreshToken.create({
        userId: user._id,
        authVersion: user.authVersion || 0,
        tokenHash:
            refreshTokenHash,
        expiresAt
    });

    return {
        accessToken,
        refreshToken,
        expiresAt,
        expiresIn:
            process.env.JWT_ACCESS_EXPIRES,
        user: {
            id:
                user._id.toString(),
            username:
                user.username,
            fullName:
                user.fullName,
            email:
                user.email,
            phone:
                user.phone,
            avatarUrl: user.avatarUrl || "",
            role:
                user.role,
            isActive:
                user.isActive
        }
    };
};

/* ============================================================
 * UPDATE CURRENT USER PROFILE
 * ============================================================
 * Dùng tại Checkout/Profile để người dùng bổ sung họ tên và
 * số điện thoại. Email không được cập nhật qua endpoint này vì
 * email là định danh đã được xác thực của tài khoản.
 */
const PROFILE_PHONE_REGEX = /^(0|\+84)[0-9]{9}$/;

const sanitizeProfilePhone = (value) =>
    String(value ?? "")
        .trim()
        .replace(/[\s.-]/g, "");

export const updateUserProfile = async ({
    userId,
    fullName,
    phone
}) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    if (!user.isActive || user.isBlocked) {
        throw new Error("ACCOUNT_NOT_ACTIVE");
    }

    if (
        typeof fullName === "undefined" &&
        typeof phone === "undefined"
    ) {
        throw new Error("PROFILE_FIELDS_REQUIRED");
    }

    if (typeof fullName !== "undefined") {
        if (typeof fullName !== "string") {
            throw new Error("FULL_NAME_INVALID");
        }

        const normalizedFullName =
            fullName.trim();

        if (
            normalizedFullName.length < 2 ||
            normalizedFullName.length > 150
        ) {
            throw new Error("FULL_NAME_INVALID");
        }

        user.fullName =
            normalizedFullName;
    }

    if (typeof phone !== "undefined") {
        if (typeof phone !== "string") {
            throw new Error("PHONE_INVALID");
        }

        const normalizedPhone =
            sanitizeProfilePhone(phone);

        /*
         * User.phone là optional để Google login có thể tạo tài khoản
         * trước khi người dùng bổ sung số điện thoại. Checkout frontend
         * vẫn bắt buộc phone hợp lệ trước bước thanh toán.
         */
        if (
            normalizedPhone &&
            !PROFILE_PHONE_REGEX.test(
                normalizedPhone
            )
        ) {
            throw new Error("PHONE_INVALID");
        }

        user.phone =
            normalizedPhone;
    }

    await user.save();

    return {
        id: user._id.toString(),
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "",
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
};

import bcrypt from "bcrypt";

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
    hashOtp
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

    if (!user.isActive) {
        throw new Error(
            "ACCOUNT_NOT_ACTIVE"
        );
    }

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
            role: user.role,
            isActive: user.isActive
        }
    };
};

export const registerUser = async ({
    userId,
    fullName,
    username,
    email,
    phone,
    password
}) => {
    const normalizedFullName =
        fullName.trim();

    const normalizedUsername =
        username.trim().toLowerCase();

    const normalizedEmail =
        email.trim().toLowerCase();

    const normalizedPhone =
        phone.trim();

    let user = null;

    /*
     * ------------------------------------------------
     * 1. Nếu frontend gửi userId
     *    => đây là registration đang tiếp tục
     * ------------------------------------------------
     */
    if (userId) {
        user = await User.findById(userId);

        if (!user) {
            throw new Error(
                "REGISTRATION_NOT_FOUND"
            );
        }

        /*
         * Không cho phép sửa lại tài khoản
         * đã được kích hoạt.
         */
        if (user.isActive) {
            throw new Error(
                "ACCOUNT_ALREADY_ACTIVE"
            );
        }
    }

    /*
     * ------------------------------------------------
     * 2. Kiểm tra email có thuộc user khác không
     * ------------------------------------------------
     */
    const emailOwner = await User.findOne({
        email: normalizedEmail
    });

    if (
        emailOwner &&
        (
            !user ||
            emailOwner._id.toString() !==
                user._id.toString()
        )
    ) {
        throw new Error(
            "EMAIL_EXISTS"
        );
    }

    /*
     * ------------------------------------------------
     * 3. Kiểm tra username có thuộc user khác không
     * ------------------------------------------------
     */
    const usernameOwner = await User.findOne({
        username: normalizedUsername
    });

    if (
        usernameOwner &&
        (
            !user ||
            usernameOwner._id.toString() !==
                user._id.toString()
        )
    ) {
        throw new Error(
            "USERNAME_EXISTS"
        );
    }

    /*
     * ------------------------------------------------
     * 4. Hash password
     * ------------------------------------------------
     */
    const passwordHash =
        await bcrypt.hash(password, 12);

    /*
     * ------------------------------------------------
     * 5. Tạo mới hoặc cập nhật registration cũ
     * ------------------------------------------------
     */
    if (!user) {
        user = await User.create({
            fullName: normalizedFullName,
            username: normalizedUsername,
            email: normalizedEmail,
            phone: normalizedPhone,
            password: passwordHash,
            role: "user",
            isActive: false
        });
    } else {
        user.fullName =
            normalizedFullName;

        user.username =
            normalizedUsername;

        user.email =
            normalizedEmail;

        user.phone =
            normalizedPhone;

        user.password =
            passwordHash;

        user.isActive = false;

        await user.save();
    }

    /*
     * ------------------------------------------------
     * 6. OTP cũ không còn hợp lệ
     * ------------------------------------------------
     */
    await EmailVerification.deleteMany({
        userId: user._id
    });

    /*
     * ------------------------------------------------
     * 7. Tạo OTP mới
     * ------------------------------------------------
     */
    const otp = generateOtp();

    const otpHash = hashOtp(otp);

    const expiresAt = new Date(
        Date.now() +
        OTP_EXPIRE_MINUTES * 60 * 1000
    );

    await EmailVerification.create({
        userId: user._id,
        otpHash,
        expiresAt,
        attempts: 0
    });

    /*
     * ------------------------------------------------
     * 8. Gửi email
     * ------------------------------------------------
     */
    try {
        await sendVerificationEmail({
            email: user.email,
            fullName: user.fullName,
            otp
        });
    } catch (error) {
        /*
         * Không xóa User khi đây là registration
         * cũ. User vẫn được giữ ở isActive=false
         * để có thể retry đăng ký.
         */
        await EmailVerification.deleteMany({
            userId: user._id
        });

        throw new Error(
            "EMAIL_SEND_FAILED"
        );
    }

    return {
        userId: user._id.toString(),
        email: user.email,
        expiresAt
    };
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
            _id: verification._id
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

    const otpHash = hashOtp(otp);

    if (
        otpHash !== verification.otpHash
    ) {
        verification.attempts += 1;

        await verification.save();

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

    user.isActive = true;

    await user.save();

    await EmailVerification.deleteOne({
        _id: verification._id
    });

    return {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive
    };
};

export const resendRegistrationOtp = async ({
    userId
}) => {
    const user =
        await User.findById(userId);

    if (!user) {
        throw new Error(
            "USER_NOT_FOUND"
        );
    }

    if (user.isActive) {
        throw new Error(
            "ACCOUNT_ALREADY_ACTIVE"
        );
    }

    const currentVerification =
        await EmailVerification.findOne({
            userId
        });

    if (
        currentVerification &&
        currentVerification.expiresAt.getTime() >
            Date.now()
    ) {
        throw new Error(
            "OTP_STILL_ACTIVE"
        );
    }

    await EmailVerification.deleteMany({
        userId
    });

    const otp = generateOtp();

    const otpHash = hashOtp(otp);

    const expiresAt = new Date(
        Date.now() +
        OTP_EXPIRE_MINUTES * 60 * 1000
    );

    await EmailVerification.create({
        userId: user._id,
        otpHash,
        expiresAt,
        attempts: 0
    });

    try {
        await sendVerificationEmail({
            email: user.email,
            fullName: user.fullName,
            otp
        });
    } catch (error) {
        await EmailVerification.deleteMany({
            userId: user._id
        });

        throw new Error(
            "EMAIL_SEND_FAILED"
        );
    }

    return {
        userId: user._id.toString(),
        email: user.email,
        expiresAt
    };
};

export const loginWithGoogle = async ({
    googleId,
    email,
    fullName
}) => {
    if (
        !googleId ||
        typeof googleId !== "string"
    ) {
        throw new Error(
            "GOOGLE_ID_INVALID"
        );
    }

    if (
        !email ||
        typeof email !== "string"
    ) {
        throw new Error(
            "GOOGLE_EMAIL_INVALID"
        );
    }

    const normalizedEmail =
        email.trim().toLowerCase();

    const normalizedFullName =
        fullName?.trim() ||
        "Google User";

    let user = await User.findOne({
        googleId
    });

    /*
     * ------------------------------------------------
     * 1. Google account đã được liên kết trước đó
     * ------------------------------------------------
     */
    if (user) {
        user.isActive = true;

        if (
            !user.fullName ||
            user.fullName === "Google User"
        ) {
            user.fullName =
                normalizedFullName;
        }

        await user.save();
    } else {
        /*
         * ------------------------------------------------
         * 2. Chưa có googleId
         *    Kiểm tra email hiện tại
         * ------------------------------------------------
         */
        user = await User.findOne({
            email: normalizedEmail
        });

        if (user) {
            /*
             * Email đã tồn tại.
             *
             * Nếu tài khoản chưa có googleId,
             * liên kết tài khoản đó với Google.
             */
            if (user.googleId) {
                throw new Error(
                    "GOOGLE_ACCOUNT_MISMATCH"
                );
            }

            user.googleId = googleId;
            user.isActive = true;

            if (
                !user.fullName
            ) {
                user.fullName =
                    normalizedFullName;
            }

            await user.save();
        } else {
            /*
             * ------------------------------------------------
             * 3. Chưa có User
             *    => tạo tài khoản Google mới
             * ------------------------------------------------
             */

            const emailPrefix =
                normalizedEmail
                    .split("@")[0]
                    .replace(
                        /[^a-z0-9_]/g,
                        ""
                    )
                    .slice(0, 20);

            let username =
                emailPrefix ||
                "googleuser";

            let usernameExists =
                await User.exists({
                    username
                });

            let counter = 1;

            while (
                usernameExists
            ) {
                username =
                    `${emailPrefix || "googleuser"}${counter}`;

                usernameExists =
                    await User.exists({
                        username
                    });

                counter++;
            }

            user = await User.create({
                username,
                fullName:
                    normalizedFullName,
                email:
                    normalizedEmail,
                phone: "",
                googleId,
                role: "user",
                isActive: true
            });
        }
    }

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
            role:
                user.role,
            isActive:
                user.isActive
        }
    };
};
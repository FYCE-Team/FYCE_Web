import RefreshToken from "../models/RefreshToken.js";
import User from "../models/User.js";

import {
    generateAccessToken,
    generateRefreshToken,
    hashToken
} from "../utils/token.js";

export const refreshAccessToken = async (
    rawRefreshToken
) => {
    if (
        !rawRefreshToken ||
        typeof rawRefreshToken !==
            "string"
    ) {
        throw new Error(
            "REFRESH_TOKEN_MISSING"
        );
    }

    const tokenHash =
        hashToken(
            rawRefreshToken
        );

    const storedToken =
        await RefreshToken.findOne({
            tokenHash
        });

    if (!storedToken) {
        throw new Error(
            "REFRESH_TOKEN_INVALID"
        );
    }

    if (
        storedToken.expiresAt.getTime() <=
        Date.now()
    ) {
        await RefreshToken.deleteOne({
            _id: storedToken._id
        });

        throw new Error(
            "REFRESH_TOKEN_EXPIRED"
        );
    }

    const user =
        await User.findById(
            storedToken.userId
        ).select(
            "-password"
        );

    if (!user) {
        await RefreshToken.deleteOne({
            _id: storedToken._id
        });

        throw new Error(
            "USER_NOT_FOUND"
        );
    }

    if (!user.isActive) {
        await RefreshToken.deleteOne({
            _id: storedToken._id
        });

        throw new Error(
            "ACCOUNT_NOT_ACTIVE"
        );
    }

    const newAccessToken =
        generateAccessToken(
            user
        );

    /*
     * Token Rotation
     *
     * Token cũ bị xóa.
     * Token mới được tạo.
     */
    const newRefreshToken =
        generateRefreshToken();

    const newRefreshTokenHash =
        hashToken(
            newRefreshToken
        );

    const remainingTime =
        storedToken.expiresAt.getTime() -
        Date.now();

    const newExpiresAt =
        new Date(
            Date.now() +
                remainingTime
        );

    await RefreshToken.deleteOne({
        _id: storedToken._id
    });

    await RefreshToken.create({
        userId: user._id,
        tokenHash:
            newRefreshTokenHash,
        expiresAt:
            newExpiresAt
    });

    return {
        accessToken:
            newAccessToken,

        refreshToken:
            newRefreshToken,

        expiresAt:
            newExpiresAt,

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
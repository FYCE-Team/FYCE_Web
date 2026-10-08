import jwt from "jsonwebtoken";
import crypto from "crypto";

export const generateAccessToken = (
    user
) => {
    return jwt.sign(
        {
            sub: user._id.toString(),
            role: user.role,
            ver: user.authVersion || 0
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn:
                process.env.JWT_ACCESS_EXPIRES
        }
    );
};

export const generateRefreshToken =
    () => {
        return crypto
            .randomBytes(64)
            .toString("hex");
    };

export const hashToken = (
    token
) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

export const verifyAccessToken = (
    token
) => {
    return jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET,
        { algorithms: ["HS256"] }
    );
};

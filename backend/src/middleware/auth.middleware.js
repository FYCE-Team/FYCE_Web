import {
    verifyAccessToken
} from "../utils/token.js";

const extractBearerToken = (
    authorization
) => {
    if (
        typeof authorization !==
        "string"
    ) {
        return null;
    }

    const [
        scheme,
        token
    ] = authorization.split(" ");

    if (
        scheme !== "Bearer" ||
        !token
    ) {
        return null;
    }

    return token;
};

export const authenticateToken = (
    req,
    res,
    next
) => {
    try {
        const token =
            extractBearerToken(
                req.headers.authorization
            );

        if (!token) {
            return res.status(401).json({
                success: false,
                message:
                    "Bạn chưa đăng nhập"
            });
        }

        const payload =
            verifyAccessToken(token);

        if (
            !payload ||
            !payload.sub
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Token không hợp lệ"
            });
        }

        req.user = {
            userId: payload.sub,
            role: payload.role
        };

        next();
    } catch (error) {
        if (
            error.name ===
            "TokenExpiredError"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Phiên đăng nhập đã hết hạn"
            });
        }

        if (
            error.name ===
            "JsonWebTokenError"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Token không hợp lệ"
            });
        }

        next(error);
    }
};
export const setRefreshTokenCookie = (
    res,
    token,
    maxAge
) => {
    res.cookie(
        "refreshToken",
        token,
        {
            httpOnly: true,

            secure:
                process.env.NODE_ENV ===
                "production",

            sameSite:
                process.env.NODE_ENV ===
                "production"
                    ? "none"
                    : "lax",

            maxAge,

            path: "/api/auth"
        }
    );
};

export const clearRefreshTokenCookie = (
    res
) => {
    res.clearCookie(
        "refreshToken",
        {
            httpOnly: true,

            secure:
                process.env.NODE_ENV ===
                "production",

            sameSite:
                process.env.NODE_ENV ===
                "production"
                    ? "none"
                    : "lax",

            path: "/api/auth"
        }
    );
};
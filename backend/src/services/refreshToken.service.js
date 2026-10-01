import { createHmac } from "node:crypto";
import RefreshToken from "../models/RefreshToken.js";
import User from "../models/User.js";
import { generateAccessToken, hashToken } from "../utils/token.js";
const GRACE_MS = 30000;
const successor = token => {
    if (!process.env.JWT_REFRESH_SECRET) throw new Error("REFRESH_SECRET_NOT_CONFIGURED");
    return createHmac("sha256", process.env.JWT_REFRESH_SECRET).update(`fyce-refresh-v1:${token}`).digest("hex");
};
export const refreshAccessToken = async raw => {
    if (!raw || typeof raw !== "string") throw new Error("REFRESH_TOKEN_MISSING");
    const hash = hashToken(raw), now = new Date();
    const stored = await RefreshToken.findOne({ $or: [{ tokenHash: hash }, { previousTokenHash: hash, rotatedAt: { $gt: new Date(now - GRACE_MS) } }] });
    if (!stored) throw new Error("REFRESH_TOKEN_INVALID");
    if (stored.expiresAt <= now) throw new Error("REFRESH_TOKEN_EXPIRED");
    const user = await User.findById(stored.userId).select("-password");
    if (!user || !user.isActive || user.isBlocked || (stored.authVersion || 0) !== (user.authVersion || 0)) {
        await RefreshToken.deleteOne({ _id: stored._id });
        throw new Error(user ? "ACCOUNT_NOT_ACTIVE" : "USER_NOT_FOUND");
    }
    let next = raw;
    if (stored.tokenHash !== hash) {
        next = successor(raw);
        if (hashToken(next) !== stored.tokenHash) throw new Error("REFRESH_TOKEN_INVALID");
    } else if (!stored.rotatedAt || now - stored.rotatedAt >= GRACE_MS) {
        next = successor(raw);
        const changed = await RefreshToken.updateOne({ _id: stored._id, tokenHash: hash }, { $set: { tokenHash: hashToken(next), previousTokenHash: hash, rotatedAt: now } });
        if (!changed.modifiedCount) {
            // A concurrent request must converge on the same successor, not delete the session.
            const winner = await RefreshToken.exists({ _id: stored._id, tokenHash: hashToken(next), previousTokenHash: hash, rotatedAt: { $gt: new Date(Date.now() - GRACE_MS) } });
            if (!winner) throw new Error("REFRESH_TOKEN_INVALID");
        }
    }
    return { accessToken: generateAccessToken(user), refreshToken: next, expiresAt: stored.expiresAt,
        user: { id: String(user._id), username: user.username, fullName: user.fullName, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl || "", role: user.role, isActive: user.isActive } };
};

import express from "express";

import {
  register,
  verifyOtp,
  resendOtp,
  login,
  logout,
  getProfile,
  updateProfile,
  refresh,
  googleLogin,
  forgotPassword,
  verifyResetOtp,
  resendResetOtp,
  resetPassword
} from "../controllers/auth.controller.js";

import {
  loginRateLimit,
  registerRateLimit,
  otpRateLimit,
  resendOtpRateLimit,
  avatarUploadRateLimit
} from "../middleware/rateLimit.middleware.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireCookieOrigin } from "../middleware/cookieOrigin.middleware.js";

import multer from "multer";
import * as profile from "../services/profile.service.js";
import { clearRefreshTokenCookie } from "../utils/cookie.js";
const router = express.Router();
const profileResponse = action => async (req, res, next) => { try { res.json({ success: true, data: await action(req, res) }); } catch (error) { next(error); } };
router.post("/me/password-otp", authenticateToken, resendOtpRateLimit, profileResponse(req => profile.requestProfileOtp(req.user.userId)));
router.post("/me/password", authenticateToken, otpRateLimit, profileResponse(async (req, res) => { const data = await profile.changeProfilePassword(req.user.userId, req.body || {}); clearRefreshTokenCookie(res); return data; }));
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, parts: 6, fieldSize: 16 * 1024 },
}).single("image");
router.post("/me/avatar", authenticateToken, avatarUploadRateLimit, (req, res, next) => {
  avatarUpload(req, res, error => {
    if (error instanceof multer.MulterError) return res.status(400).json({ success: false, message: "Tệp ảnh hoặc nội dung tải lên vượt giới hạn cho phép." });
    next(error);
  });
}, profileResponse(req => profile.updateAvatar(req.user.userId, req.file)));


router.post(
  "/register",
  registerRateLimit,
  register
);

router.post(
  "/verify-otp",
  otpRateLimit,
  verifyOtp
);

router.post(
  "/resend-otp",
  resendOtpRateLimit,
  resendOtp
);

router.post(
  "/login",
  requireCookieOrigin,
  loginRateLimit,
  login
);

router.post(
  "/google",
  requireCookieOrigin,
  loginRateLimit,
  googleLogin
);

router.post(
  "/forgot-password",
  loginRateLimit,
  forgotPassword
);

router.post(
  "/verify-reset-otp",
  otpRateLimit,
  verifyResetOtp
);

router.post(
  "/resend-reset-otp",
  resendOtpRateLimit,
  resendResetOtp
);

router.post(
  "/reset-password",
  otpRateLimit,
  resetPassword
);

router.get(
  "/me",
  authenticateToken,
  getProfile
);

router.patch(
  "/me",
  authenticateToken,
  updateProfile
);

router.post(
  "/refresh",
  requireCookieOrigin,
  refresh
);

router.post(
  "/logout",
  requireCookieOrigin,
  logout
);

export default router;

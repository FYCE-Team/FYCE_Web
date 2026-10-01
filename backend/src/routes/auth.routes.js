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
  resendOtpRateLimit
} from "../middleware/rateLimit.middleware.js";

import { authenticateToken } from "../middleware/auth.middleware.js";

import multer from "multer";
import * as profile from "../services/profile.service.js";
import { clearRefreshTokenCookie } from "../utils/cookie.js";
const router = express.Router();
const profileResponse = action => async (req, res, next) => { try { res.json({ success: true, data: await action(req, res) }); } catch (error) { next(error); } };
router.post("/me/password-otp", authenticateToken, resendOtpRateLimit, profileResponse(req => profile.requestProfileOtp(req.user.userId)));
router.post("/me/password", authenticateToken, otpRateLimit, profileResponse(async (req, res) => { const data = await profile.changeProfilePassword(req.user.userId, req.body || {}); clearRefreshTokenCookie(res); return data; }));
router.post("/me/avatar", authenticateToken, multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }).single("image"), profileResponse(req => profile.updateAvatar(req.user.userId, req.file)));


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
  loginRateLimit,
  login
);

router.post(
  "/google",
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
  refresh
);

router.post(
  "/logout",
  logout
);

export default router;
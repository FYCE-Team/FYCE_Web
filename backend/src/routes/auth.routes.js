import express from "express";

import {
  register,
  verifyOtp,
  resendOtp,
  login,
  logout,
  getProfile,
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

const router = express.Router();

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

router.post(
  "/refresh",
  refresh
);

router.post(
  "/logout",
  logout
);

export default router;
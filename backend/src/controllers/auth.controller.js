import {
    registerUser,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    loginWithGoogle
} from "../services/auth.service.js";

import {
    registerSchema,
    loginSchema
} from "../validators/auth.validator.js";
import {
    loginUser
} from "../services/auth.service.js";

import {
    setRefreshTokenCookie,
    clearRefreshTokenCookie
} from "../utils/cookie.js";
import {
    refreshAccessToken
} from "../services/refreshToken.service.js";
import {
    hashToken,
    verifyAccessToken
} from "../utils/token.js";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resendPasswordResetOtp,
  resetPassword as resetPasswordService
} from "../services/passwordReset.service.js";
import {
    verifyGoogleCredential
} from "../services/googleAuth.service.js";
export const register = async (
    req,
    res,
    next
) => {
    try {
        const result =
            registerSchema.safeParse(
                req.body
            );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Dữ liệu đăng ký không hợp lệ",
                errors:
                    result.error.flatten()
            });
        }

        const {
            userId,
            fullName,
            username,
            email,
            phone,
            password,
            confirmPassword,
            termsAccepted
        } = result.data;

        const data =
            await registerUser({
                userId,
                fullName,
                username,
                email,
                phone,
                password
            });

        return res.status(201).json({
            success: true,
            message:
                "Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.",
            data
        });
    } catch (error) {
        if (
            error.message ===
            "REGISTRATION_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Phiên đăng ký không còn tồn tại. Vui lòng đăng ký lại."
            });
        }

        if (
            error.message ===
            "ACCOUNT_ALREADY_ACTIVE"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Tài khoản này đã được kích hoạt. Vui lòng đăng nhập."
            });
        }

        if (
            error.message ===
            "EMAIL_EXISTS"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Email đã được sử dụng"
            });
        }

        if (
            error.message ===
            "USERNAME_EXISTS"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Username đã được sử dụng"
            });
        }

        if (
            error.message ===
            "EMAIL_SEND_FAILED"
        ) {
            return res.status(500).json({
                success: false,
                message:
                    "Không thể gửi mã OTP. Vui lòng thử lại."
            });
        }

        next(error);
    }
};
export const verifyOtp = async (
    req,
    res,
    next
) => {
    try {
        const {
            userId,
            otp
        } = req.body;

        if (
            typeof userId !== "string" ||
            typeof otp !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Dữ liệu không hợp lệ"
            });
        }

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: "OTP phải gồm 6 chữ số"
            });
        }

        const user =
            await verifyRegistrationOtp({
                userId,
                otp
            });

        return res.status(200).json({
            success: true,
            message:
                "Xác thực tài khoản thành công",
            data: {
                user
            }
        });
    } catch (error) {
        if (
            error.message ===
            "OTP_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Mã OTP không tồn tại hoặc đã được sử dụng"
            });
        }

        if (
            error.message ===
            "OTP_EXPIRED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Mã OTP đã hết hạn"
            });
        }

        if (
            error.message ===
            "INVALID_OTP"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Mã OTP không chính xác"
            });
        }

        if (
            error.message ===
            "OTP_TOO_MANY_ATTEMPTS"
        ) {
            return res.status(429).json({
                success: false,
                message:
                    "Bạn đã nhập sai OTP quá số lần cho phép"
            });
        }

        next(error);
    }
};
export const resendOtp = async (
    req,
    res,
    next
) => {
    try {
        const { userId } = req.body;

        if (
            typeof userId !== "string" ||
            !userId.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Thông tin xác thực không hợp lệ"
            });
        }

        const result =
            await resendRegistrationOtp({
                userId
            });

        return res.status(200).json({
            success: true,
            message:
                "Mã OTP mới đã được gửi tới email của bạn.",
            data: {
                userId: result.userId,
                email: result.email,
                expiresAt: result.expiresAt
            }
        });
    } catch (error) {
        if (
            error.message ===
            "USER_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Không tìm thấy tài khoản"
            });
        }

        if (
            error.message ===
            "ACCOUNT_ALREADY_ACTIVE"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Tài khoản đã được kích hoạt"
            });
        }

        if (
            error.message ===
            "OTP_STILL_ACTIVE"
        ) {
            return res.status(429).json({
                success: false,
                message:
                    "Mã OTP hiện tại vẫn còn hiệu lực"
            });
        }

        if (
            error.message ===
            "EMAIL_SEND_FAILED"
        ) {
            return res.status(500).json({
                success: false,
                message:
                    "Không thể gửi mã OTP mới. Vui lòng thử lại."
            });
        }

        next(error);
    }
};
export const login = async (
    req,
    res,
    next
) => {
    try {
        const result =
            loginSchema.safeParse(
                req.body
            );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Thông tin đăng nhập không hợp lệ",
                errors:
                    result.error.flatten()
            });
        }

        const {
            identifier,
            password,
            rememberMe
        } = result.data;

        const authResult =
            await loginUser({
                identifier,
                password,
                rememberMe
            });

        const refreshMaxAge =
            rememberMe
                ? 7 *
                  24 *
                  60 *
                  60 *
                  1000
                : 24 *
                  60 *
                  60 *
                  1000;

        setRefreshTokenCookie(
            res,
            authResult.refreshToken,
            refreshMaxAge
        );

        delete authResult.refreshToken;

        return res.status(200).json({
            success: true,
            message:
                "Đăng nhập thành công",
            data: authResult
        });
    } catch (error) {
        if (
            error.message ===
            "INVALID_CREDENTIALS"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Tài khoản hoặc mật khẩu không chính xác"
            });
        }

        if (
            error.message ===
            "ACCOUNT_NOT_ACTIVE"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Tài khoản chưa được kích hoạt. Vui lòng xác thực OTP."
            });
        }

        next(error);
    }
};

export const logout = async (
    req,
    res,
    next
) => {
    try {
        const refreshToken =
            req.cookies.refreshToken;

        if (refreshToken) {
            await RefreshToken.deleteOne({
                tokenHash: hashToken(refreshToken)
            });
        }

        clearRefreshTokenCookie(res);

        return res.status(200).json({
            success: true,
            message: "Đăng xuất thành công"
        });
    } catch (error) {
        next(error);
    }
};
export const getCurrentUser = async (
    req,
    res,
    next
) => {
    try {
        return res.status(200).json({
            success: true,
            message:
                "Token hợp lệ",
            data: {
                userId:
                    req.user.userId,
                role:
                    req.user.role
            }
        });
    } catch (error) {
        next(error);
    }
};
export const getProfile = async (
    req,
    res,
    next
) => {
    try {
        const user =
            await User.findById(
                req.user.userId
            ).select(
                "-password"
            );

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "Tài khoản không tồn tại"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message:
                    "Tài khoản chưa được kích hoạt"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
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
                    user.isActive,
                createdAt:
                    user.createdAt,
                updatedAt:
                    user.updatedAt
            }
        });
    } catch (error) {
        next(error);
    }
};

export const refresh = async (
    req,
    res,
    next
) => {
    try {
        const refreshToken =
            req.cookies.refreshToken;

        const result =
            await refreshAccessToken(
                refreshToken
            );

        const maxAge =
            Math.max(
                0,
                result.expiresAt.getTime() -
                    Date.now()
            );

        setRefreshTokenCookie(
            res,
            result.refreshToken,
            maxAge
        );

        return res.status(200).json({
            success: true,
            message:
                "Access token đã được làm mới",
            data: {
                accessToken:
                    result.accessToken,

                user:
                    result.user
            }
        });
    } catch (error) {
        if (
            error.message ===
            "REFRESH_TOKEN_MISSING"
        ) {
            clearRefreshTokenCookie(
                res
            );

            return res.status(401).json({
                success: false,
                message:
                    "Không tìm thấy refresh token"
            });
        }

        if (
            error.message ===
            "REFRESH_TOKEN_INVALID"
        ) {
            clearRefreshTokenCookie(
                res
            );

            return res.status(401).json({
                success: false,
                message:
                    "Refresh token không hợp lệ"
            });
        }

        if (
            error.message ===
            "REFRESH_TOKEN_EXPIRED"
        ) {
            clearRefreshTokenCookie(
                res
            );

            return res.status(401).json({
                success: false,
                message:
                    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            });
        }

        if (
            error.message ===
            "USER_NOT_FOUND"
        ) {
            clearRefreshTokenCookie(
                res
            );

            return res.status(401).json({
                success: false,
                message:
                    "Tài khoản không tồn tại"
            });
        }

        if (
            error.message ===
            "ACCOUNT_NOT_ACTIVE"
        ) {
            clearRefreshTokenCookie(
                res
            );

            return res.status(403).json({
                success: false,
                message:
                    "Tài khoản chưa được kích hoạt"
            });
        }

        next(error);
    }
};

export const verifyGoogle = async (
    req,
    res,
    next
) => {
    try {
        const {
            credential
        } = req.body;

        const googleUser =
            await verifyGoogleCredential(
                credential
            );

        return res.status(200).json({
            success: true,
            message:
                "Google credential hợp lệ",
            data: googleUser
        });
    } catch (error) {
        if (
            error.message ===
            "GOOGLE_CREDENTIAL_MISSING"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Google credential không được để trống"
            });
        }

        if (
            error.message ===
            "GOOGLE_CLIENT_ID_MISSING"
        ) {
            return res.status(500).json({
                success: false,
                message:
                    "Google Client ID chưa được cấu hình"
            });
        }

        if (
            error.message ===
            "GOOGLE_CREDENTIAL_INVALID"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Google credential không hợp lệ"
            });
        }

        if (
            error.message ===
            "GOOGLE_CREDENTIAL_EXPIRED"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Google credential đã hết hạn"
            });
        }

        if (
            error.message ===
            "GOOGLE_EMAIL_NOT_VERIFIED"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Email Google chưa được xác thực"
            });
        }

        next(error);
    }
};
export const googleLogin = async (
    req,
    res,
    next
) => {
    try {
        const {
            credential
        } = req.body;

        const googleUser =
            await verifyGoogleCredential(
                credential
            );

        const authResult =
            await loginWithGoogle({
                googleId:
                    googleUser.googleId,
                email:
                    googleUser.email,
                fullName:
                    googleUser.fullName
            });

        const refreshMaxAge =
            Math.max(
                0,
                authResult.expiresAt.getTime() -
                    Date.now()
            );

        setRefreshTokenCookie(
            res,
            authResult.refreshToken,
            refreshMaxAge
        );

        delete authResult.refreshToken;
        delete authResult.expiresAt;

        return res.status(200).json({
            success: true,
            message:
                "Đăng nhập Google thành công",
            data: authResult
        });
    } catch (error) {
        if (
            error.message ===
            "GOOGLE_CREDENTIAL_MISSING"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Google credential không được để trống"
            });
        }

        if (
            error.message ===
            "GOOGLE_CLIENT_ID_MISSING"
        ) {
            return res.status(500).json({
                success: false,
                message:
                    "Google Client ID chưa được cấu hình"
            });
        }

        if (
            error.message ===
            "GOOGLE_CREDENTIAL_INVALID"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Google credential không hợp lệ"
            });
        }

        if (
            error.message ===
            "GOOGLE_CREDENTIAL_EXPIRED"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Google credential đã hết hạn"
            });
        }

        if (
            error.message ===
            "GOOGLE_EMAIL_NOT_VERIFIED"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Email Google chưa được xác thực"
            });
        }

        if (
            error.message ===
            "GOOGLE_ID_INVALID"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Google ID không hợp lệ"
            });
        }

        if (
            error.message ===
            "GOOGLE_EMAIL_INVALID"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Email Google không hợp lệ"
            });
        }

        if (
            error.message ===
            "EMAIL_ALREADY_REGISTERED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Email này đã được đăng ký. Vui lòng đăng nhập bằng phương thức ban đầu."
            });
        }

        next(error);
    }
};

export const forgotPassword = async (
  req,
  res,
  next
) => {
  try {
    const { email } = req.body;

    await requestPasswordReset(email);

    return res.status(200).json({
      success: true,
      message:
        "Nếu email tồn tại trong hệ thống, mã OTP khôi phục đã được gửi."
    });
  } catch (error) {
    if (error.message === "EMAIL_INVALID") {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ"
      });
    }

    if (
      error.message ===
      "PASSWORD_RESET_EMAIL_FAILED"
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Không thể gửi mã OTP. Vui lòng thử lại sau."
      });
    }

    next(error);
  }
};

export const verifyResetOtp = async (
  req,
  res,
  next
) => {
  try {
    const { email, otp } = req.body;

    const result =
      await verifyPasswordResetOtp({
        email,
        otp
      });

    return res.status(200).json({
      success: true,
      message:
        "Xác minh OTP khôi phục thành công",
      data: {
        resetToken: result.resetToken
      }
    });
  } catch (error) {
    switch (error.message) {
      case "EMAIL_INVALID":
        return res.status(400).json({
          success: false,
          message: "Email không hợp lệ"
        });

      case "OTP_INVALID":
        return res.status(400).json({
          success: false,
          message:
            "Mã OTP phải gồm đúng 6 chữ số"
        });

      case "RESET_REQUEST_NOT_FOUND":
        return res.status(400).json({
          success: false,
          message:
            "Yêu cầu khôi phục không tồn tại hoặc đã hết hạn"
        });

      case "RESET_OTP_EXPIRED":
        return res.status(400).json({
          success: false,
          message:
            "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới."
        });

      case "RESET_OTP_INVALID":
        return res.status(400).json({
          success: false,
          message:
            "Mã OTP không chính xác"
        });

      case "RESET_OTP_MAX_ATTEMPTS":
        return res.status(429).json({
          success: false,
          message:
            "Bạn đã nhập sai OTP quá số lần cho phép. Vui lòng yêu cầu mã mới."
        });

      case "RESET_OTP_ALREADY_VERIFIED":
        return res.status(400).json({
          success: false,
          message:
            "Mã OTP này đã được xác minh"
        });

      default:
        next(error);
    }
  }
};

export const resendResetOtp = async (
  req,
  res,
  next
) => {
  try {
    const { email } = req.body;

    await resendPasswordResetOtp(email);

    return res.status(200).json({
      success: true,
      message:
        "Nếu email tồn tại trong hệ thống, mã OTP mới đã được gửi."
    });
  } catch (error) {
    if (error.message === "EMAIL_INVALID") {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ"
      });
    }

    if (
      error.message ===
      "PASSWORD_RESET_EMAIL_FAILED"
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Không thể gửi mã OTP. Vui lòng thử lại sau."
      });
    }

    next(error);
  }
};

export const resetPassword = async (
  req,
  res,
  next
) => {
  try {
    const {
      resetToken,
      password
    } = req.body;

    await resetPasswordService({
      resetToken,
      password
    });

    return res.status(200).json({
      success: true,
      message:
        "Đặt lại mật khẩu thành công"
    });
  } catch (error) {
    switch (error.message) {
      case "RESET_TOKEN_INVALID":
        return res.status(400).json({
          success: false,
          message:
            "Phiên khôi phục không hợp lệ"
        });

      case "RESET_TOKEN_EXPIRED":
        return res.status(400).json({
          success: false,
          message:
            "Phiên khôi phục đã hết hạn. Vui lòng thực hiện lại."
        });

      case "USER_NOT_FOUND":
        return res.status(404).json({
          success: false,
          message:
            "Tài khoản không tồn tại"
        });

      case "PASSWORD_INVALID":
        return res.status(400).json({
          success: false,
          message:
            "Mật khẩu không hợp lệ"
        });

      case "PASSWORD_TOO_SHORT":
        return res.status(400).json({
          success: false,
          message:
            "Mật khẩu phải có ít nhất 8 ký tự"
        });

      case "PASSWORD_TOO_LONG":
        return res.status(400).json({
          success: false,
          message:
            "Mật khẩu không được vượt quá 128 ký tự"
        });

      case "PASSWORD_NO_UPPERCASE":
        return res.status(400).json({
          success: false,
          message:
            "Mật khẩu phải có ít nhất 1 chữ hoa"
        });

      case "PASSWORD_NO_LOWERCASE":
        return res.status(400).json({
          success: false,
          message:
            "Mật khẩu phải có ít nhất 1 chữ thường"
        });

      case "PASSWORD_NO_NUMBER":
        return res.status(400).json({
          success: false,
          message:
            "Mật khẩu phải có ít nhất 1 chữ số"
        });

        case "PASSWORD_SAME_AS_OLD":
        return res.status(400).json({
            success: false,
            message:
            "Mật khẩu mới không được trùng với mật khẩu hiện tại"
        });

      default:
        next(error);
    }
  }
};
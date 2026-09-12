import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout.jsx";
import {
  verifyResetOtp,
  resendResetOtp
} from "../../services/auth.service.js";
import "./ResetOtp.css";
function ResetOtpForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(
    location.search
  );

  const email =
    searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const maskedEmail = email
    ? email.replace(
        /^(.{2})(.*)(@.*)$/,
        (_, first, middle, domain) =>
          `${first}${"*".repeat(
            Math.min(middle.length, 5)
          )}${domain}`
      )
    : "";

  const handleChange = (event) => {
    const value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtp(value);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!email) {
      setError(
        "Không tìm thấy email khôi phục."
      );
      return;
    }

    if (otp.length !== 6) {
      setError(
        "Vui lòng nhập đủ 6 chữ số OTP."
      );
      return;
    }

    setLoading(true);

    try {
      const result = await verifyResetOtp({
        email,
        otp
      });

      const resetToken =
        result.data.resetToken;

      navigate("/reset-password", {
        replace: true,
        state: {
          resetToken,
          email
        }
      });
    } catch (error) {
      setError(
        error.message ||
          "Mã OTP không chính xác."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) {
      return;
    }

    setError("");
    setResending(true);

    try {
      await resendResetOtp(email);

      setCountdown(60);
      setOtp("");
    } catch (error) {
      setError(
        error.message ||
          "Không thể gửi lại OTP."
      );
    } finally {
      setResending(false);
    }
  };

  return (
      <div className="verify-reset-otp-page">
    <AuthLayout>
      <div className="auth-form-content">
        <div className="auth-form-heading">
          <h1>Xác minh tài khoản</h1>

          <p>
            Mã OTP đã được gửi đến
          </p>

          <strong className="reset-email">
            {maskedEmail}
          </strong>
        </div>

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >
          <div className="otp-input-group">
            <label htmlFor="otp">
              Mã xác thực OTP
            </label>

            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="______"
              value={otp}
              onChange={handleChange}
              autoComplete="one-time-code"
            />

            <p>
              Mã OTP có hiệu lực trong 5 phút.
            </p>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-button"
            disabled={loading}
          >
            {loading
              ? "Đang xác minh..."
              : "Xác nhận OTP"}

            {!loading && <span>➤</span>}
          </button>
        </form>

        <div className="resend-otp-section">
          <span>Chưa nhận được mã?</span>

          <button
            type="button"
            onClick={handleResend}
            disabled={
              countdown > 0 || resending
            }
          >
            {resending
              ? "Đang gửi..."
              : countdown > 0
              ? `Gửi lại sau ${countdown}s`
              : "Gửi lại mã OTP"}
          </button>
        </div>

        <button
          type="button"
          className="auth-back-link"
          onClick={() =>
            navigate("/forgot-password")
          }
        >
          ← Quay lại
        </button>
      </div>
    </AuthLayout>
    </div>
  );
}

export default ResetOtpForm;
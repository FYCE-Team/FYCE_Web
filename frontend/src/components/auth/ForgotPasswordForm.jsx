import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout.jsx";
import { forgotPassword } from "../../services/auth.service.js";
import "../../components/auth/ForgotPassword.css";
function ForgotPasswordForm() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Vui lòng nhập địa chỉ email.");
      return;
    }

    setLoading(true);

    try {
      await forgotPassword(normalizedEmail);

      navigate(
        `/verify-reset-otp?email=${encodeURIComponent(
          normalizedEmail
        )}`
      );
    } catch (error) {
      setError(
        error.message ||
          "Không thể gửi mã OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
    <AuthLayout>
      <div className="auth-form-content">
        <div className="auth-form-heading">
          <h1>Khôi phục Mật khẩu</h1>

          <p>
            Đừng lo lắng! Hãy nhập email đã đăng ký
            tài khoản FYCE, chúng tôi sẽ gửi mã xác
            thực khôi phục ngay lập tức.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >
          <div className="auth-field">
            <label htmlFor="email">
              Địa chỉ Email đã đăng ký
              <span>*</span>
            </label>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                @
              </span>

              <input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
              />
            </div>
          </div>

          <div className="otp-security-note">
            <span>🛡</span>

            <span>
              Mã xác minh an toàn 6 số sẽ có hiệu lực
              trong vòng 5 phút.
            </span>
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
              ? "Đang gửi..."
              : "Gửi Mã Xác Thực OTP"}

            {!loading && <span>➤</span>}
          </button>
        </form>

        <div className="auth-divider">
          <span>HOẶC</span>
        </div>

        <button
          type="button"
          className="auth-back-link"
          onClick={() => navigate("/login")}
        >
          ← Quay lại Đăng nhập
        </button>
      </div>
    </AuthLayout>
    </div>
  );
}

export default ForgotPasswordForm;
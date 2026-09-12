import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout.jsx";
import { resetPassword } from "../../services/auth.service.js";
import "./ResetPassword.css";

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="m3 3 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M10.6 6.2A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17.8 17.8 0 0 1-4 4.1M6.1 6.1C3.5 7.8 2 12 2 12s3.5 6 10 6c1.4 0 2.6-.3 3.7-.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResetPasswordForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const resetToken = location.state?.resetToken || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password)
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!resetToken) {
      setError(
        "Phiên khôi phục không hợp lệ. Vui lòng thực hiện lại."
      );
      return;
    }

    if (!password) {
      setError("Vui lòng nhập mật khẩu mới.");
      return;
    }

    if (!confirmPassword) {
      setError(
        "Vui lòng xác nhận mật khẩu mới."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Mật khẩu xác nhận không khớp."
      );
      return;
    }

    if (!passwordChecks.length) {
      setError(
        "Mật khẩu phải có ít nhất 8 ký tự."
      );
      return;
    }

    if (!passwordChecks.uppercase) {
      setError(
        "Mật khẩu phải có ít nhất 1 chữ hoa."
      );
      return;
    }

    if (!passwordChecks.lowercase) {
      setError(
        "Mật khẩu phải có ít nhất 1 chữ thường."
      );
      return;
    }

    if (!passwordChecks.number) {
      setError(
        "Mật khẩu phải có ít nhất 1 chữ số."
      );
      return;
    }

    setLoading(true);

    try {
      await resetPassword({
        resetToken,
        password
      });

      navigate("/login", {
        replace: true,
        state: {
          message:
            "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."
        }
      });
    } catch (error) {
      setError(
        error.message ||
          "Không thể đặt lại mật khẩu."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <AuthLayout>
        <div className="auth-form-content">
          <div className="auth-form-heading">
            <h1>Đặt lại Mật khẩu</h1>

            <p>
              Tạo mật khẩu mới cho tài khoản FYCE của
              bạn.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >
            <div className="auth-field">
              <label htmlFor="password">
                Mật khẩu mới
                <span>*</span>
              </label>

              <div className="auth-input-wrapper">

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Nhập mật khẩu mới"
                  value={password}
                  onChange={(event) => {
                    setPassword(
                      event.target.value
                    );
                    setError("");
                  }}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Ẩn mật khẩu"
                      : "Hiện mật khẩu"
                  }
                >
                  {showPassword ? (
                    <EyeOffIcon />
                  ) : (
                    <EyeIcon />
                  )}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword">
                Xác nhận mật khẩu
                <span>*</span>
              </label>

              <div className="auth-input-wrapper">

                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(
                      event.target.value
                    );
                    setError("");
                  }}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Ẩn mật khẩu xác nhận"
                      : "Hiện mật khẩu xác nhận"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon />
                  ) : (
                    <EyeIcon />
                  )}
                </button>
              </div>
            </div>

            <div className="password-rules">
              <p>Mật khẩu phải có:</p>

              <div
                className={
                  passwordChecks.length
                    ? "valid"
                    : ""
                }
              >
                {passwordChecks.length
                  ? "✓"
                  : "○"}{" "}
                Tối thiểu 8 ký tự
              </div>

              <div
                className={
                  passwordChecks.uppercase
                    ? "valid"
                    : ""
                }
              >
                {passwordChecks.uppercase
                  ? "✓"
                  : "○"}{" "}
                Ít nhất 1 chữ hoa
              </div>

              <div
                className={
                  passwordChecks.lowercase
                    ? "valid"
                    : ""
                }
              >
                {passwordChecks.lowercase
                  ? "✓"
                  : "○"}{" "}
                Ít nhất 1 chữ thường
              </div>

              <div
                className={
                  passwordChecks.number
                    ? "valid"
                    : ""
                }
              >
                {passwordChecks.number
                  ? "✓"
                  : "○"}{" "}
                Ít nhất 1 chữ số
              </div>
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
                ? "Đang cập nhật..."
                : "Đặt lại Mật khẩu"}

              {!loading && <span>➤</span>}
            </button>
          </form>

          <button
            type="button"
            className="auth-back-link"
            onClick={() =>
              navigate("/login")
            }
          >
            ← Quay lại Đăng nhập
          </button>
        </div>
      </AuthLayout>
    </div>
  );
}

export default ResetPasswordForm;
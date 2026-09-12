import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Ticket,
  User,
  UserRoundPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { register } from "../../services/auth.service";
import AuthLayout from "../../components/auth/AuthLayout";

const RegisterForm = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(() => {
    const defaultForm = {
      fullName: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
    };

    const savedDraft =
      sessionStorage.getItem("fyce_register_draft");

    if (!savedDraft) {
      return defaultForm;
    }

    try {
      const parsed = JSON.parse(savedDraft);

      return {
        ...defaultForm,
        fullName: parsed.fullName || "",
        username: parsed.username || "",
        email: parsed.email || "",
        phone: parsed.phone || "",
        termsAccepted: Boolean(parsed.termsAccepted),
        password: "",
        confirmPassword: "",
      };
    } catch {
      sessionStorage.removeItem("fyce_register_draft");
      return defaultForm;
    }
  });

  const isResumingRegistration = Boolean(
    sessionStorage.getItem("fyce_pending_user_id")
  );

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

const handleChange = (e) => {
  const {
    name,
    value,
    type,
    checked,
  } = e.target;

  const newValue =
    type === "checkbox"
      ? checked
      : value;

  setForm((prev) => {
    const updatedForm = {
      ...prev,
      [name]: newValue,
    };

    const draft = {
      fullName: updatedForm.fullName,
      username: updatedForm.username,
      email: updatedForm.email,
      phone: updatedForm.phone,
      termsAccepted:
        updatedForm.termsAccepted,
    };

    sessionStorage.setItem(
      "fyce_register_draft",
      JSON.stringify(draft)
    );

    return updatedForm;
  });

  setErrors((prev) => ({
    ...prev,
    [name]: "",
    general: "",
  }));

  setSuccess("");
};

  const passwordStrength = useMemo(() => {
    const password = form.password;

    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;

    if (score === 0) {
      return {
        text: "Chưa nhập",
        width: "0%",
      };
    }

    if (score <= 2) {
      return {
        text: "Yếu",
        width: "35%",
      };
    }

    if (score === 3) {
      return {
        text: "Trung bình",
        width: "65%",
      };
    }

    return {
      text: "Mạnh",
      width: "100%",
    };
  }, [form.password]);

  const validateForm = () => {
    const newErrors = {};

    const fullName = form.fullName.trim();
    const username = form.username.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    if (!fullName) {
      newErrors.fullName =
        "Vui lòng nhập họ và tên";
    }

    if (!username) {
      newErrors.username =
        "Vui lòng nhập tên tài khoản";
    } else if (username.length < 3) {
      newErrors.username =
        "Username phải có ít nhất 3 ký tự";
    } else if (username.length > 30) {
      newErrors.username =
        "Username tối đa 30 ký tự";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username =
        "Username chỉ được chứa chữ, số và dấu _";
    }

    if (!email) {
      newErrors.email =
        "Vui lòng nhập email";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      newErrors.email =
        "Email không hợp lệ";
    }

    const normalizedPhone =
      phone.replace(/\s/g, "");

    if (!normalizedPhone) {
      newErrors.phone =
        "Vui lòng nhập số điện thoại";
    } else if (
      !/^(0|\+84)[0-9]{9}$/.test(
        normalizedPhone
      )
    ) {
      newErrors.phone =
        "Số điện thoại không hợp lệ";
    }

    if (!password) {
      newErrors.password =
        "Vui lòng nhập mật khẩu";
    } else if (password.length < 8) {
      newErrors.password =
        "Mật khẩu phải có ít nhất 8 ký tự";
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password =
        "Mật khẩu cần có ít nhất 1 chữ hoa";
    } else if (!/[a-z]/.test(password)) {
      newErrors.password =
        "Mật khẩu cần có ít nhất 1 chữ thường";
    } else if (!/[0-9]/.test(password)) {
      newErrors.password =
        "Mật khẩu cần có ít nhất 1 chữ số";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword =
        "Vui lòng xác nhận mật khẩu";
    } else if (
      password !== confirmPassword
    ) {
      newErrors.confirmPassword =
        "Mật khẩu xác nhận không khớp";
    }

    if (!form.termsAccepted) {
      newErrors.termsAccepted =
        "Bạn cần đồng ý với điều khoản dịch vụ";
    }

    return newErrors;
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  const validationErrors = validateForm();

  setErrors(validationErrors);
  setSuccess("");

  if (Object.keys(validationErrors).length > 0) {
    return;
  }

  try {
    setLoading(true);

    const pendingUserId =
      sessionStorage.getItem(
        "fyce_pending_user_id"
      );

    const result = await register({
      ...(pendingUserId
        ? { userId: pendingUserId }
        : {}),
      fullName: form.fullName.trim(),
      username:
        form.username.trim().toLowerCase(),
      email:
        form.email.trim().toLowerCase(),
      phone:
        form.phone.replace(/\s/g, ""),
      password: form.password,
      confirmPassword:
        form.confirmPassword,
      termsAccepted:
        form.termsAccepted
    });

    const otpExpireAt =
      result.data?.expiresAt
        ? new Date(
            result.data.expiresAt
          ).getTime()
        : Date.now() +
          5 * 60 * 1000;

    sessionStorage.setItem(
      "fyce_pending_user_id",
      result.data.userId
    );

    sessionStorage.setItem(
      "fyce_pending_email",
      result.data.email
    );

    sessionStorage.setItem(
      "fyce_otp_expire_at",
      String(otpExpireAt)
    );

    sessionStorage.setItem(
      "fyce_register_draft",
      JSON.stringify({
        fullName:
          form.fullName.trim(),
        username:
          form.username
            .trim()
            .toLowerCase(),
        email:
          form.email.trim().toLowerCase(),
        phone:
          form.phone.replace(/\s/g, ""),
        termsAccepted:
          form.termsAccepted
      })
    );

    navigate("/verify-otp");
  } catch (error) {
    setErrors({
      general:
        error?.message ||
        "Đăng ký thất bại. Vui lòng thử lại."
    });
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="register-page">

      <main className="register-main">
        <section className="register-layout">
          <aside className="register-visual">
            <div className="visual-image-wrapper">
              <img
                src="/images/fyce.jpg"
                alt="Fantasy Youth Chamber Ensemble"
                className="visual-image"
              />
            </div>
          </aside>

          <section className="register-card">
            <div className="register-card-header">
              <h1>Đăng Ký</h1>
            </div>

            <div className="register-separator" />

            <form
              onSubmit={handleSubmit}
              className="register-form"
              noValidate
            >
              <div className="form-section">
                <div className="section-title">
                  <div className="section-icon">
                    <UserRoundPlus size={20} />
                  </div>

                  <h2>1. Thông tin</h2>
                </div>

                <div className="form-grid">
                  {/* FULL NAME */}
                  <div className="form-field">
                    <label htmlFor="fullName">
                      Họ và tên đầy đủ
                      <span>*</span>
                      <small>
                        In trên vé mời
                      </small>
                    </label>

                    <div
                      className={`input-wrapper ${
                        errors.fullName
                          ? "input-error"
                          : ""
                      }`}
                    >
                      <User size={19} />

                      <input
                        id="fullName"
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder=""
                      />
                    </div>

                    {errors.fullName && (
                      <p className="field-error">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* USERNAME */}
                  <div className="form-field">
                    <label htmlFor="username">
                      Tên tài khoản / Username
                      <span>*</span>
                      <small>
                        Duy nhất
                      </small>
                    </label>

                    <div
                      className={`input-wrapper ${
                        errors.username
                          ? "input-error"
                          : ""
                      }`}
                    >
                      <AtSign size={19} />

                      <input
                        id="username"
                        type="text"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        placeholder=""
                      />
                    </div>

                    {errors.username && (
                      <p className="field-error">
                        {errors.username}
                      </p>
                    )}
                  </div>

                  {/* EMAIL */}
                  <div className="form-field">
                    <label htmlFor="email">
                      Địa chỉ Email của bạn
                      <span>*</span>
                    </label>

                    <div
                      className={`input-wrapper ${
                        errors.email
                          ? "input-error"
                          : ""
                      }`}
                    >
                      <Mail size={19} />

                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder=""
                      />
                    </div>

                    {errors.email && (
                      <p className="field-error">
                        {errors.email}
                      </p>
                    )}

                    <p className="field-description">
                      Dùng để nhận e-Ticket và
                      nhạc mục chính phòng
                    </p>
                  </div>

                  {/* PHONE */}
                  <div className="form-field">
                    <label htmlFor="phone">
                      Số điện thoại liên hệ
                      <span>*</span>
                    </label>

                    <div
                      className={`input-wrapper ${
                        errors.phone
                          ? "input-error"
                          : ""
                      }`}
                    >
                      <Phone size={19} />

                      <input
                        id="phone"
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder=""
                      />
                    </div>

                    {errors.phone && (
                      <p className="field-error">
                        {errors.phone}
                      </p>
                    )}

                    <p className="field-description">
                      Dùng nhận vé SMS / Zalo
                      khi check-in tại khán phòng
                    </p>
                  </div>
                </div>
              </div>

              {/* PASSWORD SECTION */}
              <div className="form-section password-section">
                <div className="section-title">
                  <div className="section-icon">
                    <LockKeyhole size={20} />
                  </div>

                  <h2>2. Mật khẩu</h2>
                </div>

                <div className="form-grid">
                  {/* PASSWORD */}
                  <div className="form-field">
                    <label htmlFor="password">
                      Mật khẩu bảo vệ
                      <span>*</span>
                    </label>

                    <div
                      className={`input-wrapper ${
                        errors.password
                          ? "input-error"
                          : ""
                      }`}
                    >
                      <LockKeyhole size={19} />

                      <input
                        id="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder=""
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowPassword(
                            (prev) => !prev
                          )
                        }
                        aria-label={
                          showPassword
                            ? "Ẩn mật khẩu"
                            : "Hiện mật khẩu"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>

                    {errors.password && (
                      <p className="field-error">
                        {errors.password}
                      </p>
                    )}

                    <div className="password-strength">
                      <div className="strength-info">
                        <span>
                          Độ mạnh:{" "}
                          {
                            passwordStrength.text
                          }
                        </span>
                      </div>

                      <div className="strength-bar">
                        <div
                          className="strength-fill"
                          style={{
                            width:
                              passwordStrength.width,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* CONFIRM PASSWORD */}
                  <div className="form-field">
                    <label htmlFor="confirmPassword">
                      Xác nhận lại mật khẩu
                      <span>*</span>
                    </label>

                    <div
                      className={`input-wrapper ${
                        errors.confirmPassword
                          ? "input-error"
                          : ""
                      }`}
                    >
                      <LockKeyhole size={19} />

                      <input
                        id="confirmPassword"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        name="confirmPassword"
                        value={
                          form.confirmPassword
                        }
                        onChange={handleChange}
                        placeholder=""
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowConfirmPassword(
                            (prev) => !prev
                          )
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Ẩn mật khẩu"
                            : "Hiện mật khẩu"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>

                    {errors.confirmPassword && (
                      <p className="field-error">
                        {
                          errors.confirmPassword
                        }
                      </p>
                    )}

                    <p className="field-description">
                      Nhập lại chính xác chuỗi
                      mật khẩu vừa tạo
                    </p>
                  </div>
                </div>
              </div>

              {/* GENERAL API ERROR */}
              {errors.general && (
                <div className="form-message error">
                  {errors.general}
                </div>
              )}

              {/* TERMS */}
              <div className="terms-wrapper">
                <label className="terms-checkbox">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={
                      form.termsAccepted
                    }
                    onChange={handleChange}
                  />

                  <span
                    className={`custom-checkbox ${
                      errors.termsAccepted
                        ? "checkbox-error"
                        : ""
                    }`}
                  >
                    {form.termsAccepted && (
                      <Check size={14} />
                    )}
                  </span>

                  <span className="terms-text">
                    Tôi đồng ý với{" "}
                    <button
                      type="button"
                      onClick={(e) =>
                        e.preventDefault()
                      }
                    >
                      Điều khoản Dịch vụ
                    </button>{" "}
                    và{" "}
                    <button
                      type="button"
                      onClick={(e) =>
                        e.preventDefault()
                      }
                    >
                      Chính sách Bảo mật
                    </button>{" "}
                    Vé của FYCE.
                  </span>
                </label>

                {errors.termsAccepted && (
                  <p className="field-error terms-error">
                    {errors.termsAccepted}
                  </p>
                )}
              </div>

              {/* SUCCESS */}
              {success && (
                <div className="form-message success">
                  {success}
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                className="register-submit"
                disabled={loading}
              >
                <Ticket size={19} />

                <span>
                  {loading
                    ? "Đang xử lý..."
                    : isResumingRegistration
                    ? "Cập nhật thông tin & Nhận mã mới"
                    : "Hoàn tất Đăng ký & Nhận mã kích hoạt"}
                </span>
              </button>

              {/* LOGIN */}
              <div className="login-link-wrapper">
                <span>
                  Đã có tài khoản?
                </span>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/login")
                  }
                >
                  Đăng nhập ngay
                  <ArrowRight size={17} />
                </button>
              </div>

              {/* OTP INFO */}
              <div className="otp-info">
                <ShieldCheck size={17} />

                <span>
                  Mã kích hoạt điện tử (OTP) sẽ
                  được gửi tới Email của bạn
                  trong vòng 30 giây.
                </span>
              </div>
            </form>
          </section>
        </section>
      </main>
    </div>

  );
};

export default RegisterForm;
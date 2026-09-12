import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  HelpCircle,
  Mail,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  resendOtp,
  verifyOtp,
} from "../../services/auth.service";

import AuthLayout from "../../components/auth/AuthLayout";

import "./VerifyOtp.css";

const OTP_LENGTH = 6;

const OTP_EXPIRE_SECONDS = 5 * 60;

const VerifyOtp = () => {
  const navigate = useNavigate();
const handleBackToRegister = () => {
  navigate("/register");
};
  const inputRefs = useRef([]);

  const [userId, setUserId] = useState(
    () =>
      sessionStorage.getItem(
        "fyce_pending_user_id"
      ) || ""
  );

  const [email, setEmail] = useState(
    () =>
      sessionStorage.getItem(
        "fyce_pending_email"
      ) || ""
  );

  const [otp, setOtp] = useState(
    Array(OTP_LENGTH).fill("")
  );

  const [remainingSeconds, setRemainingSeconds] =
    useState(() => {
      const expireAt =
        Number(
          sessionStorage.getItem(
            "fyce_otp_expire_at"
          )
        );

      if (!expireAt) {
        return 0;
      }

      return Math.max(
        0,
        Math.ceil(
          (expireAt - Date.now()) / 1000
        )
      );
    });

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [verified, setVerified] =
    useState(false);

  /* =========================
     TIMER
  ========================= */

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      const expireAt =
        Number(
          sessionStorage.getItem(
            "fyce_otp_expire_at"
          )
        );

      if (!expireAt) {
        setRemainingSeconds(0);
        return;
      }

      const secondsLeft =
        Math.max(
          0,
          Math.ceil(
            (expireAt - Date.now()) /
              1000
          )
        );

      setRemainingSeconds(
        secondsLeft
      );

      if (secondsLeft <= 0) {
        clearInterval(timer);
      }
    }, 250);

    return () => {
      clearInterval(timer);
    };
  }, [remainingSeconds]);

  /* =========================
     FORMAT EMAIL
  ========================= */

  const maskedEmail = useMemo(() => {
    if (!email) {
      return "";
    }

    const parts =
      email.split("@");

    if (parts.length !== 2) {
      return email;
    }

    const name = parts[0];
    const domain = parts[1];

    if (name.length <= 2) {
      return `${name[0]}*****@${domain}`;
    }

    return `${name.slice(
      0,
      3
    )}*****@${domain}`;
  }, [email]);

  /* =========================
     TIMER FORMAT
  ========================= */

  const formattedTime = useMemo(() => {
    const minutes =
      Math.floor(
        remainingSeconds / 60
      );

    const seconds =
      remainingSeconds % 60;

    return `${String(
      minutes
    ).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }, [remainingSeconds]);

  /* =========================
     OTP INPUT
  ========================= */

  const handleOtpChange = (
    index,
    value
  ) => {
    const cleaned =
      value.replace(/\D/g, "");

    if (!cleaned) {
      setOtp((prev) => {
        const next = [...prev];

        next[index] = "";

        return next;
      });

      return;
    }

    const digit =
      cleaned[cleaned.length - 1];

    setOtp((prev) => {
      const next = [...prev];

      next[index] = digit;

      return next;
    });

    setError("");
    setSuccess("");

    if (
      index <
      OTP_LENGTH - 1
    ) {
      inputRefs.current[
        index + 1
      ]?.focus();
    }
  };

  /* =========================
     KEYBOARD
  ========================= */

  const handleKeyDown = (
    index,
    event
  ) => {
    if (
      event.key === "Backspace"
    ) {
      event.preventDefault();

      setOtp((prev) => {
        const next = [...prev];

        if (next[index]) {
          next[index] = "";
        } else if (index > 0) {
          next[index - 1] = "";

          requestAnimationFrame(() => {
            inputRefs.current[
              index - 1
            ]?.focus();
          });
        }

        return next;
      });

      return;
    }

    if (
      event.key === "Delete"
    ) {
      event.preventDefault();

      setOtp((prev) => {
        const next = [...prev];

        next[index] = "";

        return next;
      });

      return;
    }

    if (
      event.key === "ArrowLeft" &&
      index > 0
    ) {
      event.preventDefault();

      inputRefs.current[
        index - 1
      ]?.focus();

      return;
    }

    if (
      event.key === "ArrowRight" &&
      index <
        OTP_LENGTH - 1
    ) {
      event.preventDefault();

      inputRefs.current[
        index + 1
      ]?.focus();

      return;
    }
  };

  /* =========================
     FOCUS
  ========================= */

  const handleFocus = (index) => {
    inputRefs.current[
      index
    ]?.select();

    setError("");
  };

  /* =========================
     PASTE OTP
  ========================= */

  const handlePaste = (event) => {
    event.preventDefault();

    const pasted =
      event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, OTP_LENGTH);

    if (!pasted) {
      return;
    }

    const nextOtp =
      Array(OTP_LENGTH).fill("");

    pasted
      .split("")
      .forEach(
        (digit, index) => {
          nextOtp[index] = digit;
        }
      );

    setOtp(nextOtp);

    setError("");
    setSuccess("");

    const lastIndex =
      Math.min(
        pasted.length - 1,
        OTP_LENGTH - 1
      );

    inputRefs.current[
      lastIndex
    ]?.focus();
  };

  /* =========================
     VERIFY
  ========================= */

  const handleVerify = async (
    event
  ) => {
    event.preventDefault();

    const otpValue =
      otp.join("");

    if (!userId) {
      setError(
        "Không tìm thấy thông tin xác thực. Vui lòng đăng ký lại."
      );

      return;
    }

    if (
      otpValue.length !==
      OTP_LENGTH
    ) {
      setError(
        "Vui lòng nhập đủ 6 số OTP."
      );

      return;
    }

    if (
      remainingSeconds <= 0
    ) {
      setError(
        "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới."
      );

      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const result =
        await verifyOtp({
          userId,
          otp: otpValue,
        });

      setSuccess(
        result.message ||
          "Tài khoản đã được kích hoạt thành công."
      );

      setVerified(true);

      setOtp(
        Array(OTP_LENGTH).fill("")
      );

sessionStorage.removeItem(
    "fyce_pending_user_id"
);

sessionStorage.removeItem(
    "fyce_pending_email"
);

sessionStorage.removeItem(
    "fyce_otp_expire_at"
);

sessionStorage.removeItem(
    "fyce_register_draft"
);
    } catch (error) {
      setError(
        error.message ||
          "Mã OTP không chính xác."
      );

      setOtp(
        Array(OTP_LENGTH).fill("")
      );

      requestAnimationFrame(() => {
        inputRefs.current[0]?.focus();
      });
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     RESEND
  ========================= */

  const handleResend = async () => {
    if (!userId) {
      setError(
        "Không tìm thấy thông tin tài khoản."
      );

      return;
    }

    if (
      remainingSeconds > 0 ||
      resending
    ) {
      return;
    }

    try {
      setResending(true);
      setError("");
      setSuccess("");

      const result =
        await resendOtp({
          userId,
        });

      const newExpireAt =
        Date.now() +
        OTP_EXPIRE_SECONDS * 1000;

      sessionStorage.setItem(
        "fyce_otp_expire_at",
        String(newExpireAt)
      );

      setRemainingSeconds(
        OTP_EXPIRE_SECONDS
      );

      setOtp(
        Array(OTP_LENGTH).fill("")
      );

      setSuccess(
        result.message ||
          "Mã OTP mới đã được gửi tới email của bạn."
      );

      requestAnimationFrame(() => {
        inputRefs.current[0]?.focus();
      });
    } catch (error) {
      setError(
        error.message ||
          "Không thể gửi lại mã OTP."
      );
    } finally {
      setResending(false);
    }
  };

  /* =========================
     BACK
  ========================= */

<button
    type="button"
    className="back-button"
    onClick={handleBackToRegister}
>
    <ArrowLeft size={18} />
    Quay lại bước trước
</button>

  /* =========================
     SUCCESS SCREEN
  ========================= */

  if (verified) {
    return (
      <AuthLayout className="verify-auth">
        <div className="verify-success-page">
          <div className="verify-success-card">

            <div className="success-icon">
              <CheckCircle2
                size={58}
              />
            </div>

            <span className="success-label">
              FYCE ACCOUNT
            </span>

            <h1>
              Kích hoạt tài khoản
              thành công
            </h1>

            <p className="success-description">
              Tài khoản của bạn đã được
              xác thực thành công.
              Bạn có thể đăng nhập để
              tiếp tục sử dụng hệ thống
              FYCE.
            </p>

            <div className="success-email">
              <Mail size={18} />

              <span>
                {email}
              </span>
            </div>

            <div className="success-actions">
              <button
                type="button"
                className="verify-submit"
                onClick={() =>
                  navigate(
                    "/login",
                    {
                      replace: true,
                    }
                  )
                }
              >
                Đăng nhập ngay
                <ArrowRight
                  size={21}
                />
              </button>

              <button
                type="button"
                className="success-home-button"
                onClick={() =>
                  navigate(
                    "/"
                  )
                }
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout className="verify-auth">
      <div className="verify-page">
        <main className="verify-main">

          <button
            type="button"
            className="verify-back"
            onClick={handleBackToRegister}
          >
            <ArrowLeft size={20} />
            Quay lại bước trước
          </button>

          <section className="verify-layout">

            {/* LEFT */}
            <section className="verify-card">
              <div className="verify-card-inner">

                <div className="verify-shield">
                  <ShieldCheck size={18} />
                </div>

                <div className="verify-intro">

                  <div className="verify-mail-icon">
                    <Mail size={35} />

                    <div className="mail-check">
                      <CheckCircle2 size={15} />
                    </div>
                  </div>

                  <div>
                    <h1>
                      Xác thực Mã
                      Bảo mật
                    </h1>

                    <p>
                      Mã xác nhận 6 chữ số
                      vừa được gửi đến
                      email:
                    </p>

                    <p>
                      <strong>
                        {maskedEmail}
                      </strong>
                    </p>

                    <p>
                      Vui lòng kiểm tra
                      hộp thư đến hoặc
                      thư rác.
                    </p>
                  </div>
                </div>

                <form
                  className="verify-form"
                  onSubmit={
                    handleVerify
                  }
                >
                  <div className="otp-heading">
                    <span>
                      NHẬP 6 SỐ XÁC THỰC
                    </span>

                    <div
                      className={`otp-timer ${
                        remainingSeconds ===
                        0
                          ? "expired"
                          : ""
                      }`}
                    >
                      <Clock3 size={16} />

                      <span>
                        Mã có hiệu lực
                        trong{" "}
                        <strong>
                          {
                            formattedTime
                          }
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div
                    className="otp-inputs"
                    onPaste={
                      handlePaste
                    }
                  >
                    {otp.map(
                      (
                        value,
                        index
                      ) => (
                        <input
                          key={index}
                          ref={(element) => {
                            inputRefs.current[
                              index
                            ] = element;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={value}
                          onChange={(event) =>
                            handleOtpChange(
                              index,
                              event.target
                                .value
                            )
                          }
                          onKeyDown={(event) =>
                            handleKeyDown(
                              index,
                              event
                            )
                          }
                          onFocus={() =>
                            handleFocus(
                              index
                            )
                          }
                          autoComplete={
                            index === 0
                              ? "one-time-code"
                              : "off"
                          }
                          aria-label={`Số OTP ${
                            index + 1
                          }`}
                        />
                      )
                    )}
                  </div>

                  {error && (
                    <div className="verify-error">
                      <CircleAlert
                        size={17}
                      />

                      <span>
                        {error}
                      </span>
                    </div>
                  )}

                  {success && (
                    <div className="verify-success">
                      <CheckCircle2
                        size={17}
                      />

                      <span>
                        {success}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="resend-button"
                    onClick={
                      handleResend
                    }
                    disabled={
                      remainingSeconds >
                        0 ||
                      resending
                    }
                  >
                    <RefreshCcw
                      size={17}
                    />

                    {resending
                      ? "Đang gửi..."
                      : remainingSeconds >
                          0
                      ? `Gửi lại mã sau ${formattedTime}`
                      : "Gửi lại mã ngay"}
                  </button>

                  <button
                    type="submit"
                    className="verify-submit"
                    disabled={
                      loading ||
                      otp.join("").length !==
                        OTP_LENGTH ||
                      remainingSeconds <=
                        0
                    }
                  >
                    <span>
                      {loading
                        ? "Đang xác thực..."
                        : "Xác nhận & Tiếp tục"}
                    </span>

                    <ArrowRight
                      size={23}
                    />
                  </button>

                  <div className="verify-help">
                    <HelpCircle
                      size={24}
                    />

                    <div>
                      <h3>
                        Không nhận được
                        mã?
                      </h3>

                      <p>
                        Hãy kiểm tra mục
                        Spam hoặc thư rác.
                        Nếu vẫn không nhận
                        được mã, liên hệ Ban
                        lễ tân FYCE qua số{" "}
                        <strong>
                          (024) 3888–8888
                        </strong>
                        .
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </section>

            {/* RIGHT */}
            <aside className="verify-side">

              <div className="verify-side-image">
                <img
                  src="/images/fyce.jpg"
                  alt="FYCE verification"
                />
              </div>

              <div className="progress-card">

                <div className="progress-header">
                  <span>
                    TIẾN TRÌNH KÍCH HOẠT
                  </span>

                  <strong>
                    65% Hoàn tất
                  </strong>
                </div>

                <div className="progress-track">
                  <div className="progress-value" />
                </div>

                <div className="progress-item completed">
                  <CheckCircle2 size={20} />

                  <span>
                    Đăng ký thông tin
                    (Đã xong)
                  </span>
                </div>

                <div className="progress-item current">
                  <div className="current-dot">
                    <span />
                  </div>

                  <span>
                    Xác minh mã hòm thư
                    điện tử (Hiện tại)
                  </span>
                </div>

                <div className="verification-note">
                  <div className="note-icon">
                    <span>!</span>
                  </div>

                  <p>
                    Nếu không thấy thư,
                    hãy kiểm tra mục{" "}
                    <strong>
                      Spam
                    </strong>{" "}
                    hoặc{" "}
                    <strong>
                      Promotions
                    </strong>
                    .
                  </p>
                </div>

              </div>

            </aside>
          </section>
        </main>
      </div>
    </AuthLayout>
  );
};

export default VerifyOtp;
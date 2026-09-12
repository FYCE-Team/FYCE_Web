import {
    useState
} from "react";

import {
    Eye,
    EyeOff,
    LockKeyhole,
    Mail
} from "lucide-react";

import {
    useLocation,
    useNavigate
} from "react-router-dom";

import {
    GoogleLogin
} from "@react-oauth/google";

import {
    useAuth
} from "../../../context/AuthContext";

import "./LoginForm.css";
import AuthLayout from "./AuthLayout";

const LoginForm = () => {
    const navigate =
        useNavigate();

    const location =
        useLocation();

    const {
        login,
        loginWithGoogle
    } = useAuth();

    const navigateAfterLogin = (
        currentUser
    ) => {
        const from =
            location.state?.from;

        let redirectTarget =
            null;

        if (
            typeof from ===
            "string"
        ) {
            redirectTarget =
                from;
        } else if (
            from?.pathname
        ) {
            redirectTarget =
                `${from.pathname}${from.search || ""}${from.hash || ""}`;
        }

        if (!redirectTarget) {
            redirectTarget =
                currentUser.role ===
                "admin"
                    ? "/admin/events"
                    : "/";
        }

        navigate(
            redirectTarget,
            {
                replace: true
            }
        );
    };

    const [
        form,
        setForm
    ] = useState({
        identifier: "",
        password: "",
        rememberMe: false
    });

    const [
        showPassword,
        setShowPassword
    ] = useState(false);

    const [
        loading,
        setLoading
    ] = useState(false);

    const [
        googleLoading,
        setGoogleLoading
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const handleChange =
        (event) => {
            const {
                name,
                value,
                type,
                checked
            } = event.target;

            setForm((prev) => ({
                ...prev,
                [name]:
                    type === "checkbox"
                        ? checked
                        : value
            }));

            setError("");
        };

const handleSubmit =
    async (event) => {
        event.preventDefault();

        if (
            !form.identifier.trim()
        ) {
            setError(
                "Vui lòng nhập email hoặc tên tài khoản."
            );
            return;
        }

        if (
            !form.password
        ) {
            setError(
                "Vui lòng nhập mật khẩu."
            );
            return;
        }

        try {
            setLoading(true);
            setError("");

            const result =
                await login({
                    identifier:
                        form.identifier,
                    password:
                        form.password,
                    rememberMe:
                        form.rememberMe
                });

            const currentUser =
                result?.data?.user;

            if (!currentUser) {
                throw new Error(
                    "Không nhận được thông tin người dùng."
                );
            }

                navigateAfterLogin(
                    currentUser
                );
        } catch (err) {
            setError(
                err.message ||
                "Đăng nhập thất bại."
            );
        } finally {
            setLoading(false);
        }
    };

const handleGoogleSuccess =
    async (
        credentialResponse
    ) => {
        try {
            setGoogleLoading(true);
            setError("");

            if (
                !credentialResponse?.credential
            ) {
                throw new Error(
                    "Không nhận được Google credential."
                );
            }

            const result =
                await loginWithGoogle(
                    credentialResponse.credential
                );

            const currentUser =
                result?.data?.user;

            if (!currentUser) {
                throw new Error(
                    "Không nhận được thông tin người dùng."
                );
            }

            navigateAfterLogin(
                currentUser
            );
        } catch (err) {
            setError(
                err.message ||
                "Đăng nhập Google thất bại."
            );
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleGoogleError =
        () => {
            setError(
                "Không thể đăng nhập bằng Google. Vui lòng thử lại."
            );
        };

    return (
        <AuthLayout className="login-auth">
        <div className="login-page">

            <main className="login-main">

                <section className="login-card">

                    <div className="login-visual">

                        <div className="visual-overlay" />

                        <div className="visual-content">

                            <div className="visual-eyebrow">
                                <span />
                                WELCOME
                            </div>

                            <h1>
                                Chào mừng đến với FYCE
                            </h1>

                            <p>
                                Hãy đăng nhập để có được trải nghiệm tốt nhất với FYCE. Nếu bạn chưa có tài khoản, hãy đăng ký ngay để bắt đầu.
                            </p>

                        </div>

                    </div>

                    <div className="login-panel">

                        <div className="login-content">

                            <h2>
                                Đăng nhập
                            </h2>

                            {error && (
                                <div className="login-error">
                                    {error}
                                </div>
                            )}

                            <form
                                onSubmit={
                                    handleSubmit
                                }
                            >

                                <div className="field-group">

                                    <label
                                        htmlFor="identifier"
                                    >
                                        Tên tài khoản hoặc Email
                                    </label>

                                    <div className="input-box">

                                        <Mail
                                            size={21}
                                        />

                                        <input
                                            id="identifier"
                                            name="identifier"
                                            type="text"
                                            value={
                                                form.identifier
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Nhập email hoặc tên tài khoản..."
                                            autoComplete="username"
                                        />

                                    </div>

                                </div>

                                <div className="field-group">

                                    <label
                                        htmlFor="password"
                                    >
                                        Mật khẩu
                                    </label>

                                    <div className="input-box">

                                        <LockKeyhole
                                            size={21}
                                        />

                                        <input
                                            id="password"
                                            name="password"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={
                                                form.password
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Nhập mật khẩu..."
                                            autoComplete="current-password"
                                        />

                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() =>
                                                setShowPassword(
                                                    (prev) =>
                                                        !prev
                                                )
                                            }
                                            aria-label={
                                                showPassword
                                                    ? "Ẩn mật khẩu"
                                                    : "Hiện mật khẩu"
                                            }
                                        >
                                            {showPassword ? (
                                                <EyeOff
                                                    size={21}
                                                />
                                            ) : (
                                                <Eye
                                                    size={21}
                                                />
                                            )}
                                        </button>

                                    </div>

                                </div>

                                <div className="login-options">

                                    <label className="remember-me">

                                        <input
                                            type="checkbox"
                                            name="rememberMe"
                                            checked={
                                                form.rememberMe
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        />

                                        <span>
                                            Ghi nhớ đăng nhập
                                        </span>

                                    </label>

                                   <button
                                    type="button"
                                    className="forgot-password-link"
                                    onClick={() =>
                                        navigate("/forgot-password")
                                    }
                                    >
                                    Quên mật khẩu?
                                    </button>

                                </div>

                                <button
                                    type="submit"
                                    className="login-submit"
                                    disabled={
                                        loading ||
                                        googleLoading
                                    }
                                >
                                    {loading
                                        ? "Đang đăng nhập..."
                                        : "Đăng nhập"}
                                </button>

                            </form>

                            <div className="login-separator">

                                <span />

                                <p>
                                    Hoặc tiếp tục với
                                </p>

                                <span />

                            </div>

                            <div className="google-login-wrapper">

                                <div className="google-custom-button">

                                    <svg
                                        viewBox="0 0 24 24"
                                        className="google-icon"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fill="#4285F4"
                                            d="M21.35 12.27c0-.7-.06-1.37-.18-2.02H12v3.83h5.22a4.47 4.47 0 0 1-1.94 2.94v2.45h3.15c1.85-1.7 2.92-4.21 2.92-7.2Z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 21.5c2.64 0 4.86-.87 6.48-2.36l-3.15-2.45c-.87.58-1.98.93-3.33.93-2.56 0-4.73-1.73-5.51-4.05H3.24v2.53A9.78 9.78 0 0 0 12 21.5Z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M6.49 13.57A5.88 5.88 0 0 1 6.18 12c0-.54.09-1.06.31-1.57V7.9H3.24A9.48 9.48 0 0 0 2.22 12c0 1.53.37 2.97 1.02 4.1l3.25-2.53Z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 6.38c1.44 0 2.73.5 3.75 1.48l2.81-2.81C16.85 3.43 14.64 2.5 12 2.5a9.78 9.78 0 0 0-8.76 5.4l3.25 2.53C7.27 8.11 9.44 6.38 12 6.38Z"
                                        />
                                    </svg>

                                    <span>
                                        Google
                                    </span>

                                    {googleLoading && (
                                        <span className="google-loading">
                                            ...
                                        </span>
                                    )}

                                </div>

                                <div className="google-provider-overlay">

                                    <GoogleLogin
                                        onSuccess={
                                            handleGoogleSuccess
                                        }
                                        onError={
                                            handleGoogleError
                                        }
                                        useOneTap={false}
                                        theme="outline"
                                        shape="pill"
                                        size="large"
                                        width="360"
                                    />

                                </div>

                            </div>

                            <div className="register-prompt">

                                <span>
                                    Chưa có tài khoản?
                                </span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            "/register",
                                            {
                                                state: {
                                                    from:
                                                        location.state?.from ||
                                                        null
                                                }
                                            }
                                        )
                                    }
                                >
                                    Đăng ký ngay
                                </button>

                            </div>

                        </div>

                    </div>

                </section>

            </main>

        </div>
        </AuthLayout>
    );
};

export default LoginForm;
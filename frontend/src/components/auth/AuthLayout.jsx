import AuthHeader from "./AuthHeader";
import AuthFooter from "./AuthFooter";

const AuthLayout = ({
    children,
    className = ""
}) => {
    return (
        <div
            className={`auth-layout ${className}`}
        >
            <AuthHeader />

            <main className="auth-content">
                {children}
            </main>

            <AuthFooter />
        </div>
    );
};

export default AuthLayout;
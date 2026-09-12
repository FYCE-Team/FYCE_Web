import AuthLayout from "../../components/auth/AuthLayout";
import RegisterForm from "../../components/auth/RegisterForm";

const Register = () => {
    return (
        <AuthLayout className="register-auth">
            <RegisterForm />
        </AuthLayout>
    );
};

export default Register;
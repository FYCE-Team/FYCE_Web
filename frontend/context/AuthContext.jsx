import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState
} from "react";

import {
    login as loginRequest,
    loginWithGoogle as googleLoginRequest,
    refresh as refreshRequest,
    logout as logoutRequest
} from "../src/services/auth.service.js";

const AuthContext = createContext(null);

export const AuthProvider = ({
    children
}) => {
    const [
        accessToken,
        setAccessToken
    ] = useState(null);

    const [
        user,
        setUser
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    const refreshSession =
        useCallback(async () => {
            try {
                const result =
                    await refreshRequest();

                const token =
                    result.data.accessToken;

                const currentUser =
                    result.data.user;

                setAccessToken(token);
                setUser(currentUser);

                return {
                    accessToken: token,
                    user: currentUser
                };
            } catch {
                setAccessToken(null);
                setUser(null);

                return null;
            }
        }, []);

    useEffect(() => {
        const bootstrap =
            async () => {
                await refreshSession();
                setLoading(false);
            };

        bootstrap();
    }, [refreshSession]);

    const login = useCallback(
        async ({
            identifier,
            password,
            rememberMe
        }) => {
            const result =
                await loginRequest({
                    identifier,
                    password,
                    rememberMe
                });

            const token =
                result.data.accessToken;

            const currentUser =
                result.data.user;

            setAccessToken(token);
            setUser(currentUser);

            return result;
        },
        []
    );

    const loginWithGoogle =
        useCallback(
            async (credential) => {
                const result =
                    await googleLoginRequest(
                        credential
                    );

                const token =
                    result.data.accessToken;

                const currentUser =
                    result.data.user;

                setAccessToken(token);
                setUser(currentUser);

                return result;
            },
            []
        );

    const refreshSessionToken =
        useCallback(async () => {
            return refreshSession();
        }, [refreshSession]);

    const logout = useCallback(
        async () => {
            try {
                await logoutRequest();
            } finally {
                setAccessToken(null);
                setUser(null);
            }
        },
        []
    );

    const value = {
        accessToken,
        user,
        loading,
        isAuthenticated:
            Boolean(
                accessToken &&
                user
            ),
        login,
        loginWithGoogle,
        refreshSession:
            refreshSessionToken,
        logout
    };

    return (
        <AuthContext.Provider
            value={value}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context =
        useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth phải được sử dụng bên trong AuthProvider"
        );
    }

    return context;
};
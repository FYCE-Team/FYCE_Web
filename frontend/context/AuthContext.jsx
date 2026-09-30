import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState
} from "react";

import {
    login as loginRequest,
    loginWithGoogle as googleLoginRequest,
    refresh as refreshRequest,
    logout as logoutRequest,
    updateProfile as updateProfileRequest
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

    const [sessionError, setSessionError] = useState("");
    const authGeneration = useRef(0);

    const refreshSession =
        useCallback(async () => {
            const generation = authGeneration.current;
            try {
                const result =
                    await refreshRequest();

                const token =
                    result.data.accessToken;

                const currentUser =
                    result.data.user;

                if (generation !== authGeneration.current) return null;
                setSessionError("");
                setAccessToken(token);
                setUser(currentUser);

                return {
                    accessToken: token,
                    user: currentUser
                };
            } catch (error) {
                if (generation !== authGeneration.current) return null;
                if ([401, 403].includes(error.status)) {
                    setAccessToken(null); setUser(null); setSessionError("");
                } else {
                    setSessionError("Chưa kết nối được máy chủ để khôi phục phiên. Vui lòng thử lại.");
                }
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
            authGeneration.current += 1;
            setSessionError("");
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
                authGeneration.current += 1;
                setSessionError("");
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


    const updateProfile =
        useCallback(
            async (profile) => {
                let token = accessToken;

                if (!token) {
                    const refreshed =
                        await refreshSession();

                    token =
                        refreshed?.accessToken ||
                        null;
                }

                if (!token) {
                    const authError =
                        new Error(
                            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                        );

                    authError.status = 401;
                    throw authError;
                }

                const makeRequest =
                    async (
                        currentToken
                    ) =>
                        updateProfileRequest(
                            profile,
                            currentToken
                        );

                let result = null;

                try {
                    result =
                        await makeRequest(
                            token
                        );
                } catch (error) {
                    if (
                        error.status !==
                        401
                    ) {
                        throw error;
                    }

                    const refreshed =
                        await refreshSession();

                    const nextToken =
                        refreshed
                            ?.accessToken ||
                        null;

                    if (!nextToken) {
                        throw error;
                    }

                    result =
                        await makeRequest(
                            nextToken
                        );
                }

                const currentUser =
                    result?.data?.user ||
                    null;

                if (!currentUser) {
                    throw new Error(
                        "Không nhận được thông tin tài khoản sau khi cập nhật."
                    );
                }

                setUser(currentUser);

                return result;
            },
            [
                accessToken,
                refreshSession
            ]
        );

    const logout = useCallback(
        async () => {
            authGeneration.current += 1;
            setSessionError("");
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
        sessionError,
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
        updateProfile,
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
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
    updateProfile as updateProfileRequest,
    readProfile
} from "../src/services/auth.service.js";
import { restoreSession } from "../src/services/sessionRestore.js";

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
    const tokenRef = useRef(null);
    const userRef = useRef(null);

    const refreshSession =
        useCallback(async () => {
            const generation = authGeneration.current;
            const tokenAtStart = tokenRef.current;
            try {
                const result =
                    await restoreSession({ refresh: refreshRequest, readProfile, accessToken: tokenAtStart });

                const token =
                    result.accessToken;

                const currentUser =
                    result.user;

                if (generation !== authGeneration.current) return null;
                if (tokenRef.current && tokenAtStart !== tokenRef.current) return { accessToken: tokenRef.current, user: userRef.current };
                setSessionError("");
                tokenRef.current = token;
                userRef.current = currentUser;
                setAccessToken(token);
                setUser(currentUser);

                return {
                    accessToken: token,
                    user: currentUser
                };
            } catch (error) {
                if (generation !== authGeneration.current) return null;
                if (tokenRef.current && tokenAtStart !== tokenRef.current) return { accessToken: tokenRef.current, user: userRef.current };
                if ([401, 403].includes(error.status)) {
                    tokenRef.current = null;
                    userRef.current = null;
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

    useEffect(() => {
        const restore = event => {
            if (!event.persisted) return;
            if (!tokenRef.current) setLoading(true);
            void refreshSession().finally(() => setLoading(false));
        };
        window.addEventListener("pageshow", restore);
        return () => window.removeEventListener("pageshow", restore);
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
            tokenRef.current = token;
            userRef.current = currentUser;
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
                tokenRef.current = token;
                userRef.current = currentUser;
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

                userRef.current = currentUser;
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
                tokenRef.current = null;
                userRef.current = null;
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

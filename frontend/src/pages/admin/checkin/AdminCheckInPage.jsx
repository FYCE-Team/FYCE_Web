import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";
import {
    AlertTriangle,
    Armchair,
    CalendarDays,
    Camera,
    CheckCircle2,
    MapPin,
    RefreshCw,
    ScanLine,
    ShieldCheck,
    Ticket,
    UserRound,
    XCircle
} from "lucide-react";

import {
    useAuth
} from "../../../../context/AuthContext.jsx";
import "./AdminCheckInPage.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000/api";

const formatDateTime = (value) => {
    if (!value) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    ).format(new Date(value));
};

const AdminCheckInPage = () => {
    const {
        accessToken,
        refreshSession
    } = useAuth();

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);
    const detectBusyRef = useRef(false);

    const [cameraActive, setCameraActive] =
        useState(false);
    const [cameraError, setCameraError] =
        useState("");
    const [manualValue, setManualValue] =
        useState("");
    const [currentQr, setCurrentQr] =
        useState("");
    const [verification, setVerification] =
        useState(null);
    const [loading, setLoading] =
        useState(false);
    const [error, setError] =
        useState("");

    const authenticatedRequest =
        useCallback(
            async (
                path,
                options = {}
            ) => {
                let token = accessToken;

                if (!token) {
                    const refreshed =
                        await refreshSession();
                    token =
                        refreshed?.accessToken ||
                        null;
                }

                if (!token) {
                    throw new Error(
                        "Phiên đăng nhập đã hết hạn."
                    );
                }

                const makeRequest = async (
                    currentToken
                ) => {
                    const response =
                        await fetch(
                            `${API_BASE_URL}${path}`,
                            {
                                ...options,
                                headers: {
                                    "Content-Type":
                                        "application/json",
                                    ...(options.headers ||
                                        {}),
                                    Authorization:
                                        `Bearer ${currentToken}`
                                },
                                credentials:
                                    "include"
                            }
                        );

                    let result = null;

                    try {
                        result =
                            await response.json();
                    } catch {
                        result = null;
                    }

                    if (
                        !response.ok ||
                        !result?.success
                    ) {
                        const requestError =
                            new Error(
                                result?.message ||
                                    "Không thể xử lý yêu cầu"
                            );
                        requestError.status =
                            response.status;
                        requestError.code =
                            result?.code ||
                            null;
                        requestError.data =
                            result?.data ||
                            null;
                        throw requestError;
                    }

                    return result.data;
                };

                try {
                    return await makeRequest(
                        token
                    );
                } catch (requestError) {
                    if (
                        requestError.status !==
                        401
                    ) {
                        throw requestError;
                    }

                    const refreshed =
                        await refreshSession();
                    const nextToken =
                        refreshed
                            ?.accessToken ||
                        null;

                    if (!nextToken) {
                        throw requestError;
                    }

                    return makeRequest(
                        nextToken
                    );
                }
            },
            [
                accessToken,
                refreshSession
            ]
        );

    const stopCamera = useCallback(
        () => {
            if (intervalRef.current) {
                window.clearInterval(
                    intervalRef.current
                );
                intervalRef.current =
                    null;
            }

            if (streamRef.current) {
                streamRef.current
                    .getTracks()
                    .forEach((track) =>
                        track.stop()
                    );
                streamRef.current =
                    null;
            }

            if (videoRef.current) {
                videoRef.current.srcObject =
                    null;
            }

            setCameraActive(false);
        },
        []
    );

    const verifyQr = useCallback(
        async (rawValue) => {
            const qrPayload = String(
                rawValue || ""
            ).trim();

            if (!qrPayload) {
                return;
            }

            if (
                !qrPayload.startsWith(
                    "FYCE1:"
                )
            ) {
                setVerification(null);
                setError(
                    "QR này không phải vé FYCE hợp lệ."
                );
                return;
            }

            try {
                setLoading(true);
                setError("");
                stopCamera();

                const data =
                    await authenticatedRequest(
                        "/tickets/admin/verify",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                qrPayload
                            })
                        }
                    );

                setCurrentQr(qrPayload);
                setVerification(data);
            } catch (err) {
                setCurrentQr("");
                setVerification(null);
                setError(
                    err.message ||
                        "Không thể xác thực vé"
                );
            } finally {
                setLoading(false);
            }
        },
        [
            authenticatedRequest,
            stopCamera
        ]
    );

    const startCamera = useCallback(
        async () => {
            setError("");
            setCameraError("");
            setVerification(null);
            setCurrentQr("");

            if (
                !("BarcodeDetector" in
                    window)
            ) {
                setCameraError(
                    "Trình duyệt này chưa hỗ trợ quét QR trực tiếp. Hãy dùng Chrome/Edge mới hoặc dán nội dung QR vào ô kiểm tra thủ công bên dưới."
                );
                return;
            }

            if (
                !navigator.mediaDevices
                    ?.getUserMedia
            ) {
                setCameraError(
                    "Thiết bị không hỗ trợ truy cập camera."
                );
                return;
            }

            try {
                stopCamera();

                const stream =
                    await navigator.mediaDevices.getUserMedia(
                        {
                            video: {
                                facingMode: {
                                    ideal:
                                        "environment"
                                }
                            },
                            audio: false
                        }
                    );

                streamRef.current =
                    stream;

                if (videoRef.current) {
                    videoRef.current.srcObject =
                        stream;
                    await videoRef.current.play();
                }

                const detector =
                    new window.BarcodeDetector(
                        {
                            formats: [
                                "qr_code"
                            ]
                        }
                    );

                setCameraActive(true);

                intervalRef.current =
                    window.setInterval(
                        async () => {
                            if (
                                detectBusyRef.current ||
                                !videoRef.current ||
                                videoRef.current
                                    .readyState < 2
                            ) {
                                return;
                            }

                            try {
                                detectBusyRef.current =
                                    true;
                                const codes =
                                    await detector.detect(
                                        videoRef.current
                                    );

                                const rawValue =
                                    codes?.[0]
                                        ?.rawValue;

                                if (rawValue) {
                                    await verifyQr(
                                        rawValue
                                    );
                                }
                            } catch {
                                // A single failed frame must not stop the scanner.
                            } finally {
                                detectBusyRef.current =
                                    false;
                            }
                        },
                        450
                    );
            } catch (err) {
                stopCamera();
                setCameraError(
                    err?.name ===
                    "NotAllowedError"
                        ? "Bạn chưa cấp quyền camera cho trình duyệt."
                        : "Không thể mở camera. Hãy kiểm tra quyền camera và thử lại."
                );
            }
        },
        [stopCamera, verifyQr]
    );

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const handleManualVerify =
        async (event) => {
            event.preventDefault();
            await verifyQr(manualValue);
        };

    const handleCheckIn = async () => {
        if (!currentQr) {
            return;
        }

        try {
            setLoading(true);
            setError("");

            const data =
                await authenticatedRequest(
                    "/tickets/admin/check-in",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            qrPayload:
                                currentQr
                        })
                    }
                );

            setVerification(data);
        } catch (err) {
            setError(
                err.message ||
                    "Không thể check-in vé"
            );

            if (
                err.code ===
                "TICKET_ALREADY_CHECKED_IN"
            ) {
                setVerification(
                    (current) => ({
                        ...(current || {}),
                        verification:
                            "already_checked_in",
                        canCheckIn: false,
                        ticket: {
                            ...(current
                                ?.ticket ||
                                {}),
                            status:
                                "checked_in",
                            checkedInAt:
                                err.data
                                    ?.checkedInAt ||
                                current?.ticket
                                    ?.checkedInAt ||
                                null
                        }
                    })
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = () => {
        setVerification(null);
        setCurrentQr("");
        setManualValue("");
        setError("");
        setCameraError("");
    };

    const ticket =
        verification?.ticket || null;
    const isCheckedIn =
        verification?.verification ===
            "checked_in" ||
        verification?.verification ===
            "already_checked_in" ||
        ticket?.status === "checked_in";

    return (
        <div className="admin-checkin-page">
            <section className="admin-checkin-hero">
                <div>
                    <span className="admin-checkin-kicker">
                        <ShieldCheck
                            size={16}
                        />
                        ADMIN ONLY
                    </span>
                    <h1>
                        Quét vé & Check-in
                    </h1>
                    <p>
                        QR của khách chỉ chứa token ký bởi FYCE, không chứa tên, email, số điện thoại hay thông tin thanh toán.
                    </p>
                </div>

                <div className="admin-checkin-security">
                    <ShieldCheck
                        size={22}
                    />
                    <div>
                        <strong>
                            Xác thực tại server
                        </strong>
                        <span>
                            Biết mã TKT không đủ để vào cửa. Chỉ QR có chữ ký hợp lệ mới được chấp nhận.
                        </span>
                    </div>
                </div>
            </section>

            <div className="admin-checkin-grid">
                <section className="admin-checkin-panel">
                    <div className="admin-checkin-panel-heading">
                        <div>
                            <span>
                                BƯỚC 1
                            </span>
                            <h2>
                                Quét mã QR
                            </h2>
                        </div>
                        <ScanLine
                            size={24}
                        />
                    </div>

                    <div className="admin-scanner-frame">
                        <video
                            ref={videoRef}
                            playsInline
                            muted
                            className={
                                cameraActive
                                    ? "admin-scanner-video is-active"
                                    : "admin-scanner-video"
                            }
                        />

                        {!cameraActive && (
                            <div className="admin-scanner-placeholder">
                                <Camera
                                    size={38}
                                />
                                <strong>
                                    Camera chưa bật
                                </strong>
                                <span>
                                    Hướng camera vào QR trên vé của khách.
                                </span>
                            </div>
                        )}

                        {cameraActive && (
                            <div className="admin-scanner-target">
                                <span />
                            </div>
                        )}
                    </div>

                    {cameraError && (
                        <div className="admin-checkin-alert admin-checkin-alert--warning">
                            <AlertTriangle
                                size={18}
                            />
                            <span>
                                {cameraError}
                            </span>
                        </div>
                    )}

                    <div className="admin-checkin-actions">
                        <button
                            type="button"
                            className="admin-checkin-btn admin-checkin-btn--primary"
                            onClick={
                                startCamera
                            }
                            disabled={loading}
                        >
                            <Camera
                                size={17}
                            />
                            {cameraActive
                                ? "Đang quét..."
                                : "Bật camera"}
                        </button>

                        {cameraActive && (
                            <button
                                type="button"
                                className="admin-checkin-btn"
                                onClick={
                                    stopCamera
                                }
                            >
                                Dừng camera
                            </button>
                        )}
                    </div>

                    <form
                        className="admin-checkin-manual"
                        onSubmit={
                            handleManualVerify
                        }
                    >
                        <label
                            htmlFor="manual-ticket-qr"
                        >
                            Kiểm tra thủ công
                        </label>
                        <p>
                            Dùng khi thiết bị không hỗ trợ camera scanner hoặc lúc phát triển localhost.
                        </p>
                        <div>
                            <input
                                id="manual-ticket-qr"
                                type="text"
                                value={
                                    manualValue
                                }
                                onChange={(event) =>
                                    setManualValue(
                                        event.target
                                            .value
                                    )
                                }
                                placeholder="FYCE1:eyJ..."
                                autoComplete="off"
                                spellCheck="false"
                            />
                            <button
                                type="submit"
                                disabled={
                                    loading ||
                                    !manualValue.trim()
                                }
                            >
                                Kiểm tra
                            </button>
                        </div>
                    </form>
                </section>

                <section className="admin-checkin-panel admin-checkin-result-panel">
                    <div className="admin-checkin-panel-heading">
                        <div>
                            <span>
                                BƯỚC 2
                            </span>
                            <h2>
                                Xác nhận vé
                            </h2>
                        </div>
                        <Ticket
                            size={24}
                        />
                    </div>

                    {error && (
                        <div className="admin-checkin-alert admin-checkin-alert--error">
                            <XCircle
                                size={18}
                            />
                            <span>{error}</span>
                        </div>
                    )}

                    {!ticket ? (
                        <div className="admin-checkin-empty">
                            <ScanLine
                                size={42}
                            />
                            <strong>
                                Chưa có vé để xác nhận
                            </strong>
                            <span>
                                Quét QR của khách. Hệ thống sẽ kiểm tra chữ ký và trạng thái vé ở backend trước khi cho phép check-in.
                            </span>
                        </div>
                    ) : (
                        <div className="admin-checkin-ticket">
                            <div
                                className={`admin-checkin-verdict admin-checkin-verdict--${
                                    verification?.canCheckIn
                                        ? "valid"
                                        : isCheckedIn
                                          ? "used"
                                          : "invalid"
                                }`}
                            >
                                {verification?.canCheckIn ? (
                                    <CheckCircle2
                                        size={26}
                                    />
                                ) : (
                                    <AlertTriangle
                                        size={26}
                                    />
                                )}
                                <div>
                                    <strong>
                                        {verification?.canCheckIn
                                            ? "Vé hợp lệ"
                                            : isCheckedIn
                                              ? "Vé đã check-in"
                                              : "Vé không còn hiệu lực"}
                                    </strong>
                                    <span>
                                        {verification?.canCheckIn
                                            ? "Kiểm tra thông tin rồi bấm xác nhận check-in."
                                            : isCheckedIn
                                              ? `Đã sử dụng lúc ${formatDateTime(
                                                    ticket.checkedInAt
                                                )}`
                                              : "Không được phép cho khách vào bằng vé này."}
                                    </span>
                                </div>
                            </div>

                            <div className="admin-checkin-ticket-code">
                                <span>
                                    Mã vé
                                </span>
                                <strong>
                                    {ticket.ticketCode}
                                </strong>
                            </div>

                            <div className="admin-checkin-details">
                                <div>
                                    <UserRound
                                        size={17}
                                    />
                                    <span>
                                        Người giữ vé
                                    </span>
                                    <strong>
                                        {ticket.holderName}
                                    </strong>
                                </div>
                                <div>
                                    <Armchair
                                        size={17}
                                    />
                                    <span>
                                        Ghế
                                    </span>
                                    <strong>
                                        {ticket.seat?.label ||
                                            `${ticket.seat?.row || ""}${ticket.seat?.number || ""}`}
                                    </strong>
                                </div>
                                <div>
                                    <CalendarDays
                                        size={17}
                                    />
                                    <span>
                                        Sự kiện
                                    </span>
                                    <strong>
                                        {ticket.event
                                            ?.title}
                                    </strong>
                                </div>
                                <div>
                                    <MapPin
                                        size={17}
                                    />
                                    <span>
                                        Địa điểm
                                    </span>
                                    <strong>
                                        {ticket.event
                                            ?.venue ||
                                            "Đang cập nhật"}
                                    </strong>
                                </div>
                            </div>

                            {verification?.canCheckIn && (
                                <button
                                    type="button"
                                    className="admin-checkin-confirm"
                                    onClick={
                                        handleCheckIn
                                    }
                                    disabled={loading}
                                >
                                    <CheckCircle2
                                        size={19}
                                    />
                                    {loading
                                        ? "Đang xác nhận..."
                                        : "Xác nhận check-in"}
                                </button>
                            )}

                            {!verification?.canCheckIn && (
                                <button
                                    type="button"
                                    className="admin-checkin-btn admin-checkin-btn--wide"
                                    onClick={
                                        resetScanner
                                    }
                                >
                                    <RefreshCw
                                        size={17}
                                    />
                                    Quét vé khác
                                </button>
                            )}

                            {verification?.verification ===
                                "checked_in" && (
                                <div className="admin-checkin-success-note">
                                    <CheckCircle2
                                        size={18}
                                    />
                                    Check-in đã được ghi nhận trên hệ thống. QR này không thể dùng lần thứ hai.
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default AdminCheckInPage;

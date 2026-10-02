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
import { createQrCamera } from "./qrCamera.js";

import { API_BASE_URL } from "../../../config/api.js";

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

    const [eventId, setEventId] = useState("");
    const [events, setEvents] = useState([]);

    const videoRef = useRef(null);
    const cameraRef = useRef(null);
    const verifyRef = useRef(null);
    const requestBusyRef = useRef(false);
    const [cameraStarting, setCameraStarting] = useState(false);

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

    useEffect(() => {
        let active = true;
        authenticatedRequest("/events/admin/all").then(data => { if (active) setEvents(data.events || []); }).catch(error => { if (active) setError(error.message); });
        return () => { active = false; };
    }, [authenticatedRequest]);

    const stopCamera = useCallback(() => { cameraRef.current?.stop(); }, []);

    useEffect(() => {
        const camera = createQrCamera({
            getStream: () => navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }),
            getVideo: () => videoRef.current,
            createDetector: () => new window.BarcodeDetector({ formats: ["qr_code"] }),
            onCode: code => verifyRef.current?.(code),
            onActive: setCameraActive
        });
        cameraRef.current = camera;
        return () => { camera.stop(); cameraRef.current = null; };
    }, []);

    const verifyQr = useCallback(
        async (rawValue) => {
            if (requestBusyRef.current) return;
            const qrPayload = String(
                rawValue || ""
            ).trim();

            if (!qrPayload) {
                return;
            }

            if (
                !qrPayload.startsWith(
                    "FYCE1:"
                ) && !qrPayload.startsWith("FYCEB1:") && !/^FYCE-\d{8}-[A-Z0-9]+$/i.test(qrPayload) && !/^TKT-[A-Z0-9-]{4,64}$/i.test(qrPayload)
            ) {
                setCurrentQr("");
                setVerification(null);
                cameraRef.current?.resume();
                setError(
                    "Nhập mã vé TKT-… hoặc nội dung QR FYCE hợp lệ."
                );
                return;
            }

            try {
                setLoading(true);
                setError("");
                requestBusyRef.current = true;
                cameraRef.current?.pause();

                const data =
                    await authenticatedRequest(
                        "/tickets/admin/verify",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                qrPayload, eventId: eventId || undefined
                            })
                        }
                    );

                setCurrentQr(qrPayload);
                setVerification(data);
                if (!data.canCheckIn) cameraRef.current?.resume();
            } catch (err) {
                setCurrentQr("");
                setVerification(null);
                cameraRef.current?.resume();
                setError(
                    err.message ||
                        "Không thể xác thực vé"
                );
            } finally {
                requestBusyRef.current = false;
                setLoading(false);
            }
        },
        [
            authenticatedRequest,
            eventId
        ]
    );

    useEffect(() => { verifyRef.current = verifyQr; }, [verifyQr]);

    const startCamera = async () => {
        if (cameraActive || cameraStarting) return;
        setCameraError("");
        if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
            setCameraError("Trình duyệt này chưa hỗ trợ camera quét QR. Hãy dùng Chrome/Edge tương thích hoặc nhập mã vé bên dưới.");
            return;
        }
        setCameraStarting(true);
        try {
            if (verification?.canCheckIn) cameraRef.current?.pause();
            else cameraRef.current?.resume();
            await cameraRef.current?.start();
        } catch (err) {
            setCameraError(err?.name === "NotAllowedError" ? "Bạn chưa cấp quyền camera cho trình duyệt." : "Không thể mở camera. Hãy kiểm tra quyền camera và thử lại.");
        } finally { setCameraStarting(false); }
    };

    const handleManualVerify =
        async (event) => {
            event.preventDefault();
            await verifyQr(manualValue);
        };

    const handleCheckIn = async () => {
        if (!currentQr || requestBusyRef.current) {
            return;
        }

        try {
            requestBusyRef.current = true;
            cameraRef.current?.pause();
            setLoading(true);
            setError("");

            const data =
                await authenticatedRequest(
                    "/tickets/admin/check-in",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            qrPayload:
                                currentQr,
                            eventId: eventId || undefined
                        })
                    }
                );

            setVerification(data);
            cameraRef.current?.resume();
        } catch (err) {
            setError(
                err.message ||
                    "Không thể check-in vé"
            );

            if (
                err.code ===
                "TICKET_ALREADY_CHECKED_IN"
            ) {
                cameraRef.current?.resume();
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
            requestBusyRef.current = false;
            setLoading(false);
        }
    };

    const resetScanner = () => {
        cameraRef.current?.resume();
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
                            Chỉ nhân viên được phân quyền có thể xác thực QR hoặc mã vé. Trạng thái vé luôn được kiểm tra tại máy chủ.
                        </span>
                    </div>
                </div>
            </section>

            <section className="admin-checkin-panel" style={{ marginBottom: 24 }}>
                <label htmlFor="checkin-event">Sự kiện tại cổng check-in</label>
                <select id="checkin-event" disabled={loading || cameraActive || cameraStarting} value={eventId} onChange={event => { setEventId(event.target.value); setVerification(null); setCurrentQr(""); }} style={{ display: "block", padding: 12, marginTop: 10, maxWidth: "100%" }}>
                    <option value="">Kiểm tra tất cả sự kiện</option>
                    {events.map(event => <option key={event._id} value={event._id}>{event.title}</option>)}
                </select>
                <p>Chọn sự kiện để từ chối vé của buổi diễn khác.</p>
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

                        {(cameraActive || cameraStarting) && (
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
                            disabled={loading || cameraActive || cameraStarting}
                        >
                            <Camera
                                size={17}
                            />
                            {cameraActive
                                ? "Camera đang mở"
                                : "Bật camera"}
                        </button>

                        {(cameraActive || cameraStarting) && (
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

                    {cameraActive && <p role="status">{verification?.canCheckIn ? "Camera vẫn mở. Xác nhận vé hoặc chọn quét vé khác để tiếp tục." : "Camera vẫn mở và sẵn sàng nhận mã tiếp theo. Đưa mã vừa quét ra khỏi khung hình."}</p>}

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
                                placeholder="Mã đơn FYCE-…, mã vé TKT-… hoặc QR"
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

                            {verification?.group && <div className="admin-checkin-group-summary"><strong>{verification.admittedCount ? `Đã check-in ${verification.admittedCount} ghế` : `${verification.validCount} ghế sẽ được check-in cùng lúc`}</strong><p>{verification.checkedInCount} đã vào cổng · {verification.excludedCount} đã hủy/hoàn · Tổng {verification.totalCount} ghế</p><p>Chỉ xác nhận khi cả nhóm đã có mặt. Muốn đón riêng từng khách, nhập mã TKT của từng ghế.</p></div>}
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
                                        : verification?.group ? `Xác nhận ${verification.validCount} ghế` : "Xác nhận check-in"}
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

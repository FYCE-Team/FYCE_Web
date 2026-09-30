import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  useAdminApi,
  money,
  dateTime,
  labels,
} from "../../../services/admin.service.js";
import { Badge, Notice, PageTitle, Pagination } from "./AdminShared.jsx";
export default function AdminRecords({ kind }) {
  const api = useAdminApi();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || "");
  const [data, setData] = useState({ items: [], total: 0 }),
    [loadedKey, setLoadedKey] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0),
    [editor, setEditor] = useState(null),
    [audit, setAudit] = useState(null),
    [saving, setSaving] = useState(false),
    [confirmCancel, setConfirmCancel] = useState(false),
    [events, setEvents] = useState([]);
  const [refundIds, setRefundIds] = useState([]);
  const [refundReason, setRefundReason] = useState("");
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const detailRef = useRef(null);
  const detailKey = editor ? `user:${editor._id || "new"}` : audit ? `booking:${audit.booking._id}` : "";
  useEffect(() => {
    if (detailKey) {
      detailRef.current?.focus({ preventScroll: true });
      detailRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [detailKey]);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const query = params.toString();
  const requestKey = `${kind}:${query}:${revision}`;
  const busy = loadedKey !== requestKey;
  useEffect(() => {
    const controller = new AbortController();
    api(`/admin/${kind}?${query}`, { signal: controller.signal })
      .then((data) => {
        setData(data);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedKey(requestKey);
      });
    return () => controller.abort();
  }, [api, kind, query, revision, requestKey]);
  useEffect(() => {
    const c = new AbortController();
    if (kind !== "users")
      api("/events/admin/all", { signal: c.signal })
        .then((result) => setEvents(result.events || []))
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        });
    return () => c.abort();
  }, [api, kind]);
  const filter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  };
  const saveUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api(`/admin/users${editor._id ? `/${editor._id}` : ""}`, {
        method: editor._id ? "PATCH" : "POST",
        body: editor,
      });
      setEditor(null);
      setRevision((x) => x + 1);
      setMessage("Đã lưu người dùng.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const inspect = async (id) => {
    setSaving(true);
    setError("");
    try {
      setConfirmCancel(false);
      setRefundIds([]); setRefundReason(""); setRefundConfirmed(false);
      setAudit(await api(`/admin/bookings/${id}/audit`));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const reconcile = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await api(
        `/admin/bookings/${audit.booking._id}/reconcile`,
        { method: "POST" },
      );
      setMessage(result.message);
      setAudit(await api(`/admin/bookings/${audit.booking._id}/audit`));
      setRevision((x) => x + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const cancelBooking = async () => {
    setSaving(true);
    setError("");
    try {
      await api(`/admin/bookings/${audit.booking._id}/cancel`, {
        method: "POST",
      });
      setAudit(await api(`/admin/bookings/${audit.booking._id}/audit`));
      setConfirmCancel(false);
      setRevision((x) => x + 1);
      setMessage("Đã hủy đơn và giải phóng ghế còn giữ.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const refundTickets = async (event) => {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      await api(`/admin/bookings/${audit.booking._id}/refund`, {
        method: "POST",
        body: { ticketIds: refundIds, reason: refundReason, offlineRefundConfirmed: refundConfirmed, updatedAt: audit.booking.updatedAt },
      });
      setRefundIds([]); setRefundReason(""); setRefundConfirmed(false);
      setAudit(await api(`/admin/bookings/${audit.booking._id}/audit`));
      setRevision(x => x + 1);
      setMessage("Đã ghi nhận hoàn tiền thủ công, hủy vé và trả ghế. QR cũ không còn hiệu lực.");
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };
  const isUsers = kind === "users",
    isTickets = kind === "tickets";
  const statuses = isTickets
    ? ["valid", "checked_in", "cancelled", "refunded"]
    : ["pending_payment", "confirmed", "expired", "cancelled"];
  return (
    <div className="am-page">
      <PageTitle
        title={
          isUsers
            ? "Quản lý người dùng"
            : isTickets
              ? "Danh sách vé & check-in"
              : "Đơn vé & thanh toán"
        }
        description={
          isUsers
            ? "Tra cứu tài khoản, cập nhật hồ sơ và quản lý quyền truy cập."
            : isTickets
              ? "Theo dõi vé đã phát hành và lịch sử vào cổng theo từng sự kiện."
              : "Tra cứu đơn, đối chiếu vé và xác minh thanh toán với SePay."
        }
      >
        <button disabled={busy} onClick={() => setRevision((x) => x + 1)}>
          Làm mới
        </button>
        {isUsers ? (
          <button
            className="am-primary"
            onClick={() =>
              setEditor({
                username: "",
                fullName: "",
                email: "",
                phone: "",
                password: "",
                role: "user",
                isActive: true,
                isBlocked: false,
              })
            }
          >
            Thêm người dùng
          </button>
        ) : (
          <Link className="am-primary" to="/admin/check-in">
            Quét vé check-in
          </Link>
        )}
      </PageTitle>
      <Notice error={error} message={message} />
      {editor && (
        <section className="am-card am-detail" ref={detailRef} tabIndex={-1} aria-label="Chỉnh sửa người dùng">
          <h2>{editor._id ? "Chỉnh sửa người dùng" : "Tạo tài khoản"}</h2>
          <form onSubmit={saveUser} className="am-form">
            <fieldset disabled={saving}>
              <div className="am-form-grid">
                {[
                  "fullName",
                  "phone",
                  ...(!editor._id ? ["username", "email", "password"] : []),
                ].map((key) => (
                  <label key={key}>
                    {
                      {
                        fullName: "Họ tên",
                        phone: "Số điện thoại",
                        username: "Tên đăng nhập",
                        email: "Email",
                        password: "Mật khẩu (tối thiểu 10 ký tự)",
                      }[key]
                    }
                    <input
                      required={key !== "phone"}
                      type={
                        key === "password"
                          ? "password"
                          : key === "email"
                            ? "email"
                            : "text"
                      }
                      autoComplete={key === "password" ? "new-password" : "off"}
                      value={editor[key] || ""}
                      onChange={(e) =>
                        setEditor({ ...editor, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <label>
                  Vai trò
                  <select
                    value={editor.role}
                    onChange={(e) =>
                      setEditor({ ...editor, role: e.target.value })
                    }
                  >
                    <option value="user">Người dùng</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </label>
                <label className="am-checkbox">
                  <input
                    type="checkbox"
                    checked={editor.isActive}
                    onChange={(e) =>
                      setEditor({ ...editor, isActive: e.target.checked })
                    }
                  />{" "}
                  Đã xác thực tài khoản
                </label>
                <label className="am-checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(editor.isBlocked)}
                    onChange={(e) =>
                      setEditor({ ...editor, isBlocked: e.target.checked })
                    }
                  />{" "}
                  Khóa đăng nhập
                </label>
              </div>
              <p>
                Email và tên đăng nhập của tài khoản hiện có được giữ nguyên để
                bảo toàn định danh. Tài khoản quản trị được bảo vệ khỏi khóa/hạ
                quyền.
              </p>
              <div className="am-actions">
                <button className="am-primary" type="submit">
                  {saving ? "Đang lưu…" : "Lưu người dùng"}
                </button>
                <button type="button" onClick={() => setEditor(null)}>
                  Đóng
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}
      {audit && (
        <section className="am-card am-detail" ref={detailRef} tabIndex={-1} aria-label="Chi tiết đối chiếu đơn vé">
          <div className="am-section-heading">
            <h2>Đối chiếu {audit.booking.bookingCode}</h2>
            <button disabled={saving} onClick={() => setAudit(null)}>
              Đóng
            </button>
          </div>
          <p>
            {audit.booking.customer.fullName} · {audit.booking.customer.email} ·{" "}
            {money(audit.booking.totalAmount)}
          </p>
          <div className="am-actions">
            <Badge value={audit.booking.status} />
            <Badge value={audit.booking.paymentStatus} />
            <button
              disabled={
                saving ||
                ["cancelled", "expired"].includes(audit.booking.status)
              }
              onClick={reconcile}
            >
              {saving ? "Đang xử lý…" : "Đối soát với SePay / Đồng bộ vé"}
            </button>
          </div>
          {audit.booking.status === "pending_payment" && (
            <div className="am-actions" style={{ marginTop: 16 }}>
              {confirmCancel ? (
                <>
                  <span>Hủy đơn này và giải phóng ghế đang giữ?</span>
                  <button
                    className="am-danger"
                    disabled={saving}
                    onClick={cancelBooking}
                  >
                    Xác nhận hủy đơn
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => setConfirmCancel(false)}
                  >
                    Giữ đơn
                  </button>
                </>
              ) : (
                <button
                  disabled={saving}
                  className="am-danger"
                  onClick={() => setConfirmCancel(true)}
                >
                  Hủy đơn chờ thanh toán
                </button>
              )}
            </div>
          )}
          <p>
            Chỉ ghi nhận thanh toán khi máy chủ xác minh với SePay. Đơn hết hạn
            hoặc đã hủy cần xử lý ngoại lệ với nhà cung cấp thanh toán.
          </p>
          {audit.issues.length ? (
            <ul className="am-error">
              {audit.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="am-notice">
              Chưa phát hiện chênh lệch giữa dữ liệu đơn và vé.
            </p>
          )}
          <div className="am-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ghế</th>
                  <th>Mã vé dự kiến</th>
                  <th>Giá</th>
                  <th>Phát hành</th>
                  <th>Check-in</th>
                </tr>
              </thead>
              <tbody>
                {audit.booking.items.map((item) => {
                  const ticket = audit.tickets.find(
                    (t) => t.ticketCode === item.ticketCode,
                  );
                  return (
                    <tr key={item.ticketCode}>
                      <td>{item.seatLabel}</td>
                      <td>{item.ticketCode}</td>
                      <td>{money(item.unitPrice)}</td>
                      <td>
                        {ticket ? (
                          <Badge value={ticket.status} />
                        ) : (
                          "Chưa phát hành"
                        )}
                      </td>
                      <td>
                        {dateTime(ticket?.checkedInAt)}
                        <small>{ticket?.checkedInBy?.fullName}</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p>Đã ghi nhận hoàn thủ công: <strong>{money(audit.booking.refundedAmount || 0)}</strong>. Tổng tiền mua ban đầu được giữ trong lịch sử.</p>
          {audit.booking.status === "confirmed" && audit.booking.paymentStatus === "paid" && (
            <form className="am-form" onSubmit={refundTickets}>
              <fieldset disabled={saving}>
                <legend>Hủy vé sau khi hoàn tiền thủ công</legend>
                <p>Trao đổi và xử lý hoàn tiền qua Facebook, Zalo hoặc kênh đã thống nhất trước. Chọn vé cần hủy; ghế được mở bán lại, lần mua mới có QR mới. Vé đã check-in không được hủy tại đây.</p>
                {audit.tickets.filter(t => t.status === "valid").map(ticket => (
                  <label className="am-checkbox" key={ticket._id}>
                    <input type="checkbox" checked={refundIds.includes(ticket._id)} onChange={e => { setRefundConfirmed(false); setRefundIds(ids => e.target.checked ? [...ids, ticket._id] : ids.filter(id => id !== ticket._id)); }} />
                    {ticket.seatLabel} · {ticket.ticketCode} · {money(ticket.unitPrice)}
                  </label>
                ))}
                <label>Ghi chú hoàn tiền
                  <textarea required maxLength={500} value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Kênh trao đổi, lý do và thông tin đối chiếu cần thiết" />
                </label>
                <p>Số vé chọn: {refundIds.length} · Số tiền ghi nhận: {money(audit.tickets.filter(t => refundIds.includes(t._id)).reduce((sum, t) => sum + t.unitPrice, 0))}</p>
                <label className="am-checkbox"><input type="checkbox" required checked={refundConfirmed} onChange={e => setRefundConfirmed(e.target.checked)} />Tôi xác nhận đã xử lý hoàn tiền ngoài hệ thống và muốn hủy các vé đã chọn.</label>
                <button className="am-danger" disabled={!refundIds.length || !refundConfirmed || !refundReason.trim()}>Xác nhận hủy vé và trả ghế</button>
              </fieldset>
            </form>
          )}
          {audit.tickets.some(t => t.refundedAt) && <><h3>Lịch sử hoàn vé thủ công</h3><ul>{audit.tickets.filter(t => t.refundedAt).map(t => <li key={t._id}>{t.seatLabel} · {t.ticketCode} · {dateTime(t.refundedAt)} · {t.refundedBy?.fullName || "Quản trị viên"} · {t.refundReason}</li>)}</ul></>}
          {audit.booking.paymentReviewRequired && <p className="am-error">Đã nhận thông báo giao dịch cần đối chiếu. Kiểm tra số tiền và quyền sở hữu ghế trước khi xử lý với khách.</p>}
          <h3>Email vé</h3>
          <p>{audit.ticketEmail?.status === "sent" ? `Đã gửi lúc ${dateTime(audit.ticketEmail.sentAt)}` : audit.ticketEmail?.status === "skipped" ? "Không gửi vì đơn/vé không còn hiệu lực." : audit.ticketEmail ? `Đang chờ gửi / tự động thử lại. ${audit.ticketEmail.lastError || ""}` : "Chưa có yêu cầu gửi email vé."}</p>
          <h3>Lịch sử xử lý thanh toán</h3>
          {audit.payments?.length ? (
            <div className="am-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Số tiền nhận</th>
                    <th>Kết quả</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.payments.map((payment) => (
                    <tr key={payment._id}>
                      <td>{dateTime(payment.createdAt)}</td>
                      <td>{money(payment.amountReceived)}</td>
                      <td>
                        {payment.outcome === "accepted"
                          ? "Đã ghi nhận"
                          : "Cần đối soát"}
                      </td>
                      <td>{payment.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>
              Chưa có lịch sử xử lý được lưu. Các giao dịch trước bản cập nhật
              không có nhật ký này.
            </p>
          )}
        </section>
      )}
      <section className="am-card">
        <div className="am-filters">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              filter("q", search);
            }}
          >
            <input
              aria-label="Từ khóa tìm kiếm"
              placeholder={
                isUsers
                  ? "Tên, email, điện thoại…"
                  : isTickets
                    ? "Mã vé, mã đơn, ghế…"
                    : "Mã đơn, tên, email…"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button>Tìm kiếm</button>
          </form>
          {isUsers ? (
            <>
              <select
                aria-label="Vai trò"
                value={params.get("role") || ""}
                onChange={(e) => filter("role", e.target.value)}
              >
                <option value="">Mọi vai trò</option>
                <option value="admin">Quản trị viên</option>
                <option value="user">Người dùng</option>
              </select>
              <select
                aria-label="Hoạt động"
                value={params.get("isBlocked") || ""}
                onChange={(e) => filter("isBlocked", e.target.value)}
              >
                <option value="">Mọi tài khoản</option>
                <option value="false">Không bị khóa</option>
                <option value="true">Đã khóa</option>
              </select>
            </>
          ) : (
            <>
              <select
                aria-label="Sự kiện"
                value={params.get("eventId") || ""}
                onChange={(e) => filter("eventId", e.target.value)}
              >
                <option value="">Tất cả sự kiện</option>
                {events.map((event) => (
                  <option
                    key={event._id || event.id}
                    value={event._id || event.id}
                  >
                    {event.title}
                  </option>
                ))}
              </select>
              <select
                aria-label="Trạng thái"
                value={params.get("status") || ""}
                onChange={(e) => filter("status", e.target.value)}
              >
                <option value="">Mọi trạng thái</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {labels[s]}
                  </option>
                ))}
              </select>
              {!isTickets && (
                <select
                  aria-label="Thanh toán"
                  value={params.get("paymentStatus") || ""}
                  onChange={(e) => filter("paymentStatus", e.target.value)}
                >
                  <option value="">Mọi thanh toán</option>
                  {["unpaid", "processing", "paid", "failed", "refunded"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {labels[s]}
                      </option>
                    ),
                  )}
                </select>
              )}
            </>
          )}
        </div>
        {busy ? (
          <p className="am-empty" role="status">
            Đang tải dữ liệu…
          </p>
        ) : (
          <div className="am-table-wrap">
            <table>
              <thead>
                <tr>
                  {(isUsers
                    ? [
                        "Người dùng",
                        "Liên hệ",
                        "Vai trò",
                        "Trạng thái",
                        "Thao tác",
                      ]
                    : isTickets
                      ? [
                          "Vé / Đơn",
                          "Khách hàng",
                          "Sự kiện / Ghế",
                          "Trạng thái",
                          "Check-in / Nhân viên",
                        ]
                      : [
                          "Đơn vé",
                          "Khách hàng",
                          "Sự kiện",
                          "Tổng tiền",
                          "Trạng thái",
                          "Thao tác",
                        ]
                  ).map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row._id}>
                    {isUsers ? (
                      <>
                        <td>
                          <strong>{row.fullName}</strong>
                          <small>@{row.username}</small>
                        </td>
                        <td>
                          {row.email}
                          <small>{row.phone || "—"}</small>
                        </td>
                        <td>
                          {row.role === "admin"
                            ? "Quản trị viên"
                            : "Người dùng"}
                        </td>
                        <td>
                          <span
                            className={`am-badge ${row.isActive && !row.isBlocked ? "am-paid" : "am-expired"}`}
                          >
                            {row.isBlocked
                              ? "Đã khóa"
                              : row.isActive
                                ? "Hoạt động"
                                : "Chưa xác thực"}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => { setMessage(""); setError(""); setEditor(row); }}>
                            Chỉnh sửa
                          </button>
                        </td>
                      </>
                    ) : isTickets ? (
                      <>
                        <td>
                          <strong>{row.ticketCode}</strong>
                          <small>
                            <Link
                              to={`/admin/bookings?q=${encodeURIComponent(row.bookingCode)}`}
                            >
                              {row.bookingCode}
                            </Link>
                          </small>
                        </td>
                        <td>
                          {row.userId?.fullName || "—"}
                          <small>{row.userId?.email}</small>
                        </td>
                        <td>
                          {row.eventSnapshot.title}
                          <small>
                            {row.seatLabel} · {row.ticketCategoryName}
                          </small>
                        </td>
                        <td>
                          <Badge value={row.status} />
                        </td>
                        <td>
                          {dateTime(row.checkedInAt)}
                          <small>{row.checkedInBy?.fullName || "—"}</small>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <strong>{row.bookingCode}</strong>
                          <small>{dateTime(row.createdAt)}</small>
                        </td>
                        <td>
                          {row.customer.fullName}
                          <small>{row.customer.email}</small>
                        </td>
                        <td>
                          {row.eventSnapshot.title}
                          <small>{row.items.length} ghế</small>
                        </td>
                        <td>{money(row.totalAmount)}</td>
                        <td>
                          <Badge value={row.status} />
                          <small>
                            <Badge value={row.paymentStatus} />
                          </small>
                        </td>
                        <td>
                          <button
                            disabled={saving}
                            onClick={() => inspect(row._id)}
                          >
                            Đối chiếu
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.items.length && (
              <p className="am-empty">Không có dữ liệu phù hợp bộ lọc.</p>
            )}
          </div>
        )}
        <Pagination
          page={page}
          total={data.total}
          busy={busy}
          onChange={(value) => {
            const next = new URLSearchParams(params);
            next.set("page", value);
            setParams(next);
          }}
        />
      </section>
    </div>
  );
}

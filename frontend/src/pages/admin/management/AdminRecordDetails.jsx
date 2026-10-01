import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  useAdminApi,
  money,
  dateTime,
} from "../../../services/admin.service.js";
import { Badge, Notice } from "./AdminShared.jsx";
import AdminModal from "./AdminModal.jsx";
function Fields({ values }) {
  return (
    <dl className="am-detail-fields">
      {values.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
export default function AdminRecordDetails({ kind, id, onClose }) {
  const api = useAdminApi();
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    api(`/admin/details/${kind}/${id}`, { signal: c.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [api, kind, id]);
  const booking = data?.booking;
  return (
    <AdminModal
      title={
        kind === "users"
          ? "Thông tin người dùng"
          : kind === "tickets"
            ? "Thông tin vé"
            : "Đơn vé & thanh toán"
      }
      onClose={onClose}
    >
      <Notice error={error} />
      {!data && !error && <p role="status">Đang tải chi tiết…</p>}
      {data?.user && (
        <>
          <h3>{data.user.fullName}</h3>
          <Fields
            values={[
              ["Tài khoản", data.user.username],
              ["Email", data.user.email],
              ["Điện thoại", data.user.phone],
              ["Ngày tham gia", dateTime(data.user.createdAt)],
              [
                "Trạng thái",
                data.user.deletedAt
                  ? "Trong thùng rác"
                  : data.user.isBlocked
                    ? "Đã khóa"
                    : data.user.isActive
                      ? "Hoạt động"
                      : "Chưa xác thực",
              ],
            ]}
          />
          <h3>Đơn gần đây</h3>
          {data.bookings.length ? (
            data.bookings.map((row) => (
              <Link
                className="am-detail-order"
                key={row._id}
                to={`/admin/bookings?q=${encodeURIComponent(row.bookingCode)}`}
                onClick={onClose}
              >
                <strong>{row.bookingCode}</strong>
                <span>{row.eventSnapshot?.title}</span>
                <Badge value={row.paymentStatus} />
                <span>{money(row.totalAmount)}</span>
              </Link>
            ))
          ) : (
            <p>Chưa có đơn hàng.</p>
          )}
        </>
      )}
      {data?.ticket && (
        <>
          <div className="am-detail-ticket-heading">
            <h3>{data.ticket.ticketCode}</h3>
            <Badge value={data.ticket.status} />
          </div>
          <Fields
            values={[
              ["Chủ vé", data.ticket.userId?.fullName],
              ["Email tài khoản", data.ticket.userId?.email],
              ["Sự kiện", data.ticket.eventSnapshot?.title],
              ["Ghế", data.ticket.seatLabel],
              ["Hạng vé", data.ticket.ticketCategoryName],
              ["Check-in", dateTime(data.ticket.checkedInAt)],
              ["Nhân viên check-in", data.ticket.checkedInBy?.fullName],
            ]}
          />
        </>
      )}
      {booking && (
        <>
          <div className="am-detail-ticket-heading">
            <h3>{booking.bookingCode}</h3>
            <Badge value={booking.paymentStatus} />
            <Badge value={booking.status} />
          </div>
          <Fields
            values={[
              ["Người đặt vé", booking.customer?.fullName],
              ["Email đặt vé", booking.customer?.email],
              ["Điện thoại", booking.customer?.phone],
              ["Sự kiện", booking.eventSnapshot?.title],
              ["Tổng tiền", money(booking.totalAmount)],
              ["Đã hoàn", money(booking.refundedAmount)],
              ["Ngày tạo", dateTime(booking.createdAt)],
            ]}
          />
          <p className="am-detail-note">
            Thông tin người đặt vé được lưu lúc mua. Hệ thống không suy đoán
            danh tính người chuyển khoản từ thông tin này.
          </p>
          <h3>Vé trong đơn</h3>
          <div className="am-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã vé</th>
                  <th>Ghế</th>
                  <th>Trạng thái</th>
                  <th>Check-in</th>
                </tr>
              </thead>
              <tbody>
                {(data.tickets || []).map((ticket) => (
                  <tr key={ticket._id}>
                    <td>{ticket.ticketCode}</td>
                    <td>{ticket.seatLabel}</td>
                    <td>
                      <Badge value={ticket.status} />
                    </td>
                    <td>{dateTime(ticket.checkedInAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link
            className="am-detail-order"
            to={`/admin/bookings?q=${encodeURIComponent(booking.bookingCode)}`}
            onClick={onClose}
          >
            Mở quản lý đơn để đối chiếu / hoàn vé →
          </Link>
        </>
      )}
    </AdminModal>
  );
}

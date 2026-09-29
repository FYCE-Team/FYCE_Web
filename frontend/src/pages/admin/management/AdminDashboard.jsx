import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  CalendarDays,
  Ticket,
  Wallet,
  ArrowUpRight,
  ScanLine,
} from "lucide-react";
import {
  useAdminApi,
  money,
  dateTime,
} from "../../../services/admin.service.js";
import { Badge, Notice, PageTitle } from "./AdminShared.jsx";
export default function AdminDashboard() {
  const api = useAdminApi();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api("/admin/overview", { signal: controller.signal })
      .then((data) => {
        setData(data);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [api, refresh]);
  const checked = data?.tickets.find((x) => x._id === "checked_in")?.count || 0;
  const valid = data?.tickets.find((x) => x._id === "valid")?.count || 0;
  const cards = data
    ? [
        ["Người dùng", data.users, Users, "/admin/users"],
        ["Sự kiện", data.events, CalendarDays, "/admin/events"],
        ["Vé còn hiệu lực", checked + valid, Ticket, "/admin/tickets"],
        [
          "Thanh toán còn lại sau hoàn",
          money(data.bookings.find((x) => x._id === "paid")?.amount),
          Wallet,
          "/admin/bookings",
        ],
      ]
    : [];
  return (
    <div className="am-page">
      <PageTitle
        title="Tổng quan vận hành"
        description="Theo dõi doanh thu, đơn vé và tiến độ đón khách từ dữ liệu hệ thống."
      >
        <button onClick={() => setRefresh((x) => x + 1)}>Làm mới</button>
        <Link className="am-primary" to="/admin/check-in">
          <ScanLine size={18} /> Mở check-in
        </Link>
      </PageTitle>
      <Notice error={error} />
      {!data && !error && <p role="status">Đang tải tổng quan…</p>}
      <div className="am-stats">
        {cards.map(([label, value, Icon, link]) => (
          <Link key={label} to={link} className="am-stat">
            <span className="am-stat-icon">
              <Icon size={22} />
            </span>
            <ArrowUpRight className="am-stat-arrow" size={18} />
            <p>{label}</p>
            <strong>{value}</strong>
          </Link>
        ))}
      </div>
      {data && (
        <>
          <div className="am-overview-grid">
            <section className="am-card am-welcome">
              <small>ĐIỀU PHỐI SỰ KIỆN</small>
              <h2>Sẵn sàng cho buổi diễn tiếp theo</h2>
              <p>
                Cập nhật nội dung, kiểm tra đơn thanh toán và theo dõi khách đã
                vào cổng.
              </p>
              <div className="am-actions">
                <Link to="/admin/homepage">Quản lý trang chủ →</Link>
                <Link to="/admin/events">Quản lý sự kiện →</Link>
              </div>
            </section>
            <section className="am-card">
              <h2>Tiến độ check-in</h2>
              <strong className="am-check-count">
                {checked} <small>/ {checked + valid} vé</small>
              </strong>
              <progress value={checked} max={checked + valid || 1} />
              <p>{valid} vé hợp lệ chưa check-in · Tất cả sự kiện</p>
              <Link to="/admin/tickets">Xem danh sách khách →</Link>
            </section>
          </div>
          <section className="am-card">
            <div className="am-section-heading">
              <h2>Đơn vé gần đây</h2>
              <Link to="/admin/bookings">Xem tất cả →</Link>
            </div>
            <div className="am-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn / Khách hàng</th>
                    <th>Sự kiện</th>
                    <th>Tổng tiền</th>
                    <th>Thanh toán</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row) => (
                    <tr key={row._id}>
                      <td>
                        <Link
                          to={`/admin/bookings?q=${encodeURIComponent(row.bookingCode)}`}
                        >
                          {row.bookingCode}
                        </Link>
                        <small>{row.customer.fullName}</small>
                      </td>
                      <td>{row.eventSnapshot.title}</td>
                      <td>{money(row.totalAmount)}</td>
                      <td>
                        <Badge value={row.paymentStatus} />
                      </td>
                      <td>{dateTime(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.recent.length && (
                <p className="am-empty">Chưa có đơn vé.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

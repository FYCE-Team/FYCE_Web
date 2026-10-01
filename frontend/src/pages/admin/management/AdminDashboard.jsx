import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  CalendarDays,
  Ticket,
  Wallet,
  ArrowUpRight,
  ScanLine,
  Image,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import {
  useAdminApi,
  money,
  dateTime,
} from "../../../services/admin.service.js";
import { Badge, Notice, PageTitle } from "./AdminShared.jsx";
import AdminRecordDetails from "./AdminRecordDetails.jsx";
export default function AdminDashboard() {
  const api = useAdminApi();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [details, setDetails] = useState(null),
    [updatedAt, setUpdatedAt] = useState(null);
  useEffect(() => {
    const c = new AbortController();
    api("/admin/overview", { signal: c.signal })
      .then((value) => {
        setData(value);
        setError("");
        setUpdatedAt(new Date());
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [api, refresh]);
  const checked =
    data?.tickets.find((row) => row._id === "checked_in")?.count || 0;
  const valid = data?.tickets.find((row) => row._id === "valid")?.count || 0;
  const ratio =
    checked + valid ? Math.round((checked / (checked + valid)) * 100) : 0;
  const cards = data
    ? [
        [
          "Người dùng",
          data.users,
          Users,
          "/admin/users",
          "Tài khoản trong hệ thống",
        ],
        [
          "Sự kiện",
          data.events,
          CalendarDays,
          "/admin/events",
          "Quản lý chương trình & ghế",
        ],
        [
          "Vé còn hiệu lực",
          checked + valid,
          Ticket,
          "/admin/tickets",
          "Bao gồm vé đã check-in",
        ],
        [
          "Thanh toán sau hoàn",
          money(data.bookings.find((row) => row._id === "paid")?.amount),
          Wallet,
          "/admin/bookings",
          "Tổng tiền còn lại đã ghi nhận",
        ],
      ]
    : [];
  return (
    <div className="am-page am-dashboard">
      {details && (
        <AdminRecordDetails
          key={details}
          kind="bookings"
          id={details}
          onClose={() => setDetails(null)}
        />
      )}
      <PageTitle
        eyebrow="FYCE / KHÔNG GIAN QUẢN TRỊ"
        title="Tổng quan vận hành"
        description="Mọi thông tin quan trọng cho một chương trình trọn vẹn."
      >
        <button onClick={() => setRefresh((value) => value + 1)}>
          <RefreshCw size={15} /> Làm mới
        </button>
        <Link className="am-primary" to="/admin/check-in">
          <ScanLine size={17} /> Mở check-in
        </Link>
      </PageTitle>
      <Notice error={error} />
      {!data && !error && <p role="status">Đang tải tổng quan…</p>}
      {updatedAt && (
        <p className="am-dashboard-updated">
          <span /> Cập nhật {dateTime(updatedAt)} · Tổng hợp tất cả sự kiện
        </p>
      )}
      <div className="am-stats">
        {cards.map(([label, value, Icon, path, hint], index) => (
          <Link
            key={path}
            to={path}
            className={`am-stat am-stat-tone-${index}`}
          >
            <div className="am-stat-top">
              <span className="am-stat-icon">
                <Icon size={21} />
              </span>
              <ArrowUpRight size={17} />
            </div>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>{hint}</small>
          </Link>
        ))}
      </div>
      {data && (
        <>
          <div className="am-dashboard-grid">
            <section className="am-card am-operations">
              <div className="am-section-heading">
                <div>
                  <small className="am-kicker">THAO TÁC NHANH</small>
                  <h2>Điều phối chương trình</h2>
                </div>
                <CalendarDays size={25} />
              </div>
              <p>
                Từ chuẩn bị sân khấu đến đón khách — mở nhanh công việc bạn cần.
              </p>
              <div className="am-quick-grid">
                {[
                  [
                    CalendarDays,
                    "Sự kiện & ghế",
                    "Lịch diễn, hạng vé, sơ đồ ghế",
                    "/admin/events",
                  ],
                  [
                    CreditCard,
                    "Đơn & thanh toán",
                    "Xem giao dịch và đối chiếu",
                    "/admin/bookings",
                  ],
                  [
                    Image,
                    "Nội dung trang chủ",
                    "Banner, giới thiệu, thư viện ảnh",
                    "/admin/homepage",
                  ],
                  [
                    Ticket,
                    "Danh sách vé",
                    "Người mua và trạng thái vào cổng",
                    "/admin/tickets",
                  ],
                ].map(([Icon, title, description, path]) => (
                  <Link key={path} to={path}>
                    <Icon size={20} />
                    <span>
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
              </div>
            </section>
            <section className="am-card am-admission-card">
              <small className="am-kicker">ĐÓN KHÁCH</small>
              <h2>Tiến độ check-in</h2>
              <div
                className="am-admission-ring"
                style={{
                  background: `conic-gradient(#286e9b ${ratio}%,#e9eff5 0)`,
                }}
                aria-hidden="true"
              >
                <span>
                  <strong>{ratio}%</strong>
                  <small>Đã vào cổng</small>
                </span>
              </div>
              <p>
                <strong>{checked}</strong> / {checked + valid} vé đã check-in
              </p>
              <p className="am-admission-note">
                {valid} vé hợp lệ chưa sử dụng
              </p>
              <Link to="/admin/check-in">
                Mở khu vực check-in <ArrowUpRight size={16} />
              </Link>
            </section>
          </div>
          <div className="am-dashboard-summary">
            <div>
              <span>Tổng đơn đã ghi nhận</span>
              <strong>
                {data.bookings.reduce((sum, row) => sum + row.count, 0)}
              </strong>
            </div>
            <div>
              <span>Tổng tiền đã hoàn</span>
              <strong>
                {money(
                  data.bookings.reduce(
                    (sum, row) => sum + (row.refundedAmount || 0),
                    0,
                  ),
                )}
              </strong>
            </div>
            <div>
              <span>Vé đã hủy / hoàn</span>
              <strong>
                {data.tickets
                  .filter((row) => ["cancelled", "refunded"].includes(row._id))
                  .reduce((sum, row) => sum + row.count, 0)}
              </strong>
            </div>
          </div>
          <section className="am-card am-recent-orders">
            <div className="am-section-heading">
              <div>
                <small className="am-kicker">GIAO DỊCH</small>
                <h2>Đơn vé gần đây</h2>
              </div>
              <Link to="/admin/bookings">Xem tất cả →</Link>
            </div>
            <div className="am-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn / Người đặt vé</th>
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
                        <button
                          className="am-text-link"
                          onClick={() => setDetails(row._id)}
                        >
                          {row.bookingCode}
                        </button>
                        <small>
                          <button
                            className="am-text-link"
                            onClick={() => setDetails(row._id)}
                          >
                            {row.customer.fullName}
                          </button>
                        </small>
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

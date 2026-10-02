import ExcelJS from "exceljs";
import { adminRecordQuery, fail } from "./admin.service.js";
const MAX_ROWS = 10000;
const date = (value) => (value ? new Date(value).toISOString() : "");
const labels = {
  paid: "Đã thanh toán",
  unpaid: "Chưa thanh toán",
  processing: "Đang xử lý",
  failed: "Thất bại",
  refunded: "Đã hoàn",
  confirmed: "Đã xác nhận",
  pending_payment: "Chờ thanh toán",
  cancelled: "Đã hủy",
  expired: "Hết hạn",
  valid: "Chưa check-in",
  checked_in: "Đã check-in",
};
// CSV is executable spreadsheet input. Quoting alone does not prevent formula injection.
export const csvCell = (value) =>
  `"${String(typeof value === "string" && /^[\s\uFEFF]*[=+@\-\t\r\n]/u.test(value) ? "'" + value : (value ?? "")).replace(/"/g, '""')}"`;
export const createAdminExport = async (kind, query = {}) => {
  if (!["tickets", "bookings", "payments"].includes(kind))
    fail(404, "Danh sách xuất không hợp lệ.");
  const format = query.format || "xlsx";
  if (!["xlsx", "csv"].includes(format))
    fail(400, "Chọn định dạng Excel hoặc CSV.");
  const { Model, filter } = adminRecordQuery(
    kind === "payments" ? "bookings" : kind,
    { ...query, page: 1, limit: 100 },
  );
  if (query.ids !== undefined) {
    if (typeof query.ids !== "string")
      fail(400, "Danh sách chọn không hợp lệ.");
    const ids = query.ids.split(",");
    if (
      !ids.length ||
      ids.length > 1000 ||
      ids.some((id) => !/^[a-f\d]{24}$/i.test(id))
    )
      fail(400, "Danh sách chọn không hợp lệ.");
    filter._id = { $in: ids };
  }
  let records = Model.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(MAX_ROWS + 1);
  records =
    kind === "tickets"
      ? records
          .select(
            "ticketCode bookingCode userId bookingId eventSnapshot seatLabel ticketCategoryName unitPrice status checkedInAt issuedAt",
          )
          .populate("userId", "fullName email phone")
          .populate("bookingId", "customer")
      : records.select(
          "bookingCode customer eventSnapshot items.seatLabel totalAmount refundedAmount status paymentStatus createdAt confirmedAt cancelledAt",
        );
  const data = await records.lean();
  if (data.length > MAX_ROWS)
    fail(
      400,
      "Có hơn 10.000 dòng. Hãy lọc theo sự kiện hoặc trạng thái trước khi xuất.",
    );
  const headers =
    kind === "tickets"
      ? [
          "Mã vé",
          "Mã đơn",
          "Sự kiện",
          "Người đặt vé",
          "Email đặt vé",
          "Điện thoại đặt vé",
          "Chủ tài khoản",
          "Email tài khoản",
          "Ghế",
          "Hạng vé",
          "Giá vé (VND)",
          "Trạng thái vé",
          "Check-in (UTC)",
          "Phát hành (UTC)",
        ]
      : [
          "Mã đơn",
          "Sự kiện",
          "Người đặt vé",
          "Email",
          "Điện thoại",
          "Ghế",
          "Số ghế",
          "Tổng tiền (VND)",
          "Đã hoàn (VND)",
          "Thực thu (VND)",
          "Trạng thái đơn",
          "Trạng thái thanh toán",
          "Tạo lúc (UTC)",
          "Xác nhận (UTC)",
          "Hủy lúc (UTC)",
        ];
  const rows = data.map((r) =>
    kind === "tickets"
      ? [
          r.ticketCode,
          r.bookingCode,
          r.eventSnapshot?.title,
          r.bookingId?.customer?.fullName,
          r.bookingId?.customer?.email,
          r.bookingId?.customer?.phone,
          r.userId?.fullName,
          r.userId?.email,
          r.seatLabel,
          r.ticketCategoryName,
          r.unitPrice,
          labels[r.status] || r.status,
          date(r.checkedInAt),
          date(r.issuedAt),
        ]
      : [
          r.bookingCode,
          r.eventSnapshot?.title,
          r.customer?.fullName,
          r.customer?.email,
          r.customer?.phone,
          r.items.map((i) => i.seatLabel).join(", "),
          r.items.length,
          r.totalAmount,
          r.refundedAmount || 0,
          r.paymentStatus === "paid"
            ? r.totalAmount - (r.refundedAmount || 0)
            : 0,
          labels[r.status] || r.status,
          labels[r.paymentStatus] || r.paymentStatus,
          date(r.createdAt),
          date(r.confirmedAt),
          date(r.cancelledAt),
        ],
  );
  const filename = `FYCE-${kind}-${new Date().toISOString().slice(0, 10)}.${format}`;
  if (format === "csv")
    return {
      filename,
      type: "text/csv; charset=utf-8",
      buffer: Buffer.from(
        "\uFEFF" +
          [headers, ...rows]
            .map((row) => row.map(csvCell).join(","))
            .join("\r\n"),
      ),
    };
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FYCE";
  const sheet = workbook.addWorksheet(
    kind === "tickets"
      ? "Danh sách khách mời"
      : kind === "payments"
        ? "Thanh toán"
        : "Đơn vé",
    { views: [{ state: "frozen", ySplit: 1 }] },
  );
  sheet.columns = headers.map((header) => ({ header, width: 24 }));
  sheet.addRows(rows.map((row) => row.map((cell) => cell ?? "")));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF20587A" },
  };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: headers.length },
  };
  return {
    filename,
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  };
};

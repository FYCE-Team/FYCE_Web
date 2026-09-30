import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Seat from "../models/Seat.js";
import TicketEmail from "../models/TicketEmail.js";
import PaymentReview from "../models/PaymentReview.js";
import { cancelBooking } from "./booking.service.js";
import Ticket from "../models/Ticket.js";
import Event from "../models/Event.js";
import RefreshToken from "../models/RefreshToken.js";
import { reconcileSePayPayment } from "./payment.service.js";

export const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
export const objectId = (id) => {
  if (typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id))
    fail(400, "ID không hợp lệ.");
  return new mongoose.Types.ObjectId(id);
};
export const listOptions = (query = {}) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    fail(400, "Phân trang không hợp lệ.");
  if (query.q !== undefined && typeof query.q !== "string")
    fail(400, "Từ khóa không hợp lệ.");
  return {
    page,
    limit,
    search: String(query.q || "")
      .trim()
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  };
};
const userFields =
  "username fullName email phone role isActive isBlocked createdAt updatedAt";
const enumFilter = (filter, query, field, values) => {
  if (!query[field]) return;
  if (!values.includes(query[field])) fail(400, "Bộ lọc không hợp lệ.");
  filter[field] = query[field];
};
export const listAdminRecords = async (kind, query) => {
  const { page, limit, search } = listOptions(query);
  const filter = {};
  let Model, fields, searchFields;
  if (kind === "users") {
    Model = User;
    fields = userFields;
    searchFields = ["username", "fullName", "email", "phone"];
    enumFilter(filter, query, "role", ["user", "admin"]);
    if (query.isBlocked) {
      if (!["true", "false"].includes(query.isBlocked))
        fail(400, "Trạng thái khóa không hợp lệ.");
      filter.isBlocked = query.isBlocked === "true" ? true : { $ne: true };
    }
    if (query.isActive) {
      if (!["true", "false"].includes(query.isActive))
        fail(400, "Trạng thái không hợp lệ.");
      filter.isActive = query.isActive === "true";
    }
  } else {
    if (query.eventId) filter.eventId = objectId(query.eventId);
    if (kind === "bookings") {
      Model = Booking;
      fields = "-holdToken";
      searchFields = ["bookingCode", "customer.email", "customer.fullName"];
      enumFilter(filter, query, "status", [
        "pending_payment",
        "confirmed",
        "expired",
        "cancelled",
      ]);
      enumFilter(filter, query, "paymentStatus", [
        "unpaid",
        "processing",
        "paid",
        "failed",
        "refunded",
      ]);
    } else if (kind === "tickets") {
      Model = Ticket;
      fields = "-qrVersion";
      searchFields = ["ticketCode", "bookingCode", "seatLabel"];
      enumFilter(filter, query, "status", [
        "valid",
        "checked_in",
        "cancelled",
        "refunded",
      ]);
    } else fail(404, "Không tìm thấy danh sách.");
  }
  if (search)
    filter.$or = searchFields.map((field) => ({
      [field]: { $regex: search, $options: "i" },
    }));
  let records = Model.find(filter)
    .select(fields)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  if (kind === "tickets")
    records = records
      .populate("userId", "fullName email")
      .populate("checkedInBy", "fullName")
    .populate("refundedBy", "fullName");
  const [items, total] = await Promise.all([
    records.lean(),
    Model.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};
export const getOverview = async () => {
  const [users, events, bookings, tickets, recent] = await Promise.all([
    User.countDocuments(),
    Event.countDocuments(),
    Booking.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          amount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, { $subtract: ["$totalAmount", { $ifNull: ["$refundedAmount", 0] }] }, "$totalAmount"] } },
          refundedAmount: { $sum: { $ifNull: ["$refundedAmount", 0] } },
        },
      },
    ]),
    Ticket.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Booking.find()
      .select(
        "bookingCode customer.fullName totalAmount status paymentStatus createdAt eventSnapshot.title",
      )
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);
  return { users, events, bookings, tickets, recent };
};
const userPayload = (data) => {
  if (!data || typeof data !== "object") fail(400, "Dữ liệu không hợp lệ.");
  const payload = {};
  for (const key of ["fullName", "phone"]) {
    if (data[key] !== undefined) {
      if (
        typeof data[key] !== "string" ||
        data[key].length > (key === "phone" ? 30 : 150)
      )
        fail(400, "Thông tin người dùng không hợp lệ.");
      payload[key] = data[key].trim();
    }
  }
  if (payload.fullName === "") fail(400, "Họ tên không được để trống.");
  if (data.role !== undefined) {
    if (!["user", "admin"].includes(data.role))
      fail(400, "Vai trò không hợp lệ.");
    payload.role = data.role;
  }
  if (data.isBlocked !== undefined) {
    if (typeof data.isBlocked !== "boolean")
      fail(400, "Trạng thái khóa không hợp lệ.");
    payload.isBlocked = data.isBlocked;
  }
  if (data.isActive !== undefined) {
    if (typeof data.isActive !== "boolean")
      fail(400, "Trạng thái không hợp lệ.");
    payload.isActive = data.isActive;
  }
  return payload;
};
export const createAdminUser = async (data) => {
  const payload = userPayload(data);
  if (
    !/^[a-z\d_.-]{3,30}$/i.test(data.username || "") ||
    typeof data.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
    data.email.length > 254
  )
    fail(400, "Tên đăng nhập hoặc email không hợp lệ.");
  if (
    typeof data.password !== "string" ||
    data.password.length < 10 ||
    Buffer.byteLength(data.password) > 72
  )
    fail(400, "Mật khẩu cần ít nhất 10 ký tự và tối đa 72 byte.");
  const user = await User.create({
    ...payload,
    username: data.username,
    email: data.email,
    password: await bcrypt.hash(data.password, 12),
  });
  return User.findById(user._id).select(userFields).lean();
};
export const updateAdminUser = async (id, data, actorId) => {
  const payload = userPayload(data);
  const current = await User.findById(objectId(id)).select(userFields).lean();
  if (!current) fail(404, "Không tìm thấy người dùng.");
  // Existing administrators cannot be disabled/demoted here, preventing concurrent last-admin removal.
  if (
    (String(id) === String(actorId) || current.role === "admin") &&
    (payload.isBlocked === true ||
      payload.isActive === false ||
      payload.role === "user")
  )
    fail(409, "Không thể khóa hoặc hạ quyền tài khoản quản trị tại đây.");
  if (!data.updatedAt || !Number.isFinite(Date.parse(data.updatedAt)))
    fail(400, "Thiếu phiên bản dữ liệu.");
  const result = await User.findOneAndUpdate(
    { _id: current._id, updatedAt: new Date(data.updatedAt) },
    {
      $set: {
        ...payload,
        updatedAt: new Date(
          Math.max(Date.now(), current.updatedAt.getTime() + 1),
        ),
      },
    },
    { returnDocument: "after", runValidators: true, timestamps: false },
  )
    .select(userFields)
    .lean();
  if (!result) fail(409, "Dữ liệu đã thay đổi. Hãy tải lại trước khi sửa.");
  if (
    payload.isBlocked === true ||
    payload.isActive === false ||
    payload.role !== undefined
  )
    await RefreshToken.deleteMany({ userId: current._id });
  return result;
};
export const getBookingAudit = async (id) => {
  const booking = await Booking.findById(objectId(id)).lean();
  if (!booking) fail(404, "Không tìm thấy đơn vé.");
  const tickets = await Ticket.find({ bookingId: booking._id })
    .select("-qrVersion")
    .populate("checkedInBy", "fullName")
    .populate("refundedBy", "fullName")
    .lean();
  const issues = [];
  if (booking.status === "confirmed" && booking.paymentStatus !== "paid")
    issues.push("Đơn xác nhận nhưng chưa ghi nhận thanh toán.");
  if (booking.paymentStatus === "paid" && booking.status !== "confirmed")
    issues.push("Đơn đã thanh toán nhưng chưa xác nhận.");
  if (booking.status === "confirmed" && tickets.length !== booking.items.length)
    issues.push("Số vé phát hành không khớp số ghế trong đơn.");
  if (
    booking.totalAmount !==
    booking.items.reduce((sum, item) => sum + item.unitPrice, 0)
  )
    issues.push("Tổng tiền không khớp chi tiết ghế.");
  for (const ticket of tickets) {
    if (
      !booking.items.some(
        (item) =>
          String(item.seatId) === String(ticket.seatId) &&
          item.ticketCode === ticket.ticketCode,
      )
    )
      issues.push(`Vé ${ticket.ticketCode} không khớp chi tiết đơn.`);
    if (
      ["valid", "checked_in"].includes(ticket.status) &&
      (booking.status !== "confirmed" || booking.paymentStatus !== "paid")
    )
      issues.push(
        `Vé ${ticket.ticketCode} còn hiệu lực trên đơn chưa thanh toán hợp lệ.`,
      );
  }
  const seats = await Seat.find({
    _id: { $in: booking.items.map((item) => item.seatId) },
  })
    .select("label status eventId soldBookingId holdToken heldByUserId holdExpiresAt")
    .lean();
  if (booking.status === "confirmed")
    for (const item of booking.items) {
      if (tickets.some(t => t.ticketCode === item.ticketCode && t.status === "refunded")) continue;
      const seat = seats.find(
        (seat) => String(seat._id) === String(item.seatId),
      );
      if (
        !seat ||
        seat.status !== "sold" ||
        String(seat.eventId) !== String(booking.eventId) ||
        (seat.soldBookingId &&
          String(seat.soldBookingId) !== String(booking._id))
      )
        issues.push(`Ghế ${item.seatLabel} không khớp trạng thái bán của đơn.`);
    }
  if (booking.status === "pending_payment") {
    const now = new Date();
    if (!booking.holdExpiresAt || booking.holdExpiresAt <= now) {
      issues.push("Đơn chờ thanh toán đã quá hạn giữ ghế. Không thể tiếp tục thanh toán.");
    }
    for (const item of booking.items) {
      const seat = seats.find(seat => String(seat._id) === String(item.seatId));
      if (!seat || seat.status !== "held" || seat.holdToken !== booking.holdToken || String(seat.heldByUserId) !== String(booking.userId) || String(seat.eventId) !== String(booking.eventId) || !seat.holdExpiresAt || seat.holdExpiresAt <= now) {
        issues.push(`Ghế ${item.seatLabel} không còn được giữ hợp lệ cho đơn này.`);
      }
    }
  }
  // Hold secrets are used only for comparison and never returned to the browser.
  delete booking.holdToken;
  for (const seat of seats) { delete seat.holdToken; delete seat.heldByUserId; }
  const payments = await PaymentReview.find({
    bookingCode: booking.bookingCode,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const ticketEmail = await TicketEmail.findOne({ bookingId: booking._id }).select("status attempts sentAt lastError nextAttemptAt").lean();
  return { booking, tickets, seats, payments, issues, ticketEmail };
};
export const reconcileAdminBooking = async (id) => {
  const booking = await Booking.findById(objectId(id));
  if (!booking) fail(404, "Không tìm thấy đơn vé.");
  return reconcileSePayPayment(booking.bookingCode, booking.userId);
};

export const cancelAdminBooking = async (id) => {
  const booking = await Booking.findById(objectId(id));
  if (!booking) fail(404, "Không tìm thấy đơn vé.");
  if (booking.status !== "pending_payment" || booking.paymentStatus === "paid")
    fail(409, "Chỉ có thể hủy đơn đang chờ thanh toán.");
  try {
    const result = await cancelBooking(booking.bookingCode, booking.userId);
    return { bookingCode: result.bookingCode, status: result.status };
  } catch (error) {
    if (
      ["BOOKING_CANCEL_NOT_ALLOWED", "BOOKING_ALREADY_EXPIRED"].includes(
        error.message,
      )
    )
      fail(409, "Đơn đã thay đổi hoặc hết hạn. Hãy tải lại.");
    throw error;
  }
};

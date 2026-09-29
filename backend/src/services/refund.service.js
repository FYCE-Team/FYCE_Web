import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import Booking from "../models/Booking.js";
import Ticket from "../models/Ticket.js";
import Seat from "../models/Seat.js";
import SeatHistory from "../models/SeatHistory.js";

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const id = value => {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) fail(400, "ID không hợp lệ.");
  return new mongoose.Types.ObjectId(value);
};

// Money is handled offline. This transaction only records the admin's confirmation.
export async function confirmOfflineRefund(bookingId, data, actorId) {
  const bookingObjectId = id(bookingId);
  const actor = id(actorId);
  if (data?.offlineRefundConfirmed !== true || typeof data.reason !== "string" || !data.reason.trim() || data.reason.length > 500)
    fail(400, "Cần xác nhận đã hoàn tiền ngoài hệ thống và nhập ghi chú (tối đa 500 ký tự).");
  if (!Array.isArray(data.ticketIds) || !data.ticketIds.length || data.ticketIds.length > 100 || new Set(data.ticketIds).size !== data.ticketIds.length)
    fail(400, "Chọn các vé cần hủy, không trùng lặp.");
  const ticketIds = data.ticketIds.map(id);
  if (typeof data.updatedAt !== "string" || !Number.isFinite(Date.parse(data.updatedAt))) fail(400, "Thiếu phiên bản đơn vé.");
  try {
    return await mongoose.connection.transaction(async session => {
      const booking = await Booking.findById(bookingObjectId).session(session);
      if (!booking) fail(404, "Không tìm thấy đơn vé.");
      if (booking.updatedAt.getTime() !== Date.parse(data.updatedAt)) fail(409, "Đơn đã thay đổi. Hãy tải lại trước khi xác nhận.");
      if (booking.status !== "confirmed" || booking.paymentStatus !== "paid") fail(409, "Chỉ xử lý vé thuộc đơn đã thanh toán hợp lệ.");
      if (booking.totalAmount !== booking.items.reduce((sum, item) => sum + item.unitPrice, 0)) fail(409, "Tổng tiền đơn không khớp giá vé. Cần đối chiếu trước khi hoàn.");
      const all = await Ticket.find({ bookingId: booking._id }).session(session);
      if (all.length !== booking.items.length || all.some(t => String(t.eventId) !== String(booking.eventId) || String(t.userId) !== String(booking.userId) || !booking.items.some(i => String(i.seatId) === String(t.seatId) && i.ticketCode === t.ticketCode && i.unitPrice === t.unitPrice)))
        fail(409, "Dữ liệu đơn và vé không khớp. Cần đối chiếu trước khi hoàn.");
      const selected = all.filter(t => data.ticketIds.includes(String(t._id)));
      if (selected.length !== ticketIds.length || selected.some(t => t.status !== "valid")) fail(409, "Chỉ hủy vé còn hiệu lực, chưa check-in và chưa hoàn.");
      const now = new Date();
      for (const ticket of selected) {
        const seat = await Seat.findOne({ _id: ticket.seatId, eventId: booking.eventId, status: "sold", $or: [{ soldBookingId: booking._id }, { soldBookingId: null }] }).session(session);
        // For legacy sales, prove unique ownership before releasing the seat.
        if (seat && !seat.soldBookingId) {
          const otherBooking = await Booking.exists({ _id: { $ne: booking._id }, eventId: booking.eventId, status: "confirmed", paymentStatus: "paid", "items.seatId": ticket.seatId }).session(session);
          if (otherBooking) fail(409, "Ghế cũ có nhiều đơn thanh toán liên quan. Cần đối chiếu trước khi hoàn.");
        }
        if (!seat) fail(409, `Ghế ${ticket.seatLabel} không xác định được quyền sở hữu của đơn. Cần đối chiếu trước khi hoàn.`);
        const conflict = await Ticket.exists({ seatId: ticket.seatId, eventId: booking.eventId, bookingId: { $ne: booking._id }, status: { $in: ["valid", "checked_in"] } }).session(session);
        if (conflict) fail(409, "Ghế có vé hiệu lực thuộc đơn khác. Cần đối chiếu dữ liệu.");
        const changed = await Ticket.updateOne({ _id: ticket._id, status: "valid", qrVersion: ticket.qrVersion }, { $set: { status: "refunded", qrVersion: randomBytes(16).toString("hex"), refundedAt: now, refundedBy: actor, refundReason: data.reason.trim() } }, { session });
        if (changed.modifiedCount !== 1) fail(409, "Vé vừa thay đổi trạng thái. Hãy tải lại.");
        await Seat.updateOne({ _id: seat._id }, { $set: { status: "available", soldBookingId: null, saleClaimToken: null, holdToken: null, heldByUserId: null, holdExpiresAt: null } }, { session });
        await SeatHistory.create([{ eventId: booking.eventId, seatId: seat._id, seatLabel: ticket.seatLabel, action: "released_after_refund", fromStatus: "sold", toStatus: "available", actorType: "admin", actorUserId: actor, bookingId: booking._id, customerSnapshot: booking.customer.toObject(), reason: data.reason.trim(), metadata: { ticketCode: ticket.ticketCode, amount: ticket.unitPrice, method: "offline" } }], { session });
      }
      const refunded = all.filter(t => t.status === "refunded" || data.ticketIds.includes(String(t._id)));
      const refundedAmount = refunded.reduce((sum, t) => sum + t.unitPrice, 0);
      const fullyRefunded = refunded.length === all.length;
      await Booking.updateOne({ _id: booking._id }, { $set: { refundedAmount, ...(fullyRefunded ? { status: "cancelled", paymentStatus: "refunded", cancelledAt: now } : {}), updatedAt: new Date(Math.max(Date.now(), booking.updatedAt.getTime() + 1)) } }, { session, timestamps: false });
      return { bookingCode: booking.bookingCode, refundedAmount, fullyRefunded, cancelledTicketCount: selected.length };
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
  } catch (error) {
    if (error.code === 20 || error.codeName === "IllegalOperation") fail(503, "Hoàn vé cần MongoDB replica set để cập nhật an toàn. Chưa thay đổi dữ liệu.");
    throw error;
  }
}

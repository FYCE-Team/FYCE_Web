import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import TicketEmail from "../models/TicketEmail.js";
import Booking from "../models/Booking.js";
import Ticket from "../models/Ticket.js";
import { createBookingQrPayload } from "../utils/ticketQr.js";
import { sendMail, isEmailConfigured } from "./email.service.js";

export const enqueueTicketEmail = async (bookingId, session) => TicketEmail.updateOne(
    { bookingId }, { $setOnInsert: { bookingId, status: "pending", nextAttemptAt: new Date() } }, { upsert: true, session });
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const buildTicketEmail = async (booking, tickets) => {
    const attachments = [], blocks = [];
    const cid = `booking-${booking._id}@fyce`;
    const png = await QRCode.toBuffer(createBookingQrPayload(booking, booking.confirmedAt || booking.createdAt), { type: "png", width: 400, margin: 4, errorCorrectionLevel: "M" });
    attachments.push({filename:`${booking.bookingCode}.png`,content:png,cid,contentType:"image/png"});
    blocks.push(`<section><h3>Một QR cho ${tickets.length} ghế / One QR for ${tickets.length} seats</h3><p>${escape(booking.bookingCode)}</p><img src="cid:${cid}" width="280" height="280" alt="QR ${escape(booking.bookingCode)}"/><p>Xuất trình khi cả nhóm đã đến. Một lần xác nhận check-in áp dụng cho mọi ghế còn hợp lệ trong đơn. / Present when your group is together. One check-in admits all remaining valid seats.</p><ul>${tickets.map(t=>`<li>${escape(t.seatLabel)} · ${escape(t.ticketCategoryName)} · ${escape(t.ticketCode)}</li>`).join("")}</ul></section>`);
    const url = new URL(`/bookings/${encodeURIComponent(booking.bookingCode)}`, process.env.CLIENT_URL || "http://localhost:5173").href;
    return { to: booking.customer.email, subject: `Vé FYCE · ${booking.bookingCode}`,
        messageId: `<fyce-ticket-${booking._id}@fyce.local>`,
        text: `Xin chào ${booking.customer.fullName}. Đã xác nhận thanh toán đơn ${booking.bookingCode}. Sự kiện: ${booking.eventSnapshot.title}. Vé: ${tickets.map(t => `${t.seatLabel} (${t.ticketCode})`).join(", ")}. Một QR chung trong ảnh đính kèm cho tất cả ghế còn hiệu lực. Xuất trình khi cả nhóm đã đến. One QR admits all remaining valid seats. Xem vé: ${url}. Không chia sẻ QR.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>Vé của bạn đã sẵn sàng</h2><p>Xin chào ${escape(booking.customer.fullName)}.</p><p>Đã xác nhận thanh toán đơn <strong>${escape(booking.bookingCode)}</strong>.</p><h3>${escape(booking.eventSnapshot.title)}</h3><p>${escape(booking.eventSnapshot.venue)} · ${booking.eventSnapshot.startAt ? escape(new Date(booking.eventSnapshot.startAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })) : "Thời gian xem trên trang vé"}</p>${blocks.join("")}<p><a href="${escape(url)}">Mở vé trên FYCE</a></p><p>Không chia sẻ QR. QR của vé đã hủy/hoàn hoặc đã check-in không còn hiệu lực.</p></div>`, attachments };
};

// Durable retry queue: SMTP failure never rolls back a successful payment.
export const deliverNextTicketEmail = async (send = sendMail) => {
    const now = new Date(), leaseId = randomUUID();
    const job = await TicketEmail.findOneAndUpdate({ $or: [
        { status: "pending", nextAttemptAt: { $lte: now } },
        { status: "sending", leaseUntil: { $lte: now } }
    ] }, { $set: { status: "sending", leaseId, leaseUntil: new Date(Date.now() + 120000) }, $inc: { attempts: 1 } }, { sort: { nextAttemptAt: 1 }, returnDocument: "after" });
    if (!job) return false;
    try {
        const booking = await Booking.findById(job.bookingId).lean();
        const tickets = await Ticket.find({ bookingId: job.bookingId, status: "valid" }).lean();
        if (!booking || booking.status !== "confirmed" || booking.paymentStatus !== "paid" || !tickets.length) {
            await TicketEmail.updateOne({ _id: job._id, leaseId }, { status: "skipped", leaseUntil: null });
            return true;
        }
        await send(await buildTicketEmail(booking, tickets));
        await TicketEmail.updateOne({ _id: job._id, leaseId }, { status: "sent", sentAt: new Date(), lastError: null, leaseUntil: null });
    } catch {
        await TicketEmail.updateOne({ _id: job._id, leaseId }, { status: "pending", leaseUntil: null, lastError: "Gửi email chưa thành công; hệ thống sẽ thử lại.", nextAttemptAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** Math.min(job.attempts, 7))) });
    }
    return true;
};
export const startTicketEmailWorker = () => {
    if (!isEmailConfigured()) {
        console.warn("Ticket email worker disabled: email transport is not configured.");
        return () => {};
    }
    let busy = false;
    const tick = async () => {
        if (busy) return;
        busy = true;
        try { for (let n = 0; n < 10 && await deliverNextTicketEmail(); n++); }
        catch { console.error("Ticket email queue unavailable; retrying next cycle."); }
        finally { busy = false; }
    };
    const timer = setInterval(tick, 15000); timer.unref(); void tick();
    return () => clearInterval(timer);
};

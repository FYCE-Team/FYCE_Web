import User from "../models/User.js";
import Event from "../models/Event.js";
import Booking from "../models/Booking.js";
import Ticket from "../models/Ticket.js";
import Hero from "../models/HeroSection.js";
import About from "../models/AboutSection.js";
import Gallery from "../models/Gallery.js";
import Seat from "../models/Seat.js";
import SeatHistory from "../models/SeatHistory.js";
import EventSeatConfig from "../models/EventSeatConfig.js";
import TicketEmail from "../models/TicketEmail.js";
import PaymentReview from "../models/PaymentReview.js";
import RefreshToken from "../models/RefreshToken.js";
import ProfileOtp from "../models/ProfileOtp.js";
import PasswordReset from "../models/PasswordReset.js";
import EmailVerification from "../models/EmailVerification.js";
import { fail } from "./admin.service.js";
const models = {
  users: User,
  events: Event,
  bookings: Booking,
  tickets: Ticket,
  hero: Hero,
  about: About,
  gallery: Gallery,
};
const exists = (Model, filter, session) =>
  Model.exists(filter).session(session || null);
const deny = (message) => fail(409, message);
export const assertPurgeAllowed = async (kind, id, session) => {
  const Model = models[kind];
  if (!Model) fail(400, "Loại dữ liệu không thể xóa vĩnh viễn.");
  const record = await Model.findById(id)
    .session(session || null)
    .lean();
  if (!record?.deletedAt)
    deny("Chỉ có thể xóa vĩnh viễn dữ liệu đang trong thùng rác.");
  if (kind === "events") {
    if (
      (await exists(Booking, { eventId: id }, session)) ||
      (await exists(Ticket, { eventId: id }, session))
    )
      deny(
        "Sự kiện còn đơn/vé liên quan. Hãy giữ trong thùng rác để bảo toàn lịch sử thanh toán.",
      );
    if (
      await exists(
        Seat,
        { eventId: id, status: { $in: ["held", "sold"] } },
        session,
      )
    )
      deny("Sự kiện còn ghế đang giữ hoặc đã bán; chưa thể xóa vĩnh viễn.");
  }
  if (kind === "users") {
    if (record.role === "admin")
      deny("Không thể xóa vĩnh viễn tài khoản quản trị.");
    for (const [Related, filter] of [
      [Booking, { userId: id }],
      [
        Ticket,
        { $or: [{ userId: id }, { checkedInBy: id }, { refundedBy: id }] },
      ],
      [Event, { $or: [{ createdBy: id }, { updatedBy: id }] }],
      [Hero, { $or: [{ createdBy: id }, { updatedBy: id }] }],
      [About, { $or: [{ createdBy: id }, { updatedBy: id }] }],
      [Gallery, { $or: [{ createdBy: id }, { updatedBy: id }] }],
      [SeatHistory, { actorUserId: id }],
      [
        Seat,
        {
          $or: [
            { heldByUserId: id },
            { blockedByUserId: id },
            { adminStatusUpdatedByUserId: id },
          ],
        },
      ],
    ]) {
      if (await exists(Related, filter, session))
        deny(
          "Người dùng còn lịch sử giao dịch hoặc dữ liệu liên quan. Hãy giữ trong thùng rác.",
        );
    }
  }
  if (kind === "bookings") {
    if (
      !["expired", "cancelled"].includes(record.status) ||
      !["unpaid", "failed"].includes(record.paymentStatus) ||
      (record.refundedAmount || 0) > 0 ||
      record.paymentReviewRequired
    )
      deny(
        "Đơn đã ghi nhận tiền hoặc còn đang xử lý được giữ lại để bảo toàn đối soát.",
      );
    if (
      !record.createdAt ||
      record.createdAt > new Date(Date.now() - 48 * 60 * 60 * 1000)
    )
      deny(
        "Đơn chưa đủ 48 giờ. Cần giữ lại để tiếp nhận đối soát hoặc thông báo thanh toán đến chậm.",
      );
    if (
      (await exists(
        PaymentReview,
        { bookingCode: record.bookingCode },
        session,
      )) ||
      (await exists(TicketEmail, { bookingId: id }, session)) ||
      (await exists(
        Ticket,
        { bookingId: id, status: { $ne: "cancelled" } },
        session,
      )) ||
      (await exists(
        SeatHistory,
        {
          bookingId: id,
          action: {
            $in: ["sold", "refund_confirmed", "released_after_refund"],
          },
        },
        session,
      ))
    )
      deny(
        "Đơn có dấu vết xử lý thanh toán/vé; không thể xóa vĩnh viễn lịch sử này.",
      );
    if (
      await exists(
        Seat,
        {
          $or: [
            { soldBookingId: id },
            ...(record.holdToken
              ? [{ holdToken: record.holdToken, status: "held" }]
              : []),
          ],
        },
        session,
      )
    )
      deny("Đơn vẫn liên kết ghế đang giữ hoặc đã bán.");
  }
  if (kind === "tickets") {
    if (
      record.status !== "cancelled" ||
      (await exists(Booking, { _id: record.bookingId }, session))
    )
      deny(
        "Vé còn lịch sử đơn hàng hoặc thanh toán. Hãy giữ trong thùng rác; xóa vĩnh viễn chỉ dành cho vé đã hủy không còn đơn liên quan.",
      );
  }
  return record;
};
export const purgeRecord = async (kind, id, session) => {
  const record = await assertPurgeAllowed(kind, id, session);
  if (kind === "events") {
    await Seat.deleteMany({ eventId: id }, { session });
    await SeatHistory.deleteMany({ eventId: id }, { session });
    await EventSeatConfig.deleteMany({ eventId: id }, { session });
    await Hero.updateMany(
      { featuredEvent: id },
      { $set: { featuredEvent: null } },
      { session },
    );
  }
  if (kind === "bookings") {
    await Ticket.deleteMany(
      { bookingId: id, status: "cancelled" },
      { session },
    );
    await SeatHistory.deleteMany({ bookingId: id }, { session });
  }
  if (kind === "users")
    for (const Model of [
      RefreshToken,
      ProfileOtp,
      PasswordReset,
      EmailVerification,
    ])
      await Model.deleteMany({ userId: id }, { session });
  // GridFS media is shared by other content: deleting a CMS record never deletes binaries.
  await models[kind].deleteOne(
    { _id: record._id, deletedAt: { $ne: null } },
    { session },
  );
};

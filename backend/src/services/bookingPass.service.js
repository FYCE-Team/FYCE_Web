import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import {
  createBookingQrPayload,
  verifyBookingQrPayload,
} from "../utils/ticketQr.js";

export const isBookingPass = (value) =>
  /^(FYCEB1:|FYCE-\d{8}-[A-Z0-9]+$)/i.test(String(value || "").trim());
const eligible = (booking) =>
  booking?.status === "confirmed" && booking.paymentStatus === "paid";
export const getBookingPass = async (bookingCode, userId) => {
  const booking = await Booking.findOne({
    bookingCode: String(bookingCode).trim().toUpperCase(),
    userId,
  }).lean();
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (!eligible(booking)) return null;
  const tickets = await Ticket.find({ bookingId: booking._id })
    .select("status seatLabel")
    .lean();
  const valid = tickets.filter((t) => t.status === "valid");
  return {
    bookingCode: booking.bookingCode,
    qrPayload: valid.length ? createBookingQrPayload(booking) : null,
    validCount: valid.length,
    checkedInCount: tickets.filter((t) => t.status === "checked_in").length,
    totalCount: tickets.length,
    seats: valid.map((t) => t.seatLabel),
  };
};
const load = async (raw, eventId, session) => {
  const input = String(raw || "").trim();
  const filter = input.startsWith("FYCEB1:")
    ? { _id: verifyBookingQrPayload(input) }
    : { bookingCode: input.toUpperCase() };
  const booking = await Booking.findOne(filter)
    .session(session || null)
    .lean();
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (eventId && !mongoose.isObjectIdOrHexString(eventId))
    throw new Error("EVENT_ID_INVALID");
  if (eventId && String(booking.eventId) !== String(eventId))
    throw new Error("TICKET_EVENT_MISMATCH");
  if (!eligible(booking)) throw new Error("TICKET_NOT_VALID");
  const tickets = await Ticket.find({ bookingId: booking._id })
    .session(session || null)
    .sort({ seatLabel: 1 })
    .lean();
  const items = new Map(
    booking.items.map((item) => [String(item.seatId), item.ticketCode]),
  );
  if (
    tickets.length !== booking.items.length ||
    tickets.some(
      (t) =>
        String(t.eventId) !== String(booking.eventId) ||
        String(t.userId) !== String(booking.userId) ||
        items.get(String(t.seatId)) !== t.ticketCode,
    )
  )
    throw new Error("TICKET_NOT_VALID");
  return { booking, tickets };
};
const dto = async ({ booking, tickets }, admittedCount = 0) => {
  const valid = tickets.filter((t) => t.status === "valid"),
    checked = tickets.filter((t) => t.status === "checked_in");
  const holder = await User.findById(booking.userId)
    .select("fullName username")
    .lean();
  return {
    group: true,
    admittedCount,
    validCount: valid.length,
    checkedInCount: checked.length,
    totalCount: tickets.length,
    excludedCount: tickets.length - valid.length - checked.length,
    seats: tickets.map((t) => ({
      label: t.seatLabel,
      status: t.status,
      ticketCode: t.ticketCode,
    })),
    verification: admittedCount
      ? "checked_in"
      : valid.length
        ? "valid"
        : checked.length
          ? "already_checked_in"
          : "invalidated",
    canCheckIn: valid.length > 0,
    ticket: {
      id: String(booking._id),
      ticketCode: booking.bookingCode,
      bookingCode: booking.bookingCode,
      holderName:
        holder?.fullName || holder?.username || booking.customer.fullName,
      event: booking.eventSnapshot,
      seat: {
        label: (valid.length ? valid : checked)
          .map((t) => t.seatLabel)
          .join(", "),
      },
      status: valid.length
        ? "valid"
        : checked.length
          ? "checked_in"
          : "cancelled",
      checkedInAt: checked[0]?.checkedInAt || null,
    },
  };
};
export const verifyBookingPass = async (raw, eventId) =>
  dto(await load(raw, eventId));
export const checkInBookingPass = async (raw, actor, eventId) => {
  let result;
  await mongoose.connection.transaction(
    async (session) => {
      const state = await load(raw, eventId, session);
      const valid = state.tickets.filter((t) => t.status === "valid");
      if (!valid.length)
        throw new Error(
          state.tickets.some((t) => t.status === "checked_in")
            ? "TICKET_ALREADY_CHECKED_IN"
            : "TICKET_NOT_VALID",
        );
      const now = new Date();
      const changed = await Ticket.updateMany(
        { _id: { $in: valid.map((t) => t._id) }, status: "valid" },
        {
          $set: { status: "checked_in", checkedInAt: now, checkedInBy: actor },
        },
        { session },
      );
      if (changed.modifiedCount !== valid.length)
        throw new Error("TICKET_NOT_VALID");
      for (const ticket of valid)
        Object.assign(ticket, { status: "checked_in", checkedInAt: now });
      result = { state, count: valid.length };
    },
    { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
  );
  return dto(result.state, result.count);
};

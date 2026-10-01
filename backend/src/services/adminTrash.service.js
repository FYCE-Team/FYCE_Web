import { assertPurgeAllowed, purgeRecord } from "./adminPurge.service.js";
import mongoose from "mongoose";
import { createHmac, timingSafeEqual } from "node:crypto";
import User from "../models/User.js";
import Event from "../models/Event.js";
import Booking from "../models/Booking.js";
import Ticket from "../models/Ticket.js";
import Hero from "../models/HeroSection.js";
import About from "../models/AboutSection.js";
import Gallery from "../models/Gallery.js";
import Seat from "../models/Seat.js";
import SeatHistory from "../models/SeatHistory.js";
import RefreshToken from "../models/RefreshToken.js";
import {
  adminRecordQuery,
  fail,
  objectId,
  listOptions,
} from "./admin.service.js";
const models = {
  users: User,
  events: Event,
  bookings: Booking,
  tickets: Ticket,
  hero: Hero,
  about: About,
  gallery: Gallery,
  seats: Seat,
};
const signature = (value) =>
  createHmac("sha256", process.env.JWT_REFRESH_SECRET)
    .update(`admin-bulk:${value}`)
    .digest("base64url");
const selection = (kind, action, filters = {}) => {
  if (
    !Object.hasOwn(models, kind) ||
    !["trash", "restore", "restore-seats", "purge"].includes(action) ||
    (kind === "seats") !== (action === "restore-seats")
  )
    fail(400, "Thao tác không hợp lệ.");
  if (!filters || typeof filters !== "object" || Array.isArray(filters))
    fail(400, "Bộ lọc không hợp lệ.");
  const { search } = listOptions(filters);
  let filter = {
    deletedAt: ["restore", "purge"].includes(action) ? { $ne: null } : null,
  };
  if (["users", "bookings", "tickets"].includes(kind))
    filter = adminRecordQuery(kind, {
      ...filters,
      trash: ["restore", "purge"].includes(action) ? "1" : "0",
    }).filter;
  else if (kind === "seats")
    filter = {
      eventId: objectId(filters.eventId),
      status: "blocked",
      isActive: true,
    };
  else {
    if (search)
      filter.$or = (
        kind === "events" ? ["title", "slug", "venue", "city"] : ["title"]
      ).map((key) => ({ [key]: { $regex: search, $options: "i" } }));
    if (kind === "events" && filters.status) {
      if (
        !["draft", "published", "cancelled", "completed", "sold_out"].includes(
          filters.status,
        )
      )
        fail(400, "Trạng thái không hợp lệ.");
      filter.status = filters.status;
    }
  }
  if (kind === "users")
    filter.role = filters.role === "admin" ? { $in: [] } : "user"; // Administrators are never eligible for deletion.
  if (filters.ids !== undefined) {
    if (
      !Array.isArray(filters.ids) ||
      !filters.ids.length ||
      filters.ids.length > 1000
    )
      fail(400, "Danh sách không hợp lệ.");
    filter._id = { $in: filters.ids.map(objectId) };
  }
  return { Model: models[kind], filter };
};
export const listTrash = async (kind, query = {}) => {
  const { Model, filter } = selection(kind, "restore", query);
  const { page, limit } = listOptions(query);
  const [items, total] = await Promise.all([
    Model.find(filter)
      .select(
        "title username fullName email bookingCode ticketCode deletedAt updatedAt",
      )
      .sort({ deletedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Model.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};
export const previewBulk = async (
  { kind, action = "trash", filters = {} } = {},
  actor,
) => {
  const { Model, filter } = selection(kind, action, filters);
  const rows = await Model.find(filter)
    .select("_id updatedAt title username bookingCode ticketCode label")
    .sort({ _id: 1 })
    .limit(1001)
    .lean();
  if (rows.length > 1000)
    fail(400, "Có hơn 1.000 bản ghi. Hãy thu hẹp bộ lọc trước khi thực hiện.");
  if (action === "purge")
    for (const row of rows) await assertPurgeAllowed(kind, row._id);
  const payload = {
    kind,
    action,
    actor: String(actor),
    expires: Date.now() + 600000,
    rows: rows.map((row) => ({
      id: String(row._id),
      version: row.updatedAt?.toISOString() || null,
    })),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    token: `${encoded}.${signature(encoded)}`,
    count: rows.length,
    names: rows
      .slice(0, 5)
      .map(
        (r) =>
          r.title || r.username || r.ticketCode || r.bookingCode || r.label,
      ),
    action,
    kind,
  };
};
export const executeBulk = async ({ token, confirmation } = {}, actor) => {
  if (typeof token !== "string" || token.length > 250000)
    fail(400, "Thiếu bản xác nhận hợp lệ.");
  const [encoded, sig, extra] = token.split(".");
  const expected = signature(encoded || "");
  if (
    extra ||
    !sig ||
    !/^[A-Za-z0-9_-]{43}$/.test(sig) ||
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  )
    fail(400, "Bản xác nhận không hợp lệ.");
  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
  } catch {
    fail(400, "Bản xác nhận không hợp lệ.");
  }
  const { kind, action, rows } = payload;
  if (action === "purge" && confirmation !== "XOA VINH VIEN")
    fail(400, "Nhập XOA VINH VIEN để xác nhận xóa không thể khôi phục.");
  if (payload.actor !== String(actor) || payload.expires < Date.now())
    fail(409, "Bản xác nhận đã hết hạn. Hãy xem lại danh sách.");
  const { Model } = selection(
    kind,
    action,
    kind === "seats" ? { eventId: "000000000000000000000000" } : {},
  );
  await mongoose.connection.transaction(async (session) => {
    for (const row of rows) {
      const state =
        kind === "seats"
          ? { status: "blocked", isActive: true }
          : {
              deletedAt: ["restore", "purge"].includes(action)
                ? { $ne: null }
                : null,
            };
      const current = await Model.findOne({
        _id: row.id,
        updatedAt: row.version ? new Date(row.version) : null,
        ...state,
        ...(kind === "users" ? { role: "user" } : {}),
      })
        .session(session)
        .lean();
      if (!current)
        fail(
          409,
          "Dữ liệu đã thay đổi. Chưa áp dụng thao tác nào; hãy tải lại và xác nhận lại.",
        );
      if (action === "purge") {
        await purgeRecord(kind, current._id, session);
        continue;
      }
      const now = new Date(
        Math.max(Date.now(), (current.updatedAt?.getTime() || 0) + 1),
      );
      const changes =
        kind === "seats"
          ? {
              status: "available",
              blockedReason: null,
              blockedAt: null,
              blockedByUserId: null,
              adminStatusUpdatedAt: now,
              adminStatusUpdatedByUserId: actor,
              holdToken: null,
              heldByUserId: null,
              holdExpiresAt: null,
            }
          : {
              deletedAt: action === "trash" ? now : null,
              deletedBy: action === "trash" ? actor : null,
            };
      if (kind === "users") {
        changes.isBlocked =
          action === "trash" ? true : Boolean(current.trashWasBlocked);
        changes.trashWasBlocked =
          action === "trash" ? Boolean(current.isBlocked) : false;
        changes.authVersion = (current.authVersion || 0) + 1;
        await RefreshToken.deleteMany({ userId: current._id }, { session });
      }
      await Model.updateOne(
        { _id: current._id },
        { $set: { ...changes, updatedAt: now } },
        { session, timestamps: false },
      );
      if (kind === "seats")
        await SeatHistory.create(
          [
            {
              eventId: current.eventId,
              seatId: current._id,
              seatLabel: current.label,
              action: "unblocked",
              fromStatus: "blocked",
              toStatus: "available",
              actorType: "admin",
              actorUserId: actor,
              reason: "Khôi phục hàng loạt các ghế bị khóa",
            },
          ],
          { session },
        );
    }
  });
  return {
    count: rows.length,
    message:
      action === "purge"
        ? "Đã xóa vĩnh viễn dữ liệu đủ điều kiện."
        : action === "trash"
          ? "Đã chuyển vào thùng rác. Lịch sử và vé đã mua được giữ nguyên."
          : "Đã khôi phục dữ liệu.",
  };
};

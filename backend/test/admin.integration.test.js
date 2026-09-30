import TicketEmail from "../src/models/TicketEmail.js";
import RefreshToken from "../src/models/RefreshToken.js";
import { hashToken } from "../src/utils/token.js";
import { refreshAccessToken } from "../src/services/refreshToken.service.js";
import { deliverNextTicketEmail, buildTicketEmail } from "../src/services/ticketEmail.service.js";
import { retrieveSePayOrderByInvoice } from "../src/services/payment.service.js";
import { paymentReturnOrigin } from "../src/controllers/booking.controller.js";
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Booking from "../src/models/Booking.js";
import Seat from "../src/models/Seat.js";
import PaymentReview from "../src/models/PaymentReview.js";
import { processSePayPayment } from "../src/services/payment.service.js";
import { cancelBooking } from "../src/services/booking.service.js";
import Ticket from "../src/models/Ticket.js";
import { generateAccessToken } from "../src/utils/token.js";
import { createTicketQrPayload } from "../src/utils/ticketQr.js";
import { ensureTicketsForBooking } from "../src/services/ticket.service.js";
import { loginWithGoogle } from "../src/services/auth.service.js";
import { listOptions } from "../src/services/admin.service.js";
import { safeContentUrl } from "../src/services/adminContent.service.js";
let server, base, admin, user, adminToken, userToken, booking, ticket;
const oid = () => new mongoose.Types.ObjectId();
const request = async (
  path,
  { token = adminToken, method = "GET", body } = {},
) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, ...(await response.json()) };
};
before(async () => {
  process.env.JWT_ACCESS_SECRET =
    "fyce-isolated-test-secret-not-for-production";
  process.env.JWT_ACCESS_EXPIRES = "1h";
  process.env.JWT_REFRESH_SECRET = "fyce-test-refresh-only";
  process.env.TICKET_QR_SECRET =
    "fyce-isolated-qr-test-secret-not-for-production";
  // Never read .env or use application database. Fixed loopback test DB only.
  await mongoose.connect("mongodb://127.0.0.1:27028/fyce_admin_test", {
    serverSelectionTimeoutMS: 5000,
  });
  await mongoose.connection.dropDatabase();
  await Promise.all([User.init(), Booking.init(), Ticket.init(), TicketEmail.init(), RefreshToken.init(), Seat.init()]);
  admin = await User.create({
    username: "testadmin",
    fullName: "Admin thử nghiệm",
    email: "admin@example.test",
    password: "not-used",
    role: "admin",
    isActive: true,
  });
  user = await User.create({
    username: "testuser",
    fullName: "Khách thử nghiệm",
    email: "user@example.test",
    password: "not-used",
    isActive: true,
  });
  adminToken = generateAccessToken(admin);
  userToken = generateAccessToken(user);
  const eventId = oid(),
    seatId = oid();
  booking = await Booking.create({
    bookingCode: "FYCE-20260929-ABCDEF12",
    userId: user._id,
    eventId,
    eventSnapshot: { title: "Concert test", slug: "concert-test" },
    customer: { fullName: user.fullName, email: user.email },
    items: [
      {
        seatId,
        seatLabel: "A1",
        section: "main",
        row: "A",
        number: 1,
        ticketCategoryId: oid(),
        ticketCategoryCode: "VIP",
        ticketCategoryName: "VIP",
        unitPrice: 100000,
        ticketCode: "FYCE-TICKET-TEST",
      },
    ],
    subtotal: 100000,
    totalAmount: 100000,
    holdToken: "test-hold",
    holdExpiresAt: new Date(Date.now() + 600000),
    status: "confirmed",
    paymentStatus: "paid",
  });
  await Seat.create({
    _id: seatId,
    eventId,
    ticketCategoryId: booking.items[0].ticketCategoryId,
    label: "A1",
    section: "center",
    row: "A",
    number: 1,
    position: { x: 0, y: 0 },
    status: "sold",
    soldBookingId: booking._id,
  });
  [ticket] = await ensureTicketsForBooking(booking);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});
test("admin authorization rejects anonymous and ordinary users", async () => {
  assert.equal((await request("/admin/overview", { token: null })).status, 401);
  assert.equal(
    (await request("/admin/overview", { token: userToken })).status,
    403,
  );
  assert.equal(
    (
      await request("/admin/content/hero", {
        token: userToken,
        method: "POST",
        body: { title: "attack" },
      })
    ).status,
    403,
  );
});
test("pagination and literal regex searches are validated", async () => {
  assert.throws(() => listOptions({ page: -1 }), /Phân trang/);
  assert.throws(() => listOptions({ q: { $ne: null } }), /Từ khóa/);
  assert.equal((await request("/admin/users?limit=999")).status, 400);
  assert.equal((await request("/admin/users?q=%5B%2E%2A%5D")).data.total, 0);
});
test("overview returns database totals and paid amount", async () => {
  const response = await request("/admin/overview");
  assert.equal(response.status, 200);
  assert.equal(response.data.users, 2);
  assert.equal(
    response.data.bookings.find((x) => x._id === "paid").amount,
    100000,
  );
});
test("user list never exposes credentials", async () => {
  const response = await request("/admin/users");
  assert.equal(response.data.total, 2);
  assert.ok(response.data.items.every((row) => !row.password && !row.googleId));
});
test("create user hashes password, validates role and uniqueness", async () => {
  const payload = {
    username: "createduser",
    fullName: "Người mới",
    email: "created@example.test",
    password: "Strong-test-1234",
    role: "user",
    isActive: true,
  };
  const response = await request("/admin/users", {
    method: "POST",
    body: payload,
  });
  assert.equal(response.status, 201);
  assert.equal(response.data.password, undefined);
  const created = await User.findById(response.data._id).select("+password");
  assert.match(created.password, /^\$2/);
  assert.equal(
    (await request("/admin/users", { method: "POST", body: payload })).status,
    409,
  );
  assert.equal(
    (
      await request("/admin/users", {
        method: "POST",
        body: { ...payload, role: "superadmin" },
      })
    ).status,
    400,
  );
});
test("cannot disable or demote administrators", async () => {
  const response = await request(`/admin/users/${admin.id}`, {
    method: "PATCH",
    body: { isBlocked: true, updatedAt: admin.updatedAt },
  });
  assert.equal(response.status, 409);
});
test("user edits use compare-and-swap and blocked tokens immediately fail", async () => {
  const payload = {
    updatedAt: user.updatedAt,
    fullName: "Đã sửa",
    isBlocked: true,
  };
  assert.equal(
    (
      await request(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: payload,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: payload,
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("/admin/overview", { token: userToken })).status,
    401,
  );
  await assert.rejects(
    loginWithGoogle({
      googleId: "test-google",
      email: user.email,
      fullName: user.fullName,
    }),
    /ACCOUNT_NOT_ACTIVE/,
  );
});
test("CMS create, edit, stale write rejection, delete", async () => {
  const created = await request("/admin/content/gallery", {
    method: "POST",
    body: { title: "Ảnh test", image: "/api/images/test", isActive: false },
  });
  assert.equal(created.status, 200);
  const item = created.data;
  const updated = await request(`/admin/content/gallery/${item._id}`, {
    method: "PUT",
    body: { caption: "Đã cập nhật", updatedAt: item.updatedAt },
  });
  assert.equal(updated.status, 200);
  assert.equal(
    (
      await request(`/admin/content/gallery/${item._id}`, {
        method: "PUT",
        body: { caption: "Ghi đè", updatedAt: item.updatedAt },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/admin/content/gallery/${item._id}`, {
        method: "DELETE",
        body: { updatedAt: item.updatedAt },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/admin/content/gallery/${item._id}`, {
        method: "DELETE",
        body: { updatedAt: updated.data.updatedAt },
      })
    ).status,
    200,
  );
});
test("concurrent CMS changes allow exactly one writer", async () => {
  const { data } = await request("/admin/content/hero", {
    method: "POST",
    body: { title: "Banner", isActive: false },
  });
  const responses = await Promise.all(
    ["One", "Two"].map((title) =>
      request(`/admin/content/hero/${data._id}`, {
        method: "PUT",
        body: { title, updatedAt: data.updatedAt },
      }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
});
test("CMS rejects unsafe links and conflicting media", async () => {
  assert.equal(safeContentUrl("javascript:alert(1)"), false);
  assert.equal(safeContentUrl("//evil.example"), false);
  assert.equal(
    (
      await request("/admin/content/hero", {
        method: "POST",
        body: { title: "Unsafe", primaryButtonLink: "javascript:alert(1)" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/admin/content/hero", {
        method: "POST",
        body: {
          title: "Conflict",
          backgroundImage: "/one",
          backgroundVideoUrl: "/two",
        },
      })
    ).status,
    400,
  );
});
test("booking and ticket lists omit hold tokens and QR secrets", async () => {
  const bookings = await request("/admin/bookings");
  assert.equal(bookings.data.items[0].holdToken, undefined);
  const tickets = await request("/admin/tickets");
  assert.equal(tickets.data.items[0].qrVersion, undefined);
  assert.equal(tickets.data.items[0].userId.email, user.email);
});
test("audit identifies mismatch without altering booking", async () => {
  assert.deepEqual(
    (await request(`/admin/bookings/${booking.id}/audit`)).data.issues,
    [],
  );
  await Booking.updateOne(
    { _id: booking._id },
    { $set: { totalAmount: 200000 } },
  );
  assert.ok(
    (await request(`/admin/bookings/${booking.id}/audit`)).data.issues.some(
      (x) => x.includes("Tổng tiền"),
    ),
  );
});
test("QR validation rejects tampering; concurrent check-in admits once", async () => {
  const qrPayload = createTicketQrPayload(ticket);
  assert.equal(
    (
      await request("/tickets/admin/verify", {
        method: "POST",
        body: { qrPayload: "FYCE1:tampered" },
      })
    ).status,
    400,
  );
  const responses = await Promise.all(
    [1, 2].map(() =>
      request("/tickets/admin/check-in", {
        method: "POST",
        body: { qrPayload },
      }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
});
test("ticket issuance retries do not duplicate tickets", async () => {
  await Promise.all([
    ensureTicketsForBooking(booking),
    ensureTicketsForBooking(booking),
  ]);
  assert.equal(await Ticket.countDocuments({ bookingId: booking._id }), 1);
});
test("paid reconciliation reuses issued tickets", async () => {
  const response = await request(`/admin/bookings/${booking.id}/reconcile`, {
    method: "POST",
  });
  assert.equal(response.status, 200);
  assert.equal(response.data.alreadyConfirmed, true);
  assert.equal(await Ticket.countDocuments({ bookingId: booking._id }), 1);
});

test("event-bound check-in rejects tickets from other events", async () => {
  const response = await request("/tickets/admin/verify", {
    method: "POST",
    body: { qrPayload: createTicketQrPayload(ticket), eventId: String(oid()) },
  });
  assert.equal(response.status, 409);
  assert.equal(response.code, "TICKET_EVENT_MISMATCH");
});
test("check-in rejects a ticket whose booking is no longer paid", async () => {
  await Booking.updateOne(
    { _id: booking._id },
    { $set: { paymentStatus: "refunded" } },
  );
  const response = await request("/tickets/admin/check-in", {
    method: "POST",
    body: { qrPayload: createTicketQrPayload(ticket) },
  });
  assert.equal(response.status, 409);
  assert.equal(response.code, "TICKET_NOT_VALID");
});
let sequence = 0;
const pendingFixture = async () => {
  sequence += 1;
  const eventId = oid(),
    categoryId = oid(),
    seatId = oid();
  const pending = await Booking.create({
    bookingCode: `FYCE-20260929-${sequence.toString(16).padStart(8, "0").toUpperCase()}`,
    userId: user._id,
    eventId,
    eventSnapshot: { title: "Concurrent concert", slug: `test-${sequence}` },
    customer: { fullName: "Test", email: "test@example.test" },
    items: [
      {
        seatId,
        seatLabel: "A1",
        section: "center",
        row: "A",
        number: 1,
        ticketCategoryId: categoryId,
        ticketCategoryCode: "VIP",
        ticketCategoryName: "VIP",
        unitPrice: 100000,
        ticketCode: `TKT-CONCURRENT-${sequence}`,
      },
    ],
    subtotal: 100000,
    totalAmount: 100000,
    holdToken: `hold-${sequence}`,
    holdExpiresAt: new Date(Date.now() + 600000),
  });
  await Seat.create({
    _id: seatId,
    eventId,
    ticketCategoryId: categoryId,
    section: "center",
    row: "A",
    number: 1,
    label: "A1",
    position: { x: 0, y: 0 },
    status: "held",
    holdToken: pending.holdToken,
    heldByUserId: user._id,
    holdExpiresAt: pending.holdExpiresAt,
  });
  return pending;
};
const paymentFor = (pending) => ({
  notification_type: "ORDER_PAID",
  order: {
    order_invoice_number: pending.bookingCode,
    order_status: "CAPTURED",
    order_currency: "VND",
    order_amount: 100000,
  },
  transaction: {
    transaction_status: "APPROVED",
    transaction_amount: 100000,
    transaction_currency: "VND",
  },
});
test("duplicate payment callbacks never release another attempt's sold seats", async () => {
  const pending = await pendingFixture();
  const results = await Promise.all([
    processSePayPayment(paymentFor(pending)),
    processSePayPayment(paymentFor(pending)),
  ]);
  assert.ok(results.some((result) => result.success));
  assert.equal((await Booking.findById(pending._id)).status, "confirmed");
  const seat = await Seat.findById(pending.items[0].seatId);
  assert.equal(seat.status, "sold");
  assert.equal(String(seat.soldBookingId), pending.id);
  assert.equal(await Ticket.countDocuments({ bookingId: pending._id }), 1);
  assert.equal(
    await PaymentReview.countDocuments({ bookingCode: pending.bookingCode }),
    2,
  );
});
test("payment and cancellation cannot leave a cancelled booking with sold seats", async () => {
  const pending = await pendingFixture();
  await Promise.allSettled([
    processSePayPayment(paymentFor(pending)),
    cancelBooking(pending.bookingCode, pending.userId),
  ]);
  const final = await Booking.findById(pending._id);
  const seat = await Seat.findById(pending.items[0].seatId);
  assert.ok(["confirmed", "cancelled"].includes(final.status));
  assert.equal(
    seat.status,
    final.status === "confirmed" ? "sold" : "available",
  );
  assert.equal(
    await Ticket.countDocuments({ bookingId: pending._id }),
    final.status === "confirmed" ? 1 : 0,
  );
});
test("late payments are logged for review without selling released seats", async () => {
  const pending = await pendingFixture();
  await Booking.updateOne(
    { _id: pending._id },
    { $set: { holdExpiresAt: new Date(Date.now() - 1000) } },
  );
  assert.equal((await processSePayPayment(paymentFor(pending))).success, false);
  assert.equal(
    (await Seat.findById(pending.items[0].seatId)).status,
    "available",
  );
  assert.equal(
    (await PaymentReview.findOne({ bookingCode: pending.bookingCode })).outcome,
    "review_required",
  );
});
test("outgoing transfers cannot confirm a booking", async () => {
  const pending = await pendingFixture();
  assert.equal(
    (
      await processSePayPayment({
        content: pending.bookingCode,
        transferAmount: 100000,
        transferType: "out",
      })
    ).success,
    false,
  );
  assert.equal((await Booking.findById(pending._id)).paymentStatus, "unpaid");
});
test("admin may cancel only pending unpaid bookings", async () => {
  const pending = await pendingFixture();
  assert.equal(
    (await request(`/admin/bookings/${pending.id}/cancel`, { method: "POST" }))
      .status,
    200,
  );
  assert.equal(
    (await Seat.findById(pending.items[0].seatId)).status,
    "available",
  );
  assert.equal(
    (await request(`/admin/bookings/${booking.id}/cancel`, { method: "POST" }))
      .status,
    409,
  );
});

test("payment transaction rolls back sold seats and booking when ticket issuance fails", async () => {
  const pending = await pendingFixture();
  const original = Ticket.bulkWrite;
  Ticket.bulkWrite = async () => { throw new Error("QA_ISSUANCE_FAILURE"); };
  try { await assert.rejects(processSePayPayment(paymentFor(pending)), /QA_ISSUANCE_FAILURE/); }
  finally { Ticket.bulkWrite = original; }
  assert.equal((await Seat.findById(pending.items[0].seatId)).status, "held");
  assert.equal((await Booking.findById(pending._id)).status, "pending_payment");
  assert.equal(await TicketEmail.countDocuments({ bookingId: pending._id }), 0);
});

test("public homepage reflects published content and excludes drafts", async () => {
  const response = await request("/admin/content/about", {
    method: "POST",
    body: {
      title: "Published about",
      description: "Visible story",
      isActive: true,
      sortOrder: 0,
    },
  });
  assert.equal(response.status, 200);
  await request("/admin/content/about", {
    method: "POST",
    body: {
      title: "Draft about",
      description: "Hidden story",
      isActive: false,
      sortOrder: 0,
    },
  });
  const home = await request("/homepage", { token: null });
  assert.equal(home.status, 200);
  assert.equal(home.data.about.title, "Published about");
});

test("image upload rejects non-image payloads with the patched upload library", async () => {
  const body = new FormData();
  body.append(
    "image",
    new Blob(["not an image"], { type: "text/plain" }),
    "test.txt",
  );
  const response = await fetch(`${base}/images/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body,
  });
  assert.equal(response.status, 400);
});

test("media upload requires admin and uploaded image streams through GridFS", async () => {
  const ordinary = await User.findOne({ username: "createduser" });
  const denied = await request("/images/upload", {
    method: "POST",
    token: generateAccessToken(ordinary),
    body: {},
  });
  assert.equal(denied.status, 403);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFZkAAAAASUVORK5CYII=",
    "base64",
  );
  const body = new FormData();
  body.append("image", new Blob([png], { type: "image/png" }), "pixel.png");
  const uploaded = await fetch(`${base}/images/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body,
  });
  assert.equal(uploaded.status, 201);
  const result = await uploaded.json();
  const streamed = await fetch(
    `${base.replace(/\/api$/, "")}${result.data.image.url}`,
  );
  assert.equal(streamed.status, 200);
  assert.match(streamed.headers.get("content-type"), /image\/png/);
  assert.deepEqual(Buffer.from(await streamed.arrayBuffer()), png);
});

test("development CORS allows configured localhost but not arbitrary origins", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  try {
    const good = await fetch(`${base}/health`, { headers: { Origin: "http://localhost:5173" } });
    assert.equal(good.headers.get("access-control-allow-origin"), "http://localhost:5173");
    const bad = await fetch(`${base}/health`, { headers: { Origin: "https://untrusted.example" } });
    assert.equal(bad.headers.get("access-control-allow-origin"), null);
    process.env.NODE_ENV = "production";
    const prod = await fetch(`${base}/health`, { headers: { Origin: "http://localhost:5173" } });
    assert.equal(prod.headers.get("access-control-allow-origin"), null);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

const paidFixture = async (twoSeats = false) => {
  const pending = await pendingFixture();
  if (twoSeats) {
    const extra = await Seat.create({ eventId: pending.eventId, ticketCategoryId: pending.items[0].ticketCategoryId, section: "center", row: "A", number: 2, label: "A2", position: { x: 40, y: 0 }, status: "held", holdToken: pending.holdToken, heldByUserId: pending.userId, holdExpiresAt: pending.holdExpiresAt });
    pending.items.push({ ...pending.items[0].toObject(), seatId: extra._id, seatLabel: "A2", number: 2, ticketCode: `${pending.items[0].ticketCode}-2` });
    pending.totalAmount = pending.subtotal = 200000;
    await pending.save();
  }
  const payment = paymentFor(pending);
  payment.order.order_amount = payment.transaction.transaction_amount = pending.totalAmount;
  assert.equal((await processSePayPayment(payment)).success, true);
  const paid = await Booking.findById(pending._id);
  return { paid, tickets: await Ticket.find({ bookingId: paid._id }).sort({ number: 1 }) };
};
const refundBody = (paid, tickets) => ({ updatedAt: paid.updatedAt.toISOString(), ticketIds: tickets.map(t => t.id), reason: "Đã hoàn ngoài hệ thống qua thỏa thuận Zalo (QA)", offlineRefundConfirmed: true });

test("audit detects expired or broken holds without disclosing hold secrets", async () => {
  const pending = await pendingFixture();
  await Booking.updateOne({ _id: pending._id }, { holdExpiresAt: new Date(Date.now() - 1000) });
  await Seat.updateOne({ _id: pending.items[0].seatId }, { holdToken: "other" });
  const response = await request(`/admin/bookings/${pending.id}/audit`);
  assert.ok(response.data.issues.some(x => x.includes("quá hạn")));
  assert.ok(response.data.issues.some(x => x.includes("không còn được giữ")));
  assert.equal(response.data.booking.holdToken, undefined);
  assert.equal(response.data.seats[0].holdToken, undefined);
});

test("manual refund validates confirmation, role and selected tickets", async () => {
  const { paid, tickets } = await paidFixture();
  const path = `/admin/bookings/${paid.id}/refund`;
  assert.equal((await request(path, { method: "POST", token: null, body: refundBody(paid, tickets) })).status, 401);
  const ordinary = await User.findOne({ username: "createduser" });
  assert.equal((await request(path, { method: "POST", token: generateAccessToken(ordinary), body: refundBody(paid, tickets) })).status, 403);
  assert.equal((await request(path, { method: "POST", body: { ...refundBody(paid, tickets), offlineRefundConfirmed: false } })).status, 400);
  assert.equal((await request(path, { method: "POST", body: { ...refundBody(paid, tickets), ticketIds: [String(oid())] } })).status, 409);
  assert.equal((await Seat.findById(tickets[0].seatId)).status, "sold");
});

test("partial and full manual refund preserve history, revoke QR and issue fresh QR on resale", async () => {
  const { paid, tickets } = await paidFixture(true);
  const oldQr = createTicketQrPayload(tickets[0]);
  const path = `/admin/bookings/${paid.id}/refund`;
  const first = await request(path, { method: "POST", body: refundBody(paid, [tickets[0]]) });
  assert.equal(first.status, 200, first.message);
  let current = await Booking.findById(paid._id);
  assert.equal(current.totalAmount, 200000);
  assert.equal(current.refundedAmount, 100000);
  assert.equal(current.paymentStatus, "paid");
  assert.equal((await Seat.findById(tickets[0].seatId)).status, "available");
  assert.equal((await Seat.findById(tickets[1].seatId)).status, "sold");
  assert.equal((await request("/tickets/admin/verify", { method: "POST", body: { qrPayload: oldQr } })).status, 404);
  assert.equal((await request("/tickets/admin/verify", { method: "POST", body: { qrPayload: createTicketQrPayload(tickets[1]) } })).data.canCheckIn, true);
  assert.deepEqual((await request(`/admin/bookings/${paid.id}/audit`)).data.issues, []);
  assert.equal((await request(path, { method: "POST", body: refundBody(paid, [tickets[0]]) })).status, 409);
  await ensureTicketsForBooking(paid); // stale issuance retry must never resurrect the old ticket
  assert.equal((await Ticket.findById(tickets[0]._id)).status, "refunded");
  // New buyer holds the released seat and receives an entirely new booking/ticket.
  const next = await pendingFixture();
  await Seat.deleteOne({ _id: next.items[0].seatId });
  next.eventId = paid.eventId;
  next.items[0].seatId = tickets[0].seatId;
  next.items[0].ticketCategoryId = paid.items[0].ticketCategoryId;
  await next.save();
  await Seat.updateOne({ _id: tickets[0].seatId, status: "available" }, { status: "held", holdToken: next.holdToken, heldByUserId: next.userId, holdExpiresAt: next.holdExpiresAt });
  assert.equal((await processSePayPayment(paymentFor(next))).success, true);
  const newTicket = await Ticket.findOne({ bookingId: next._id });
  assert.notEqual(newTicket.ticketCode, tickets[0].ticketCode);
  assert.notEqual(createTicketQrPayload(newTicket), oldQr);
  assert.equal((await request("/tickets/admin/verify", { method: "POST", body: { qrPayload: createTicketQrPayload(newTicket) } })).status, 200);
  assert.equal((await request(path, { method: "POST", body: refundBody(current, [tickets[1]]) })).status, 200);
  current = await Booking.findById(paid._id);
  assert.equal(current.status, "cancelled"); assert.equal(current.paymentStatus, "refunded");
  assert.equal(current.refundedAmount, 200000); assert.equal(current.items.length, 2);
  assert.equal(String((await Seat.findById(tickets[0].seatId)).soldBookingId), next.id);
  const histories = await mongoose.connection.collection("seathistories").find({ bookingId: paid._id, action: "released_after_refund" }).toArray();
  assert.equal(histories.length, 2);
});

test("refund rolls back every collection when one selected seat has conflicting ownership", async () => {
  const { paid, tickets } = await paidFixture(true);
  await Seat.updateOne({ _id: tickets[1].seatId }, { soldBookingId: oid() });
  const response = await request(`/admin/bookings/${paid.id}/refund`, { method: "POST", body: refundBody(paid, tickets) });
  assert.equal(response.status, 409);
  assert.equal((await Ticket.findById(tickets[0]._id)).status, "valid");
  assert.equal((await Seat.findById(tickets[0].seatId)).status, "sold");
  assert.equal((await Booking.findById(paid._id)).refundedAmount, 0);
  assert.equal(await mongoose.connection.collection("seathistories").countDocuments({ bookingId: paid._id }), 0);
});

test("simultaneous refund confirmations release and log each seat once", async () => {
  const { paid, tickets } = await paidFixture();
  const responses = await Promise.all([1,2].map(() => request(`/admin/bookings/${paid.id}/refund`, { method: "POST", body: refundBody(paid, tickets) })));
  assert.deepEqual(responses.map(r => r.status).sort(), [200,409]);
  assert.equal(await mongoose.connection.collection("seathistories").countDocuments({ bookingId: paid._id }), 1);
});

test("refund competing with check-in has exactly one winner", async () => {
  const { paid, tickets } = await paidFixture();
  const [refund, scan] = await Promise.all([
    request(`/admin/bookings/${paid.id}/refund`, { method: "POST", body: refundBody(paid, tickets) }),
    request("/tickets/admin/check-in", { method: "POST", body: { qrPayload: createTicketQrPayload(tickets[0]) } }),
  ]);
  assert.equal([refund, scan].filter(r => r.status === 200).length, 1);
  const final = await Ticket.findById(tickets[0]._id);
  assert.equal((await Seat.findById(final.seatId)).status, final.status === "refunded" ? "available" : "sold");
  assert.ok(["refunded", "checked_in"].includes(final.status));
});

test("legacy seat without sale owner can refund only when ownership is unambiguous", async () => {
  const { paid, tickets } = await paidFixture();
  await Seat.updateOne({ _id: tickets[0].seatId }, { $unset: { soldBookingId: 1 } });
  const result = await request(`/admin/bookings/${paid.id}/refund`, { method: "POST", body: refundBody(paid, tickets) });
  assert.equal(result.status, 200, result.message);
  assert.equal((await Seat.findById(tickets[0].seatId)).status, "available");
});

test("already checked-in tickets cannot be refunded", async () => {
  const { paid, tickets } = await paidFixture();
  assert.equal((await request("/tickets/admin/check-in", { method: "POST", body: { qrPayload: createTicketQrPayload(tickets[0]) } })).status, 200);
  assert.equal((await request(`/admin/bookings/${paid.id}/refund`, { method: "POST", body: refundBody(paid, tickets) })).status, 409);
  assert.equal((await Seat.findById(tickets[0].seatId)).status, "sold");
});

test("concurrent refreshes converge without losing the session, bounded grace rejects old tokens", async () => {
  const ordinary = await User.findOne({ username: "createduser" });
  const raw = "qa-refresh-concurrent-only";
  const stored = await RefreshToken.create({ userId: ordinary._id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 3600000) });
  const results = await Promise.all([1,2,3].map(() => refreshAccessToken(raw)));
  assert.equal(new Set(results.map(r => r.refreshToken)).size, 1);
  assert.notEqual(results[0].refreshToken, raw);
  assert.equal(await RefreshToken.countDocuments({ _id: stored._id }), 1);
  assert.equal((await refreshAccessToken(results[0].refreshToken)).refreshToken, results[0].refreshToken);
  await RefreshToken.updateOne({ _id: stored._id }, { rotatedAt: new Date(Date.now() - 31000) });
  await assert.rejects(refreshAccessToken(raw), /REFRESH_TOKEN_INVALID/);
  assert.ok((await refreshAccessToken(results[0].refreshToken)).accessToken);
});

test("production login sets first-party secure cookie and refresh works after page navigation", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const login = await fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: "createduser", password: "Strong-test-1234" }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Lax/); assert.match(cookie, /Path=\/api\/auth/);
    const response = await fetch(`${base}/auth/refresh`, { method: "POST", headers: { Cookie: cookie.split(";")[0] } });
    assert.equal(response.status, 200);
    const rotated = response.headers.get("set-cookie").split(";")[0];
    assert.equal((await fetch(`${base}/auth/logout`, { method: "POST", headers: { Cookie: rotated } })).status, 200);
    assert.equal((await fetch(`${base}/auth/refresh`, { method: "POST", headers: { Cookie: rotated } })).status, 401);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

test("return URLs stay on approved frontend origin and cannot be redirected to an attacker", () => {
  const oldClient = process.env.CLIENT_URL, oldMode = process.env.NODE_ENV;
  process.env.CLIENT_URL = "https://fyce-web.vercel.app"; process.env.NODE_ENV = "development";
  try {
    assert.equal(paymentReturnOrigin({ get: () => "http://localhost:5173" }), "http://localhost:5173");
    assert.equal(paymentReturnOrigin({ get: () => "https://attacker.test" }), "https://fyce-web.vercel.app");
  } finally {
    if (oldClient === undefined) delete process.env.CLIENT_URL; else process.env.CLIENT_URL = oldClient;
    if (oldMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldMode;
  }
});

test("SePay reconciliation can resolve provider ID but never matches a different invoice", async () => {
  const invoice = "FYCE-20260930-ABCDEF99";
  const calls = [];
  const client = { order: {
    retrieve: async value => { calls.push(value); if (value === invoice) throw { response: { status: 404 } }; return { data: { data: { order_invoice_number: invoice, order_status: "CAPTURED" } } }; },
    all: async () => ({ data: { data: [{ order_id: "provider-id", order_invoice_number: invoice }, { order_id: "unrelated", order_invoice_number: "other" }] } })
  } };
  assert.equal((await retrieveSePayOrderByInvoice(invoice, client)).order_invoice_number, invoice);
  assert.deepEqual(calls, [invoice, "provider-id"]);
  client.order.all = async () => ({ data: { data: [{ order_id: "unrelated", order_invoice_number: "other" }] } });
  assert.equal(await retrieveSePayOrderByInvoice(invoice, client), null);
});

test("gateway IPN requires secret and confirmed PAYMENT; callback creates ticket and email job", async () => {
  process.env.SEPAY_SECRET_KEY = "qa-gateway-secret-only";
  const pending = await pendingFixture();
  const payload = paymentFor(pending);
  const call = secret => fetch(`${base}/payments/sepay-webhook`, { method: "POST", headers: { "Content-Type": "application/json", "X-Secret-Key": secret }, body: JSON.stringify(payload) });
  assert.equal((await call("wrong")).status, 401);
  assert.equal((await Booking.findById(pending._id)).paymentStatus, "unpaid");
  assert.equal((await (await call(process.env.SEPAY_SECRET_KEY)).json()).success, true);
  assert.equal(await Ticket.countDocuments({ bookingId: pending._id }), 1);
  assert.equal(await TicketEmail.countDocuments({ bookingId: pending._id }), 1);
  assert.equal((await (await call(process.env.SEPAY_SECRET_KEY)).json()).success, true);
  assert.equal(await TicketEmail.countDocuments({ bookingId: pending._id }), 1);
  const outgoing = await pendingFixture();
  const invalid = paymentFor(outgoing); invalid.transaction.transaction_type = "REFUND";
  assert.equal((await processSePayPayment(invalid)).success, false);
  assert.equal((await Booking.findById(outgoing._id)).paymentStatus, "unpaid");
});

test("delayed on-time payment recovers released seats only if still available", async () => {
  const pending = await pendingFixture();
  const paidAt = new Date(Date.now() - 2000);
  await Booking.collection.updateOne({ _id: pending._id }, { $set: { status: "expired", createdAt: new Date(Date.now() - 10000), holdExpiresAt: new Date(Date.now() - 1000) } });
  await Seat.updateOne({ _id: pending.items[0].seatId }, { status: "available", holdToken: null, heldByUserId: null, holdExpiresAt: null });
  const payload = paymentFor(pending); payload.transaction.transaction_date = paidAt.toISOString();
  assert.equal((await processSePayPayment(payload)).success, true);
  assert.equal((await Booking.findById(pending._id)).paymentStatus, "paid");
  const other = await pendingFixture();
  await Booking.collection.updateOne({ _id: other._id }, { $set: { status: "expired", createdAt: new Date(Date.now() - 10000), holdExpiresAt: new Date(Date.now() - 1000) } });
  await Seat.updateOne({ _id: other.items[0].seatId }, { status: "sold", soldBookingId: oid() });
  const another = paymentFor(other); another.transaction.transaction_date = paidAt.toISOString();
  assert.equal((await processSePayPayment(another)).success, false);
  assert.equal((await Booking.findById(other._id)).paymentReviewRequired, true);
  assert.equal(await Ticket.countDocuments({ bookingId: other._id }), 0);
});

test("email contains QR attachments, escapes HTML, and retries SMTP without reverting paid booking", async () => {
  const { paid, tickets } = await paidFixture();
  paid.customer.fullName = '<script>alert("x")</script>';
  const mail = await buildTicketEmail(paid, tickets);
  assert.equal(mail.to, paid.customer.email);
  assert.match(mail.html, /&lt;script&gt;/); assert.ok(!mail.html.includes('<script>'));
  assert.equal(mail.attachments.length, 1);
  assert.equal(mail.attachments[0].content.subarray(1,4).toString(), "PNG");
  assert.match(mail.html, new RegExp(`cid:${mail.attachments[0].cid}`));
  // Isolate this job in the queue; no emails are delivered by this test.
  await TicketEmail.updateMany({ bookingId: { $ne: paid._id } }, { nextAttemptAt: new Date(Date.now() + 86400000) });
  assert.equal(await deliverNextTicketEmail(async () => { throw new Error("QA_SMTP_DOWN"); }), true);
  let job = await TicketEmail.findOne({ bookingId: paid._id });
  assert.equal(job.status, "pending"); assert.equal(job.attempts, 1);
  assert.equal((await Booking.findById(paid._id)).paymentStatus, "paid");
  await TicketEmail.updateOne({ _id: job._id }, { nextAttemptAt: new Date(0) });
  let sent = 0;
  await Promise.all([1,2].map(() => deliverNextTicketEmail(async message => { assert.equal(message.attachments.length, 1); sent++; })));
  job = await TicketEmail.findById(job._id);
  assert.equal(job.status, "sent"); assert.equal(sent, 1);
});

test("automatic reconciliation issues QR and email without an open browser or IPN", async () => {
  const { reconcileNextPayment } = await import("../src/services/paymentSync.service.js");
  const pending = await pendingFixture();
  await Booking.updateMany({ _id: { $ne: pending._id } }, { paymentNextSyncAt: new Date(Date.now() + 86400000) });
  const originalFetch = globalThis.fetch;
  const originalMerchant = process.env.SEPAY_MERCHANT_ID;
  process.env.SEPAY_MERCHANT_ID = "qa-merchant";
  let calls = 0;
  globalThis.fetch = async url => {
    assert.ok(String(url).startsWith("https://pgapi-sandbox.sepay.vn/v1/"));
    calls++;
    if (String(url).endsWith(`/detail/${pending.bookingCode}`)) return new Response("{}", { status: 404 });
    if (String(url).includes("/order?")) return Response.json({ data: [{ order_id: "SEPAY-QA", order_invoice_number: pending.bookingCode }] });
    assert.ok(String(url).endsWith("/detail/SEPAY-QA"));
    return Response.json({ data: { ...paymentFor(pending).order, transactions: [paymentFor(pending).transaction] } });
  };
  try {
    const outcomes = await Promise.all([reconcileNextPayment(), reconcileNextPayment()]);
    assert.equal(outcomes.filter(Boolean).length, 1);
    assert.equal(calls, 3);
    assert.equal((await Booking.findById(pending._id)).paymentStatus, "paid");
    assert.equal((await Seat.findById(pending.items[0].seatId)).status, "sold");
    const issued = await Ticket.findOne({ bookingId: pending._id });
    assert.ok(issued); assert.ok(createTicketQrPayload(issued));
    assert.equal(await TicketEmail.countDocuments({ bookingId: pending._id, status: "pending" }), 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalMerchant === undefined) delete process.env.SEPAY_MERCHANT_ID; else process.env.SEPAY_MERCHANT_ID = originalMerchant;
  }
  const retry = await pendingFixture();
  await reconcileNextPayment(async () => { throw new Error("PROVIDER_UNAVAILABLE"); });
  const waiting = await Booking.findById(retry._id);
  assert.equal(waiting.paymentStatus, "unpaid");
  assert.ok(waiting.paymentNextSyncAt > new Date());
  assert.equal(await Ticket.countDocuments({ bookingId: retry._id }), 0);
});

test("HTTPS email transport preserves QR CID attachments and handles provider failures", async () => {
  const { sendMail } = await import("../src/services/email.service.js");
  const keys = ["EMAIL_PROVIDER", "RESEND_API_KEY", "EMAIL_FROM"];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { EMAIL_PROVIDER: "resend", RESEND_API_KEY: "qa-fake-key", EMAIL_FROM: "FYCE <qa@example.test>" });
  try {
    const options = { to: "buyer@example.test", subject: "QA", messageId: "qa-ticket-once", html: '<img src="cid:qa-qr"/>', attachments: [{ filename: "qr.png", content: Buffer.from("qa-png"), cid: "qa-qr", contentType: "image/png" }] };
    const result = await sendMail(options, async (url, request) => {
      assert.equal(url, "https://api.resend.com/emails");
      assert.equal(request.headers["Idempotency-Key"], options.messageId);
      const body = JSON.parse(request.body);
      assert.equal(body.from, process.env.EMAIL_FROM);
      assert.equal(body.attachments[0].content_id, "qa-qr");
      assert.equal(Buffer.from(body.attachments[0].content, "base64").toString(), "qa-png");
      return Response.json({ id: "qa-message" });
    });
    assert.equal(result.messageId, "qa-message");
    await assert.rejects(sendMail(options, async () => new Response("{}", { status: 429 })), /EMAIL_DELIVERY_FAILED/);
  } finally { for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } }
});

test("legacy about without createdBy can be edited while keeping unknown original author", async () => {
  const About = (await import("../src/models/AboutSection.js")).default;
  const id = oid(), updatedAt = new Date();
  await About.collection.insertOne({ _id: id, title: "Legacy about", description: "Legacy description", features: [{ title: "One", sortOrder: 0 }, { title: "Two", sortOrder: 0 }], isActive: false, createdAt: updatedAt, updatedAt });
  const result = await request(`/admin/content/about/${id}`, { method: "PUT", body: { title: "Updated about", description: "Updated description", features: [{ title: "One", sortOrder: 0 }, { title: "Two", sortOrder: 0 }], updatedAt } });
  assert.equal(result.status, 200, result.message);
  const saved = await About.findById(id);
  assert.equal(saved.createdBy, undefined);
  assert.equal(String(saved.updatedBy), String(admin._id));
  assert.deepEqual(saved.features.map(f => f.sortOrder), [0, 1]);
  assert.equal((await request(`/admin/content/about/${id}`, { method: "PUT", body: { title: "", updatedAt: saved.updatedAt } })).status, 400);
});

test("CAPTURED bank transfer with empty transactions issues tickets only via authenticated REST", async () => {
  const { reconcileSePayPayment } = await import("../src/services/payment.service.js");
  const pending = await pendingFixture();
  const now = Date.now();
  await Booking.collection.updateOne({ _id: pending._id }, { $set: { status: "expired", createdAt: new Date(now - 60000), holdExpiresAt: new Date(now - 1000) } });
  await Seat.updateOne({ _id: pending.items[0].seatId }, { status: "available", holdToken: null, heldByUserId: null, holdExpiresAt: null });
  const original = globalThis.fetch, merchant = process.env.SEPAY_MERCHANT_ID;
  process.env.SEPAY_MERCHANT_ID = "qa-only";
  let currency = "VND";
  globalThis.fetch = async () => Response.json({ data: { order_id: "PAYTEST123456", order_invoice_number: pending.bookingCode, order_status: "CAPTURED", order_amount: pending.totalAmount, order_currency: currency, updated_at: new Date(now - 30000).toISOString(), transactions: [] } });
  try {
    const fakeIpn = { notification_type: "ORDER_PAID", order: { order_invoice_number: pending.bookingCode, order_status: "CAPTURED", order_amount: pending.totalAmount, order_currency: "VND" } };
    assert.equal((await processSePayPayment(fakeIpn)).success, false);
    currency = "USD";
    assert.equal((await reconcileSePayPayment(pending.bookingCode, pending.userId)).success, false);
    assert.equal(await Ticket.countDocuments({ bookingId: pending._id }), 0);
    currency = "VND";
    const result = await processSePayPayment({ transferType: "in", transferAmount: pending.totalAmount, content: "Thanh toan PAYTEST123456" });
    assert.equal(result.success, true);
    assert.equal((await Booking.findById(pending._id)).paymentStatus, "paid");
    assert.equal(await Ticket.countDocuments({ bookingId: pending._id }), 1);
    assert.equal(await TicketEmail.countDocuments({ bookingId: pending._id }), 1);
    assert.equal((await reconcileSePayPayment(pending.bookingCode, pending.userId)).success, true);
    assert.equal(await Ticket.countDocuments({ bookingId: pending._id }), 1);
  } finally { globalThis.fetch = original; if (merchant === undefined) delete process.env.SEPAY_MERCHANT_ID; else process.env.SEPAY_MERCHANT_ID = merchant; }
});

test("HMAC webhook verifies raw bytes and rejects replay timestamps", async () => {
  const { createHmac } = await import("node:crypto");
  const previous = process.env.SEPAY_WEBHOOK_SECRET;
  process.env.SEPAY_WEBHOOK_SECRET = "qa-hmac-only";
  const pending = await pendingFixture();
  const body = JSON.stringify({ transferType: "in", transferAmount: pending.totalAmount, content: `Thanh toán ${pending.bookingCode}` }, null, 2);
  const send = async timestamp => fetch(`${base}/payments/sepay-webhook`, { method: "POST", headers: { "Content-Type": "application/json", "X-SePay-Timestamp": timestamp, "X-SePay-Signature": "sha256=" + createHmac("sha256", process.env.SEPAY_WEBHOOK_SECRET).update(timestamp + "." + body).digest("hex") }, body });
  try {
    assert.equal((await send(String(Math.floor(Date.now() / 1000) - 600))).status, 401);
    assert.equal((await Booking.findById(pending._id)).paymentStatus, "unpaid");
    const result = await send(String(Math.floor(Date.now() / 1000)));
    assert.equal(result.status, 200); assert.equal((await result.json()).success, true);
  } finally { if (previous === undefined) delete process.env.SEPAY_WEBHOOK_SECRET; else process.env.SEPAY_WEBHOOK_SECRET = previous; }
});

test("checkout signature and form order match SePay canonical protocol", async () => {
  const { createSePayCheckout } = await import("../src/services/sepayCheckout.service.js");
  const { createHmac } = await import("node:crypto");
  const old = { merchant: process.env.SEPAY_MERCHANT_ID, secret: process.env.SEPAY_SECRET_KEY, env: process.env.SEPAY_ENV };
  Object.assign(process.env, { SEPAY_MERCHANT_ID: "QA_MERCHANT", SEPAY_SECRET_KEY: "qa-only", SEPAY_ENV: "production" });
  try {
    const result = createSePayCheckout({ bookingCode: "FYCE-20260930-ABCDEF01", totalAmount: 10000 }, "https://fyce-web.vercel.app");
    const expected = "order_amount=10000,merchant=QA_MERCHANT,currency=VND,operation=PURCHASE,order_description=FYCE-20260930-ABCDEF01,order_invoice_number=FYCE-20260930-ABCDEF01,payment_method=BANK_TRANSFER,success_url=https://fyce-web.vercel.app/bookings/FYCE-20260930-ABCDEF01?payment=success,error_url=https://fyce-web.vercel.app/bookings/FYCE-20260930-ABCDEF01?payment=error,cancel_url=https://fyce-web.vercel.app/bookings/FYCE-20260930-ABCDEF01?payment=cancel";
    const { signature, ...fields } = result.formFields;
    assert.equal(Object.entries(fields).map(([k,v]) => `${k}=${v}`).join(","), expected);
    assert.equal(signature, createHmac("sha256", "qa-only").update(expected).digest("base64"));
    assert.equal(result.checkoutURL, "https://pay.sepay.vn/v1/checkout/init");
    assert.throws(() => createSePayCheckout({ totalAmount: 0 }, "https://example.test"), /BOOKING_AMOUNT_INVALID/);
  } finally { for (const [key,value] of Object.entries({ SEPAY_MERCHANT_ID: old.merchant, SEPAY_SECRET_KEY: old.secret, SEPAY_ENV: old.env })) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

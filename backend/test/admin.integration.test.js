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
  process.env.TICKET_QR_SECRET =
    "fyce-isolated-qr-test-secret-not-for-production";
  // Never read .env or use application database. Fixed loopback test DB only.
  await mongoose.connect("mongodb://127.0.0.1:27028/fyce_admin_test", {
    serverSelectionTimeoutMS: 5000,
  });
  await mongoose.connection.dropDatabase();
  await Promise.all([User.init(), Booking.init(), Ticket.init()]);
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

test("partial seat sale is rolled back using the current attempt owner", async () => {
  const pending = await pendingFixture();
  const extra = await Seat.create({
    eventId: pending.eventId,
    ticketCategoryId: pending.items[0].ticketCategoryId,
    section: "center",
    row: "A",
    number: 2,
    label: "A2",
    position: { x: 40, y: 0 },
    status: "held",
    holdToken: pending.holdToken,
    heldByUserId: pending.userId,
    holdExpiresAt: pending.holdExpiresAt,
  });
  pending.items.push({
    ...pending.items[0].toObject(),
    seatId: extra._id,
    seatLabel: "A2",
    number: 2,
    ticketCode: `${pending.items[0].ticketCode}-2`,
  });
  pending.subtotal = 200000;
  pending.totalAmount = 200000;
  await pending.save();
  const original = Seat.countDocuments;
  let injected = false;
  Seat.countDocuments = async function (filter) {
    const count = await original.call(this, filter);
    if (!injected && filter.holdToken === pending.holdToken) {
      injected = true;
      await Seat.updateOne(
        { _id: extra._id },
        {
          $set: {
            status: "blocked",
            holdToken: null,
            heldByUserId: null,
            holdExpiresAt: null,
          },
        },
      );
    }
    return count;
  };
  try {
    const payload = paymentFor(pending);
    payload.order.order_amount = 200000;
    payload.transaction.transaction_amount = 200000;
    assert.equal((await processSePayPayment(payload)).success, false);
    assert.equal((await Seat.findById(pending.items[0].seatId)).status, "held");
    assert.equal((await Seat.findById(extra._id)).status, "blocked");
    assert.equal(
      (await Booking.findById(pending._id)).status,
      "pending_payment",
    );
  } finally {
    Seat.countDocuments = original;
  }
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

import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Event from "../src/models/Event.js";
import Seat from "../src/models/Seat.js";
import Booking from "../src/models/Booking.js";
import { createBooking, cancelBooking, getActiveBookingByEvent } from "../src/services/booking.service.js";
import { holdSeats, releaseHeldSeats, updateSeatCategory, getActiveHoldSession } from "../src/services/seat.service.js";
import { generateAccessToken } from "../src/utils/token.js";

let server, base, user, token, sequence = 0;
const oid = () => new mongoose.Types.ObjectId();
// Fixed, separate loopback fixture DB. Never read .env or accept target input.
before(async () => {
    process.env.JWT_ACCESS_SECRET = "fyce-booking-security-test-only-not-production";
    process.env.JWT_ACCESS_EXPIRES = "1h";
    await mongoose.connect("mongodb://127.0.0.1:27028/fyce_booking_security_test", {
        serverSelectionTimeoutMS: 5000
    });
    await mongoose.connection.dropDatabase();
    await Promise.all([User.init(), Event.init(), Seat.init(), Booking.init()]);
    user = await User.create({ username: "bookingsecurity", fullName: "Booking QA",
        email: "booking-security@example.test", password: "qa-not-used", isActive: true });
    token = generateAccessToken(user);
    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
});
const fixture = async (count = 1) => {
    const n = ++sequence, eventId = oid(), categoryId = oid(), now = Date.now();
    // Represents a previously published event whose booking window is open.
    await Event.collection.insertOne({ _id: eventId, title: `Booking QA ${n}`,
        slug: `booking-security-${n}`, venue: "QA", createdBy: user._id,
        status: "published", allowBooking: true, deletedAt: null,
        startAt: new Date(now + 7200000), endAt: new Date(now + 10800000),
        bookingOpenAt: new Date(now - 60000), bookingCloseAt: new Date(now + 3600000),
        ticketCategories: [{ _id: categoryId, code: "VIP", name: "VIP", price: 10000,
            maxPerOrder: 274, isActive: true }], createdAt: new Date(), updatedAt: new Date() });
    const holdToken = `booking-security-hold-${n}`;
    const seats = await Seat.create(Array.from({ length: count }, (_, i) => ({
        eventId, ticketCategoryId: categoryId, section: "center", row: "A", number: i + 1,
        label: `A${i + 1}`, position: { x: i, y: 0 }, status: "held", holdToken,
        heldByUserId: user._id, holdExpiresAt: new Date(now + 600000)
    })));
    return { eventId, seats, holdToken, payload: { eventId: String(eventId),
        seatIds: seats.map(s => String(s._id)), holdToken } };
};
const request = async (path, body) => {
    const res = await fetch(base + path, { method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", ...(body ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: res.status, body: await res.json() };
};

test("concurrent checkout creation returns one invoice and preserves account security/profile version", async () => {
    const f = await fixture(2), initial = await User.findById(user._id).lean();
    const results = await Promise.all(Array.from({ length: 12 }, () => createBooking(f.payload, user.id)));
    assert.equal(new Set(results.map(b => String(b._id))).size, 1);
    assert.equal(await Booking.countDocuments({ eventId: f.eventId }), 1);
    assert.equal(await Seat.countDocuments({ eventId: f.eventId, status: "held" }), 2);
    const current = await User.findById(user._id).lean();
    assert.equal(current.authVersion, initial.authVersion);
    assert.equal(current.updatedAt.getTime(), initial.updatedAt.getTime());
    assert.equal(results[0].totalAmount, 20000);
});

test("competing checkout holds for one account cannot create two pending invoices", async () => {
    const f = await fixture(2), otherToken = `${f.holdToken}-other`;
    await Seat.updateOne({ _id: f.seats[1]._id }, { $set: { holdToken: otherToken } });
    const results = await Promise.allSettled([
        createBooking({ ...f.payload, seatIds: [String(f.seats[0]._id)] }, user.id),
        createBooking({ ...f.payload, seatIds: [String(f.seats[1]._id)], holdToken: otherToken }, user.id)
    ]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(results.find(r => r.status === "rejected").reason.message, "ACTIVE_BOOKING_EXISTS");
    assert.equal(await Booking.countDocuments({ eventId: f.eventId, status: "pending_payment" }), 1);
    assert.equal(await Seat.countDocuments({ eventId: f.eventId, status: "held" }), 1);
});

test("failed invoice insert rolls back the account and seat checkout claims", async () => {
    const f = await fixture(), original = Booking.create;
    const initial = await User.findById(user._id).lean(), seatBefore = await Seat.findById(f.seats[0]._id).lean();
    Booking.create = async () => { throw new Error("QA_INSERT_FAILURE"); };
    try { await assert.rejects(createBooking(f.payload, user.id), /QA_INSERT_FAILURE/); }
    finally { Booking.create = original; }
    assert.equal(await Booking.countDocuments({ eventId: f.eventId }), 0);
    assert.equal((await User.findById(user._id).lean()).__v, initial.__v);
    assert.equal((await Seat.findById(f.seats[0]._id).lean()).__v, seatBefore.__v);
});

test("a released seat observed during checkout cannot produce a payable orphan invoice", async () => {
    const f = await fixture(), original = Seat.updateMany;
    let released = false;
    Seat.updateMany = async function(filter, changes, options) {
        if (!released && changes?.$inc?.__v && options?.session) {
            released = true;
            await Seat.updateOne({ _id: f.seats[0]._id }, { $set: {
                status: "available", holdToken: null, heldByUserId: null, holdExpiresAt: null
            } });
        }
        return original.call(this, filter, changes, options);
    };
    try { await assert.rejects(createBooking(f.payload, user.id), /BOOKING_SEAT_HOLD_INVALID/); }
    finally { Seat.updateMany = original; }
    assert.ok(released);
    assert.equal(await Booking.countDocuments({ eventId: f.eventId }), 0);
    assert.equal((await Seat.findById(f.seats[0]._id)).status, "available");
});

test("Back/release racing invoice insertion cancels the new order before freeing its seats", async () => {
    const f = await fixture(), original = Booking.create;
    let release;
    Booking.create = async function(...args) {
        release ||= releaseHeldSeats(f.eventId, f.payload.seatIds, user.id, f.holdToken);
        return original.apply(this, args);
    };
    let created;
    try {
        created = await createBooking(f.payload, user.id);
        const released = await release;
        assert.equal(released.bookingCancelled, true);
        assert.equal(released.cancelledBookingCode, created.bookingCode);
    } finally { Booking.create = original; }
    assert.equal((await Booking.findById(created._id)).status, "cancelled");
    assert.equal((await Seat.findById(f.seats[0]._id)).status, "available");
});

test("seat holds enforce published sale window and availability before changing seats", async () => {
    const f = await fixture();
    await Seat.updateMany({ eventId: f.eventId }, { $set: { status: "available", holdToken: null, heldByUserId: null, holdExpiresAt: null } });
    const cases = [
        [{ status: "draft" }, 409, "EVENT_BOOKING_NOT_ALLOWED"],
        [{ status: "cancelled" }, 409, "EVENT_BOOKING_NOT_ALLOWED"],
        [{ status: "completed" }, 409, "EVENT_BOOKING_NOT_ALLOWED"],
        [{ status: "sold_out" }, 409, "EVENT_SOLD_OUT"],
        [{ allowBooking: false }, 409, "EVENT_BOOKING_NOT_ALLOWED"],
        [{ bookingOpenAt: new Date(Date.now() + 60000) }, 409, "EVENT_BOOKING_NOT_OPEN"],
        [{ bookingCloseAt: new Date(Date.now() - 60000) }, 409, "EVENT_BOOKING_CLOSED"],
        [{ startAt: new Date(Date.now() - 60000) }, 409, "EVENT_BOOKING_CLOSED"],
        [{ deletedAt: new Date() }, 404, undefined]
    ];
    for (const [changes, status, code] of cases) {
        await Event.updateOne({ _id: f.eventId }, { $set: { status: "published", deletedAt: null,
            allowBooking: true, bookingOpenAt: new Date(Date.now() - 60000),
            bookingCloseAt: new Date(Date.now() + 3600000), startAt: new Date(Date.now() + 7200000), ...changes } });
        const response = await request("/seats/hold", f.payload);
        assert.equal(response.status, status, JSON.stringify(changes));
        assert.equal(response.body.code, code);
        assert.equal((await Seat.findById(f.seats[0]._id)).status, "available");
    }
    await Event.updateOne({ _id: f.eventId }, { $set: { deletedAt: null } });
    const held = await holdSeats(f.eventId, f.payload.seatIds, user.id);
    assert.equal(held.seats.length, 1);
});

test("public seat endpoints hide unpublished/archived events and sale ownership", async () => {
    const f = await fixture(), soldBookingId = oid();
    await Seat.updateOne({ _id: f.seats[0]._id }, { $set: { status: "sold", soldBookingId,
        saleClaimToken: "qa-sale-secret", blockedReason: "qa-internal" } });
    const paths = [`/events/${f.eventId}/seats`, `/events/${f.eventId}/seats/summary`,
        `/events/${f.eventId}/seats/available`, `/events/${f.eventId}/seats/position?section=center&row=A&number=1`,
        `/seats/${f.seats[0]._id}`];
    for (const state of [{ status: "draft" }, { status: "sold_out" }, { status: "published", deletedAt: new Date() }]) {
        await Event.updateOne({ _id: f.eventId }, { $set: state });
        for (const path of paths) assert.equal((await request(path)).status, 404, path);
    }
    await Event.updateOne({ _id: f.eventId }, { $set: { status: "published", deletedAt: null } });
    const response = await request(paths[0]);
    assert.equal(response.status, 200);
    const text = JSON.stringify(response.body);
    for (const field of ["soldBookingId", "saleClaimToken", "holdToken", "heldByUserId", "blockedReason"])
        assert.equal(text.includes(`"${field}"`), false, field);
    for (const path of paths.slice(1)) assert.equal((await request(path)).status, 200, path);
});

test("admin category editing cannot change a seat after a concurrent customer hold", async () => {
    const f = await fixture(), newCategory = oid();
    await Seat.updateOne({ _id: f.seats[0]._id }, { $set: { status: "available", holdToken: null,
        heldByUserId: null, holdExpiresAt: null } });
    await Event.updateOne({ _id: f.eventId }, { $push: { ticketCategories: {
        _id: newCategory, code: "OTHER", name: "Other", price: 20000, isActive: true, maxPerOrder: 274
    } } });
    const original = Seat.findOneAndUpdate;
    let raced = false;
    Seat.findOneAndUpdate = async function(filter, changes, options) {
        if (changes?.$set?.ticketCategoryId && !raced) {
            raced = true;
            await holdSeats(f.eventId, f.payload.seatIds, user.id);
        }
        return original.call(this, filter, changes, options);
    };
    try { await assert.rejects(updateSeatCategory(String(f.seats[0]._id), String(newCategory)), /SEAT_CATEGORY_CHANGE_NOT_ALLOWED/); }
    finally { Seat.findOneAndUpdate = original; }
    const current = await Seat.findById(f.seats[0]._id);
    assert.ok(raced);
    assert.equal(current.status, "held");
    assert.equal(String(current.ticketCategoryId), String(f.seats[0].ticketCategoryId));
});

test("a failed batch hold racing checkout never releases seats from a committed invoice", async () => {
    const f = await fixture(3), original = Seat.findOneAndUpdate;
    await Seat.updateOne({ _id: f.seats[1]._id }, { $set: { status: "available", holdToken: null,
        heldByUserId: null, holdExpiresAt: null } });
    await Seat.updateOne({ _id: f.seats[2]._id }, { $set: { status: "blocked", holdToken: null,
        heldByUserId: null, holdExpiresAt: null } });
    let checkout, raced = false;
    Seat.findOneAndUpdate = async function(filter, changes, options) {
        const result = await original.call(this, filter, changes, options);
        if (!raced && result && String(filter._id) === String(f.seats[1]._id) && changes?.$set?.status === "held") {
            raced = true;
            checkout = createBooking({ ...f.payload, seatIds: [String(f.seats[1]._id)] }, user.id);
            checkout.catch(() => {});
            // Allow the rival checkout to contend while this batch holds the
            // account lock, then attempt the blocked final seat and roll back.
            await Promise.race([checkout.catch(() => {}), new Promise(resolve => setTimeout(resolve, 100))]);
        }
        return result;
    };
    try {
        await assert.rejects(holdSeats(f.eventId, [String(f.seats[1]._id), String(f.seats[2]._id)], user.id, f.holdToken), /SEAT_NOT_AVAILABLE/);
        await assert.rejects(checkout, /BOOKING_SEAT_HOLD_INVALID/);
    } finally { Seat.findOneAndUpdate = original; }
    assert.ok(raced);
    assert.equal(await Booking.countDocuments({ eventId: f.eventId }), 0);
    assert.equal((await Seat.findById(f.seats[0]._id)).status, "held");
    assert.equal((await Seat.findById(f.seats[1]._id)).status, "available");
});

test("canonical hold repair preserves an existing invoice token and frozen deadline", async () => {
    const f = await fixture(2);
    const created = await createBooking({ ...f.payload, seatIds: [String(f.seats[0]._id)] }, user.id);
    // Simulate legacy split state, including a token with an earlier deadline.
    await Seat.updateOne({ _id: f.seats[1]._id }, { $set: { holdToken: "legacy-earlier-token",
        holdExpiresAt: new Date(created.holdExpiresAt.getTime() - 60000) } });
    const state = await getActiveHoldSession(f.eventId, user.id);
    assert.equal(state.holdToken, created.holdToken);
    assert.equal(state.holdExpiresAt.getTime(), created.holdExpiresAt.getTime());
    for (const seat of await Seat.find({ eventId: f.eventId })) {
        assert.equal(seat.holdToken, created.holdToken);
        assert.equal(seat.holdExpiresAt.getTime(), created.holdExpiresAt.getTime());
    }
    assert.equal((await Booking.findById(created._id)).status, "pending_payment");
});

test("cancel and immediate checkout cannot leave a new invoice with released seats", async () => {
    const f = await fixture(), original = Booking.findOneAndUpdate;
    const created = await createBooking(f.payload, user.id);
    let checkout, raced = false;
    Booking.findOneAndUpdate = async function(filter, changes, options) {
        const result = await original.call(this, filter, changes, options);
        if (!raced && changes?.$set?.status === "cancelled") {
            raced = true;
            checkout = createBooking(f.payload, user.id);
            checkout.catch(() => {});
            await Promise.race([checkout.catch(() => {}), new Promise(resolve => setTimeout(resolve, 100))]);
        }
        return result;
    };
    try {
        await cancelBooking(created.bookingCode, user.id);
        await assert.rejects(checkout, /BOOKING_SEAT_HOLD_INVALID/);
    } finally { Booking.findOneAndUpdate = original; }
    assert.ok(raced);
    assert.equal(await Booking.countDocuments({ eventId: f.eventId }), 1);
    assert.equal((await Booking.findById(created._id)).status, "cancelled");
    assert.equal((await Seat.findById(f.seats[0]._id)).status, "available");
});

test("rejected checkout cleanup cannot release a later invoice reusing that hold", async () => {
    const f = await fixture(2), original = Seat.updateMany;
    const winnerToken = `${f.holdToken}-winner`;
    await Seat.updateOne({ _id: f.seats[1]._id }, { $set: { holdToken: winnerToken } });
    const winner = await createBooking({ ...f.payload, holdToken: winnerToken,
        seatIds: [String(f.seats[1]._id)] }, user.id);
    const retryPayload = { ...f.payload, seatIds: [String(f.seats[0]._id)] };
    let retry, raced = false;
    Seat.updateMany = async function(filter, changes, options) {
        if (!raced && filter.holdToken === f.holdToken && changes?.$set?.status === "available") {
            raced = true;
            retry = cancelBooking(winner.bookingCode, user.id).then(() => createBooking(retryPayload, user.id));
            retry.catch(() => {});
            await Promise.race([retry.catch(() => {}), new Promise(resolve => setTimeout(resolve, 100))]);
        }
        return original.call(this, filter, changes, options);
    };
    try {
        await assert.rejects(createBooking(retryPayload, user.id), /ACTIVE_BOOKING_EXISTS/);
        await assert.rejects(retry, /BOOKING_SEAT_HOLD_INVALID/);
    } finally { Seat.updateMany = original; }
    assert.ok(raced);
    assert.equal(await Booking.countDocuments({ eventId: f.eventId }), 1);
    assert.equal(await Seat.countDocuments({ eventId: f.eventId, status: "held" }), 0);
});

test("legacy orphan cleanup cannot release seats of a concurrently created invoice", async () => {
    const f = await fixture(2), original = Seat.updateMany;
    const created = await createBooking(f.payload, user.id);
    // The old release implementation could leave one seat free while its
    // invoice stayed pending. A customer retries checkout on the remaining seat.
    await Seat.updateOne({ _id: f.seats[1]._id }, { $set: {
        status: "available", holdToken: null, heldByUserId: null, holdExpiresAt: null
    } });
    let retry, raced = false;
    Seat.updateMany = async function(filter, changes, options) {
        if (!raced && filter.holdToken === f.holdToken && changes?.$set?.status === "available") {
            raced = true;
            retry = createBooking({ ...f.payload, seatIds: [String(f.seats[0]._id)] }, user.id);
            retry.catch(() => {});
            await Promise.race([retry.catch(() => {}), new Promise(resolve => setTimeout(resolve, 100))]);
        }
        return original.call(this, filter, changes, options);
    };
    try {
        assert.equal(await getActiveBookingByEvent(f.eventId, user.id), null);
        await assert.rejects(retry, /BOOKING_SEAT_HOLD_INVALID/);
    } finally { Seat.updateMany = original; }
    assert.ok(raced);
    assert.equal(await Booking.countDocuments({ eventId: f.eventId }), 1);
    assert.equal((await Booking.findById(created._id)).status, "cancelled");
    assert.equal(await Seat.countDocuments({ eventId: f.eventId, status: "available" }), 2);
});

test("seat hold rechecks the sale boundary after waiting for its account claim", async () => {
    const f = await fixture(), original = User.updateOne;
    await Seat.updateOne({ _id: f.seats[0]._id }, { $set: {
        status: "available", holdToken: null, heldByUserId: null, holdExpiresAt: null
    } });
    let closed = false;
    User.updateOne = async function(filter, changes, options) {
        if (!closed && changes?.$inc?.__v && options?.session) {
            closed = true;
            await Event.updateOne({ _id: f.eventId }, { $set: { allowBooking: false } });
        }
        return original.call(this, filter, changes, options);
    };
    try { await assert.rejects(holdSeats(f.eventId, f.payload.seatIds, user.id), /EVENT_BOOKING_NOT_ALLOWED/); }
    finally { User.updateOne = original; }
    assert.ok(closed);
    assert.equal((await Seat.findById(f.seats[0]._id)).status, "available");
});

test("admin cancellation permits unavailable owners while customer cancellation remains protected", async () => {
    const admin = await User.create({ username: "bookingsecurityadmin", fullName: "Admin QA",
        email: "booking-security-admin@example.test", password: "qa-not-used", role: "admin", isActive: true });
    const adminToken = generateAccessToken(admin);
    for (const ownerState of [{ isBlocked: true }, { isActive: false }, { deletedAt: new Date() }]) {
        const f = await fixture(), created = await createBooking(f.payload, user.id);
        try {
            await User.updateOne({ _id: user._id }, { $set: ownerState });
            await assert.rejects(cancelBooking(created.bookingCode, user.id), /USER_INACTIVE/);
            assert.equal((await Booking.findById(created._id)).status, "pending_payment");
            const response = await fetch(`${base}/admin/bookings/${created._id}/cancel`, {
                method: "POST", headers: { Authorization: `Bearer ${adminToken}` }
            });
            assert.equal(response.status, 200, JSON.stringify(ownerState));
            assert.equal((await Booking.findById(created._id)).status, "cancelled");
            assert.equal((await Seat.findById(f.seats[0]._id)).status, "available");
        } finally {
            await User.updateOne({ _id: user._id }, { $set: { isBlocked: false, isActive: true, deletedAt: null } });
        }
    }
});

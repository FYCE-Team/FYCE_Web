import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Event from "../src/models/Event.js";
import HeroSection from "../src/models/HeroSection.js";
import { generateAccessToken } from "../src/utils/token.js";

let server, base, admin, event, hero;
before(async () => {
  process.env.JWT_ACCESS_SECRET = "isolated-public-security-test-only";
  process.env.JWT_ACCESS_EXPIRES = "1h";
  await mongoose.connect("mongodb://127.0.0.1:27028/fyce_public_security_test", { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();
  await Promise.all([User.init(), Event.init(), HeroSection.init()]);
  admin = await User.create({ username: "private_author", fullName: "Private admin identity", email: "private-author@example.test", password: "unused", role: "admin", isActive: true });
  const now = Date.now();
  event = await Event.create({ title: "Public concert", slug: "public-concert", venue: "QA hall", status: "published", allowBooking: false, isFeatured: true, createdBy: admin._id, updatedBy: admin._id, startAt: new Date(now + 86400000), endAt: new Date(now + 93600000), bookingOpenAt: new Date(now + 60000), bookingCloseAt: new Date(now + 80000000) });
  hero = await HeroSection.create({ title: "Public hero", isActive: true, featuredEvent: event._id, createdBy: admin._id, updatedBy: admin._id });
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const read = async (path, token) => {
  const response = await fetch(base + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  assert.equal(response.status, 200, path);
  return response.json();
};
const assertNoAuthor = value => {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!["createdBy", "updatedBy", "deletedBy"].includes(key), `Public author field: ${key}`);
    assertNoAuthor(child);
  }
};

test("public event discovery and homepage never disclose author identity or internal author IDs", async () => {
  for (const path of ["/events", "/events/upcoming", "/events/featured", "/events/public-concert", "/hero", "/homepage"]) {
    const body = await read(path);
    assertNoAuthor(body);
    const serialized = JSON.stringify(body);
    for (const secret of [admin.email, admin.fullName, admin.username]) assert.equal(serialized.includes(secret), false, path);
  }
  // Administrative editing retains the author data it needs behind authentication.
  const body = await read(`/events/admin/${event._id}`, generateAccessToken(admin));
  assert.ok(JSON.stringify(body).includes(admin.email));
});

test("a published hero cannot disclose a draft or archived featured concert", async () => {
  const draft = await Event.create({ title: "Unannounced private concert", slug: "unannounced-private", venue: "QA", status: "draft", allowBooking: false, createdBy: admin._id });
  await HeroSection.updateOne({ _id: hero._id }, { $set: { featuredEvent: draft._id } });
  for (const path of ["/hero", "/homepage"]) assert.equal(JSON.stringify(await read(path)).includes(draft.title), false);
  await Event.updateOne({ _id: draft._id }, { $set: { status: "published", deletedAt: new Date() } });
  for (const path of ["/hero", "/homepage"]) assert.equal(JSON.stringify(await read(path)).includes(draft.title), false);
});

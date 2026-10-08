import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { connect } from "node:net";
import { createRequestAdmission } from "../src/middleware/loadProtection.middleware.js";
import { createHttpServer } from "../src/config/httpServer.js";
import { singleFlight } from "../src/utils/singleFlight.js";
import { authenticateToken } from "../src/middleware/auth.middleware.js";
import { errorHandler } from "../src/middleware/error.middleware.js";
import { generateAccessToken } from "../src/utils/token.js";
import User from "../src/models/User.js";

test("busy requests do not exhaust webhook/health capacity; finished and aborted requests release slots", async () => {
  const app = express();
  app.use(createRequestAdmission({ general: 1, upload: 1, webhook: 1 }));
  let entered, release;
  app.get("/hold", (_req, res) => { release = () => res.json({ ok: true }); entered?.(); });
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.post("/api/payments/sepay-webhook", (_req, res) => res.json({ ok: true }));
  app.post("/upload", (_req, res) => res.json({ ok: true }));
  const server = createHttpServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    let ready = new Promise(resolve => { entered = resolve; });
    const held = fetch(`${base}/hold`);
    await ready;
    const busy = await fetch(`${base}/hold`);
    assert.equal(busy.status, 503);
    assert.equal(busy.headers.get("retry-after"), "2");
    assert.equal((await busy.json()).code, "SERVER_BUSY");
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    assert.equal((await fetch(`${base}/api/payments/sepay-webhook`, { method: "POST" })).status, 200);
    assert.equal((await fetch(`${base}/upload`, { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=qa" }, body: "--qa--\r\n" })).status, 200);
    release(); assert.equal((await held).status, 200);
    const controller = new AbortController();
    ready = new Promise(resolve => { entered = resolve; });
    const aborted = fetch(`${base}/hold`, { signal: controller.signal });
    await ready;
    controller.abort(); await assert.rejects(aborted, { name: "AbortError" });
    // Give the server-side close event a turn, then prove the released slot accepts work.
    await new Promise(resolve => setTimeout(resolve, 30));
    ready = new Promise(resolve => { entered = resolve; });
    const retry = fetch(`${base}/hold`); await ready; release();
    assert.equal((await retry).status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test("single-flight coalesces 1000 reads, retains no result, and recovers after failure", async () => {
  let calls = 0, finish;
  const read = singleFlight(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const batch = Array.from({ length: 1000 }, () => read());
  await Promise.resolve(); assert.equal(calls, 1);
  finish({ version: 1 }); assert.equal((await Promise.all(batch)).length, 1000);
  const next = read(); await Promise.resolve(); assert.equal(calls, 2);
  finish({ version: 2 }); assert.equal((await next).version, 2);
  let attempts = 0;
  const unstable = singleFlight(() => { if (++attempts === 1) throw new Error("QA_FAIL"); return "recovered"; });
  await assert.rejects(unstable(), /QA_FAIL/);
  assert.equal(await unstable(), "recovered");
});

test("database pressure fails closed with retryable 503 instead of invalidating an authenticated session", async () => {
  const previousSecret = process.env.JWT_ACCESS_SECRET;
  const previousExpiry = process.env.JWT_ACCESS_EXPIRES;
  const originalFind = User.findById;
  process.env.JWT_ACCESS_SECRET = "isolated-transient-db-test";
  process.env.JWT_ACCESS_EXPIRES = "1h";
  const token = generateAccessToken({ _id: "000000000000000000000001", role: "user" });
  User.findById = () => ({ select: () => ({ lean: async () => { throw Object.assign(new Error("QA pool saturated"), { name: "MongoWaitQueueTimeoutError" }); } }) });
  const app = express();
  app.get("/api/auth/me", authenticateToken, (_req, res) => res.json({ success: true }));
  app.use(errorHandler);
  const server = createHttpServer(app);
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "2");
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal((await response.json()).code, "DATABASE_BUSY");
  } finally {
    User.findById = originalFind;
    if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = previousSecret;
    if (previousExpiry === undefined) delete process.env.JWT_ACCESS_EXPIRES; else process.env.JWT_ACCESS_EXPIRES = previousExpiry;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});

test("HTTP factory bounds incomplete headers and preserves streaming responses", async () => {
  const server = createHttpServer((_req, res) => res.end("ok"));
  assert.equal(server.headersTimeout, 15000);
  assert.equal(server.requestTimeout, 120000);
  assert.equal(server.keepAliveTimeout, 5000);
  assert.equal(server.timeout, 0); // No arbitrary timer that cuts an active trailer stream.
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const result = await new Promise((resolve, reject) => {
      const socket = connect(server.address().port, "127.0.0.1");
      let received = "";
      socket.setTimeout(18000, () => socket.destroy(new Error("Slow-header timeout did not fire")));
      socket.on("connect", () => socket.write("GET /api/health HTTP/1.1\r\nHost: localhost\r\n"));
      socket.on("data", chunk => { received += chunk; });
      socket.on("error", reject);
      socket.on("close", () => resolve(received));
    });
    assert.match(result, /408 Request Timeout/);
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});

// Isolated local QA only. No configurable target, .env, provider keys or application DB.
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";

const fixtureUri = "mongodb://127.0.0.1:27028/fyce_load_test";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

if (process.argv.includes("--fixture-server")) {
  // Override inherited configuration before loading application modules. Never load server.js/dotenv/workers.
  process.env.NODE_ENV = "test";
  process.env.MONGO_URI = fixtureUri;
  process.env.JWT_ACCESS_SECRET = "isolated-load-fixture-only-not-production";
  process.env.JWT_ACCESS_EXPIRES = "1h";
  process.env.CLIENT_URL = "http://localhost:5173";
  const { default: mongoose } = await import("mongoose");
  const { default: connectDB } = await import("../src/config/db.js");
  const { default: User } = await import("../src/models/User.js");
  const { default: Event } = await import("../src/models/Event.js");
  const { default: Seat } = await import("../src/models/Seat.js");
  const { default: Gallery } = await import("../src/models/Gallery.js");
  await connectDB();
  if (mongoose.connection.name !== "fyce_load_test") throw new Error("Unsafe fixture database");
  await mongoose.connection.dropDatabase();
  await Promise.all([User.init(), Event.init(), Seat.init(), Gallery.init()]);
  const user = await User.create({ username: "loadfixture", fullName: "QA load user", email: "load@example.test", password: "unused-fixture-password", isActive: true });
  const event = await Event.create({ title: "Isolated QA concert", slug: "load-fixture", venue: "QA Hall", status: "published", allowBooking: false, createdBy: user._id, startAt: new Date(Date.now() + 86400000), endAt: new Date(Date.now() + 93600000), bookingOpenAt: new Date(Date.now() + 60000), bookingCloseAt: new Date(Date.now() + 80000000), totalTickets: 274, ticketCategories: [{ code: "QA", name: "QA", price: 10000 }] });
  await Seat.insertMany(Array.from({ length: 274 }, (_, i) => ({ eventId: event._id, ticketCategoryId: event.ticketCategories[0]._id, section: "center", row: "A", number: i + 1, label: `A${i + 1}`, position: { x: i % 20 * 40, y: Math.floor(i / 20) * 40 } })));
  await Gallery.insertMany(Array.from({ length: 40 }, (_, i) => ({ title: `QA image ${i}`, image: `/qa-no-binary-${i}.jpg`, sortOrder: i, createdBy: user._id })));
  const { generateAccessToken } = await import("../src/utils/token.js");
  const { default: app } = await import("../src/app.js");
  const { createHttpServer } = await import("../src/config/httpServer.js");
  const server = createHttpServer(app);
  server.maxRequestsPerSocket = 1000;
  await new Promise(resolve => server.listen({ port: 0, host: "127.0.0.1", backlog: 2048 }, resolve));
  const delay = monitorEventLoopDelay({ resolution: 20 });
  delay.enable();
  let peakRss = process.memoryUsage().rss;
  const sample = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 50);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    clearInterval(sample);
    delay.disable();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await mongoose.connection.dropDatabase(); // Fixed disposable DB only.
    await mongoose.disconnect();
    if (process.connected) process.disconnect();
  };
  process.once("disconnect", () => { void stop(); });
  process.once("SIGTERM", () => { void stop(); });
  process.send({ type: "ready", port: server.address().port, eventId: String(event._id), token: generateAccessToken(user) });
  process.on("message", async message => {
    if (message === "metrics") {
      process.send({ type: "metrics", peakRssMiB: +(peakRss / 1024 / 1024).toFixed(1), rssMiB: +(process.memoryUsage().rss / 1024 / 1024).toFixed(1), eventLoopP99Ms: +(delay.percentile(99) / 1e6).toFixed(1), eventLoopMaxMs: +(delay.max / 1e6).toFixed(1) });
      peakRss = process.memoryUsage().rss;
      delay.reset();
    }
    if (message === "stop") {
      await stop();
    }
  });
} else {
  const child = fork(fileURLToPath(import.meta.url), ["--fixture-server"], {
    env: { PATH: process.env.PATH }, stdio: ["ignore", "ignore", "inherit", "ipc"]
  });
  const receive = type => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error(`Fixture ${type} timed out`)); }, 30000);
    const onExit = () => { cleanup(); reject(new Error("Fixture server exited")); };
    const onMessage = message => { if (message.type === type) { cleanup(); resolve(message); } };
    const cleanup = () => { clearTimeout(timeout); child.off("message", onMessage); child.off("exit", onExit); };
    child.on("message", onMessage);
    child.once("exit", onExit);
  });
  const percentile = (values, fraction) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))].toFixed(1);
  };
  try {
    const fixture = await receive("ready");
    const base = `http://127.0.0.1:${fixture.port}`;
    const paths = ["/api/homepage", "/api/events", "/api/events/load-fixture", `/api/events/${fixture.eventId}/seats`, "/api/auth/me"];
    const phase = async ({ name, total, concurrency, paced = false, abort = false, homepage = false }) => {
      let next = 0, networkErrors = 0, clientAborts = 0, bytes = 0, maxOutstanding = 0, outstanding = 0;
      const statuses = {}, networkErrorsByCode = {}, latency = [], successLatency = [];
      const start = performance.now();
      await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
        if (paced) await pause(worker * 5);
        let iterations = 0;
        while (paced ? iterations < total / concurrency : next < total) {
          iterations++;
          const index = next++, path = homepage ? paths[0] : paths[index % paths.length];
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), abort ? 2 : 15000);
          const began = performance.now();
          outstanding++;
          maxOutstanding = Math.max(maxOutstanding, outstanding);
          try {
            const response = await fetch(base + path, { signal: controller.signal, headers: path === "/api/auth/me" ? { Authorization: `Bearer ${fixture.token}` } : {} });
            const body = await response.arrayBuffer();
            bytes += body.byteLength;
            statuses[response.status] = (statuses[response.status] || 0) + 1;
            const elapsed = performance.now() - began;
            latency.push(elapsed);
            if (response.status === 200) successLatency.push(elapsed);
          } catch (error) {
            if (abort && error.name === "AbortError") clientAborts++;
            else {
              networkErrors++;
              const code = error.cause?.code || error.name;
              networkErrorsByCode[code] = (networkErrorsByCode[code] || 0) + 1;
            }
          } finally { clearTimeout(timer); outstanding--; }
          if (paced) await pause(1000);
        }
      }));
      await pause(300);
      const metricsPromise = receive("metrics");
      child.send("metrics");
      const metrics = await metricsPromise;
      const seconds = (performance.now() - start) / 1000;
      const recovery = await fetch(base + "/api/homepage");
      const body = await recovery.json();
      const healthy = recovery.status === 200 && body.success === true;
      const result = { name, total, concurrency, maxOutstanding, seconds: +seconds.toFixed(2), requestsPerSecond: +(total / seconds).toFixed(1), statuses, networkErrors, networkErrorsByCode, clientAborts, receivedMiB: +(bytes / 1024 / 1024).toFixed(1), latencyMs: { p50: percentile(latency, .5), p95: percentile(latency, .95), p99: percentile(latency, .99), successfulP95: percentile(successLatency, .95) }, ...metrics, recoveryHomepage200: healthy };
      console.log(JSON.stringify(result));
      return result;
    };
    const results = [];
    results.push(await phase({ name: "homepage-reload", total: 1000, concurrency: 25, homepage: true }));
    results.push(await phase({ name: "mixed-burst-100", total: 2000, concurrency: 100 }));
    results.push(await phase({ name: "mixed-burst-1000", total: 10000, concurrency: 1000 }));
    results.push(await phase({ name: "paced-1000-workers", total: 3000, concurrency: 1000, paced: true }));
    results.push(await phase({ name: "reload-abort", total: 500, concurrency: 100, abort: true }));
    const stabilityRecovered = results.every(result => result.recoveryHomepage200);
    const capacityAllRequestsSucceeded = results.filter(result => result.name !== "reload-abort").every(result => result.statuses[200] === result.total && result.networkErrors === 0);
    const report = { date: new Date().toISOString(), scope: "Loopback API + separate child Node process + local MongoDB replica. No production/CDN/providers/browser rendering. 10000 total burst requests, not 10000 concurrent users.", fixtureDatabase: "fyce_load_test", stabilityRecovered, capacityAllRequestsSucceeded, environment: { node: process.version, platform: os.platform(), cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, memoryGiB: +(os.totalmem() / 1024 ** 3).toFixed(1) }, defaults: { generalInFlight: 80, webhookInFlight: 16, multipartInFlight: 2, mongoPool: 20 }, results };
    await writeFile("/tmp/fyce-security-load-results.json", JSON.stringify(report, null, 2) + "\n");
    if (!stabilityRecovered || !capacityAllRequestsSucceeded || results.some(result => result.networkErrors || Object.keys(result.statuses).some(code => code !== "200"))) throw new Error("Load capacity acceptance failed; inspect saved report");
  } finally {
    if (child.connected) {
      child.send("stop");
      await new Promise(resolve => {
        const deadline = setTimeout(resolve, 10000);
        child.once("exit", () => { clearTimeout(deadline); resolve(); });
      });
    }
    if (child.exitCode === null) child.kill("SIGTERM");
  }
}

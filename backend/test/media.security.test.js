import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Readable } from "node:stream";
import mongoose from "mongoose";
import QRCode from "qrcode";
import app from "../src/app.js";
import User from "../src/models/User.js";
import { generateAccessToken } from "../src/utils/token.js";
import { updateAvatar } from "../src/services/profile.service.js";
import { uploadImageBuffer, uploadImageFileStream } from "../src/services/image.service.js";
import { uploadVideoFileStream } from "../src/services/video.service.js";
import { streamImageFile } from "../src/controllers/image.controller.js";
import { streamVideoFile } from "../src/controllers/video.controller.js";

let server, base, png, sequence = 0;
const db = () => mongoose.connection.db;
const member = (values = {}) => User.create({ username: `mediaqa${++sequence}`, fullName: "Media QA", email: `media${sequence}@example.test`, password: "unused-qa-password", isActive: true, ...values });
const imageFile = () => ({ buffer: png, size: png.length, mimetype: "image/png" });
const postForm = (path, user, form) => fetch(`${base}${path}`, { method: "POST", headers: { Authorization: `Bearer ${generateAccessToken(user)}` }, body: form });

before(async () => {
    process.env.NODE_ENV = "test";
    process.env.CLIENT_URL = "https://fyce-qa.example.test";
    process.env.JWT_ACCESS_SECRET = "media-security-test-only-not-production";
    process.env.JWT_ACCESS_EXPIRES = "1h";
    // Fixed isolated database; no .env, real media, email, or provider calls.
    await mongoose.connect("mongodb://127.0.0.1:27028/fyce_media_security_test", { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.dropDatabase();
    await User.init();
    png = await QRCode.toBuffer("isolated-media-security-qa");
    server = await new Promise(resolve => { const value = app.listen(0, "127.0.0.1", () => resolve(value)); });
    base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (mongoose.connection.name === "fyce_media_security_test") await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

test("avatar and video multipart reject excess fields and oversized text before storage", async () => {
    const user = await member();
    const admin = await member({ role: "admin" });
    const beforeFiles = await db().collection("images.files").countDocuments();
    for (const [path, actor] of [["/auth/me/avatar", user], ["/videos/upload", admin]]) {
        const excess = new FormData();
        for (let i = 0; i < 6; i++) excess.append(`field${i}`, "x");
        assert.equal((await postForm(path, actor, excess)).status, 400);
        const large = new FormData();
        large.append("field", "x".repeat(16 * 1024 + 1));
        assert.equal((await postForm(path, actor, large)).status, 400);
    }
    assert.equal(await db().collection("images.files").countDocuments(), beforeFiles);
    assert.equal(await db().collection("videos.files").countDocuments(), 0);
});

test("avatar upload throttling is per authenticated account and runs before parsing", async () => {
    const user = await member();
    for (let i = 0; i < 6; i++) {
        const form = new FormData();
        form.append("image", new Blob(["not-a-png-image"], { type: "image/png" }), "fake.png");
        const result = await postForm("/auth/me/avatar", user, form);
        assert.equal(result.status, i < 5 ? 400 : 429);
    }
    const other = await member();
    const form = new FormData();
    form.append("image", new Blob([png], { type: "image/png" }), "valid.png");
    assert.equal((await postForm("/auth/me/avatar", other, form)).status, 200);
    assert.equal((await User.findById(other._id).lean()).avatarStorageBytes, undefined);
});

test("image HEAD returns metadata without opening a GridFS download", async () => {
    const stored = await uploadImageBuffer({ buffer: png, originalName: "head-qa.png", mimeType: "image/png" });
    const prototype = mongoose.mongo.GridFSBucket.prototype;
    const original = prototype.openDownloadStream;
    let opens = 0;
    prototype.openDownloadStream = function () { opens++; throw new Error("HEAD_MUST_NOT_DOWNLOAD"); };
    try {
        const response = await fetch(`${base}/images/${stored.id}`, { method: "HEAD" });
        assert.equal(response.status, 200);
        assert.equal(Number(response.headers.get("content-length")), png.length);
        assert.equal((await response.arrayBuffer()).byteLength, 0);
        assert.equal(opens, 0);
    } finally { prototype.openDownloadStream = original; }
    const response = await fetch(`${base}/images/${stored.id}`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
});

test("image chunk and finalization failures remove only the failed upload chunks", async () => {
    const prototype = mongoose.mongo.Collection.prototype;
    const original = prototype.insertOne;
    const baseline = await db().collection("images.chunks").countDocuments();
    for (const failureStage of ["chunk", "metadata"]) {
        prototype.insertOne = function (document, options) {
            if ((failureStage === "chunk" && this.collectionName === "images.chunks" && document.n === 1) ||
                (failureStage === "metadata" && this.collectionName === "images.files")) return Promise.reject(new Error("QA_IMAGE_WRITE_FAILURE"));
            return original.call(this, document, options);
        };
        try {
            await assert.rejects(uploadImageBuffer({ buffer: Buffer.alloc(700 * 1024), originalName: `failed-${failureStage}.png`, mimeType: "image/png" }), error => error.message === "QA_IMAGE_WRITE_FAILURE" && error.imageCleanupComplete === true);
        } finally { prototype.insertOne = original; }
        assert.equal(await db().collection("images.files").countDocuments({ filename: `failed-${failureStage}.png` }), 0);
        assert.equal(await db().collection("images.chunks").countDocuments(), baseline);
    }
});

test("an image download failure before bytes returns a complete uncached JSON error", async () => {
    const stored = await uploadImageBuffer({ buffer: png, originalName: "failed-download.png", mimeType: "image/png" });
    const prototype = mongoose.mongo.GridFSBucket.prototype;
    const original = prototype.openDownloadStream;
    prototype.openDownloadStream = () => new Readable({ read() { this.destroy(Object.assign(new Error("QA_DOWNLOAD_FAILURE"), { status: 503 })); } });
    try {
        const response = await fetch(`${base}/images/${stored.id}`, { signal: AbortSignal.timeout(2000) });
        assert.equal(response.status, 503);
        assert.match(response.headers.get("content-type"), /application\/json/);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal((await response.json()).success, false);
    } finally { prototype.openDownloadStream = original; }
});

test("failed image file source cleans already-written chunks", async () => {
    const original = fs.createReadStream;
    const baseline = await db().collection("images.chunks").countDocuments();
    fs.createReadStream = () => Readable.from((async function* () { yield Buffer.alloc(600 * 1024); throw new Error("QA_IMAGE_SOURCE_FAILURE"); })());
    try {
        await assert.rejects(uploadImageFileStream({ filePath: "/tmp/fyce-test-not-a-real-file", originalName: "failed-source.png", mimeType: "image/png" }), /QA_IMAGE_SOURCE_FAILURE/);
    } finally { fs.createReadStream = original; }
    assert.equal(await db().collection("images.files").countDocuments({ filename: "failed-source.png" }), 0);
    assert.equal(await db().collection("images.chunks").countDocuments(), baseline);
});

test("a video range download failure before bytes clears partial-content headers", async () => {
    const id = new mongoose.Types.ObjectId();
    await db().collection("videos.files").insertOne({ _id: id, filename: "qa-stream-error.mp4", length: 1000, chunkSize: 255 * 1024, uploadDate: new Date(), metadata: { contentType: "video/mp4" } });
    const prototype = mongoose.mongo.GridFSBucket.prototype;
    const original = prototype.openDownloadStream;
    prototype.openDownloadStream = () => new Readable({ read() { this.destroy(Object.assign(new Error("QA_VIDEO_DOWNLOAD_FAILURE"), { status: 503 })); } });
    try {
        const response = await fetch(`${base}/videos/${id}`, { headers: { Range: "bytes=0-99" }, signal: AbortSignal.timeout(2000) });
        assert.equal(response.status, 503);
        assert.equal(response.headers.get("content-range"), null);
        assert.equal(response.headers.get("accept-ranges"), null);
        assert.match(response.headers.get("content-type"), /application\/json/);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal((await response.json()).success, false);
    } finally {
        prototype.openDownloadStream = original;
        await db().collection("videos.files").deleteOne({ _id: id });
    }
});

test("synchronous image and video stream setup failures return complete uncached JSON", async () => {
    const image = await uploadImageBuffer({ buffer: png, originalName: "sync-failed-download.png", mimeType: "image/png" });
    const videoId = new mongoose.Types.ObjectId();
    await db().collection("videos.files").insertOne({ _id: videoId, filename: "qa-sync-error.mp4", length: 1000, chunkSize: 255 * 1024, uploadDate: new Date(), metadata: { contentType: "video/mp4" } });
    const prototype = mongoose.mongo.GridFSBucket.prototype;
    const original = prototype.openDownloadStream;
    prototype.openDownloadStream = () => { throw Object.assign(new Error("QA_STREAM_SETUP_FAILURE"), { status: 503 }); };
    try {
        for (const path of [`images/${image.id}`, `videos/${videoId}`]) {
            const response = await fetch(`${base}/${path}`, { headers: { Range: "bytes=0-99" }, signal: AbortSignal.timeout(2000) });
            assert.equal(response.status, 503);
            assert.equal(response.headers.get("content-range"), null);
            assert.equal(response.headers.get("accept-ranges"), null);
            assert.match(response.headers.get("content-type"), /application\/json/);
            assert.equal(response.headers.get("cache-control"), "no-store");
            assert.equal((await response.json()).success, false);
        }
    } finally {
        prototype.openDownloadStream = original;
        await db().collection("videos.files").deleteOne({ _id: videoId });
    }
});

test("disconnect during media metadata lookup never starts a GridFS download", async () => {
    const image = await uploadImageBuffer({ buffer: png, originalName: "aborted-metadata.png", mimeType: "image/png" });
    const videoId = new mongoose.Types.ObjectId();
    await db().collection("videos.files").insertOne({ _id: videoId, filename: "qa-aborted-metadata.mp4", length: 1000, chunkSize: 255 * 1024, uploadDate: new Date(), metadata: { contentType: "video/mp4" } });
    const prototype = mongoose.mongo.GridFSBucket.prototype;
    const originalFind = prototype.find;
    const originalDownload = prototype.openDownloadStream;
    let opens = 0;
    prototype.openDownloadStream = () => { opens++; throw new Error("DISCONNECTED_RESPONSE_MUST_NOT_DOWNLOAD"); };
    try {
        for (const [id, controller] of [[image.id, streamImageFile], [videoId, streamVideoFile]]) {
            let signalLookup, releaseLookup;
            const reached = new Promise(resolve => { signalLookup = resolve; });
            const release = new Promise(resolve => { releaseLookup = resolve; });
            prototype.find = function (...args) {
                const cursor = originalFind.apply(this, args);
                const next = cursor.next.bind(cursor);
                cursor.next = async () => { const file = await next(); signalLookup(); await release; return file; };
                return cursor;
            };
            const response = { destroyed: false, setHeader() { assert.fail("Disconnected response must not send headers"); } };
            let error;
            const request = controller({ params: { id: String(id) }, method: "GET", headers: {} }, response, value => { error = value; });
            await reached;
            response.destroyed = true;
            releaseLookup();
            await request;
            assert.equal(error, undefined);
        }
        assert.equal(opens, 0);
    } finally {
        prototype.find = originalFind;
        prototype.openDownloadStream = originalDownload;
        await db().collection("videos.files").deleteOne({ _id: videoId });
    }
});

test("video chunk and metadata failures clean fully settled uploads without orphan chunks", async () => {
    const prototype = mongoose.mongo.Collection.prototype;
    const originalInsert = prototype.insertOne;
    const originalSource = fs.createReadStream;
    const baseline = await db().collection("videos.chunks").countDocuments();
    fs.createReadStream = () => Readable.from((async function* () { yield Buffer.alloc(2 * 1024 * 1024 + 50); })());
    try {
        for (const failureStage of ["chunk", "metadata"]) {
            prototype.insertOne = function (document, options) {
                if ((failureStage === "chunk" && this.collectionName === "videos.chunks" && document.n === 1) ||
                    (failureStage === "metadata" && this.collectionName === "videos.files")) return Promise.reject(new Error("QA_VIDEO_WRITE_FAILURE"));
                return originalInsert.call(this, document, options);
            };
            await assert.rejects(uploadVideoFileStream({ filePath: "/tmp/fyce-video-qa-not-a-real-file", originalName: `failed-${failureStage}.mp4`, mimeType: "video/mp4" }), /QA_VIDEO_WRITE_FAILURE/);
            assert.equal(await db().collection("videos.files").countDocuments({ filename: `failed-${failureStage}.mp4` }), 0);
            assert.equal(await db().collection("videos.chunks").countDocuments(), baseline);
        }
    } finally {
        prototype.insertOne = originalInsert;
        fs.createReadStream = originalSource;
    }
});

test("avatar count and byte reservations stay bounded under concurrent uploads", async () => {
    const countUser = await member({ avatarStorageCount: 19, avatarStorageBytes: 0 });
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => updateAvatar(countUser._id, imageFile())));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.ok(results.filter(result => result.status === "rejected").every(result => result.reason.status === 409));
    const counted = await User.findById(countUser._id).select("+avatarStorageCount +avatarStorageBytes").lean();
    assert.equal(counted.avatarStorageCount, 20);
    assert.equal(counted.avatarStorageBytes, png.length);
    const bytesUser = await member({ avatarStorageCount: 0, avatarStorageBytes: 25 * 1024 * 1024 - png.length });
    const bytesResults = await Promise.allSettled(Array.from({ length: 8 }, () => updateAvatar(bytesUser._id, imageFile())));
    assert.equal(bytesResults.filter(result => result.status === "fulfilled").length, 1);
    assert.equal((await User.findById(bytesUser._id).select("+avatarStorageBytes")).avatarStorageBytes, 25 * 1024 * 1024);
});

test("legacy avatar budget initializes once, includes owned avatars and excludes CMS images", async () => {
    const user = await member();
    const legacy = await uploadImageBuffer({ buffer: png, originalName: "avatar", mimeType: "image/png", uploadedBy: String(user._id) });
    const cms = await uploadImageBuffer({ buffer: png, originalName: "concert-poster.png", mimeType: "image/png", uploadedBy: String(user._id) });
    const results = await Promise.all(Array.from({ length: 3 }, () => updateAvatar(user._id, imageFile())));
    assert.equal(results.length, 3);
    const counted = await User.findById(user._id).select("+avatarStorageCount +avatarStorageBytes").lean();
    assert.equal(counted.avatarStorageCount, 4);
    assert.equal(counted.avatarStorageBytes, png.length * 4);
    assert.ok(await db().collection("images.files").findOne({ _id: legacy.id }));
    assert.ok(await db().collection("images.files").findOne({ _id: cms.id }));
});

test("verified failed image cleanup releases the avatar reservation", async () => {
    const user = await member();
    const prototype = mongoose.mongo.Collection.prototype;
    const original = prototype.insertOne;
    prototype.insertOne = function (document, options) {
        if (this.collectionName === "images.files") return Promise.reject(new Error("QA_AVATAR_METADATA_FAILURE"));
        return original.call(this, document, options);
    };
    try { await assert.rejects(updateAvatar(user._id, imageFile()), /QA_AVATAR_METADATA_FAILURE/); }
    finally { prototype.insertOne = original; }
    const counted = await User.findById(user._id).select("+avatarStorageCount +avatarStorageBytes").lean();
    assert.equal(counted.avatarStorageCount, 0);
    assert.equal(counted.avatarStorageBytes, 0);
    assert.equal(counted.avatarUrl, "");
});

test("cross-origin password and Google login submissions cannot set session cookies", async () => {
    for (const path of ["/auth/login", "/auth/google"]) {
        const response = await fetch(`${base}${path}`, { method: "POST", headers: { Origin: "https://untrusted.example.test", "Content-Type": "application/x-www-form-urlencoded" }, body: "email=attacker%40example.test&password=unused&credential=unused" });
        assert.equal(response.status, 403);
        assert.equal(response.headers.get("set-cookie"), null);
    }
});

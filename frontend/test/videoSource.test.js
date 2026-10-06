import test from "node:test";
import assert from "node:assert/strict";
import { resolveVideoSource, routePublicVideo } from "../src/utils/videoSource.js";

test("public video streams bypass deployment proxy without rewriting signed CDN, local or other-origin URLs", () => {
  const app = "https://fyce-web.vercel.app", media = "https://fyce-web.onrender.com";
  const path = "/api/videos/507f1f77bcf86cd799439011";
  assert.equal(routePublicVideo(path, media, app), media + path);
  assert.equal(routePublicVideo(app + path + "?v=2#t=3", media, app), media + path + "?v=2#t=3");
  for (const src of ["https://cdn.example" + path + "?signature=abc", media + path, "/uploads/clip.mp4", "/api/videos/not-an-id", "blob:https://fyce-web.vercel.app/123"]) assert.equal(routePublicVideo(src, media, app), src);
  assert.equal(routePublicVideo(path, "", "http://localhost:5180"), path);
  assert.equal(routePublicVideo(path, "https://user:secret@cdn.example", app), path);
  assert.equal(routePublicVideo(path, "http://cdn.example", app), path);
});
test("direct video accepts GridFS, full API URLs and signed extensionless CDN media", () => {
  for (const src of ["/api/videos/507f1f77bcf86cd799439011", "https://fyce.example/api/videos/507f1f77bcf86cd799439011", "https://cdn.example/stream?id=123&signature=abc", "https://cdn.example/clip.webm?token=abc#t=3"]) assert.deepEqual(resolveVideoSource(src), { kind: "video", src });
});
test("YouTube watch, Shorts, short links and privacy embeds resolve to one safe embed", () => {
  for (const src of ["https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://m.youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"]) assert.deepEqual(resolveVideoSource(src), { kind: "youtube", id: "dQw4w9WgXcQ", src: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
  assert.equal(resolveVideoSource("https://www.youtube.com/watch?v=invalid"), null);
  assert.equal(resolveVideoSource("https://youtube.com.evil.example/a.mp4").kind, "video");
});
test("unsafe protocols, credentials and malformed sources never become embeds", () => {
  for (const value of [null, "", "javascript:alert(1)", "data:text/html,test", "//evil.example/video", "https://user:password@example.com/video", "https://example.com/\\video", "https://example.com/\nvideo"]) assert.equal(resolveVideoSource(value), null);
});

import { normalizeLanguage, resolveLanguage } from "../src/i18n/language.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { translate } from "../src/i18n/translate.js";
import english from "../src/i18n/en.js";
import { localizeContent } from "../src/i18n/content.js";
test("translations cover user journeys and keep admin Vietnamese", () => {
  assert.equal(translate("Trang chủ", "en"), "Home");
  assert.equal(translate("Mật khẩu", "vi"), "Mật khẩu");
  assert.equal(
    translate("Một QR cho cả đơn vé", "en"),
    "One QR for your entire booking",
  );
  assert.equal(
    translate("Mã xác minh không đúng.", "en"),
    "Incorrect verification code.",
  );
  assert.equal(translate("  Đang xử lý...  ", "en"), "Processing...");
});
test("interpolated messages preserve values and never execute or alter user content", () => {
  assert.equal(translate("Gửi lại sau 12s", "en"), "Resend in 12s");
  assert.equal(
    translate(
      "Đã hủy đơn FYCE-TEST và nhả toàn bộ ghế chưa thanh toán của đơn.",
      "en",
    ),
    "Order FYCE-TEST was cancelled and all its unpaid seats released.",
  );
  assert.equal(translate("274đ", "en"), "274 VND");
  for (const value of [
    274,
    null,
    undefined,
    { title: "Trang chủ" },
    ["Đăng nhập"],
    "Totoro Day 1",
    "<script>alert(1)</script>",
  ])
    assert.equal(translate(value, "en"), value);
});
test("all literal Vietnamese translation keys in user JSX exist in the catalog", () => {
  const missing = [];
  function scan(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) scan(path);
      else if (path.endsWith(".jsx"))
        for (const match of readFileSync(path, "utf8").matchAll(
          /\bt\("((?:[^"\\]|\\.)*)"\)/g,
        )) {
          const key = JSON.parse('"' + match[1] + '"');
          if (/[À-ỹ]/.test(key) && !Object.hasOwn(english, key))
            missing.push(`${path}: ${key}`);
        }
    }
  }
  scan(new URL("../src", import.meta.url).pathname);
  assert.deepEqual(missing, []);
});

test("admin routes never inherit user English preference", () => {
  for (const route of ["/admin", "/admin/bookings", "/admin/check-in"])
    assert.equal(resolveLanguage(route, "en"), "vi");
  assert.equal(resolveLanguage("/profile", "en"), "en");
  assert.equal(resolveLanguage("/login", "vi"), "vi");
  assert.equal(normalizeLanguage("fr"), "vi");
});

test("English covers edited homepage text, casing and decomposed Vietnamese accents", () => {
  assert.equal(translate("Về FYCE", "en"), "ABOUT FYCE");
  assert.equal(translate("Đam mê âm nhạc".normalize("NFD"), "en"), "A passion for music");
  const record = { title: "FYCE", subtitle: "Nơi tuổi trẻ hòa cùng âm nhạc", english: { title: "An Evening with FYCE" }, features: [{ title: "Kết nối cộng đồng", description: "Nội dung mới", english: { description: "A new story" } }] };
  const result = localizeContent(record, "en");
  assert.equal(result.title, "An Evening with FYCE");
  assert.equal(result.subtitle, "Where youth and music come together");
  assert.equal(result.features[0].description, "A new story");
  assert.equal(result.features[0].title, "Bringing people together");
  assert.equal(localizeContent(record, "vi"), record);
  assert.equal(record.features[0].description, "Nội dung mới");
  const event = { title: "Totoro", description: "Mô tả", shortDescription: "Giới thiệu", english: { description: "Concert story", shortDescription: "An orchestral evening" } };
  assert.equal(localizeContent(event, "en").description, "Concert story");
  assert.equal(localizeContent(event, "en").shortDescription, "An orchestral evening");
  assert.equal(localizeContent(event, "vi"), event);
});

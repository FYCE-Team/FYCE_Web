import test from "node:test";
import assert from "node:assert/strict";
import { scrollPolicy } from "../src/utils/scrollPolicy.js";
test("reload resets reading/auth/profile pages, retains operational pages even with hash", () => {
  const base = { initial: true, reload: true, navigationType: "POP", hash: "#about" };
  for (const pathname of ["/", "/events/totoro", "/profile", "/login", "/register"]) assert.equal(scrollPolicy({ ...base, pathname }), "top");
  for (const pathname of ["/events/totoro/seats", "/checkout/id", "/bookings/FYCE-123", "/my-tickets", "/admin", "/admin/tickets", "/admin/events/id/seats"]) assert.equal(scrollPolicy({ ...base, pathname }), "restore");
});
test("normal anchors and Back remain useful; fresh page navigation starts at top", () => {
  for (const navigationType of ["PUSH", "POP", "REPLACE"]) assert.equal(scrollPolicy({ pathname: "/", hash: "#top", initial: false, reload: false, navigationType }), "top");
  assert.equal(scrollPolicy({ pathname: "/", hash: "#about", initial: false, reload: false, navigationType: "PUSH" }), "anchor");
  assert.equal(scrollPolicy({ pathname: "/events/totoro", initial: false, reload: false, navigationType: "POP" }), "restore");
  assert.equal(scrollPolicy({ pathname: "/my-tickets", initial: false, reload: false, navigationType: "PUSH" }), "top");
});

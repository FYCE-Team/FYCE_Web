import test from "node:test";
import assert from "node:assert/strict";
import { restoreSession } from "../src/services/sessionRestore.js";
const rejected = status => async () => { throw Object.assign(new Error("rejected"), { status }); };

test("refresh restores the actual new token and user", async () => {
  const data = { accessToken: "new-token", user: { id: "buyer" } };
  assert.deepEqual(await restoreSession({ refresh: async () => ({ data }), readProfile: rejected(500) }), data);
});
test("cookie failure on Back retains only an access token independently validated by server", async () => {
  let supplied;
  const result = await restoreSession({ refresh: rejected(401), accessToken: "existing-token", readProfile: async token => { supplied = token; return { data: { id: "buyer" } }; } });
  assert.equal(supplied, "existing-token");
  assert.deepEqual(result, { accessToken: "existing-token", user: { id: "buyer" } });
});
test("expired/blocked tokens still reject and cookie-only bootstrap never invents a session", async () => {
  for (const status of [401, 403]) await assert.rejects(restoreSession({ refresh: rejected(401), accessToken: "old", readProfile: rejected(status) }), error => error.status === status);
  await assert.rejects(restoreSession({ refresh: rejected(401), readProfile: rejected(500) }), error => error.status === 401);
  await assert.rejects(restoreSession({ refresh: rejected(403), accessToken: "old", readProfile: async () => { throw new Error("must not run"); } }), error => error.status === 403);
});
test("network errors are not treated as logout or bypassed by access token fallback", async () => {
  await assert.rejects(restoreSession({ refresh: rejected(503), accessToken: "old", readProfile: rejected(401) }), error => error.status === 503);
});

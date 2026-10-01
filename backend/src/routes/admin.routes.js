import express from "express";
import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import { ticketScanRateLimit } from "../middleware/rateLimit.middleware.js";
import * as controller from "../controllers/admin.controller.js";
const router = express.Router();
router.use(authenticateToken, requireAdmin);
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store, private");
  next();
});
router.post("/bulk/preview", controller.bulkPreview);
router.post("/bulk/execute", controller.bulkExecute);
router.get("/trash/:kind", controller.trashList);
router.post("/content/gallery/reorder", controller.reorderGallery);
router.get("/details/:kind/:id", controller.detail);
router.get("/overview", controller.overview);
router.post("/users", controller.createUser);
router.patch("/users/:id", controller.updateUser);
router.post("/bookings/:id/cancel", controller.cancelBooking);
router.post("/bookings/:id/refund", ticketScanRateLimit, controller.refund);
router.get("/bookings/:id/audit", controller.bookingAudit);
router.post(
  "/bookings/:id/reconcile",
  ticketScanRateLimit,
  controller.reconcile,
);
router.get("/content/:type", controller.listContent);
router.post("/content/:type", controller.saveContent);
router.put("/content/:type/:id", controller.saveContent);
router.delete("/content/:type/:id", controller.deleteContent);
router.get("/:kind", controller.list);
export default router;

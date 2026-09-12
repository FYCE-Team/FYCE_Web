import express from "express";

import {
  getPublished,
  getUpcoming,
  getFeatured,
  getBySlug,
  create,
  update,
  publish,
  cancel,
  feature,
  getAdminEvents,
  getAdminEventById,
  cloneSeatSetup
} from "../controllers/event.controller.js";

import {
  authenticateToken
} from "../middleware/auth.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/

/*
GET /api/events
Lấy danh sách event đã publish
*/
router.get(
  "/",
  getPublished
);

/*
GET /api/events/upcoming
Lấy các event sắp diễn ra
*/
router.get(
  "/upcoming",
  getUpcoming
);

/*
GET /api/events/featured
Lấy event Featured
*/
router.get(
  "/featured",
  getFeatured
);

/*
GET /api/events/admin/all
Lấy toàn bộ event cho Admin
*/
router.get(
  "/admin/all",
  authenticateToken,
  getAdminEvents
);

/*
GET /api/events/admin/:id
Lấy một event cho Admin để Edit
*/
router.get(
  "/admin/:id",
  authenticateToken,
  getAdminEventById
);

/*
GET /api/events/:slug
Lấy chi tiết event theo slug
*/
router.get(
  "/:slug",
  getBySlug
);

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES
|--------------------------------------------------------------------------
*/

/*
POST /api/events
Tạo event mới
*/
router.post(
  "/",
  authenticateToken,
  create
);

/*
PUT /api/events/:id
Cập nhật event
*/
router.put(
  "/:id",
  authenticateToken,
  update
);

/*
PATCH /api/events/:id/publish
Publish event
*/
router.patch(
  "/:id/publish",
  authenticateToken,
  publish
);

/*
PATCH /api/events/:id/cancel
Cancel event
*/
router.patch(
  "/:id/cancel",
  authenticateToken,
  cancel
);

/*
POST /api/events/:id/clone-seat-setup
Sao chép seat assignment từ concert nguồn sang concert đích,
map hạng vé theo code rồi tạo bộ Seat mới cho concert đích.
*/
router.post(
  "/:id/clone-seat-setup",
  authenticateToken,
  cloneSeatSetup
);

/*
PATCH /api/events/:id/feature
Bật/tắt Featured
*/
router.patch(
  "/:id/feature",
  authenticateToken,
  feature
);

export default router;
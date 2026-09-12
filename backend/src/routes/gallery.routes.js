import express from "express";

import {
  create,
  update,
  getActive,
  getAll,
  activate,
  deactivate
} from "../controllers/gallery.controller.js";

import {
  authenticateToken
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  getActive
);

router.get(
  "/admin/all",
  authenticateToken,
  getAll
);

router.post(
  "/",
  authenticateToken,
  create
);

router.put(
  "/:id",
  authenticateToken,
  update
);

router.patch(
  "/:id/activate",
  authenticateToken,
  activate
);

router.patch(
  "/:id/deactivate",
  authenticateToken,
  deactivate
);

export default router;
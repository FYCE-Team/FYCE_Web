import express from "express";

import {
  getHomepage
} from "../controllers/homepage.controller.js";

const router = express.Router();

router.get(
  "/",
  getHomepage
);

export default router;
import express from "express";
import { validateRequest } from "zod-express-middleware";
import { z } from "zod";
import authMiddleware from "../middleware/auth-middleware.js";
import { search } from "../controllers/search.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  validateRequest({ query: z.object({ q: z.string().optional() }) }),
  search
);

export default router;

import express from "express";
import { validateRequest } from "zod-express-middleware";
import { z } from "zod";
import authMiddleware from "../middleware/auth-middleware.js";
import { search } from "../controllers/search.js";

const router = express.Router();

/**
 * @openapi
 * /search:
 *   get:
 *     summary: Full-text search across tasks and projects (scoped to the user's own projects)
 *     tags: [Search]
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: "search query" }
 *     responses:
 *       200: { description: Matching projects and tasks }
 */
router.get(
  "/",
  authMiddleware,
  validateRequest({ query: z.object({ q: z.string().optional() }) }),
  search
);

export default router;

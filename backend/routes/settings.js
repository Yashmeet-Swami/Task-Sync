import express from "express";
import { getSettings, updateSettings } from "../controllers/settings-controller.js";
import authMiddleware from "../middleware/auth-middleware.js";

const router = express.Router();

/**
 * @openapi
 * /settings:
 *   get:
 *     summary: Get the current user's app settings (notifications, theme, language)
 *     tags: [Settings]
 *     responses:
 *       200: { description: User settings }
 *   put:
 *     summary: Update the current user's app settings
 *     tags: [Settings]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notifications: { type: boolean }
 *               newsletter: { type: boolean }
 *               darkMode: { type: boolean }
 *               language: { type: string }
 *     responses:
 *       200: { description: Settings updated }
 */
router.get("/", authMiddleware, getSettings);
router.put("/", authMiddleware, updateSettings);

export default router;

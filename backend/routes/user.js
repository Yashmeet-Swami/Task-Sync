import express from "express";
import authenticateUser from "../middleware/auth-middleware.js";
import {
  changePassword,
  getUserProfile,
  updateUserProfile,
  uploadProfilePhoto
} from "../controllers/user.js";
import { validateRequest } from "zod-express-middleware";
import { z } from "zod";
import upload from "../multer-config.js";

const router = express.Router();

/**
 * @openapi
 * /users/profile:
 *   get:
 *     summary: Get the current user's profile
 *     tags: [Users]
 *     responses:
 *       200: { description: User profile (password excluded) }
 *   put:
 *     summary: Update the current user's name/profile picture URL
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               profilePicture: { type: string }
 *     responses:
 *       200: { description: Profile updated }
 */
router.get("/profile", authenticateUser, getUserProfile);

router.put(
  "/profile",
  authenticateUser,
  validateRequest({
    body: z.object({
      name: z.string(),
      profilePicture: z.string().optional(),
    }),
  }),
  updateUserProfile
);

/**
 * @openapi
 * /users/profile/photo:
 *   post:
 *     summary: Upload a profile photo (stored in MinIO, replaces the previous one)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200: { description: Upload succeeded, returns the new public URL }
 *       400: { description: No file provided or invalid file type }
 */
router.post("/profile/photo",
  authenticateUser,
  upload.single("avatar"),
  uploadProfilePhoto  // ✅ Call this
);


/**
 * @openapi
 * /users/change-password:
 *   put:
 *     summary: Change the current user's password
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200: { description: Password updated }
 *       403: { description: Invalid current password }
 */
router.put(
  "/change-password",
  authenticateUser,
  validateRequest({
    body: z.object({
      currentPassword: z.string(),
      newPassword: z.string(),
      confirmPassword: z.string(),
    }),
  }),
  changePassword
);

export default router;
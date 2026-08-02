import express from "express";
import { z } from "zod"
import { validateRequest } from "zod-express-middleware"

import {
    emailSchema,
    loginSchema,
    registerSchema,
    verifyEmailSchema,
    resetPasswordSchema
} from "../libs/validate-schema.js";

import {
    registerUser,
    loginUser,
    verifyEmail,
    resetPasswordRequest,
    verifyResetPasswordTokenAndResetPassword,
    refreshAccessToken,
    logoutUser,
    logoutAllDevices,
} from "../controllers/auth-controller.js";
import authMiddleware from "../middleware/auth-middleware.js";


const router = express.Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201: { description: Verification email queued }
 *       403: { description: Denied by Arcjet (bot/disposable email) }
 *       409: { description: User already exists }
 */
router.post("/register",
    validateRequest({
        body: registerSchema,
    }),
    registerUser
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful - access token in body, refresh token in an httpOnly cookie
 *       400: { description: Email not yet verified }
 *       401: { description: Invalid email or password }
 *       429: { description: Rate limited by Arcjet }
 */
router.post("/login",
    validateRequest({
        body: loginSchema,
    }),
    loginUser
);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     summary: Verify an email address using the token from the verification email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200: { description: Email verified }
 *       401: { description: Invalid or expired token }
 */
router.post("/verify-email",
    validateRequest({
        body: verifyEmailSchema,
    }),
    verifyEmail
);

/**
 * @openapi
 * /auth/reset-password-request:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Reset email queued }
 *       400: { description: User not found or email not verified }
 *       429: { description: Rate limited by Arcjet }
 */
router.post(
    "/reset-password-request",
    validateRequest({
        body: emailSchema,
    }),
    resetPasswordRequest
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using the token from the reset email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword, confirmPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *               confirmPassword: { type: string }
 *     responses:
 *       200: { description: Password reset successfully }
 *       401: { description: Invalid or expired token }
 */
router.post(
    "/reset-password",
    validateRequest({
        body: resetPasswordSchema,
    }),
    verifyResetPasswordTokenAndResetPassword
);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     summary: Exchange the refresh-token cookie for a new access token (rotates the refresh token)
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200: { description: New access token issued, refresh cookie rotated }
 *       401: { description: Missing, invalid, or reused/revoked refresh token }
 */
router.post("/refresh-token", refreshAccessToken);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Log out of the current session (revokes this session's refresh token)
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200: { description: Logged out }
 */
router.post("/logout", logoutUser);

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     summary: Log out of every device (revokes all sessions for the current user)
 *     tags: [Auth]
 *     responses:
 *       200: { description: All sessions revoked }
 *       401: { description: Not authenticated }
 */
router.post("/logout-all", authMiddleware, logoutAllDevices);
export default router;

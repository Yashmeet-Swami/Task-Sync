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

router.post("/register",
    validateRequest({
        body: registerSchema,
    }),
    registerUser
);

router.post("/login",
    validateRequest({
        body: loginSchema,
    }),
    loginUser
);

router.post("/verify-email",
    validateRequest({
        body: verifyEmailSchema,
    }),
    verifyEmail
);

router.post(
    "/reset-password-request",
    validateRequest({
        body: emailSchema,
    }),
    resetPasswordRequest
);

router.post(
    "/reset-password",
    validateRequest({
        body: resetPasswordSchema,
    }),
    verifyResetPasswordTokenAndResetPassword
);

router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logoutUser);
router.post("/logout-all", authMiddleware, logoutAllDevices);
export default router;
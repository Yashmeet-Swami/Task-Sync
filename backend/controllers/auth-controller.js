import bcrypt from "bcryptjs";
import User from "../models/user.js";
import Session from "../models/session.js";
import jwt from "jsonwebtoken";
import Verification from "../models/verification.js";
import { queueEmail } from "../queues/email-queue.js";
import aj from "../libs/arcjet.js";
import { generateAccessToken, generateRefreshToken, hashToken, tokensMatch } from "../libs/token.js";
import AppError from "../libs/app-error.js";
import asyncHandler from "../libs/async-handler.js";

const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

const setRefreshCookie = (res, token) => {
    res.cookie("refreshToken", token, {
        ...REFRESH_COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
};

const clearRefreshCookie = (res) => {
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
};


const registerUser = asyncHandler(async (req, res) => {
    const { email, name, password } = req.body;

    const decision = await aj.protect(req, { email, requested: 1 });

    if (decision.isDenied()) {
        throw new AppError("Invalid email address", 403);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError("User already exists.", 409);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
    });

    const verificationToken = jwt.sign(
        { userId: newUser._id, purpose: "email-verification" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    await Verification.create({
        userId: newUser._id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000)
    })

    // queue verification email (delivery happens off the request path via the email worker)
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const emailBody = `<p>Click <a href="${verificationLink}">here</a> to verify your email</p>`;
    const emailSubject = "Verify your email";

    await queueEmail(email, emailSubject, emailBody);

    res.status(201).json({
        message: "Verification email sent to your mail. Please check and verify your account."
    });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        throw new AppError("No refresh token provided", 401);
    }

    let payload;
    try {
        payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        clearRefreshCookie(res);
        throw new AppError("Invalid or expired refresh token", 401);
    }

    if (payload.purpose !== "refresh-token") {
        clearRefreshCookie(res);
        throw new AppError("Invalid refresh token", 401);
    }

    const session = await Session.findById(payload.sessionId);

    // No session doc means it was already logged out / rotated away - force re-login.
    if (!session || session.user.toString() !== payload.userId) {
        clearRefreshCookie(res);
        throw new AppError("Session expired. Please log in again.", 401);
    }

    // The presented token doesn't match the current one on record for this session -
    // most likely a rotated-out (already-used) refresh token being replayed. Treat this
    // as possible theft and revoke the session outright rather than silently rejecting.
    if (!tokensMatch(refreshToken, session.tokenHash)) {
        await Session.findByIdAndDelete(session._id);
        clearRefreshCookie(res);
        throw new AppError("Session expired. Please log in again.", 401);
    }

    const user = await User.findById(payload.userId);

    if (!user) {
        clearRefreshCookie(res);
        throw new AppError("User not found", 401);
    }

    // Rotate: the old token is now invalid: a new one is issued against the same session.
    const newRefreshToken = generateRefreshToken(user._id, session._id.toString());
    session.tokenHash = hashToken(newRefreshToken);
    session.expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
    await session.save();

    const accessToken = generateAccessToken(user._id);

    setRefreshCookie(res, newRefreshToken);

    res.status(200).json({
        token: accessToken,
    });
});


const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const decision = await aj.protect(req, { email, requested: 1 });
    if (decision.isDenied()) {
        throw new AppError("Too many login attempts. Please try again later.", 429);
    }

    const user = await User.findOne({ email }).select("+password +isEmailVerified");

    if (!user) {
        throw new AppError("Invalid email or password", 401);
    }

    if (!user.isEmailVerified) {
        const existingVerification = await Verification.findOne({
            userId: user._id
        });

        if (existingVerification && existingVerification.expiresAt > new Date()) {
            throw new AppError(
                "Email not verified. Please check your mail for the verification link.",
                400
            );
        }

        // Only delete if existingVerification exists and is expired
        if (existingVerification) {
            await Verification.findByIdAndDelete(existingVerification._id);
        }

        const verificationToken = jwt.sign(
            { userId: user._id, purpose: "email-verification" },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        await Verification.create({
            userId: user._id,
            token: verificationToken,
            expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        });

        //queue verification email
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        const emailBody = `<p>Click <a href="${verificationLink}">here</a> to verify your email</p>`;
        const emailSubject = "Verify your email";

        await queueEmail(email, emailSubject, emailBody);

        return res.status(201).json({
            message: "Verification email sent to your mail. Please check and verify your account."
        });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw new AppError("Invalid email or password", 401);
    }

    const accessToken = generateAccessToken(user._id);

    // Create the session first so we have an _id to embed in the refresh token, then
    // store only the token's hash - the raw token never touches the database.
    const session = await Session.create({
        user: user._id,
        tokenHash: "pending",
        userAgent: req.headers["user-agent"],
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
    });

    const refreshToken = generateRefreshToken(user._id, session._id.toString());
    session.tokenHash = hashToken(refreshToken);
    await session.save();

    setRefreshCookie(res, refreshToken);

    user.lastLogin = new Date();
    await user.save();

    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
        message: "Login Successful",
        token: accessToken,
        user: userData,
    });
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new AppError("Verification link expired.", 401);
        }
        throw new AppError("Unauthorized", 401);
    }

    if (!payload || payload.purpose !== "email-verification") {
        throw new AppError("Unauthorized", 401);
    }

    const { userId } = payload;
    const verification = await Verification.findOne({ userId, token });

    if (!verification) {
        throw new AppError("Unauthorized", 401);
    }

    const isTokenExpired = verification.expiresAt < new Date();
    if (isTokenExpired) {
        throw new AppError("Token Expired", 401);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError("Unauthorized", 401);
    }

    if (user.isEmailVerified) {
        throw new AppError("Email already verified.", 400);
    }

    user.isEmailVerified = true;
    await user.save();

    await Verification.findByIdAndDelete(verification._id);

    res.status(200).json({ message: "Email verified successfully." });
});


const resetPasswordRequest = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const decision = await aj.protect(req, { email, requested: 1 });
    if (decision.isDenied()) {
        throw new AppError("Too many requests. Please try again later.", 429);
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new AppError("User not found", 400);
    }

    if (!user.isEmailVerified) {
        throw new AppError("Please verify your email first", 400);
    }

    const existingVerification = await Verification.findOne({
        userId: user._id,
    });

    if (existingVerification && existingVerification.expiresAt > new Date()) {
        throw new AppError("Reset password request already sent", 400);
    }

    if (existingVerification && existingVerification.expiresAt < new Date()) {
        await Verification.findByIdAndDelete(existingVerification._id);
    }

    const resetPasswordToken = jwt.sign(
        { userId: user._id, purpose: "reset-password" },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
    );

    await Verification.create({
        userId: user._id,
        token: resetPasswordToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const resetPasswordLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetPasswordToken}`;
    const emailBody = `<p>Click <a href="${resetPasswordLink}">here</a> to reset your password</p>`;
    const emailSubject = "Reset your password";

    await queueEmail(email, emailSubject, emailBody);

    res.status(200).json({ message: "Reset password email sent" });
});

const verifyResetPasswordTokenAndResetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new AppError("Unauthorized", 401);
    }

    if (!payload) {
        throw new AppError("Unauthorized", 401);
    }

    const { userId, purpose } = payload;

    if (purpose !== "reset-password") {
        throw new AppError("Unauthorized", 401);
    }

    const verification = await Verification.findOne({
        userId,
        token,
    });

    if (!verification) {
        throw new AppError("Unauthorized", 401);
    }

    const isTokenExpired = verification.expiresAt < new Date();

    if (isTokenExpired) {
        throw new AppError("Token expired", 401);
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("Unauthorized", 401);
    }

    if (newPassword !== confirmPassword) {
        throw new AppError("Passwords do not match", 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashPassword;
    await user.save();

    await Verification.findByIdAndDelete(verification._id);

    res.status(200).json({ message: "Password reset successfully" });
});

const logoutUser = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
        try {
            const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            await Session.findByIdAndDelete(payload.sessionId);
        } catch (error) {
            // Token already invalid/expired - nothing to revoke server-side.
        }
    }

    clearRefreshCookie(res);

    res.status(200).json({
        message: "Logged out successfully",
    });
});

const logoutAllDevices = asyncHandler(async (req, res) => {
    await Session.deleteMany({ user: req.user._id });

    clearRefreshCookie(res);

    res.status(200).json({
        message: "Logged out of all devices successfully",
    });
});


export {
    registerUser,
    loginUser,
    verifyEmail,
    resetPasswordRequest,
    verifyResetPasswordTokenAndResetPassword,
    refreshAccessToken,
    logoutUser,
    logoutAllDevices,
};

import User from "../models/user.js";
import bcrypt from "bcrypt";
import path from 'path';
import crypto from 'crypto';
import AppError from "../libs/app-error.js";
import asyncHandler from "../libs/async-handler.js";
import { uploadFile, deleteFile, keyFromUrl } from "../libs/storage.js";


// Get user profile
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) throw new AppError("User not found", 404);

  res.status(200).json(user);
});

// Update profile (including photo via URL)
const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, profilePicture } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) throw new AppError("User not found", 404);

  user.name = name;
  if (profilePicture) user.profilePicture = profilePicture;

  await user.save();
  res.status(200).json(user);
});

// Upload profile photo (using POST) - stored in MinIO (S3-compatible object storage)
const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("No file provided", 400);

  const user = await User.findById(req.user.id);
  if (!user) throw new AppError("User not found", 404);

  const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${path.extname(req.file.originalname)}`;
  const key = `profile-photos/${uniqueName}`;

  const url = await uploadFile(key, req.file.buffer, req.file.mimetype);

  // Delete old photo from storage if one exists
  const oldKey = keyFromUrl(user.profilePicture);
  if (oldKey) {
    await deleteFile(oldKey).catch(() => {});
  }

  user.profilePicture = url;
  await user.save();

  res.json({
    success: true,
    profilePicture: url,
    user
  });
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!user) throw new AppError("User not found", 404);
  if (newPassword !== confirmPassword) {
    throw new AppError("Passwords don't match", 400);
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) throw new AppError("Invalid password", 403);

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.status(200).json({ message: "Password updated" });
});

export {
  getUserProfile,
  updateUserProfile,
  uploadProfilePhoto,
  changePassword
};

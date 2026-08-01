import jwt from "jsonwebtoken";
import crypto from "crypto";

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId, purpose: "access-token" },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m" }
  );
};

export const generateRefreshToken = (userId, sessionId) => {
  return jwt.sign(
    { userId, sessionId, purpose: "refresh-token" },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d" }
  );
};

// Refresh tokens are long, high-entropy JWTs, not low-entropy passwords - bcrypt is the
// wrong tool here (it silently truncates input past 72 bytes). A plain SHA-256 digest is
// the standard approach for hashing API/session tokens before storing them.
export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const tokensMatch = (token, storedHash) => {
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(storedHash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

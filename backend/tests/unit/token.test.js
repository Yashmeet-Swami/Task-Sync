import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  tokensMatch,
} from "../../libs/token.js";

describe("generateAccessToken", () => {
  it("issues a JWT carrying the userId and access-token purpose", () => {
    const token = generateAccessToken("user-123");
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    expect(payload.userId).toBe("user-123");
    expect(payload.purpose).toBe("access-token");
  });
});

describe("generateRefreshToken", () => {
  it("embeds both the userId and the sessionId", () => {
    const token = generateRefreshToken("user-123", "session-456");
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    expect(payload.userId).toBe("user-123");
    expect(payload.sessionId).toBe("session-456");
    expect(payload.purpose).toBe("refresh-token");
  });
});

describe("hashToken / tokensMatch", () => {
  it("is deterministic and produces a 64-char hex sha256 digest", () => {
    const hash = hashToken("some-refresh-token");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken("some-refresh-token")).toBe(hash);
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });

  it("tokensMatch returns true only for the token that produced the stored hash", () => {
    const token = generateRefreshToken("user-123", "session-456");
    const storedHash = hashToken(token);

    expect(tokensMatch(token, storedHash)).toBe(true);
    expect(tokensMatch("a-completely-different-token", storedHash)).toBe(false);
  });
});

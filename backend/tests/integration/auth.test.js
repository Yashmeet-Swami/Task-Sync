import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Arcjet and the email queue are external boundaries (real network / real Redis) -
// mocked here so this suite tests our own auth logic, not those third-party services.
vi.mock("../../libs/arcjet.js", () => ({
  default: { protect: vi.fn().mockResolvedValue({ isDenied: () => false }) },
}));

vi.mock("../../queues/email-queue.js", () => ({
  queueEmail: vi.fn().mockResolvedValue({ id: "mock-job" }),
}));

import app from "../../app.js";
import User from "../../models/user.js";
import Verification from "../../models/verification.js";

const testUser = {
  name: "Auth Test User",
  email: "auth-test@example.com",
  password: "TestPass123!",
};

describe("Auth flow", () => {
  it("registers a new user with a pending (unverified) email", async () => {
    const res = await request(app).post("/api-v1/auth/register").send(testUser);

    expect(res.status).toBe(201);

    const user = await User.findOne({ email: testUser.email });
    expect(user).toBeTruthy();
    expect(user.isEmailVerified).toBe(false);
  });

  it("rejects duplicate registration with the same email", async () => {
    const res = await request(app).post("/api-v1/auth/register").send(testUser);
    expect(res.status).toBe(409);
  });

  it("blocks login until the email is verified", async () => {
    const res = await request(app)
      .post("/api-v1/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(400);
  });

  it("verifies the email using the issued verification token", async () => {
    const user = await User.findOne({ email: testUser.email });
    const verification = await Verification.findOne({ userId: user._id });
    expect(verification).toBeTruthy();

    const res = await request(app)
      .post("/api-v1/auth/verify-email")
      .send({ token: verification.token });

    expect(res.status).toBe(200);

    const verifiedUser = await User.findOne({ email: testUser.email });
    expect(verifiedUser.isEmailVerified).toBe(true);
  });

  it("logs in successfully once verified, issuing an access token and refresh cookie", async () => {
    const res = await request(app)
      .post("/api-v1/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^refreshToken=/);
  });

  it("rejects login with the wrong password", async () => {
    const res = await request(app)
      .post("/api-v1/auth/login")
      .send({ email: testUser.email, password: "WrongPassword1!" });

    expect(res.status).toBe(401);
  });

  it("rejects a request to a protected route with no token", async () => {
    const res = await request(app).get("/api-v1/users/profile");
    expect(res.status).toBe(401);
  });
});

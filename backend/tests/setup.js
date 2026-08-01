import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll } from "vitest";

// libs/env.js validates these at import time - set them before anything in the app
// module graph gets imported, using disposable test values (no real services needed
// since Arcjet/email are mocked at the boundary in the tests that touch them).
process.env.NODE_ENV ??= "test";
process.env.JWT_SECRET ??= "test-jwt-secret";
process.env.ACCESS_TOKEN_SECRET ??= "test-access-secret";
process.env.REFRESH_TOKEN_SECRET ??= "test-refresh-secret";
process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.EMAIL_USER ??= "test@example.com";
process.env.EMAIL_PASS ??= "test-pass";
process.env.ARCJET_KEY ??= "test-arcjet-key";

// Top-level await: Vitest fully executes setupFiles (including this) before the test
// file's own module graph (which statically imports app.js -> libs/env.js) is evaluated,
// so MONGODB_URI is guaranteed to point at this in-memory instance by the time it's read.
const mongod = await MongoMemoryServer.create({
  instance: { launchTimeout: 30000 },
});
process.env.MONGODB_URI = mongod.getUri();

await mongoose.connect(process.env.MONGODB_URI);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

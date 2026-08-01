import { defineConfig, devices } from "@playwright/test";

// Assumes the full stack is already running via `docker compose up` - this suite
// exercises the real frontend, backend, MongoDB, and Mailpit together, not mocks.
export default defineConfig({
  testDir: "./e2e",
  // Register/login/reset-password calls go through Arcjet's real fraud-detection
  // service (bot detection, email validation, rate limiting). That network round-trip
  // has observed latency anywhere from ~5s to 30s+ from this environment, not a bug in
  // this app - timeouts and one retry are generous specifically to absorb that.
  timeout: 120000,
  expect: { timeout: 45000 },
  fullyParallel: false,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 45000,
    navigationTimeout: 45000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});

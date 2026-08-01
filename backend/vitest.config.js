import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    testTimeout: 20000,
    hookTimeout: 30000,
    // Each test file spins up its own in-memory MongoDB instance for full isolation
    // between files - keep that resource usage bounded on a modest dev machine.
    fileParallelism: false,
  },
});

import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

/**
 * The `server-only` marker package throws on import, which is exactly what we
 * want in the app bundle but wrong in a Node test. Point it at an empty module
 * here; Next's own resolution keeps the real guard for the build.
 */
const serverOnlyStub = fileURLToPath(new URL("./tests/db/server-only-stub.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": srcDir, "server-only": serverOnlyStub },
  },
  test: {
    // CI, Vercel and the nightly job run in UTC. Pin the tests to it so a
    // developer's IST clock can never hide a date or time-zone bug.
    env: { TZ: "UTC" },
    projects: [
      {
        // Pure logic: dates, money, academic years, Zod schemas, permissions.
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.db.test.ts", "node_modules/**"],
        },
      },
      {
        // Real Postgres, all migrations applied (06-testing § Layers).
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["src/**/*.db.test.ts"],
          globalSetup: ["./tests/db/global-setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
});

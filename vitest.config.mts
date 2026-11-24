import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": srcDir },
  },
  test: {
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
        // Real Postgres, all migrations applied (06-testing). Added in M0-03.
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["src/**/*.db.test.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
});

import { z } from "zod";

/**
 * Every environment variable the app reads, validated once at startup
 * ([05-ops](../../docs/architecture/05-ops.md#environment-variables)).
 * A missing or malformed value stops the app instead of failing later.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Server-only. Required by the modules that use them (db, storage, auth).
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  APP_URL: z.url().optional(),
  BOOTSTRAP_ADMIN_EMAIL: z.email().optional(),

  // `test` enables the "sign in as …" list for Playwright and local demos (D3).
  AUTH_MODE: z.enum(["password", "test"]).default("password"),

  VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

/**
 * Validate a raw environment. Pure, so the rules are unit-testable.
 *
 * Test sign-in is forbidden on any Vercel deployment: previews share the
 * production database (D30), so a test session there would be a real one.
 */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new EnvError(`Invalid environment: ${detail}`);
  }
  if (result.data.VERCEL_ENV && result.data.AUTH_MODE === "test") {
    throw new EnvError(
      "AUTH_MODE=test is not allowed on Vercel: previews would sign in against the shared database (D30).",
    );
  }
  return result.data;
}

let cached: Env | undefined;

/** The validated environment. Throws `EnvError` on the first bad call. */
export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/** A server-only variable, with a clear error when it is unset. */
export function requireEnv(
  name: "DATABASE_URL" | "DIRECT_URL" | "SUPABASE_SERVICE_ROLE_KEY",
): string {
  const value = env()[name];
  if (!value) throw new EnvError(`${name} is not set`);
  return value;
}

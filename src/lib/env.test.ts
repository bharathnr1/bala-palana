import { describe, expect, it } from "vitest";

import { EnvError, parseEnv } from "@/lib/env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
};

describe("parseEnv", () => {
  it("accepts valid public configuration and defaults AUTH_MODE", () => {
    const env = parseEnv(valid);
    expect(env.AUTH_MODE).toBe("password");
  });

  it("allows test sign-in locally and in CI", () => {
    expect(parseEnv({ ...valid, AUTH_MODE: "test" }).AUTH_MODE).toBe("test");
    expect(parseEnv({ ...valid, AUTH_MODE: "test", VERCEL_ENV: undefined }).AUTH_MODE).toBe("test");
  });

  it("refuses test sign-in on any Vercel deployment (D30)", () => {
    expect(() => parseEnv({ ...valid, AUTH_MODE: "test", VERCEL_ENV: "preview" })).toThrow(
      EnvError,
    );
    expect(() => parseEnv({ ...valid, AUTH_MODE: "test", VERCEL_ENV: "production" })).toThrow(
      EnvError,
    );
    expect(() => parseEnv({ ...valid, AUTH_MODE: "test", VERCEL_ENV: "development" })).toThrow(
      EnvError,
    );
  });

  it("names the missing variable", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "x" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("rejects a malformed URL", () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })).toThrow(EnvError);
  });

  it("rejects an unknown AUTH_MODE", () => {
    expect(() => parseEnv({ ...valid, AUTH_MODE: "magic" })).toThrow(EnvError);
  });
});

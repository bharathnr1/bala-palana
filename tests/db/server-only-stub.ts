/**
 * Test-only stand-in for the `server-only` marker package. That package
 * throws on import outside a React Server Component bundle, which would stop
 * the DB tests from importing the modules under test. The Vitest config
 * aliases `server-only` here; the real package still guards the app build.
 */
export {};

/**
 * Cookie that carries the chosen user in `AUTH_MODE=test` (03 § Test auth mode).
 * Read by `middleware.ts` and `requireUser()`; the value is an `app_user.id`,
 * which the session code validates against the database on every request.
 */
export const TEST_USER_COOKIE = "bp_test_user";

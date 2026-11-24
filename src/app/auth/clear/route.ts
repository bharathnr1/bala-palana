import { NextResponse, type NextRequest } from "next/server";

import { TEST_USER_COOKIE } from "@/lib/test-auth";

/**
 * Clears the test sign-in cookie and returns to `/login`. A Route Handler is
 * the only place that may modify cookies during a GET, so `requireUser()`
 * redirects here when the chosen account is no longer valid.
 */
export function GET(request: NextRequest): NextResponse {
  const reason = request.nextUrl.searchParams.get("reason") ?? "inactive";
  const response = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));
  response.cookies.delete(TEST_USER_COOKIE);
  return response;
}

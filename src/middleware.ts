import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { TEST_USER_COOKIE } from "@/lib/test-auth";

/** Reachable without a session (03-auth-and-access § Sign-in). */
const PUBLIC_PATHS = ["/login", "/help", "/auth", "/manifest.webmanifest"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function loginRedirect(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/login", request.url));
}

/**
 * Refreshes the Supabase session on every request and sends signed-out
 * requests to `/login` (03 § Sign-in). It never touches the database, so it
 * stays on the edge runtime; `requireUser()` does the allowlist check.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (isPublic(request.nextUrl.pathname)) return NextResponse.next();

  // Test sign-in uses a cookie; the session code validates the user row.
  if (process.env.AUTH_MODE === "test") {
    return request.cookies.get(TEST_USER_COOKIE) ? NextResponse.next() : loginRedirect(request);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return loginRedirect(request); // fail closed on a misconfigured deploy

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? response : loginRedirect(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$).*)",
  ],
};

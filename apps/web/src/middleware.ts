import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  "/",
  "/:locale",
  "/:locale/landing(.*)",
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/categories(.*)",
  "/api/billing/plans(.*)",
]);

// Matches root locale paths like /fr, /en, /ar (but not /fr/articles etc.)
const isLocaleRoot = (pathname: string): boolean => {
  return /^\/[a-z]{2}\/?$/.test(pathname) || pathname === "/";
};

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // API routes: apply Clerk auth but NOT intl middleware
  if (pathname.startsWith("/api")) {
    if (!isPublicRoute(req)) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  // Root path: redirect based on auth status
  if (isLocaleRoot(pathname)) {
    const { userId } = await auth();
    if (!userId) {
      const locale = pathname.replace(/\//g, "") || "fr";
      const landingUrl = new URL(`/${locale}/landing`, req.url);
      return NextResponse.redirect(landingUrl);
    }
    // Authenticated: continue to dashboard
    return intlMiddleware(req);
  }

  // Other page routes: protect non-public routes
  if (!isPublicRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      const locale = pathname.split("/")[1] || "fr";
      const landingUrl = new URL(`/${locale}/landing`, req.url);
      return NextResponse.redirect(landingUrl);
    }
  }
  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};

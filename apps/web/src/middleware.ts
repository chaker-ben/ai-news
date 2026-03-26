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

  // Page routes: apply Clerk auth + intl middleware
  if (!isPublicRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      // Redirect unauthenticated users to landing page
      const locale = pathname.split("/")[1] || "fr";
      const landingUrl = new URL(`/${locale}/landing`, req.url);
      return NextResponse.redirect(landingUrl);
    }
  }
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    String.raw`/((?!_next|_vercel|.*\..*).*)`
  ],
};

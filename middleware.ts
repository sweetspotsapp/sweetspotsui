import { NextRequest, NextResponse } from "next/server";

/**
 * Vercel Edge Middleware — intercepts requests to /place/:placeId
 * and rewrites bot/crawler requests to the OG serverless function.
 * Real users pass through to the normal SPA.
 */

const BOT_USER_AGENTS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "WhatsApp",
  "LinkedInBot",
  "Slackbot",
  "TelegramBot",
  "Discordbot",
  "Googlebot",
  "bingbot",
  "Applebot",
  "iMessageLinkPreview",
];

export const config = {
  matcher: "/place/:placeId*",
};

export default function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  const isBot = BOT_USER_AGENTS.some((bot) => ua.toLowerCase().includes(bot.toLowerCase()));

  if (!isBot) {
    return NextResponse.next();
  }

  // Extract placeId from the URL
  const url = new URL(req.url);
  const match = url.pathname.match(/^\/place\/(.+)$/);
  const placeId = match?.[1];

  if (!placeId) {
    return NextResponse.next();
  }

  // Rewrite to the OG serverless function
  const ogUrl = new URL(`/api/og/${placeId}`, req.url);
  return NextResponse.rewrite(ogUrl);
}

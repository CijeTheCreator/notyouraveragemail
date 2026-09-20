import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://steady-ram-494.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = request.nextUrl.origin;

  if (error) {
    console.error("Figma OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/auth/figma?error=${encodeURIComponent(
          errorDescription || error
        )}`,
        baseUrl
      )
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/auth/figma?error=Missing+code+or+state", baseUrl)
    );
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/figma/callback`;
    const result = await convex.action(api.figma.exchangeOAuthCode, {
      code,
      redirectUri,
      state,
    });

    return NextResponse.redirect(
      new URL(
        `/auth/figma?status=connected&handle=${encodeURIComponent(
          result.figmaHandle || ""
        )}`,
        baseUrl
      )
    );
  } catch (err: any) {
    console.error("Failed to exchange Figma OAuth code:", err);
    return NextResponse.redirect(
      new URL(
        `/auth/figma?error=${encodeURIComponent(
          err.message || "Failed to link Figma account"
        )}`,
        baseUrl
      )
    );
  }
}

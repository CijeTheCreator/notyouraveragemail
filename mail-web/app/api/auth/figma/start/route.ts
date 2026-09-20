import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const inboxId = searchParams.get("inboxId") || "default@agentmail.to";
  const clientId = process.env.FIGMA_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "FIGMA_CLIENT_ID is not configured in environment" },
      { status: 500 }
    );
  }

  const baseUrl = request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/figma/callback`;

  const stateObj = {
    inboxId,
    ts: Date.now(),
  };
  const state = encodeURIComponent(JSON.stringify(stateObj));

  // Directly redirect to Figma OAuth authorization screen
  const authUrl = `https://www.figma.com/oauth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=file_content:read&state=${encodeURIComponent(
    state
  )}&response_type=code`;

  return NextResponse.redirect(authUrl);
}

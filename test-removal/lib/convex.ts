import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://steady-ram-494.convex.cloud";

export const convexClient = new ConvexHttpClient(convexUrl);
export const api = anyApi;

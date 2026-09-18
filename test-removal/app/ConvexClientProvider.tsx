"use client";

import { ConvexReactClient, ConvexProvider } from "convex/react";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const url =
      process.env.NEXT_PUBLIC_CONVEX_URL ||
      "https://steady-ram-494.convex.cloud";
    return new ConvexReactClient(url);
  }, []);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

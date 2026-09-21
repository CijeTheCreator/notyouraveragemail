import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "NotYourAverageMail",
  description: "Next-generation, AI-native email experience with autonomous agent orchestration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full light" style={{ colorScheme: "light" }}>
      <body className="h-full flex flex-col bg-[#fafafb] text-[#161619] font-sans antialiased selection:bg-black/10 selection:text-black">
        <ConvexClientProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                border: "1px solid rgba(0, 0, 0, 0.08)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
                borderRadius: "6px",
                fontFamily: "var(--font-sans, sans-serif)",
                color: "#161619",
                background: "#ffffff",
                fontSize: "0.8125rem",
              },
            }}
          />
        </ConvexClientProvider>
      </body>
    </html>
  );
}

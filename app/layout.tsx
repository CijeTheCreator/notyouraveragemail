import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Modern Mail | Super App",
  description: "Next-generation, AI-native email experience with autonomous agent orchestration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-col bg-[#FEFBEA] text-[#2c2a29] antialiased">
        <ConvexClientProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                border: "2px solid #2c2a29",
                boxShadow: "3px 3px 0px #2c2a29",
                borderRadius: "2px",
                fontFamily: "var(--font-sans, sans-serif)",
                color: "#2c2a29",
                background: "#FEFBEA",
              },
            }}
          />
        </ConvexClientProvider>
      </body>
    </html>
  );
}

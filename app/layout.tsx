import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}

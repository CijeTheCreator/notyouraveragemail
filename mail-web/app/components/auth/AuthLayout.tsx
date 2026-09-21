"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import AuthCanvasBackground from "./AuthCanvasBackground";

export function Crosshair({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none contain-[layout,paint] absolute z-20 ${className}`}
      fill="none"
      height="21"
      viewBox="0 0 22 21"
      width="22"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.5 4C10.5 7.31371 7.81371 10 4.5 10H0.5V11H4.5C7.81371 11 10.5 13.6863 10.5 17V21H11.5V17C11.5 13.6863 14.1863 11 17.5 11H21.5V10H17.5C14.1863 10 11.5 7.31371 11.5 4V0H10.5V4Z"
        fill="rgba(0, 0, 0, 0.12)"
      />
    </svg>
  );
}

interface AuthLayoutProps {
  children: ReactNode;
  activeTab?: "signin" | "signup";
  onTabChange?: (tab: "signin" | "signup") => void;
  title?: string;
  subtitle?: string;
}

export default function AuthLayout({
  children,
  activeTab,
  onTabChange,
  title,
  subtitle,
}: AuthLayoutProps) {
  return (
    <main className="overflow-x-clip min-h-screen bg-[#fafafb] text-[#111114] selection:bg-black/10">
      {/* Precision Fixed Vertical Hairlines (400px column boundary) */}
      <div className="fixed left-[calc(50%-200px)] top-0 bottom-0 w-[1px] bg-[rgba(0,0,0,0.08)] z-10 pointer-events-none" />
      <div className="fixed right-[calc(50%-200px)] top-0 bottom-0 w-[1px] bg-[rgba(0,0,0,0.08)] z-10 pointer-events-none" />

      <div className="relative">
        <div className="min-h-screen bg-[#fafafb] relative flex flex-col overflow-y-auto">
          <div className="w-full pt-16 sm:pt-20 max-w-[400px] mx-auto relative flex flex-col min-h-full pb-16">
            
            {/* Header section with brand and canvas decoration */}
            <div className="relative">
              {/* Top horizontal line extending full screen width */}
              <div className="absolute top-0 w-screen left-[calc(50%-50vw)] h-[1px] bg-[rgba(0,0,0,0.08)]" />
              <Crosshair className="-top-[10px] -left-[10.5px]" />
              <Crosshair className="-top-[10px] -right-[10.5px]" />

              <div className="pt-12 pb-8 relative overflow-hidden">
                {/* Background dot matrix canvas decoration */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[500px] h-[250px]">
                    <AuthCanvasBackground />
                  </div>
                </div>

                {/* Brand Header */}
                <div className="flex flex-col items-center justify-center relative z-10">
                  <Link
                    href="/"
                    className="text-2xl sm:text-[26px] tracking-tight hover:opacity-90 transition-opacity flex items-center gap-1.5 select-none"
                  >
                    <span className="font-bold text-[#111114]">NotYourAverage</span>
                    <span className="font-normal text-[#5a5a61]">Mail</span>
                  </Link>
                  {subtitle && (
                    <p className="text-xs text-[#5a5a61] mt-1.5 font-medium">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom horizontal line of header block */}
              <div className="absolute bottom-0 w-screen left-[calc(50%-50vw)] h-[1px] bg-[rgba(0,0,0,0.08)]" />
              <Crosshair className="-bottom-[10px] -left-[10.5px]" />
              <Crosshair className="-bottom-[10px] -right-[10.5px]" />
            </div>

            {/* Optional Segmented Tab Switcher (Log In / Sign Up) */}
            {activeTab && onTabChange && (
              <div className="relative">
                <div className="px-4 py-3">
                  <div className="flex relative justify-center bg-[#f0f0f2] p-1 rounded-full border border-black/[0.04]">
                    {/* Sliding indicator pill */}
                    <div
                      className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full transition-all duration-200 ease-out ${
                        activeTab === "signin"
                          ? "left-1"
                          : "left-[calc(50%+2px)]"
                      }`}
                      style={{
                        boxShadow:
                          "0px 1px 3px rgba(0,0,0,0.08), 0px 4px 12px rgba(0,0,0,0.04)",
                      }}
                    />

                    {/* Log In Tab */}
                    <button
                      type="button"
                      onClick={() => onTabChange("signin")}
                      className={`flex-1 py-2 text-center relative z-[3] transition-colors rounded-full text-xs font-semibold ${
                        activeTab === "signin"
                          ? "text-[#111114]"
                          : "text-[#5a5a61] hover:text-[#111114]"
                      }`}
                    >
                      Log In
                    </button>

                    {/* Sign Up Tab */}
                    <button
                      type="button"
                      onClick={() => onTabChange("signup")}
                      className={`flex-1 py-2 text-center relative z-[3] transition-colors rounded-full text-xs font-semibold ${
                        activeTab === "signup"
                          ? "text-[#111114]"
                          : "text-[#5a5a61] hover:text-[#111114]"
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>

                {/* Bottom line under tab switcher */}
                <div className="absolute bottom-0 w-screen left-[calc(50%-50vw)] h-[1px] bg-[rgba(0,0,0,0.08)]" />
                <Crosshair className="-bottom-[10px] -left-[10.5px]" />
                <Crosshair className="-bottom-[10px] -right-[10.5px]" />
              </div>
            )}

            {/* Main Form/Content Container */}
            <div className="relative flex-1 flex flex-col min-h-0">
              <div className="px-4 pt-6 pb-6">
                {title && (
                  <h2 className="text-base font-semibold text-[#111114] mb-4 text-center">
                    {title}
                  </h2>
                )}
                {children}
              </div>

              {/* Bottom line closing the section */}
              <div className="relative mt-auto">
                <div className="absolute top-0 w-screen left-[calc(50%-50vw)] h-[1px] bg-[rgba(0,0,0,0.08)]" />
                <Crosshair className="-top-[10px] -left-[10.5px]" />
                <Crosshair className="-top-[10px] -right-[10.5px]" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}

import React from "react";
import LandingNavbar from "./components/landing/LandingNavbar";
import LandingHero from "./components/landing/LandingHero";
import TechCreditsReel from "./components/landing/TechCreditsReel";
import WebFeaturesSection from "./components/landing/WebFeaturesSection";
import DesktopCompanionSection from "./components/landing/DesktopCompanionSection";
import InstallCommandCard from "./components/landing/InstallCommandCard";
import LandingFAQ from "./components/landing/LandingFAQ";
import LandingFooter from "./components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafb] text-[#111114] relative">
      {/* Signature Firecrawl Full-Height Grid Container Lines */}
      <div className="fixed top-0 z-[2] max-w-7xl mx-auto border-x border-black/[0.06] h-screen pointer-events-none inset-x-0 hidden sm:block" />

      <LandingNavbar />
      <main className="flex-1 relative z-10">
        <LandingHero />
        <TechCreditsReel />
        <WebFeaturesSection />
        <DesktopCompanionSection />
        <InstallCommandCard />
        <LandingFAQ />
      </main>
      <div className="relative z-10">
        <LandingFooter />
      </div>
    </div>
  );
}

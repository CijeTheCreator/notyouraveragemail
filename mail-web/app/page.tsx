import React from "react";
import LandingNavbar from "./components/landing/LandingNavbar";
import LandingHero from "./components/landing/LandingHero";
import TechCreditsReel from "./components/landing/TechCreditsReel";
import WebFeaturesSection from "./components/landing/WebFeaturesSection";
import DesktopCompanionSection from "./components/landing/DesktopCompanionSection";
import InstallCommandCard from "./components/landing/InstallCommandCard";
import LandingFooter from "./components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafb] text-[#111114]">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <TechCreditsReel />
        <WebFeaturesSection />
        <DesktopCompanionSection />
        <InstallCommandCard />
      </main>
      <LandingFooter />
    </div>
  );
}

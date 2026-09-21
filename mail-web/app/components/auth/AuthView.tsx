"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import AuthLayout from "./AuthLayout";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";

interface AuthViewProps {
  initialTab?: "signin" | "signup";
}

export default function AuthView({ initialTab = "signin" }: AuthViewProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/mail");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleTabChange = (tab: "signin" | "signup") => {
    setActiveTab(tab);
    // Smooth URL update
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/auth/${tab}`);
    }
  };

  return (
    <AuthLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      {activeTab === "signin" ? (
        <SignInForm onSwitchToSignUp={() => handleTabChange("signup")} />
      ) : (
        <SignUpForm onSwitchToSignIn={() => handleTabChange("signin")} />
      )}
    </AuthLayout>
  );
}

"use client";

import React from "react";
import { RainbowButton } from "@/registry/magicui/rainbow-button";

interface JudgesButtonProps {
  onClick?: () => void;
  className?: string;
}

/**
 * JudgesButton: Renders the Magic UI RainbowButton for the judges trigger.
 * Controlled via environment variable NEXT_PUBLIC_JUDGES_BUTTON_VARIANT ("dark" | "outline").
 * Defaults to the dark variant if unset.
 */
export default function JudgesButton({ onClick, className }: JudgesButtonProps) {
  const envVariant = (process.env.NEXT_PUBLIC_JUDGES_BUTTON_VARIANT || "").trim().toLowerCase();
  const variant: "default" | "outline" = envVariant === "outline" ? "outline" : "default";

  return (
    <RainbowButton
      variant={variant}
      onClick={onClick}
      className={className}
    >
      For Wayne & Friends (Judges too, apparently 👀)
    </RainbowButton>
  );
}

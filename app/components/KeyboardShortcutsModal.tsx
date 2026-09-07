"use client";

import React from "react";
import { X, Command } from "lucide-react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "C", description: "Compose new email" },
    { key: "↑ / K", description: "Navigate to previous email" },
    { key: "↓ / J", description: "Navigate to next email" },
    { key: "/", description: "Focus search bar" },
    { key: "R", description: "Reply to active email" },
    { key: "F", description: "Forward active email" },
    { key: "S", description: "Star / unstar active email" },
    { key: "U", description: "Toggle read / unread status" },
    { key: "E", description: "Move email to trash" },
    { key: "Esc", description: "Close modal / deselect active view" },
    { key: "?", description: "Show / hide this shortcuts guide" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FEFBEA] border-3 border-[#2c2a29] brutal-shadow-left max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#2c2a29] text-[#FEFBEA] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Command className="w-5 h-5 text-[#8544FA]" />
            <h3 className="font-anton text-xl tracking-wider">SUPERHUMAN SHORTCUTS</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts Table */}
        <div className="p-5 flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between border-b border-[#2c2a29]/15 pb-2 text-sm"
            >
              <span className="font-sans text-[#2c2a29] font-medium">
                {item.description}
              </span>
              <kbd className="bg-white border-2 border-[#2c2a29] font-mono font-bold text-xs px-2 py-1 brutal-shadow-sm rounded-sm">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-white p-3 border-t-2 border-[#2c2a29] text-center text-xs text-gray-600 font-sans">
          Press <kbd className="font-bold font-mono">Esc</kbd> anytime to dismiss.
        </div>
      </div>
    </div>
  );
}

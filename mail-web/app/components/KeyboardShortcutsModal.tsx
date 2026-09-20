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
    { key: "?", description: "Show / hide shortcuts" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-[#00000014] rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#fafafb] px-4 py-3 border-b border-[#00000014] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Command className="size-4 text-[#111114]" />
            <h3 className="text-xs font-semibold text-[#111114]">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#0000000a] rounded text-[#797981] hover:text-[#111114] transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Shortcuts Table */}
        <div className="p-4 flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between border-b border-[#0000000a] pb-2 text-xs"
            >
              <span className="text-[#323237] font-medium">
                {item.description}
              </span>
              <kbd className="bg-[#f6f6f9] border border-[#00000014] font-mono text-[11px] font-medium px-2 py-0.5 rounded text-[#111114]">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-[#fafafb] p-2.5 border-t border-[#00000014] text-center text-[11px] text-[#797981]">
          Press <kbd className="font-mono bg-black/5 px-1 py-0.5 rounded">Esc</kbd> anytime to dismiss
        </div>
      </div>
    </div>
  );
}

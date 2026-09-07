"use client";

import React from "react";
import Link from "next/link";
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Sparkles,
  Plus,
  HelpCircle,
  LogIn,
  LogOut,
} from "lucide-react";
import { FolderType } from "../types";

interface SidebarProps {
  activeFolder: FolderType;
  onSelectFolder: (folder: FolderType) => void;
  onOpenCompose: () => void;
  onOpenShortcuts: () => void;
  inboxUnreadCount: number;
  sentCount: number;
  actionCardsCount: number;
  user?: {
    name?: string;
    username?: string;
    inboxId?: string;
    email?: string;
  } | null;
  onSignOut?: () => void;
}

export default function Sidebar({
  activeFolder,
  onSelectFolder,
  onOpenCompose,
  onOpenShortcuts,
  inboxUnreadCount,
  sentCount,
  actionCardsCount,
  user,
  onSignOut,
}: SidebarProps) {
  const displayName = user?.name || user?.username || "Guest User";
  const displayEmail = user?.inboxId || user?.email || "chijioke-6638@agentmail.to";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <aside className="w-60 flex-shrink-0 bg-[#FEFBEA] border-r-2 border-[#2c2a29] flex flex-col justify-between h-screen select-none">
      {/* Top Header & Navigation */}
      <div className="p-4 flex flex-col gap-4">
        {/* Logo / Title */}
        <div className="flex items-center justify-between border-b-2 border-[#2c2a29] pb-3">
          <div>
            <h1 className="font-anton text-2xl tracking-wider text-[#2c2a29] flex items-center gap-1">
              MODERN<span className="text-[#8544FA]">MAIL</span>
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-[#2c2a29]/60 uppercase">
              Super App
            </p>
          </div>
        </div>

        {/* User Identity Pill or Sign In Button */}
        {user ? (
          <div className="bg-white border-2 border-[#2c2a29] p-2 brutal-shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-[#8544FA] text-[#FEFBEA] font-anton flex items-center justify-center border border-[#2c2a29] text-xs flex-shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="text-xs font-bold text-[#2c2a29] truncate">{displayName}</div>
                <div className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block flex-shrink-0"></span>
                  <span className="truncate">{displayEmail}</span>
                </div>
              </div>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-black transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <Link
            href="/auth/signin"
            className="brutal-btn bg-[#8544FA] text-[#FEFBEA] p-2 flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-[#7330ea]"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>SIGN IN / CLAIM INBOX</span>
          </Link>
        )}

        {/* Big Compose Button */}
        <button
          onClick={onOpenCompose}
          className="button-primary bg-[#8544FA] text-[#FEFBEA] py-2.5 px-3 flex items-center justify-center gap-2 text-base font-bold tracking-wide hover:bg-[#7330ea] active:translate-x-1 active:translate-y-1"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>COMPOSE</span>
          <span className="text-[10px] bg-[#2c2a29] text-white px-1.5 py-0.5 rounded ml-auto font-mono">
            C
          </span>
        </button>

        {/* Navigation Folders */}
        <nav className="flex flex-col gap-1 mt-1">
          {/* Inbox */}
          <button
            onClick={() => onSelectFolder("inbox")}
            className={`flex items-center justify-between px-3 py-2 border-2 text-sm font-bold transition-all rounded-sm ${
              activeFolder === "inbox"
                ? "bg-[#D0B4FF] border-[#2c2a29] brutal-shadow-sm text-[#2c2a29]"
                : "bg-transparent border-transparent hover:border-[#2c2a29] hover:bg-white/80 text-[#2c2a29]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4 text-[#2c2a29]" />
              <span>Inbox</span>
            </div>
            {inboxUnreadCount > 0 && (
              <span className="bg-[#8544FA] text-[#FEFBEA] text-xs font-anton px-1.5 py-0.2 border border-[#2c2a29]">
                {inboxUnreadCount}
              </span>
            )}
          </button>

          {/* Sent */}
          <button
            onClick={() => onSelectFolder("sent")}
            className={`flex items-center justify-between px-3 py-2 border-2 text-sm font-bold transition-all rounded-sm ${
              activeFolder === "sent"
                ? "bg-[#D0B4FF] border-[#2c2a29] brutal-shadow-sm text-[#2c2a29]"
                : "bg-transparent border-transparent hover:border-[#2c2a29] hover:bg-white/80 text-[#2c2a29]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send className="w-4 h-4 text-[#2c2a29]" />
              <span>Sent</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#2c2a29]/60 px-1.5 py-0.2 bg-black/5 rounded">
              {sentCount}
            </span>
          </button>

          {/* Action Cards */}
          <button
            onClick={() => onSelectFolder("action-cards")}
            className={`flex items-center justify-between px-3 py-2 border-2 text-sm font-bold transition-all rounded-sm ${
              activeFolder === "action-cards"
                ? "bg-[#FEF08A] border-[#2c2a29] brutal-shadow-sm text-[#854D0E]"
                : "bg-transparent border-transparent hover:border-[#2c2a29] hover:bg-white/80 text-[#2c2a29]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#8544FA]" />
              <span>Action Cards</span>
            </div>
            {actionCardsCount > 0 && (
              <span className="bg-[#EAB308] text-[#2c2a29] text-[10px] font-anton px-1.5 py-0.2 border border-[#2c2a29]">
                {actionCardsCount}
              </span>
            )}
          </button>

          {/* Drafts */}
          <button
            onClick={() => onSelectFolder("drafts")}
            className={`flex items-center justify-between px-3 py-2 border-2 text-sm font-bold opacity-60 hover:opacity-100 transition-all rounded-sm ${
              activeFolder === "drafts"
                ? "bg-[#D0B4FF] border-[#2c2a29] brutal-shadow-sm text-[#2c2a29]"
                : "bg-transparent border-transparent hover:border-[#2c2a29] hover:bg-white/80 text-[#2c2a29]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#2c2a29]" />
              <span>Drafts</span>
            </div>
            <span className="text-xs font-mono">0</span>
          </button>

          {/* Trash */}
          <button
            onClick={() => onSelectFolder("trash")}
            className={`flex items-center justify-between px-3 py-2 border-2 text-sm font-bold opacity-60 hover:opacity-100 transition-all rounded-sm ${
              activeFolder === "trash"
                ? "bg-[#D0B4FF] border-[#2c2a29] brutal-shadow-sm text-[#2c2a29]"
                : "bg-transparent border-transparent hover:border-[#2c2a29] hover:bg-white/80 text-[#2c2a29]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-[#2c2a29]" />
              <span>Trash</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Footer Info & Shortcuts */}
      <div className="p-4 border-t-2 border-[#2c2a29] bg-[#FEFBEA]">
        <button
          onClick={onOpenShortcuts}
          className="flex items-center justify-between text-xs font-bold text-[#2c2a29] hover:text-[#8544FA] py-1 w-full transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            Shortcuts
          </span>
          <kbd className="bg-white px-1.5 py-0.5 border border-[#2c2a29] text-[10px] font-mono rounded">
            ?
          </kbd>
        </button>
      </div>
    </aside>
  );
}

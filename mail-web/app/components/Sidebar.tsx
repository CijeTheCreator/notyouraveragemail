"use client";

import React from "react";
import Link from "next/link";
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Plus,
  HelpCircle,
  LogIn,
  LogOut,
  CreditCard,
  Eraser,
  Sparkles,
} from "lucide-react";
import { FolderType } from "../types";

interface SidebarProps {
  activeFolder: FolderType;
  onSelectFolder: (folder: FolderType) => void;
  onOpenCompose: () => void;
  onOpenShortcuts: () => void;
  inboxUnreadCount: number;
  sentCount: number;
  subscriptionsCount: number;
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
  subscriptionsCount,
  user,
  onSignOut,
}: SidebarProps) {
  const displayName = user?.name || user?.username || "Guest User";
  const displayEmail = user?.inboxId || user?.email || "chijioke-6638@agentmail.to";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <aside className="w-56 flex-shrink-0 bg-[#f1f1f4] border-r border-[#00000014] flex flex-col justify-between h-screen select-none font-sans">
      {/* Top Header & Navigation */}
      <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center border-b border-[#00000014] flex-shrink-0">
          <span className="truncate tracking-tight text-[#111114] text-sm block">
            <span className="font-bold">NotYourAverage</span>
            <span className="font-normal text-[#5a5a61]">Mail</span>
          </span>
        </div>

        {/* Action Button: Compose */}
        <div className="p-3 pb-2 flex-shrink-0">
          <button
            onClick={onOpenCompose}
            className="w-full flex items-center justify-between bg-[#111114] text-[#fafafb] hover:bg-black/90 active:bg-black px-3 py-2 rounded-md text-xs font-medium shadow-xs transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Plus className="size-3.5 stroke-[2.5]" />
              <span>Compose</span>
            </div>
            <kbd className="text-[10px] bg-white/20 text-white/90 px-1 py-0.5 rounded font-mono group-hover:bg-white/30 transition-colors">
              C
            </kbd>
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex flex-col gap-4 px-2 py-1 flex-1 overflow-y-auto">
          {/* Section: Mail */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#797981] px-2.5 py-1">
              Mail
            </div>
            <div className="flex flex-col gap-0.5 mt-0.5">
              {/* Inbox */}
              <button
                onClick={() => onSelectFolder("inbox")}
                data-active={activeFolder === "inbox"}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeFolder === "inbox"
                    ? "bg-[#00000012] font-semibold text-[#111114]"
                    : "text-[#323237] hover:bg-[#0000000a] hover:text-[#161619] font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="size-4 text-[#5a5a61]" />
                  <span>Inbox</span>
                </div>
                {inboxUnreadCount > 0 && (
                  <span className="bg-[#111114] text-[#fafafb] text-[10px] font-medium px-1.5 py-0.2 rounded-full">
                    {inboxUnreadCount}
                  </span>
                )}
              </button>

              {/* Sent */}
              <button
                onClick={() => onSelectFolder("sent")}
                data-active={activeFolder === "sent"}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeFolder === "sent"
                    ? "bg-[#00000012] font-semibold text-[#111114]"
                    : "text-[#323237] hover:bg-[#0000000a] hover:text-[#161619] font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send className="size-4 text-[#5a5a61]" />
                  <span>Sent</span>
                </div>
                <span className="text-[11px] font-mono text-[#797981]">
                  {sentCount}
                </span>
              </button>

              {/* Drafts */}
              <button
                onClick={() => onSelectFolder("drafts")}
                data-active={activeFolder === "drafts"}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeFolder === "drafts"
                    ? "bg-[#00000012] font-semibold text-[#111114]"
                    : "text-[#323237] hover:bg-[#0000000a] hover:text-[#161619] font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="size-4 text-[#5a5a61]" />
                  <span>Drafts</span>
                </div>
                <span className="text-[11px] font-mono text-[#797981]">0</span>
              </button>

              {/* Trash */}
              <button
                onClick={() => onSelectFolder("trash")}
                data-active={activeFolder === "trash"}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeFolder === "trash"
                    ? "bg-[#00000012] font-semibold text-[#111114]"
                    : "text-[#323237] hover:bg-[#0000000a] hover:text-[#161619] font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="size-4 text-[#5a5a61]" />
                  <span>Trash</span>
                </div>
              </button>
            </div>
          </div>

          {/* Section: Automations / Agents */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#797981] px-2.5 py-1">
              Agents
            </div>
            <div className="flex flex-col gap-0.5 mt-0.5">
              {/* Subscriptions */}
              <button
                onClick={() => onSelectFolder("subscriptions")}
                data-active={activeFolder === "subscriptions"}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeFolder === "subscriptions"
                    ? "bg-[#00000012] font-semibold text-[#111114]"
                    : "text-[#323237] hover:bg-[#0000000a] hover:text-[#161619] font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="size-4 text-[#5a5a61]" />
                  <span>Subscriptions</span>
                </div>
                {subscriptionsCount > 0 && (
                  <span className="bg-[#111114] text-[#fafafb] text-[10px] font-medium px-1.5 py-0.2 rounded-full">
                    {subscriptionsCount}
                  </span>
                )}
              </button>

              {/* Data Removal */}
              <button
                onClick={() => onSelectFolder("data-removal")}
                data-active={activeFolder === "data-removal"}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeFolder === "data-removal"
                    ? "bg-[#00000012] font-semibold text-[#111114]"
                    : "text-[#323237] hover:bg-[#0000000a] hover:text-[#161619] font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Eraser className="size-4 text-[#5a5a61]" />
                  <span>Data Removal</span>
                </div>
              </button>
            </div>
          </div>

          {/* Section: Preferences & Tools */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#797981] px-2.5 py-1">
              Preferences
            </div>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <button
                onClick={onOpenShortcuts}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-[#323237] hover:bg-[#0000000a] hover:text-[#161619] font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="size-4 text-[#5a5a61]" />
                  <span>Shortcuts</span>
                </div>
                <kbd className="bg-white border border-[#00000014] text-[#5a5a61] px-1 py-0.5 text-[10px] font-mono rounded">
                  ?
                </kbd>
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Footer: User Identity Profile */}
      <div className="p-2 border-t border-[#00000014] flex-shrink-0 bg-[#f1f1f4]">
        {user ? (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-[#00000008] transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-full bg-[#111114] text-[#fafafb] font-medium flex items-center justify-center text-[11px] flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-[#111114] truncate">
                  {displayName}
                </div>
                <div className="text-[10px] text-[#797981] truncate font-mono">
                  {displayEmail}
                </div>
              </div>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="p-1 hover:bg-[#00000012] rounded text-[#797981] hover:text-[#111114] transition-colors cursor-pointer flex-shrink-0"
                title="Sign Out"
              >
                <LogOut className="size-3.5" />
              </button>
            )}
          </div>
        ) : (
          <Link
            href="/auth/signin"
            className="w-full bg-white border border-[#00000014] text-[#111114] hover:bg-[#fafafb] p-2 flex items-center justify-center gap-1.5 text-xs font-medium rounded-md transition-colors"
          >
            <LogIn className="size-3.5" />
            <span>Sign In / Claim Inbox</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

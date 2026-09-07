"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  ChevronDown,
  Star,
  Sparkles,
  KeyRound,
  Mail,
  Check,
  SlidersHorizontal,
  RefreshCw,
} from "lucide-react";
import { Email, FolderType } from "../types";

interface EmailListProps {
  folder: FolderType;
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: "all" | "unread" | "starred" | "actions";
  onFilterChange: (filter: "all" | "unread" | "starred" | "actions") => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export default function EmailList({
  folder,
  emails,
  selectedEmailId,
  onSelectEmail,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  onSync,
  isSyncing,
}: EmailListProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getFolderTitle = () => {
    switch (folder) {
      case "inbox":
        return "INBOX";
      case "sent":
        return "SENT";
      case "action-cards":
        return "ACTION CARDS";
      case "drafts":
        return "DRAFTS";
      case "trash":
        return "TRASH";
      default:
        return "MESSAGES";
    }
  };

  const filterLabels: Record<string, string> = {
    all: "All Mail",
    unread: "Unread Only",
    starred: "Starred",
    actions: "AI Actions",
  };

  return (
    <div className="flex-1 bg-[#FEFBEA] flex flex-col h-screen overflow-hidden">
      {/* Top Header & Search Bar */}
      <div className="p-4 border-b-2 border-[#2c2a29] bg-white/70 flex items-center justify-between gap-4">
        {/* Title & Sync button */}
        <div className="flex items-center gap-2">
          <h2 className="font-anton text-2xl tracking-wide text-[#2c2a29] min-w-[100px]">
            {getFolderTitle()}
          </h2>
          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="brutal-btn bg-white hover:bg-[#D0B4FF] p-1.5 text-[#2c2a29] disabled:opacity-50"
              title="Sync with AgentMail"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#8544FA]" : ""}`} />
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="mail-search-input"
            type="text"
            placeholder="Search mail (press '/' to focus)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-white border-2 border-[#2c2a29] text-sm focus:outline-none focus:bg-[#FEF08A]/20 brutal-shadow-sm font-sans"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-gray-100 border border-gray-400 px-1.5 py-0.5 rounded text-gray-500">
            /
          </kbd>
        </div>

        {/* Filters Dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="brutal-btn bg-white px-3 py-2 text-xs font-bold flex items-center gap-2"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#8544FA]" />
            <span>{filterLabels[filter] || "Filters"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-1.5 w-44 bg-white border-2 border-[#2c2a29] brutal-shadow-sm z-30 py-1 text-xs font-sans">
              <button
                onClick={() => {
                  onFilterChange("all");
                  setIsFilterOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#FEFBEA] flex items-center justify-between"
              >
                <span>All Mail</span>
                {filter === "all" && <Check className="w-3.5 h-3.5 text-[#8544FA]" />}
              </button>
              {folder === "inbox" && (
                <button
                  onClick={() => {
                    onFilterChange("unread");
                    setIsFilterOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#FEFBEA] flex items-center justify-between"
                >
                  <span>Unread Only</span>
                  {filter === "unread" && <Check className="w-3.5 h-3.5 text-[#8544FA]" />}
                </button>
              )}
              <button
                onClick={() => {
                  onFilterChange("starred");
                  setIsFilterOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#FEFBEA] flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  Starred
                </span>
                {filter === "starred" && <Check className="w-3.5 h-3.5 text-[#8544FA]" />}
              </button>
              <button
                onClick={() => {
                  onFilterChange("actions");
                  setIsFilterOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#FEFBEA] flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#8544FA]" />
                  AI Actions
                </span>
                {filter === "actions" && <Check className="w-3.5 h-3.5 text-[#8544FA]" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full-width Email Rows List */}
      <div className="flex-1 overflow-y-auto divide-y-2 divide-[#2c2a29]">
        {emails.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3 text-gray-500">
            <div className="w-14 h-14 rounded-full border-2 border-[#2c2a29] bg-white flex items-center justify-center font-anton text-2xl brutal-shadow-sm">
              <Mail className="w-6 h-6 text-gray-400" />
            </div>
            <p className="font-bold text-base text-[#2c2a29]">No emails found</p>
            <p className="text-xs text-gray-600 font-sans">
              {searchQuery
                ? "No emails match your search query."
                : "This folder has no messages right now."}
            </p>
          </div>
        ) : (
          emails.map((email) => {
            const isSelected = email.id === selectedEmailId;
            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email.id)}
                className={`p-4 cursor-pointer transition-colors flex items-center justify-between gap-6 border-l-4 ${
                  isSelected
                    ? "bg-[#EDE9FE] border-l-[#8544FA]"
                    : email.isRead
                    ? "bg-transparent border-l-transparent hover:bg-white/80"
                    : "bg-[#FEFBEA] border-l-[#8544FA] font-medium"
                }`}
              >
                {/* Left Section: Unread indicator, Sender, Subject & Preview */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Read/Unread dot */}
                  <div className="w-3 flex-shrink-0 flex items-center justify-center">
                    {!email.isRead && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8544FA] border border-[#2c2a29]" />
                    )}
                  </div>

                  {/* Sender Name */}
                  <div className="w-48 flex-shrink-0">
                    <span
                      className={`text-sm truncate block ${
                        !email.isRead ? "font-bold text-[#2c2a29]" : "font-semibold text-gray-700"
                      }`}
                    >
                      {folder === "sent" ? `To: ${email.toName}` : email.fromName}
                    </span>
                  </div>

                  {/* Subject and Preview snippet */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {email.otpCode && (
                      <KeyRound className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    )}
                    {email.actionCard && (
                      <Sparkles className="w-3.5 h-3.5 text-[#8544FA] flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm truncate ${
                        !email.isRead ? "font-bold text-[#2c2a29]" : "text-gray-900 font-medium"
                      }`}
                    >
                      {email.subject}
                    </span>
                    <span className="text-gray-400 text-xs truncate font-sans hidden md:inline">
                      — {email.preview}
                    </span>
                  </div>
                </div>

                {/* Right Section: Badges & Timestamp */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {email.otpCode && (
                    <span className="bg-amber-100 text-amber-900 border border-[#2c2a29] text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-sm">
                      OTP
                    </span>
                  )}
                  {email.actionCard && (
                    <span className="bg-purple-100 text-[#8544FA] border border-[#2c2a29] text-[10px] font-bold px-1.5 py-0.2 rounded-sm hidden sm:inline">
                      Action
                    </span>
                  )}
                  {email.isStarred && (
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  )}
                  <span className="text-xs font-mono text-gray-500 min-w-[65px] text-right">
                    {email.timestamp}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  ChevronDown,
  Star,
  Mail,
  Check,
  SlidersHorizontal,
  RefreshCw,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Email, FolderType } from "../types";
import JudgesButton from "./JudgesButton";

interface EmailListProps {
  folder: FolderType;
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: "all" | "unread" | "starred";
  onFilterChange: (filter: "all" | "unread" | "starred") => void;
  sortBy?: "priority" | "newest" | "oldest";
  onSortChange?: (sort: "priority" | "newest" | "oldest") => void;
  onSync?: () => void;
  isSyncing?: boolean;
  onOpenJudges?: () => void;
}

interface DateGroup {
  dateLabel: string;
  emails: Email[];
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
  sortBy = "newest",
  onSortChange,
  onSync,
  isSyncing,
  onOpenJudges,
}: EmailListProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut '/' to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.target as HTMLElement)?.tagName !== "INPUT" && (e.target as HTMLElement)?.tagName !== "TEXTAREA") {
        e.preventDefault();
        document.getElementById("mail-search-input")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getFolderTitle = () => {
    switch (folder) {
      case "inbox":
        return "Inbox";
      case "sent":
        return "Sent";
      case "subscriptions":
        return "Subscriptions";
      case "drafts":
        return "Drafts";
      case "trash":
        return "Trash";
      default:
        return "Messages";
    }
  };

  const filterLabels: Record<string, string> = {
    all: "All Mail",
    unread: "Unread",
    starred: "Starred",
  };

  // Group emails by AgentMail-style date blocks (Today, Yesterday, Sep 18, etc.)
  const groupedEmails = useMemo<DateGroup[]>(() => {
    const groups: Record<string, Email[]> = {};
    const groupOrder: string[] = [];

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    emails.forEach((email) => {
      let label = "Older";

      const timeVal = email.rawTimestamp
        ? new Date(email.rawTimestamp).getTime()
        : email.timestamp && !isNaN(new Date(email.timestamp).getTime())
        ? new Date(email.timestamp).getTime()
        : null;

      if (timeVal && !isNaN(timeVal)) {
        const d = new Date(timeVal);
        const isToday =
          d.getDate() === todayDate &&
          d.getMonth() === todayMonth &&
          d.getFullYear() === todayYear;

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday =
          d.getDate() === yesterday.getDate() &&
          d.getMonth() === yesterday.getMonth() &&
          d.getFullYear() === yesterday.getFullYear();

        if (isToday) {
          label = "Today";
        } else if (isYesterday) {
          label = "Yesterday";
        } else if (d.getFullYear() === todayYear) {
          label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        } else {
          label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
      } else {
        label = "Messages";
      }

      if (!groups[label]) {
        groups[label] = [];
        groupOrder.push(label);
      }
      groups[label].push(email);
    });

    return groupOrder.map((dateLabel) => ({
      dateLabel,
      emails: groups[dateLabel],
    }));
  }, [emails]);

  return (
    <div className="flex-1 bg-[#fafafb] flex flex-col h-screen overflow-hidden font-sans">
      {/* Slim 56px Header Toolbar */}
      <header className="h-14 flex-shrink-0 border-b border-[#00000014] px-4 flex items-center justify-between gap-3 bg-[#fafafb]">
        {/* Left: Breadcrumb / Folder Title */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-[#797981] font-medium hidden sm:inline">Inboxes</span>
          <span className="text-xs text-[#797981] hidden sm:inline">/</span>
          <h2 className="text-xs font-semibold text-[#111114] tracking-tight truncate">
            {getFolderTitle()}
          </h2>
          <span className="text-[11px] font-mono text-[#797981] ml-1 bg-black/5 px-1.5 py-0.5 rounded">
            {emails.length}
          </span>
        </div>

        {/* Center: Search Bar */}
        <div className="relative flex-1 max-w-md mx-2">
          <Search className="size-3.5 text-[#797981] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="mail-search-input"
            type="text"
            placeholder="Search mail..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-12 py-1.5 bg-white border border-[#00000014] rounded-md text-xs text-[#161619] placeholder:text-[#797981] focus:outline-none focus:border-[#111114]/40 focus:ring-1 focus:ring-[#111114]/20 transition-all font-sans"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-[#f1f1f4] border border-[#00000014] px-1 py-0.5 rounded text-[#797981]">
            /
          </kbd>
        </div>

        {/* Right Controls: Filters, Sort, Sync */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Filters Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="h-8 px-2.5 bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#323237] hover:text-[#111114] text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="size-3 text-[#797981]" />
              <span className="hidden sm:inline">{filterLabels[filter] || "Filter"}</span>
              <ChevronDown className="size-3 text-[#797981]" />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-[#00000014] rounded-md shadow-lg z-30 py-1 text-xs font-sans">
                <button
                  onClick={() => {
                    onFilterChange("all");
                    setIsFilterOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#f6f6f9] flex items-center justify-between text-[#161619]"
                >
                  <span>All Mail</span>
                  {filter === "all" && <Check className="size-3.5 text-[#111114]" />}
                </button>
                {folder === "inbox" && (
                  <button
                    onClick={() => {
                      onFilterChange("unread");
                      setIsFilterOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#f6f6f9] flex items-center justify-between text-[#161619]"
                  >
                    <span>Unread</span>
                    {filter === "unread" && <Check className="size-3.5 text-[#111114]" />}
                  </button>
                )}
                <button
                  onClick={() => {
                    onFilterChange("starred");
                    setIsFilterOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#f6f6f9] flex items-center justify-between text-[#161619]"
                >
                  <span className="flex items-center gap-1.5">
                    <Star className="size-3 fill-amber-400 text-amber-500" />
                    Starred
                  </span>
                  {filter === "starred" && <Check className="size-3.5 text-[#111114]" />}
                </button>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="h-8 px-2.5 bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#323237] hover:text-[#111114] text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sort messages"
            >
              <ArrowUpDown className="size-3 text-[#797981]" />
              <span className="hidden md:inline">
                {sortBy === "priority" ? "Priority" : sortBy === "newest" ? "Newest" : "Oldest"}
              </span>
              <ChevronDown className="size-3 text-[#797981]" />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-[#00000014] rounded-md shadow-lg z-30 py-1 text-xs font-sans">
                <button
                  onClick={() => {
                    onSortChange?.("newest");
                    setIsSortOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#f6f6f9] flex items-center justify-between text-[#161619]"
                >
                  <span>Newest First</span>
                  {sortBy === "newest" && <Check className="size-3.5 text-[#111114]" />}
                </button>
                <button
                  onClick={() => {
                    onSortChange?.("priority");
                    setIsSortOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#f6f6f9] flex items-center justify-between text-[#161619]"
                >
                  <span>Priority</span>
                  {sortBy === "priority" && <Check className="size-3.5 text-[#111114]" />}
                </button>
                <button
                  onClick={() => {
                    onSortChange?.("oldest");
                    setIsSortOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#f6f6f9] flex items-center justify-between text-[#161619]"
                >
                  <span>Oldest First</span>
                  {sortBy === "oldest" && <Check className="size-3.5 text-[#111114]" />}
                </button>
              </div>
            )}
          </div>

          {/* Sync Button */}
          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="h-8 w-8 bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#323237] hover:text-[#111114] rounded-md flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              title="Sync with AgentMail"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin text-[#111114]" : "text-[#797981]"}`} />
            </button>
          )}

          {/* For Judges Button */}
          {onOpenJudges && (
            <JudgesButton onClick={onOpenJudges} />
          )}
        </div>
      </header>

      {/* Email Rows Grouped by Date */}
      <div className="flex-1 overflow-y-auto" role="table">
        {emails.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-2 text-[#797981]">
            <div className="size-10 rounded-full border border-[#00000014] bg-white flex items-center justify-center text-[#797981] mb-1">
              <Mail className="size-5" />
            </div>
            <p className="font-semibold text-xs text-[#111114]">No messages found</p>
            <p className="text-[11px] text-[#797981]">
              {searchQuery ? "No messages match your search query." : "This folder is currently empty."}
            </p>
          </div>
        ) : (
          groupedEmails.map((group) => (
            <div key={group.dateLabel}>
              {/* Sticky Date Kicker Header */}
              <div className="sticky top-0 z-10 border-b border-[#00000014] bg-[#f6f6f9] px-4 py-1.5 text-[11px] font-medium text-[#797981] uppercase tracking-wider select-none">
                {group.dateLabel}
              </div>

              {/* Thread rows in this date block */}
              <div>
                {group.emails.map((email) => {
                  const isSelected = email.id === selectedEmailId;
                  const isSentFolder = folder === "sent";

                  return (
                    <div
                      key={email.id}
                      role="row"
                      tabIndex={0}
                      onClick={() => onSelectEmail(email.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectEmail(email.id);
                        }
                      }}
                      className={`group flex items-center gap-3 border-b border-[#00000014] px-4 py-2.5 transition-colors duration-150 cursor-pointer select-none ${
                        isSelected
                          ? "bg-[#e1e1e5]"
                          : email.isRead
                          ? "hover:bg-[#eeeef1]"
                          : "bg-white hover:bg-[#eeeef1]"
                      }`}
                    >
                      {/* Left: Direction Icon & Unread Dot */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Direction Arrow */}
                        {isSentFolder ? (
                          <ArrowUpRight className="size-3.5 shrink-0 text-[#005fad]" aria-label="Sent" />
                        ) : (
                          <ArrowDownLeft className="size-3.5 shrink-0 text-[#186a23]" aria-label="Received" />
                        )}

                        {/* Unread dot */}
                        <div className="w-2 flex items-center justify-center shrink-0">
                          {!email.isRead && (
                            <span className="size-1.5 rounded-full bg-[#111114]" aria-label="Unread" />
                          )}
                        </div>
                      </div>

                      {/* Sender / Recipient */}
                      <div className="w-40 sm:w-48 shrink-0 truncate">
                        <span
                          className={`text-xs truncate block ${
                            !email.isRead
                              ? "font-semibold text-[#111114]"
                              : "font-normal text-[#323237]"
                          }`}
                        >
                          {isSentFolder ? `To: ${email.toName || email.toEmail}` : email.fromName || email.fromEmail}
                        </span>
                      </div>

                      {/* Subject and Preview Text */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className={`text-xs truncate ${
                            !email.isRead
                              ? "font-semibold text-[#111114]"
                              : "font-normal text-[#161619]"
                          }`}
                        >
                          {email.subject || "(No subject)"}
                        </span>
                        <span className="text-[#797981] text-xs truncate hidden sm:inline">
                          — {email.preview}
                        </span>
                      </div>

                      {/* Right: Star and Timestamp */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {email.isStarred && (
                          <Star className="size-3.5 fill-[#916600] text-[#916600] shrink-0" />
                        )}
                        <span
                          className="text-[11px] font-mono text-[#797981] min-w-[55px] text-right"
                          title={
                            email.rawTimestamp && !isNaN(new Date(email.rawTimestamp).getTime())
                              ? new Date(email.rawTimestamp).toLocaleString()
                              : undefined
                          }
                        >
                          {email.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

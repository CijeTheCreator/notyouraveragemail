"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import EmailList from "./components/EmailList";
import EmailReader from "./components/EmailReader";
import ComposeModal from "./components/ComposeModal";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";
import { INITIAL_EMAILS } from "./mockData";
import { Email, FolderType } from "./types";

export default function MailPage() {
  const [emails, setEmails] = useState<Email[]>(INITIAL_EMAILS);
  const [activeFolder, setActiveFolder] = useState<FolderType>("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isReadingEmail, setIsReadingEmail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "starred" | "actions">("all");

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitialTo, setComposeInitialTo] = useState("");
  const [composeInitialSubject, setComposeInitialSubject] = useState("");
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Filtered emails based on folder, search query, and sub-filter
  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      // Folder check
      if (activeFolder === "action-cards") {
        if (!email.actionCard) return false;
      } else if (email.folder !== activeFolder) {
        return false;
      }

      // Sub-filter check
      if (filter === "unread" && email.isRead) return false;
      if (filter === "starred" && !email.isStarred) return false;
      if (filter === "actions" && !email.actionCard) return false;

      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = email.subject.toLowerCase().includes(q);
        const matchesSender =
          email.fromName.toLowerCase().includes(q) ||
          email.fromEmail.toLowerCase().includes(q);
        const matchesRecipient =
          email.toName.toLowerCase().includes(q) ||
          email.toEmail.toLowerCase().includes(q);
        const matchesBody = email.body.toLowerCase().includes(q);
        const matchesOtp = email.otpCode?.includes(q);
        return (
          matchesSubject ||
          matchesSender ||
          matchesRecipient ||
          matchesBody ||
          matchesOtp
        );
      }

      return true;
    });
  }, [emails, activeFolder, filter, searchQuery]);

  // Selected email object
  const selectedEmail = useMemo(() => {
    return emails.find((e) => e.id === selectedEmailId) || null;
  }, [emails, selectedEmailId]);

  // Counters
  const inboxUnreadCount = useMemo(() => {
    return emails.filter((e) => e.folder === "inbox" && !e.isRead).length;
  }, [emails]);

  const sentCount = useMemo(() => {
    return emails.filter((e) => e.folder === "sent").length;
  }, [emails]);

  const actionCardsCount = useMemo(() => {
    return emails.filter((e) => !!e.actionCard).length;
  }, [emails]);

  // Select folder handler
  const handleSelectFolder = (folder: FolderType) => {
    setActiveFolder(folder);
    setFilter("all");
    setSearchQuery("");
    setIsReadingEmail(false);
  };

  // Select email & open full reader pane
  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    setIsReadingEmail(true);
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isRead: true } : m))
    );
  };

  // Back to email list
  const handleBackToList = () => {
    setIsReadingEmail(false);
  };

  // Toggle Star
  const handleToggleStar = (id: string) => {
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isStarred: !m.isStarred } : m))
    );
  };

  // Toggle Read/Unread
  const handleToggleRead = (id: string) => {
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isRead: !m.isRead } : m))
    );
  };

  // Delete / Trash
  const handleDeleteEmail = (id: string) => {
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, folder: "trash" } : m))
    );
    if (selectedEmailId === id) {
      setIsReadingEmail(false);
    }
  };

  // Reply handler
  const handleReply = (email: Email) => {
    setComposeInitialTo(email.fromEmail);
    setComposeInitialSubject(
      email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`
    );
    setIsComposeOpen(true);
  };

  // Forward handler
  const handleForward = (email: Email) => {
    setComposeInitialTo("");
    setComposeInitialSubject(
      email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`
    );
    setIsComposeOpen(true);
  };

  // Send Email Handler
  const handleSendEmail = (data: Partial<Email>) => {
    const newMail: Email = {
      id: `mail-sent-${Date.now()}`,
      folder: "sent",
      fromName: "Alex Mercer",
      fromEmail: "alex@agentmail.to",
      toName: data.toName || data.toEmail?.split("@")[0] || "Recipient",
      toEmail: data.toEmail || "",
      subject: data.subject || "(No subject)",
      preview: data.preview || "",
      body: data.body || "",
      timestamp: "Just now",
      isRead: true,
      isStarred: false,
      tags: [{ label: "Outbound", bgColor: "#E2E8F0", textColor: "#334155" }],
    };

    setEmails((prev) => [newMail, ...prev]);
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // If user is currently typing in an input or textarea, skip global shortcuts
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") {
        if (e.key === "Escape") {
          (document.activeElement as HTMLElement)?.blur();
        }
        return;
      }

      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setComposeInitialTo("");
        setComposeInitialSubject("");
        setIsComposeOpen(true);
      } else if (e.key === "Escape") {
        if (isComposeOpen) {
          setIsComposeOpen(false);
        } else if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
        } else if (isReadingEmail) {
          setIsReadingEmail(false);
        }
      } else if (isReadingEmail) {
        // Reader shortcuts
        if (selectedEmail) {
          if (e.key === "r" || e.key === "R") {
            e.preventDefault();
            handleReply(selectedEmail);
          } else if (e.key === "f" || e.key === "F") {
            e.preventDefault();
            handleForward(selectedEmail);
          } else if (e.key === "s" || e.key === "S") {
            e.preventDefault();
            handleToggleStar(selectedEmail.id);
          } else if (e.key === "u" || e.key === "U") {
            e.preventDefault();
            handleToggleRead(selectedEmail.id);
          } else if (e.key === "e" || e.key === "E") {
            e.preventDefault();
            handleDeleteEmail(selectedEmail.id);
          }
        }
      } else {
        // List navigation shortcuts
        if (e.key === "j" || e.key === "ArrowDown") {
          e.preventDefault();
          if (filteredEmails.length > 0) {
            const currentIndex = filteredEmails.findIndex(
              (m) => m.id === selectedEmailId
            );
            const nextIndex = (currentIndex + 1) % filteredEmails.length;
            setSelectedEmailId(filteredEmails[nextIndex].id);
          }
        } else if (e.key === "k" || e.key === "ArrowUp") {
          e.preventDefault();
          if (filteredEmails.length > 0) {
            const currentIndex = filteredEmails.findIndex(
              (m) => m.id === selectedEmailId
            );
            const prevIndex =
              (currentIndex - 1 + filteredEmails.length) %
              filteredEmails.length;
            setSelectedEmailId(filteredEmails[prevIndex].id);
          }
        } else if (e.key === "Enter") {
          if (selectedEmailId) {
            e.preventDefault();
            setIsReadingEmail(true);
          }
        } else if (e.key === "/") {
          e.preventDefault();
          const searchEl = document.getElementById("mail-search-input");
          searchEl?.focus();
        } else if (e.key === "?") {
          e.preventDefault();
          setIsShortcutsOpen((prev) => !prev);
        }
      }
    },
    [
      filteredEmails,
      selectedEmailId,
      selectedEmail,
      isReadingEmail,
      isComposeOpen,
      isShortcutsOpen,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FEFBEA] text-[#2c2a29] font-sans">
      {/* Pane 1: Left Sidebar */}
      <Sidebar
        activeFolder={activeFolder}
        onSelectFolder={handleSelectFolder}
        onOpenCompose={() => {
          setComposeInitialTo("");
          setComposeInitialSubject("");
          setIsComposeOpen(true);
        }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        inboxUnreadCount={inboxUnreadCount}
        sentCount={sentCount}
        actionCardsCount={actionCardsCount}
      />

      {/* Pane 2: Main Pane (Displays Email List by default, switches to Full Email Reader on click) */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {isReadingEmail && selectedEmail ? (
          <EmailReader
            email={selectedEmail}
            onBack={handleBackToList}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            onDelete={handleDeleteEmail}
            onReply={handleReply}
            onForward={handleForward}
          />
        ) : (
          <EmailList
            folder={activeFolder}
            emails={filteredEmails}
            selectedEmailId={selectedEmailId}
            onSelectEmail={handleSelectEmail}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filter={filter}
            onFilterChange={setFilter}
          />
        )}
      </main>

      {/* Floating Compose Widget */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendEmail}
        initialTo={composeInitialTo}
        initialSubject={composeInitialSubject}
      />

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

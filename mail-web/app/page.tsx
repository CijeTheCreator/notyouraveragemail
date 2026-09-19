"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction, useMutation, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import Sidebar from "./components/Sidebar";
import EmailList from "./components/EmailList";
import EmailReader from "./components/EmailReader";
import ComposeModal from "./components/ComposeModal";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";
import SubscriptionsView from "./components/SubscriptionsView";
import DataRemovalView from "./components/DataRemovalView";
import { Email, FolderType } from "./types";
import { toast } from "sonner";

export default function MailPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  const currentUser = useQuery(
    api.messages.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );
  const activeInboxId = currentUser?.inboxId || "chijioke-6638@agentmail.to";

  // Real-time Convex messages subscription
  const dbMessages = useQuery(
    api.messages.listMessages,
    isAuthenticated ? { inboxId: activeInboxId } : "skip"
  );

  // Convex actions and mutations
  const sendEmailAction = useAction(api.agentmail.sendEmail);
  const syncInboxMessagesAction = useAction(api.agentmail.syncInboxMessages);
  const toggleStarMutation = useMutation(api.messages.toggleStar);
  const toggleReadMutation = useMutation(api.messages.toggleRead);
  const moveToTrashMutation = useMutation(api.messages.moveToTrash);

  const [isSyncing, setIsSyncing] = useState(false);

  const [activeFolder, setActiveFolder] = useState<FolderType>("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isReadingEmail, setIsReadingEmail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "starred">("all");
  const [sortBy, setSortBy] = useState<"priority" | "newest" | "oldest">("newest");

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitialTo, setComposeInitialTo] = useState("");
  const [composeInitialSubject, setComposeInitialSubject] = useState("");
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Auto-sync inbox messages from AgentMail on mount or inbox change
  useEffect(() => {
    if (isAuthenticated && activeInboxId) {
      syncInboxMessagesAction({ inboxId: activeInboxId }).catch((err) => {
        console.warn("Auto-sync AgentMail notice:", err?.message || err);
      });
    }
  }, [isAuthenticated, activeInboxId, syncInboxMessagesAction]);

  // Map real-time DB messages to frontend Email model
  const allEmails = useMemo<Email[]>(() => {
    if (!dbMessages) return [];

    return dbMessages.map((m: any) => {
      const parsedTime = m.timestamp ? new Date(m.timestamp).getTime() : NaN;
      const createdAt = !isNaN(parsedTime) ? parsedTime : (m._creationTime || 0);

      let formattedTimestamp = m.timestamp || "";
      if (m.timestamp && (m.timestamp.includes("T") || !isNaN(new Date(m.timestamp).getTime()))) {
        const date = new Date(m.timestamp);
        const now = new Date();
        const isToday =
          date.getDate() === now.getDate() &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear();

        if (isToday) {
          formattedTimestamp = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else if (date.getFullYear() === now.getFullYear()) {
          formattedTimestamp = date.toLocaleDateString([], { month: "short", day: "numeric" });
        } else {
          formattedTimestamp = date.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" });
        }
      }

      return {
        id: m._id,
        folder: m.folder as FolderType,
        fromName: m.fromName,
        fromEmail: m.fromEmail,
        toName: m.toName,
        toEmail: m.toEmail,
        subject: m.subject,
        preview: m.preview,
        body: m.body,
        htmlBody: m.htmlBody,
        timestamp: formattedTimestamp,
        rawTimestamp: m.timestamp,
        createdAt,
        isRead: m.isRead,
        isStarred: m.isStarred,
        otpCode: m.otpCode,
        senderDomain: m.senderDomain,
        trustScore: m.trustScore,
        ratingCategory: m.ratingCategory,
        priority: m.priority || "normal",
        isSuspicious: m.isSuspicious,
        actionCard: m.actionCard as any,
        tags: m.labels?.map((l: string) => ({ label: l, bgColor: "#E2E8F0", textColor: "#334155" })),
      };
    });
  }, [dbMessages]);

  // Filtered emails based on folder, search query, and sub-filter
  const filteredEmails = useMemo(() => {
    return allEmails.filter((email) => {
      // Folder check
      if (email.folder !== activeFolder) {
        return false;
      }

      // Sub-filter check
      if (filter === "unread" && email.isRead) return false;
      if (filter === "starred" && !email.isStarred) return false;

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
  }, [allEmails, activeFolder, filter, searchQuery]);

  // Sorted emails based on sortBy selection (Newest / Priority / Oldest)
  const sortedEmails = useMemo(() => {
    const list = [...filteredEmails];

    const getEmailTime = (email: Email) => {
      if (email.createdAt) return email.createdAt;
      if (email.rawTimestamp) {
        const t = new Date(email.rawTimestamp).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    };

    if (sortBy === "priority") {
      // Priority weighting: high (2) > normal (1) > low/suspicious (0)
      const getPriorityWeight = (priority?: string, suspicious?: boolean) => {
        if (suspicious || priority === "low") return 0;
        if (priority === "high") return 2;
        return 1; // normal
      };

      return list.sort((a, b) => {
        const weightA = getPriorityWeight(a.priority, a.isSuspicious);
        const weightB = getPriorityWeight(b.priority, b.isSuspicious);
        if (weightA !== weightB) {
          return weightB - weightA; // higher priority first
        }
        const diff = getEmailTime(b) - getEmailTime(a);
        if (diff !== 0) return diff;
        return (b.id || "").localeCompare(a.id || "");
      });
    } else if (sortBy === "oldest") {
      return list.sort((a, b) => {
        const diff = getEmailTime(a) - getEmailTime(b);
        if (diff !== 0) return diff;
        return (a.id || "").localeCompare(b.id || "");
      });
    } else {
      // newest first (default)
      return list.sort((a, b) => {
        const diff = getEmailTime(b) - getEmailTime(a);
        if (diff !== 0) return diff;
        return (b.id || "").localeCompare(a.id || "");
      });
    }
  }, [filteredEmails, sortBy]);

  // Selected email object
  const selectedEmail = useMemo(() => {
    return allEmails.find((e) => e.id === selectedEmailId) || null;
  }, [allEmails, selectedEmailId]);

  // Counters
  const inboxUnreadCount = useMemo(() => {
    return allEmails.filter((e) => e.folder === "inbox" && !e.isRead).length;
  }, [allEmails]);

  const sentCount = useMemo(() => {
    return allEmails.filter((e) => e.folder === "sent").length;
  }, [allEmails]);

  const subscriptionsCount = useMemo(() => {
    return allEmails.filter(
      (e) => e.actionCard?.type === "cancellation" && e.actionCard.status !== "cancelled"
    ).length;
  }, [allEmails]);

  // Select folder handler
  const handleSelectFolder = (folder: FolderType) => {
    setActiveFolder(folder);
    setFilter("all");
    setSearchQuery("");
    setIsReadingEmail(false);
  };

  // Select email & open full reader pane
  const handleSelectEmail = async (id: string) => {
    setSelectedEmailId(id);
    setIsReadingEmail(true);

    try {
      await toggleReadMutation({ id: id as any });
    } catch (err) {
      console.warn("toggleRead error:", err);
    }
  };

  // Back to email list
  const handleBackToList = () => {
    setIsReadingEmail(false);
  };

  // Toggle Star
  const handleToggleStar = async (id: string) => {
    try {
      await toggleStarMutation({ id: id as any });
    } catch (err) {
      console.warn("toggleStar error:", err);
    }
  };

  // Toggle Read/Unread
  const handleToggleRead = async (id: string) => {
    try {
      await toggleReadMutation({ id: id as any });
    } catch (err) {
      console.warn("toggleRead error:", err);
    }
  };

  // Delete / Trash
  const handleDeleteEmail = async (id: string) => {
    try {
      await moveToTrashMutation({ id: id as any });
      toast.info("Moved email to trash");
    } catch (err: any) {
      console.warn("moveToTrash error:", err);
      toast.error("Could not move email to trash", { description: err.message });
    }
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

  // Live AgentMail Send Email Handler
  const handleSendEmail = async (data: Partial<Email>) => {
    const toastId = toast.loading("Sending email via AgentMail...");
    try {
      // Dispatch real email through AgentMail API
      await sendEmailAction({
        inboxId: activeInboxId,
        to: data.toEmail || "",
        subject: data.subject || "(No subject)",
        text: data.body || "",
        fromName: currentUser?.name || currentUser?.username || "Modern Mail User",
      });
      toast.success("Email sent successfully!", { id: toastId });
    } catch (err: any) {
      console.error("Live AgentMail dispatch error:", err);
      toast.error("Failed to send email", {
        id: toastId,
        description: err.message || "Please check recipient and AgentMail status.",
      });
    }
  };

  // Sync Mail from AgentMail
  const handleSyncMail = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Syncing with AgentMail inbox...");
    try {
      const res = await syncInboxMessagesAction({ inboxId: activeInboxId });
      const count = res?.syncedCount ?? 0;
      toast.success(
        count > 0 ? `Synced ${count} email${count === 1 ? "" : "s"}!` : "Inbox is up to date!",
        { id: toastId }
      );
    } catch (err: any) {
      console.error("Sync error:", err);
      toast.error("Failed to sync emails", {
        id: toastId,
        description: err.message || "Could not retrieve messages from AgentMail.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FEFBEA] text-[#2c2a29]">
        <div className="border-2 border-[#2c2a29] bg-white p-6 brutal-shadow-left flex flex-col items-center gap-3">
          <h1 className="font-anton text-3xl tracking-wider">
            MODERN<span className="text-[#8544FA]">MAIL</span>
          </h1>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600 font-mono">
            <span className="w-2 h-2 rounded-full bg-[#8544FA] animate-ping" />
            Verifying authentication...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
        subscriptionsCount={subscriptionsCount}
        user={currentUser}
        onSignOut={() => signOut()}
      />

      {/* Pane 2: Main Pane (Email List, Full-Width Reader, or Subscriptions View) */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {isReadingEmail && selectedEmail ? (
          <EmailReader
            email={selectedEmail}
            inboxId={activeInboxId}
            onBack={handleBackToList}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            onDelete={handleDeleteEmail}
            onReply={handleReply}
            onForward={handleForward}
          />
        ) : activeFolder === "subscriptions" ? (
          <SubscriptionsView inboxId={activeInboxId} />
        ) : activeFolder === "data-removal" ? (
          <DataRemovalView inboxId={activeInboxId} />
        ) : (
          <EmailList
            folder={activeFolder}
            emails={sortedEmails}
            selectedEmailId={selectedEmailId}
            onSelectEmail={handleSelectEmail}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filter={filter}
            onFilterChange={setFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onSync={handleSyncMail}
            isSyncing={isSyncing}
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

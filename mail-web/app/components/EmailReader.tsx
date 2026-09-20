"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Reply,
  Forward,
  Star,
  Trash2,
  Mail,
  Copy,
  Check,
  Send,
  KeyRound,
} from "lucide-react";
import { Email } from "../types";
import TrustScoreBadge from "./TrustScoreBadge";
import JudgesButton from "./JudgesButton";

interface EmailReaderProps {
  email: Email | null;
  inboxId?: string;
  onBack: () => void;
  onToggleStar: (id: string) => void;
  onToggleRead: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (email: Email) => void;
  onForward: (email: Email) => void;
  onOpenJudges?: () => void;
}

export default function EmailReader({
  email,
  inboxId = "chijioke-6638@agentmail.to",
  onBack,
  onToggleStar,
  onToggleRead,
  onDelete,
  onReply,
  onForward,
  onOpenJudges,
}: EmailReaderProps) {
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [quickReplyText, setQuickReplyText] = useState("");
  const [quickReplySent, setQuickReplySent] = useState(false);

  if (!email) {
    return (
      <div className="flex-1 bg-[#fafafb] flex flex-col items-center justify-center p-8 text-center select-none font-sans">
        <div className="size-10 rounded-full border border-[#00000014] bg-white flex items-center justify-center mb-2 text-[#797981]">
          <Mail className="size-5" />
        </div>
        <h3 className="text-sm font-semibold text-[#111114] mb-1">
          No email selected
        </h3>
        <button
          onClick={onBack}
          className="mt-2 bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#161619] px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
        >
          Back to List
        </button>
      </div>
    );
  }

  const handleCopyOtp = () => {
    if (email.otpCode) {
      navigator.clipboard.writeText(email.otpCode);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  const handleSendQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReplyText.trim()) return;
    setQuickReplySent(true);
    setQuickReplyText("");
    setTimeout(() => setQuickReplySent(false), 3000);
  };

  const initials = email.fromName ? email.fromName.substring(0, 2).toUpperCase() : "EM";

  return (
    <div className="flex-1 bg-[#fafafb] flex flex-col h-screen overflow-hidden font-sans">
      {/* Top 56px Action Toolbar */}
      <header className="h-14 flex-shrink-0 border-b border-[#00000014] px-4 flex items-center justify-between gap-4 bg-[#fafafb]">
        {/* Left: Back to List Button */}
        <button
          onClick={onBack}
          className="h-8 px-2.5 bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#323237] hover:text-[#111114] text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Back to inbox (Esc)"
        >
          <ArrowLeft className="size-3.5 text-[#797981]" />
          <span>Back</span>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onReply(email)}
            className="size-8 rounded-md border border-[#00000014] bg-white hover:bg-[#f6f6f9] text-[#5a5a61] hover:text-[#111114] flex items-center justify-center transition-colors cursor-pointer"
            title="Reply (r)"
          >
            <Reply className="size-3.5" />
          </button>
          <button
            onClick={() => onForward(email)}
            className="size-8 rounded-md border border-[#00000014] bg-white hover:bg-[#f6f6f9] text-[#5a5a61] hover:text-[#111114] flex items-center justify-center transition-colors cursor-pointer"
            title="Forward (f)"
          >
            <Forward className="size-3.5" />
          </button>
          <button
            onClick={() => onToggleStar(email.id)}
            className="size-8 rounded-md border border-[#00000014] bg-white hover:bg-[#f6f6f9] text-[#5a5a61] hover:text-[#111114] flex items-center justify-center transition-colors cursor-pointer"
            title="Star (s)"
          >
            <Star
              className={`size-3.5 ${
                email.isStarred ? "fill-[#916600] text-[#916600]" : "text-[#797981]"
              }`}
            />
          </button>
          <button
            onClick={() => onToggleRead(email.id)}
            className="size-8 rounded-md border border-[#00000014] bg-white hover:bg-[#f6f6f9] text-[#5a5a61] hover:text-[#111114] flex items-center justify-center transition-colors cursor-pointer"
            title={email.isRead ? "Mark as unread" : "Mark as read"}
          >
            <Mail className="size-3.5 text-[#797981]" />
          </button>
          <button
            onClick={() => onDelete(email.id)}
            className="size-8 rounded-md border border-[#00000014] bg-white hover:bg-[#fef2f2] text-[#5a5a61] hover:text-[#be222a] flex items-center justify-center transition-colors cursor-pointer"
            title="Move to Trash"
          >
            <Trash2 className="size-3.5" />
          </button>

          {/* For Judges Button */}
          {onOpenJudges && (
            <JudgesButton onClick={onOpenJudges} className="ml-1" />
          )}
        </div>
      </header>

      {/* Main Rendered Email View Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-5 bg-white border border-[#00000014] rounded-lg p-6 md:p-8 shadow-xs">
          {/* Email Subject Title */}
          <div className="border-b border-[#00000014] pb-4">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-[#111114] leading-snug mb-3">
              {email.subject || "(No subject)"}
            </h1>

            {/* Tags */}
            {email.tags && email.tags.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                {email.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="border border-[#00000014] text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f6f6f9] text-[#323237]"
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            )}

            {/* Sender & Recipient Metadata Card */}
            <div className="flex items-start justify-between gap-4 pt-1">
              <div className="flex items-start gap-3 min-w-0">
                <div className="size-8 rounded-full bg-[#111114] text-[#fafafb] font-medium text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-[#111114]">
                      {email.fromName || "Unknown Sender"}
                    </span>
                    <span className="text-[11px] text-[#797981] font-mono">
                      &lt;{email.fromEmail}&gt;
                    </span>
                    <TrustScoreBadge
                      domain={email.senderDomain || (email.fromEmail.includes("@") ? email.fromEmail.split("@")[1] : undefined)}
                      trustScore={email.trustScore}
                      ratingCategory={email.ratingCategory}
                      isSuspicious={email.isSuspicious}
                    />
                  </div>
                  <div className="text-[11px] text-[#5a5a61] mt-0.5">
                    To: <span className="font-medium text-[#161619]">{email.toName}</span>{" "}
                    <span className="font-mono text-[#797981]">&lt;{email.toEmail}&gt;</span>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-[11px] font-mono text-[#797981] shrink-0 text-right">
                {email.rawTimestamp && !isNaN(new Date(email.rawTimestamp).getTime())
                  ? new Date(email.rawTimestamp).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : email.timestamp}
              </div>
            </div>
          </div>

          {/* OTP Passcode Detected Callout */}
          {email.otpCode && (
            <div className="bg-[#f6f6f9] border border-[#00000014] p-3.5 rounded-lg flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-md bg-[#111114] text-white flex items-center justify-center shrink-0">
                  <KeyRound className="size-3.5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#111114] block">
                    One-Time Passcode Detected
                  </span>
                  <p className="text-[11px] text-[#797981]">
                    Synced via AgentMail to your desktop companion
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="bg-white border border-[#00000014] px-3 py-1 font-mono text-base font-semibold tracking-widest text-[#111114] rounded-md shadow-xs">
                  {email.otpCode}
                </div>
                <button
                  onClick={handleCopyOtp}
                  className="bg-[#111114] text-[#fafafb] hover:bg-black px-2.5 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedOtp ? (
                    <>
                      <Check className="size-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Email Body: Rendered View */}
          <div className="leading-relaxed text-xs sm:text-sm text-[#161619] whitespace-pre-line min-h-[200px] py-2">
            {email.body}
          </div>

          {/* Quick Reply Form */}
          <div className="border-t border-[#00000014] pt-4">
            <form
              onSubmit={handleSendQuickReply}
              className="bg-[#f6f6f9] border border-[#00000014] rounded-md p-1.5 flex items-center gap-2 focus-within:border-[#111114]/40 focus-within:bg-white transition-all"
            >
              <input
                type="text"
                placeholder={`Reply to ${email.fromName || "sender"}...`}
                value={quickReplyText}
                onChange={(e) => setQuickReplyText(e.target.value)}
                className="flex-1 text-xs bg-transparent outline-none px-2 font-sans text-[#161619] placeholder:text-[#797981]"
              />
              <button
                type="submit"
                className="bg-[#111114] text-[#fafafb] hover:bg-black px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="size-3" />
                <span>Send</span>
              </button>
            </form>

            {quickReplySent && (
              <div className="mt-2 text-xs bg-[#f0fdf4] border border-[#bbf7d0] text-[#186a23] px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <Check className="size-3.5" />
                Reply sent and synchronized to Sent!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

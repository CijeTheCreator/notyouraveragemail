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
  Sparkles,
  Zap,
  Clock,
  Send,
} from "lucide-react";
import { Email } from "../types";

interface EmailReaderProps {
  email: Email | null;
  onBack: () => void;
  onToggleStar: (id: string) => void;
  onToggleRead: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (email: Email) => void;
  onForward: (email: Email) => void;
}

export default function EmailReader({
  email,
  onBack,
  onToggleStar,
  onToggleRead,
  onDelete,
  onReply,
  onForward,
}: EmailReaderProps) {
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [actionApproved, setActionApproved] = useState(false);
  const [quickReplyText, setQuickReplyText] = useState("");
  const [quickReplySent, setQuickReplySent] = useState(false);

  if (!email) {
    return (
      <div className="flex-1 bg-[#FEFBEA] flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-14 h-14 rounded-full border-2 border-[#2c2a29] bg-[#D0B4FF] flex items-center justify-center brutal-shadow mb-3">
          <Mail className="w-7 h-7 text-[#2c2a29]" />
        </div>
        <h3 className="font-anton text-2xl text-[#2c2a29] tracking-wide mb-1">
          NO EMAIL SELECTED
        </h3>
        <button
          onClick={onBack}
          className="brutal-btn bg-white px-4 py-2 text-xs font-bold mt-2"
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

  const handleApproveAction = () => {
    setActionApproved(true);
  };

  const handleSendQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReplyText.trim()) return;
    setQuickReplySent(true);
    setQuickReplyText("");
    setTimeout(() => setQuickReplySent(false), 3000);
  };

  return (
    <div className="flex-1 bg-[#FEFBEA] flex flex-col h-screen overflow-hidden">
      {/* Top Action Bar */}
      <div className="p-3.5 border-b-2 border-[#2c2a29] bg-white/70 flex items-center justify-between gap-4">
        {/* Left: Back to list button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="brutal-btn bg-white hover:bg-gray-100 p-2 text-[#2c2a29] flex items-center gap-1.5 text-xs font-bold"
            title="Back to inbox (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>

        {/* Right: Icon-only Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReply(email)}
            className="brutal-btn bg-white hover:bg-[#D0B4FF] p-2 text-[#2c2a29]"
            title="Reply (r)"
          >
            <Reply className="w-4 h-4" />
          </button>
          <button
            onClick={() => onForward(email)}
            className="brutal-btn bg-white hover:bg-[#D0B4FF] p-2 text-[#2c2a29]"
            title="Forward (f)"
          >
            <Forward className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleStar(email.id)}
            className={`brutal-btn p-2 ${
              email.isStarred ? "bg-amber-100 text-amber-900" : "bg-white hover:bg-gray-50 text-gray-600"
            }`}
            title="Star (s)"
          >
            <Star
              className={`w-4 h-4 ${
                email.isStarred ? "fill-amber-400 text-amber-500" : ""
              }`}
            />
          </button>
          <button
            onClick={() => onToggleRead(email.id)}
            className="brutal-btn bg-white hover:bg-gray-50 p-2 text-gray-700"
            title={email.isRead ? "Mark as unread (u)" : "Mark as read (u)"}
          >
            <Mail className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(email.id)}
            className="brutal-btn bg-white hover:bg-red-100 p-2 text-red-600"
            title="Delete to Trash (e)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Email Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6 max-w-4xl mx-auto w-full">
        {/* Email Header */}
        <div className="border-b-2 border-[#2c2a29] pb-5">
          <h1 className="font-anton text-3xl md:text-4xl tracking-wide text-[#2c2a29] leading-tight mb-3">
            {email.subject}
          </h1>

          {/* Tags */}
          {email.tags && email.tags.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {email.tags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{ backgroundColor: tag.bgColor, color: tag.textColor }}
                  className="border border-[#2c2a29] text-xs font-bold px-2 py-0.5 rounded brutal-shadow-sm"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* Sender & Recipient Card */}
          <div className="flex items-center justify-between bg-white border-2 border-[#2c2a29] p-3.5 brutal-shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#8544FA] text-[#FEFBEA] font-anton flex items-center justify-center border-2 border-[#2c2a29] text-base">
                {email.fromName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#2c2a29]">{email.fromName}</span>
                  <span className="text-xs text-gray-500 font-mono">&lt;{email.fromEmail}&gt;</span>
                </div>
                <div className="text-xs text-gray-600 font-sans">
                  To: <span className="font-medium text-black">{email.toName}</span> &lt;
                  {email.toEmail}&gt;
                </div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-gray-500">
              {email.timestamp}
            </div>
          </div>
        </div>

        {/* OTP Companion Banner */}
        {email.otpCode && (
          <div className="bg-[#FED7AA] border-2 border-[#2c2a29] p-4 brutal-shadow flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#EA580C] text-white border-2 border-[#2c2a29] flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <span className="font-anton text-base tracking-wide text-[#9A3412] block">
                  ONE-TIME PASSCODE DETECTED
                </span>
                <p className="text-xs text-[#7C2D12] font-sans">
                  Synced via AgentMail to your desktop companion.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white border-2 border-[#2c2a29] px-4 py-1.5 font-mono text-2xl font-black tracking-widest text-[#2c2a29] brutal-shadow-sm">
                {email.otpCode}
              </div>
              <button
                onClick={handleCopyOtp}
                className="brutal-btn bg-[#2c2a29] text-white hover:bg-black px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                {copiedOtp ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>COPY</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* AI Action Card Banner */}
        {email.actionCard && (
          <div className="bg-[#FEF08A] border-2 border-[#2c2a29] p-5 brutal-shadow flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#2c2a29]/30 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#8544FA]" />
                <span className="font-anton text-lg tracking-wide text-[#854D0E]">
                  AI ACTION: {email.actionCard.type.toUpperCase()}
                </span>
              </div>
              {email.actionCard.autoTriggerDays && (
                <div className="flex items-center gap-1 text-xs font-bold text-[#854D0E] bg-white/70 px-2 py-0.5 border border-[#2c2a29] rounded">
                  <Clock className="w-3.5 h-3.5" />
                  Auto-triggers in {email.actionCard.autoTriggerDays}d
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white border border-[#2c2a29] p-2.5">
                <span className="text-gray-500 font-bold block mb-0.5">TARGET</span>
                <span className="font-anton text-base text-[#2c2a29]">
                  {email.actionCard.service}
                </span>
              </div>
              {email.actionCard.costMonthly && (
                <div className="bg-white border border-[#2c2a29] p-2.5">
                  <span className="text-gray-500 font-bold block mb-0.5">EST. SAVINGS</span>
                  <span className="font-anton text-base text-red-600">
                    {email.actionCard.costMonthly}
                  </span>
                </div>
              )}
              <div className="bg-white border border-[#2c2a29] p-2.5 sm:col-span-2">
                <span className="text-gray-500 font-bold block mb-0.5">RECOMMENDED ACTION</span>
                <span className="font-sans text-gray-800">
                  {email.actionCard.recommendedAction}
                </span>
              </div>
            </div>

            {actionApproved ? (
              <div className="bg-emerald-100 border-2 border-emerald-600 p-3 flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <Check className="w-5 h-5 text-emerald-600" />
                Workflow scheduled in Convex!
              </div>
            ) : (
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleApproveAction}
                  className="button-primary bg-[#8544FA] text-[#FEFBEA] px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-[#7330ea]"
                >
                  <Zap className="w-4 h-4" />
                  APPROVE WORKFLOW
                </button>
                <button
                  onClick={() => alert("Action dismissed")}
                  className="brutal-btn bg-white hover:bg-gray-100 text-gray-700 px-3 py-2 text-sm font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {/* Email Content */}
        <div className="bg-white border-2 border-[#2c2a29] p-6 brutal-shadow-sm leading-relaxed font-sans text-[#2c2a29] text-sm whitespace-pre-line min-h-[220px]">
          {email.body}
        </div>

        {/* Quick Reply Form */}
        <form
          onSubmit={handleSendQuickReply}
          className="border-2 border-[#2c2a29] bg-white p-3 brutal-shadow-sm flex items-center gap-3"
        >
          <input
            type="text"
            placeholder={`Reply to ${email.fromName}...`}
            value={quickReplyText}
            onChange={(e) => setQuickReplyText(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none font-sans"
          />
          <button
            type="submit"
            className="brutal-btn bg-[#8544FA] text-[#FEFBEA] px-4 py-2 text-xs font-bold flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>

        {quickReplySent && (
          <div className="text-xs bg-emerald-100 border border-emerald-600 text-emerald-800 px-3 py-1.5 font-bold flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            Reply sent and synchronized to Sent!
          </div>
        )}
      </div>
    </div>
  );
}

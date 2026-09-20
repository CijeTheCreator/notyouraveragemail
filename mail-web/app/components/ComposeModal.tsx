"use client";

import React, { useState } from "react";
import {
  X,
  Minus,
  Paperclip,
  Send,
  Sparkles,
  Calendar,
  Trash2,
} from "lucide-react";
import { Email } from "../types";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: Partial<Email>) => void;
  initialTo?: string;
  initialSubject?: string;
}

export default function ComposeModal({
  isOpen,
  onClose,
  onSend,
  initialTo = "",
  initialSubject = "",
}: ComposeModalProps) {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) {
      alert("Please specify a recipient email address.");
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      onSend({
        toName: to.split("@")[0],
        toEmail: to,
        subject: subject || "(No subject)",
        body: body || "",
        preview: body.slice(0, 100) || "",
      });
      setIsSending(false);
      setTo("");
      setSubject("");
      setBody("");
      onClose();
    }, 600);
  };

  return (
    <div className="fixed bottom-4 right-6 z-50 w-full max-w-lg bg-white border border-[#00000014] rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans">
      {/* Compose Header */}
      <div className="bg-[#fafafb] px-4 py-2.5 border-b border-[#00000014] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#111114]">New Message</span>
          <span className="text-[10px] bg-black/5 text-[#797981] px-1.5 py-0.5 rounded font-mono">
            AgentMail
          </span>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-[#0000000a] rounded text-[#797981] hover:text-[#111114] transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus className="size-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#0000000a] rounded text-[#797981] hover:text-[#be222a] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Body / Form (Collapsible when minimized) */}
      {!isMinimized && (
        <form onSubmit={handleSubmit} className="flex flex-col bg-white">
          {/* Recipient */}
          <div className="flex items-center border-b border-[#0000000a] px-4 py-2 text-xs">
            <span className="w-16 font-medium text-[#797981]">To:</span>
            <input
              type="email"
              required
              placeholder="recipient@domain.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 outline-none text-xs font-sans text-[#161619] placeholder:text-[#797981]"
            />
          </div>

          {/* Subject */}
          <div className="flex items-center border-b border-[#0000000a] px-4 py-2 text-xs">
            <span className="w-16 font-medium text-[#797981]">Subject:</span>
            <input
              type="text"
              placeholder="Subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 outline-none text-xs font-sans text-[#161619] placeholder:text-[#797981]"
            />
          </div>

          {/* Message Body */}
          <div className="p-4 flex-1">
            <textarea
              rows={8}
              placeholder="Write your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full h-full resize-none outline-none text-xs sm:text-sm font-sans leading-relaxed text-[#161619] placeholder:text-[#797981]"
            />
          </div>

          {/* Bottom Toolbar & Send Button */}
          <div className="p-3 bg-[#fafafb] border-t border-[#00000014] flex items-center justify-between gap-3">
            {/* Action Tools */}
            <div className="flex items-center gap-1 text-[#797981]">
              <button
                type="button"
                className="p-1.5 hover:bg-[#0000000a] hover:text-[#111114] rounded transition-colors cursor-pointer"
                title="Attach files"
              >
                <Paperclip className="size-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-[#0000000a] hover:text-[#111114] rounded transition-colors cursor-pointer"
                title="AI Assist Drafting"
              >
                <Sparkles className="size-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-[#0000000a] hover:text-[#111114] rounded transition-colors cursor-pointer"
                title="Schedule Send"
              >
                <Calendar className="size-3.5" />
              </button>
            </div>

            {/* Send & Trash Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#797981] hover:text-[#be222a] rounded transition-colors cursor-pointer"
                title="Discard Draft"
              >
                <Trash2 className="size-3.5" />
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="bg-[#111114] text-[#fafafb] hover:bg-black px-4 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSending ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send className="size-3" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

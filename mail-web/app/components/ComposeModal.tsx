"use client";

import React, { useState } from "react";
import {
  X,
  Minus,
  Maximize2,
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
    <div className="fixed bottom-4 right-6 z-50 w-full max-w-xl bg-[#FEFBEA] border-3 border-[#2c2a29] brutal-shadow-left overflow-hidden flex flex-col font-sans">
      {/* Compose Header */}
      <div className="bg-[#8544FA] text-[#FEFBEA] px-4 py-2.5 border-b-2 border-[#2c2a29] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className="font-anton text-lg tracking-wider">NEW MESSAGE</span>
          <span className="text-[10px] bg-[#2c2a29] text-white px-1.5 py-0.2 rounded font-mono font-bold">
            AgentMail Dispatch
          </span>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-black/20 rounded transition-colors text-white"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500 rounded transition-colors text-white"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body / Form (Collapsible when minimized) */}
      {!isMinimized && (
        <form onSubmit={handleSubmit} className="flex flex-col bg-white">
          {/* Recipient */}
          <div className="flex items-center border-b border-[#2c2a29]/20 px-4 py-2 text-xs">
            <span className="w-16 font-bold text-gray-500 uppercase tracking-wider">To:</span>
            <input
              type="email"
              required
              placeholder="recipient@domain.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 outline-none text-sm font-sans"
            />
          </div>

          {/* Subject */}
          <div className="flex items-center border-b border-[#2c2a29]/20 px-4 py-2 text-xs">
            <span className="w-16 font-bold text-gray-500 uppercase tracking-wider">Subject:</span>
            <input
              type="text"
              placeholder="What is this regarding?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 outline-none text-sm font-sans font-medium"
            />
          </div>

          {/* Message Body */}
          <div className="p-4 flex-1">
            <textarea
              rows={8}
              placeholder="Write your email here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full h-full resize-none outline-none text-sm font-sans leading-relaxed text-[#2c2a29]"
            />
          </div>

          {/* Bottom Toolbar & Send Button */}
          <div className="p-3 bg-[#FEFBEA] border-t-2 border-[#2c2a29] flex items-center justify-between gap-3">
            {/* Action Tools */}
            <div className="flex items-center gap-1.5 text-gray-600">
              <button
                type="button"
                className="p-1.5 hover:bg-white hover:border border-[#2c2a29] rounded transition-all"
                title="Attach files"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-white hover:border border-[#2c2a29] rounded transition-all text-[#8544FA]"
                title="AI Assist Drafting"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-white hover:border border-[#2c2a29] rounded transition-all"
                title="Schedule Send (send_at)"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>

            {/* Send & Trash Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-red-600 rounded transition-colors"
                title="Discard Draft"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="button-primary bg-[#8544FA] text-[#FEFBEA] px-5 py-2 text-sm font-bold flex items-center gap-2 hover:bg-[#7330ea] disabled:opacity-50"
              >
                {isSending ? (
                  <span>SENDING...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>SEND</span>
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

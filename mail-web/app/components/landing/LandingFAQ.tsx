"use client";

import React, { useState } from "react";
import { CornerBrackets } from "./FirecrawlPrimitives";
import { Plus, Minus } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "How does the subscription cancellation agent work?",
    answer:
      "Cancel in one click. NotYourAverageMail finds and collates your subscriptions so you can track them all in one place without connecting your bank. When you’re ready to cancel, click the cancel button and Firecrawl navigates the cancellation process for you.",
  },
  {
    question: "How does the Data Broker removal feature protect my privacy?",
    answer:
      "Data brokers collect and resell personal information like your contact details. NotYourAverageMail finds your information across hundreds of data brokers and, with your approval, sends opt-out requests on your behalf. It handles confirmation emails and uses Firecrawl to complete opt-out forms when needed, helping remove your information from data broker databases.",
  },
  {
    question: "What is Know Your Sender?",
    answer:
      "Whenever a company sends you an email, NotYourAverageMail identifies the business and uses Firecrawl to check Trustpilot in real time. You’ll see a rating badge right beside the sender, showing their star rating, review count, and complaint signals such as scam warnings or billing disputes.",
  },
  {
    question: "How does MailBuddy work?",
    answer:
      "Inspired by Clicky (YC), MailBuddy is a lightweight native macOS app that lives beside your cursor. When a 2FA code arrives, MailBuddy finds it and types it into the active verification field for you. Select any document or content in Figma, Pages, or your browser and press ⌘⇧M to draft an email, or hold Control + Option (⌃⌥) to dictate one with streaming voice input.",
  },
];

function formatBrandText(text: string): React.ReactNode {
  if (!text.includes("NotYourAverageMail")) return text;
  const parts = text.split("NotYourAverageMail");
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {i > 0 && (
        <span>
          <strong className="font-bold text-[#111114]">NotYourAverage</strong>Mail
        </span>
      )}
      {part}
    </React.Fragment>
  ));
}

export default function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="qypa"
      className="max-w-7xl mx-auto border-x border-black/[0.08] relative -mt-1 bg-white select-none scroll-mt-16"
    >
      {/* Top and Bottom Horizontal Divider Lines */}
      <div className="h-1 top-0 left-0 w-full bg-black/[0.08] absolute" />
      <div className="h-1 bottom-0 left-0 w-full bg-black/[0.08] absolute" />
      <CornerBrackets strokeColor="text-black/[0.12]" />

      <div className="p-8 sm:p-12 lg:p-16 relative">
        <CornerBrackets strokeColor="text-black/[0.06]" />

        <div className="max-w-3xl mb-12">
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#797981] mb-3">
            QYPA
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111114] leading-[1.1] mb-4">
            Questions You Are Probably Asking
          </h2>

          <p className="text-sm sm:text-base text-[#5a5a61] leading-relaxed max-w-2xl font-normal">
            Everything you need to know about{" "}
            <strong className="font-bold text-[#111114]">NotYourAverage</strong>Mail and MailBuddy.
          </p>
        </div>

        {/* Accordion List */}
        <div className="border-t border-black/[0.08] divide-y divide-black/[0.08]">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question} className="relative transition-colors">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full py-6 flex items-center justify-between gap-4 text-left transition-colors group cursor-pointer"
                >
                  <span className="text-base sm:text-lg font-semibold tracking-tight text-[#111114] group-hover:text-black">
                    {faq.question}
                  </span>
                  <span className="size-6 rounded-full border border-black/[0.1] bg-[#fafafb] group-hover:bg-black group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                    {isOpen ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="pb-6 pr-12 text-xs sm:text-sm text-[#5a5a61] leading-relaxed font-normal">
                    {formatBrandText(faq.answer)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

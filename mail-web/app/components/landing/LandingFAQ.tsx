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
      "When recurring bills or invoices hit your inbox, our agent identifies the subscription. It deploys an autonomous Firecrawl browser agent to log in, navigate the cancellation screens, decline the guilt-trip retention offers, confirm the cancellation, and return clear screenshot proof directly to your mailbox.",
  },
  {
    question: "How does the Data Broker removal feature protect my privacy?",
    answer:
      "Data brokers quietly scrape public records and resell your contact details. NotYourAverageMail indexes hundreds of data brokers, automates formal legal opt-out requests, automatically replies to confirmation emails, and interacts with opt-out forms via Firecrawl so your private records are wiped.",
  },
  {
    question: "What is Trust Intelligence?",
    answer:
      "Whenever a company sends you an email, we extract their business domain and scrape TrustPilot in real time. You will see a verified rating badge right beside the sender's address showing their star score, total review count, and complaint signals (such as scam warnings or billing disputes).",
  },
  {
    question: "How does the Desktop Companion work?",
    answer:
      "Inspired by Clicky (YC), our companion is a lightweight native macOS app living beside your cursor. OTP Buddy detects incoming 2FA verification codes and automatically types the digits into the active field on your screen. You can also select any document in Figma, Pages, or your browser and press ⌘⇧M to draft an email, or hold Control + Option (⌃⌥) for streaming voice dictation.",
  },
];

export default function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="qyfpa"
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
            QYFPA
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111114] leading-[1.1] mb-4">
            Questions You Are Probably Asking
          </h2>

          <p className="text-sm sm:text-base text-[#5a5a61] leading-relaxed max-w-2xl font-normal">
            Everything you need to know about our autonomous agents, screenshot proof, and desktop
            companion security.
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
                    {faq.answer}
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

import React from "react";
import { KeyRound, FileText, Mic, Laptop, ExternalLink } from "lucide-react";

export default function DesktopCompanionSection() {
  const companionCapabilities = [
    {
      title: "OTP Buddy",
      subtitle: "Zero-Click 2FA Auto-Fill",
      shortcut: "Auto-Fill",
      icon: <KeyRound className="size-4 text-[#111114]" />,
      description:
        "When an OTP or 2FA verification code arrives in your mailbox, the companion intercepts it instantly, locates the input field on your active screen, and types the digits directly without switching apps.",
      detail: "No tab switching, no copy-pasting numbers.",
    },
    {
      title: "Contextual Drafting",
      subtitle: "System-Wide Selection",
      shortcut: "⌘⇧M",
      icon: <FileText className="size-4 text-[#111114]" />,
      description:
        "Draft context-aware emails straight from Pages, Figma, Keynote, or your web browser. Select any file or document and press ⌘⇧M. Firecrawl automatically scouts the web for recipient contact information.",
      detail: "Synthesizes document context into structured mail.",
    },
    {
      title: "Voice Push-To-Talk",
      subtitle: "Streaming Voice-to-Email",
      shortcut: "⌃⌥",
      icon: <Mic className="size-4 text-[#111114]" />,
      description:
        "Hold Control + Option anywhere across macOS and speak naturally. Real-time streaming voice dictation translates your thoughts into polished, professional drafts ready for review or immediate delivery.",
      detail: "Hands-free email creation while multitasking.",
    },
  ];

  return (
    <section id="companion" className="py-20 md:py-28 bg-[#fafafb] border-t border-black/[0.06] scroll-mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#797981] mb-2.5">
            macOS Companion · Ambient Intelligence
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#111114] leading-tight mb-4">
            An ambient assistant living beside your cursor.
          </h2>
          <p className="text-sm sm:text-base text-[#5a5a61] leading-relaxed">
            Inspired by Clicky (YC), the companion is a lightweight native macOS app that bridges your active screen
            with your mailbox—listening for global shortcuts, auto-filling authentication codes, and dictating drafts.
          </p>
        </div>

        {/* 3 Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {companionCapabilities.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-black/[0.08] bg-white p-6 flex flex-col justify-between hover:border-black/[0.18] transition-all hover:shadow-xs group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="size-8 rounded-md bg-[#fafafb] border border-black/[0.08] flex items-center justify-center">
                    {item.icon}
                  </div>
                  <kbd className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#f6f6f9] border border-black/[0.08] text-[#111114]">
                    {item.shortcut}
                  </kbd>
                </div>

                <h3 className="text-base font-semibold text-[#111114] tracking-tight mb-1 group-hover:text-black transition-colors">
                  {item.title}
                </h3>
                <div className="text-[11px] font-mono text-[#797981] mb-3">
                  {item.subtitle}
                </div>

                <p className="text-xs text-[#5a5a61] leading-relaxed mb-6">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 border-t border-black/[0.06] text-[11px] text-[#797981] font-mono">
                {item.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

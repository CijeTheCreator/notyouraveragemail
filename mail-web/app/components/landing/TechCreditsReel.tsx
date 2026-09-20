import React from "react";

export default function TechCreditsReel() {
  const technologies = [
    {
      name: "OpenAI",
      role: "LLM Orchestration & Vision",
      icon: (
        <svg
          className="size-5 text-[#111114]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Z" />
          <path d="m9.5 9 5 3-5 3V9Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: "Firecrawl",
      role: "Web Extraction & Agent Automation",
      icon: (
        <svg
          className="size-5 text-[#111114]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      ),
    },
    {
      name: "AgentMail",
      role: "Programmable Inboxes & Webhooks",
      icon: (
        <svg
          className="size-5 text-[#111114]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="16" x="2" y="4" rx="3" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
    {
      name: "Convex",
      role: "Reactive Database & Realtime Sync",
      icon: (
        <svg
          className="size-5 text-[#111114]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4" />
          <path d="M4 12a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4" />
          <path d="M4 18a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-12 border-y border-black/[0.06] bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <p className="text-center text-[11px] font-mono tracking-wider uppercase text-[#797981] mb-8">
          Powered By Next-Gen Infrastructure & AI
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-center">
          {technologies.map((tech) => (
            <div
              key={tech.name}
              className="flex items-center gap-3 p-3 rounded-lg border border-black/[0.05] bg-[#fafafb] hover:bg-black/[0.02] hover:border-black/[0.1] transition-all group"
            >
              <div className="size-8 rounded-md bg-white border border-black/[0.08] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                {tech.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#111114] tracking-tight truncate">
                  {tech.name}
                </div>
                <div className="text-[10px] text-[#797981] truncate">
                  {tech.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import React from "react";

export function CornerBrackets({
  className = "",
  strokeColor = "text-black/[0.12]",
}: {
  className?: string;
  strokeColor?: string;
}) {
  return (
    <div className={`overlay pointer-events-none contain-[layout,paint] curvy-rect ${className}`}>
      {/* Top Left */}
      <svg
        fill="none"
        height="11"
        viewBox="0 0 11 11"
        width="11"
        xmlns="http://www.w3.org/2000/svg"
        className={`-rotate-90 absolute top-0 left-0 ${strokeColor}`}
      >
        <path
          d="M11 1L11 11L10 11L10 7C10 3.68629 7.31371 1 4 1L-4.37114e-08 1L0 -4.80825e-07L11 4.37114e-07L11 1Z"
          fill="currentColor"
        />
      </svg>

      {/* Top Right */}
      <svg
        fill="none"
        height="11"
        viewBox="0 0 11 11"
        width="11"
        xmlns="http://www.w3.org/2000/svg"
        className={`absolute top-0 right-0 ${strokeColor}`}
      >
        <path
          d="M11 1L11 11L10 11L10 7C10 3.68629 7.31371 1 4 1L-4.37114e-08 1L0 -4.80825e-07L11 4.37114e-07L11 1Z"
          fill="currentColor"
        />
      </svg>

      {/* Bottom Left */}
      <svg
        fill="none"
        height="11"
        viewBox="0 0 11 11"
        width="11"
        xmlns="http://www.w3.org/2000/svg"
        className={`rotate-180 absolute bottom-0 left-0 ${strokeColor}`}
      >
        <path
          d="M11 1L11 11L10 11L10 7C10 3.68629 7.31371 1 4 1L-4.37114e-08 1L0 -4.80825e-07L11 4.37114e-07L11 1Z"
          fill="currentColor"
        />
      </svg>

      {/* Bottom Right */}
      <svg
        fill="none"
        height="11"
        viewBox="0 0 11 11"
        width="11"
        xmlns="http://www.w3.org/2000/svg"
        className={`rotate-90 absolute bottom-0 right-0 ${strokeColor}`}
      >
        <path
          d="M11 1L11 11L10 11L10 7C10 3.68629 7.31371 1 4 1L-4.37114e-08 1L0 -4.80825e-07L11 4.37114e-07L11 1Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export function CrosshairNotch({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none contain-[layout,paint] text-black/[0.12] ${className}`}
      fill="none"
      height="21"
      viewBox="0 0 22 21"
      width="22"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.5 4C10.5 7.31371 7.81371 10 4.5 10H0.5V11H4.5C7.81371 11 10.5 13.6863 10.5 17V21H11.5V17C11.5 13.6863 14.1863 11 17.5 11H21.5V10H17.5C14.1863 10 11.5 7.31371 11.5 4V0H10.5V4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MonospaceTag({
  tag,
  title,
}: {
  tag: string;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[11px] font-mono tracking-wider uppercase text-[#797981] flex items-center gap-1.5">
        {tag}
      </span>
      {title && (
        <span className="text-xs text-[#5a5a61] font-mono">· {title}</span>
      )}
    </div>
  );
}

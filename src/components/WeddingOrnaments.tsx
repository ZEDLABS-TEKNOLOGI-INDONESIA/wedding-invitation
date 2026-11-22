import React from "react";

export const SectionDivider: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div
    aria-hidden="true"
    className={`flex items-center justify-center gap-3 ${className}`}
  >
    <span className="from-transparent via-accentDark/40 to-accentDark/60 dark:via-accent/40 dark:to-accent/60 h-[1px] w-12 bg-gradient-to-r md:w-20" />
    <svg
      viewBox="0 0 48 16"
      className="text-accentDark/70 dark:text-accent/70 h-3.5 w-10 shrink-0"
      fill="none"
    >
      <path
        d="M24 2 L28 8 L24 14 L20 8 Z"
        fill="currentColor"
        fillOpacity="0.85"
      />
      <path
        d="M16 8 C12 4, 6 4, 2 8 C6 12, 12 12, 16 8 Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <path
        d="M32 8 C36 4, 42 4, 46 8 C42 12, 36 12, 32 8 Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="currentColor"
        fillOpacity="0.18"
      />
    </svg>
    <span className="from-transparent via-accentDark/40 to-accentDark/60 dark:via-accent/40 dark:to-accent/60 h-[1px] w-12 bg-gradient-to-l md:w-20" />
  </div>
);

export const CornerFiligree: React.FC<{
  position: "tl" | "tr" | "bl" | "br";
  className?: string;
}> = ({ position, className = "" }) => {
  const posClass = {
    tl: "top-3 left-3",
    tr: "top-3 right-3 -scale-x-100",
    bl: "bottom-3 left-3 -scale-y-100",
    br: "bottom-3 right-3 -scale-x-100 -scale-y-100",
  }[position];

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      className={`text-accentDark/35 dark:text-accent/30 pointer-events-none absolute h-10 w-10 md:h-12 md:w-12 ${posClass} ${className}`}
    >
      <path
        d="M4 60 V18 C4 10 10 4 18 4 H60"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M10 46 V20 C10 14 14 10 20 10 H46"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeOpacity="0.6"
      />
      <circle cx="14" cy="14" r="2.2" fill="currentColor" fillOpacity="0.7" />
    </svg>
  );
};

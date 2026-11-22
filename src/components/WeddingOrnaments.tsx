import React from "react";

export const SectionDivider: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div
    aria-hidden="true"
    className={`flex items-center justify-center gap-3 ${className}`}
  >
    <span className="from-transparent via-accentDark/35 to-accentDark/55 dark:via-accent/35 dark:to-accent/55 h-[1px] w-12 bg-gradient-to-r md:w-20" />
    <svg
      viewBox="0 0 48 16"
      className="text-accentDark/65 dark:text-accent/65 h-3.5 w-10 shrink-0"
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
        fillOpacity="0.16"
      />
      <path
        d="M32 8 C36 4, 42 4, 46 8 C42 12, 36 12, 32 8 Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="currentColor"
        fillOpacity="0.16"
      />
    </svg>
    <span className="from-transparent via-accentDark/35 to-accentDark/55 dark:via-accent/35 dark:to-accent/55 h-[1px] w-12 bg-gradient-to-l md:w-20" />
  </div>
);

/** Tanda air botani ultra-halus di tepi seksi agar menyatu tanpa mengganggu teks. */
export const BotanicalWatermark: React.FC<{
  side?: "left" | "right";
  className?: string;
}> = ({ side = "right", className = "" }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 220 260"
    fill="none"
    className={`text-accentDark/[0.055] dark:text-accent/[0.055] pointer-events-none absolute top-1/2 h-52 w-44 -translate-y-1/2 select-none md:h-72 md:w-60 ${
      side === "left"
        ? "-left-12 -scale-x-100 md:-left-4"
        : "-right-12 md:-right-4"
    } ${className}`}
  >
    <path
      d="M210 250 C170 200, 140 130, 110 20"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M155 170 C115 162, 88 140, 74 114 C108 118, 138 136, 155 170 Z"
      fill="currentColor"
    />
    <path
      d="M168 186 C192 156, 206 126, 210 96 C186 112, 170 144, 168 186 Z"
      fill="currentColor"
      fillOpacity="0.7"
    />
    <path
      d="M134 110 C98 100, 72 78, 60 52 C92 58, 120 78, 134 110 Z"
      fill="currentColor"
      fillOpacity="0.85"
    />
    <path
      d="M142 122 C166 96, 180 68, 184 40 C160 56, 146 86, 142 122 Z"
      fill="currentColor"
      fillOpacity="0.6"
    />
    <path
      d="M118 58 C94 44, 78 24, 72 4 C96 14, 112 34, 118 58 Z"
      fill="currentColor"
      fillOpacity="0.75"
    />
    <circle cx="94" cy="144" r="4" fill="currentColor" />
    <circle cx="84" cy="84" r="3.5" fill="currentColor" />
    <circle cx="154" cy="64" r="3" fill="currentColor" />
  </svg>
);

/** Bingkai tanda air berbentuk hati (love) elegan untuk seksi penutup/footer. */
export const HeartFrameWatermark: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 640 580"
    fill="none"
    className={`text-accentDark dark:text-accent pointer-events-none absolute top-1/2 left-1/2 h-auto w-[min(94vw,760px)] -translate-x-1/2 -translate-y-1/2 select-none ${className}`}
  >
    {/* Soft inner fill glow */}
    <path
      d="M320 538 C320 538, 60 374, 60 198 C60 106, 132 42, 218 42 C270 42, 304 68, 320 102 C336 68, 370 42, 422 42 C508 42, 580 106, 580 198 C580 374, 320 538, 320 538 Z"
      fill="currentColor"
      fillOpacity="0.035"
    />
    {/* Outer hairline heart */}
    <path
      d="M320 546 C320 546, 48 378, 48 196 C48 98, 124 30, 216 30 C271 30, 304 58, 320 92 C336 58, 369 30, 424 30 C516 30, 592 98, 592 196 C592 378, 320 546, 320 546 Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeOpacity="0.18"
    />
    {/* Inner delicate heart */}
    <path
      d="M320 526 C320 526, 70 368, 70 200 C70 112, 138 52, 220 52 C269 52, 303 78, 320 112 C337 78, 371 52, 420 52 C502 52, 570 112, 570 200 C570 368, 320 526, 320 526 Z"
      stroke="currentColor"
      strokeWidth="1"
      strokeDasharray="4 6"
      strokeOpacity="0.14"
    />
    {/* Top cleft diamond accent */}
    <path
      d="M320 76 L326 84 L320 92 L314 84 Z"
      fill="currentColor"
      fillOpacity="0.22"
    />
    {/* Bottom tip diamond accent */}
    <path
      d="M320 546 L325 554 L320 562 L315 554 Z"
      fill="currentColor"
      fillOpacity="0.22"
    />
  </svg>
);

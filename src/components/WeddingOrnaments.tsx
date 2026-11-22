import React from "react";
import type { PublicOrnamentId } from "../utils/publicThemes";

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

export const OrnamentArtwork: React.FC<{ variant: PublicOrnamentId }> = ({
  variant,
}) => {
  switch (variant) {
    case "floral":
      return (
        <>
          {/* Curved botanical stem */}
          <path
            d="M210 250 C172 204, 152 140, 122 36"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M160 170 C128 156, 102 132, 86 106"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Layered Peony Bloom */}
          <g transform="translate(128, 128)">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <ellipse
                key={deg}
                cx="0"
                cy="-24"
                rx="13"
                ry="22"
                fill="currentColor"
                fillOpacity="0.55"
                transform={`rotate(${deg})`}
              />
            ))}
            {[22, 82, 142, 202, 262, 322].map((deg) => (
              <ellipse
                key={deg}
                cx="0"
                cy="-14"
                rx="9"
                ry="15"
                fill="currentColor"
                fillOpacity="0.8"
                transform={`rotate(${deg})`}
              />
            ))}
            <circle cx="0" cy="0" r="8" fill="currentColor" />
          </g>
          {/* Secondary bud */}
          <g transform="translate(166, 62) scale(0.55)">
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <ellipse
                key={deg}
                cx="0"
                cy="-20"
                rx="11"
                ry="18"
                fill="currentColor"
                fillOpacity="0.65"
                transform={`rotate(${deg})`}
              />
            ))}
            <circle cx="0" cy="0" r="6" fill="currentColor" />
          </g>
          {/* Accent leaves */}
          <path
            d="M150 184 C118 190, 88 180, 68 158 C96 152, 130 162, 150 184 Z"
            fill="currentColor"
            fillOpacity="0.7"
          />
          <path
            d="M126 70 C100 62, 82 44, 72 20 C98 28, 118 46, 126 70 Z"
            fill="currentColor"
            fillOpacity="0.65"
          />
        </>
      );

    case "islamic":
      return (
        <>
          {/* Graceful Islamic arch & geometric 8-point star mandala */}
          <g transform="translate(150, 130)">
            <circle
              cx="0"
              cy="0"
              r="92"
              stroke="currentColor"
              strokeWidth="1.8"
              fill="none"
            />
            <circle
              cx="0"
              cy="0"
              r="76"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeDasharray="5 5"
              fill="none"
            />
            <rect
              x="-52"
              y="-52"
              width="104"
              height="104"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="currentColor"
              fillOpacity="0.18"
            />
            <rect
              x="-52"
              y="-52"
              width="104"
              height="104"
              transform="rotate(45)"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="currentColor"
              fillOpacity="0.18"
            />
            <rect
              x="-32"
              y="-32"
              width="64"
              height="64"
              transform="rotate(22.5)"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
            <rect
              x="-32"
              y="-32"
              width="64"
              height="64"
              transform="rotate(67.5)"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <path
                key={deg}
                d="M0 -92 L8 -74 L0 -62 L-8 -74 Z"
                fill="currentColor"
                fillOpacity="0.7"
                transform={`rotate(${deg})`}
              />
            ))}
            <circle cx="0" cy="0" r="14" fill="currentColor" fillOpacity="0.55" />
          </g>
        </>
      );

    case "baroque":
      return (
        <>
          {/* Royal European Baroque Filigree Scrollwork */}
          <path
            d="M196 244 C150 220, 130 180, 146 144 C158 118, 190 120, 184 142 C178 160, 152 156, 156 138"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M196 16 C150 40, 130 80, 146 116 C158 142, 190 140, 184 118 C178 100, 152 104, 156 122"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M142 130 C112 130, 88 106, 94 82 C98 66, 118 68, 116 82 C114 94, 98 92, 102 80"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M142 130 C112 130, 88 154, 94 178 C98 194, 118 192, 116 178 C114 166, 98 168, 102 180"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M142 130 L122 118 L104 130 L122 142 Z"
            fill="currentColor"
            fillOpacity="0.7"
          />
          <path
            d="M84 130 L74 122 L64 130 L74 138 Z"
            fill="currentColor"
            fillOpacity="0.55"
          />
          <circle cx="122" cy="130" r="4.5" fill="currentColor" />
          <circle cx="164" cy="70" r="3.5" fill="currentColor" />
          <circle cx="164" cy="190" r="3.5" fill="currentColor" />
        </>
      );

    case "celestial":
      return (
        <>
          {/* Crescent Moon */}
          <path
            d="M168 62 C132 68, 108 102, 116 138 C124 174, 160 196, 194 186 C164 184, 142 162, 138 134 C134 106, 148 78, 168 62 Z"
            fill="currentColor"
            fillOpacity="0.78"
          />
          {/* Orbital ring */}
          <circle
            cx="154"
            cy="128"
            r="74"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeDasharray="3 6"
            fill="none"
          />
          {/* 4-point stars */}
          <path
            d="M92 78 L96 90 L108 94 L96 98 L92 110 L88 98 L76 94 L88 90 Z"
            fill="currentColor"
            fillOpacity="0.85"
          />
          <path
            d="M114 182 L117 190 L125 193 L117 196 L114 204 L111 196 L103 193 L111 190 Z"
            fill="currentColor"
            fillOpacity="0.7"
          />
          <path
            d="M174 36 L176 42 L182 44 L176 46 L174 52 L172 46 L166 44 L172 42 Z"
            fill="currentColor"
            fillOpacity="0.75"
          />
          <circle cx="76" cy="148" r="3" fill="currentColor" fillOpacity="0.65" />
          <circle cx="142" cy="218" r="2.5" fill="currentColor" fillOpacity="0.55" />
        </>
      );

    case "botanical":
    default:
      return (
        <>
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
          {/* Tiny rose buds */}
          <circle cx="94" cy="144" r="5" fill="currentColor" fillOpacity="0.85" />
          <circle cx="84" cy="84" r="4.5" fill="currentColor" fillOpacity="0.8" />
          <circle cx="154" cy="64" r="3.5" fill="currentColor" fillOpacity="0.75" />
        </>
      );
  }
};

/** Tanda air samping bergaya elegan yang mengikuti pilihan ornamen di Dashboard. */
export const BotanicalWatermark: React.FC<{
  side?: "left" | "right";
  variant?: PublicOrnamentId;
  className?: string;
}> = ({ side = "right", variant = "botanical", className = "" }) => {
  if (variant === "none") return null;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 220 260"
      fill="none"
      className={`text-accentDark/[0.07] dark:text-accent/[0.08] pointer-events-none absolute top-1/2 h-52 w-44 select-none md:h-72 md:w-60 ${
        side === "left"
          ? "ornament-sway-left -left-12 md:-left-4"
          : "ornament-sway-right -right-12 md:-right-4"
      } ${className}`}
    >
      <OrnamentArtwork variant={variant} />
    </svg>
  );
};

/** Pratinjau mini ornamen untuk Dashboard Admin */
export const OrnamentPreviewMini: React.FC<{
  variant: PublicOrnamentId;
  accent: string;
  accentDark: string;
  bg: string;
}> = ({ variant, accent, accentDark, bg }) => (
  <div
    aria-hidden="true"
    className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-md border border-black/10"
    style={{
      background: `radial-gradient(circle at 50% 50%, ${accent}28, ${bg})`,
    }}
  >
    {variant === "none" ? (
      <span
        className="text-[10px] font-medium opacity-55"
        style={{ color: accentDark }}
      >
        Polos / Bersih
      </span>
    ) : (
      <svg
        viewBox="0 0 220 260"
        fill="none"
        className="h-12 w-12 opacity-65"
        style={{ color: accentDark }}
      >
        <OrnamentArtwork variant={variant} />
      </svg>
    )}
  </div>
);

/** Bingkai tanda air berbentuk hati (love) mewah bergaya wreath & filigree kerajaan. */
export const HeartFrameWatermark: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 680 620"
    fill="none"
    className={`heart-frame-pulse text-accentDark dark:text-accent pointer-events-none absolute top-1/2 left-1/2 h-auto w-[min(96vw,800px)] select-none ${className}`}
  >
    <defs>
      <radialGradient id="heartLuxuryGlow" cx="50%" cy="46%" r="52%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.065" />
        <stop offset="70%" stopColor="currentColor" stopOpacity="0.02" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Ambient radial halo */}
    <path
      d="M340 564 C340 564, 58 394, 58 214 C58 112, 136 46, 228 46 C284 46, 322 76, 340 112 C358 76, 396 46, 452 46 C544 46, 622 112, 622 214 C622 394, 340 564, 340 564 Z"
      fill="url(#heartLuxuryGlow)"
    />

    {/* Outer fine solid heart */}
    <path
      d="M340 572 C340 572, 48 398, 48 212 C48 106, 130 36, 226 36 C285 36, 322 68, 340 104 C358 68, 395 36, 454 36 C550 36, 632 106, 632 212 C632 398, 340 572, 340 572 Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeOpacity="0.22"
    />

    {/* Secondary subtle offset ring */}
    <path
      d="M340 558 C340 558, 62 390, 62 216 C62 116, 140 50, 230 50 C284 50, 322 80, 340 116 C358 80, 396 50, 450 50 C540 50, 618 116, 618 216 C618 390, 340 558, 340 558 Z"
      stroke="currentColor"
      strokeWidth="0.9"
      strokeOpacity="0.14"
    />

    {/* Inner delicate dotted lace heart */}
    <path
      d="M340 544 C340 544, 76 382, 76 220 C76 126, 148 64, 234 64 C284 64, 321 92, 340 128 C359 92, 396 64, 446 64 C532 64, 604 126, 604 220 C604 382, 340 544, 340 544 Z"
      stroke="currentColor"
      strokeWidth="1"
      strokeDasharray="3 7"
      strokeOpacity="0.16"
    />

    {/* Crown floral flourish at top cleft */}
    <g transform="translate(340, 86)" opacity="0.28">
      <path d="M0 -18 L6 -6 L0 6 L-6 -6 Z" fill="currentColor" />
      <path
        d="M-8 -4 C-20 -16, -34 -14, -44 -2 C-30 2, -16 2, -8 -4 Z"
        fill="currentColor"
        fillOpacity="0.65"
      />
      <path
        d="M8 -4 C20 -16, 34 -14, 44 -2 C30 2, 16 2, 8 -4 Z"
        fill="currentColor"
        fillOpacity="0.65"
      />
      <circle cx="-24" cy="-14" r="2.2" fill="currentColor" />
      <circle cx="24" cy="-14" r="2.2" fill="currentColor" />
    </g>

    {/* Symmetrical floral sprigs along left & right heart curves */}
    {[-1, 1].map((dir) => (
      <g
        key={dir}
        transform={`translate(340, 0) scale(${dir}, 1)`}
        opacity="0.22"
      >
        {/* Upper lobe rose & leaves */}
        <path
          d="M174 44 C194 34, 214 38, 228 50 C208 54, 190 52, 174 44 Z"
          fill="currentColor"
        />
        <path
          d="M236 58 C256 54, 272 68, 280 86 C262 82, 246 72, 236 58 Z"
          fill="currentColor"
          fillOpacity="0.8"
        />
        <circle cx="232" cy="54" r="5" fill="currentColor" />
        {/* Lower side filigree leaf */}
        <path
          d="M232 370 C248 352, 266 346, 282 350 C268 364, 250 372, 232 370 Z"
          fill="currentColor"
          fillOpacity="0.75"
        />
        <path
          d="M196 420 C212 404, 230 398, 244 404 C230 416, 214 422, 196 420 Z"
          fill="currentColor"
          fillOpacity="0.65"
        />
      </g>
    ))}

    {/* Bottom tip diamond & twin leaves */}
    <g transform="translate(340, 572)" opacity="0.28">
      <path d="M0 -8 L6 4 L0 16 L-6 4 Z" fill="currentColor" />
      <path
        d="M-8 0 C-18 -6, -30 -4, -38 4 C-26 6, -16 6, -8 0 Z"
        fill="currentColor"
        fillOpacity="0.65"
      />
      <path
        d="M8 0 C18 -6, 30 -4, 38 4 C26 6, 16 6, 8 0 Z"
        fill="currentColor"
        fillOpacity="0.65"
      />
    </g>
  </svg>
);

/** Bingkai oval wreath botani & bunga romantis untuk potret mempelai. */
export const PortraitFloralFrame: React.FC<{
  mirror?: boolean;
  className?: string;
}> = ({ mirror = false, className = "" }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 320 400"
    fill="none"
    className={`text-accentDark dark:text-accent pointer-events-none absolute -inset-5 h-[calc(100%+2.5rem)] w-[calc(100%+2.5rem)] select-none ${
      mirror ? "-scale-x-100" : ""
    } ${className}`}
  >
    {/* Primary delicate oval ring */}
    <ellipse
      cx="160"
      cy="200"
      rx="132"
      ry="172"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeOpacity="0.45"
    />
    {/* Romantic offset secondary oval ring */}
    <ellipse
      cx="160"
      cy="200"
      rx="138"
      ry="176"
      transform="rotate(-4 160 200)"
      stroke="currentColor"
      strokeWidth="0.85"
      strokeOpacity="0.28"
    />
    {/* Subtle dotted inner lace halo */}
    <ellipse
      cx="160"
      cy="200"
      rx="126"
      ry="166"
      stroke="currentColor"
      strokeWidth="0.8"
      strokeDasharray="2 6"
      strokeOpacity="0.3"
    />

    {/* Top-Right Botanical Rose & Laurel Cluster */}
    <g transform="translate(244, 62)">
      {/* Curved trailing leaves */}
      <path
        d="M-36 -18 C-14 -30, 8 -26, 22 -12 C2 -6, -18 -8, -36 -18 Z"
        fill="currentColor"
        fillOpacity="0.32"
      />
      <path
        d="M14 -4 C34 -4, 48 12, 52 32 C34 26, 20 14, 14 -4 Z"
        fill="currentColor"
        fillOpacity="0.36"
      />
      <path
        d="M24 22 C44 30, 54 48, 52 68 C36 56, 26 40, 24 22 Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <path
        d="M-12 -24 C-2 -42, 16 -48, 32 -40 C18 -28, 4 -22, -12 -24 Z"
        fill="currentColor"
        fillOpacity="0.26"
      />
      {/* Layered Rose Bloom */}
      <g transform="translate(8, -4)">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <ellipse
            key={deg}
            cx="0"
            cy="-9"
            rx="6"
            ry="9.5"
            fill="currentColor"
            fillOpacity="0.45"
            transform={`rotate(${deg})`}
          />
        ))}
        {[30, 110, 190, 270].map((deg) => (
          <ellipse
            key={deg}
            cx="0"
            cy="-5"
            rx="4"
            ry="6"
            fill="currentColor"
            fillOpacity="0.72"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle cx="0" cy="0" r="3.5" fill="currentColor" fillOpacity="0.9" />
      </g>
      {/* Secondary tiny bud */}
      <circle cx="30" cy="24" r="4.5" fill="currentColor" fillOpacity="0.55" />
      <circle cx="-18" cy="-14" r="3" fill="currentColor" fillOpacity="0.45" />
    </g>

    {/* Bottom-Left Botanical Rose & Laurel Cluster */}
    <g transform="translate(76, 338) rotate(180)">
      <path
        d="M-36 -18 C-14 -30, 8 -26, 22 -12 C2 -6, -18 -8, -36 -18 Z"
        fill="currentColor"
        fillOpacity="0.32"
      />
      <path
        d="M14 -4 C34 -4, 48 12, 52 32 C34 26, 20 14, 14 -4 Z"
        fill="currentColor"
        fillOpacity="0.36"
      />
      <path
        d="M24 22 C44 30, 54 48, 52 68 C36 56, 26 40, 24 22 Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <g transform="translate(8, -4)">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <ellipse
            key={deg}
            cx="0"
            cy="-9"
            rx="6"
            ry="9.5"
            fill="currentColor"
            fillOpacity="0.45"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle cx="0" cy="0" r="3.5" fill="currentColor" fillOpacity="0.85" />
      </g>
      <circle cx="30" cy="24" r="4" fill="currentColor" fillOpacity="0.5" />
    </g>

    {/* Delicate 4-point star & pearl accents */}
    <path
      d="M66 96 L68.5 103.5 L76 106 L68.5 108.5 L66 116 L63.5 108.5 L56 106 L63.5 103.5 Z"
      fill="currentColor"
      fillOpacity="0.55"
    />
    <path
      d="M258 296 L260 302 L266 304 L260 306 L258 312 L256 306 L250 304 L256 302 Z"
      fill="currentColor"
      fillOpacity="0.5"
    />
    <circle cx="160" cy="24" r="2.5" fill="currentColor" fillOpacity="0.5" />
    <circle cx="160" cy="376" r="2.5" fill="currentColor" fillOpacity="0.5" />
  </svg>
);

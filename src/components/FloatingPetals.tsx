import React, { useEffect, useState } from "react";
import type { PublicAnimationId } from "../utils/publicThemes";

interface FloatingPetalsProps {
  variant?: PublicAnimationId;
}

const DoveSvg: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    className="drop-shadow-[0_2px_6px_rgba(15,23,42,0.18)]"
  >
    <path
      d="M28 31 C22 18, 12 10, 6 14 C12 22, 18 28, 26 33 Z"
      fill="currentColor"
      fillOpacity="0.65"
      className="dove-wing-back"
    />
    <path
      d="M10 38 C17 34, 24 31, 34 31 C40 31, 45 28, 49 25 C51 24, 54 25, 55 27 C53 29, 51 30, 49 32 C46 37, 38 41, 28 41 C21 41, 15 43, 9 46 C11 43, 12 40, 10 38 Z"
      fill="currentColor"
      fillOpacity="0.92"
    />
    <path
      d="M32 32 C29 18, 22 8, 14 7 C17 17, 21 26, 29 34 Z"
      fill="currentColor"
      className="dove-wing-front"
    />
    <circle cx="56" cy="27" r="1.4" fill="currentColor" fillOpacity="0.85" />
  </svg>
);

const SparkleSvg: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0 L14.4 9.6 L24 12 L14.4 14.4 L12 24 L9.6 14.4 L0 12 L9.6 9.6 Z" />
  </svg>
);

const PetalSvg: React.FC<{ size: number; alt?: boolean }> = ({ size, alt }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor">
    {alt ? (
      <path
        d="M16 2 C25 7, 28 18, 16 30 C11 24, 6 16, 8 9 C10 5, 13 3, 16 2 Z"
        fillOpacity="0.65"
      />
    ) : (
      <path
        d="M16 3 C23 8, 27 17, 16 29 C5 17, 9 8, 16 3 Z"
        fillOpacity="0.78"
      />
    )}
  </svg>
);

const MiniHeartSvg: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M12 21 C12 21, 3 14.5, 3 8.5 C3 5.5, 5.4 3.5, 8 3.5 C9.8 3.5, 11.2 4.5, 12 5.8 C12.8 4.5, 14.2 3.5, 16 3.5 C18.6 3.5, 21 5.5, 21 8.5 C21 14.5, 12 21, 12 21 Z"
      fillOpacity="0.7"
    />
  </svg>
);

const ButterflySvg: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <g className="butterfly-wings">
      <path
        d="M23 23 C16 10, 4 9, 5 20 C6 28, 16 29, 23 25 Z"
        fill="currentColor"
        fillOpacity="0.82"
      />
      <path
        d="M23 26 C15 28, 9 36, 15 41 C20 44, 23 36, 23 28 Z"
        fill="currentColor"
        fillOpacity="0.62"
      />
      <path
        d="M25 23 C32 10, 44 9, 43 20 C42 28, 32 29, 25 25 Z"
        fill="currentColor"
        fillOpacity="0.82"
      />
      <path
        d="M25 26 C33 28, 39 36, 33 41 C28 44, 25 36, 25 28 Z"
        fill="currentColor"
        fillOpacity="0.62"
      />
    </g>
    <rect x="23" y="16" width="2" height="18" rx="1" fill="currentColor" />
  </svg>
);

const LanternSvg: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size * 1.25} viewBox="0 0 32 40" fill="none">
    <defs>
      <radialGradient id="lanternGlow" cx="50%" cy="60%" r="55%">
        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
        <stop offset="60%" stopColor="currentColor" stopOpacity="0.75" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
      </radialGradient>
    </defs>
    <path
      d="M7 10 C7 4, 25 4, 25 10 L22 30 C22 33, 10 33, 10 30 Z"
      fill="url(#lanternGlow)"
      stroke="currentColor"
      strokeOpacity="0.45"
      strokeWidth="1"
    />
    <ellipse cx="16" cy="31" rx="5" ry="1.8" fill="#fef08a" fillOpacity="0.9" />
  </svg>
);

const AMBIENT_DOVES = [
  { id: 1, top: "14%", size: 42, duration: "22s", delay: "0s", reverse: false, opacity: 0.72 },
  { id: 2, top: "28%", size: 32, duration: "26s", delay: "5s", reverse: true, opacity: 0.58 },
  { id: 3, top: "48%", size: 38, duration: "24s", delay: "11s", reverse: false, opacity: 0.62 },
  { id: 4, top: "66%", size: 30, duration: "28s", delay: "16s", reverse: true, opacity: 0.52 },
  { id: 5, top: "20%", size: 28, duration: "20s", delay: "14s", reverse: false, opacity: 0.55 },
];

const AMBIENT_SPARKLES = [
  { id: 1, left: "8%", top: "18%", size: 12, duration: "4.2s", delay: "0.2s" },
  { id: 2, left: "22%", top: "36%", size: 9, duration: "5.1s", delay: "1.4s" },
  { id: 3, left: "35%", top: "14%", size: 11, duration: "4.8s", delay: "2.3s" },
  { id: 4, left: "52%", top: "26%", size: 8, duration: "3.9s", delay: "0.7s" },
  { id: 5, left: "68%", top: "16%", size: 13, duration: "5.4s", delay: "1.9s" },
  { id: 6, left: "84%", top: "32%", size: 10, duration: "4.6s", delay: "2.8s" },
  { id: 7, left: "92%", top: "58%", size: 11, duration: "5.0s", delay: "0.9s" },
  { id: 8, left: "76%", top: "74%", size: 9, duration: "4.4s", delay: "2.1s" },
  { id: 9, left: "44%", top: "82%", size: 12, duration: "5.3s", delay: "1.1s" },
  { id: 10, left: "16%", top: "70%", size: 10, duration: "4.7s", delay: "3.0s" },
  { id: 11, left: "60%", top: "52%", size: 8, duration: "4.1s", delay: "1.7s" },
  { id: 12, left: "28%", top: "88%", size: 10, duration: "5.2s", delay: "0.5s" },
];

const AMBIENT_PETALS = [
  { id: 1, left: "6%", size: 18, duration: "13s", delay: "0s" },
  { id: 2, left: "15%", size: 14, duration: "16s", delay: "2.5s" },
  { id: 3, left: "26%", size: 20, duration: "14s", delay: "5s" },
  { id: 4, left: "38%", size: 15, duration: "17s", delay: "1.2s" },
  { id: 5, left: "50%", size: 18, duration: "15s", delay: "7s" },
  { id: 6, left: "63%", size: 14, duration: "13.5s", delay: "3.8s" },
  { id: 7, left: "74%", size: 22, duration: "16.5s", delay: "6.2s" },
  { id: 8, left: "85%", size: 16, duration: "14.5s", delay: "0.8s" },
  { id: 9, left: "93%", size: 15, duration: "18s", delay: "4.4s" },
  { id: 10, left: "44%", size: 13, duration: "15.5s", delay: "9.1s" },
  { id: 11, left: "20%", size: 17, duration: "14.8s", delay: "10.5s" },
  { id: 12, left: "68%", size: 16, duration: "16.2s", delay: "8.3s" },
];

const AMBIENT_BUTTERFLIES = [
  { id: 1, top: "18%", size: 32, duration: "19s", delay: "0s", reverse: false },
  { id: 2, top: "36%", size: 26, duration: "22s", delay: "4s", reverse: true },
  { id: 3, top: "56%", size: 30, duration: "21s", delay: "9s", reverse: false },
  { id: 4, top: "72%", size: 24, duration: "24s", delay: "13s", reverse: true },
  { id: 5, top: "26%", size: 22, duration: "18s", delay: "11s", reverse: false },
];

const AMBIENT_LANTERNS = [
  { id: 1, left: "10%", size: 26, duration: "18s", delay: "0s" },
  { id: 2, left: "24%", size: 20, duration: "22s", delay: "4s" },
  { id: 3, left: "40%", size: 28, duration: "20s", delay: "8s" },
  { id: 4, left: "58%", size: 22, duration: "19s", delay: "2s" },
  { id: 5, left: "74%", size: 26, duration: "23s", delay: "6s" },
  { id: 6, left: "88%", size: 18, duration: "21s", delay: "11s" },
  { id: 7, left: "32%", size: 16, duration: "24s", delay: "14s" },
  { id: 8, left: "66%", size: 24, duration: "19.5s", delay: "12s" },
];

/** Pratinjau mini animasi untuk Dashboard Pengaturan Admin */
export const AnimationPreviewMini: React.FC<{
  variant: PublicAnimationId;
  accent: string;
  accentDark: string;
  bg: string;
  className?: string;
}> = ({ variant, accent, accentDark, bg, className }) => {
  return (
    <div
      aria-hidden="true"
      className={`relative w-full overflow-hidden ${
        className ?? "h-16 rounded-md border border-black/10"
      }`}
      style={
        bg === "transparent"
          ? undefined
          : {
              background: `radial-gradient(circle at 50% 45%, ${accent}33, ${bg})`,
            }
      }
    >
      {variant === "none" && (
        <div className="flex h-full items-center justify-center text-[10px] font-medium opacity-55" style={{ color: accentDark }}>
          Tenang / Statis
        </div>
      )}

      {variant === "doves" && (
        <>
          <div
            className="absolute top-3 left-0"
            style={{
              color: accentDark,
              animation: "miniFlyRight 5.5s linear infinite",
            }}
          >
            <DoveSvg size={22} />
          </div>
          <div
            className="absolute top-8 left-0 opacity-75"
            style={{
              color: accentDark,
              animation: "miniFlyRight 6.8s linear 2.2s infinite",
            }}
          >
            <DoveSvg size={17} />
          </div>
          <div
            className="absolute top-2 right-5"
            style={{
              color: accentDark,
              animation: "weddingSparkle 2.8s ease-in-out infinite",
            }}
          >
            <SparkleSvg size={9} />
          </div>
        </>
      )}

      {variant === "petals" &&
        [14, 38, 62, 82].map((left, idx) => (
          <div
            key={left}
            className="absolute top-0"
            style={{
              left: `${left}%`,
              color: accentDark,
              animation: `petalFallMini ${3.8 + idx * 0.6}s linear ${idx * 0.8}s infinite`,
            }}
          >
            <PetalSvg size={11 + (idx % 2) * 3} />
          </div>
        ))}

      {variant === "butterflies" && (
        <>
          <div
            className="absolute top-3 left-0"
            style={{
              color: accentDark,
              animation: "miniFlyRight 5s linear infinite",
            }}
          >
            <ButterflySvg size={20} />
          </div>
          <div
            className="absolute top-9 left-0 opacity-80"
            style={{
              color: accentDark,
              animation: "miniFlyRight 6.2s linear 2s infinite",
            }}
          >
            <ButterflySvg size={15} />
          </div>
        </>
      )}

      {variant === "lanterns" &&
        [18, 45, 72].map((left, idx) => (
          <div
            key={left}
            className="absolute bottom-0"
            style={{
              left: `${left}%`,
              color: accentDark,
              animation: `lanternRiseMini ${4.5 + idx * 0.7}s linear ${idx * 1.1}s infinite`,
            }}
          >
            <LanternSvg size={13 + (idx % 2) * 3} />
          </div>
        ))}

      {variant === "sparkles" &&
        [
          { left: "16%", top: "24%", size: 10, d: "0s" },
          { left: "40%", top: "55%", size: 8, d: "0.7s" },
          { left: "62%", top: "22%", size: 11, d: "1.3s" },
          { left: "82%", top: "58%", size: 9, d: "0.4s" },
        ].map((s, idx) => (
          <div
            key={idx}
            className="absolute"
            style={{
              left: s.left,
              top: s.top,
              color: accentDark,
              animation: `weddingSparkle 2.6s ease-in-out ${s.d} infinite`,
            }}
          >
            <SparkleSvg size={s.size} />
          </div>
        ))}
    </div>
  );
};

const FloatingPetals: React.FC<FloatingPetalsProps> = ({
  variant = "doves",
}) => {
  const [enabled, setEnabled] = useState(false);
  const [burstActive, setBurstActive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    setEnabled(true);

    let burstTimer: number | null = null;
    const onOpened = () => {
      setBurstActive(true);
      if (burstTimer) window.clearTimeout(burstTimer);
      burstTimer = window.setTimeout(() => setBurstActive(false), 6500);
    };
    window.addEventListener("wedding-opened", onOpened);
    return () => {
      window.removeEventListener("wedding-opened", onOpened);
      if (burstTimer) window.clearTimeout(burstTimer);
    };
  }, []);

  if (!enabled || variant === "none") return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[15] overflow-hidden"
    >
      {/* Sparkles layer (aktif di mode doves, butterflies & sparkles) */}
      {(variant === "doves" ||
        variant === "sparkles" ||
        variant === "butterflies") &&
        AMBIENT_SPARKLES.map((sp) => (
          <div
            key={`sp-${sp.id}`}
            className="text-accentDark/40 dark:text-accent/50 absolute"
            style={{
              left: sp.left,
              top: sp.top,
              animation: `weddingSparkle ${sp.duration} ease-in-out ${sp.delay} infinite`,
            }}
          >
            <SparkleSvg size={variant === "sparkles" ? sp.size + 3 : sp.size} />
          </div>
        ))}

      {/* Soft bokeh light orbs (khusus sparkles & lanterns) */}
      {(variant === "sparkles" || variant === "lanterns") &&
        [
          { left: "14%", top: "28%", size: 10, d: "0s" },
          { left: "34%", top: "64%", size: 14, d: "1.5s" },
          { left: "58%", top: "38%", size: 9, d: "2.8s" },
          { left: "78%", top: "54%", size: 12, d: "0.9s" },
          { left: "88%", top: "24%", size: 8, d: "2.1s" },
        ].map((f, idx) => (
          <div
            key={`ff-${idx}`}
            className="bg-accent/55 dark:bg-amber-300/60 absolute rounded-full blur-[2px]"
            style={{
              left: f.left,
              top: f.top,
              width: f.size,
              height: f.size,
              animation: `fireflyDrift ${6 + idx}s ease-in-out ${f.d} infinite`,
            }}
          />
        ))}

      {/* Tiny drifting hearts accent (khusus doves) */}
      {variant === "doves" &&
        [
          { left: "18%", top: "34%", size: 11, d: "0.4s" },
          { left: "48%", top: "22%", size: 9, d: "2.1s" },
          { left: "76%", top: "40%", size: 12, d: "1.2s" },
          { left: "62%", top: "74%", size: 10, d: "3.0s" },
        ].map((h, idx) => (
          <div
            key={`mh-${idx}`}
            className="text-accentDark/25 dark:text-accent/35 absolute"
            style={{
              left: h.left,
              top: h.top,
              animation: `fireflyDrift ${7 + idx}s ease-in-out ${h.d} infinite`,
            }}
          >
            <MiniHeartSvg size={h.size} />
          </div>
        ))}

      {/* Flying Doves */}
      {variant === "doves" &&
        AMBIENT_DOVES.map((dove) => (
          <div
            key={`dove-${dove.id}`}
            className="text-accentDark/45 dark:text-white/75 absolute"
            style={{
              top: dove.top,
              left: dove.reverse ? "auto" : "-70px",
              right: dove.reverse ? "-70px" : "auto",
              opacity: dove.opacity,
              animation: `${dove.reverse ? "doveFlyLeft" : "doveFlyRight"} ${dove.duration} linear ${dove.delay} infinite`,
            }}
          >
            <div style={{ transform: dove.reverse ? "scaleX(-1)" : undefined }}>
              <DoveSvg size={dove.size} />
            </div>
          </div>
        ))}

      {/* Celebration Burst saat Buka Undangan (khusus mode doves) */}
      {variant === "doves" &&
        burstActive &&
        [
          { id: "b1", top: "62%", size: 46, delay: "0s", reverse: false },
          { id: "b2", top: "54%", size: 38, delay: "0.35s", reverse: true },
          { id: "b3", top: "44%", size: 42, delay: "0.7s", reverse: false },
          { id: "b4", top: "70%", size: 34, delay: "1.0s", reverse: true },
        ].map((b) => (
          <div
            key={b.id}
            className="text-accentDark/70 dark:text-accent/90 absolute"
            style={{
              top: b.top,
              left: b.reverse ? "auto" : "-60px",
              right: b.reverse ? "-60px" : "auto",
              animation: `${b.reverse ? "doveBurstLeft" : "doveBurstRight"} 5.2s cubic-bezier(0.22, 1, 0.36, 1) ${b.delay} forwards`,
            }}
          >
            <div style={{ transform: b.reverse ? "scaleX(-1)" : undefined }}>
              <DoveSvg size={b.size} />
            </div>
          </div>
        ))}

      {/* Floating Rose/Sakura Petals */}
      {variant === "petals" &&
        AMBIENT_PETALS.map((p) => (
          <div
            key={`petal-${p.id}`}
            className="text-accentDark/35 dark:text-accent/45 absolute top-[-40px]"
            style={{
              left: p.left,
              animation: `petalFall ${p.duration} linear ${p.delay} infinite`,
            }}
          >
            <PetalSvg size={p.size} alt={p.id % 2 === 0} />
          </div>
        ))}

      {/* Fluttering Butterflies */}
      {variant === "butterflies" &&
        AMBIENT_BUTTERFLIES.map((bf) => (
          <div
            key={`bf-${bf.id}`}
            className="text-accentDark/50 dark:text-accent/70 absolute"
            style={{
              top: bf.top,
              left: bf.reverse ? "auto" : "-60px",
              right: bf.reverse ? "-60px" : "auto",
              animation: `${bf.reverse ? "butterflyGlideLeft" : "butterflyGlideRight"} ${bf.duration} linear ${bf.delay} infinite`,
            }}
          >
            <ButterflySvg size={bf.size} />
          </div>
        ))}

      {/* Rising Sky Lanterns */}
      {variant === "lanterns" &&
        AMBIENT_LANTERNS.map((lt) => (
          <div
            key={`lt-${lt.id}`}
            className="text-amber-500/75 dark:text-amber-300/80 absolute bottom-[-60px]"
            style={{
              left: lt.left,
              animation: `lanternRise ${lt.duration} linear ${lt.delay} infinite`,
            }}
          >
            <LanternSvg size={lt.size} />
          </div>
        ))}
    </div>
  );
};

export default FloatingPetals;

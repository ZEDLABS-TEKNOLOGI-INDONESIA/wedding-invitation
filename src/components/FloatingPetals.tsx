import React, { useEffect, useState } from "react";

interface DoveConfig {
  id: number;
  top: string;
  size: number;
  duration: string;
  delay: string;
  reverse: boolean;
  opacity: number;
}

interface SparkleConfig {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: string;
  delay: string;
}

const AMBIENT_DOVES: DoveConfig[] = [
  { id: 1, top: "14%", size: 42, duration: "22s", delay: "0s", reverse: false, opacity: 0.72 },
  { id: 2, top: "28%", size: 32, duration: "26s", delay: "5s", reverse: true, opacity: 0.58 },
  { id: 3, top: "48%", size: 38, duration: "24s", delay: "11s", reverse: false, opacity: 0.62 },
  { id: 4, top: "66%", size: 30, duration: "28s", delay: "16s", reverse: true, opacity: 0.52 },
  { id: 5, top: "20%", size: 28, duration: "20s", delay: "14s", reverse: false, opacity: 0.55 },
];

const AMBIENT_SPARKLES: SparkleConfig[] = [
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

const DoveSvg: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    className="drop-shadow-[0_2px_6px_rgba(15,23,42,0.18)]"
  >
    {/* Back wing */}
    <path
      d="M28 31 C22 18, 12 10, 6 14 C12 22, 18 28, 26 33 Z"
      fill="currentColor"
      fillOpacity="0.65"
      className="dove-wing-back"
    />
    {/* Body & tail */}
    <path
      d="M10 38 C17 34, 24 31, 34 31 C40 31, 45 28, 49 25 C51 24, 54 25, 55 27 C53 29, 51 30, 49 32 C46 37, 38 41, 28 41 C21 41, 15 43, 9 46 C11 43, 12 40, 10 38 Z"
      fill="currentColor"
      fillOpacity="0.92"
    />
    {/* Front wing */}
    <path
      d="M32 32 C29 18, 22 8, 14 7 C17 17, 21 26, 29 34 Z"
      fill="currentColor"
      className="dove-wing-front"
    />
    {/* Tiny beak / olive sparkle */}
    <circle cx="56" cy="27" r="1.4" fill="currentColor" fillOpacity="0.85" />
  </svg>
);

const SparkleSvg: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0 L14.4 9.6 L24 12 L14.4 14.4 L12 24 L9.6 14.4 L0 12 L9.6 9.6 Z" />
  </svg>
);

const FloatingPetals: React.FC = () => {
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

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[15] overflow-hidden"
    >
      {/* Ambient twinkling golden/theme sparkles */}
      {AMBIENT_SPARKLES.map((sp) => (
        <div
          key={`sp-${sp.id}`}
          className="text-accentDark/35 dark:text-accent/45 absolute"
          style={{
            left: sp.left,
            top: sp.top,
            animation: `weddingSparkle ${sp.duration} ease-in-out ${sp.delay} infinite`,
          }}
        >
          <SparkleSvg size={sp.size} />
        </div>
      ))}

      {/* Graceful flying white doves */}
      {AMBIENT_DOVES.map((dove) => (
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

      {/* Celebration burst of soaring doves upon opening the invitation */}
      {burstActive && (
        <>
          {[
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
        </>
      )}
    </div>
  );
};

export default FloatingPetals;

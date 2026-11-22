import { Disc3, Pause, Play, VolumeX } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface MusicPlayerProps {
  url: string;
  visible?: boolean;
}

const IDLE_HIDE_MS = 3500;
const RING_RADIUS = 25;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const MusicPlayer: React.FC<MusicPlayerProps> = ({ url, visible = true }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userPausedRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);
  const lastActivityRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isShown, setIsShown] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    const handlePlayEvent = () => {
      if (!audioRef.current || userPausedRef.current || !url) return;
      audioRef.current.play().catch(() => {});
    };

    window.addEventListener("play-wedding-music", handlePlayEvent);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      window.removeEventListener("play-wedding-music", handlePlayEvent);
    };
  }, [url]);

  useEffect(() => {
    if (!visible) return;

    const scheduleHide = () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      if (isInteractingRef.current) return;
      hideTimerRef.current = window.setTimeout(() => {
        if (!isInteractingRef.current) {
          setIsShown(false);
        }
      }, IDLE_HIDE_MS);
    };

    const handleActivity = () => {
      const now = Date.now();
      // Throttle reset animasi garis agar tidak berkedip saat mouse bergerak cepat
      if (now - lastActivityRef.current > 250 || !isShown) {
        lastActivityRef.current = now;
        setTimerKey((k) => k + 1);
      }
      setIsShown(true);
      scheduleHide();
    };

    scheduleHide();

    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity);

    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [visible, isShown]);

  const handlePointerEnter = () => {
    isInteractingRef.current = true;
    setIsHovering(true);
    setIsShown(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
  };

  const handlePointerLeave = () => {
    isInteractingRef.current = false;
    setIsHovering(false);
    setTimerKey((k) => k + 1);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (!isInteractingRef.current) setIsShown(false);
    }, IDLE_HIDE_MS);
  };

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    setTimerKey((k) => k + 1);
    if (isPlaying) {
      userPausedRef.current = true;
      audio.pause();
    } else {
      userPausedRef.current = false;
      audio.play().catch(() => {});
    }
  };

  if (!url) return null;

  return (
    <>
      <audio ref={audioRef} src={url} loop preload="none" className="hidden" />
      {visible && (
        <button
          type="button"
          onClick={toggleMusic}
          onMouseEnter={handlePointerEnter}
          onMouseLeave={handlePointerLeave}
          onFocus={handlePointerEnter}
          onBlur={handlePointerLeave}
          aria-label={isPlaying ? "Jeda musik latar" : "Putar musik latar"}
          title={isPlaying ? "Jeda Musik" : "Putar Musik"}
          className={`frosted-glass group fixed top-4 right-4 z-[120] flex h-12 w-12 items-center justify-center rounded-full border border-white/40 text-slate-700 shadow-xl transition-all duration-500 ease-out hover:scale-105 active:scale-95 md:top-6 md:right-6 md:h-14 md:w-14 dark:border-white/10 dark:text-white ${
            isShown
              ? "translate-x-0 scale-100 opacity-100"
              : "pointer-events-none translate-x-5 scale-90 opacity-0"
          }`}
        >
          {/* Garis melingkar hitung mundur sebelum tombol tersembunyi otomatis */}
          <svg
            aria-hidden="true"
            viewBox="0 0 56 56"
            className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
          >
            <circle
              cx="28"
              cy="28"
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="opacity-15"
            />
            {isShown && (
              <circle
                key={timerKey}
                cx="28"
                cy="28"
                r={RING_RADIUS}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                style={
                  {
                    "--ring-circumference": `${RING_CIRCUMFERENCE}`,
                    animation: `music-ring-countdown ${IDLE_HIDE_MS}ms linear forwards`,
                    animationPlayState: isHovering ? "paused" : "running",
                  } as React.CSSProperties
                }
              />
            )}
          </svg>

          {isPlaying ? (
            <div className="relative flex items-center justify-center">
              <Disc3 className="text-accentDark dark:text-accent animate-spin-slow h-6 w-6 md:h-7 md:w-7" />
              <Pause className="absolute h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              <VolumeX className="h-5 w-5 text-slate-500 transition-opacity group-hover:opacity-0 md:h-6 md:w-6 dark:text-slate-400" />
              <Play className="text-accentDark dark:text-accent absolute h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100 md:h-6 md:w-6" />
            </div>
          )}
        </button>
      )}
    </>
  );
};

export default MusicPlayer;

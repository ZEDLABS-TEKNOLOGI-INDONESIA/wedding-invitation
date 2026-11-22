import { Disc3, Pause, Play, VolumeX } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface MusicPlayerProps {
  url: string;
  visible?: boolean;
}

const IDLE_HIDE_MS = 3000;
const RING_RADIUS = 25;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const MusicPlayer: React.FC<MusicPlayerProps> = ({ url, visible = true }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userPausedRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isShown, setIsShown] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (
        !audio.duration ||
        !Number.isFinite(audio.duration) ||
        audio.duration <= 0
      ) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(1, Math.max(0, audio.currentTime / audio.duration)));
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("durationchange", updateProgress);
    audio.addEventListener("ended", updateProgress);

    const handlePlayEvent = () => {
      if (!audioRef.current || userPausedRef.current || !url) return;
      audioRef.current.play().catch(() => {});
    };

    window.addEventListener("play-wedding-music", handlePlayEvent);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateProgress);
      audio.removeEventListener("durationchange", updateProgress);
      audio.removeEventListener("ended", updateProgress);
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
  }, [visible]);

  const handlePointerEnter = () => {
    isInteractingRef.current = true;
    setIsShown(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
  };

  const handlePointerLeave = () => {
    isInteractingRef.current = false;
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (!isInteractingRef.current) setIsShown(false);
    }, IDLE_HIDE_MS);
  };

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    if (isPlaying) {
      userPausedRef.current = true;
      audio.pause();
    } else {
      userPausedRef.current = false;
      audio.play().catch(() => {});
    }
  };

  if (!url) return null;

  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

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
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-4 scale-95 opacity-0"
          }`}
        >
          {/* Garis melingkar progres durasi lagu */}
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
            <circle
              cx="28"
              cy="28"
              r={RING_RADIUS}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-300 ease-linear"
            />
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

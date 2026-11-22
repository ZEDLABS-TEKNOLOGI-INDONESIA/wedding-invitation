import { Disc3, Pause, Play, VolumeX } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface MusicPlayerProps {
  url: string;
  visible?: boolean;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ url, visible = true }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userPausedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);

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

  return (
    <>
      <audio ref={audioRef} src={url} loop preload="none" className="hidden" />
      {visible && (
        <button
          type="button"
          onClick={toggleMusic}
          aria-label={isPlaying ? "Jeda musik latar" : "Putar musik latar"}
          title={isPlaying ? "Jeda Musik" : "Putar Musik"}
          className="frosted-glass group fixed top-4 right-4 z-[120] flex h-12 w-12 items-center justify-center rounded-full border border-white/40 text-slate-700 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 md:top-6 md:right-6 md:h-14 md:w-14 dark:border-white/10 dark:text-white"
        >
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

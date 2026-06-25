import React, { useEffect, useRef } from "react";

const MusicPlayer: React.FC<{ url: string }> = ({ url }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handlePlay = () => {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    };
    window.addEventListener("play-wedding-music", handlePlay);
    return () => window.removeEventListener("play-wedding-music", handlePlay);
  }, []);

  return (
    <audio ref={audioRef} src={url} loop preload="auto" className="hidden" />
  );
};

export default MusicPlayer;

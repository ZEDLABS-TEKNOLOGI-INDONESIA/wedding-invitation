import React, { useEffect, useRef } from "react";
import { MUSIC_URL } from "../constants";

const MusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handlePlay = () => {
      if (audioRef.current) {
        audioRef.current.play().catch((err) => {
          console.warn(
            "Autoplay dicegah oleh browser, membutuhkan interaksi pengguna.",
            err
          );
        });
      }
    };

    window.addEventListener("play-wedding-music", handlePlay);

    return () => {
      window.removeEventListener("play-wedding-music", handlePlay);
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      src={MUSIC_URL}
      loop
      preload="auto"
      className="hidden"
    />
  );
};

export default MusicPlayer;

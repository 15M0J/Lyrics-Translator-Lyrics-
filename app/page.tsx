"use client";

import { useState, useRef, useEffect } from "react";

type LyricLine = {
  time: number;
  text: string;
  words: string[];
};

export default function Home() {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLine, setCurrentLine] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

const parseLRC = (text: string): LyricLine[] => {
  const lines = text
    .split("\n")
    .map((line) => {
      const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
      if (!match) return null;

      return {
        time: parseFloat(match[1]) * 60 + parseFloat(match[2]),
        text: match[3].trim(),
        words: match[3].trim().split(" "),
      } as LyricLine;
    })
    .filter((line): line is LyricLine => Boolean(line)); // ✅ explicit type guard

  return lines;
};

  // ✅ Load lyrics on mount (update filename if needed)
  useEffect(() => {
    fetch("/lyrics.lrc")
      .then((res) => res.text())
      .then((text) => setLyrics(parseLRC(text)))
      .catch((err) => console.error("Error loading LRC:", err));
  }, []);

  // ✅ Sync lyrics with audio playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || lyrics.length === 0) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      const index = lyrics.findIndex((line, i) => {
        const next = lyrics[i + 1];
        return currentTime >= line.time && (!next || currentTime < next.time);
      });
      if (index !== -1) setCurrentLine(index);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [lyrics]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-800 via-indigo-900 to-black text-white p-8">
      <h1 className="text-4xl font-bold mb-6 text-center">
        🎵 Lyrics Translator / Karaoke
      </h1>

      {/* Audio Player */}
      <audio
        ref={audioRef}
        controls
        className="w-full max-w-md mb-8"
        src="/audio.mp3" // ✅ ensure your audio file is in /public/audio.mp3
      />

      {/* Lyrics Section */}
      <div className="w-full max-w-2xl bg-white/10 rounded-2xl p-6 backdrop-blur-md shadow-lg border border-white/20">
        {lyrics.map((line, i) => (
          <p
            key={i}
            className={`transition-all duration-300 text-center ${
              i === currentLine
                ? "text-yellow-400 text-2xl font-bold scale-105"
                : "text-gray-300 text-lg"
            }`}
          >
            {line.words.map((word, wIdx) => (
              <span
                key={wIdx}
                className={`${
                  i === currentLine
                    ? "animate-pulse inline-block mx-1"
                    : "inline-block mx-1"
                }`}
              >
                {word}
              </span>
            ))}
          </p>
        ))}
      </div>
    </main>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";

type LyricLine = {
  time: number;
  text: string;
  words: string[];
};

export default function Home() {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [translatedLyrics, setTranslatedLyrics] = useState<LyricLine[]>([]);
  const [currentLine, setCurrentLine] = useState<number>(0);
  const [showTranslation, setShowTranslation] = useState<'original' | 'translated' | 'both'>('both');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Parse LRC text into LyricLine[]
  const parseLRC = (text: string): LyricLine[] => {
    return text
      .split("\n")
      .map((line) => {
        const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
        if (!match) return null;
        return {
          time: parseInt(match[1], 10) * 60 + parseFloat(match[2]),
          text: match[3].trim(),
          words: match[3].trim().split(" "),
        } as LyricLine;
      })
      .filter((line): line is LyricLine => Boolean(line)); // ✅ Type guard
  };

  // Load both original and translated lyrics
  useEffect(() => {
    fetch("/audio/lyrics.lrc")
      .then((res) => res.text())
      .then((text) => setLyrics(parseLRC(text)))
      .catch((err) => console.error("Error loading original lyrics:", err));

    fetch("/audio/lyrics_translated.lrc")
      .then((res) => res.text())
      .then((text) => setTranslatedLyrics(parseLRC(text)))
      .catch((err) => console.error("Error loading translated lyrics:", err));
  }, []);

  // Sync lyrics with audio playback
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
        src="/audio/Shaky.mp3"
      />

      {/* Lyrics Section */}
      <div className="w-full max-w-2xl bg-white/10 rounded-2xl p-6 backdrop-blur-md shadow-lg border border-white/20">
        {/* Toggle buttons */}
        <div className="flex gap-2 mb-4 justify-center">
          {['original','translated','both'].map((mode) => (
            <button
              key={mode}
              className={`px-3 py-1 rounded ${
                showTranslation === mode ? 'bg-green-500 text-black' : 'bg-white/20 text-white'
              }`}
              onClick={() => setShowTranslation(mode as any)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Lyrics Display */}
        {lyrics.map((line, i) => {
          const translated = translatedLyrics[i]?.text || '';
          const isActive = i === currentLine;

          return (
            <div key={i} className="mb-2">
              {(showTranslation === 'original' || showTranslation === 'both') && (
                <p
                  className={`transition-all duration-300 text-center ${
                    isActive
                      ? 'text-yellow-400 text-2xl font-bold scale-105'
                      : 'text-gray-300 text-lg'
                  }`}
                >
                  {line.words.map((word, wIdx) => (
                    <span
                      key={wIdx}
                      className={`${isActive ? 'animate-pulse inline-block mx-1' : 'inline-block mx-1'}`}
                    >
                      {word}
                    </span>
                  ))}
                </p>
              )}
              {(showTranslation === 'translated' || showTranslation === 'both') && translated && (
                <p
                  className={`transition-all duration-300 text-center ${
                    isActive ? 'text-gray-200 text-xl italic' : 'text-gray-400 text-sm'
                  }`}
                >
                  {translated}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}


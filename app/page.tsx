"use client";

import { useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";

type LyricLine = {
  time: number;
  text: string;
  words?: string[];
};

export default function Home() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [translatedLyrics, setTranslatedLyrics] = useState<LyricLine[]>([]);
  const [currentLine, setCurrentLine] = useState<number>(-1);
  const [showTranslation, setShowTranslation] = useState<"original" | "translated" | "both">("both");
  const [lineProgress, setLineProgress] = useState<number>(0);

  // Parse LRC text
  const parseLRC = (text: string): LyricLine[] => {
    return text
      .split("\n")
      .map((line) => {
        const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
        if (match) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseFloat(match[2]);
          const time = minutes * 60 + seconds;
          const lyricText = match[3].trim();
          return { time, text: lyricText, words: lyricText.split(" ") };
        }
        return null;
      })
      .filter((line): line is LyricLine => line !== null);
  };

  // Load lyrics
  useEffect(() => {
    const fetchLyrics = async () => {
      try {
        const resOriginal = await fetch("/audio/lyrics.lrc");
        if (!resOriginal.ok) throw new Error("Original lyrics not found");
        const textOriginal = await resOriginal.text();
        setLyrics(parseLRC(textOriginal));
      } catch (err) {
        console.error("Error loading original lyrics:", err);
      }

      try {
        const resTranslated = await fetch("/audio/lyrics_translated.lrc");
        if (!resTranslated.ok) throw new Error("Translated lyrics not found");
        const textTranslated = await resTranslated.text();
        setTranslatedLyrics(parseLRC(textTranslated));
      } catch (err) {
        console.error("Error loading translated lyrics:", err);
      }
    };

    fetchLyrics();
  }, []);

  // Sync with audio
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    let currentTime = audioRef.current.currentTime;

    // Apply delays
    if (currentTime > 15) currentTime -= 1.5;
    if (currentTime > 20) currentTime -= 1;
    if (currentTime > 27) currentTime -= 1;

    const index = lyrics.findIndex(
      (line, i) =>
        currentTime >= line.time &&
        (i === lyrics.length - 1 || currentTime < lyrics[i + 1].time)
    );
    setCurrentLine(index);

    if (index !== -1) {
      const startTime = lyrics[index].time;
      const endTime = lyrics[index + 1]?.time || audioRef.current.duration || startTime + 1;
      const progress = Math.min((currentTime - startTime) / (endTime - startTime), 1);
      setLineProgress(progress);

      const activeLineEl = lineRefs.current[index];
      if (activeLineEl) {
        activeLineEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setLineProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-start p-6 font-sans">
      <h1 className="text-4xl font-extrabold mb-6 tracking-wide">🎵 Lyrics+</h1>

      {/* Audio Player */}
      <audio
        ref={audioRef}
        controls
        onTimeUpdate={handleTimeUpdate}
        className="mb-4 w-full max-w-xl rounded-lg shadow-lg"
      >
        <source src="/audio/shaky.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      {/* Toggle Controls */}
      <div className="flex gap-3 mb-6">
        {["original", "translated", "both"].map((mode) => (
          <button
            key={mode}
            className={`px-4 py-2 rounded-full font-semibold transition-colors ${
              showTranslation === mode ? "bg-[#32D74B] text-black shadow-md" : "bg-white/10 text-gray-400"
            }`}
            onClick={() => setShowTranslation(mode as "original" | "translated" | "both")}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Lyrics Container */}
      <div className="relative w-full max-w-xl h-[22rem] overflow-y-auto flex flex-col bg-black/90 backdrop-blur-sm rounded-xl p-6 shadow-inner">
        {/* Top fade */}
        <div className="pointer-events-none absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-black via-black/60 to-transparent z-10 rounded-t-xl" />
        {/* Bottom fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black via-black/60 to-transparent z-10 rounded-b-xl" />

        <div className="flex flex-col space-y-6 relative z-0">
          {lyrics.map((line, i) => {
            const translated = translatedLyrics[i]?.text || "";
            const isActive = i === currentLine;
            const words = line.words || [];

            const opacity = isActive ? 1 : Math.max(0.4, 1 - Math.abs(i - currentLine) * 0.25);

            return (
              <div key={i} ref={(el) => (lineRefs.current[i] = el)} className="relative transition-all duration-300" style={{ opacity }}>
                {/* Original Lyrics */}
                {(showTranslation === "original" || showTranslation === "both") && (
                  <p className={`relative inline-block ${isActive ? "text-2xl font-bold" : "text-lg text-gray-400"}`}>
                    {words.map((word, idx) => {
                      const wordProgress = isActive ? Math.min(Math.max(lineProgress * words.length - idx, 0), 1) : 0;

                      return (
                        <span key={idx} className="relative inline-block mr-2">
                          {wordProgress > 0 && (
                            <span
                              className="absolute top-0 left-0 h-full pointer-events-none"
                              style={{
                                width: `${wordProgress * 100}%`,
                                background: "linear-gradient(to right, rgba(255,255,255,0.25), rgba(255,255,255,0))",
                              }}
                            />
                          )}
                          <span className="relative text-white">{word}</span>
                        </span>
                      );
                    })}
                  </p>
                )}

                {/* Translated Lyrics */}
                {(showTranslation === "translated" || showTranslation === "both") && translated && (
                  <p className={`${isActive ? "text-gray-300 text-base italic" : "text-gray-500 text-sm"} transition-all duration-300`}>
                    {translated}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
}

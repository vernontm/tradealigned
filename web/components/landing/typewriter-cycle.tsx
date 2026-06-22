"use client";

import { useEffect, useState } from "react";

/**
 * Cycles through a list of two-word phrases with a typewriter effect: types
 * the phrase, holds, deletes, advances. The second word is colored.
 */

const PHRASES: Array<{ first: string; second: string }> = [
  { first: "Learn", second: "Faster." },
  { first: "Trade", second: "Smarter." },
  { first: "Trade", second: "Better." },
];

const TYPE_MS = 70;
const DELETE_MS = 35;
const HOLD_MS = 1400;

export function TypewriterCycle() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [mode, setMode] = useState<"typing" | "holding" | "deleting">("typing");

  const phrase = PHRASES[phraseIdx];
  const full = `${phrase.first} ${phrase.second}`;

  useEffect(() => {
    if (mode === "typing") {
      if (charCount < full.length) {
        const t = setTimeout(() => setCharCount(charCount + 1), TYPE_MS);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setMode("holding"), 0);
      return () => clearTimeout(t);
    }
    if (mode === "holding") {
      const t = setTimeout(() => setMode("deleting"), HOLD_MS);
      return () => clearTimeout(t);
    }
    // deleting
    if (charCount > 0) {
      const t = setTimeout(() => setCharCount(charCount - 1), DELETE_MS);
      return () => clearTimeout(t);
    }
    setPhraseIdx((i) => (i + 1) % PHRASES.length);
    setMode("typing");
  }, [mode, charCount, full]);

  // Split the visible substring between the first word + space and the
  // second word so each gets its own color.
  const firstLen = phrase.first.length + 1; // word + space
  const visibleFirst =
    charCount <= firstLen ? full.slice(0, charCount) : phrase.first + " ";
  const visibleSecond =
    charCount > firstLen ? full.slice(firstLen, charCount) : "";

  return (
    <span className="inline-block min-h-[1em]">
      <span>{visibleFirst}</span>
      <span className="bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
        {visibleSecond}
      </span>
      <span
        className="ml-0.5 inline-block w-[0.06em] animate-pulse bg-white align-baseline"
        style={{ height: "0.9em" }}
        aria-hidden
      />
    </span>
  );
}

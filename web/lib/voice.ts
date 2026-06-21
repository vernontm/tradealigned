"use client";

/**
 * Browser TTS wrapper. Holds the user's voice-on preference in localStorage,
 * exposes speak/stop/cancel helpers, and notifies subscribers when state
 * changes so React components can stay in sync.
 *
 * Designed so the backend voice (OpenAI / ElevenLabs) can drop in later
 * by swapping `speakNative` for a streaming audio fetch, the public API
 * stays the same.
 */

const PREF_KEY = "ray-ai-voice-on.v1";

let isSpeaking = false;
let currentUtterance: SpeechSynthesisUtterance | null = null;

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ray-voice-changed"));
}

export function voiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isVoiceOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function setVoiceOn(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREF_KEY, on ? "1" : "0");
  } catch {
    // ignore
  }
  if (!on) cancel();
  emit();
}

export function isCurrentlySpeaking(): boolean {
  return isSpeaking;
}

export function onVoiceChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("ray-voice-changed", handler);
  return () => window.removeEventListener("ray-voice-changed", handler);
}

/** Pick the best available English voice, prefer named natural ones. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (!voiceSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const preferred = [
    "Samantha",
    "Karen",
    "Alex",
    "Daniel",
    "Google US English",
    "Microsoft Aria Online (Natural)",
  ];
  for (const name of preferred) {
    const v = voices.find((vc) => vc.name.includes(name));
    if (v) return v;
  }
  return (
    voices.find((v) => v.lang.startsWith("en")) ?? voices[0] ?? null
  );
}

/** Strip markdown / code blocks so the TTS engine reads cleanly. */
function clean(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " (code) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/#+\s/g, "")
    .replace(/^>\s?/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Speak the given text immediately. Cancels anything already speaking. */
export function speak(text: string) {
  if (!voiceSupported()) return;
  cancel();
  const cleaned = clean(text);
  if (!cleaned) return;

  const utter = new SpeechSynthesisUtterance(cleaned);
  utter.rate = 1.05;
  utter.pitch = 1;
  utter.volume = 1;
  const voice = pickVoice();
  if (voice) utter.voice = voice;

  utter.onstart = () => {
    isSpeaking = true;
    emit();
  };
  utter.onend = () => {
    isSpeaking = false;
    currentUtterance = null;
    emit();
  };
  utter.onerror = () => {
    isSpeaking = false;
    currentUtterance = null;
    emit();
  };

  currentUtterance = utter;
  window.speechSynthesis.speak(utter);
}

/** Stop any in-flight speech. */
export function cancel() {
  if (!voiceSupported()) return;
  window.speechSynthesis.cancel();
  isSpeaking = false;
  currentUtterance = null;
  emit();
}

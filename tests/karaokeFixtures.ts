import type { LyricLine } from "../src/types";

export const fixtures: Record<string, LyricLine> = {
  words: { startTime: 1000, text: "One  two 🎵!", syllables: [
    { text: "One ", startTime: 1000, endTime: 1060 },
    { text: " two 🎵!", startTime: 1250, endTime: 2100 },
  ] },
  cjk: { startTime: 1000, text: "夢を 見てる", syllables: [
    { text: "夢を ", startTime: 1000, endTime: 1500 },
    { text: "見てる", startTime: 1400, endTime: 2500 },
  ] },
  rtl: { startTime: 1000, text: "שלום hello עולם", syllables: [
    { text: "שלום hello עולם", startTime: 1000, endTime: 2800 },
  ] },
  joining: { startTime: 1000, text: "مرحبا بالعالم", syllables: [
    { text: "مرحبا ", startTime: 1000, endTime: 1800 },
    { text: "بالعالم", startTime: 1300, endTime: 3000 },
  ] },
  fallback: { startTime: 1000, endTime: 2300, text: "é 🎤 x", speaker: "CUSTOM", speakerColor: "#ABCDEF", speakerFallback: "FEMALE 1" },
  duet: { startTime: 1000, text: "Lead (back)", vocals: {
    lead: { text: "Lead", speaker: "MALE CUSTOM", speakerColor: "#aabbcc", syllables: [
      { text: "Lead", startTime: 1000, endTime: 2000 },
    ] },
    background: [{ text: "(back)", speaker: "FEMALE 1", kind: "harmony", syllables: [
      { text: "(back)", startTime: 1400, endTime: 3100 },
    ] }],
  } },
  triple: { startTime: 1000, text: "A (B) C", vocals: {
    lead: { id: "one", text: "A", phonetic: "えー", syllables: [{ text: "A", startTime: 1000, endTime: 1600 }] },
    background: [
      { id: "two", text: "(B)", translation: "second", syllables: [{ text: "B", startTime: 1300, endTime: 2200 }] },
      { id: "three", text: "C", syllables: [{ text: "C", startTime: 1800, endTime: 2900 }] },
    ],
  } },
};

export const positions = [0, 850, 990, 1000, 1025, 1075, 1250, 1450, 1750, 2100, 2500, 3050, 3500, 5000];
export const auxiliary = { showPhonetic: true, showTranslation: true,
  phonetic: "lead (back)", translation: "first / second" };

import { useCallback, useSyncExternalStore } from "react";
import type { LyricLine } from "./types";

export interface FrameScheduler {
  now(): number;
  request(callback: (now: number) => void): number;
  cancel(id: number): void;
}

// One clock per overlay. Publishing a frame does not itself render App: each
// subscriber selects its own stable snapshot (line index or timed row position).
export class PlaybackClock {
  private listeners = new Set<() => void>();
  private position = 0;
  private anchor = 0;
  private anchoredAt = 0;
  private playing = false;
  private enabled = false;
  private frame: number | null = null;

  constructor(private scheduler: FrameScheduler = {
    now: () => performance.now(),
    request: (callback) => requestAnimationFrame(callback),
    cancel: (id) => cancelAnimationFrame(id),
  }) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    this.schedule();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.cancelFrame();
    };
  };

  getPosition = () => this.position;

  setPlayback(position: number, playing: boolean) {
    this.anchor = position;
    this.anchoredAt = this.scheduler.now();
    this.playing = playing;
    this.publish(position);
    if (!playing) this.cancelFrame();
    this.schedule();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.cancelFrame();
    else this.publish(this.currentPosition(this.scheduler.now()));
    this.schedule();
  }

  private currentPosition(now: number) {
    return this.anchor + (this.playing ? Math.max(0, now - this.anchoredAt) : 0);
  }

  private publish(position: number) {
    if (position === this.position) return;
    this.position = position;
    this.listeners.forEach((listener) => listener());
  }

  private cancelFrame() {
    if (this.frame !== null) this.scheduler.cancel(this.frame);
    this.frame = null;
  }

  private schedule() {
    if (this.frame !== null || !this.enabled || !this.playing || this.listeners.size === 0) return;
    this.frame = this.scheduler.request((now) => {
      this.frame = null;
      this.publish(this.currentPosition(now));
      this.schedule();
    });
  }
}

// Prefix maxima retain the old "last array index already started" behavior
// even for duplicate or unsorted provider timestamps, with logarithmic lookup.
export function createLineLookup(lyrics: LyricLine[]) {
  const boundaries = lyrics.map((line, index) => ({ start: line.startTime, index }))
    .filter(({ start }) => Number.isFinite(start))
    .sort((a, b) => a.start - b.start || a.index - b.index);
  let lastIndex = -1;
  const indices = boundaries.map(({ index }) => (lastIndex = Math.max(lastIndex, index)));
  return (position: number) => {
    if (Number.isNaN(position)) return -1;
    let low = 0;
    let high = boundaries.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (boundaries[middle].start <= position) low = middle + 1;
      else high = middle;
    }
    return low === 0 ? -1 : indices[low - 1];
  };
}

export function useActiveLineIndex(clock: PlaybackClock, lookup: (position: number) => number) {
  const snapshot = useCallback(() => lookup(clock.getPosition()), [clock, lookup]);
  return useSyncExternalStore(clock.subscribe, snapshot, snapshot);
}

const noSubscription = () => () => {};

export function useTimedRowPosition(
  clock: PlaybackClock | undefined,
  fallbackPosition: number,
  start: number,
  end: number,
  isActive: boolean,
) {
  const snapshot = useCallback(() => {
    if (!clock) return fallbackPosition;
    const position = clock.getPosition();
    // Inactive rows always render pending: fill and bounce ignore their time.
    // Every selected vocal row keeps its own full singing/release window.
    if (!isActive) return -Infinity;
    return Math.max(start, Math.min(end, position));
  }, [clock, fallbackPosition, start, end, isActive]);
  // Selection changes already arrive through props. An inactive row's constant
  // snapshot needs no frame notifications; the App's line-index subscription
  // keeps the shared clock current until that row becomes selected again.
  const subscribe = clock && isActive ? clock.subscribe : noSubscription;
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

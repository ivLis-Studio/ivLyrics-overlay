import { useCallback, useSyncExternalStore } from "react";
import type { LyricLine } from "./types";

export interface FrameScheduler {
  now(): number;
  request(callback: (now: number) => void): number;
  cancel(id: number): void;
  // A single wake-up after a delay: the clock moves line-timed lyrics this way.
  delay(callback: () => void, ms: number): number;
  cancelDelay(id: number): void;
}

// One clock per overlay. Publishing a frame does not itself render App: each
// subscriber selects its own stable snapshot (line index or timed row position).
// Word-timed lyrics move every frame. Line-timed ones (or karaoke turned off)
// only change at line starts, so the clock then wakes at the next one instead:
// the line still moves on time between the sender's progress reports.
export class PlaybackClock {
  private listeners = new Set<() => void>();
  private position = 0;
  private anchor = 0;
  private anchoredAt = 0;
  private playing = false;
  private enabled = false;
  private everyFrame = true;
  private nextChange: ((position: number) => number) | null = null;
  private frame: number | null = null;
  private wake: number | null = null;

  constructor(private scheduler: FrameScheduler = {
    now: () => performance.now(),
    request: (callback) => requestAnimationFrame(callback),
    cancel: (id) => cancelAnimationFrame(id),
    delay: (callback, ms) => window.setTimeout(callback, ms),
    cancelDelay: (id) => window.clearTimeout(id),
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
    // A new anchor moves the next line start in time.
    if (!playing || !this.everyFrame) this.cancelFrame();
    this.schedule();
  }

  /** enabled: someone sees the lyrics; everyFrame: word timing animates between line starts. */
  setEnabled(enabled: boolean, everyFrame = true) {
    this.enabled = enabled;
    if (!enabled || everyFrame !== this.everyFrame) this.cancelFrame();
    this.everyFrame = everyFrame;
    if (enabled) this.publish(this.currentPosition(this.scheduler.now()));
    this.schedule();
  }

  /** The next position (ms) after which a subscriber's snapshot changes, or Infinity. */
  setNextChange(nextChange: ((position: number) => number) | null) {
    this.nextChange = nextChange;
    if (!this.everyFrame) this.cancelFrame();
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
    if (this.wake !== null) this.scheduler.cancelDelay(this.wake);
    this.wake = null;
  }

  private schedule() {
    if (this.frame !== null || this.wake !== null || !this.enabled || !this.playing || this.listeners.size === 0) return;
    if (this.everyFrame) {
      this.frame = this.scheduler.request((now) => {
        this.frame = null;
        this.publish(this.currentPosition(now));
        this.schedule();
      });
      return;
    }
    const position = this.currentPosition(this.scheduler.now());
    const next = this.nextChange ? this.nextChange(position) : Infinity;
    if (!Number.isFinite(next)) return;
    // A few milliseconds past the start, so the lookup sees the new line.
    this.wake = this.scheduler.delay(() => {
      this.wake = null;
      this.publish(this.currentPosition(this.scheduler.now()));
      this.schedule();
    }, Math.max(0, next - position) + 4);
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

/** The first line start after a position (Infinity after the last), for waking at line changes. */
export function createNextLineStart(lyrics: LyricLine[]) {
  const starts = [...new Set(lyrics.map((line) => line.startTime).filter((start) => Number.isFinite(start)))].sort((a, b) => a - b);
  return (position: number) => {
    let low = 0;
    let high = starts.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (starts[middle] <= position) low = middle + 1;
      else high = middle;
    }
    return low < starts.length ? starts[low] : Infinity;
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

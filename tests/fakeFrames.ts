import type { FrameScheduler } from "../src/playbackClock";

export class FakeFrames implements FrameScheduler {
  time = 0;
  nextId = 0;
  pending = new Map<number, (now: number) => void>();
  delays = new Map<number, { due: number; callback: () => void }>();
  now = () => this.time;
  request = (callback: (now: number) => void) => {
    const id = ++this.nextId;
    this.pending.set(id, callback);
    return id;
  };
  cancel = (id: number) => { this.pending.delete(id); };
  delay = (callback: () => void, ms: number) => {
    const id = ++this.nextId;
    this.delays.set(id, { due: this.time + ms, callback });
    return id;
  };
  cancelDelay = (id: number) => { this.delays.delete(id); };
  advance(time: number) {
    // Wake-ups due by then fire first, in order, each at its own time.
    for (;;) {
      const due = [...this.delays.entries()].filter(([, entry]) => entry.due <= time).sort((a, b) => a[1].due - b[1].due)[0];
      if (!due) break;
      this.delays.delete(due[0]);
      this.time = Math.max(this.time, due[1].due);
      due[1].callback();
    }
    this.time = time;
    const callbacks = [...this.pending.values()];
    this.pending.clear();
    callbacks.forEach((callback) => callback(time));
  }
}

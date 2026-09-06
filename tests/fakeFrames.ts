import type { FrameScheduler } from "../src/playbackClock";

export class FakeFrames implements FrameScheduler {
  time = 0;
  nextId = 0;
  pending = new Map<number, (now: number) => void>();
  now = () => this.time;
  request = (callback: (now: number) => void) => {
    const id = ++this.nextId;
    this.pending.set(id, callback);
    return id;
  };
  cancel = (id: number) => { this.pending.delete(id); };
  advance(time: number) {
    this.time = time;
    const callbacks = [...this.pending.values()];
    this.pending.clear();
    callbacks.forEach((callback) => callback(time));
  }
}

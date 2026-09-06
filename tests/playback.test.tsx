import React, { Profiler, useMemo } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import KaraokeLyrics from "../src/KaraokeLyrics";
import { PlaybackClock, createLineLookup, useActiveLineIndex } from "../src/playbackClock";
import type { LyricLine } from "../src/types";
import { FakeFrames } from "./fakeFrames";
import { fixtures, positions, auxiliary } from "./karaokeFixtures";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });


const freeze = <T,>(value: T): T => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

test("392 direct/production-clock snapshots preserve original fill, bounce, wrap, joining scripts and vocal auxiliaries", () => {
  // Captured from KaraokeLyrics at v1.2.5 before the clock/preparation refactor.
  const baseline = JSON.parse(readFileSync(new URL("./karaoke-baseline.json", import.meta.url), "utf8"));
  for (const [name, line] of Object.entries(fixtures)) {
    freeze(line);
    for (const isActive of [false, true]) for (const position of positions) {
      const html = renderToStaticMarkup(<KaraokeLyrics line={line} position={position} isActive={isActive} {...auxiliary} />);
      const hash = createHash("sha256").update(html).digest("hex");
      assert.equal(hash, baseline[`${name}/${isActive}/${position}`], `${name}/${isActive}/${position}`);
      const clock = new PlaybackClock(new FakeFrames());
      clock.setPlayback(position, true);
      const clockHtml = renderToStaticMarkup(<KaraokeLyrics line={line} clock={clock} isActive={isActive} {...auxiliary} />);
      assert.equal(createHash("sha256").update(clockHtml).digest("hex"), hash, `production clock ${name}/${isActive}/${position}`);
    }
  }
});

test("line lookup matches reverse scan at duplicates, unsorted boundaries, seeks and empty data", () => {
  const lines = [1000, 1500, 1500, 1200, 9000, NaN, 5000].map((startTime) => ({ startTime, text: "x" }));
  const lookup = createLineLookup(lines);
  for (let position = -1; position < 10000; position += 17) {
    const expected = lines.findLastIndex((line) => position >= line.startTime);
    assert.equal(lookup(position), expected);
  }
  for (const position of [1000, 1200, 1500, 5000, 9000, 0, 5000, 1000, NaN]) {
    assert.equal(lookup(position), lines.findLastIndex((line) => position >= line.startTime));
  }
  assert.equal(createLineLookup([])(1000), -1);
});

test("clock sleeps without visible consumers, reanchors on seek/pause, and resumes elapsed playback", () => {
  const frames = new FakeFrames();
  const clock = new PlaybackClock(frames);
  clock.setPlayback(1000, true);
  clock.setEnabled(true);
  assert.equal(frames.pending.size, 0);
  const unsubscribe = clock.subscribe(() => {});
  assert.equal(frames.pending.size, 1);
  frames.advance(100);
  assert.equal(clock.getPosition(), 1100);
  clock.setEnabled(false);
  assert.equal(frames.pending.size, 0);
  frames.advance(5000);
  assert.equal(clock.getPosition(), 1100);
  clock.setEnabled(true);
  assert.equal(clock.getPosition(), 6000);
  clock.setPlayback(250, false);
  assert.equal(clock.getPosition(), 250);
  assert.equal(frames.pending.size, 0);
  clock.setPlayback(300, true);
  frames.advance(5100);
  assert.equal(clock.getPosition(), 400);
  unsubscribe();
  assert.equal(frames.pending.size, 0);
});

test("60 frames only commit selected rows; App and all inactive rows stay unchanged", async () => {
  const frames = new FakeFrames();
  const clock = new PlaybackClock(frames);
  const lines: LyricLine[] = [
    { startTime: 0, text: "past", syllables: [{ text: "past", startTime: 0, endTime: 100 }] },
    { startTime: 800, text: "overlap", syllables: [{ text: "overlap", startTime: 800, endTime: 2400 }] },
    { startTime: 1000, text: "current", syllables: [{ text: "current", startTime: 1000, endTime: 4000 }] },
    { startTime: 5000, text: "future", syllables: [{ text: "future", startTime: 5000, endTime: 6000 }] },
  ];
  clock.setPlayback(1200, true);
  clock.setEnabled(true);
  let appRenders = 0;
  const rowCommits = [0, 0, 0, 0];
  function Harness() {
    appRenders++;
    const lookup = useMemo(() => createLineLookup(lines), []);
    const active = useActiveLineIndex(clock, lookup);
    return <>{lines.map((line, index) => <Profiler key={index} id={String(index)} onRender={() => rowCommits[index]++}>
      <KaraokeLyrics line={line} clock={clock} isActive={active === index} {...auxiliary} />
    </Profiler>)}</>;
  }
  let renderer!: ReactTestRenderer;
  await act(() => { renderer = create(<Harness />); });
  const mounted = [...rowCommits];
  for (let frame = 1; frame <= 60; frame++) await act(() => frames.advance(frame * 10));
  assert.equal(appRenders, 1);
  assert.equal(rowCommits[0], mounted[0]);
  assert.equal(rowCommits[3], mounted[3]);
  assert.equal(rowCommits[1], mounted[1], "inactive overlap preserves the original pending appearance");
  assert.equal(rowCommits[2] - mounted[2], 60);
  await act(() => frames.advance(4000));
  assert.equal(appRenders, 2, "only crossing a line boundary rerenders the parent");
  const finished = rowCommits[1];
  for (let frame = 1; frame <= 10; frame++) await act(() => frames.advance(4000 + frame * 10));
  assert.equal(rowCommits[1], finished, "inactive overlapping row remains idle");
  await act(() => clock.setPlayback(1000, false));
  assert.equal(appRenders, 3, "backward seek updates the active line");
  await act(() => renderer.unmount());
  assert.equal(frames.pending.size, 0);
});

test("a selected row keeps its release bounce, including joining-script segment duration", async () => {
  const frames = new FakeFrames();
  const clock = new PlaybackClock(frames);
  const line = { startTime: 1000, text: "م", syllables: [{ text: "م", startTime: 1000, endTime: 1100 }] };
  clock.setPlayback(1150, true);
  clock.setEnabled(true);
  let renderer!: ReactTestRenderer;
  await act(() => { renderer = create(<KaraokeLyrics line={line} clock={clock} isActive={true} {...auxiliary} />); });
  assert.ok(JSON.stringify(renderer.toJSON()).includes("is-bouncing"));
  await act(() => frames.advance(20));
  assert.ok(JSON.stringify(renderer.toJSON()).includes("is-bouncing"));
  await act(() => frames.advance(1000));
  assert.ok(!JSON.stringify(renderer.toJSON()).includes("is-bouncing"));
  await act(() => renderer.unmount());
});

test("selected duet background keeps filling after the lead finishes its release", async () => {
  const frames = new FakeFrames();
  const clock = new PlaybackClock(frames);
  const line: LyricLine = { startTime: 1000, text: "A B", vocals: {
    lead: { syllables: [{ text: "A", startTime: 1000, endTime: 1100 }] },
    background: [{ syllables: [{ text: "B", startTime: 1400, endTime: 4000 }] }],
  } };
  clock.setPlayback(1800, true);
  clock.setEnabled(true);
  let renderer!: ReactTestRenderer;
  await act(() => { renderer = create(<KaraokeLyrics line={line} clock={clock} isActive={true} {...auxiliary} />); });
  const rowState = (role: string) => {
    const part = renderer.root.find((node) => node.type === "span" && node.props.className?.startsWith(`karaoke-part ${role} `));
    return JSON.stringify(part.findAllByType("span").map((node) => ({ className: node.props.className, style: node.props.style })));
  };
  const leadBefore = rowState("lead");
  const backgroundBefore = rowState("background");
  for (let frame = 1; frame <= 60; frame++) await act(() => frames.advance(frame * 10));
  assert.equal(rowState("lead"), leadBefore);
  assert.notEqual(rowState("background"), backgroundBefore, "background keeps its independent timed window");
  await act(() => renderer.unmount());
});

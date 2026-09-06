import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { build } from "esbuild";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FakeFrames } from "./fakeFrames";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test("production App playback, bootstrap and supplement regressions", async (t) => {
  const temporary = await mkdtemp(fileURLToPath(new URL("./.app-test-", import.meta.url)));
  const output = `${temporary}/App.mjs`;
  const originalGlobals = new Map<string, PropertyDescriptor | undefined>();
  const setGlobal = (key: string, value: unknown) => {
    if (!originalGlobals.has(key)) originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  };
  let renderer: ReactTestRenderer | undefined;
  try {
    await build({
      entryPoints: [fileURLToPath(new URL("../src/App.tsx", import.meta.url))],
      outfile: output, bundle: true, format: "esm", platform: "node", jsx: "automatic",
      external: ["react", "react/jsx-runtime"], loader: { ".css": "empty" },
      define: { __APP_VERSION__: '"1.2.5"' },
      plugins: [{ name: "native-test-boundary", setup(builder) {
        builder.onLoad({ filter: /[/\\]src[/\\]App\.tsx$/ }, async (args) => ({
          contents: (await readFile(args.path, "utf8")).replace("function App() {", "function App() { globalThis.__overlayAppRenders++;"),
          loader: "tsx",
        }));
        builder.onResolve({ filter: /^@tauri-apps\// }, (args) => ({ path: args.path, namespace: "native" }));
        builder.onLoad({ filter: /.*/, namespace: "native" }, () => ({ contents: `
          export const listen = (...args) => globalThis.__overlayNativeTest.listen(...args);
          export const invoke = (...args) => globalThis.__overlayNativeTest.invoke(...args);
          export const check = async () => null;
          export const relaunch = async () => {};
          export const openUrl = async () => {};
        ` }));
        builder.onResolve({ filter: /^\.\/(SettingsPanel|SetupWizard)$/ }, (args) => ({ path: args.path, namespace: "settings" }));
        builder.onLoad({ filter: /.*/, namespace: "settings" }, () => ({ contents: "export default function SettingsUI() { return null; }" }));
      } }],
    });
    const App = (await import(pathToFileURL(output).href)).default;
    const frames = new FakeFrames();
    frames.time = performance.now();
    const listeners = new Map<string, Set<(event: { payload: unknown }) => void>>();
    const calls: string[] = [];
    const timers = new Map<number, () => void>();
    const browserListeners = new Map<string, Set<(event: unknown) => void>>();
    const bootstraps: Promise<unknown>[] = [];
    let timerId = 0;
    const storage = new Map([
      ["overlay-setup-complete", "true"],
      ["overlay-settings-v3", JSON.stringify({ hoverAppearance: "transparent", isLocked: true })],
    ]);
    const browser = {
      location: { search: "?settings=true" },
      addEventListener(name: string, callback: (event: unknown) => void) {
        const stream = browserListeners.get(name) || new Set();
        browserListeners.set(name, stream);
        stream.add(callback);
      },
      removeEventListener(name: string, callback: (event: unknown) => void) {
        browserListeners.get(name)?.delete(callback);
      },
      setTimeout(callback: () => void) { timers.set(++timerId, callback); return timerId; },
    };
    const native = {
      listen(name: string, callback: (event: { payload: unknown }) => void) {
        calls.push(`listen:${name}`);
        const stream = listeners.get(name) || new Set();
        listeners.set(name, stream);
        stream.add(callback);
        return Promise.resolve(() => stream.delete(callback));
      },
      invoke(name: string) {
        calls.push(`invoke:${name}`);
        return name === "get_latest_payloads"
          ? bootstraps.shift() || Promise.resolve({})
          : Promise.resolve(undefined);
      },
    };
    setGlobal("window", browser);
    setGlobal("navigator", { language: "en", languages: ["en"], platform: "MacIntel" });
    setGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    setGlobal("requestAnimationFrame", frames.request);
    setGlobal("cancelAnimationFrame", frames.cancel);
    setGlobal("__overlayNativeTest", native);
    setGlobal("__overlayAppRenders", 0);
    await act(async () => { renderer = create(<App />); });
    assert.ok(calls.includes("listen:lock-state-update"), "settings still receives tray lock changes");
    for (const call of ["listen:lyrics-update", "listen:progress-update", "listen:overlay-hover", "listen:unlock-progress", "invoke:get_latest_payloads"]) {
      assert.ok(!calls.includes(call), `settings must skip ${call}`);
    }
    assert.equal(frames.pending.size, 0);
    await act(() => { renderer!.unmount(); renderer = undefined; });

    browser.location.search = "";
    calls.length = 0;
    await act(async () => { renderer = create(<App />); });
    assert.ok(calls.includes("invoke:get_latest_payloads"));
    const emit = (name: string, payload: unknown) => {
      listeners.get(name)?.forEach((callback) => callback({ payload }));
    };
    const progress = (position = 1000, isPlaying = true, trackUri = "spotify:track:one") => emit("progress-update", {
      progressData: { trackUri, position, isPlaying },
    });
    await act(() => {
      progress();
      emit("lyrics-update", { lyricsData: { trackUri: "spotify:track:one", track: { title: "One", artist: "Artist" }, isSynced: true,
        lyrics: [{ startTime: 0, text: "A", syllables: [{ text: "A", startTime: 0, endTime: 10000 }] }] } });
    });
    assert.equal(frames.pending.size, 1);
    const countRenders = () => Reflect.get(globalThis, "__overlayAppRenders") as number;
    const beforeFrames = countRenders();
    assert.ok(beforeFrames > 0, "App render instrumentation must run on every host platform");
    const firstFrame = performance.now();
    for (let frame = 1; frame <= 60; frame++) await act(() => frames.advance(firstFrame + frame * 10));
    assert.equal(countRenders(), beforeFrames, "60 karaoke frames do not render the production App");
    await act(() => emit("overlay-hover", true));
    assert.equal(frames.pending.size, 0, "fully transparent hover stops interpolation");
    await act(() => emit("overlay-hover", false));
    assert.equal(frames.pending.size, 1);
    await act(() => timers.get(timerId)!());
    assert.equal(frames.pending.size, 0, "data timeout stops interpolation");
    await act(() => progress(1500));
    assert.equal(frames.pending.size, 1, "fresh data wakes interpolation");
    await act(() => progress(1600, false));
    assert.equal(frames.pending.size, 0, "paused playback has no animation loop");
    await act(() => {
      emit("lyrics-update", { lyricsData: { trackUri: "spotify:track:two", track: { title: "Two", artist: "Artist" }, isSynced: true,
        lyrics: [{ startTime: 0, text: "B", syllables: [{ text: "B", startTime: 0, endTime: 10000 }] }] } });
    });
    assert.ok(renderer!.root.findByProps({ className: "track-text" }).children.join("").includes("Artist - One"), "future-track lyrics remain pending");
    await act(() => progress(100, true, "spotify:track:two"));
    assert.ok(renderer!.root.findByProps({ className: "track-text" }).children.join("").includes("Artist - Two"), "matching progress applies pending lyrics");
    await act(() => { renderer!.unmount(); renderer = undefined; });
    assert.equal(frames.pending.size, 0);
    assert.ok([...listeners.values()].every((stream) => stream.size === 0));

    const deferred = () => {
      let resolve!: (value: unknown) => void;
      const promise = new Promise((done) => { resolve = done; });
      return { promise, resolve };
    };
    const settings = (extra: Record<string, unknown> = {}) => ({
      lyricsPrevLines: 0, lyricsNextLines: 0, hideWhenPaused: false, ...extra,
    });
    const mount = async (extra: Record<string, unknown> = {}) => {
      storage.set("overlay-settings-v3", JSON.stringify(settings(extra)));
      await act(async () => { renderer = create(<App />); });
    };
    const unmount = async () => {
      await act(() => { renderer!.unmount(); renderer = undefined; });
    };
    t.afterEach(async () => { if (renderer) await unmount(); });
    const updateSettings = async (extra: Record<string, unknown>) => {
      const newValue = JSON.stringify(settings(extra));
      await act(() => browserListeners.get("storage")?.forEach((callback) => callback({
        key: "overlay-settings-v3", newValue,
      })));
    };
    const markup = () => JSON.stringify(renderer!.toJSON());
    const baseLyrics = (trackUri = "spotify:track:one", translated = false) => ({
      trackUri, track: { title: trackUri, artist: "Artist" }, isSynced: true,
      lyrics: [
        { startTime: 0, text: "Before", transText: translated ? "이전 번역" : null },
        { startTime: 1000, text: "Current", transText: translated ? "현재 번역" : null },
      ],
    });
    for (const live of ["lyrics", "progress", "both"] as const) {
      await t.test(`late bootstrap preserves live ${live} and hydrates the other stream`, async () => {
        const bootstrap = deferred();
        bootstraps.push(bootstrap.promise);
        await mount();
        await act(() => {
          if (live !== "progress") emit("lyrics-update", { lyricsData: baseLyrics(undefined, true) });
          if (live !== "lyrics") progress(1500, false);
        });
        await act(async () => bootstrap.resolve({
          progressData: { trackUri: "spotify:track:one", position: live === "lyrics" ? 1500 : 250, isPlaying: false },
          lyricsData: baseLyrics(undefined, live === "progress"),
        }));
        assert.ok(markup().includes("현재 번역"), "current live position and translation must survive hydration");
        assert.ok(!markup().includes("이전 번역"), "the old snapshot must not rewind playback");
        await unmount();
      });
    }
    await t.test("old cached progress cannot clear newer live lyrics for another track", async () => {
      const bootstrap = deferred();
      bootstraps.push(bootstrap.promise);
      await mount();
      await act(() => emit("lyrics-update", { lyricsData: baseLyrics("spotify:track:new", true) }));
      await act(async () => bootstrap.resolve({
        progressData: { trackUri: "spotify:track:old", position: 250, isPlaying: false },
        lyricsData: baseLyrics("spotify:track:old"),
      }));
      await act(() => progress(1500, false, "spotify:track:new"));
      assert.ok(markup().includes("현재 번역"), "new-track lyrics must remain available for its progress");
      await unmount();
    });
    await t.test("an explicit live clear and unmount remain authoritative over bootstrap", async () => {
      const bootstrap = deferred();
      bootstraps.push(bootstrap.promise);
      await mount();
      await act(() => emit("lyrics-update", { lyricsData: { ...baseLyrics(), isSynced: false, lyrics: [] } }));
      await act(async () => bootstrap.resolve({ lyricsData: baseLyrics(undefined, true) }));
      assert.ok(!markup().includes("이전 번역"));
      await unmount();

      const abandoned = deferred();
      bootstraps.push(abandoned.promise);
      await mount();
      await unmount();
      const before = countRenders();
      await act(async () => abandoned.resolve({ lyricsData: baseLyrics(undefined, true) }));
      assert.equal(countRenders(), before);
      assert.equal(frames.pending.size, 0);
    });
    const sublines = (type: string) => renderer!.root.findAll((node) => (
      typeof node.type === "string" && String(node.props.className || "").split(/\s+/).includes(type)
    )).map((node) => node.children.filter((child) => typeof child === "string").join(""));
    await t.test("late matching phonetics cannot hide translation when phonetics are not displayed", async () => {
      await mount({ showPhonetic: false, showTranslation: true });
      const data = { ...baseLyrics(), lyrics: [{ startTime: 0, text: "Hello", transText: "안녕" }] };
      await act(() => emit("lyrics-update", { lyricsData: data }));
      assert.deepEqual(sublines("translation"), ["안녕"]);
      await act(() => emit("lyrics-update", { lyricsData: { ...data, lyrics: [{ ...data.lyrics[0], pronText: "안녕" }] } }));
      assert.deepEqual(sublines("translation"), ["안녕"]);
      assert.deepEqual(sublines("phonetic"), []);
      await updateSettings({ showPhonetic: true, showTranslation: true });
      assert.deepEqual(sublines("translation"), []);
      assert.deepEqual(sublines("phonetic"), ["안녕"]);
      await updateSettings({ showPhonetic: true, showTranslation: true, elementOrder: ["trackInfo", "original", "translation"] });
      assert.deepEqual(sublines("translation"), ["안녕"], "an omitted phonetic element is not visible");
      await unmount();
    });
    await t.test("vocal translations compare only with the phonetics actually rendered in their row", async () => {
      await mount({ showPhonetic: false, showTranslation: true });
      const vocals = {
        lead: { text: "Lead", syllables: [{ text: "Lead", startTime: 0, endTime: 1000 }] },
        background: [{ text: "Back", syllables: [{ text: "Back", startTime: 0, endTime: 1000 }] }],
      };
      const line = { startTime: 0, text: "Lead / Back", pronText: "첫째 / 둘째", transText: "첫째 / 둘째", vocals };
      await act(() => emit("lyrics-update", { lyricsData: { ...baseLyrics(), lyrics: [line] } }));
      assert.deepEqual(sublines("translation"), ["첫째", "둘째"]);
      await updateSettings({ showPhonetic: true, showTranslation: true });
      assert.deepEqual(sublines("translation"), []);
      assert.deepEqual(sublines("phonetic"), ["첫째", "둘째"]);
      await act(() => emit("lyrics-update", { lyricsData: { ...baseLyrics(), lyrics: [{ ...line, vocals: {
        lead: { ...vocals.lead, phonetic: "다른 첫째 발음" },
        background: [{ ...vocals.background[0], phonetic: "다른 둘째 발음" }],
      } }] } }));
      assert.deepEqual(sublines("translation"), ["첫째", "둘째"], "line-level equality must not discard translations when row phonetics differ");
      const explicit = { ...line, pronText: null, transText: null, vocals: {
        lead: { ...vocals.lead, phonetic: "첫째", translation: "첫째" },
        background: [{ ...vocals.background[0], phonetic: "둘째", translation: "둘째" }],
      } };
      await act(() => emit("lyrics-update", { lyricsData: { ...baseLyrics(), lyrics: [explicit] } }));
      assert.deepEqual(sublines("translation"), []);
      await updateSettings({ showPhonetic: false, showTranslation: true });
      assert.deepEqual(sublines("translation"), ["첫째", "둘째"]);
      const unsplit = { ...line, pronText: "함께 부르는 번역", transText: "함께 부르는 번역" };
      await act(() => emit("lyrics-update", { lyricsData: { ...baseLyrics(), lyrics: [unsplit] } }));
      assert.deepEqual(sublines("translation"), ["함께 부르는 번역"]);
      await updateSettings({ showPhonetic: true, showTranslation: true });
      assert.deepEqual(sublines("translation"), []);
      assert.deepEqual(sublines("phonetic"), ["함께 부르는 번역"]);
      await act(() => emit("lyrics-update", { lyricsData: { ...baseLyrics(), lyrics: [{ ...unsplit, vocals: {
        ...vocals, lead: { ...vocals.lead, phonetic: "다른 발음" },
      } }] } }));
      assert.deepEqual(sublines("translation"), ["함께 부르는 번역"], "a hidden stack phonetic must not suppress its matching translation");
      await unmount();
    });
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    for (const [key, descriptor] of originalGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    await rm(temporary, { recursive: true, force: true });
  }
});

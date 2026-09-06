import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { build } from "esbuild";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FakeFrames } from "./fakeFrames";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test("production App skips settings playback and sleeps after timeout/transparent hover", async () => {
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
    let timerId = 0;
    const storage = new Map([
      ["overlay-setup-complete", "true"],
      ["overlay-settings-v3", JSON.stringify({ hoverAppearance: "transparent", isLocked: true })],
    ]);
    const browser = {
      location: { search: "?settings=true" },
      addEventListener() {}, removeEventListener() {},
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
        return Promise.resolve(name === "get_latest_payloads" ? {} : undefined);
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
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    for (const [key, descriptor] of originalGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    await rm(temporary, { recursive: true, force: true });
  }
});

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import "./App.css";
import type { TrackInfo, LyricLine, LyricsEvent, ProgressEvent } from "./types";
import SettingsPanel from "./SettingsPanel";
import SetupWizard from "./SetupWizard";

// Default settings
const defaultSettings = {
  showOriginal: true,
  showPhonetic: true,
  showTranslation: true,
  showTrackInfo: true,

  // Startup behavior
  startMinimized: false, // Start minimized to tray (no settings window)

  // Font Sizes (px)
  originalFontSize: 24,
  phoneticFontSize: 14,
  translationFontSize: 16,
  padding: 12, // Keep property for type compatibility but set fixed default

  // Font Weights
  originalFontWeight: "700",
  phoneticFontWeight: "500",
  translationFontWeight: "500",

  // Animation
  animationType: "slide" as "fade" | "slide" | "scale" | "none",
  animationDuration: 300, // ms

  // Lyrics Styling
  lineBackgroundOpacity: 60,
  textColor: "#ffffff",
  activeColor: "#1db954",
  phoneticColor: "#cccccc",
  translationColor: "#aaaaaa",
  backgroundColor: "#000000",
  borderRadius: 12,
  lineGap: 6,
  textAlign: "center" as "left" | "center" | "right",
  isLocked: true,
  language: "ko" as "ko" | "en",

  // Line Padding (NEW - separate horizontal/vertical)
  linePaddingH: 12, // px - horizontal padding
  linePaddingV: 4, // px - vertical padding

  // Line Typography Details (NEW)
  originalLetterSpacing: 0, // px
  phoneticLetterSpacing: 0, // px
  translationLetterSpacing: 0, // px
  originalLineHeight: 1.2, // multiplier
  phoneticLineHeight: 1.3, // multiplier
  translationLineHeight: 1.3, // multiplier

  // Text Effects
  textStroke: false,
  textStrokeSize: 1,
  textStrokeMode: "outer" as "inner" | "outer",
  textStrokeColor: "#000000", // NEW - stroke color
  textShadow: "none" as "none" | "soft" | "hard",
  textShadowColor: "#000000", // NEW - shadow color

  // Blur Effect (NEW)
  lineBlurStrength: 4, // px - backdrop blur

  // Track Info (곡 정보) Styling
  trackInfoFontSize: 13,
  trackInfoFontWeight: "600",
  trackInfoColor: "#ffffff",
  trackInfoBgColor: "#000000",
  trackInfoBgOpacity: 60,
  trackInfoBorderRadius: 12,
  trackInfoPaddingH: 12, // NEW - horizontal padding
  trackInfoPaddingV: 6, // NEW - vertical padding
  trackInfoBlur: 12, // NEW - backdrop blur

  // Font Families
  originalFontFamily: "",
  phoneticFontFamily: "",
  translationFontFamily: "",

  // Background Mode
  backgroundMode: "transparent" as "transparent" | "solid",
  solidBackgroundColor: "#000000",
  solidBackgroundOpacity: 50,

  // Visibility Options
  hideWhenPaused: false,
  showNextTrack: true,
  nextTrackSeconds: 15,

  // Element Order (곡정보, 원어, 발음, 번역 순서)
  elementOrder: [
    "trackInfo",
    "original",
    "phonetic",
    "translation",
  ] as string[],

  // Unlock Timing (seconds)
  enableHoverUnlock: true, // 호버로 잠금해제 기능 활성화
  unlockWaitTime: 1.2, // 대기 시간 (초)
  unlockHoldTime: 3.0, // 홀드 시간 (초)

  // Auto-lock (자동 잠금)
  enableAutoLock: true, // 자동 잠금 활성화
  autoLockDelay: 3.0, // 자동 잠금 지연 시간 (초)

  // Album Art Customization
  showAlbumArt: true, // 앨범아트 표시 여부
  albumArtSize: 36, // px
  albumArtBorderRadius: 8, // px

  // Multiple Lyrics Lines
  lyricsPrevLines: 0, // 현재 줄 이전 표시할 줄 수 (0-5)
  lyricsNextLines: 0, // 현재 줄 이후 표시할 줄 수 (0-5)
  lyricsSetGap: 12, // 가사 세트 간 간격 (px)
  fadeNonActiveLyrics: true, // 현재 줄 외 가사 연하게 표시
  inactiveLyricsOpacity: 50, // NEW - 비활성 가사 투명도 (%)

  // Layout Customization
  overlayMaxWidth: 500, // px (0 = no limit)
  sectionGap: 8, // gap between track info and lyrics

  customCSS: "",
};


export type OverlaySettings = typeof defaultSettings;
export { defaultSettings };

// Localization Data
const strings = {
  ko: {
    // Tabs
    tabGeneral: "일반",
    tabDisplay: "화면",
    tabStyle: "스타일",
    tabAnim: "효과",

    settingsTitle: "설정",
    displaySection: "표시 설정",
    showSection: "표시 요소",
    layoutSection: "레이아웃",
    typoSection: "서체 설정",
    animSection: "애니메이션 설정",
    originalLyrics: "원문 가사",
    phoneticLyrics: "발음/로마자",
    translationLyrics: "번역",
    trackInfo: "트랙 정보",
    alignmentSection: "정렬",
    alignLeft: "좌측",
    alignCenter: "중앙",
    alignRight: "우측",
    styleSection: "스타일",
    fontSize: "글자 크기",
    bgOpacity: "배경 투명도",
    enableAnimation: "가사 애니메이션",
    startOnBoot: "부팅 시 자동 시작",
    radius: "테두리 둥글기",
    padding: "컨테이너 여백",
    lineGap: "줄 간격",
    colorSection: "색상",
    originalColor: "원문 색상",
    phoneticColor: "발음 색상",
    transColor: "번역 색상",
    bgColor: "배경 색상",
    reset: "설정 초기화",
    resetConfirm: "정말 초기화하시겠습니까?", // ADDED
    waiting: "연결 대기 중",
    lockTooltip: "잠그기",
    holdToUnlock: "마우스를 2초간 올려두면 잠금해제됩니다",
    checkForUpdates: "업데이트 확인",
    upToDate: "최신 버전입니다.",
    checking: "확인 중...",
    updateAvailable: "새로운 버전({version})이 있습니다!",
    installUpdate: "설치 후 재시작하시겠습니까?",
    errorParams: "오류",
    downloading: "다운로드 중...",

    // New Strings
    textStyleSection: "텍스트 스타일",
    animationSection: "애니메이션",
    originalStyle: "원문",
    phoneticStyle: "발음",
    transStyle: "번역",
    // Style - Effects
    effectSection: "텍스트 효과",
    textStroke: "외곽선",
    strokeSize: "외곽선 두께",
    strokeMode: "외곽선 방향",
    strokeInner: "안쪽",
    strokeOuter: "바깥쪽",
    textShadow: "그림자",
    shadowNone: "없음",
    shadowSoft: "부드럽게",
    shadowHard: "선명하게",

    // 곡 정보 (Song Info) - unified terminology
    songInfoSection: "곡 정보",
    songInfoColor: "글자 색",
    songInfoBgColor: "배경 색",
    songInfoBg: "배경 투명도",
    songInfoRadius: "모서리 둥글기",
    size: "크기",
    weight: "굵기",
    animType: "효과",
    animDuration: "속도",
    animFade: "페이드",
    animSlide: "슬라이드",
    animScale: "확대/축소",
    animNone: "없음",
    ms: "ms",
    // Modal
    cancel: "취소",
    install: "설치",
    close: "닫기",
    // Font
    fontFamily: "글꼴",
    systemDefault: "시스템 기본",
    // Colors Section
    lyricsColorSection: "가사 색상",
    // Background Mode
    backgroundModeSection: "배경 모드",
    bgModeTransparent: "투명",
    bgModeSolid: "단색",
    solidBgColor: "배경 색상",
    solidBgOpacity: "배경 투명도",
    // Visibility
    visibilitySection: "표시 옵션",
    hideWhenPaused: "일시정지 시 숨기기",
    showNextTrack: "다음 곡 미리보기",
    nextTrackSeconds: "다음 곡 표시 시간",
    nextTrackLabel: "다음 곡",
    seconds: "초",
    // Element Order
    elementOrderSection: "요소 순서",
    elementTrackInfo: "곡 정보",
    elementOriginal: "원어",
    elementPhonetic: "발음",
    elementTranslation: "번역",
    moveUp: "↑",
    moveDown: "↓",
    // Unlock Timing
    unlockTimingSection: "잠금해제",
    enableHoverUnlock: "호버로 잠금해제",
    unlockWaitTime: "대기 시간",
    unlockHoldTime: "홀드 시간",
    // Auto-lock
    enableAutoLock: "자동 잠금",
    autoLockDelay: "자동 잠금 지연",
    // Album Art
    albumArtSection: "앨범아트",
    showAlbumArt: "앨범아트 표시",
    albumArtSize: "크기",
    albumArtBorderRadius: "모서리 둥글기",
    // Multiple Lyrics Lines
    lyricsLinesSection: "가사 표시",
    lyricsPrevLines: "이전 줄 수",
    lyricsNextLines: "이후 줄 수",
    lyricsSetGap: "세트 간격",
    fadeNonActiveLyrics: "비활성 가사 연하게",
    // Layout
    overlayMaxWidth: "최대 너비",
    sectionGap: "섹션 간격",
    noLimit: "제한 없음",
    customCSS: "사용자 정의 CSS",
  },
  en: {
    // Tabs
    tabGeneral: "General",
    tabDisplay: "Display",
    tabStyle: "Style",
    tabAnim: "Effects",

    settingsTitle: "Settings",
    displaySection: "DISPLAY",
    showSection: "Elements",
    layoutSection: "Layout",
    typoSection: "Typography",
    animSection: "Animation Settings",
    originalLyrics: "Original Lyrics",
    phoneticLyrics: "Phonetic / Romanization",
    translationLyrics: "Translation",
    trackInfo: "Track Info",
    alignmentSection: "ALIGNMENT",
    alignLeft: "Left",
    alignCenter: "Center",
    alignRight: "Right",
    styleSection: "STYLE",
    fontSize: "Font Size",
    bgOpacity: "Background Opacity",
    enableAnimation: "Lyric Animation",
    startOnBoot: "Start on Boot",
    radius: "Corner Radius",
    padding: "Container Padding",
    lineGap: "Line Spacing",
    colorSection: "COLORS",
    originalColor: "Original Text",
    phoneticColor: "Phonetic Text",
    transColor: "Translation Text",
    bgColor: "Background",
    reset: "Reset to Defaults",
    resetConfirm: "Are you sure?", // ADDED
    waiting: "Connecting",
    lockTooltip: "Lock",
    holdToUnlock: "Hold for 2s to Unlock",
    checkForUpdates: "Check for Updates",
    upToDate: "You are on the latest version.",
    checking: "Checking...",
    updateAvailable: "New version ({version}) available!",
    installUpdate: "Install and restart?",
    errorParams: "Error",
    downloading: "Downloading...",

    // New Strings
    textStyleSection: "TEXT STYLES",
    animationSection: "ANIMATION",
    originalStyle: "Original",
    phoneticStyle: "Phonetic",
    transStyle: "Translation",
    // Style - Effects
    effectSection: "Text Effects",
    textStroke: "Outline",
    strokeSize: "Stroke Size",
    strokeMode: "Stroke Mode",
    strokeInner: "Inner",
    strokeOuter: "Outer",
    textShadow: "Shadow",
    shadowNone: "None",
    shadowSoft: "Soft",
    shadowHard: "Hard",

    // Song Info - unified terminology
    songInfoSection: "Song Info",
    songInfoColor: "Text Color",
    songInfoBgColor: "Background Color",
    songInfoBg: "Background Opacity",
    songInfoRadius: "Corner Radius",
    size: "Size",
    weight: "Weight",
    animType: "Effect",
    animDuration: "Duration",
    animFade: "Fade",
    animSlide: "Slide",
    animScale: "Scale",
    animNone: "None",
    ms: "ms",
    // Modal
    cancel: "Cancel",
    install: "Install",
    close: "Close",
    // Font
    fontFamily: "Font",
    systemDefault: "System Default",
    // Colors Section
    lyricsColorSection: "Lyrics Colors",
    // Background Mode
    backgroundModeSection: "Background Mode",
    bgModeTransparent: "Transparent",
    bgModeSolid: "Solid",
    solidBgColor: "Background Color",
    solidBgOpacity: "Background Opacity",
    // Visibility
    visibilitySection: "Visibility Options",
    hideWhenPaused: "Hide when paused",
    showNextTrack: "Show next track preview",
    nextTrackSeconds: "Next track display time",
    nextTrackLabel: "Next",
    seconds: "sec",
    // Element Order
    elementOrderSection: "Element Order",
    elementTrackInfo: "Track Info",
    elementOriginal: "Original",
    elementPhonetic: "Phonetic",
    elementTranslation: "Translation",
    moveUp: "↑",
    moveDown: "↓",
    // Unlock Timing
    unlockTimingSection: "Unlock",
    enableHoverUnlock: "Hover to Unlock",
    unlockWaitTime: "Wait Time",
    unlockHoldTime: "Hold Time",
    // Auto-lock
    enableAutoLock: "Auto Lock",
    autoLockDelay: "Auto Lock Delay",
    // Album Art
    albumArtSection: "Album Art",
    showAlbumArt: "Show Album Art",
    albumArtSize: "Size",
    albumArtBorderRadius: "Corner Radius",
    // Multiple Lyrics Lines
    lyricsLinesSection: "Lyrics Display",
    lyricsPrevLines: "Previous Lines",
    lyricsNextLines: "Next Lines",
    lyricsSetGap: "Set Gap",
    fadeNonActiveLyrics: "Fade Non-Active Lyrics",
    // Layout
    overlayMaxWidth: "Max Width",
    sectionGap: "Section Gap",
    noLimit: "No limit",
    customCSS: "Custom CSS",
  },
};

function App() {
  // Check if this is the settings window
  const isSettingsWindow = window.location.search.includes("settings=true");

  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [_isSynced, setIsSynced] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<number>(Infinity);
  const [nextTrack, setNextTrack] = useState<{
    title: string;
    artist: string;
    albumArt?: string;
  } | null>(null);
  const [settings, setSettings] = useState<OverlaySettings>(() => {
    const saved = localStorage.getItem("overlay-settings-v3");
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
    // 저장된 설정이 없으면 시스템 언어 감지
    const systemLang = navigator.language || navigator.languages?.[0] || "en";
    const detectedLang = systemLang.startsWith("ko") ? "ko" : "en";
    return { ...defaultSettings, language: detectedLang as "ko" | "en" };
  });

  // Setup wizard state - check if setup has been completed
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(() => {
    return localStorage.getItem("overlay-setup-complete") === "true";
  });

  const t = strings[settings.language || "ko"];

  const containerRef = useRef<HTMLDivElement>(null);

  // Update modal state
  type UpdateStatus =
    | "idle"
    | "checking"
    | "available"
    | "downloading"
    | "upToDate"
    | "error";
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateVersion, setUpdateVersion] = useState("");
  const [updateError, setUpdateError] = useState("");
  const updateRef = useRef<Awaited<ReturnType<typeof check>> | null>(null);

  // Unlock interaction state
  const [unlockProgress, setUnlockProgress] = useState(0);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("overlay-settings-v3", JSON.stringify(settings));
  }, [settings]);

  // Listen for settings changes from other windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "overlay-settings-v3" && e.newValue) {
        setSettings({ ...defaultSettings, ...JSON.parse(e.newValue) });
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Find active lyric line index
  const activeLineIndex = useMemo(() => {
    if (lyrics.length === 0) return -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (progress >= lyrics[i].startTime) {
        return i;
      }
    }
    return -1;
  }, [lyrics, progress]);

  // Get the active lyric line only
  const activeLine = useMemo(() => {
    if (activeLineIndex < 0 || activeLineIndex >= lyrics.length) return null;
    return lyrics[activeLineIndex];
  }, [lyrics, activeLineIndex]);

  // Hover state for opacity control
  const [isHovering, setIsHovering] = useState(false);

  // Data reception timeout state - hide overlay when no data for 5 seconds
  const [isDataTimedOut, setIsDataTimedOut] = useState(false);
  const dataTimeoutRef = useRef<number | null>(null);
  const DATA_TIMEOUT_MS = 5000; // 5 seconds

  // Reset data timeout timer
  const resetDataTimeout = useCallback(() => {
    if (dataTimeoutRef.current) {
      clearTimeout(dataTimeoutRef.current);
    }
    setIsDataTimedOut(false);
    dataTimeoutRef.current = window.setTimeout(() => {
      setIsDataTimedOut(true);
    }, DATA_TIMEOUT_MS);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dataTimeoutRef.current) {
        clearTimeout(dataTimeoutRef.current);
      }
    };
  }, []);

  // Listen for events from Rust backend
  useEffect(() => {
    const unlistenLyrics = listen<LyricsEvent>("lyrics-update", (event) => {
      const payload = event.payload;
      if (payload.lyricsData) {
        setTrack(payload.lyricsData.track);
        // 싱크 데이터가 없는 일반 가사는 표시하지 않음
        if (payload.lyricsData.isSynced) {
          setLyrics(payload.lyricsData.lyrics);
          setIsSynced(true);
        } else {
          setLyrics([]);
          setIsSynced(false);
        }
        // Reset timeout on lyrics update
        resetDataTimeout();
      }
    });

    const unlistenProgress = listen<ProgressEvent>(
      "progress-update",
      (event) => {
        const payload = event.payload;
        if (payload.progressData) {
          setProgress(payload.progressData.position);
          setIsPlaying(payload.progressData.isPlaying);
          if (payload.progressData.remaining !== undefined) {
            setRemaining(payload.progressData.remaining);
          }
          if (payload.progressData.nextTrack !== undefined) {
            setNextTrack(payload.progressData.nextTrack);
          }
          // Reset timeout on progress update
          resetDataTimeout();
        }
      }
    );

    // Listen for lock state changes from Tray
    const unlistenLockUpdate = listen<boolean>("lock-state-update", (event) => {
      setSettings((prev) => ({ ...prev, isLocked: event.payload }));
    });

    // Listen for hover state from backend (for transparency)
    const unlistenHover = listen<boolean>("overlay-hover", (event) => {
      setIsHovering(event.payload);
    });

    // Initial setup: Sync lock state with backend
    if (!isSettingsWindow) {
      // Default is locked - set both lock state and ignore cursor events
      invoke("set_lock_state", { locked: settings.isLocked }).catch(
        console.error
      );
      // IMPORTANT: Also set ignore cursor events on startup based on lock state
      invoke("set_ignore_cursor_events", { ignore: settings.isLocked }).catch(
        console.error
      );
    }

    return () => {
      unlistenLyrics.then((fn) => fn());
      unlistenProgress.then((fn) => fn());
      unlistenLockUpdate.then((fn) => fn());
      unlistenHover.then((fn) => fn());
    };
  }, []); // Run once

  // Sync lock state when settings change
  useEffect(() => {
    if (!isSettingsWindow) {
      invoke("set_lock_state", { locked: settings.isLocked }).catch(
        console.error
      );
      // IMPORTANT: Always set ignore cursor events based on lock state
      // When locked (true): ignore cursor events (click through)
      // When unlocked (false): don't ignore cursor events (catch clicks for dragging)
      invoke("set_ignore_cursor_events", { ignore: settings.isLocked }).catch(
        console.error
      );
    }
  }, [settings.isLocked, isSettingsWindow]);

  // Sync unlock timing when settings change
  useEffect(() => {
    if (!isSettingsWindow) {
      invoke("set_unlock_timing", {
        waitTime: settings.unlockWaitTime,
        holdTime: settings.unlockHoldTime,
      }).catch(console.error);
    }
  }, [settings.unlockWaitTime, settings.unlockHoldTime, isSettingsWindow]);

  // Sync hover unlock enabled setting
  useEffect(() => {
    if (!isSettingsWindow) {
      invoke("set_hover_unlock_enabled", {
        enabled: settings.enableHoverUnlock,
      }).catch(console.error);
    }
  }, [settings.enableHoverUnlock, isSettingsWindow]);

  // Sync auto-lock settings
  useEffect(() => {
    if (!isSettingsWindow) {
      invoke("set_auto_lock_enabled", {
        enabled: settings.enableAutoLock,
      }).catch(console.error);
    }
  }, [settings.enableAutoLock, isSettingsWindow]);

  useEffect(() => {
    if (!isSettingsWindow) {
      invoke("set_auto_lock_delay", {
        delay: settings.autoLockDelay,
      }).catch(console.error);
    }
  }, [settings.autoLockDelay, isSettingsWindow]);

  // Drag functionality - only when unlocked
  const handleMouseDown = useCallback(
    async (e: React.MouseEvent) => {
      if (settings.isLocked) return;

      const target = e.target as HTMLElement;
      if (target.closest("button, input, select")) return;

      try {
        await invoke("start_drag");
      } catch (err) {
        console.error("Failed to start dragging:", err);
      }
    },
    [settings.isLocked]
  );

  // Check for updates
  const checkForAppUpdates = useCallback(async (manual = false) => {
    if (manual) {
      setUpdateStatus("checking");
      setUpdateModalOpen(true);
      setUpdateError("");
    }
    try {
      const update = await check();
      if (update?.available) {
        updateRef.current = update;
        setUpdateVersion(update.version);
        setUpdateStatus("available");
        if (!manual) setUpdateModalOpen(true); // Auto-open if update found
      } else if (manual) {
        setUpdateStatus("upToDate");
      }
    } catch (e: any) {
      console.error(e);
      const errMsg = e?.message || String(e);
      // Treat "no release" as up-to-date (common during dev)
      if (errMsg.includes("Could not fetch") || errMsg.includes("404")) {
        if (manual) {
          setUpdateError("업데이트 서버에 연결할 수 없습니다 (404)");
          setUpdateStatus("error");
        }
      } else if (manual) {
        setUpdateError(errMsg);
        setUpdateStatus("error");
      }
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!updateRef.current) return;
    setUpdateStatus("downloading");
    try {
      await updateRef.current.downloadAndInstall();
      await relaunch();
    } catch (e: any) {
      setUpdateError(e?.message || String(e));
      setUpdateStatus("error");
    }
  }, []);

  // Auto check on mount
  useEffect(() => {
    checkForAppUpdates(false);
  }, []);

  // Get display text
  const getDisplayText = (line: LyricLine) => {
    const hasPronText =
      line.pronText &&
      line.pronText.trim() !== "" &&
      line.pronText !== line.text;
    // transText가 존재하고, 빈 문자열이 아니며, 원어/발음과 다르면 표시
    const hasTransText =
      line.transText &&
      line.transText.trim() !== "" &&
      line.transText !== line.text &&
      line.transText !== line.pronText;
    return {
      main: line.text || "",
      phonetic: hasPronText ? line.pronText : null,
      translation: hasTransText ? line.transText : null,
    };
  };

  // Handle setup wizard completion
  const handleSetupComplete = useCallback((newSettings: OverlaySettings) => {
    setSettings(newSettings);
    setIsSetupComplete(true);
    localStorage.setItem("overlay-setup-complete", "true");
  }, []);

  // Handle reset all settings (including setup)
  const handleResetAll = useCallback(() => {
    localStorage.removeItem("overlay-setup-complete");
    setIsSetupComplete(false);
  }, []);

  // If this is the settings window, render settings UI or setup wizard
  if (isSettingsWindow) {
    // Show setup wizard if not completed
    if (!isSetupComplete) {
      return (
        <SetupWizard
          onComplete={handleSetupComplete}
          currentSettings={settings}
        />
      );
    }

    return (
      <>
        <SettingsPanel
          settings={settings}
          onSettingsChange={setSettings}
          onCheckUpdates={() => checkForAppUpdates(true)}
          onResetAll={handleResetAll}
        />
        {/* Update Modal */}
        {updateModalOpen && (
          <div
            className="update-modal-overlay"
            onClick={() =>
              updateStatus !== "downloading" && setUpdateModalOpen(false)
            }
          >
            <div className="update-modal" onClick={(e) => e.stopPropagation()}>
              <div className="update-modal-icon">
                {updateStatus === "checking" && (
                  <span className="spinner"><i className="fa-solid fa-spinner fa-spin"></i></span>
                )}
                {updateStatus === "available" && <span><i className="fa-solid fa-gift"></i></span>}
                {updateStatus === "upToDate" && <span><i className="fa-solid fa-check-circle"></i></span>}
                {updateStatus === "downloading" && (
                  <span className="spinner"><i className="fa-solid fa-download fa-beat"></i></span>
                )}
                {updateStatus === "error" && <span><i className="fa-solid fa-exclamation-circle"></i></span>}
              </div>
              <div className="update-modal-title">
                {updateStatus === "checking" && t.checking}
                {updateStatus === "available" &&
                  t.updateAvailable.replace("{version}", updateVersion)}
                {updateStatus === "upToDate" && t.upToDate}
                {updateStatus === "downloading" && t.downloading}
                {updateStatus === "error" && t.errorParams}
              </div>
              {updateStatus === "available" && (
                <div className="update-modal-subtitle">{t.installUpdate}</div>
              )}
              {updateStatus === "error" && (
                <div className="update-modal-error">{updateError}</div>
              )}
              <div className="update-modal-actions">
                {updateStatus === "available" && (
                  <>
                    <button
                      className="update-btn cancel"
                      onClick={() => setUpdateModalOpen(false)}
                    >
                      {t.cancel}
                    </button>
                    <button
                      className="update-btn primary"
                      onClick={installUpdate}
                    >
                      {t.install}
                    </button>
                  </>
                )}
                {(updateStatus === "upToDate" || updateStatus === "error") && (
                  <button
                    className="update-btn primary"
                    onClick={() => setUpdateModalOpen(false)}
                  >
                    {t.close}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Convert hex to rgba
  const hexToRgba = (hex: string, opacity: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `rgba(${parseInt(result[1], 16)}, ${parseInt(
        result[2],
        16
      )}, ${parseInt(result[3], 16)}, ${opacity})`;
    }
    return hex;
  };

  const display = activeLine ? getDisplayText(activeLine) : null;

  // Alignment classes
  const alignClass =
    settings.textAlign === "left"
      ? "align-left"
      : settings.textAlign === "right"
        ? "align-right"
        : "align-center";

  // Listen for unlock progress from backend
  useEffect(() => {
    const unlistenUnlockProgress = listen<number>(
      "unlock-progress",
      (event) => {
        setUnlockProgress(event.payload);
      }
    );

    return () => {
      unlistenUnlockProgress.then((fn) => fn());
    };
  }, []);

  // Calculate visibility
  // Hide when: paused (if setting enabled), OR no data received for 5+ seconds
  const shouldHide = (settings.hideWhenPaused && !isPlaying && track !== null) || isDataTimedOut;
  const calculatedOpacity = shouldHide
    ? 0
    : isHovering && settings.isLocked
      ? 0.2
      : 1;

  // Determine if we should show next track info instead of current track
  const showNextTrackInfo =
    settings.showNextTrack &&
    nextTrack &&
    remaining <= settings.nextTrackSeconds &&
    remaining > 0;

  return (
    <div
      ref={containerRef}
      className={`overlay-container ${!isPlaying ? "paused" : ""
        } ${alignClass} ${settings.isLocked ? "locked" : "unlocked"}`}
      onMouseDown={handleMouseDown}
      style={
        {
          opacity: calculatedOpacity,
          transition: "opacity 0.3s ease", // Smooth transition
          background:
            settings.backgroundMode === "solid"
              ? hexToRgba(
                settings.solidBackgroundColor,
                settings.solidBackgroundOpacity / 100
              )
              : "transparent",
          "--original-size": `${settings.originalFontSize}px`,
          "--phonetic-size": `${settings.phoneticFontSize}px`,
          "--translation-size": `${settings.translationFontSize}px`,
          "--original-weight": settings.originalFontWeight,
          "--phonetic-weight": settings.phoneticFontWeight,
          "--translation-weight": settings.translationFontWeight,
          "--text-color": settings.textColor,
          "--active-color": settings.activeColor,
          "--phonetic-color": settings.phoneticColor,
          "--translation-color": settings.translationColor,
          "--line-bg": hexToRgba(
            settings.backgroundColor,
            settings.lineBackgroundOpacity / 100
          ),
          // New line styling vars
          "--line-padding-h": `${settings.linePaddingH}px`,
          "--line-padding-v": `${settings.linePaddingV}px`,
          "--line-blur": `${settings.lineBlurStrength}px`,
          // Letter spacing and line height
          "--original-letter-spacing": `${settings.originalLetterSpacing}px`,
          "--phonetic-letter-spacing": `${settings.phoneticLetterSpacing}px`,
          "--translation-letter-spacing": `${settings.translationLetterSpacing}px`,
          "--original-line-height": settings.originalLineHeight,
          "--phonetic-line-height": settings.phoneticLineHeight,
          "--translation-line-height": settings.translationLineHeight,
          // Track info styling
          "--track-info-size": `${settings.trackInfoFontSize}px`,
          "--track-info-weight": settings.trackInfoFontWeight,
          "--track-info-color": settings.trackInfoColor,
          "--track-info-bg": hexToRgba(
            settings.trackInfoBgColor,
            settings.trackInfoBgOpacity / 100
          ),
          "--track-info-radius": `${settings.trackInfoBorderRadius}px`,
          "--track-info-padding-h": `${settings.trackInfoPaddingH}px`,
          "--track-info-padding-v": `${settings.trackInfoPaddingV}px`,
          "--track-info-blur": `${settings.trackInfoBlur}px`,
          // General styling
          "--border-radius": `${settings.borderRadius}px`,
          "--padding": `${settings.padding}px`,
          "--line-gap": `${settings.lineGap}px`,
          "--anim-duration": `${settings.animationDuration}ms`,
          // Text effects with colors
          "--text-shadow":
            settings.textShadow === "soft"
              ? `0 2px 4px ${hexToRgba(settings.textShadowColor, 0.5)}`
              : settings.textShadow === "hard"
                ? `1px 1px 0 ${settings.textShadowColor}, -1px -1px 0 ${settings.textShadowColor}, 1px -1px 0 ${settings.textShadowColor}, -1px 1px 0 ${settings.textShadowColor}`
                : "none",
          "--text-stroke": settings.textStroke
            ? `${settings.textStrokeSize}px ${settings.textStrokeColor}`
            : "none",
          "--text-stroke-mode":
            settings.textStrokeMode === "inner" ? "fill stroke" : "stroke fill",
          // Font families
          "--original-font": settings.originalFontFamily || "inherit",
          "--phonetic-font": settings.phoneticFontFamily || "inherit",
          "--translation-font": settings.translationFontFamily || "inherit",
          // Layout
          "--section-gap": `${settings.sectionGap}px`,
          "--inactive-opacity": settings.inactiveLyricsOpacity / 100,
          maxWidth:
            settings.overlayMaxWidth > 0
              ? `${settings.overlayMaxWidth}px`
              : "none",
        } as React.CSSProperties
      }
    >
      <style>{settings.customCSS}</style>
      {/* Global Unlock Progress Gauge (Centered) */}
      {settings.isLocked && unlockProgress > 0 && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "60px",
              height: "60px",
            }}
          >
            <svg
              width="60"
              height="60"
              viewBox="0 0 60 60"
              style={{ transform: "rotate(-90deg)" }}
            >
              <circle
                cx="30"
                cy="30"
                r="26"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="6"
                fill="rgba(0,0,0,0.3)"
              />
              <circle
                cx="30"
                cy="30"
                r="26"
                stroke={settings.activeColor}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - unlockProgress / 100)
                  }`}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 0.1s linear",
                }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              🔓
            </div>
          </div>
          <div
            style={{
              color: "white",
              fontSize: "12px",
              textShadow: "0 2px 4px black",
              background: "rgba(0,0,0,0.5)",
              padding: "4px 8px",
              borderRadius: "4px",
              whiteSpace: "nowrap",
            }}
          >
            {t.holdToUnlock}
          </div>
        </div>
      )}

      {/* Render elements based on elementOrder */}
      {(() => {
        // Find trackInfo position in order
        const trackInfoIndex = settings.elementOrder.indexOf("trackInfo");
        const lyricsElements = settings.elementOrder.filter(
          (e) => e !== "trackInfo"
        );

        // Render track info at its position, and lyrics box content in order
        const renderTrackInfo = () => {
          if (
            !settings.showTrackInfo ||
            (!track && !(settings.showNextTrack && nextTrack))
          ) {
            return null;
          }
          return (
            <div
              key="trackInfo"
              className="track-info-line"
              style={{ animation: "fadeIn 0.4s ease" }}
            >
              {showNextTrackInfo && nextTrack ? (
                <>
                  {settings.showAlbumArt && nextTrack.albumArt && (
                    <img
                      src={nextTrack.albumArt}
                      alt=""
                      className="album-art"
                      style={{
                        width: `${settings.albumArtSize}px`,
                        height: `${settings.albumArtSize}px`,
                        borderRadius: `${settings.albumArtBorderRadius}px`,
                      }}
                    />
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1px",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        color: "rgba(255,255,255,0.5)",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {t.nextTrackLabel}
                    </span>
                    <span className="track-text" style={{ marginTop: "1px" }}>
                      {nextTrack.artist} - {nextTrack.title}
                    </span>
                  </div>
                </>
              ) : track ? (
                <>
                  {settings.showAlbumArt && track.albumArt && (
                    <img
                      src={track.albumArt}
                      alt=""
                      className="album-art"
                      style={{
                        width: `${settings.albumArtSize}px`,
                        height: `${settings.albumArtSize}px`,
                        borderRadius: `${settings.albumArtBorderRadius}px`,
                      }}
                    />
                  )}
                  <span className="track-text">
                    {track.artist} - {track.title}
                  </span>
                </>
              ) : null}
            </div>
          );
        };

        const renderLyricsBox = () => {
          if (activeLineIndex < 0 || lyrics.length === 0) return null;

          // 표시할 가사 줄 인덱스 계산 (이전 N개, 현재 1개, 이후 N개)
          const prevLines = Math.max(0, Math.min(5, settings.lyricsPrevLines));
          const nextLines = Math.max(0, Math.min(5, settings.lyricsNextLines));
          const linesToShow: { line: LyricLine; index: number; isActive: boolean }[] = [];

          // 시작 인덱스 (현재 - 이전 줄 수)
          const startIdx = Math.max(0, activeLineIndex - prevLines);
          // 종료 인덱스 (현재 + 이후 줄 수)
          const endIdx = Math.min(lyrics.length - 1, activeLineIndex + nextLines);

          for (let i = startIdx; i <= endIdx; i++) {
            linesToShow.push({
              line: lyrics[i],
              index: i,
              isActive: i === activeLineIndex
            });
          }

          // 각 줄에 대해 렌더링 (세트 단위로 wrapper)
          const renderLyricSet = (lineInfo: { line: LyricLine; index: number; isActive: boolean }, setIndex: number, totalSets: number) => {
            const displayData = getDisplayText(lineInfo.line);
            const isLastSet = setIndex === totalSets - 1;
            // CSS handles inactive opacity via --inactive-opacity variable and .inactive class
            const activeClass = lineInfo.isActive ? 'active' : (settings.fadeNonActiveLyrics ? 'inactive' : 'active');

            // Render lyrics elements in order for this line
            const elements = lyricsElements
              .map((element) => {
                switch (element) {
                  case "original":
                    if (!settings.showOriginal || !displayData.main) return null;
                    return (
                      <div
                        key={`original-${lineInfo.index}`}
                        className={`lyric-line original ${activeClass}`}
                      >
                        {displayData.main}
                      </div>
                    );
                  case "phonetic":
                    if (!settings.showPhonetic || !displayData.phonetic) return null;
                    return (
                      <div
                        key={`phonetic-${lineInfo.index}`}
                        className={`lyric-line phonetic ${activeClass}`}
                      >
                        {displayData.phonetic}
                      </div>
                    );
                  case "translation":
                    if (!settings.showTranslation || !displayData.translation) return null;
                    return (
                      <div
                        key={`translation-${lineInfo.index}`}
                        className={`lyric-line translation ${activeClass}`}
                      >
                        {displayData.translation}
                      </div>
                    );
                  default:
                    return null;
                }
              })
              .filter(Boolean);

            if (elements.length === 0) return null;

            // 세트를 wrapper로 감싸서 간격 적용
            return (
              <div
                key={`set-${lineInfo.index}`}
                className="lyrics-set"
                style={{
                  marginBottom: isLastSet ? 0 : `${settings.lyricsSetGap}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'inherit',
                  gap: `${settings.lineGap}px`
                }}
              >
                {elements}
              </div>
            );
          };

          const allLyricsSets = linesToShow
            .map((lineInfo, idx) => renderLyricSet(lineInfo, idx, linesToShow.length))
            .filter(Boolean);

          if (allLyricsSets.length === 0) return null;

          return (
            <div
              key={`lyrics-${activeLineIndex}`}
              className={`lyrics-box anim-${settings.animationType}`}
            >
              {allLyricsSets}
            </div>
          );
        };

        // Determine render order: trackInfo before or after lyrics
        if (trackInfoIndex === 0) {
          return (
            <>
              {renderTrackInfo()}
              {renderLyricsBox()}
            </>
          );
        } else {
          return (
            <>
              {renderLyricsBox()}
              {renderTrackInfo()}
            </>
          );
        }
      })()}

      {/* Waiting Indicator */}
      {!display && !track && !settings.isLocked && (
        <div className="waiting-indicator">
          <div className="waiting-dot"></div>
          <span>{t.waiting}</span>
        </div>
      )}

      {/* Update Modal - shown in main overlay when update is available */}
      {updateModalOpen && (
        <div
          className="update-modal-overlay"
          onClick={() =>
            updateStatus !== "downloading" && setUpdateModalOpen(false)
          }
          style={{ pointerEvents: 'auto' }}
        >
          <div className="update-modal" onClick={(e) => e.stopPropagation()}>
            <div className="update-modal-icon">
              {updateStatus === "checking" && (
                <span className="spinner"><i className="fa-solid fa-spinner fa-spin"></i></span>
              )}
              {updateStatus === "available" && <span><i className="fa-solid fa-gift"></i></span>}
              {updateStatus === "upToDate" && <span><i className="fa-solid fa-check-circle"></i></span>}
              {updateStatus === "downloading" && (
                <span className="spinner"><i className="fa-solid fa-download fa-beat"></i></span>
              )}
              {updateStatus === "error" && <span><i className="fa-solid fa-exclamation-circle"></i></span>}
            </div>
            <div className="update-modal-title">
              {updateStatus === "checking" && t.checking}
              {updateStatus === "available" &&
                t.updateAvailable.replace("{version}", updateVersion)}
              {updateStatus === "upToDate" && t.upToDate}
              {updateStatus === "downloading" && t.downloading}
              {updateStatus === "error" && `${t.errorParams}: ${updateError}`}
            </div>
            <div className="update-modal-buttons">
              {updateStatus === "available" && (
                <>
                  <button
                    className="update-btn secondary"
                    onClick={() => setUpdateModalOpen(false)}
                  >
                    {t.cancel}
                  </button>
                  <button className="update-btn primary" onClick={installUpdate}>
                    {t.install}
                  </button>
                </>
              )}
              {(updateStatus === "upToDate" || updateStatus === "error") && (
                <button
                  className="update-btn primary"
                  onClick={() => setUpdateModalOpen(false)}
                >
                  {t.close}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

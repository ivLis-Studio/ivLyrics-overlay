/**
 * Overlay Presets - Pre-configured styles for different use cases
 */

import { defaultSettings, type OverlaySettings } from "./App";

export interface PresetInfo {
    id: string;
    name: {
        ko: string;
        en: string;
    };
    description: {
        ko: string;
        en: string;
    };
    category: "minimal" | "classic" | "modern" | "creative" | "accessibility";
    settings: Partial<OverlaySettings>;
}

// Preset Categories
export const presetCategories = {
    minimal: { ko: "미니멀", en: "Minimal" },
    classic: { ko: "클래식", en: "Classic" },
    modern: { ko: "모던", en: "Modern" },
    creative: { ko: "크리에이티브", en: "Creative" },
    accessibility: { ko: "접근성", en: "Accessibility" },
};

export const presets: PresetInfo[] = [
    // ============ MINIMAL ============
    {
        id: "clean-text",
        name: { ko: "클린 텍스트", en: "Clean Text" },
        description: {
            ko: "배경 없이 텍스트만 표시. 그림자로 가독성 확보",
            en: "Text only without background. Shadow for readability",
        },
        category: "minimal",
        settings: {
            showOriginal: true,
            showPhonetic: false,
            showTranslation: true,
            showTrackInfo: false,
            showAlbumArt: false,
            lineBackgroundOpacity: 0,
            textShadow: "hard",
            textStroke: true,
            textStrokeSize: 2,
            originalFontSize: 28,
            translationFontSize: 16,
            backgroundMode: "transparent",
            borderRadius: 0,
        },
    },
    {
        id: "floating-text",
        name: { ko: "플로팅 텍스트", en: "Floating Text" },
        description: {
            ko: "투명 배경에 부드러운 그림자",
            en: "Transparent background with soft shadow",
        },
        category: "minimal",
        settings: {
            showOriginal: true,
            showPhonetic: false,
            showTranslation: true,
            showTrackInfo: false,
            lineBackgroundOpacity: 0,
            textShadow: "soft",
            originalFontSize: 32,
            translationFontSize: 18,
            backgroundMode: "transparent",
            lineGap: 8,
        },
    },
    {
        id: "subtitle-style",
        name: { ko: "자막 스타일", en: "Subtitle Style" },
        description: {
            ko: "영상 자막처럼 하단에 표시되는 스타일",
            en: "Video subtitle-like style at the bottom",
        },
        category: "minimal",
        settings: {
            showOriginal: true,
            showPhonetic: false,
            showTranslation: true,
            showTrackInfo: false,
            lineBackgroundOpacity: 70,
            backgroundColor: "#000000",
            textShadow: "none",
            originalFontSize: 24,
            translationFontSize: 14,
            borderRadius: 4,
            textAlign: "center",
            padding: 8,
        },
    },

    // ============ CLASSIC ============
    {
        id: "karaoke-box",
        name: { ko: "노래방 박스", en: "Karaoke Box" },
        description: {
            ko: "노래방 스타일의 가사 표시",
            en: "Karaoke-style lyrics display",
        },
        category: "classic",
        settings: {
            showOriginal: true,
            showPhonetic: true,
            showTranslation: true,
            showTrackInfo: true,
            showAlbumArt: true,
            lineBackgroundOpacity: 80,
            backgroundColor: "#1a1a2e",
            activeColor: "#00d4ff",
            phoneticColor: "#ffcc00",
            translationColor: "#ffffff",
            originalFontSize: 26,
            phoneticFontSize: 14,
            translationFontSize: 16,
            borderRadius: 12,
            textAlign: "center",
        },
    },
    {
        id: "spotify-native",
        name: { ko: "Spotify 네이티브", en: "Spotify Native" },
        description: {
            ko: "Spotify 기본 가사와 유사한 스타일",
            en: "Similar to Spotify's native lyrics",
        },
        category: "classic",
        settings: {
            showOriginal: true,
            showPhonetic: false,
            showTranslation: true,
            showTrackInfo: true,
            showAlbumArt: true,
            lineBackgroundOpacity: 60,
            backgroundColor: "#000000",
            activeColor: "#1db954",
            translationColor: "#b3b3b3",
            originalFontSize: 24,
            translationFontSize: 14,
            borderRadius: 8,
            albumArtSize: 32,
            albumArtBorderRadius: 4,
        },
    },
    {
        id: "compact-info",
        name: { ko: "컴팩트 정보", en: "Compact Info" },
        description: {
            ko: "곡 정보와 가사를 컴팩트하게 표시",
            en: "Compact display of track info and lyrics",
        },
        category: "classic",
        settings: {
            showOriginal: true,
            showPhonetic: false,
            showTranslation: false,
            showTrackInfo: true,
            showAlbumArt: true,
            lineBackgroundOpacity: 70,
            originalFontSize: 20,
            trackInfoFontSize: 11,
            albumArtSize: 28,
            borderRadius: 8,
            sectionGap: 6,
            lineGap: 4,
        },
    },

    // ============ MODERN ============
    {
        id: "glassmorphism",
        name: { ko: "글래스모피즘", en: "Glassmorphism" },
        description: {
            ko: "유리 같은 반투명 효과",
            en: "Glass-like translucent effect",
        },
        category: "modern",
        settings: {
            showOriginal: true,
            showPhonetic: true,
            showTranslation: true,
            showTrackInfo: true,
            showAlbumArt: true,
            lineBackgroundOpacity: 40,
            backgroundColor: "#ffffff",
            activeColor: "#0066ff",
            phoneticColor: "#666666",
            translationColor: "#444444",
            textColor: "#ffffff",
            originalFontSize: 24,
            borderRadius: 16,
            textShadow: "none",
        },
    },
    {
        id: "neon-glow",
        name: { ko: "네온 글로우", en: "Neon Glow" },
        description: {
            ko: "네온 조명 효과의 화려한 스타일",
            en: "Flashy neon lighting effect",
        },
        category: "modern",
        settings: {
            showOriginal: true,
            showPhonetic: false,
            showTranslation: true,
            showTrackInfo: true,
            lineBackgroundOpacity: 30,
            backgroundColor: "#0a0a0a",
            activeColor: "#ff00ff",
            translationColor: "#00ffff",
            trackInfoColor: "#ffff00",
            originalFontSize: 28,
            originalFontWeight: "800",
            textShadow: "hard",
            borderRadius: 20,
        },
    },
    {
        id: "solid-card",
        name: { ko: "솔리드 카드", en: "Solid Card" },
        description: {
            ko: "단색 배경의 카드 형태",
            en: "Card style with solid background",
        },
        category: "modern",
        settings: {
            showOriginal: true,
            showPhonetic: true,
            showTranslation: true,
            showTrackInfo: true,
            showAlbumArt: true,
            backgroundMode: "solid",
            solidBackgroundColor: "#1e1e2e",
            solidBackgroundOpacity: 95,
            lineBackgroundOpacity: 0,
            activeColor: "#cba6f7",
            phoneticColor: "#a6adc8",
            translationColor: "#bac2de",
            originalFontSize: 24,
            borderRadius: 16,
            padding: 16,
        },
    },

    // ============ CREATIVE ============
    {
        id: "popup-bubble",
        name: { ko: "팝업 버블", en: "Popup Bubble" },
        description: {
            ko: "말풍선 형태의 팝업 스타일",
            en: "Speech bubble popup style",
        },
        category: "creative",
        settings: {
            showOriginal: true,
            showPhonetic: false,
            showTranslation: true,
            showTrackInfo: false,
            lineBackgroundOpacity: 90,
            backgroundColor: "#ffffff",
            activeColor: "#333333",
            translationColor: "#666666",
            originalFontSize: 20,
            translationFontSize: 14,
            borderRadius: 24,
            textAlign: "left",
            overlayMaxWidth: 400,
        },
    },
    {
        id: "retro-terminal",
        name: { ko: "레트로 터미널", en: "Retro Terminal" },
        description: {
            ko: "옛날 터미널/모니터 스타일",
            en: "Old terminal/monitor style",
        },
        category: "creative",
        settings: {
            showOriginal: true,
            showPhonetic: false,
            showTranslation: true,
            showTrackInfo: true,
            backgroundMode: "solid",
            solidBackgroundColor: "#0d1117",
            solidBackgroundOpacity: 95,
            lineBackgroundOpacity: 0,
            activeColor: "#00ff00",
            translationColor: "#00aa00",
            trackInfoColor: "#00ff00",
            originalFontSize: 22,
            originalFontWeight: "400",
            borderRadius: 0,
            textAlign: "left",
        },
    },
    {
        id: "gradient-wave",
        name: { ko: "그라디언트 웨이브", en: "Gradient Wave" },
        description: {
            ko: "다채로운 그라디언트 색상",
            en: "Colorful gradient colors",
        },
        category: "creative",
        settings: {
            showOriginal: true,
            showPhonetic: true,
            showTranslation: true,
            showTrackInfo: true,
            showAlbumArt: true,
            lineBackgroundOpacity: 50,
            backgroundColor: "#1a1a2e",
            activeColor: "#e94560",
            phoneticColor: "#f39c12",
            translationColor: "#3498db",
            trackInfoColor: "#9b59b6",
            originalFontSize: 26,
            originalFontWeight: "700",
            borderRadius: 12,
        },
    },

    // ============ ACCESSIBILITY ============
    {
        id: "high-contrast",
        name: { ko: "고대비", en: "High Contrast" },
        description: {
            ko: "시인성이 높은 고대비 스타일",
            en: "High visibility contrast style",
        },
        category: "accessibility",
        settings: {
            showOriginal: true,
            showPhonetic: true,
            showTranslation: true,
            showTrackInfo: true,
            lineBackgroundOpacity: 100,
            backgroundColor: "#000000",
            activeColor: "#ffffff",
            phoneticColor: "#ffff00",
            translationColor: "#00ffff",
            trackInfoColor: "#ffffff",
            originalFontSize: 28,
            originalFontWeight: "700",
            textShadow: "none",
            borderRadius: 0,
        },
    },
    {
        id: "large-text",
        name: { ko: "큰 글씨", en: "Large Text" },
        description: {
            ko: "가독성을 위한 큰 글씨 크기",
            en: "Large text size for readability",
        },
        category: "accessibility",
        settings: {
            showOriginal: true,
            showPhonetic: false,
            showTranslation: true,
            showTrackInfo: true,
            lineBackgroundOpacity: 80,
            originalFontSize: 36,
            translationFontSize: 22,
            trackInfoFontSize: 16,
            originalFontWeight: "700",
            lineGap: 12,
            sectionGap: 16,
        },
    },
    {
        id: "dyslexia-friendly",
        name: { ko: "난독증 친화", en: "Dyslexia Friendly" },
        description: {
            ko: "읽기 쉬운 폰트와 간격",
            en: "Easy-to-read fonts and spacing",
        },
        category: "accessibility",
        settings: {
            showOriginal: true,
            showPhonetic: false,
            showTranslation: true,
            showTrackInfo: true,
            lineBackgroundOpacity: 70,
            backgroundColor: "#fffbf0",
            activeColor: "#2c3e50",
            translationColor: "#34495e",
            originalFontSize: 26,
            translationFontSize: 18,
            originalFontWeight: "500",
            lineGap: 14,
            textAlign: "left",
        },
    },
];

// Get preset by ID
export function getPresetById(id: string): PresetInfo | undefined {
    return presets.find((p) => p.id === id);
}

// Get presets by category
export function getPresetsByCategory(category: PresetInfo["category"]): PresetInfo[] {
    return presets.filter((p) => p.category === category);
}

// Apply preset to current settings
// Resets to defaults first, then applies preset, preserving user preferences (language, lock state, etc.)
export function applyPreset(
    currentSettings: OverlaySettings,
    preset: PresetInfo
): OverlaySettings {
    // Settings to preserve from current (user preferences)
    const preservedSettings = {
        language: currentSettings.language,
        isLocked: currentSettings.isLocked,
        // Keep custom fonts if user has set them (preset can override if needed)
        originalFontFamily: currentSettings.originalFontFamily,
        phoneticFontFamily: currentSettings.phoneticFontFamily,
        translationFontFamily: currentSettings.translationFontFamily,
        // Keep custom CSS
        customCSS: currentSettings.customCSS,
        // Keep unlock timing preferences
        enableHoverUnlock: currentSettings.enableHoverUnlock,
        unlockWaitTime: currentSettings.unlockWaitTime,
        unlockHoldTime: currentSettings.unlockHoldTime,
        enableAutoLock: currentSettings.enableAutoLock,
        autoLockDelay: currentSettings.autoLockDelay,
        // Keep behavior settings
        hideWhenPaused: currentSettings.hideWhenPaused,
        showNextTrack: currentSettings.showNextTrack,
        nextTrackSeconds: currentSettings.nextTrackSeconds,
        // Keep element order
        elementOrder: currentSettings.elementOrder,
        // Keep lyrics display lines
        lyricsPrevLines: currentSettings.lyricsPrevLines,
        lyricsNextLines: currentSettings.lyricsNextLines,
    };

    return {
        // Start with defaults (resets all style-related settings)
        ...defaultSettings,
        // Apply preserved user preferences
        ...preservedSettings,
        // Apply preset settings (overrides defaults for style)
        ...preset.settings,
    };
}

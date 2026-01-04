import { useState, useEffect, useRef, useMemo } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { invoke } from "@tauri-apps/api/core";
import { defaultSettings, OverlaySettings } from "./App";
import { presets, presetCategories, getPresetsByCategory, applyPreset, PresetInfo } from "./presets";
import "./SettingsPanel.css";

// Tab types - reorganized for better UX
type SettingsTab = "presets" | "elements" | "typography" | "colors" | "layout" | "behavior" | "advanced";

// Localization
const strings = {
    ko: {
        settingsTitle: "오버레이 설정",

        // Tabs
        tabPresets: "프리셋",
        tabElements: "요소",
        tabTypography: "타이포그래피",
        tabColors: "색상",
        tabLayout: "레이아웃",
        tabBehavior: "동작",
        tabAdvanced: "고급",

        // Presets Tab
        presetsSection: "스타일 프리셋",
        presetsDesc: "미리 정의된 스타일을 적용하여 빠르게 시작하세요",
        applyPreset: "적용",
        currentPreset: "현재",
        customized: "사용자 정의",

        // Elements Tab
        lyricsElementsSection: "가사 요소",
        originalLyrics: "원어 가사",
        originalLyricsDesc: "원본 언어로 된 가사 표시",
        phoneticLyrics: "발음 가사",
        phoneticLyricsDesc: "로마자 또는 발음 표기 표시",
        translationLyrics: "번역 가사",
        translationLyricsDesc: "번역된 가사 표시",

        trackInfoSection: "트랙 정보",
        showTrackInfo: "트랙 정보 표시",
        showTrackInfoDesc: "아티스트명과 곡 제목 표시",
        showAlbumArt: "앨범 아트 표시",
        showAlbumArtDesc: "앨범 커버 이미지 표시",

        lyricsLinesSection: "가사 라인 수",
        prevLines: "이전 가사",
        prevLinesDesc: "현재 줄 이전에 표시할 가사 수",
        nextLines: "다음 가사",
        nextLinesDesc: "현재 줄 이후에 표시할 가사 수",
        fadeInactive: "비활성 가사 흐리게",
        fadeInactiveDesc: "현재 줄 외의 가사를 연하게 표시",

        elementOrderSection: "요소 순서",
        elementOrderDesc: "드래그하여 순서 변경",
        elementTrackInfo: "트랙 정보",
        elementOriginal: "원어",
        elementPhonetic: "발음",
        elementTranslation: "번역",

        // Typography Tab
        originalTypoSection: "원어 가사 서체",
        phoneticTypoSection: "발음 가사 서체",
        translationTypoSection: "번역 가사 서체",
        trackInfoTypoSection: "트랙 정보 서체",

        fontSize: "글꼴 크기",
        fontWeight: "글꼴 굵기",
        fontFamily: "글꼴",
        systemDefault: "시스템 기본",
        letterSpacing: "자간",
        lineHeight: "줄 높이",

        weightLight: "얇게",
        weightRegular: "보통",
        weightMedium: "중간",
        weightSemibold: "약간 굵게",
        weightBold: "굵게",
        weightExtrabold: "매우 굵게",

        // Colors Tab
        lyricsColorsSection: "가사 색상",
        originalColor: "원어 가사",
        phoneticColor: "발음 가사",
        translationColor: "번역 가사",

        trackInfoColorsSection: "트랙 정보 색상",
        trackInfoTextColor: "텍스트",
        trackInfoBgColor: "배경",
        trackInfoBgOpacity: "배경 투명도",

        backgroundSection: "오버레이 배경",
        bgMode: "배경 모드",
        bgTransparent: "투명",
        bgSolid: "단색",
        bgColor: "배경 색상",
        bgOpacity: "배경 투명도",

        lineBackgroundSection: "가사 라인 배경",
        lineBgColor: "배경 색상",
        lineBgOpacity: "배경 투명도",

        // Layout Tab
        alignmentSection: "정렬",
        textAlign: "텍스트 정렬",
        alignLeft: "왼쪽",
        alignCenter: "가운데",
        alignRight: "오른쪽",

        spacingSection: "간격",
        sectionGap: "섹션 간격",
        sectionGapDesc: "트랙 정보와 가사 사이 간격",
        lineGap: "줄 간격",
        lineGapDesc: "가사 줄 사이 간격",
        lyricsSetGap: "가사 세트 간격",
        lyricsSetGapDesc: "여러 줄 표시 시 세트 간 간격",

        sizeSection: "크기",
        maxWidth: "최대 너비",
        maxWidthDesc: "오버레이 최대 너비 (0 = 제한 없음)",
        noLimit: "제한 없음",
        padding: "여백",

        cornersSection: "모서리",
        borderRadius: "모서리 둥글기",
        borderRadiusDesc: "가사 라인 모서리 반경",

        albumArtSection: "앨범 아트",
        albumArtSize: "크기",
        albumArtRadius: "모서리 둥글기",
        trackInfoRadius: "트랙 정보 모서리 둥글기",

        // Line Styling (NEW)
        lineStylingSection: "가사 라인 스타일",
        linePaddingH: "좌우 여백",
        linePaddingV: "상하 여백",
        lineBlur: "배경 흐림",
        lineBlurDesc: "backdrop-blur 강도",

        // Track Info Styling (NEW)
        trackInfoStylingSection: "트랙 정보 스타일",
        trackInfoPaddingH: "좌우 여백",
        trackInfoPaddingV: "상하 여백",
        trackInfoBlur: "배경 흐림",

        // Behavior Tab
        visibilitySection: "표시 조건",
        hideWhenPaused: "일시정지 시 숨기기",
        hideWhenPausedDesc: "음악이 멈추면 오버레이 숨김",
        showNextTrack: "다음 곡 미리보기",
        showNextTrackDesc: "곡이 끝나기 전 다음 곡 정보 표시",
        nextTrackTime: "미리보기 시간",
        nextTrackTimeDesc: "곡 종료 몇 초 전부터 표시할지",

        animationSection: "애니메이션",
        animationType: "애니메이션 유형",
        animNone: "없음",
        animFade: "페이드",
        animSlide: "슬라이드",
        animScale: "스케일",
        animDuration: "애니메이션 속도",
        animDurationDesc: "밀리초 단위",

        textEffectsSection: "텍스트 효과",
        textShadow: "그림자",
        shadowNone: "없음",
        shadowSoft: "부드럽게",
        shadowHard: "강하게",
        textStroke: "외곽선",
        textStrokeDesc: "텍스트 주변에 테두리 추가",
        strokeSize: "외곽선 두께",
        strokeColor: "외곽선 색상",
        shadowColor: "그림자 색상",

        // Inactive lyrics (NEW)
        inactiveLyricsOpacity: "비활성 가사 투명도",
        inactiveLyricsOpacityDesc: "현재 줄 외 가사의 투명도",

        unlockSection: "잠금 해제",
        hoverUnlock: "호버로 잠금 해제",
        hoverUnlockDesc: "마우스를 올려 잠금 해제",
        waitTime: "대기 시간",
        waitTimeDesc: "잠금 해제 시작까지 대기",
        holdTime: "홀드 시간",
        holdTimeDesc: "잠금 해제까지 유지할 시간",
        autoLock: "자동 잠금",
        autoLockDesc: "이동 후 자동으로 다시 잠금",
        autoLockDelay: "자동 잠금 지연",

        // Advanced Tab
        systemSection: "시스템",
        language: "언어",
        startOnBoot: "시작 시 자동 실행",
        startOnBootDesc: "컴퓨터 시작 시 자동 실행",
        startMinimized: "트레이에서 시작",
        startMinimizedDesc: "설정창 없이 트레이에서 바로 시작",
        checkUpdates: "업데이트 확인",

        serverSection: "서버",
        serverPort: "서버 포트",
        serverPortDesc: "Spicetify 연결 포트",
        portApply: "적용",
        portApplyConfirm: "포트 변경을 적용하려면 앱을 재시작해야 합니다. 재시작하시겠습니까?",
        portInvalid: "포트는 1024-65535 사이여야 합니다",

        customCSSSection: "사용자 정의 CSS",
        customCSS: "CSS 코드",
        customCSSDesc: "고급 사용자 정의 스타일",
        customCSSPlaceholder: "/* 여기에 CSS 작성 */",

        // Theme Import/Export
        themeSection: "테마 관리",
        exportTheme: "테마 내보내기",
        exportThemeDesc: "현재 설정을 JSON 파일로 저장합니다",
        importTheme: "테마 가져오기",
        importThemeDesc: "JSON 파일에서 설정을 불러옵니다",
        exportSuccess: "테마가 성공적으로 내보내졌습니다!",
        importSuccess: "테마가 성공적으로 가져와졌습니다!",
        importError: "테마 파일을 읽는 중 오류가 발생했습니다",
        importInvalid: "유효하지 않은 테마 파일입니다",

        dangerZone: "위험 구역",
        resetSettings: "설정 초기화",
        resetSettingsDesc: "모든 설정을 기본값으로 되돌립니다",
        resetConfirm: "정말 모든 설정을 초기화하시겠습니까?",
        resetAll: "전체 초기화",
        resetAllDesc: "설정을 초기화하고 초기 설정을 다시 진행합니다",
        resetAllConfirm: "정말 전체 초기화하시겠습니까? 초기 설정부터 다시 시작됩니다.",

        // Quick Actions
        quickActions: "빠른 작업",
        lockStatus: "잠금 상태",
        locked: "잠김",
        unlocked: "해제",

        // Common
        seconds: "초",
        px: "px",
        ms: "ms",
        on: "켜짐",
        off: "꺼짐",
    },
    en: {
        settingsTitle: "Overlay Settings",

        // Tabs
        tabPresets: "Presets",
        tabElements: "Elements",
        tabTypography: "Typography",
        tabColors: "Colors",
        tabLayout: "Layout",
        tabBehavior: "Behavior",
        tabAdvanced: "Advanced",

        // Presets Tab
        presetsSection: "Style Presets",
        presetsDesc: "Apply predefined styles to get started quickly",
        applyPreset: "Apply",
        currentPreset: "Current",
        customized: "Customized",

        // Elements Tab
        lyricsElementsSection: "Lyrics Elements",
        originalLyrics: "Original Lyrics",
        originalLyricsDesc: "Display lyrics in original language",
        phoneticLyrics: "Phonetic Lyrics",
        phoneticLyricsDesc: "Display romanization or pronunciation",
        translationLyrics: "Translation",
        translationLyricsDesc: "Display translated lyrics",

        trackInfoSection: "Track Information",
        showTrackInfo: "Show Track Info",
        showTrackInfoDesc: "Display artist name and song title",
        showAlbumArt: "Show Album Art",
        showAlbumArtDesc: "Display album cover image",

        lyricsLinesSection: "Lyrics Lines",
        prevLines: "Previous Lines",
        prevLinesDesc: "Lines to show before current",
        nextLines: "Next Lines",
        nextLinesDesc: "Lines to show after current",
        fadeInactive: "Fade Inactive Lines",
        fadeInactiveDesc: "Dim non-current lyrics",

        elementOrderSection: "Element Order",
        elementOrderDesc: "Drag to reorder",
        elementTrackInfo: "Track Info",
        elementOriginal: "Original",
        elementPhonetic: "Phonetic",
        elementTranslation: "Translation",

        // Typography Tab
        originalTypoSection: "Original Lyrics Font",
        phoneticTypoSection: "Phonetic Lyrics Font",
        translationTypoSection: "Translation Font",
        trackInfoTypoSection: "Track Info Font",

        fontSize: "Font Size",
        fontWeight: "Font Weight",
        fontFamily: "Font Family",
        systemDefault: "System Default",
        letterSpacing: "Letter Spacing",
        lineHeight: "Line Height",

        weightLight: "Light",
        weightRegular: "Regular",
        weightMedium: "Medium",
        weightSemibold: "Semibold",
        weightBold: "Bold",
        weightExtrabold: "Extrabold",

        // Colors Tab
        lyricsColorsSection: "Lyrics Colors",
        originalColor: "Original Lyrics",
        phoneticColor: "Phonetic Lyrics",
        translationColor: "Translation",

        trackInfoColorsSection: "Track Info Colors",
        trackInfoTextColor: "Text",
        trackInfoBgColor: "Background",
        trackInfoBgOpacity: "Background Opacity",

        backgroundSection: "Overlay Background",
        bgMode: "Background Mode",
        bgTransparent: "Transparent",
        bgSolid: "Solid",
        bgColor: "Background Color",
        bgOpacity: "Background Opacity",

        lineBackgroundSection: "Line Background",
        lineBgColor: "Background Color",
        lineBgOpacity: "Background Opacity",

        // Layout Tab
        alignmentSection: "Alignment",
        textAlign: "Text Alignment",
        alignLeft: "Left",
        alignCenter: "Center",
        alignRight: "Right",

        spacingSection: "Spacing",
        sectionGap: "Section Gap",
        sectionGapDesc: "Gap between track info and lyrics",
        lineGap: "Line Gap",
        lineGapDesc: "Gap between lyrics lines",
        lyricsSetGap: "Lyrics Set Gap",
        lyricsSetGapDesc: "Gap between line sets when showing multiple",

        sizeSection: "Size",
        maxWidth: "Max Width",
        maxWidthDesc: "Maximum overlay width (0 = no limit)",
        noLimit: "No limit",
        padding: "Padding",

        cornersSection: "Corners",
        borderRadius: "Corner Radius",
        borderRadiusDesc: "Lyrics line corner radius",

        albumArtSection: "Album Art",
        albumArtSize: "Size",
        albumArtRadius: "Corner Radius",
        trackInfoRadius: "Track Info Corner Radius",

        // Line Styling (NEW)
        lineStylingSection: "Line Styling",
        linePaddingH: "Horizontal Padding",
        linePaddingV: "Vertical Padding",
        lineBlur: "Background Blur",
        lineBlurDesc: "Backdrop blur strength",

        // Track Info Styling (NEW)
        trackInfoStylingSection: "Track Info Styling",
        trackInfoPaddingH: "Horizontal Padding",
        trackInfoPaddingV: "Vertical Padding",
        trackInfoBlur: "Background Blur",

        // Behavior Tab
        visibilitySection: "Visibility",
        hideWhenPaused: "Hide When Paused",
        hideWhenPausedDesc: "Hide overlay when music is paused",
        showNextTrack: "Show Next Track",
        showNextTrackDesc: "Preview next track before song ends",
        nextTrackTime: "Preview Time",
        nextTrackTimeDesc: "Seconds before end to show preview",

        animationSection: "Animation",
        animationType: "Animation Type",
        animNone: "None",
        animFade: "Fade",
        animSlide: "Slide",
        animScale: "Scale",
        animDuration: "Animation Duration",
        animDurationDesc: "In milliseconds",

        textEffectsSection: "Text Effects",
        textShadow: "Shadow",
        shadowNone: "None",
        shadowSoft: "Soft",
        shadowHard: "Hard",
        textStroke: "Outline",
        textStrokeDesc: "Add border around text",
        strokeSize: "Outline Size",
        strokeColor: "Outline Color",
        shadowColor: "Shadow Color",

        // Inactive lyrics (NEW)
        inactiveLyricsOpacity: "Inactive Lyrics Opacity",
        inactiveLyricsOpacityDesc: "Opacity of non-current lyrics",

        unlockSection: "Unlock",
        hoverUnlock: "Hover to Unlock",
        hoverUnlockDesc: "Unlock by hovering mouse",
        waitTime: "Wait Time",
        waitTimeDesc: "Wait before unlock starts",
        holdTime: "Hold Time",
        holdTimeDesc: "Time to hold for unlock",
        autoLock: "Auto Lock",
        autoLockDesc: "Automatically lock after moving",
        autoLockDelay: "Auto Lock Delay",

        // Advanced Tab
        systemSection: "System",
        language: "Language",
        startOnBoot: "Start on Boot",
        startOnBootDesc: "Launch automatically at startup",
        startMinimized: "Start in Tray",
        startMinimizedDesc: "Start directly in tray without settings window",
        checkUpdates: "Check for Updates",

        serverSection: "Server",
        serverPort: "Server Port",
        serverPortDesc: "Spicetify connection port",
        portApply: "Apply",
        portApplyConfirm: "Restart required to apply port change. Restart now?",
        portInvalid: "Port must be between 1024-65535",

        customCSSSection: "Custom CSS",
        customCSS: "CSS Code",
        customCSSDesc: "Advanced custom styling",
        customCSSPlaceholder: "/* Write CSS here */",

        // Theme Import/Export
        themeSection: "Theme Management",
        exportTheme: "Export Theme",
        exportThemeDesc: "Save current settings as a JSON file",
        importTheme: "Import Theme",
        importThemeDesc: "Load settings from a JSON file",
        exportSuccess: "Theme exported successfully!",
        importSuccess: "Theme imported successfully!",
        importError: "Error reading theme file",
        importInvalid: "Invalid theme file",

        dangerZone: "Danger Zone",
        resetSettings: "Reset Settings",
        resetSettingsDesc: "Restore all settings to defaults",
        resetConfirm: "Are you sure you want to reset all settings?",
        resetAll: "Full Reset",
        resetAllDesc: "Reset settings and restart the initial setup wizard",
        resetAllConfirm: "Are you sure? This will restart the initial setup wizard.",

        // Quick Actions
        quickActions: "Quick Actions",
        lockStatus: "Lock Status",
        locked: "Locked",
        unlocked: "Unlocked",

        // Common
        seconds: "sec",
        px: "px",
        ms: "ms",
        on: "On",
        off: "Off",
    },
};

// ============================================
// Reusable Components
// ============================================

function Toggle({
    checked,
    onChange,
    disabled = false,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            className={`settings-toggle ${checked ? "active" : ""} ${disabled ? "disabled" : ""}`}
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
        >
            <span className="toggle-thumb" />
        </button>
    );
}

function Slider({
    value,
    onChange,
    min,
    max,
    step = 1,
    suffix = "",
    showValue = true,
}: {
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    showValue?: boolean;
}) {
    const [isDragging, setIsDragging] = useState(false);
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className={`settings-slider ${isDragging ? "dragging" : ""}`}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onTouchStart={() => setIsDragging(true)}
                onTouchEnd={() => setIsDragging(false)}
                style={{
                    background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`,
                }}
            />
            {showValue && (
                <span className={`slider-value ${isDragging ? "active" : ""}`}>
                    {Number.isInteger(step) ? value : value.toFixed(1)}
                    {suffix}
                </span>
            )}
        </div>
    );
}

function ColorPicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="settings-color-picker">
            <div className="color-swatch" style={{ backgroundColor: value }} />
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
    );
}

function FontSelect({
    value,
    onChange,
    placeholder = "System Default",
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    const [fonts, setFonts] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        invoke<string[]>("get_system_fonts")
            .then((systemFonts) => {
                setFonts(systemFonts);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error("Failed to get system fonts:", err);
                setIsLoading(false);
            });
    }, []);

    return (
        <select
            className="settings-select font-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLoading}
        >
            <option value="">{placeholder}</option>
            {fonts.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                </option>
            ))}
        </select>
    );
}

function WeightSelect({
    value,
    onChange,
    t,
}: {
    value: string;
    onChange: (v: string) => void;
    t: typeof strings.ko;
}) {
    const weights = [
        { value: "300", label: t.weightLight },
        { value: "400", label: t.weightRegular },
        { value: "500", label: t.weightMedium },
        { value: "600", label: t.weightSemibold },
        { value: "700", label: t.weightBold },
        { value: "800", label: t.weightExtrabold },
    ];

    return (
        <select
            className="settings-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            {weights.map((w) => (
                <option key={w.value} value={w.value}>
                    {w.label}
                </option>
            ))}
        </select>
    );
}

function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="settings-segmented">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    className={value === opt.value ? "active" : ""}
                    onClick={() => onChange(opt.value)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

function AlignButtons({
    value,
    onChange,
}: {
    value: "left" | "center" | "right";
    onChange: (v: "left" | "center" | "right") => void;
}) {
    return (
        <div className="align-buttons">
            <button
                className={`align-btn ${value === "left" ? "active" : ""}`}
                onClick={() => onChange("left")}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="15" y2="12" />
                    <line x1="3" y1="18" x2="18" y2="18" />
                </svg>
            </button>
            <button
                className={`align-btn ${value === "center" ? "active" : ""}`}
                onClick={() => onChange("center")}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="6" y1="12" x2="18" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
            </button>
            <button
                className={`align-btn ${value === "right" ? "active" : ""}`}
                onClick={() => onChange("right")}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="9" y1="12" x2="21" y2="12" />
                    <line x1="6" y1="18" x2="21" y2="18" />
                </svg>
            </button>
        </div>
    );
}

function SettingItem({
    label,
    description,
    children,
    column = false,
}: {
    label: string;
    description?: string;
    children: React.ReactNode;
    column?: boolean;
}) {
    return (
        <div className={`setting-item ${column ? "column" : ""}`}>
            <div className="setting-label-group">
                <span className="setting-label">{label}</span>
                {description && <span className="setting-desc">{description}</span>}
            </div>
            <div className="setting-control">{children}</div>
        </div>
    );
}

function SettingSection({
    title,
    description,
    children,
    delay = 0,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <div className="setting-section" style={{ animationDelay: `${delay}ms` }}>
            <div className="section-header">
                <div className="section-title">{title}</div>
                {description && <div className="section-desc">{description}</div>}
            </div>
            <div className="section-content">{children}</div>
        </div>
    );
}

// ============================================
// Preset Card Component
// ============================================

function PresetCard({
    preset,
    isActive,
    onApply,
    lang,
}: {
    preset: PresetInfo;
    isActive: boolean;
    onApply: () => void;
    lang: "ko" | "en";
}) {
    return (
        <div className={`preset-card ${isActive ? "active" : ""}`} onClick={onApply}>
            <div className="preset-card-content">
                <div className="preset-name">{preset.name[lang]}</div>
                <div className="preset-desc">{preset.description[lang]}</div>
            </div>
            {isActive && <div className="preset-active-badge">Active</div>}
        </div>
    );
}

// ============================================
// Main Settings Panel
// ============================================

export default function SettingsPanel({
    settings,
    onSettingsChange,
    onCheckUpdates,
    onResetAll,
}: {
    settings: OverlaySettings;
    onSettingsChange: (s: OverlaySettings) => void;
    onCheckUpdates: () => void;
    onResetAll?: () => void;
}) {
    const t = strings[settings.language || "ko"];
    const [activeTab, setActiveTab] = useState<SettingsTab>("presets");
    const [autoStart, setAutoStart] = useState(false);
    const [startMinimized, setStartMinimized] = useState(false);
    const [serverPort, setServerPort] = useState<number>(15000);
    const [portInput, setPortInput] = useState<string>("15000");
    const [portChanged, setPortChanged] = useState(false);
    const [activePresetId, setActivePresetId] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        isEnabled().then(setAutoStart).catch(console.error);
        invoke<number>("get_server_port")
            .then((port) => {
                setServerPort(port);
                setPortInput(String(port));
            })
            .catch(console.error);
        invoke<boolean>("get_start_minimized")
            .then(setStartMinimized)
            .catch(console.error);
    }, []);

    const update = <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => {
        onSettingsChange({ ...settings, [key]: value });
        setActivePresetId(null); // Mark as customized when any setting changes
    };

    const handlePortInputChange = (value: string) => {
        setPortInput(value);
        const num = parseInt(value, 10);
        setPortChanged(!isNaN(num) && num !== serverPort && num >= 1024 && num <= 65535);
    };

    const handlePortApply = async () => {
        const newPort = parseInt(portInput, 10);
        if (isNaN(newPort) || newPort < 1024 || newPort > 65535) {
            alert(t.portInvalid);
            return;
        }
        if (confirm(t.portApplyConfirm)) {
            try {
                await invoke("set_server_port", { port: newPort });
                await invoke("restart_app");
            } catch (e) {
                console.error("Failed to apply port:", e);
                alert(String(e));
            }
        }
    };

    const toggleAutoStart = async (checked: boolean) => {
        try {
            if (checked) await enable();
            else await disable();
            setAutoStart(checked);
        } catch (e) {
            console.error(e);
        }
    };

    const toggleStartMinimized = async (checked: boolean) => {
        try {
            await invoke("set_start_minimized", { minimized: checked });
            setStartMinimized(checked);
        } catch (e) {
            console.error(e);
        }
    };

    const handleTabChange = (tab: SettingsTab) => {
        setActiveTab(tab);
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    };

    const handleApplyPreset = (preset: PresetInfo) => {
        const newSettings = applyPreset(settings, preset);
        onSettingsChange(newSettings);
        setActivePresetId(preset.id);
    };

    // Theme export handler
    const handleExportTheme = () => {
        try {
            // Create theme data object (exclude some runtime-specific settings)
            const themeData = {
                version: "1.0",
                name: `ivLyrics-overlay-theme-${new Date().toISOString().slice(0, 10)}`,
                settings: { ...settings },
            };

            // Remove runtime-specific settings that shouldn't be exported
            delete (themeData.settings as any).isLocked;

            const jsonString = JSON.stringify(themeData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `ivLyrics-theme-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert(t.exportSuccess);
        } catch (error) {
            console.error("Failed to export theme:", error);
        }
    };

    // Theme import handler
    const handleImportTheme = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";

        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = event.target?.result as string;
                    const themeData = JSON.parse(content);

                    // Validate theme data structure
                    if (!themeData.settings || typeof themeData.settings !== "object") {
                        alert(t.importInvalid);
                        return;
                    }

                    // Merge with default settings to ensure all fields exist
                    const importedSettings = {
                        ...defaultSettings,
                        ...themeData.settings,
                        // Preserve current language and lock state
                        language: settings.language,
                        isLocked: settings.isLocked,
                    };

                    onSettingsChange(importedSettings);
                    setActivePresetId(null);
                    alert(t.importSuccess);
                } catch (error) {
                    console.error("Failed to import theme:", error);
                    alert(t.importError);
                }
            };
            reader.onerror = () => {
                alert(t.importError);
            };
            reader.readAsText(file);
        };

        input.click();
    };

    // Group presets by category
    const presetsByCategory = useMemo(() => {
        const categories = Object.keys(presetCategories) as (keyof typeof presetCategories)[];
        return categories.map((cat) => ({
            key: cat,
            name: presetCategories[cat],
            presets: getPresetsByCategory(cat),
        }));
    }, []);

    const tabs: { key: SettingsTab; icon: string; label: string }[] = [
        { key: "presets", icon: "fa-swatchbook", label: t.tabPresets },
        { key: "elements", icon: "fa-layer-group", label: t.tabElements },
        { key: "typography", icon: "fa-font", label: t.tabTypography },
        { key: "colors", icon: "fa-palette", label: t.tabColors },
        { key: "layout", icon: "fa-table-columns", label: t.tabLayout },
        { key: "behavior", icon: "fa-sliders", label: t.tabBehavior },
        { key: "advanced", icon: "fa-gear", label: t.tabAdvanced },
    ];

    return (
        <div className="settings-panel">
            <header className="settings-header">
                <h1>{t.settingsTitle}</h1>
                <button
                    className="lang-btn"
                    onClick={() => {
                        const newLang = settings.language === "ko" ? "en" : "ko";
                        update("language", newLang);
                        // Update tray menu language (requires app restart to take effect)
                        invoke("set_tray_language", { language: newLang }).catch(console.error);
                    }}
                >
                    <i className="fa-solid fa-globe"></i>
                    <span>{settings.language === "ko" ? "EN" : "한국어"}</span>
                </button>
            </header>

            {/* Tab Navigation */}
            <nav className="settings-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        className={activeTab === tab.key ? "active" : ""}
                        onClick={() => handleTabChange(tab.key)}
                    >
                        <span className="tab-icon">
                            <i className={`fa-solid ${tab.icon}`}></i>
                        </span>
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </nav>

            {/* Content */}
            <div className="settings-content-wrapper">
                <div className="settings-content" ref={contentRef} key={activeTab}>
                    {/* ========== PRESETS TAB ========== */}
                    {activeTab === "presets" && (
                        <>
                            <div className="presets-header">
                                <h2>{t.presetsSection}</h2>
                                <p>{t.presetsDesc}</p>
                                {activePresetId ? (
                                    <div className="current-preset-badge">
                                        {t.currentPreset}: {presets.find((p) => p.id === activePresetId)?.name[settings.language] || activePresetId}
                                    </div>
                                ) : (
                                    <div className="current-preset-badge customized">{t.customized}</div>
                                )}
                            </div>

                            {presetsByCategory.map((category, catIdx) => (
                                <SettingSection
                                    key={category.key}
                                    title={category.name[settings.language]}
                                    delay={catIdx * 50}
                                >
                                    <div className="presets-grid">
                                        {category.presets.map((preset) => (
                                            <PresetCard
                                                key={preset.id}
                                                preset={preset}
                                                isActive={activePresetId === preset.id}
                                                onApply={() => handleApplyPreset(preset)}
                                                lang={settings.language}
                                            />
                                        ))}
                                    </div>
                                </SettingSection>
                            ))}
                        </>
                    )}

                    {/* ========== ELEMENTS TAB ========== */}
                    {activeTab === "elements" && (
                        <>
                            <SettingSection title={t.lyricsElementsSection} delay={0}>
                                <SettingItem label={t.originalLyrics} description={t.originalLyricsDesc}>
                                    <Toggle checked={settings.showOriginal} onChange={(v) => update("showOriginal", v)} />
                                </SettingItem>
                                <SettingItem label={t.phoneticLyrics} description={t.phoneticLyricsDesc}>
                                    <Toggle checked={settings.showPhonetic} onChange={(v) => update("showPhonetic", v)} />
                                </SettingItem>
                                <SettingItem label={t.translationLyrics} description={t.translationLyricsDesc}>
                                    <Toggle checked={settings.showTranslation} onChange={(v) => update("showTranslation", v)} />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.trackInfoSection} delay={50}>
                                <SettingItem label={t.showTrackInfo} description={t.showTrackInfoDesc}>
                                    <Toggle checked={settings.showTrackInfo} onChange={(v) => update("showTrackInfo", v)} />
                                </SettingItem>
                                <SettingItem label={t.showAlbumArt} description={t.showAlbumArtDesc}>
                                    <Toggle
                                        checked={settings.showAlbumArt}
                                        onChange={(v) => update("showAlbumArt", v)}
                                        disabled={!settings.showTrackInfo}
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.lyricsLinesSection} delay={100}>
                                <SettingItem label={t.prevLines} description={t.prevLinesDesc} column>
                                    <Slider
                                        value={settings.lyricsPrevLines}
                                        onChange={(v) => update("lyricsPrevLines", v)}
                                        min={0}
                                        max={5}
                                        step={1}
                                    />
                                </SettingItem>
                                <SettingItem label={t.nextLines} description={t.nextLinesDesc} column>
                                    <Slider
                                        value={settings.lyricsNextLines}
                                        onChange={(v) => update("lyricsNextLines", v)}
                                        min={0}
                                        max={5}
                                        step={1}
                                    />
                                </SettingItem>
                                <SettingItem label={t.fadeInactive} description={t.fadeInactiveDesc}>
                                    <Toggle
                                        checked={settings.fadeNonActiveLyrics}
                                        onChange={(v) => update("fadeNonActiveLyrics", v)}
                                    />
                                </SettingItem>
                            </SettingSection>
                        </>
                    )}

                    {/* ========== TYPOGRAPHY TAB ========== */}
                    {activeTab === "typography" && (
                        <>
                            <SettingSection title={t.originalTypoSection} delay={0}>
                                <SettingItem label={t.fontSize} column>
                                    <Slider
                                        value={settings.originalFontSize}
                                        onChange={(v) => update("originalFontSize", v)}
                                        min={12}
                                        max={60}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.fontWeight}>
                                    <WeightSelect
                                        value={settings.originalFontWeight}
                                        onChange={(v) => update("originalFontWeight", v)}
                                        t={t}
                                    />
                                </SettingItem>
                                <SettingItem label={t.fontFamily}>
                                    <FontSelect
                                        value={settings.originalFontFamily}
                                        onChange={(v) => update("originalFontFamily", v)}
                                        placeholder={t.systemDefault}
                                    />
                                </SettingItem>
                                <SettingItem label={t.letterSpacing} column>
                                    <Slider
                                        value={settings.originalLetterSpacing}
                                        onChange={(v) => update("originalLetterSpacing", v)}
                                        min={-2}
                                        max={10}
                                        step={0.5}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.lineHeight} column>
                                    <Slider
                                        value={settings.originalLineHeight}
                                        onChange={(v) => update("originalLineHeight", v)}
                                        min={0.8}
                                        max={2}
                                        step={0.1}
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.phoneticTypoSection} delay={50}>
                                <SettingItem label={t.fontSize} column>
                                    <Slider
                                        value={settings.phoneticFontSize}
                                        onChange={(v) => update("phoneticFontSize", v)}
                                        min={10}
                                        max={40}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.fontWeight}>
                                    <WeightSelect
                                        value={settings.phoneticFontWeight}
                                        onChange={(v) => update("phoneticFontWeight", v)}
                                        t={t}
                                    />
                                </SettingItem>
                                <SettingItem label={t.fontFamily}>
                                    <FontSelect
                                        value={settings.phoneticFontFamily}
                                        onChange={(v) => update("phoneticFontFamily", v)}
                                        placeholder={t.systemDefault}
                                    />
                                </SettingItem>
                                <SettingItem label={t.letterSpacing} column>
                                    <Slider
                                        value={settings.phoneticLetterSpacing}
                                        onChange={(v) => update("phoneticLetterSpacing", v)}
                                        min={-2}
                                        max={10}
                                        step={0.5}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.lineHeight} column>
                                    <Slider
                                        value={settings.phoneticLineHeight}
                                        onChange={(v) => update("phoneticLineHeight", v)}
                                        min={0.8}
                                        max={2}
                                        step={0.1}
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.translationTypoSection} delay={100}>
                                <SettingItem label={t.fontSize} column>
                                    <Slider
                                        value={settings.translationFontSize}
                                        onChange={(v) => update("translationFontSize", v)}
                                        min={10}
                                        max={40}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.fontWeight}>
                                    <WeightSelect
                                        value={settings.translationFontWeight}
                                        onChange={(v) => update("translationFontWeight", v)}
                                        t={t}
                                    />
                                </SettingItem>
                                <SettingItem label={t.fontFamily}>
                                    <FontSelect
                                        value={settings.translationFontFamily}
                                        onChange={(v) => update("translationFontFamily", v)}
                                        placeholder={t.systemDefault}
                                    />
                                </SettingItem>
                                <SettingItem label={t.letterSpacing} column>
                                    <Slider
                                        value={settings.translationLetterSpacing}
                                        onChange={(v) => update("translationLetterSpacing", v)}
                                        min={-2}
                                        max={10}
                                        step={0.5}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.lineHeight} column>
                                    <Slider
                                        value={settings.translationLineHeight}
                                        onChange={(v) => update("translationLineHeight", v)}
                                        min={0.8}
                                        max={2}
                                        step={0.1}
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.trackInfoTypoSection} delay={150}>
                                <SettingItem label={t.fontSize} column>
                                    <Slider
                                        value={settings.trackInfoFontSize}
                                        onChange={(v) => update("trackInfoFontSize", v)}
                                        min={10}
                                        max={24}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.fontWeight}>
                                    <WeightSelect
                                        value={settings.trackInfoFontWeight}
                                        onChange={(v) => update("trackInfoFontWeight", v)}
                                        t={t}
                                    />
                                </SettingItem>
                            </SettingSection>
                        </>
                    )}

                    {/* ========== COLORS TAB ========== */}
                    {activeTab === "colors" && (
                        <>
                            <SettingSection title={t.lyricsColorsSection} delay={0}>
                                <SettingItem label={t.originalColor}>
                                    <ColorPicker value={settings.activeColor} onChange={(v) => update("activeColor", v)} />
                                </SettingItem>
                                <SettingItem label={t.phoneticColor}>
                                    <ColorPicker value={settings.phoneticColor} onChange={(v) => update("phoneticColor", v)} />
                                </SettingItem>
                                <SettingItem label={t.translationColor}>
                                    <ColorPicker value={settings.translationColor} onChange={(v) => update("translationColor", v)} />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.lineBackgroundSection} delay={50}>
                                <SettingItem label={t.lineBgColor}>
                                    <ColorPicker value={settings.backgroundColor} onChange={(v) => update("backgroundColor", v)} />
                                </SettingItem>
                                <SettingItem label={t.lineBgOpacity} column>
                                    <Slider
                                        value={settings.lineBackgroundOpacity}
                                        onChange={(v) => update("lineBackgroundOpacity", v)}
                                        min={0}
                                        max={100}
                                        step={5}
                                        suffix="%"
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.trackInfoColorsSection} delay={100}>
                                <SettingItem label={t.trackInfoTextColor}>
                                    <ColorPicker value={settings.trackInfoColor} onChange={(v) => update("trackInfoColor", v)} />
                                </SettingItem>
                                <SettingItem label={t.trackInfoBgColor}>
                                    <ColorPicker value={settings.trackInfoBgColor} onChange={(v) => update("trackInfoBgColor", v)} />
                                </SettingItem>
                                <SettingItem label={t.trackInfoBgOpacity} column>
                                    <Slider
                                        value={settings.trackInfoBgOpacity}
                                        onChange={(v) => update("trackInfoBgOpacity", v)}
                                        min={0}
                                        max={100}
                                        step={5}
                                        suffix="%"
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.backgroundSection} delay={150}>
                                <SettingItem label={t.bgMode}>
                                    <SegmentedControl
                                        options={[
                                            { value: "transparent", label: t.bgTransparent },
                                            { value: "solid", label: t.bgSolid },
                                        ]}
                                        value={settings.backgroundMode}
                                        onChange={(v) => update("backgroundMode", v)}
                                    />
                                </SettingItem>
                                {settings.backgroundMode === "solid" && (
                                    <>
                                        <SettingItem label={t.bgColor}>
                                            <ColorPicker
                                                value={settings.solidBackgroundColor}
                                                onChange={(v) => update("solidBackgroundColor", v)}
                                            />
                                        </SettingItem>
                                        <SettingItem label={t.bgOpacity} column>
                                            <Slider
                                                value={settings.solidBackgroundOpacity}
                                                onChange={(v) => update("solidBackgroundOpacity", v)}
                                                min={0}
                                                max={100}
                                                step={5}
                                                suffix="%"
                                            />
                                        </SettingItem>
                                    </>
                                )}
                            </SettingSection>
                        </>
                    )}

                    {/* ========== LAYOUT TAB ========== */}
                    {activeTab === "layout" && (
                        <>
                            <SettingSection title={t.alignmentSection} delay={0}>
                                <SettingItem label={t.textAlign}>
                                    <AlignButtons value={settings.textAlign} onChange={(v) => update("textAlign", v)} />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.spacingSection} delay={50}>
                                <SettingItem label={t.sectionGap} description={t.sectionGapDesc} column>
                                    <Slider
                                        value={settings.sectionGap}
                                        onChange={(v) => update("sectionGap", v)}
                                        min={0}
                                        max={40}
                                        step={2}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.lineGap} description={t.lineGapDesc} column>
                                    <Slider
                                        value={settings.lineGap}
                                        onChange={(v) => update("lineGap", v)}
                                        min={0}
                                        max={24}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.lyricsSetGap} description={t.lyricsSetGapDesc} column>
                                    <Slider
                                        value={settings.lyricsSetGap}
                                        onChange={(v) => update("lyricsSetGap", v)}
                                        min={0}
                                        max={40}
                                        step={2}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.cornersSection} delay={100}>
                                <SettingItem label={t.borderRadius} description={t.borderRadiusDesc} column>
                                    <Slider
                                        value={settings.borderRadius}
                                        onChange={(v) => update("borderRadius", v)}
                                        min={0}
                                        max={32}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.trackInfoRadius} column>
                                    <Slider
                                        value={settings.trackInfoBorderRadius}
                                        onChange={(v) => update("trackInfoBorderRadius", v)}
                                        min={0}
                                        max={32}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.albumArtSection} delay={200}>
                                <SettingItem label={t.albumArtSize} column>
                                    <Slider
                                        value={settings.albumArtSize}
                                        onChange={(v) => update("albumArtSize", v)}
                                        min={20}
                                        max={80}
                                        step={2}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.albumArtRadius} column>
                                    <Slider
                                        value={settings.albumArtBorderRadius}
                                        onChange={(v) => update("albumArtBorderRadius", v)}
                                        min={0}
                                        max={40}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                            </SettingSection>

                            {/* Line Styling Section - NEW */}
                            <SettingSection title={t.lineStylingSection} delay={250}>
                                <SettingItem label={t.linePaddingH} column>
                                    <Slider
                                        value={settings.linePaddingH}
                                        onChange={(v) => update("linePaddingH", v)}
                                        min={0}
                                        max={32}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.linePaddingV} column>
                                    <Slider
                                        value={settings.linePaddingV}
                                        onChange={(v) => update("linePaddingV", v)}
                                        min={0}
                                        max={20}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.lineBlur} description={t.lineBlurDesc} column>
                                    <Slider
                                        value={settings.lineBlurStrength}
                                        onChange={(v) => update("lineBlurStrength", v)}
                                        min={0}
                                        max={24}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                            </SettingSection>

                            {/* Track Info Styling Section - NEW */}
                            <SettingSection title={t.trackInfoStylingSection} delay={300}>
                                <SettingItem label={t.trackInfoPaddingH} column>
                                    <Slider
                                        value={settings.trackInfoPaddingH}
                                        onChange={(v) => update("trackInfoPaddingH", v)}
                                        min={4}
                                        max={32}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.trackInfoPaddingV} column>
                                    <Slider
                                        value={settings.trackInfoPaddingV}
                                        onChange={(v) => update("trackInfoPaddingV", v)}
                                        min={2}
                                        max={20}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                                <SettingItem label={t.trackInfoBlur} column>
                                    <Slider
                                        value={settings.trackInfoBlur}
                                        onChange={(v) => update("trackInfoBlur", v)}
                                        min={0}
                                        max={32}
                                        step={1}
                                        suffix={t.px}
                                    />
                                </SettingItem>
                            </SettingSection>
                        </>
                    )}

                    {/* ========== BEHAVIOR TAB ========== */}
                    {activeTab === "behavior" && (
                        <>
                            <SettingSection title={t.visibilitySection} delay={0}>
                                <SettingItem label={t.hideWhenPaused} description={t.hideWhenPausedDesc}>
                                    <Toggle checked={settings.hideWhenPaused} onChange={(v) => update("hideWhenPaused", v)} />
                                </SettingItem>
                                <SettingItem label={t.showNextTrack} description={t.showNextTrackDesc}>
                                    <Toggle checked={settings.showNextTrack} onChange={(v) => update("showNextTrack", v)} />
                                </SettingItem>
                                {settings.showNextTrack && (
                                    <SettingItem label={t.nextTrackTime} description={t.nextTrackTimeDesc} column>
                                        <Slider
                                            value={settings.nextTrackSeconds}
                                            onChange={(v) => update("nextTrackSeconds", v)}
                                            min={5}
                                            max={30}
                                            step={1}
                                            suffix={t.seconds}
                                        />
                                    </SettingItem>
                                )}
                            </SettingSection>

                            <SettingSection title={t.animationSection} delay={50}>
                                <SettingItem label={t.animationType}>
                                    <SegmentedControl
                                        options={[
                                            { value: "none", label: t.animNone },
                                            { value: "fade", label: t.animFade },
                                            { value: "slide", label: t.animSlide },
                                            { value: "scale", label: t.animScale },
                                        ]}
                                        value={settings.animationType}
                                        onChange={(v) => update("animationType", v)}
                                    />
                                </SettingItem>
                                <SettingItem label={t.animDuration} description={t.animDurationDesc} column>
                                    <Slider
                                        value={settings.animationDuration}
                                        onChange={(v) => update("animationDuration", v)}
                                        min={100}
                                        max={800}
                                        step={50}
                                        suffix={t.ms}
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.textEffectsSection} delay={100}>
                                <SettingItem label={t.textShadow}>
                                    <SegmentedControl
                                        options={[
                                            { value: "none", label: t.shadowNone },
                                            { value: "soft", label: t.shadowSoft },
                                            { value: "hard", label: t.shadowHard },
                                        ]}
                                        value={settings.textShadow}
                                        onChange={(v) => update("textShadow", v)}
                                    />
                                </SettingItem>
                                {settings.textShadow !== "none" && (
                                    <SettingItem label={t.shadowColor}>
                                        <ColorPicker
                                            value={settings.textShadowColor}
                                            onChange={(v) => update("textShadowColor", v)}
                                        />
                                    </SettingItem>
                                )}
                                <SettingItem label={t.textStroke} description={t.textStrokeDesc}>
                                    <Toggle checked={settings.textStroke} onChange={(v) => update("textStroke", v)} />
                                </SettingItem>
                                {settings.textStroke && (
                                    <>
                                        <SettingItem label={t.strokeSize} column>
                                            <Slider
                                                value={settings.textStrokeSize}
                                                onChange={(v) => update("textStrokeSize", v)}
                                                min={1}
                                                max={5}
                                                step={1}
                                                suffix={t.px}
                                            />
                                        </SettingItem>
                                        <SettingItem label={t.strokeColor}>
                                            <ColorPicker
                                                value={settings.textStrokeColor}
                                                onChange={(v) => update("textStrokeColor", v)}
                                            />
                                        </SettingItem>
                                    </>
                                )}
                                <SettingItem
                                    label={t.inactiveLyricsOpacity}
                                    description={t.inactiveLyricsOpacityDesc}
                                    column
                                >
                                    <Slider
                                        value={settings.inactiveLyricsOpacity}
                                        onChange={(v) => update("inactiveLyricsOpacity", v)}
                                        min={10}
                                        max={100}
                                        step={5}
                                        suffix="%"
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.unlockSection} delay={150}>
                                <SettingItem label={t.hoverUnlock} description={t.hoverUnlockDesc}>
                                    <Toggle
                                        checked={settings.enableHoverUnlock}
                                        onChange={(v) => update("enableHoverUnlock", v)}
                                    />
                                </SettingItem>
                                {settings.enableHoverUnlock && (
                                    <>
                                        <SettingItem label={t.waitTime} description={t.waitTimeDesc} column>
                                            <Slider
                                                value={settings.unlockWaitTime}
                                                onChange={(v) => update("unlockWaitTime", v)}
                                                min={0.5}
                                                max={3}
                                                step={0.1}
                                                suffix={t.seconds}
                                            />
                                        </SettingItem>
                                        <SettingItem label={t.holdTime} description={t.holdTimeDesc} column>
                                            <Slider
                                                value={settings.unlockHoldTime}
                                                onChange={(v) => update("unlockHoldTime", v)}
                                                min={1}
                                                max={5}
                                                step={0.5}
                                                suffix={t.seconds}
                                            />
                                        </SettingItem>
                                    </>
                                )}
                                <SettingItem label={t.autoLock} description={t.autoLockDesc}>
                                    <Toggle checked={settings.enableAutoLock} onChange={(v) => update("enableAutoLock", v)} />
                                </SettingItem>
                                {settings.enableAutoLock && (
                                    <SettingItem label={t.autoLockDelay} column>
                                        <Slider
                                            value={settings.autoLockDelay}
                                            onChange={(v) => update("autoLockDelay", v)}
                                            min={1}
                                            max={10}
                                            step={0.5}
                                            suffix={t.seconds}
                                        />
                                    </SettingItem>
                                )}
                            </SettingSection>

                            <SettingSection title={t.quickActions} delay={200}>
                                <div className="setting-item">
                                    <button
                                        className={`lock-button ${settings.isLocked ? "locked" : "unlocked"}`}
                                        onClick={() => update("isLocked", !settings.isLocked)}
                                    >
                                        <span className="lock-icon">
                                            {settings.isLocked ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                                    <circle cx="12" cy="16" r="1" />
                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                </svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                                    <circle cx="12" cy="16" r="1" />
                                                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                                </svg>
                                            )}
                                        </span>
                                        <span className="lock-label">
                                            {t.lockStatus}: {settings.isLocked ? t.locked : t.unlocked}
                                        </span>
                                        <span className="lock-status-dot" />
                                    </button>
                                </div>
                            </SettingSection>
                        </>
                    )}

                    {/* ========== ADVANCED TAB ========== */}
                    {activeTab === "advanced" && (
                        <>
                            <SettingSection title={t.systemSection} delay={0}>
                                <SettingItem label={t.language}>
                                    <SegmentedControl
                                        options={[
                                            { value: "ko" as const, label: "한국어" },
                                            { value: "en" as const, label: "English" },
                                        ]}
                                        value={settings.language}
                                        onChange={(v) => update("language", v)}
                                    />
                                </SettingItem>
                                <SettingItem label={t.startOnBoot} description={t.startOnBootDesc}>
                                    <Toggle checked={autoStart} onChange={toggleAutoStart} />
                                </SettingItem>
                                <SettingItem label={t.startMinimized} description={t.startMinimizedDesc}>
                                    <Toggle checked={startMinimized} onChange={toggleStartMinimized} />
                                </SettingItem>
                                <div className="setting-item">
                                    <button className="action-btn secondary" onClick={onCheckUpdates}>
                                        <i className="fa-solid fa-arrows-rotate"></i>
                                        {t.checkUpdates}
                                    </button>
                                </div>
                            </SettingSection>

                            <SettingSection title={t.serverSection} delay={50}>
                                <SettingItem label={t.serverPort} description={t.serverPortDesc}>
                                    <div className="port-setting-row">
                                        <input
                                            type="number"
                                            className="settings-input port-input editable"
                                            value={portInput}
                                            min={1024}
                                            max={65535}
                                            onChange={(e) => handlePortInputChange(e.target.value)}
                                        />
                                        {portChanged && (
                                            <button className="port-apply-btn" onClick={handlePortApply}>
                                                {t.portApply}
                                            </button>
                                        )}
                                    </div>
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.themeSection} delay={100}>
                                <SettingItem label={t.exportTheme} description={t.exportThemeDesc}>
                                    <button className="action-btn secondary" onClick={handleExportTheme}>
                                        <i className="fa-solid fa-file-export"></i>
                                        {t.exportTheme}
                                    </button>
                                </SettingItem>
                                <SettingItem label={t.importTheme} description={t.importThemeDesc}>
                                    <button className="action-btn secondary" onClick={handleImportTheme}>
                                        <i className="fa-solid fa-file-import"></i>
                                        {t.importTheme}
                                    </button>
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.customCSSSection} delay={150}>
                                <SettingItem label={t.customCSS} description={t.customCSSDesc} column>
                                    <textarea
                                        className="css-editor"
                                        value={settings.customCSS}
                                        onChange={(e) => update("customCSS", e.target.value)}
                                        placeholder={t.customCSSPlaceholder}
                                        spellCheck={false}
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.dangerZone} delay={200}>
                                <SettingItem label={t.resetSettings} description={t.resetSettingsDesc}>
                                    <button
                                        className="action-btn danger"
                                        onClick={() => {
                                            if (confirm(t.resetConfirm)) {
                                                onSettingsChange({ ...defaultSettings, language: settings.language });
                                                setActivePresetId(null);
                                            }
                                        }}
                                    >
                                        <i className="fa-solid fa-rotate-left"></i>
                                        {t.resetSettings}
                                    </button>
                                </SettingItem>
                                {onResetAll && (
                                    <SettingItem label={t.resetAll} description={t.resetAllDesc}>
                                        <button
                                            className="action-btn danger"
                                            onClick={() => {
                                                if (confirm(t.resetAllConfirm)) {
                                                    onSettingsChange({ ...defaultSettings, language: settings.language });
                                                    setActivePresetId(null);
                                                    onResetAll();
                                                }
                                            }}
                                        >
                                            <i className="fa-solid fa-arrow-rotate-left"></i>
                                            {t.resetAll}
                                        </button>
                                    </SettingItem>
                                )}
                            </SettingSection>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

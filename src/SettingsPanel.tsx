import { useState, useEffect, useRef } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { invoke } from "@tauri-apps/api/core";
import { defaultSettings, OverlaySettings } from "./App";
import "./SettingsPanel.css";

// 탭 타입 정의
type SettingsTab = "help" | "display" | "style" | "layout" | "system";

// 로컬라이제이션
const strings = {
    ko: {
        settingsTitle: "설정",
        // 탭
        tabHelp: "사용법",
        tabDisplay: "표시",
        tabStyle: "스타일",
        tabLayout: "레이아웃",
        tabSystem: "시스템",

        // 사용법 탭 (Help)
        helpWelcome: "ivLyrics 오버레이에 오신 것을 환영합니다!",
        helpWelcomeDesc: "실시간으로 가사를 데스크탑에 표시하는 앱입니다.",

        helpMoveTitle: "🖱️ 위치 이동",
        helpMoveDesc: "오버레이를 이동하려면 먼저 잠금을 해제해야 합니다.",
        helpMoveStep1: "오버레이 위에 마우스를 올리고 2초간 가만히 있기",
        helpMoveStep2: "또는 시스템 트레이 아이콘 → '잠금/해제 토글' 클릭",
        helpMoveStep3: "잠금 해제 후 드래그하여 원하는 위치로 이동",
        helpMoveStep4: "이동 후 자동으로 다시 잠김 (3초 대기)",

        helpResizeTitle: "📐 크기 조절",
        helpResizeDesc: "오버레이 크기를 조절하는 방법입니다.",
        helpResizeStep1: "잠금 해제 상태에서 창 가장자리를 드래그",
        helpResizeStep2: "또는 '레이아웃' 탭에서 '최대 너비' 설정",
        helpResizeStep3: "글꼴 크기는 '스타일' 탭에서 조절 가능",

        helpTrayTitle: "🔧 시스템 트레이",
        helpTrayDesc: "트레이 아이콘으로 빠른 제어가 가능합니다.",
        helpTrayStep1: "작업 표시줄 트레이에서 ivLyrics 아이콘 클릭",
        helpTrayStep2: "잠금/해제, 설정, 위치 초기화 등 사용 가능",

        helpTipsTitle: "💡 유용한 팁",
        helpTip1: "Spotify에서 음악을 재생하면 자동으로 가사가 표시됩니다",
        helpTip2: "일시정지 시 오버레이 숨기기 옵션을 활용하세요",
        helpTip3: "여러 줄 가사를 표시하려면 '표시' 탭에서 설정하세요",
        helpTip4: "Spotify 종료 시 오버레이가 자동으로 숨겨집니다",

        // 표시 탭
        elementsSection: "표시 요소",
        originalLyrics: "원어 가사",
        phoneticLyrics: "발음 가사",
        translationLyrics: "번역 가사",
        trackInfo: "곡 정보",
        albumArt: "앨범아트",

        lyricsDisplaySection: "가사 라인",
        prevLines: "이전 줄",
        nextLines: "이후 줄",
        setGap: "세트 간격",
        fadeInactive: "비활성 줄 흐리게",

        visibilitySection: "표시 옵션",
        hideWhenPaused: "일시정지 시 숨기기",
        showNextTrack: "다음 곡 미리보기",
        nextTrackTime: "미리보기 시간",

        // 스타일 탭
        colorsSection: "색상",
        originalColor: "원어 색상",
        phoneticColor: "발음 색상",
        translationColor: "번역 색상",
        trackInfoColor: "곡 정보 색상",
        backgroundColor: "배경 색상",

        typographySection: "타이포그래피",
        originalSize: "원어 크기",
        phoneticSize: "발음 크기",
        translationSize: "번역 크기",
        fontWeight: "굵기",
        fontFamily: "글꼴",
        systemDefault: "시스템 기본",
        originalFont: "원어 글꼴",
        phoneticFont: "발음 글꼴",
        translationFont: "번역 글꼴",
        originalWeight: "원어 굵기",
        phoneticWeight: "발음 굵기",
        translationWeight: "번역 굵기",

        effectsSection: "효과",
        textShadow: "그림자",
        shadowNone: "없음",
        shadowSoft: "부드럽게",
        shadowHard: "강하게",
        textStroke: "외곽선",
        strokeSize: "외곽선 두께",

        // 레이아웃 탭
        positionSection: "위치",
        textAlign: "정렬",
        alignLeft: "왼쪽",
        alignCenter: "가운데",
        alignRight: "오른쪽",

        sizeSection: "크기",
        maxWidth: "최대 너비",
        noLimit: "제한 없음",
        sectionGap: "섹션 간격",
        lineGap: "줄 간격",
        borderRadius: "모서리 둥글기",

        backgroundSection: "배경",
        bgMode: "배경 모드",
        bgTransparent: "투명",
        bgSolid: "단색",
        bgOpacity: "불투명도",

        albumArtSection: "앨범아트",
        artSize: "크기",
        artRadius: "둥글기",

        // 시스템 탭
        appSection: "앱",
        startOnBoot: "시작시 자동 실행",
        language: "언어",
        checkUpdates: "업데이트 확인",

        unlockSection: "잠금 해제",
        hoverUnlock: "호버로 잠금해제",
        waitTime: "대기 시간",
        holdTime: "홀드 시간",
        autoLock: "자동 잠금",
        autoLockDelay: "자동 잠금 지연",

        advancedSection: "고급",
        serverPort: "서버 포트",
        serverPortDesc: "클라이언트 연결 포트",
        portApply: "적용",
        portApplyDesc: "포트 변경을 적용하려면 앱을 재시작해야 합니다.",
        portApplyConfirm: "새 포트로 앱을 재시작하시겠습니까?",
        portInvalid: "포트는 1024-65535 사이여야 합니다",
        customCSS: "사용자 정의 CSS",
        resetSettings: "설정 초기화",
        resetConfirm: "모든 설정을 초기화하시겠습니까?",

        // 빠른 작업
        quickActionsSection: "빠른 작업",
        lockOverlay: "오버레이 잠금",
        unlockOverlay: "오버레이 잠금해제",
        overlayLocked: "잠김",
        overlayUnlocked: "해제됨",

        // 공통
        seconds: "초",
        px: "px",
        ms: "ms",
    },
    en: {
        settingsTitle: "Settings",
        // Tabs
        tabHelp: "Help",
        tabDisplay: "Display",
        tabStyle: "Style",
        tabLayout: "Layout",
        tabSystem: "System",

        // Help tab
        helpWelcome: "Welcome to ivLyrics Overlay!",
        helpWelcomeDesc: "An app that displays real-time lyrics on your desktop.",

        helpMoveTitle: "🖱️ Moving the Overlay",
        helpMoveDesc: "To move the overlay, you need to unlock it first.",
        helpMoveStep1: "Hover over the overlay and stay still for 2 seconds",
        helpMoveStep2: "Or click system tray icon → 'Lock/Unlock Toggle'",
        helpMoveStep3: "After unlocking, drag to move to desired position",
        helpMoveStep4: "Auto-locks again after 3 seconds of inactivity",

        helpResizeTitle: "📐 Resizing",
        helpResizeDesc: "How to resize the overlay.",
        helpResizeStep1: "When unlocked, drag the window edges",
        helpResizeStep2: "Or set 'Max Width' in Layout tab",
        helpResizeStep3: "Font sizes can be adjusted in Style tab",

        helpTrayTitle: "🔧 System Tray",
        helpTrayDesc: "Quick controls via tray icon.",
        helpTrayStep1: "Click ivLyrics icon in taskbar tray",
        helpTrayStep2: "Lock/unlock, settings, reset position available",

        helpTipsTitle: "💡 Useful Tips",
        helpTip1: "Lyrics appear automatically when playing music in Spotify",
        helpTip2: "Use 'Hide when paused' option for cleaner experience",
        helpTip3: "Show multiple lyrics lines in Display tab",
        helpTip4: "Overlay auto-hides when Spotify is closed",

        // Display tab
        elementsSection: "Elements",
        originalLyrics: "Original Lyrics",
        phoneticLyrics: "Phonetic Lyrics",
        translationLyrics: "Translation",
        trackInfo: "Track Info",
        albumArt: "Album Art",

        lyricsDisplaySection: "Lyrics Lines",
        prevLines: "Previous",
        nextLines: "Next",
        setGap: "Set Gap",
        fadeInactive: "Fade Inactive",

        visibilitySection: "Visibility",
        hideWhenPaused: "Hide when paused",
        showNextTrack: "Next track preview",
        nextTrackTime: "Preview time",

        // Style tab
        colorsSection: "Colors",
        originalColor: "Original",
        phoneticColor: "Phonetic",
        translationColor: "Translation",
        trackInfoColor: "Track Info",
        backgroundColor: "Background",

        typographySection: "Typography",
        originalSize: "Original Size",
        phoneticSize: "Phonetic Size",
        translationSize: "Translation Size",
        fontWeight: "Weight",
        fontFamily: "Font",
        systemDefault: "System Default",
        originalFont: "Original Font",
        phoneticFont: "Phonetic Font",
        translationFont: "Translation Font",
        originalWeight: "Original Weight",
        phoneticWeight: "Phonetic Weight",
        translationWeight: "Translation Weight",

        effectsSection: "Effects",
        textShadow: "Shadow",
        shadowNone: "None",
        shadowSoft: "Soft",
        shadowHard: "Hard",
        textStroke: "Stroke",
        strokeSize: "Stroke Size",

        // Layout tab
        positionSection: "Position",
        textAlign: "Align",
        alignLeft: "Left",
        alignCenter: "Center",
        alignRight: "Right",

        sizeSection: "Size",
        maxWidth: "Max Width",
        noLimit: "No limit",
        sectionGap: "Section Gap",
        lineGap: "Line Gap",
        borderRadius: "Corner Radius",

        backgroundSection: "Background",
        bgMode: "Mode",
        bgTransparent: "Transparent",
        bgSolid: "Solid",
        bgOpacity: "Opacity",

        albumArtSection: "Album Art",
        artSize: "Size",
        artRadius: "Radius",

        // System tab
        appSection: "App",
        startOnBoot: "Start on boot",
        language: "Language",
        checkUpdates: "Check Updates",

        unlockSection: "Unlock",
        hoverUnlock: "Hover to unlock",
        waitTime: "Wait time",
        holdTime: "Hold time",
        autoLock: "Auto lock",
        autoLockDelay: "Lock delay",

        advancedSection: "Advanced",
        serverPort: "Server Port",
        serverPortDesc: "Client connection port",
        portApply: "Apply",
        portApplyDesc: "App restart required to apply port change.",
        portApplyConfirm: "Restart app with new port?",
        portInvalid: "Port must be between 1024-65535",
        customCSS: "Custom CSS",
        resetSettings: "Reset Settings",
        resetConfirm: "Reset all settings?",

        // Quick Actions
        quickActionsSection: "Quick Actions",
        lockOverlay: "Lock Overlay",
        unlockOverlay: "Unlock Overlay",
        overlayLocked: "Locked",
        overlayUnlocked: "Unlocked",

        // Common
        seconds: "sec",
        px: "px",
        ms: "ms",
    },
};

// 토글 컴포넌트
function Toggle({
    checked,
    onChange,
    disabled = false
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            className={`settings-toggle ${checked ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onChange(!checked)}
        >
            <span className="toggle-thumb" />
        </button>
    );
}

// 슬라이더 컴포넌트
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
        <div className={`settings-slider ${isDragging ? 'dragging' : ''}`}>
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
                    background: `linear-gradient(to right, #0078d4 0%, #0078d4 ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`
                }}
            />
            {showValue && (
                <span className={`slider-value ${isDragging ? 'active' : ''}`}>
                    {Number.isInteger(step) ? value : value.toFixed(1)}{suffix}
                </span>
            )}
        </div>
    );
}

// 색상 선택 컴포넌트
function ColorPicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="settings-color-picker">
            <div
                className="color-swatch"
                style={{ backgroundColor: value }}
            />
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

// 폰트 선택 컴포넌트
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

// 굵기 선택 컴포넌트
function WeightSelect({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const weights = [
        { value: "300", label: "Light" },
        { value: "400", label: "Regular" },
        { value: "500", label: "Medium" },
        { value: "600", label: "Semibold" },
        { value: "700", label: "Bold" },
        { value: "800", label: "Extrabold" },
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

// 세그먼트 컨트롤
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
                    className={value === opt.value ? 'active' : ''}
                    onClick={() => onChange(opt.value)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// 아이콘 정렬 버튼
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
                title="Left"
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
                title="Center"
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
                title="Right"
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

// 잠금 상태 버튼
function LockButton({
    isLocked,
    onToggle,
    lockedLabel,
    unlockedLabel,
}: {
    isLocked: boolean;
    onToggle: () => void;
    lockedLabel: string;
    unlockedLabel: string;
}) {
    return (
        <button
            className={`lock-button ${isLocked ? "locked" : "unlocked"}`}
            onClick={onToggle}
        >
            <span className="lock-icon">
                {isLocked ? (
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
                {isLocked ? lockedLabel : unlockedLabel}
            </span>
            <span className="lock-status-dot" />
        </button>
    );
}

// 설정 아이템 래퍼
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
        <div className={`setting-item ${column ? 'column' : ''}`}>
            <div className="setting-label-group">
                <span className="setting-label">{label}</span>
                {description && <span className="setting-desc">{description}</span>}
            </div>
            <div className="setting-control">
                {children}
            </div>
        </div>
    );
}

// 설정 섹션 래퍼
function SettingSection({
    title,
    children,
    delay = 0,
}: {
    title: string;
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <div
            className="setting-section"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="section-title">{title}</div>
            <div className="section-content">
                {children}
            </div>
        </div>
    );
}

// 메인 컴포넌트
export default function SettingsPanelNew({
    settings,
    onSettingsChange,
    onCheckUpdates,
}: {
    settings: OverlaySettings;
    onSettingsChange: (s: OverlaySettings) => void;
    onCheckUpdates: () => void;
}) {
    const t = strings[settings.language || "ko"];
    const [activeTab, setActiveTab] = useState<SettingsTab>("help");
    const [autoStart, setAutoStart] = useState(false);
    const [serverPort, setServerPort] = useState<number>(15000);
    const [portInput, setPortInput] = useState<string>("15000");
    const [portChanged, setPortChanged] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        isEnabled()
            .then(setAutoStart)
            .catch(console.error);

        // Load current server port
        invoke<number>("get_server_port")
            .then((port) => {
                setServerPort(port);
                setPortInput(String(port));
            })
            .catch(console.error);
    }, []);

    // Handle port input change
    const handlePortInputChange = (value: string) => {
        setPortInput(value);
        const num = parseInt(value, 10);
        setPortChanged(!isNaN(num) && num !== serverPort && num >= 1024 && num <= 65535);
    };

    // Apply port change and restart
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

    const update = <K extends keyof OverlaySettings>(
        key: K,
        value: OverlaySettings[K]
    ) => {
        onSettingsChange({ ...settings, [key]: value });
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

    const handleTabChange = (tab: SettingsTab) => {
        setActiveTab(tab);
        // 스크롤 초기화
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    };

    return (
        <div className="settings-panel-new">
            {/* 헤더 */}
            <header className="settings-header-new">
                <h1>{t.settingsTitle}</h1>
            </header>

            {/* 탭 네비게이션 */}
            <nav className="settings-tabs">
                {([
                    { key: "help" as SettingsTab, icon: "fa-circle-question", label: t.tabHelp },
                    { key: "display" as SettingsTab, icon: "fa-eye", label: t.tabDisplay },
                    { key: "style" as SettingsTab, icon: "fa-palette", label: t.tabStyle },
                    { key: "layout" as SettingsTab, icon: "fa-table-columns", label: t.tabLayout },
                    { key: "system" as SettingsTab, icon: "fa-gear", label: t.tabSystem },
                ]).map((tab) => (
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

            {/* 컨텐츠 영역 - 커스텀 스크롤바 적용 */}
            <div className="settings-content-wrapper">
                <div className="settings-content-new" ref={contentRef} key={activeTab}>
                    {/* ========== 사용법 탭 ========== */}
                    {activeTab === "help" && (
                        <>
                            <div className="help-welcome" style={{ animationDelay: '0ms' }}>
                                <div className="help-welcome-icon">🎵</div>
                                <h2>{t.helpWelcome}</h2>
                                <p>{t.helpWelcomeDesc}</p>
                            </div>

                            <div className="help-card" style={{ animationDelay: '50ms' }}>
                                <div className="help-card-header">
                                    <span className="help-card-icon">{t.helpMoveTitle.split(' ')[0]}</span>
                                    <h3>{t.helpMoveTitle.substring(t.helpMoveTitle.indexOf(' ') + 1)}</h3>
                                </div>
                                <p className="help-card-desc">{t.helpMoveDesc}</p>
                                <ol className="help-steps">
                                    <li>{t.helpMoveStep1}</li>
                                    <li>{t.helpMoveStep2}</li>
                                    <li>{t.helpMoveStep3}</li>
                                    <li>{t.helpMoveStep4}</li>
                                </ol>
                            </div>

                            <div className="help-card" style={{ animationDelay: '100ms' }}>
                                <div className="help-card-header">
                                    <span className="help-card-icon">{t.helpResizeTitle.split(' ')[0]}</span>
                                    <h3>{t.helpResizeTitle.substring(t.helpResizeTitle.indexOf(' ') + 1)}</h3>
                                </div>
                                <p className="help-card-desc">{t.helpResizeDesc}</p>
                                <ol className="help-steps">
                                    <li>{t.helpResizeStep1}</li>
                                    <li>{t.helpResizeStep2}</li>
                                    <li>{t.helpResizeStep3}</li>
                                </ol>
                            </div>

                            <div className="help-card" style={{ animationDelay: '150ms' }}>
                                <div className="help-card-header">
                                    <span className="help-card-icon">{t.helpTrayTitle.split(' ')[0]}</span>
                                    <h3>{t.helpTrayTitle.substring(t.helpTrayTitle.indexOf(' ') + 1)}</h3>
                                </div>
                                <p className="help-card-desc">{t.helpTrayDesc}</p>
                                <ol className="help-steps">
                                    <li>{t.helpTrayStep1}</li>
                                    <li>{t.helpTrayStep2}</li>
                                </ol>
                            </div>

                            <div className="help-tips" style={{ animationDelay: '200ms' }}>
                                <div className="help-card-header">
                                    <span className="help-card-icon">{t.helpTipsTitle.split(' ')[0]}</span>
                                    <h3>{t.helpTipsTitle.substring(t.helpTipsTitle.indexOf(' ') + 1)}</h3>
                                </div>
                                <ul className="help-tips-list">
                                    <li>{t.helpTip1}</li>
                                    <li>{t.helpTip2}</li>
                                    <li>{t.helpTip3}</li>
                                    <li>{t.helpTip4}</li>
                                </ul>
                            </div>
                        </>
                    )}

                    {/* ========== 표시 탭 ========== */}
                    {activeTab === "display" && (
                        <>
                            <SettingSection title={t.elementsSection} delay={0}>
                                <SettingItem label={t.originalLyrics}>
                                    <Toggle checked={settings.showOriginal} onChange={(v) => update("showOriginal", v)} />
                                </SettingItem>
                                <SettingItem label={t.phoneticLyrics}>
                                    <Toggle checked={settings.showPhonetic} onChange={(v) => update("showPhonetic", v)} />
                                </SettingItem>
                                <SettingItem label={t.translationLyrics}>
                                    <Toggle checked={settings.showTranslation} onChange={(v) => update("showTranslation", v)} />
                                </SettingItem>
                                <SettingItem label={t.trackInfo}>
                                    <Toggle checked={settings.showTrackInfo} onChange={(v) => update("showTrackInfo", v)} />
                                </SettingItem>
                                <SettingItem label={t.albumArt}>
                                    <Toggle checked={settings.showAlbumArt} onChange={(v) => update("showAlbumArt", v)} />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.lyricsDisplaySection} delay={50}>
                                <SettingItem label={t.prevLines} column>
                                    <Slider
                                        value={settings.lyricsPrevLines}
                                        onChange={(v) => update("lyricsPrevLines", v)}
                                        min={0} max={5} step={1}
                                    />
                                </SettingItem>
                                <SettingItem label={t.nextLines} column>
                                    <Slider
                                        value={settings.lyricsNextLines}
                                        onChange={(v) => update("lyricsNextLines", v)}
                                        min={0} max={5} step={1}
                                    />
                                </SettingItem>
                                <SettingItem label={t.setGap} column>
                                    <Slider
                                        value={settings.lyricsSetGap}
                                        onChange={(v) => update("lyricsSetGap", v)}
                                        min={0} max={32} step={2} suffix="px"
                                    />
                                </SettingItem>
                                <SettingItem label={t.fadeInactive}>
                                    <Toggle checked={settings.fadeNonActiveLyrics} onChange={(v) => update("fadeNonActiveLyrics", v)} />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.visibilitySection} delay={100}>
                                <SettingItem label={t.hideWhenPaused}>
                                    <Toggle checked={settings.hideWhenPaused} onChange={(v) => update("hideWhenPaused", v)} />
                                </SettingItem>
                                <SettingItem label={t.showNextTrack}>
                                    <Toggle checked={settings.showNextTrack} onChange={(v) => update("showNextTrack", v)} />
                                </SettingItem>
                                {settings.showNextTrack && (
                                    <SettingItem label={t.nextTrackTime} column>
                                        <Slider
                                            value={settings.nextTrackSeconds}
                                            onChange={(v) => update("nextTrackSeconds", v)}
                                            min={5} max={30} step={1} suffix={t.seconds}
                                        />
                                    </SettingItem>
                                )}
                            </SettingSection>
                        </>
                    )}

                    {/* ========== 스타일 탭 ========== */}
                    {activeTab === "style" && (
                        <>
                            <SettingSection title={t.colorsSection} delay={0}>
                                <SettingItem label={t.originalColor}>
                                    <ColorPicker value={settings.activeColor} onChange={(v) => update("activeColor", v)} />
                                </SettingItem>
                                <SettingItem label={t.phoneticColor}>
                                    <ColorPicker value={settings.phoneticColor} onChange={(v) => update("phoneticColor", v)} />
                                </SettingItem>
                                <SettingItem label={t.translationColor}>
                                    <ColorPicker value={settings.translationColor} onChange={(v) => update("translationColor", v)} />
                                </SettingItem>
                                <SettingItem label={t.trackInfoColor}>
                                    <ColorPicker value={settings.trackInfoColor} onChange={(v) => update("trackInfoColor", v)} />
                                </SettingItem>
                                <SettingItem label={t.backgroundColor}>
                                    <ColorPicker value={settings.backgroundColor} onChange={(v) => update("backgroundColor", v)} />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.typographySection} delay={50}>
                                <SettingItem label={t.originalSize} column>
                                    <Slider
                                        value={settings.originalFontSize}
                                        onChange={(v) => update("originalFontSize", v)}
                                        min={12} max={48} step={1} suffix="px"
                                    />
                                </SettingItem>
                                <SettingItem label={t.originalFont}>
                                    <FontSelect
                                        value={settings.originalFontFamily}
                                        onChange={(v) => update("originalFontFamily", v)}
                                        placeholder={t.systemDefault}
                                    />
                                </SettingItem>
                                <SettingItem label={t.originalWeight}>
                                    <WeightSelect
                                        value={settings.originalFontWeight}
                                        onChange={(v) => update("originalFontWeight", v)}
                                    />
                                </SettingItem>
                                <SettingItem label={t.phoneticSize} column>
                                    <Slider
                                        value={settings.phoneticFontSize}
                                        onChange={(v) => update("phoneticFontSize", v)}
                                        min={10} max={32} step={1} suffix="px"
                                    />
                                </SettingItem>
                                <SettingItem label={t.phoneticFont}>
                                    <FontSelect
                                        value={settings.phoneticFontFamily}
                                        onChange={(v) => update("phoneticFontFamily", v)}
                                        placeholder={t.systemDefault}
                                    />
                                </SettingItem>
                                <SettingItem label={t.phoneticWeight}>
                                    <WeightSelect
                                        value={settings.phoneticFontWeight}
                                        onChange={(v) => update("phoneticFontWeight", v)}
                                    />
                                </SettingItem>
                                <SettingItem label={t.translationSize} column>
                                    <Slider
                                        value={settings.translationFontSize}
                                        onChange={(v) => update("translationFontSize", v)}
                                        min={10} max={32} step={1} suffix="px"
                                    />
                                </SettingItem>
                                <SettingItem label={t.translationFont}>
                                    <FontSelect
                                        value={settings.translationFontFamily}
                                        onChange={(v) => update("translationFontFamily", v)}
                                        placeholder={t.systemDefault}
                                    />
                                </SettingItem>
                                <SettingItem label={t.translationWeight}>
                                    <WeightSelect
                                        value={settings.translationFontWeight}
                                        onChange={(v) => update("translationFontWeight", v)}
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.effectsSection} delay={100}>
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
                                <SettingItem label={t.textStroke}>
                                    <Toggle checked={settings.textStroke} onChange={(v) => update("textStroke", v)} />
                                </SettingItem>
                                {settings.textStroke && (
                                    <SettingItem label={t.strokeSize} column>
                                        <Slider
                                            value={settings.textStrokeSize}
                                            onChange={(v) => update("textStrokeSize", v)}
                                            min={1} max={5} step={1} suffix="px"
                                        />
                                    </SettingItem>
                                )}
                            </SettingSection>
                        </>
                    )}

                    {/* ========== 레이아웃 탭 ========== */}
                    {activeTab === "layout" && (
                        <>
                            <SettingSection title={t.positionSection} delay={0}>
                                <SettingItem label={t.textAlign}>
                                    <AlignButtons
                                        value={settings.textAlign}
                                        onChange={(v) => update("textAlign", v)}
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.sizeSection} delay={50}>
                                <SettingItem label={t.maxWidth} column>
                                    <Slider
                                        value={settings.overlayMaxWidth}
                                        onChange={(v) => update("overlayMaxWidth", v)}
                                        min={0} max={1000} step={50}
                                        suffix={settings.overlayMaxWidth === 0 ? ` (${t.noLimit})` : "px"}
                                    />
                                </SettingItem>
                                <SettingItem label={t.sectionGap} column>
                                    <Slider
                                        value={settings.sectionGap}
                                        onChange={(v) => update("sectionGap", v)}
                                        min={0} max={32} step={2} suffix="px"
                                    />
                                </SettingItem>
                                <SettingItem label={t.lineGap} column>
                                    <Slider
                                        value={settings.lineGap}
                                        onChange={(v) => update("lineGap", v)}
                                        min={0} max={20} step={1} suffix="px"
                                    />
                                </SettingItem>
                                <SettingItem label={t.borderRadius} column>
                                    <Slider
                                        value={settings.borderRadius}
                                        onChange={(v) => update("borderRadius", v)}
                                        min={0} max={24} step={1} suffix="px"
                                    />
                                </SettingItem>
                            </SettingSection>

                            <SettingSection title={t.backgroundSection} delay={100}>
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
                                        <SettingItem label={t.backgroundColor}>
                                            <ColorPicker
                                                value={settings.solidBackgroundColor}
                                                onChange={(v) => update("solidBackgroundColor", v)}
                                            />
                                        </SettingItem>
                                        <SettingItem label={t.bgOpacity} column>
                                            <Slider
                                                value={settings.solidBackgroundOpacity}
                                                onChange={(v) => update("solidBackgroundOpacity", v)}
                                                min={0} max={100} step={5} suffix="%"
                                            />
                                        </SettingItem>
                                    </>
                                )}
                            </SettingSection>

                            <SettingSection title={t.albumArtSection} delay={150}>
                                <SettingItem label={t.artSize} column>
                                    <Slider
                                        value={settings.albumArtSize}
                                        onChange={(v) => update("albumArtSize", v)}
                                        min={24} max={64} step={2} suffix="px"
                                    />
                                </SettingItem>
                                <SettingItem label={t.artRadius} column>
                                    <Slider
                                        value={settings.albumArtBorderRadius}
                                        onChange={(v) => update("albumArtBorderRadius", v)}
                                        min={0} max={32} step={1} suffix="px"
                                    />
                                </SettingItem>
                            </SettingSection>
                        </>
                    )}

                    {/* ========== 시스템 탭 ========== */}
                    {activeTab === "system" && (
                        <>
                            <SettingSection title={t.appSection} delay={0}>
                                <SettingItem label={t.startOnBoot}>
                                    <Toggle checked={autoStart} onChange={toggleAutoStart} />
                                </SettingItem>
                                <div className="setting-item">
                                    <button className="action-btn" onClick={onCheckUpdates}>
                                        {t.checkUpdates}
                                    </button>
                                </div>
                            </SettingSection>

                            <SettingSection title={t.quickActionsSection} delay={25}>
                                <div className="setting-item">
                                    <LockButton
                                        isLocked={settings.isLocked}
                                        onToggle={() => update("isLocked", !settings.isLocked)}
                                        lockedLabel={t.overlayLocked}
                                        unlockedLabel={t.overlayUnlocked}
                                    />
                                </div>
                            </SettingSection>

                            <SettingSection title={t.unlockSection} delay={50}>
                                <SettingItem label={t.hoverUnlock}>
                                    <Toggle checked={settings.enableHoverUnlock} onChange={(v) => update("enableHoverUnlock", v)} />
                                </SettingItem>
                                {settings.enableHoverUnlock && (
                                    <>
                                        <SettingItem label={t.waitTime} column>
                                            <Slider
                                                value={settings.unlockWaitTime}
                                                onChange={(v) => update("unlockWaitTime", v)}
                                                min={0.5} max={3} step={0.1} suffix={t.seconds}
                                            />
                                        </SettingItem>
                                        <SettingItem label={t.holdTime} column>
                                            <Slider
                                                value={settings.unlockHoldTime}
                                                onChange={(v) => update("unlockHoldTime", v)}
                                                min={1} max={5} step={0.5} suffix={t.seconds}
                                            />
                                        </SettingItem>
                                    </>
                                )}
                                <SettingItem label={t.autoLock}>
                                    <Toggle checked={settings.enableAutoLock} onChange={(v) => update("enableAutoLock", v)} />
                                </SettingItem>
                                {settings.enableAutoLock && (
                                    <SettingItem label={t.autoLockDelay} column>
                                        <Slider
                                            value={settings.autoLockDelay}
                                            onChange={(v) => update("autoLockDelay", v)}
                                            min={1} max={10} step={0.5} suffix={t.seconds}
                                        />
                                    </SettingItem>
                                )}
                            </SettingSection>

                            <SettingSection title={t.advancedSection} delay={100}>
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
                                            <button
                                                className="port-apply-btn"
                                                onClick={handlePortApply}
                                            >
                                                {t.portApply}
                                            </button>
                                        )}
                                    </div>
                                </SettingItem>
                                <SettingItem label={t.customCSS} column>
                                    <textarea
                                        className="css-editor"
                                        value={settings.customCSS}
                                        onChange={(e) => update("customCSS", e.target.value)}
                                        placeholder="/* Your CSS here */"
                                        spellCheck={false}
                                    />
                                </SettingItem>
                                <div className="setting-item">
                                    <button
                                        className="action-btn danger"
                                        onClick={() => {
                                            if (confirm(t.resetConfirm)) {
                                                onSettingsChange({ ...defaultSettings, language: settings.language });
                                            }
                                        }}
                                    >
                                        {t.resetSettings}
                                    </button>
                                </div>
                            </SettingSection>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

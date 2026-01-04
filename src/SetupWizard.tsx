import { useState, useEffect } from "react";
import { OverlaySettings, defaultSettings } from "./App";
import { presets, PresetInfo, applyPreset } from "./presets";
import "./SetupWizard.css";

interface SetupWizardProps {
    onComplete: (settings: OverlaySettings) => void;
    currentSettings: OverlaySettings;
}

// Localization
const strings = {
    ko: {
        // Step 1 - Welcome
        welcomeTitle: "ivLyrics Overlay",
        welcomeSubtitle: "에 오신 것을 환영합니다",
        welcomeDesc: "몇 가지 간단한 설정으로 시작해보세요",
        getStarted: "시작하기",

        // Step 2 - Language
        languageTitle: "언어 선택",
        languageDesc: "앱에서 사용할 언어를 선택하세요",

        // Step 3 - Display Elements
        displayTitle: "표시 요소",
        displayDesc: "오버레이에 표시할 요소를 선택하세요",
        originalLyrics: "원어 가사",
        originalLyricsDesc: "원본 언어로 된 가사",
        phoneticLyrics: "발음 가사",
        phoneticLyricsDesc: "로마자 또는 발음 표기",
        translationLyrics: "번역 가사",
        translationLyricsDesc: "번역된 가사",
        trackInfo: "트랙 정보",
        trackInfoDesc: "아티스트명과 곡 제목",

        // Step 4 - Style
        styleTitle: "스타일 선택",
        styleDesc: "원하는 스타일 프리셋을 선택하세요",

        // Step 5 - Complete
        completeTitle: "설정 완료",
        completeDesc: "모든 설정이 완료되었습니다",
        completeNote: "설정은 언제든지 변경할 수 있습니다",
        startUsing: "사용 시작",

        // Navigation
        back: "이전",
        next: "다음",
        skip: "건너뛰기",
    },
    en: {
        // Step 1 - Welcome
        welcomeTitle: "ivLyrics Overlay",
        welcomeSubtitle: "Welcome to",
        welcomeDesc: "Let's get started with a few simple settings",
        getStarted: "Get Started",

        // Step 2 - Language
        languageTitle: "Select Language",
        languageDesc: "Choose your preferred language",

        // Step 3 - Display Elements
        displayTitle: "Display Elements",
        displayDesc: "Choose what to show on your overlay",
        originalLyrics: "Original Lyrics",
        originalLyricsDesc: "Lyrics in original language",
        phoneticLyrics: "Phonetic Lyrics",
        phoneticLyricsDesc: "Romanization or pronunciation",
        translationLyrics: "Translation",
        translationLyricsDesc: "Translated lyrics",
        trackInfo: "Track Info",
        trackInfoDesc: "Artist name and song title",

        // Step 4 - Style
        styleTitle: "Choose Style",
        styleDesc: "Select your preferred style preset",

        // Step 5 - Complete
        completeTitle: "Setup Complete",
        completeDesc: "You're all set!",
        completeNote: "You can change these settings anytime",
        startUsing: "Start Using",

        // Navigation
        back: "Back",
        next: "Next",
        skip: "Skip",
    },
};

// Constants
const TOTAL_STEPS = 5;
const ANIMATION_DURATION = 300;
const FADE_IN_DELAY = 100;

// Recommended presets for setup wizard
const recommendedPresetIds = ["spotify-native", "clean-text", "karaoke-box", "glassmorphism"];

// Default preset to apply if none selected
const DEFAULT_PRESET_ID = "spotify-native";

export default function SetupWizard({ onComplete, currentSettings }: SetupWizardProps) {
    const [step, setStep] = useState(0);
    const [settings, setSettings] = useState<OverlaySettings>(currentSettings);
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const t = strings[settings.language || "ko"];

    // Get recommended presets
    const recommendedPresets = presets.filter((p) => recommendedPresetIds.includes(p.id));

    // Auto-select default preset when entering style step if none selected
    useEffect(() => {
        if (step === 3 && selectedPreset === null) {
            const defaultPreset = recommendedPresets.find((p) => p.id === DEFAULT_PRESET_ID);
            if (defaultPreset) {
                setSelectedPreset(defaultPreset.id);
                setSettings((prev) => applyPreset(prev, defaultPreset));
            }
        }
    }, [step, selectedPreset, recommendedPresets]);

    const handleStepChange = (direction: 1 | -1) => {
        if (isAnimating) return;
        setIsAnimating(true);
        setTimeout(() => {
            setStep((prev) => prev + direction);
            setIsAnimating(false);
        }, ANIMATION_DURATION);
    };

    const handleNext = () => handleStepChange(1);
    const handleBack = () => handleStepChange(-1);

    const handleComplete = () => {
        onComplete(settings);
    };

    const updateSetting = <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleSelectPreset = (preset: PresetInfo) => {
        setSelectedPreset(preset.id);
        setSettings((prev) => applyPreset(prev, preset));
    };

    const renderStep = () => {
        switch (step) {
            case 0:
                return <WelcomeStep t={t} onNext={handleNext} />;
            case 1:
                return (
                    <LanguageStep
                        t={t}
                        language={settings.language}
                        onSelect={(lang) => updateSetting("language", lang)}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                );
            case 2:
                return (
                    <DisplayStep
                        t={t}
                        settings={settings}
                        onUpdate={updateSetting}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                );
            case 3:
                return (
                    <StyleStep
                        t={t}
                        presets={recommendedPresets}
                        selectedPreset={selectedPreset}
                        onSelect={handleSelectPreset}
                        language={settings.language}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                );
            case 4:
                return <CompleteStep t={t} onComplete={handleComplete} onBack={handleBack} />;
            default:
                return null;
        }
    };

    return (
        <div className="setup-wizard">
            <div className="setup-wizard-bg">
                <div className="bg-gradient-1" />
                <div className="bg-gradient-2" />
                <div className="bg-gradient-3" />
            </div>

            {/* Progress Indicator */}
            <div className="setup-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                    <div
                        key={i}
                        className={`progress-dot ${step === i ? "active" : ""} ${step > i ? "completed" : ""}`}
                        aria-label={`Step ${i + 1}${step === i ? " (current)" : step > i ? " (completed)" : ""}`}
                    />
                ))}
            </div>

            <div className={`setup-content ${isAnimating ? "animating" : ""}`}>{renderStep()}</div>
        </div>
    );
}

// ============================================
// Step Components
// ============================================

function WelcomeStep({ t, onNext }: { t: typeof strings.ko; onNext: () => void }) {
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        let mounted = true;
        const timer = setTimeout(() => {
            if (mounted) setShowContent(true);
        }, FADE_IN_DELAY);
        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, []);

    return (
        <div className={`setup-step welcome-step ${showContent ? "visible" : ""}`}>
            <div className="welcome-animation">
                {/* Animated Logo SVG */}
                <svg className="welcome-logo" viewBox="0 0 120 120" fill="none">
                    <defs>
                        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0078d4" />
                            <stop offset="100%" stopColor="#00b4d8" />
                        </linearGradient>
                        <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0078d4" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#00b4d8" stopOpacity="0.1" />
                        </linearGradient>
                    </defs>

                    {/* Pulse rings */}
                    <circle className="pulse-ring pulse-1" cx="60" cy="60" r="50" stroke="url(#pulseGradient)" strokeWidth="2" fill="none" />
                    <circle className="pulse-ring pulse-2" cx="60" cy="60" r="45" stroke="url(#pulseGradient)" strokeWidth="1.5" fill="none" />
                    <circle className="pulse-ring pulse-3" cx="60" cy="60" r="40" stroke="url(#pulseGradient)" strokeWidth="1" fill="none" />

                    {/* Main circle */}
                    <circle className="main-circle" cx="60" cy="60" r="35" fill="url(#logoGradient)" />

                    {/* Music note icon */}
                    <g className="music-icon" transform="translate(40, 35)">
                        <path
                            className="note-path"
                            d="M32 8V38C32 42.4183 28.4183 46 24 46C19.5817 46 16 42.4183 16 38C16 33.5817 19.5817 30 24 30C25.3807 30 26.6849 30.3303 27.8397 30.9125L28 30.9971V12L12 16V42C12 46.4183 8.41828 50 4 50C-0.418278 50 -4 46.4183 -4 42C-4 37.5817 -0.418278 34 4 34C5.38071 34 6.68493 34.3303 7.83975 34.9125L8 34.9971V8L32 0V8Z"
                            fill="white"
                            fillOpacity="0.95"
                        />
                    </g>

                    {/* Sparkles */}
                    <circle className="sparkle sparkle-1" cx="95" cy="30" r="3" fill="#fff" />
                    <circle className="sparkle sparkle-2" cx="25" cy="85" r="2" fill="#fff" />
                    <circle className="sparkle sparkle-3" cx="100" cy="75" r="2.5" fill="#fff" />
                </svg>
            </div>

            <div className="welcome-text">
                <span className="welcome-subtitle">{t.welcomeSubtitle}</span>
                <h1 className="welcome-title">{t.welcomeTitle}</h1>
                <p className="welcome-desc">{t.welcomeDesc}</p>
            </div>

            <button className="setup-btn primary" onClick={onNext}>
                <span>{t.getStarted}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
            </button>
        </div>
    );
}

function LanguageStep({
    t,
    language,
    onSelect,
    onNext,
    onBack,
}: {
    t: typeof strings.ko;
    language: "ko" | "en";
    onSelect: (lang: "ko" | "en") => void;
    onNext: () => void;
    onBack: () => void;
}) {
    return (
        <div className="setup-step language-step">
            <div className="step-header">
                <div className="step-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                </div>
                <h2 className="step-title">{t.languageTitle}</h2>
                <p className="step-desc">{t.languageDesc}</p>
            </div>

            <div className="language-options">
                <button
                    className={`language-option ${language === "ko" ? "selected" : ""}`}
                    onClick={() => onSelect("ko")}
                >
                    <span className="lang-flag">KO</span>
                    <span className="lang-name">한국어</span>
                    {language === "ko" && <CheckIcon />}
                </button>
                <button
                    className={`language-option ${language === "en" ? "selected" : ""}`}
                    onClick={() => onSelect("en")}
                >
                    <span className="lang-flag">EN</span>
                    <span className="lang-name">English</span>
                    {language === "en" && <CheckIcon />}
                </button>
            </div>

            <div className="step-actions">
                <button className="setup-btn secondary" onClick={onBack}>
                    {t.back}
                </button>
                <button className="setup-btn primary" onClick={onNext}>
                    {t.next}
                </button>
            </div>
        </div>
    );
}

function DisplayStep({
    t,
    settings,
    onUpdate,
    onNext,
    onBack,
}: {
    t: typeof strings.ko;
    settings: OverlaySettings;
    onUpdate: <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const elements = [
        {
            key: "showOriginal" as const,
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h16M4 12h16M4 17h10" />
                </svg>
            ),
            title: t.originalLyrics,
            desc: t.originalLyricsDesc,
        },
        {
            key: "showPhonetic" as const,
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 8h14M5 12h14M5 16h6" />
                    <circle cx="17" cy="16" r="3" />
                </svg>
            ),
            title: t.phoneticLyrics,
            desc: t.phoneticLyricsDesc,
        },
        {
            key: "showTranslation" as const,
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                </svg>
            ),
            title: t.translationLyrics,
            desc: t.translationLyricsDesc,
        },
        {
            key: "showTrackInfo" as const,
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M16 8v5a3 3 0 0 0 6 0V8" />
                    <path d="M12 3v1M12 20v1M3 12h1M20 12h1" />
                </svg>
            ),
            title: t.trackInfo,
            desc: t.trackInfoDesc,
        },
    ];

    return (
        <div className="setup-step display-step">
            <div className="step-header">
                <div className="step-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M9 21V9" />
                    </svg>
                </div>
                <h2 className="step-title">{t.displayTitle}</h2>
                <p className="step-desc">{t.displayDesc}</p>
            </div>

            <div className="display-options">
                {elements.map((el) => (
                    <button
                        key={el.key}
                        className={`display-option ${settings[el.key] ? "selected" : ""}`}
                        onClick={() => onUpdate(el.key, !settings[el.key])}
                    >
                        <div className="option-icon">{el.icon}</div>
                        <div className="option-content">
                            <span className="option-title">{el.title}</span>
                            <span className="option-desc">{el.desc}</span>
                        </div>
                        <div className={`option-checkbox ${settings[el.key] ? "checked" : ""}`}>
                            {settings[el.key] && <CheckIcon />}
                        </div>
                    </button>
                ))}
            </div>

            <div className="step-actions">
                <button className="setup-btn secondary" onClick={onBack}>
                    {t.back}
                </button>
                <button className="setup-btn primary" onClick={onNext}>
                    {t.next}
                </button>
            </div>
        </div>
    );
}

function StyleStep({
    t,
    presets,
    selectedPreset,
    onSelect,
    language,
    onNext,
    onBack,
}: {
    t: typeof strings.ko;
    presets: PresetInfo[];
    selectedPreset: string | null;
    onSelect: (preset: PresetInfo) => void;
    language: "ko" | "en";
    onNext: () => void;
    onBack: () => void;
}) {
    return (
        <div className="setup-step style-step">
            <div className="step-header">
                <div className="step-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                </div>
                <h2 className="step-title">{t.styleTitle}</h2>
                <p className="step-desc">{t.styleDesc}</p>
            </div>

            <div className="style-options">
                {presets.map((preset) => (
                    <button
                        key={preset.id}
                        className={`style-option ${selectedPreset === preset.id ? "selected" : ""}`}
                        onClick={() => onSelect(preset)}
                    >
                        <div className="style-preview">
                            <PresetPreview preset={preset} />
                        </div>
                        <div className="style-info">
                            <span className="style-name">{preset.name[language]}</span>
                            <span className="style-desc">{preset.description[language]}</span>
                        </div>
                        {selectedPreset === preset.id && (
                            <div className="style-check">
                                <CheckIcon />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="step-actions">
                <button className="setup-btn secondary" onClick={onBack}>
                    {t.back}
                </button>
                <button className="setup-btn primary" onClick={onNext}>
                    {t.next}
                </button>
            </div>
        </div>
    );
}

function CompleteStep({
    t,
    onComplete,
    onBack,
}: {
    t: typeof strings.ko;
    onComplete: () => void;
    onBack: () => void;
}) {
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        let mounted = true;
        const timer = setTimeout(() => {
            if (mounted) setShowContent(true);
        }, FADE_IN_DELAY);
        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, []);

    return (
        <div className={`setup-step complete-step ${showContent ? "visible" : ""}`}>
            <div className="complete-animation">
                <svg className="complete-icon" viewBox="0 0 120 120" fill="none">
                    <defs>
                        <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#34c759" />
                            <stop offset="100%" stopColor="#30d158" />
                        </linearGradient>
                    </defs>

                    {/* Success circle */}
                    <circle className="success-circle" cx="60" cy="60" r="45" fill="url(#successGradient)" />

                    {/* Checkmark */}
                    <path
                        className="checkmark"
                        d="M35 60L52 77L85 44"
                        stroke="white"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                    />

                    {/* Confetti particles */}
                    <circle className="confetti c1" cx="20" cy="30" r="4" fill="#ff6b6b" />
                    <circle className="confetti c2" cx="100" cy="25" r="3" fill="#ffd93d" />
                    <circle className="confetti c3" cx="95" cy="90" r="4" fill="#6bcb77" />
                    <circle className="confetti c4" cx="25" cy="85" r="3" fill="#4d96ff" />
                    <rect className="confetti c5" x="50" y="15" width="6" height="6" rx="1" fill="#ff9f43" transform="rotate(45 53 18)" />
                    <rect className="confetti c6" x="85" y="60" width="5" height="5" rx="1" fill="#a55eea" transform="rotate(30 87.5 62.5)" />
                </svg>
            </div>

            <div className="complete-text">
                <h2 className="complete-title">{t.completeTitle}</h2>
                <p className="complete-desc">{t.completeDesc}</p>
                <p className="complete-note">{t.completeNote}</p>
            </div>

            <div className="step-actions">
                <button className="setup-btn secondary" onClick={onBack}>
                    {t.back}
                </button>
                <button className="setup-btn primary success" onClick={onComplete}>
                    <span>{t.startUsing}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

// ============================================
// Helper Components
// ============================================

function CheckIcon() {
    return (
        <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function PresetPreview({ preset }: { preset: PresetInfo }) {
    const {
        backgroundColor = "#000000",
        activeColor = "#1db954",
        translationColor = "#aaaaaa"
    } = preset.settings;

    return (
        <svg viewBox="0 0 80 50" fill="none">
            <rect width="80" height="50" rx="6" fill={backgroundColor} fillOpacity="0.8" />
            <rect x="10" y="12" width="60" height="10" rx="3" fill={activeColor} fillOpacity="0.9" />
            <rect x="15" y="28" width="50" height="8" rx="2" fill={translationColor} fillOpacity="0.7" />
        </svg>
    );
}

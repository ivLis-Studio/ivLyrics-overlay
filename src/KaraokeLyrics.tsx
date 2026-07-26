import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { LyricLine, LyricSyllable, LyricVocalPart } from "./types";

type KaraokeStyle = CSSProperties & Record<string, string | number | undefined>;

interface TimedChar {
    char: string;
    startTime: number;
    endTime: number;
}

interface KaraokeVocalRow {
    key: string;
    role: "lead" | "background";
    speaker: string;
    speakerColor: string;
    speakerFallback: string;
    kind: string;
    phonetic: string;
    translation: string;
    text: string;
    syllables: LyricSyllable[];
}

interface KaraokeLyricsProps {
    line: LyricLine;
    position: number;
    isActive: boolean;
    showPhonetic: boolean;
    showTranslation: boolean;
    phonetic?: string | null;
    translation?: string | null;
}

const PRE_SPACE_MIN_DURATION_MS = 45;
const PRE_SPACE_NEXT_CHAR_RATIO = 0.7;
const PRE_SPACE_MAX_DURATION_MS = 120;
const FILL_STEPS = 25;
const BOUNCE_MAX_CHAR_DISTANCE = 3;
const NO_WORD_WRAP_SCRIPT_REGEX = /[\u3040-\u30ff\uff66-\uff9f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u0e00-\u0e7f\u0e80-\u0eff\u1780-\u17ff\u1000-\u109f]/u;
const RTL_STRONG_CHAR_REGEX = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/u;
const LTR_STRONG_CHAR_REGEX = /[A-Za-z\u00C0-\u02AF\u0370-\u052F\u1E00-\u1EFF]/u;
const JOINING_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFC]/u;
const FILL_CORRECTION_POINTS = [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.25 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.75 },
    { x: 1, y: 1 },
];

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const easeOutCubic = (value: number) => 1 - Math.pow(1 - clamp(value), 3);

const applyFillCorrectionCurve = (value: number) => {
    const normalizedValue = clamp(value);
    if (normalizedValue <= 0 || normalizedValue >= 1) return normalizedValue;

    let segmentIndex = 0;
    for (let index = 0; index < FILL_CORRECTION_POINTS.length - 1; index++) {
        if (
            normalizedValue >= FILL_CORRECTION_POINTS[index].x
            && normalizedValue <= FILL_CORRECTION_POINTS[index + 1].x
        ) {
            segmentIndex = index;
            break;
        }
    }

    const p0 = FILL_CORRECTION_POINTS[Math.max(0, segmentIndex - 1)];
    const p1 = FILL_CORRECTION_POINTS[segmentIndex];
    const p2 = FILL_CORRECTION_POINTS[segmentIndex + 1];
    const p3 = FILL_CORRECTION_POINTS[Math.min(FILL_CORRECTION_POINTS.length - 1, segmentIndex + 2)];
    const localProgress = (normalizedValue - p1.x) / Math.max(0.0001, p2.x - p1.x);
    const controlY = (p1.y + p2.y) / 2 + (p2.y - p0.y + p3.y - p1.y) / 8;
    const oneMinusProgress = 1 - localProgress;

    return clamp(
        oneMinusProgress * oneMinusProgress * p1.y
        + 2 * oneMinusProgress * localProgress * controlY
        + localProgress * localProgress * p2.y
    );
};

const splitRenderableSyllables = (syllables?: LyricSyllable[]) => {
    if (!Array.isArray(syllables)) return [];

    return syllables.flatMap((syllable) => {
        const text = syllable?.text || "";
        if (!text || !/\s/u.test(text) || text.trim() === "") return syllable;

        return text
            .split(/(\s+)/)
            .filter(Boolean)
            .map((part) => ({ ...syllable, text: part }));
    });
};

const getValidSyllables = (syllables?: LyricSyllable[]) => (
    Array.isArray(syllables)
        ? syllables.filter((syllable) => (
            Number.isFinite(syllable?.startTime)
            && typeof syllable?.text === "string"
            && syllable.text.length > 0
        ))
        : []
);

const buildTimedChars = (
    syllables: LyricSyllable[],
    fallbackText: string,
    lineStart: number,
    lineEnd?: number
) => {
    const timedChars: TimedChar[] = [];

    syllables.forEach((syllable) => {
        const chars = Array.from(syllable.text || "");
        if (chars.length === 0) return;

        const startTime = Number.isFinite(syllable.startTime) ? syllable.startTime : lineStart;
        const endTime = Number.isFinite(syllable.endTime)
            ? Number(syllable.endTime)
            : startTime + 500;
        const charDuration = Math.max(1, (endTime - startTime) / chars.length);
        chars.forEach((char, index) => {
            const charStart = startTime + index * charDuration;
            timedChars.push({
                char,
                startTime: charStart,
                endTime: charStart + charDuration,
            });
        });
    });

    if (timedChars.length > 0) return timedChars;

    const fallbackChars = Array.from(fallbackText);
    const resolvedEnd = Number.isFinite(lineEnd) ? Number(lineEnd) : lineStart + 500;
    const charDuration = Math.max(1, (resolvedEnd - lineStart) / Math.max(1, fallbackChars.length));
    return fallbackChars.map((char, index) => ({
        char,
        startTime: lineStart + index * charDuration,
        endTime: lineStart + (index + 1) * charDuration,
    }));
};

const compensateWhitespaceTiming = (timedChars: TimedChar[]) => (
    timedChars.map((charInfo, index) => {
        const nextCharInfo = timedChars[index + 1];
        if (!nextCharInfo) return charInfo;

        const duration = Math.max(0, charInfo.endTime - charInfo.startTime);
        const nextDuration = Math.max(0, nextCharInfo.endTime - nextCharInfo.startTime);
        const isPreWhitespaceChar = charInfo.char && !/\s/u.test(charInfo.char) && /\s/u.test(nextCharInfo.char);
        if (!isPreWhitespaceChar || duration >= PRE_SPACE_MIN_DURATION_MS) return charInfo;

        const compensatedDuration = Math.max(
            PRE_SPACE_MIN_DURATION_MS,
            Math.min(PRE_SPACE_MAX_DURATION_MS, nextDuration * PRE_SPACE_NEXT_CHAR_RATIO)
        );
        return { ...charInfo, endTime: charInfo.startTime + compensatedDuration };
    })
);

const getActiveCharIndex = (timedChars: TimedChar[], position: number) => {
    let activeIndex = -1;
    let lastPassedIndex = -1;
    let lastPassedEnd = 0;
    let lastPassedDuration = 100;

    timedChars.forEach((charInfo, index) => {
        if (position >= charInfo.startTime && position < charInfo.endTime) {
            activeIndex = index;
        }
        if (position >= charInfo.endTime && charInfo.endTime > lastPassedEnd) {
            lastPassedEnd = charInfo.endTime;
            lastPassedIndex = index;
            lastPassedDuration = Math.max(1, charInfo.endTime - charInfo.startTime);
        }
    });

    if (activeIndex < 0 && lastPassedIndex >= 0) {
        const timeDiff = position - lastPassedEnd;
        const simulateDuration = Math.max(40, lastPassedDuration * 0.01);
        if (timeDiff < 2000) {
            activeIndex = lastPassedIndex + 1 + Math.floor(timeDiff / simulateDuration);
        }
    }

    return activeIndex;
};

const getCharFill = (position: number, isActive: boolean, startTime: number, endTime: number) => {
    if (!isActive || position <= startTime) return 0;
    if (position >= endTime) return 1;

    const raw = clamp((position - startTime) / Math.max(1, endTime - startTime));
    return Math.round(applyFillCorrectionCurve(raw) * FILL_STEPS) / FILL_STEPS;
};

const getBounce = (
    position: number,
    isActive: boolean,
    startTime: number,
    endTime: number,
    attenuation: number
) => {
    if (!isActive || attenuation <= 0) return { offsetY: 0, scale: 1, active: false };

    const duration = Math.max(1, endTime - startTime);
    const preLeadDuration = Math.max(70, Math.min(160, duration * 0.45));
    const riseDuration = Math.max(180, Math.min(280, duration * 0.9));
    const releaseDuration = Math.max(420, Math.min(820, duration * 2.4));
    const totalWindow = riseDuration + releaseDuration;
    const elapsed = position - startTime;
    if (elapsed < -preLeadDuration || elapsed > totalWindow) {
        return { offsetY: 0, scale: 1, active: false };
    }

    let waveStrength: number;
    if (elapsed < 0) {
        waveStrength = easeOutCubic((elapsed + preLeadDuration) / preLeadDuration) * 0.22;
    } else if (elapsed <= riseDuration) {
        waveStrength = 0.22 + easeOutCubic(elapsed / riseDuration) * 0.78;
    } else {
        const fallProgress = Math.min(1, (elapsed - riseDuration) / Math.max(1, totalWindow - riseDuration));
        waveStrength = Math.pow(1 - fallProgress, 1.28);
    }

    if (waveStrength < 0.025) return { offsetY: 0, scale: 1, active: false };
    waveStrength *= clamp(attenuation);
    const offsetY = Math.round(-6 * waveStrength * 2) / 2;
    const scale = Math.round((1 + 0.055 * waveStrength) * 100) / 100;
    return { offsetY, scale, active: offsetY !== 0 || scale !== 1 };
};

const getBounceAttenuation = (charIndex: number, activeCharIndex: number) => {
    if (activeCharIndex < 0) return 1;
    const distance = Math.abs(charIndex - activeCharIndex);
    if (distance > BOUNCE_MAX_CHAR_DISTANCE) return 0;
    return Math.max(0.22, 1 - distance * 0.23);
};

const getTextDirection = (text: string) => {
    let rtlCount = 0;
    let ltrCount = 0;
    Array.from(text).forEach((char) => {
        if (RTL_STRONG_CHAR_REGEX.test(char)) rtlCount++;
        else if (LTR_STRONG_CHAR_REGEX.test(char)) ltrCount++;
    });
    return rtlCount > ltrCount ? "rtl" : "ltr";
};

const shouldUseTextRun = (text: string) => (
    RTL_STRONG_CHAR_REGEX.test(text) || JOINING_SCRIPT_REGEX.test(text)
);

const shouldWrapByWord = (text: string) => {
    if (!/\S\s+\S/u.test(text)) return false;
    let nonWhitespaceCount = 0;
    let noWrapScriptCount = 0;
    Array.from(text).forEach((char) => {
        if (!/\S/u.test(char)) return;
        nonWhitespaceCount++;
        if (NO_WORD_WRAP_SCRIPT_REGEX.test(char)) noWrapScriptCount++;
    });
    return nonWhitespaceCount === 0 || noWrapScriptCount / nonWhitespaceCount < 0.45;
};

const wrapByWord = (timedChars: TimedChar[], charElements: ReactNode[]) => {
    const wordElements: ReactNode[] = [];
    let currentWord: ReactNode[] = [];
    let currentWordStart = 0;

    timedChars.forEach((charInfo, index) => {
        const element = charElements[index];
        const isWhitespace = /\s/u.test(charInfo.char);
        if (!isWhitespace && currentWord.length === 0) currentWordStart = index;

        if (isWhitespace) {
            if (currentWord.length > 0) {
                currentWord.push(element);
                wordElements.push(
                    <span className="karaoke-word" key={`word-${currentWordStart}`}>{currentWord}</span>
                );
                currentWord = [];
            } else {
                wordElements.push(element);
            }
            return;
        }
        currentWord.push(element);
    });

    if (currentWord.length > 0) {
        wordElements.push(
            <span className="karaoke-word" key={`word-${currentWordStart}`}>{currentWord}</span>
        );
    }
    return wordElements;
};

const renderTextRun = (
    timedChars: TimedChar[],
    position: number,
    isActive: boolean,
    isComplete: boolean,
    textDirection: "ltr" | "rtl",
    activeCharIndex: number
) => {
    const segments: Array<{
        type: "space" | "text";
        startIndex: number;
        text: string;
        startTime: number;
        endTime: number;
    }> = [];

    timedChars.forEach((charInfo, index) => {
        const type = /\s/u.test(charInfo.char) ? "space" : "text";
        const previous = segments[segments.length - 1];
        if (!previous || previous.type !== type) {
            segments.push({
                type,
                startIndex: index,
                text: charInfo.char,
                startTime: charInfo.startTime,
                endTime: charInfo.endTime,
            });
        } else {
            previous.text += charInfo.char;
            previous.endTime = Math.max(previous.endTime, charInfo.endTime);
        }
    });

    const renderSegments = textDirection === "rtl" ? [...segments].reverse() : segments;
    return renderSegments.map((segment) => {
        if (segment.type === "space") {
            return <span className="karaoke-text-run-space" key={`space-${segment.startIndex}`}>{segment.text}</span>;
        }

        let fillValue = 0;
        if (isComplete) {
            fillValue = 100;
        } else if (isActive && position > segment.startTime) {
            fillValue = position >= segment.endTime
                ? 100
                : Math.round(
                    applyFillCorrectionCurve(
                        (position - segment.startTime) / Math.max(1, segment.endTime - segment.startTime)
                    ) * 25
                ) * 4;
        }
        const state = fillValue <= 0 ? "pending" : fillValue >= 100 ? "done" : "active";
        const centerIndex = segment.startIndex + Math.max(0, segment.text.length - 1) / 2;
        const bounce = getBounce(
            position,
            isActive,
            segment.startTime,
            segment.endTime,
            getBounceAttenuation(centerIndex, activeCharIndex)
        );
        const style: KaraokeStyle = {};
        if (state === "active") {
            const softEdge = 10;
            style["--karaoke-gradient-direction"] = getTextDirection(segment.text) === "rtl" ? "to left" : "to right";
            style["--karaoke-char-fill"] = `${fillValue}%`;
            style["--karaoke-char-fill-soft-start"] = `${Math.max(0, fillValue - softEdge)}%`;
            style["--karaoke-char-fill-soft-end"] = `${Math.min(100, fillValue + softEdge)}%`;
        }
        if (bounce.active) {
            style["--karaoke-bounce-y"] = `${bounce.offsetY}px`;
            style["--karaoke-bounce-scale"] = bounce.scale;
        }

        return (
            <span
                className={`karaoke-text-run-segment karaoke-text-run-segment--${state} ${bounce.active ? "is-bouncing" : ""}`}
                dir={getTextDirection(segment.text)}
                style={style}
                key={`segment-${segment.startIndex}`}
            >
                {segment.text}
            </span>
        );
    });
};

const TimedKaraokeLine = ({
    syllables,
    fallbackText,
    lineStart,
    lineEnd,
    position,
    isActive,
}: {
    syllables: LyricSyllable[];
    fallbackText: string;
    lineStart: number;
    lineEnd?: number;
    position: number;
    isActive: boolean;
}) => {
    const timedChars = useMemo(
        () => compensateWhitespaceTiming(
            buildTimedChars(syllables, fallbackText, lineStart, lineEnd)
        ),
        [syllables, fallbackText, lineStart, lineEnd]
    );
    const endTime = useMemo(
        () => timedChars.reduce((max, charInfo) => Math.max(max, charInfo.endTime), lineStart),
        [timedChars, lineStart]
    );
    const isComplete = isActive && position >= endTime;
    const activeCharIndex = getActiveCharIndex(timedChars, position);
    const text = useMemo(() => timedChars.map((charInfo) => charInfo.char).join(""), [timedChars]);
    const textDirection = useMemo(() => getTextDirection(text), [text]);

    if (shouldUseTextRun(text)) {
        return (
            <span
                className={`karaoke-line is-text-run ${textDirection === "rtl" ? "is-rtl" : ""} ${isActive ? "is-active" : ""} ${isComplete ? "is-complete" : ""}`}
                dir={textDirection === "rtl" ? "ltr" : textDirection}
            >
                {renderTextRun(timedChars, position, isActive, isComplete, textDirection, activeCharIndex)}
            </span>
        );
    }

    const charElements = timedChars.map((charInfo, index) => {
        const fillRatio = getCharFill(position, isActive, charInfo.startTime, charInfo.endTime);
        const state = fillRatio <= 0 ? "pending" : fillRatio >= 1 ? "done" : "active";
        const bounce = getBounce(
            position,
            isActive,
            charInfo.startTime,
            charInfo.endTime,
            getBounceAttenuation(index, activeCharIndex)
        );
        const style: KaraokeStyle = {};
        if (state === "active") {
            const fillValue = clamp(fillRatio) * 100;
            const softEdge = 16;
            style["--karaoke-char-fill"] = `${fillValue}%`;
            style["--karaoke-char-fill-soft-start"] = `${Math.max(0, fillValue - softEdge)}%`;
            style["--karaoke-char-fill-soft-end"] = `${Math.min(100, fillValue + softEdge)}%`;
        }
        if (bounce.active) {
            style["--karaoke-bounce-y"] = `${bounce.offsetY}px`;
            style["--karaoke-bounce-scale"] = bounce.scale;
        }

        return (
            <span
                className={`karaoke-char karaoke-char--${state} ${bounce.active ? "is-bouncing" : ""}`}
                style={style}
                key={`char-${index}`}
            >
                {charInfo.char}
            </span>
        );
    });

    return (
        <span className={`karaoke-line ${shouldWrapByWord(text) ? "has-word-wrap" : ""} ${isActive ? "is-active" : ""} ${isComplete ? "is-complete" : ""}`}>
            {shouldWrapByWord(text) ? wrapByWord(timedChars, charElements) : charElements}
        </span>
    );
};

const normalizeSpeakerPresentation = (speaker: string, speakerColor: string, speakerFallback: string) => {
    const normalized = speaker.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toUpperCase();
    const normalizedFallback = speakerFallback.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toUpperCase();
    const effectiveSpeaker = normalized === "CUSTOM"
        ? (["MALE 1", "FEMALE 1", "DUET 1"].includes(normalizedFallback) ? normalizedFallback : "MALE 1")
        : ({
            "MALE CUSTOM": "MALE 1",
            "FEMALE CUSTOM": "FEMALE 1",
            "DUET CUSTOM": "DUET 1",
        } as Record<string, string>)[normalized] || normalized;
    const normalizedColor = /^#[0-9a-f]{6}$/i.test(speakerColor.trim())
        ? speakerColor.trim().toLowerCase()
        : "";
    const creatorColor = (normalized === "CUSTOM" || normalized.endsWith(" CUSTOM"))
        ? normalizedColor
        : "";

    return {
        speakerClass: effectiveSpeaker.toLowerCase().replace(/[_\s]+/g, "-").replace(/[^a-z0-9-]/g, ""),
        style: creatorColor
            ? {
                "--lyrics-color-active": creatorColor,
                "--lyrics-color-inactive": `color-mix(in srgb, ${creatorColor} 50%, transparent)`,
            } as KaraokeStyle
            : undefined,
    };
};

const toVocalRow = (part: LyricVocalPart, index: number, role: "lead" | "background"): KaraokeVocalRow | null => {
    const syllables = splitRenderableSyllables(getValidSyllables(part.syllables));
    if (syllables.length === 0) return null;
    return {
        key: part.id || `${role}-${index}`,
        role,
        speaker: part.speaker || "",
        speakerColor: part.speakerColor || "",
        speakerFallback: part.speakerFallback || "",
        kind: part.kind || "vocal",
        phonetic: part.phonetic || "",
        translation: part.translation || "",
        text: part.text || syllables.map((syllable) => syllable.text).join(""),
        syllables,
    };
};

const getVocalRows = (line: LyricLine) => {
    const lead = line.vocals?.lead ? toVocalRow(line.vocals.lead, 0, "lead") : null;
    if (!lead) return null;
    const background = (line.vocals?.background || [])
        .map((part, index) => toVocalRow(part, index, "background"))
        .filter((row): row is KaraokeVocalRow => row !== null);
    const rows = [lead, ...background];
    return rows.length > 1 ? rows : null;
};

export const hasKaraokeVocalRows = (line: LyricLine) => (
    getValidSyllables(line.vocals?.lead?.syllables).length > 0
    && (line.vocals?.background || []).some(
        (part) => getValidSyllables(part.syllables).length > 0
    )
);

const splitLineByParallelShape = (text: string, rows: KaraokeVocalRow[]) => {
    const value = text.trim();
    if (!value || rows.length <= 1) return [];

    const separatorParts = value.split(/\s*[\/|／｜]\s*/).filter(Boolean);
    if (separatorParts.length === rows.length) return separatorParts;

    if (rows.length === 2) {
        const lead: string[] = [];
        const background: string[] = [];
        let depth = 0;
        let firstLeadIndex = Infinity;
        let firstBackgroundIndex = Infinity;
        Array.from(value).forEach((char, index) => {
            if (char === "(" || char === "（") {
                depth++;
                return;
            }
            if (char === ")" || char === "）") {
                depth = Math.max(0, depth - 1);
                return;
            }
            if (depth > 0) {
                firstBackgroundIndex = Math.min(firstBackgroundIndex, index);
                background.push(char);
            } else {
                if (!/\s/u.test(char)) firstLeadIndex = Math.min(firstLeadIndex, index);
                lead.push(char);
            }
        });
        if (background.join("").trim()) {
            const parts = [lead.join("").trim(), background.join("").trim()];
            return firstBackgroundIndex < firstLeadIndex ? parts.reverse() : parts;
        }
    }
    return [];
};

const isParenthesisOpen = (char: string) => char === "(" || char === "（";
const isParenthesisClose = (char: string) => char === ")" || char === "）";

const isStandaloneParentheticalText = (text: string) => {
    const chars = Array.from(text.trim());
    if (chars.length < 2 || !isParenthesisOpen(chars[0])) return false;

    let depth = 0;
    for (let index = 0; index < chars.length; index++) {
        const char = chars[index];
        if (isParenthesisOpen(char)) {
            depth++;
        } else if (isParenthesisClose(char)) {
            depth--;
            if (depth === 0 && index !== chars.length - 1) return false;
            if (depth < 0) return false;
        }
    }
    return depth === 0 && isParenthesisClose(chars[chars.length - 1]);
};

const stripStandaloneParentheticalText = (text: string) => {
    let value = text.trim();
    while (isStandaloneParentheticalText(value)) {
        value = Array.from(value).slice(1, -1).join("").trim();
    }
    return value;
};

const splitLineByVocalRowShape = (text: string, rows: KaraokeVocalRow[]) => {
    const value = text.trim();
    if (!value || rows.length <= 1) return [];

    const simpleParts = splitLineByParallelShape(value, rows);
    if (simpleParts.length === rows.length) return simpleParts;

    const segments: Array<{ parenthetical: boolean; text: string }> = [];
    let buffer: string[] = [];
    let depth = 0;
    let parenthetical = false;
    const flush = () => {
        const segmentText = buffer.join("").trim();
        if (segmentText) {
            segments.push({
                parenthetical,
                text: parenthetical ? stripStandaloneParentheticalText(segmentText) : segmentText,
            });
        }
        buffer = [];
        parenthetical = depth > 0;
    };

    Array.from(value).forEach((char) => {
        if (isParenthesisOpen(char)) {
            if (depth === 0) {
                flush();
                parenthetical = true;
            }
            depth++;
            buffer.push(char);
            return;
        }
        if (isParenthesisClose(char)) {
            buffer.push(char);
            if (depth > 0) depth--;
            if (depth === 0 && parenthetical) flush();
            return;
        }
        buffer.push(char);
    });
    flush();

    if (segments.length === rows.length) return segments.map((segment) => segment.text);

    const remaining = [...segments];
    const rowShapeParts = rows.map((row) => {
        const rowIsParenthetical = isStandaloneParentheticalText(row.text);
        const segmentIndex = remaining.findIndex((segment) => segment.parenthetical === rowIsParenthetical);
        if (segmentIndex < 0) return "";
        const [segment] = remaining.splice(segmentIndex, 1);
        return segment.text;
    });
    return rowShapeParts.every(Boolean) && remaining.length === 0 ? rowShapeParts : [];
};

const normalizeKind = (kind: string) => kind.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

export default function KaraokeLyrics({
    line,
    position,
    isActive,
    showPhonetic,
    showTranslation,
    phonetic,
    translation,
}: KaraokeLyricsProps) {
    const vocalRows = useMemo(() => getVocalRows(line), [line]);
    if (vocalRows) {
        const splitPhonetics = splitLineByVocalRowShape(phonetic || "", vocalRows);
        const splitTranslations = splitLineByVocalRowShape(translation || "", vocalRows);
        const hasRowPhonetic = vocalRows.some((row, index) => row.phonetic || splitPhonetics[index]);
        const hasRowTranslation = vocalRows.some((row, index) => row.translation || splitTranslations[index]);

        return (
            <span className="karaoke-stack">
                {vocalRows.map((row, rowIndex) => {
                    const presentation = normalizeSpeakerPresentation(
                        row.speaker,
                        row.speakerColor,
                        row.speakerFallback
                    );
                    const rowPhonetic = row.phonetic || splitPhonetics[rowIndex] || "";
                    const rowTranslation = row.translation || splitTranslations[rowIndex] || "";
                    return (
                        <span
                            className={`karaoke-part ${row.role} ${normalizeKind(row.kind)} ${presentation.speakerClass ? `speaker-${presentation.speakerClass}` : ""}`}
                            style={presentation.style}
                            key={row.key}
                        >
                            <TimedKaraokeLine
                                syllables={row.syllables}
                                fallbackText={row.text}
                                lineStart={line.startTime}
                                lineEnd={line.endTime}
                                position={position}
                                isActive={isActive}
                            />
                            {showPhonetic && rowPhonetic && (
                                <span className="karaoke-part-subline phonetic">{rowPhonetic}</span>
                            )}
                            {showTranslation && rowTranslation && (
                                <span className="karaoke-part-subline translation">{rowTranslation}</span>
                            )}
                        </span>
                    );
                })}
                {showPhonetic && !hasRowPhonetic && phonetic && (
                    <span className="karaoke-part-subline karaoke-stack-subline phonetic">{phonetic}</span>
                )}
                {showTranslation && !hasRowTranslation && translation && (
                    <span className="karaoke-part-subline karaoke-stack-subline translation">{translation}</span>
                )}
            </span>
        );
    }

    const directSyllables = Array.isArray(line.syllables) ? line.syllables : [];
    const syllables = directSyllables.length > 0
        ? directSyllables
        : (Array.isArray(line.vocals?.lead?.syllables) ? line.vocals.lead.syllables : []);
    const lead = line.vocals?.lead;
    const presentation = normalizeSpeakerPresentation(
        line.speaker || lead?.speaker || "",
        line.speakerColor || lead?.speakerColor || "",
        line.speakerFallback || lead?.speakerFallback || ""
    );
    const kind = line.kind || lead?.kind || "";

    return (
        <span
            className={`karaoke-single ${normalizeKind(kind)} ${presentation.speakerClass ? `speaker-${presentation.speakerClass}` : ""}`}
            style={presentation.style}
        >
            <TimedKaraokeLine
                syllables={syllables}
                fallbackText={line.text}
                lineStart={line.startTime}
                lineEnd={line.endTime}
                position={position}
                isActive={isActive}
            />
        </span>
    );
}

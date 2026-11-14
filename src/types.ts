export interface TrackInfo {
    title: string;
    artist: string;
    album: string;
    albumArt?: string;
    duration: number;
}

export interface LyricSyllable {
    startTime: number;
    endTime?: number;
    text: string;
}

export interface LyricVocalPart {
    id?: string;
    role?: string;
    speaker?: string;
    speakerColor?: string;
    speakerFallback?: string;
    kind?: string;
    text?: string;
    phonetic?: string;
    translation?: string;
    syllables: LyricSyllable[];
}

export interface LyricVocals {
    lead: LyricVocalPart;
    background?: LyricVocalPart[];
}

export interface LyricLine {
    startTime: number;
    endTime?: number;
    text: string;
    pronText?: string;
    transText?: string;
    translation?: string; // For backward compatibility if needed, though lib.rs dicts strict shape, but frontend code might use it?
    speaker?: string;
    speakerColor?: string;
    speakerFallback?: string;
    kind?: string;
    syllables?: LyricSyllable[];
    vocals?: LyricVocals;
}

export interface LyricsData {
    source?: string;
    trackUri?: string | null;
    track: TrackInfo;
    lyrics: LyricLine[];
    isSynced: boolean;
}

export interface NextTrackInfo {
    title: string;
    artist: string;
    albumArt?: string;
}

export interface ProgressData {
    source?: string;
    trackUri?: string | null;
    position: number;
    isPlaying: boolean;
    /** How often the sender repeats unchanged progress, in milliseconds. */
    heartbeatMs?: number;
    duration?: number;
    remaining?: number;
    nextTrack?: NextTrackInfo | null;
}

export interface LyricsEvent {
    lyricsData: LyricsData;
}

export interface ProgressEvent {
    progressData: ProgressData;
}

/** Another sender is shown: replace the displayed state with its own. */
export interface SourceChangeEvent {
    lyricsData?: LyricsData | null;
    progressData?: ProgressData | null;
}

export interface LatestPayloads {
    lyricsData?: LyricsData | null;
    progressData?: ProgressData | null;
}

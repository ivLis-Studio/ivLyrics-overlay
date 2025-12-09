export interface TrackInfo {
    title: string;
    artist: string;
    album: string;
    albumArt?: string;
    duration: number;
}

export interface LyricLine {
    startTime: number;
    endTime?: number;
    text: string;
    pronText?: string;
    transText?: string;
    translation?: string; // For backward compatibility if needed, though lib.rs dicts strict shape, but frontend code might use it?
}

export interface LyricsData {
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
    position: number;
    isPlaying: boolean;
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

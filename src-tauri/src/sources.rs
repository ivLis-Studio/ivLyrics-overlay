use std::collections::HashMap;
use std::time::{Duration, Instant};

use crate::{LyricsData, ProgressData};

/// A sender that does not announce its heartbeat is current for five seconds,
/// the same window after which the overlay hides lyrics without new data.
const DEFAULT_FRESHNESS: Duration = Duration::from_secs(5);
const MAX_FRESHNESS: Duration = Duration::from_secs(60);
/// Senders that stay silent this long are dropped from memory.
const FORGET_AFTER: Duration = Duration::from_secs(10 * 60);

#[derive(Default)]
struct Source {
    lyrics: Option<LyricsData>,
    progress: Option<ProgressData>,
    last_seen: Option<Instant>,
    playing_since: Option<Instant>,
}

impl Source {
    fn freshness(&self) -> Duration {
        self.progress
            .as_ref()
            .and_then(|progress| progress.heartbeat_ms)
            .map(|ms| {
                (Duration::from_millis(ms) * 2 + Duration::from_secs(1))
                    .clamp(DEFAULT_FRESHNESS, MAX_FRESHNESS)
            })
            .unwrap_or(DEFAULT_FRESHNESS)
    }

    fn is_fresh(&self, now: Instant) -> bool {
        self.last_seen
            .is_some_and(|seen| now.saturating_duration_since(seen) <= self.freshness())
    }

    fn is_playing(&self) -> bool {
        self.progress
            .as_ref()
            .is_some_and(|progress| progress.is_playing)
    }
}

/// What the overlay window must receive after a payload.
#[derive(Debug, Clone)]
pub enum Update {
    Lyrics(LyricsData),
    Progress(ProgressData),
    /// Another sender is now shown: replace the displayed state with its own.
    Switch {
        lyrics: Option<LyricsData>,
        progress: Option<ProgressData>,
    },
}

#[derive(Debug, Clone)]
pub struct Receipt {
    /// None when the payload belongs to a sender that is not shown.
    pub update: Option<Update>,
    pub active: bool,
    pub has_lyrics: bool,
    pub lyrics_track_uri: Option<String>,
}

/// Several programs may send lyrics to the overlay at once. Each keeps its own
/// state, and one of them is shown:
/// - a sender that is playing replaces one that is paused or has gone silent;
/// - when two are playing, the one that started playing last is shown;
/// - a paused or silent sender never replaces the one that is shown.
#[derive(Default)]
pub struct SourceHub {
    sources: HashMap<String, Source>,
    active: Option<String>,
}

impl SourceHub {
    pub fn receive_lyrics(&mut self, key: &str, lyrics: LyricsData, now: Instant) -> Receipt {
        self.touch(key, now).lyrics = Some(lyrics);
        self.deliver(key, now, |source| source.lyrics.clone().map(Update::Lyrics))
    }

    pub fn receive_progress(&mut self, key: &str, progress: ProgressData, now: Instant) -> Receipt {
        let source = self.touch(key, now);
        if !progress.is_playing {
            source.playing_since = None;
        } else if !source.is_playing() {
            source.playing_since = Some(now);
        }
        source.progress = Some(progress);
        self.deliver(key, now, |source| {
            source.progress.clone().map(Update::Progress)
        })
    }

    /// The state of the sender that is shown, for a reloaded overlay window.
    pub fn shown(&self) -> (Option<LyricsData>, Option<ProgressData>) {
        self.active
            .as_deref()
            .and_then(|key| self.sources.get(key))
            .map(|source| (source.lyrics.clone(), source.progress.clone()))
            .unwrap_or((None, None))
    }

    fn touch(&mut self, key: &str, now: Instant) -> &mut Source {
        let active = self.active.clone();
        self.sources.retain(|name, source| {
            name == key
                || active.as_deref() == Some(name.as_str())
                || source
                    .last_seen
                    .is_some_and(|seen| now.saturating_duration_since(seen) < FORGET_AFTER)
        });
        let source = self.sources.entry(key.to_string()).or_default();
        source.last_seen = Some(now);
        source
    }

    fn deliver(
        &mut self,
        key: &str,
        now: Instant,
        current: impl FnOnce(&Source) -> Option<Update>,
    ) -> Receipt {
        let update = if self.active.as_deref() == Some(key) {
            current(&self.sources[key])
        } else if self.takes_over(key, now) {
            self.active = Some(key.to_string());
            let source = &self.sources[key];
            Some(Update::Switch {
                lyrics: source.lyrics.clone(),
                progress: source.progress.clone(),
            })
        } else {
            None
        };
        let source = &self.sources[key];
        Receipt {
            update,
            active: self.active.as_deref() == Some(key),
            has_lyrics: source.lyrics.is_some(),
            lyrics_track_uri: source
                .lyrics
                .as_ref()
                .and_then(|lyrics| lyrics.track_uri.clone()),
        }
    }

    fn takes_over(&self, key: &str, now: Instant) -> bool {
        let Some(shown) = self
            .active
            .as_deref()
            .and_then(|name| self.sources.get(name))
        else {
            return true;
        };
        if !shown.is_fresh(now) {
            return true;
        }
        let candidate = &self.sources[key];
        candidate.is_playing()
            && (!shown.is_playing() || candidate.playing_since > shown.playing_since)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lyrics(uri: &str) -> LyricsData {
        serde_json::from_value(serde_json::json!({
            "trackUri": uri,
            "track": { "title": uri, "artist": "Artist", "album": "Album", "duration": 180000 },
            "lyrics": [{ "startTime": 0, "endTime": 1000, "text": uri }],
            "isSynced": true
        }))
        .unwrap()
    }

    fn progress(uri: &str, playing: bool, heartbeat_ms: Option<u64>) -> ProgressData {
        serde_json::from_value(serde_json::json!({
            "trackUri": uri,
            "position": 1000,
            "isPlaying": playing,
            "heartbeatMs": heartbeat_ms
        }))
        .unwrap()
    }

    fn shown_uri(hub: &SourceHub) -> Option<String> {
        hub.shown().0.and_then(|lyrics| lyrics.track_uri)
    }

    #[test]
    fn a_paused_sender_cannot_replace_another_program_that_is_playing() {
        let mut hub = SourceHub::default();
        let start = Instant::now();
        hub.receive_progress("spotify", progress("spotify:one", false, Some(2000)), start);
        hub.receive_lyrics("spotify", lyrics("spotify:one"), start);
        let switch = hub.receive_progress("player", progress("player:two", true, None), start);
        assert!(matches!(
            switch.update,
            Some(Update::Switch {
                progress: Some(_),
                ..
            })
        ));
        hub.receive_lyrics("player", lyrics("player:two"), start);
        assert_eq!(shown_uri(&hub).as_deref(), Some("player:two"));

        for second in 1..30 {
            let now = start + Duration::from_secs(second);
            let paused =
                hub.receive_progress("spotify", progress("spotify:one", false, Some(2000)), now);
            assert!(
                paused.update.is_none(),
                "paused Spotify heartbeats stay hidden"
            );
            assert!(!paused.active);
            hub.receive_progress("player", progress("player:two", true, None), now);
        }
        assert_eq!(shown_uri(&hub).as_deref(), Some("player:two"));
    }

    #[test]
    fn the_sender_that_starts_playing_last_is_shown() {
        let mut hub = SourceHub::default();
        let start = Instant::now();
        hub.receive_progress("player", progress("player:two", true, None), start);
        hub.receive_lyrics("player", lyrics("player:two"), start);
        hub.receive_lyrics("spotify", lyrics("spotify:one"), start);
        assert_eq!(
            shown_uri(&hub).as_deref(),
            Some("player:two"),
            "lyrics alone do not take over"
        );

        let resumed = hub.receive_progress(
            "spotify",
            progress("spotify:one", true, Some(2000)),
            start + Duration::from_secs(1),
        );
        match resumed.update {
            Some(Update::Switch {
                lyrics: Some(lyrics),
                progress: Some(progress),
            }) => {
                assert_eq!(lyrics.track_uri.as_deref(), Some("spotify:one"));
                assert!(progress.is_playing);
            }
            other => panic!("Spotify should replace the display with its own state: {other:?}"),
        }
        let older = hub.receive_progress(
            "player",
            progress("player:two", true, None),
            start + Duration::from_secs(2),
        );
        assert!(
            older.update.is_none(),
            "a sender that kept playing does not take the display back"
        );

        let paused = hub.receive_progress(
            "spotify",
            progress("spotify:one", false, Some(2000)),
            start + Duration::from_secs(3),
        );
        assert!(
            matches!(paused.update, Some(Update::Progress(_))),
            "the shown sender's pause is delivered"
        );
        let back = hub.receive_progress(
            "player",
            progress("player:two", true, None),
            start + Duration::from_secs(4),
        );
        assert!(
            matches!(back.update, Some(Update::Switch { .. })),
            "a playing sender replaces a paused one"
        );
    }

    #[test]
    fn a_silent_sender_is_replaced_after_its_announced_heartbeat_window() {
        let mut hub = SourceHub::default();
        let start = Instant::now();
        hub.receive_progress(
            "spotify",
            progress("spotify:one", false, Some(10_000)),
            start,
        );
        let early = hub.receive_progress(
            "player",
            progress("player:two", false, None),
            start + Duration::from_secs(20),
        );
        assert!(
            early.update.is_none(),
            "a ten-second heartbeat stays current for 21 seconds"
        );
        let late = hub.receive_progress(
            "player",
            progress("player:two", false, None),
            start + Duration::from_secs(22),
        );
        assert!(matches!(
            late.update,
            Some(Update::Switch {
                lyrics: None,
                progress: Some(_)
            })
        ));

        let mut legacy = SourceHub::default();
        legacy.receive_progress("old", progress("old:one", false, None), start);
        let replaced =
            legacy.receive_lyrics("new", lyrics("new:two"), start + Duration::from_secs(6));
        assert!(matches!(
            replaced.update,
            Some(Update::Switch {
                lyrics: Some(_),
                progress: None
            })
        ));
    }

    #[test]
    fn receipts_report_the_lyrics_each_sender_has_delivered() {
        let mut hub = SourceHub::default();
        let start = Instant::now();
        let first =
            hub.receive_progress("spotify", progress("spotify:one", true, Some(2000)), start);
        assert!(first.active && !first.has_lyrics && first.lyrics_track_uri.is_none());
        hub.receive_lyrics("spotify", lyrics("spotify:one"), start);
        let next =
            hub.receive_progress("spotify", progress("spotify:two", true, Some(2000)), start);
        assert!(next.has_lyrics);
        assert_eq!(next.lyrics_track_uri.as_deref(), Some("spotify:one"));
    }

    #[test]
    fn long_silent_senders_are_forgotten_but_the_shown_one_is_kept() {
        let mut hub = SourceHub::default();
        let start = Instant::now();
        hub.receive_lyrics("shown", lyrics("shown:one"), start);
        hub.receive_lyrics("other", lyrics("other:one"), start);
        hub.receive_lyrics(
            "third",
            lyrics("third:one"),
            start + FORGET_AFTER + Duration::from_secs(1),
        );
        assert!(hub.sources.contains_key("shown"));
        assert!(!hub.sources.contains_key("other"));
        assert!(hub.sources.contains_key("third"));
    }
}

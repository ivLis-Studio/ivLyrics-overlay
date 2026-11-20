use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Instant;

use axum::extract::State;
use axum::http::{header::ORIGIN, HeaderMap, Method};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::json;
use tower_http::cors::{Any, CorsLayer};

use crate::sources::{Receipt, SourceHub, Update};
use crate::{LyricsData, ProgressData};

/// Version 2 adds named senders, side-effect-free status probes and
/// announced heartbeats. Version 1 senders keep working unchanged.
pub const PROTOCOL_VERSION: u32 = 3;

pub type UpdateSink = Arc<dyn Fn(Update) + Send + Sync>;

#[derive(Clone)]
pub struct ServerState {
    pub hub: Arc<Mutex<SourceHub>>,
    pub sink: UpdateSink,
    pub version: String,
}

pub fn router(state: ServerState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::POST, Method::GET, Method::OPTIONS])
        .allow_headers(Any);

    // GET on the payload routes answers the status, so a client can probe
    // the same path on every overlay version: old versions answer 405.
    Router::new()
        .route("/", get(status))
        .route("/status", get(status))
        .route("/lyrics", post(receive_lyrics).get(status))
        .route("/progress", post(receive_progress).get(status))
        .layer(cors)
        .with_state(state)
}

pub fn lock_hub(hub: &Mutex<SourceHub>) -> MutexGuard<'_, SourceHub> {
    hub.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

async fn status(State(state): State<ServerState>) -> Json<serde_json::Value> {
    Json(json!({
        "app": "ivLyrics Overlay",
        "protocol": PROTOCOL_VERSION,
        "version": state.version,
    }))
}

async fn receive_lyrics(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Json(lyrics): Json<LyricsData>,
) -> Response {
    let named = lyrics.source.is_some();
    let key = source_key(lyrics.source.as_deref(), &headers);
    let receipt = {
        let mut hub = lock_hub(&state.hub);
        let receipt = hub.receive_lyrics(&key, lyrics, Instant::now());
        // Deliver while holding the lock so concurrent requests reach the
        // window in the order the hub decided them.
        if let Some(update) = receipt.update.clone() {
            (state.sink)(update);
        }
        receipt
    };
    respond(receipt, named)
}

async fn receive_progress(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Json(progress): Json<ProgressData>,
) -> Response {
    let named = progress.source.is_some();
    let key = source_key(progress.source.as_deref(), &headers);
    let receipt = {
        let mut hub = lock_hub(&state.hub);
        let receipt = hub.receive_progress(&key, progress, Instant::now());
        if let Some(update) = receipt.update.clone() {
            (state.sink)(update);
        }
        receipt
    };
    respond(receipt, named)
}

/// Senders that name themselves get a receipt; older senders keep the plain
/// "OK" body they were written against.
fn respond(receipt: Receipt, named: bool) -> Response {
    if !named {
        return "OK".into_response();
    }
    Json(json!({
        "ok": true,
        "active": receipt.active,
        "hasLyrics": receipt.has_lyrics,
        "lyricsTrackUri": receipt.lyrics_track_uri,
    }))
    .into_response()
}

/// Senders without a name are told apart by the page that sent them, so
/// Spotify (ivLyrics) and a native program never share one state.
fn source_key(name: Option<&str>, headers: &HeaderMap) -> String {
    if let Some(name) = name.map(str::trim).filter(|name| !name.is_empty()) {
        return format!("source:{}", name.chars().take(64).collect::<String>());
    }
    headers
        .get(ORIGIN)
        .and_then(|origin| origin.to_str().ok())
        .map(str::trim)
        .filter(|origin| !origin.is_empty() && *origin != "null")
        .map(|origin| format!("origin:{}", origin.chars().take(128).collect::<String>()))
        .unwrap_or_else(|| "default".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::{to_bytes, Body};
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    fn server() -> (Router, Arc<Mutex<Vec<Update>>>) {
        let updates = Arc::new(Mutex::new(Vec::new()));
        let sink_updates = updates.clone();
        let state = ServerState {
            hub: Arc::new(Mutex::new(SourceHub::default())),
            sink: Arc::new(move |update| sink_updates.lock().unwrap().push(update)),
            version: "1.3.0".to_string(),
        };
        (router(state), updates)
    }

    async fn call(
        app: &Router,
        method: &str,
        path: &str,
        origin: Option<&str>,
        body: Option<serde_json::Value>,
    ) -> (StatusCode, HeaderMap, String) {
        let mut request = Request::builder().method(method).uri(path);
        if let Some(origin) = origin {
            request = request.header("origin", origin);
        }
        let request = match body {
            Some(body) => request
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
            None => request.body(Body::empty()).unwrap(),
        };
        let response = app.clone().oneshot(request).await.unwrap();
        let status = response.status();
        let headers = response.headers().clone();
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        (status, headers, String::from_utf8(body.to_vec()).unwrap())
    }

    #[tokio::test]
    async fn probes_answer_the_protocol_without_changing_the_display() {
        let (app, updates) = server();
        for path in ["/", "/status", "/progress", "/lyrics"] {
            let (status, headers, body) = call(
                &app,
                "GET",
                path,
                Some("https://xpui.app.spotify.com"),
                None,
            )
            .await;
            assert_eq!(status, StatusCode::OK);
            assert_eq!(headers.get("access-control-allow-origin").unwrap(), "*");
            let body: serde_json::Value = serde_json::from_str(&body).unwrap();
            assert_eq!(body["protocol"], PROTOCOL_VERSION);
            assert_eq!(body["version"], "1.3.0");
        }
        assert!(updates.lock().unwrap().is_empty());
    }

    #[tokio::test]
    async fn named_and_unnamed_senders_keep_separate_state() {
        let (app, updates) = server();
        let spotify = Some("https://xpui.app.spotify.com");
        let (_, _, body) = call(&app, "POST", "/progress", spotify, Some(json!({
            "source": "ivlyrics", "trackUri": "spotify:one", "position": 1000, "isPlaying": false, "heartbeatMs": 10000
        }))).await;
        let receipt: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(receipt["active"], true);
        assert_eq!(receipt["hasLyrics"], false);

        let (_, _, body) = call(
            &app,
            "POST",
            "/progress",
            None,
            Some(json!({
                "trackUri": "player:two", "position": 0, "isPlaying": true
            })),
        )
        .await;
        assert_eq!(body, "OK", "unnamed senders keep the version 1 response");
        call(&app, "POST", "/lyrics", None, Some(json!({
            "trackUri": "player:two", "track": { "title": "Two", "artist": "A", "album": "B", "duration": 180000 },
            "lyrics": [], "isSynced": true
        }))).await;

        let (_, _, body) = call(&app, "POST", "/progress", spotify, Some(json!({
            "source": "ivlyrics", "trackUri": "spotify:one", "position": 1000, "isPlaying": false, "heartbeatMs": 10000
        }))).await;
        let receipt: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(
            receipt["active"], false,
            "paused Spotify stays behind the playing program"
        );
        let delivered = updates.lock().unwrap();
        assert_eq!(
            delivered.len(),
            3,
            "Spotify, then the program's switch and lyrics"
        );
        assert!(matches!(delivered[1], Update::Switch { .. }));
        assert!(matches!(delivered[2], Update::Lyrics(_)));
    }

    #[test]
    fn unnamed_senders_are_told_apart_by_origin() {
        let mut spotify = HeaderMap::new();
        spotify.insert(ORIGIN, "https://xpui.app.spotify.com".parse().unwrap());
        assert_eq!(
            source_key(None, &spotify),
            "origin:https://xpui.app.spotify.com"
        );
        assert_eq!(source_key(Some(" ivlyrics "), &spotify), "source:ivlyrics");
        assert_eq!(source_key(Some(""), &HeaderMap::new()), "default");
    }
}

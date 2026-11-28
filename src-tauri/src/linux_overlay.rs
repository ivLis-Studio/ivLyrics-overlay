//! Linux/X11 integration for the overlay window.
//!
//! A transparent, always-on-top, click-through overlay needs the X11 windowing
//! protocol: GTK offers no way to position a window on Wayland, and Wayland has
//! no client API for click-through. The app therefore runs under XWayland when
//! a Wayland session is detected (see [`prepare_display`]), and this module
//! polls the X server for the global pointer and for full-screen windows.
#![cfg(target_os = "linux")]

use std::env;

use x11rb::connection::Connection;
use x11rb::protocol::xproto::{Atom, AtomEnum, ConnectionExt, Window};
use x11rb::rust_connection::RustConnection;

use crate::fullscreen::{covers_monitor, Rect};

/// Make Tauri/WebKit use XWayland on a Wayland session.
///
/// The overlay depends on three X11-only behaviours: an ARGB visual for
/// transparency, `_NET_WM_STATE_ABOVE` for always-on-top, and an empty input
/// shape for click-through. GTK cannot provide any of them natively on Wayland.
/// Set `IVLYRICS_NATIVE_WAYLAND=1` to opt out (the overlay then renders, but
/// cannot pass clicks through or reliably stay above full-screen windows).
pub fn prepare_display() {
    let wayland = env::var_os("WAYLAND_DISPLAY").is_some()
        || env::var("XDG_SESSION_TYPE").is_ok_and(|value| value.eq_ignore_ascii_case("wayland"));
    let has_x11 = env::var_os("DISPLAY").is_some();
    let explicit_backend = env::var_os("GDK_BACKEND").is_some();
    let native_wayland = env::var_os("IVLYRICS_NATIVE_WAYLAND").is_some();

    // WebKitGTK's DMABUF renderer fails on several XWayland/NVIDIA setups,
    // leaving the transparent webview blank while the GL errors go to stderr.
    // A lyrics overlay does not need GPU compositing, so fall back to software
    // unless the caller explicitly overrides this.
    if env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        // SAFETY: called before GTK/WebKit start, from the main thread.
        env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    if wayland && has_x11 && !explicit_backend && !native_wayland {
        // SAFETY: called at the start of run(), before Tauri initialises GTK or
        // starts any other thread. No other thread can observe the environment
        // change.
        env::set_var("GDK_BACKEND", "x11");
        eprintln!(
            "ivLyrics Overlay: Wayland session detected; using XWayland so the overlay can \
             stay on top and pass clicks through."
        );
    } else if wayland && !has_x11 && !native_wayland {
        eprintln!(
            "ivLyrics Overlay: no XWayland display found; running natively on Wayland. \
             Click-through, window positioning and full-screen detection are unavailable."
        );
    }
}

/// A connection to the X server used by the overlay polling thread.
pub struct X11State {
    conn: RustConnection,
    root: Window,
    atoms: Atoms,
}

struct Atoms {
    active_window: Atom,
    wm_state: Atom,
    fullscreen: Atom,
    maximized_vert: Atom,
    maximized_horz: Atom,
    window_type: Atom,
    frame_extents: Atom,
    type_desktop: Atom,
    type_dock: Atom,
    type_toolbar: Atom,
    type_menu: Atom,
    type_splash: Atom,
    type_notification: Atom,
}

fn intern(conn: &RustConnection, name: &str) -> Option<Atom> {
    conn.intern_atom(false, name.as_bytes())
        .ok()?
        .reply()
        .ok()
        .map(|reply| reply.atom)
}

impl X11State {
    /// Connect to the display named by `$DISPLAY`. Returns `None` when the
    /// process is not running on X11 (native Wayland) or the display is gone.
    pub fn connect() -> Option<Self> {
        let (conn, screen_num) = x11rb::connect(None).ok()?;
        let root = conn.setup().roots.get(screen_num)?.root;
        let atoms = Atoms {
            active_window: intern(&conn, "_NET_ACTIVE_WINDOW")?,
            wm_state: intern(&conn, "_NET_WM_STATE")?,
            fullscreen: intern(&conn, "_NET_WM_STATE_FULLSCREEN")?,
            maximized_vert: intern(&conn, "_NET_WM_STATE_MAXIMIZED_VERT")?,
            maximized_horz: intern(&conn, "_NET_WM_STATE_MAXIMIZED_HORZ")?,
            window_type: intern(&conn, "_NET_WM_WINDOW_TYPE")?,
            frame_extents: intern(&conn, "_NET_FRAME_EXTENTS")?,
            type_desktop: intern(&conn, "_NET_WM_WINDOW_TYPE_DESKTOP")?,
            type_dock: intern(&conn, "_NET_WM_WINDOW_TYPE_DOCK")?,
            type_toolbar: intern(&conn, "_NET_WM_WINDOW_TYPE_TOOLBAR")?,
            type_menu: intern(&conn, "_NET_WM_WINDOW_TYPE_MENU")?,
            type_splash: intern(&conn, "_NET_WM_WINDOW_TYPE_SPLASH")?,
            type_notification: intern(&conn, "_NET_WM_WINDOW_TYPE_NOTIFICATION")?,
        };
        Some(Self { conn, root, atoms })
    }

    /// Pointer position in root (global desktop) coordinates.
    pub fn pointer(&self) -> Option<(i32, i32)> {
        let reply = self.conn.query_pointer(self.root).ok()?.reply().ok()?;
        Some((reply.root_x as i32, reply.root_y as i32))
    }

    /// The window the window manager considers active, if any.
    pub fn active_window(&self) -> Option<Window> {
        let reply = self
            .conn
            .get_property(
                false,
                self.root,
                self.atoms.active_window,
                AtomEnum::WINDOW,
                0,
                1,
            )
            .ok()?
            .reply()
            .ok()?;
        let window = reply.value32()?.next()?;
        (window != 0 && window != self.root).then_some(window)
    }

    /// Whether the active window is a full-screen app on `monitor`.
    ///
    /// Both real full-screen windows (`_NET_WM_STATE_FULLSCREEN`) and borderless
    /// windows that cover the whole monitor count, matching the Windows
    /// backend. Desktop panels and docks never count.
    pub fn is_fullscreen_on(&self, monitor: Rect) -> bool {
        let Some(window) = self.active_window() else {
            return false;
        };
        if self.is_ignored_window(window) {
            return false;
        }

        let states = self.atom_list(window, self.atoms.wm_state);
        let Some(frame) = self.window_frame(window) else {
            return false;
        };
        if !covers_monitor(frame, monitor) {
            return false;
        }

        // A maximized window covers the work area, not the monitor; only a
        // borderless full-screen window covers the monitor without the
        // full-screen state. On compositors with auto-hiding panels the two can
        // look identical, so trust the state when it is present.
        if states.contains(&self.atoms.fullscreen) {
            return true;
        }
        !states.contains(&self.atoms.maximized_vert)
            && !states.contains(&self.atoms.maximized_horz)
    }

    fn is_ignored_window(&self, window: Window) -> bool {
        let types = self.atom_list(window, self.atoms.window_type);
        if types.is_empty() {
            return false;
        }
        let ignored = [
            self.atoms.type_desktop,
            self.atoms.type_dock,
            self.atoms.type_toolbar,
            self.atoms.type_menu,
            self.atoms.type_splash,
            self.atoms.type_notification,
        ];
        types.iter().any(|kind| ignored.contains(kind))
    }

    fn atom_list(&self, window: Window, property: Atom) -> Vec<Atom> {
        let Ok(cookie) = self
            .conn
            .get_property(false, window, property, AtomEnum::ATOM, 0, 1024)
        else {
            return Vec::new();
        };
        let Ok(reply) = cookie.reply() else {
            return Vec::new();
        };
        reply
            .value32()
            .map(|values| values.collect())
            .unwrap_or_default()
    }

    fn cardinal_list(&self, window: Window, property: Atom) -> Vec<u32> {
        let Ok(cookie) = self
            .conn
            .get_property(false, window, property, AtomEnum::CARDINAL, 0, 16)
        else {
            return Vec::new();
        };
        let Ok(reply) = cookie.reply() else {
            return Vec::new();
        };
        reply
            .value32()
            .map(|values| values.collect())
            .unwrap_or_default()
    }

    /// The window's outer rectangle on the root window, including window-manager
    /// frame extents.
    fn window_frame(&self, window: Window) -> Option<Rect> {
        let geometry = self
            .conn
            .get_geometry(window)
            .ok()?
            .reply()
            .ok()?;
        let origin = self
            .conn
            .translate_coordinates(window, self.root, 0, 0)
            .ok()?
            .reply()
            .ok()?;
        let extents = self.cardinal_list(window, self.atoms.frame_extents);
        let extents = match extents.as_slice() {
            [left, right, top, bottom, ..] => [*left, *right, *top, *bottom],
            _ => [0, 0, 0, 0],
        };
        Some(frame_bounds(
            (origin.dst_x as i32, origin.dst_y as i32),
            (geometry.width, geometry.height),
            extents,
        ))
    }
}

/// Outer window rectangle from the client origin, size and frame extents.
fn frame_bounds(origin: (i32, i32), size: (u16, u16), extents: [u32; 4]) -> Rect {
    let [left, right, top, bottom] = extents.map(|value| value as i32);
    let (x, y) = (origin.0 - left, origin.1 - top);
    (
        x,
        y,
        x + size.0 as i32 + left + right,
        y + size.1 as i32 + top + bottom,
    )
}

#[cfg(test)]
mod tests {
    use super::frame_bounds;

    #[test]
    fn frame_extents_are_added_around_the_client_area() {
        assert_eq!(
            frame_bounds((100, 50), (800, 600), [2, 2, 30, 2]),
            (98, 20, 98 + 804, 20 + 632)
        );
        assert_eq!(frame_bounds((0, 0), (1920, 1080), [0, 0, 0, 0]), (0, 0, 1920, 1080));
    }
}

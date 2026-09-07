#![cfg(all(test, target_os = "windows"))]

use super::restore_windows_alpha_composition;
use windows::core::w;
use windows::Win32::Foundation::HWND;
use windows::Win32::Graphics::Dwm::DwmIsCompositionEnabled;
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DestroyWindow, WS_EX_LAYERED, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW, WS_POPUP,
};

struct TestWindow(HWND);

impl Drop for TestWindow {
    fn drop(&mut self) {
        // The test window is hidden and owned by this process. Best-effort
        // cleanup also runs if an assertion fails after window creation.
        unsafe {
            let _ = DestroyWindow(self.0);
        }
    }
}

#[test]
fn reapplies_alpha_composition_on_a_live_top_level_window() {
    let composition = unsafe { DwmIsCompositionEnabled() }
        .expect("DwmIsCompositionEnabled should be callable on Windows");
    assert!(
        composition.as_bool(),
        "Windows transparency smoke validation requires DWM composition"
    );

    // STATIC is a built-in Win32 class, so this does not need application
    // window-class registration or a message loop. The same layered,
    // no-activate, tool-window shape used by an overlay keeps CI headless and
    // avoids changing the user's visible desktop during the test.
    let window = unsafe {
        CreateWindowExW(
            WS_EX_LAYERED | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW,
            w!("STATIC"),
            w!("ivLyrics overlay transparency smoke"),
            WS_POPUP,
            -10000,
            -10000,
            64,
            64,
            None,
            None,
            None,
            None,
        )
    }
    .expect("CreateWindowExW should create a hidden top-level smoke window");
    let window = TestWindow(window);

    // Opening settings, focus changes, and window-state restoration can all
    // invoke the production helper more than once. Exercise that lifecycle
    // without claiming that a unit test proves rendered pixel alpha.
    for _ in 0..8 {
        restore_windows_alpha_composition(window.0)
            .expect("DwmEnableBlurBehindWindow should accept the live HWND");
    }
}

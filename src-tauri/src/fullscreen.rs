//! Whether a full-screen app (a game, a full-screen video) is in front, so the
//! overlay can step aside. A window that stays on screen, even fully
//! transparent, keeps Windows from presenting a game directly and turns off
//! frame generation (DLSS Frame Generation, AMD Fluid Motion Frames).
#![cfg_attr(not(target_os = "windows"), allow(dead_code))]

/// A window rectangle as (left, top, right, bottom) in screen pixels.
pub type Rect = (i32, i32, i32, i32);

/// True when the window covers the whole monitor. A maximized window stops at
/// the taskbar (the monitor's work area) and is not full-screen.
pub fn covers_monitor(window: Rect, monitor: Rect) -> bool {
    window.0 <= monitor.0 && window.1 <= monitor.1 && window.2 >= monitor.2 && window.3 >= monitor.3
}

/// Shell windows that span a monitor without being a full-screen app.
pub fn is_shell_class(class_name: &str) -> bool {
    matches!(
        class_name,
        "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd"
    )
}

#[cfg(target_os = "windows")]
pub fn foreground_is_fullscreen_near(overlay: windows::Win32::Foundation::HWND) -> bool {
    use windows::Win32::Foundation::RECT;
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
    use windows::Win32::UI::Shell::{
        SHQueryUserNotificationState, QUNS_PRESENTATION_MODE, QUNS_RUNNING_D3D_FULL_SCREEN,
    };
    use windows::Win32::UI::WindowsAndMessaging::{GetClassNameW, GetForegroundWindow, GetWindowRect};

    unsafe {
        // Exclusive full-screen Direct3D and presentation mode cover every monitor.
        if let Ok(state) = SHQueryUserNotificationState() {
            if state == QUNS_RUNNING_D3D_FULL_SCREEN || state == QUNS_PRESENTATION_MODE {
                return true;
            }
        }
        let foreground = GetForegroundWindow();
        if foreground.0.is_null() || foreground == overlay {
            return false;
        }
        let mut class_name = [0u16; 128];
        let length = GetClassNameW(foreground, &mut class_name);
        if length > 0 && is_shell_class(&String::from_utf16_lossy(&class_name[..length as usize])) {
            return false;
        }
        // Borderless full-screen is an ordinary window covering its monitor. Only
        // the overlay's own monitor matters.
        let monitor = MonitorFromWindow(foreground, MONITOR_DEFAULTTONEAREST);
        if monitor != MonitorFromWindow(overlay, MONITOR_DEFAULTTONEAREST) {
            return false;
        }
        let mut window = RECT::default();
        if GetWindowRect(foreground, &mut window).is_err() {
            return false;
        }
        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !GetMonitorInfoW(monitor, &mut info).as_bool() {
            return false;
        }
        let screen = info.rcMonitor;
        covers_monitor(
            (window.left, window.top, window.right, window.bottom),
            (screen.left, screen.top, screen.right, screen.bottom),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_a_window_covering_the_whole_monitor_is_full_screen() {
        let monitor = (0, 0, 2560, 1440);
        assert!(covers_monitor((0, 0, 2560, 1440), monitor), "borderless full-screen");
        assert!(covers_monitor((-8, -8, 2568, 1448), monitor), "a window overhanging its monitor");
        assert!(!covers_monitor((-8, -8, 2568, 1400), monitor), "maximized above the taskbar");
        assert!(!covers_monitor((100, 100, 1300, 900), monitor), "an ordinary window");
        let second = (2560, 0, 4480, 1080);
        assert!(covers_monitor((2560, 0, 4480, 1080), second), "full-screen on a second monitor");
        assert!(!covers_monitor((0, 0, 2560, 1440), second), "another monitor's window");
    }

    #[test]
    fn the_desktop_and_taskbar_never_count_as_full_screen_apps() {
        for class_name in ["Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd"] {
            assert!(is_shell_class(class_name), "{class_name}");
        }
        assert!(!is_shell_class("UnrealWindow"));
        assert!(!is_shell_class("Chrome_WidgetWin_1"));
    }
}

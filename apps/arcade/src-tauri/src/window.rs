//! Desktop window setup: the window-state plugin restores size and position but never
//! visibility, and a fallback reveals the main window. The window starts hidden (no white flash in
//! dark mode) and the web side shows it after its first frame; if that has not happened after
//! 3 s, the fallback does.
#![cfg(desktop)]

use std::thread;
use std::time::Duration;

use tauri::{App, AppHandle, Builder, Manager, WebviewWindow, Wry};
use tauri_plugin_window_state::StateFlags;

/// Label of the main window in tauri.conf.json.
const MAIN_WINDOW: &str = "main";

/// How long the web side has to show the main window before the fallback does.
const REVEAL_TIMEOUT: Duration = Duration::from_secs(3);

/// Adds the window-state plugin and the reveal fallback to the app builder.
pub fn configure(builder: Builder<Wry>) -> Builder<Wry> {
    let state = tauri_plugin_window_state::Builder::default()
        .with_state_flags(StateFlags::all() - StateFlags::VISIBLE)
        .build();
    builder.plugin(state).setup(start_reveal_fallback)
}

/// Setup hook of the app: starts the reveal fallback.
fn start_reveal_fallback(app: &mut App<Wry>) -> Result<(), Box<dyn std::error::Error>> {
    show_main_window_fallback(app.handle());
    Ok(())
}

/// Shows the main window after the timeout unless it is visible by then.
fn show_main_window_fallback(app: &AppHandle<Wry>) {
    let app = app.clone();
    thread::spawn(move || {
        thread::sleep(REVEAL_TIMEOUT);
        // Without a main window it was closed during the wait, and there is nothing to show.
        if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
            show_if_hidden(&window);
        }
    });
}

/// Shows the window unless it reports itself visible; an error from `is_visible` counts as hidden.
fn show_if_hidden(window: &WebviewWindow<Wry>) {
    if matches!(window.is_visible(), Ok(true)) {
        return;
    }
    if let Err(error) = window.show() {
        // The window can close during the wait; there is nothing else to fall back to.
        log_failure(&error);
    }
}

/// Logs a failed reveal in development builds; release builds have no console to log to.
fn log_failure(error: &tauri::Error) {
    if cfg!(debug_assertions) {
        eprintln!("window reveal fallback failed: {error}");
    }
}

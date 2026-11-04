//! R15K Arcade – Tauri shell. Rust is glue only: it registers the plugins and sets up the desktop
//! window. The app defines no commands of its own and contains no game logic; the web app talks to
//! the plugins directly.

mod window;

/// Starts the app; on Android and iOS this is the native entry point.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_device::init());
    #[cfg(desktop)]
    let builder = window::configure(builder);
    builder
        .run(tauri::generate_context!())
        .expect("failed to start R15K Arcade");
}

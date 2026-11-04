//! R15K Arcade – own Tauri mobile plugin "device": immersive mode, keep-awake and move to
//! background, implemented in Kotlin (`android/`) and Swift (`ios/`). The Rust side only registers
//! them and has no command handlers: Tauri forwards plugin commands that Rust does not handle to
//! the registered mobile plugin. Desktop builds register nothing, and the app never invokes the
//! commands there.

use tauri::plugin::{Builder, TauriPlugin};
use tauri::Runtime;

/// Package of the Kotlin plugin class (`android/src/main/java/dev/r15k/arcade/device`).
#[cfg(target_os = "android")]
const ANDROID_PACKAGE: &str = "dev.r15k.arcade.device";

/// Creates the plugin; the app adds it with `tauri::Builder::plugin`.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("device")
        .setup(|_app, api| {
            #[cfg(target_os = "android")]
            api.register_android_plugin(ANDROID_PACKAGE, "DevicePlugin")?;
            #[cfg(target_os = "ios")]
            ios::register(&api)?;
            // api is used only on Android and iOS; this keeps desktop builds free of unused-variable warnings.
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            let _ = &api;
            Ok(())
        })
        .build()
}

#[cfg(target_os = "ios")]
#[allow(unsafe_code)]
mod ios {
    use std::error::Error;

    use tauri::plugin::PluginApi;
    use tauri::Runtime;

    // SAFETY: the macro declares the Swift entry point `init_plugin_device` (the `@_cdecl`
    // function in ios/Sources/DevicePlugin/DevicePlugin.swift, which takes no arguments and
    // returns the plugin object) as an extern function; Tauri calls it once while registering the
    // plugin. This is the only unsafe code of the plugin.
    tauri::ios_plugin_binding!(init_plugin_device);

    /// Registers the Swift plugin class with Tauri.
    pub(crate) fn register<R: Runtime>(api: &PluginApi<R, ()>) -> Result<(), Box<dyn Error>> {
        api.register_ios_plugin(init_plugin_device)?;
        Ok(())
    }
}

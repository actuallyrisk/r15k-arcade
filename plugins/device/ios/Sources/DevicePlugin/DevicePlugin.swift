// R15K Arcade – iOS side of the "device" Tauri plugin: keep-awake during rounds. iOS needs no
// immersive command (Info.plist hides the status bar) and has no back button, so keep-awake is
// the only command here. Tauri calls the @objc method by name.
import Tauri
import UIKit

/// Arguments of `setKeepAwake`; the wire key `enabled` is sent by the web app.
struct ToggleArgs: Decodable {
  let enabled: Bool
}

/// Native commands of the R15K Arcade device plugin on iOS.
class DevicePlugin: Plugin {
  /// Disables the idle timer while enabled, so the screen stays on during a round.
  @objc public func setKeepAwake(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ToggleArgs.self)
    DispatchQueue.main.async {
      UIApplication.shared.isIdleTimerDisabled = args.enabled
      invoke.resolve()
    }
  }
}

/// Creates the plugin instance; the Rust side of the plugin calls this entry point once.
@_cdecl("init_plugin_device")
public func initPlugin() -> Plugin {
  return DevicePlugin()
}

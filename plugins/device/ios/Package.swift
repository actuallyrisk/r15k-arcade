// swift-tools-version:5.9
// R15K Arcade – Swift package of the "device" Tauri plugin for iOS. The plugin's Rust build
// script copies Tauri's Swift API to ../.tauri/tauri-api and links this package's static library
// into the app, so the library product carries the crate name.
import PackageDescription

let package = Package(
  name: "tauri-plugin-device",
  platforms: [.iOS(.v16)],
  products: [.library(name: "tauri-plugin-device", type: .static, targets: ["DevicePlugin"])],
  dependencies: [.package(name: "Tauri", path: "../.tauri/tauri-api")],
  targets: [.target(name: "DevicePlugin", dependencies: [.byName(name: "Tauri")])]
)

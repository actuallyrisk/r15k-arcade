# R15K Arcade – R8 rules that ship with the "device" plugin library and apply to the app's
# release build: Tauri creates DevicePlugin and calls its @Command methods by name, and Jackson
# fills ToggleArgs through its setters, so neither may be renamed or removed.
-keep class dev.r15k.arcade.device.DevicePlugin { public <init>(...); public <methods>; }
-keep class dev.r15k.arcade.device.ToggleArgs { *; }

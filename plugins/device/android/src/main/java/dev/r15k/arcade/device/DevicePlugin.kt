// R15K Arcade – Android side of the "device" Tauri plugin: immersive mode, keep-awake and move
// to background for the main activity, with platform APIs only. Tauri calls the @Command methods
// by name (the snake_case command becomes the lowerCamelCase method), so consumer-rules.pro keeps
// them through R8. Each command logs one line with the tag R15KDevice, which the emulator smoke
// test in CI reads.

package dev.r15k.arcade.device

import android.app.Activity
import android.os.Build
import android.util.Log
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin

private const val LOG_TAG = "R15KDevice"

/** Arguments of setImmersive and setKeepAwake; the wire key `enabled` is sent by the web app. */
@InvokeArg
class ToggleArgs {
    var enabled: Boolean = false
}

/** Native commands of the R15K Arcade device plugin on Android. */
@TauriPlugin
class DevicePlugin(
    private val activity: Activity,
) : Plugin(activity) {
    /** Hides or shows the system bars; while hidden, a swipe shows them for a moment. */
    @Command
    fun setImmersive(invoke: Invoke) {
        val args = invoke.parseArgs(ToggleArgs::class.java)
        Log.i(LOG_TAG, "setImmersive ${args.enabled}")
        activity.runOnUiThread {
            applyImmersive(args.enabled)
            invoke.resolve()
        }
    }

    /** Keeps the screen on while enabled (during rounds). */
    @Command
    fun setKeepAwake(invoke: Invoke) {
        val args = invoke.parseArgs(ToggleArgs::class.java)
        Log.i(LOG_TAG, "setKeepAwake ${args.enabled}")
        activity.runOnUiThread {
            val flag = WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            if (args.enabled) {
                activity.window.addFlags(flag)
            } else {
                activity.window.clearFlags(flag)
            }
            invoke.resolve()
        }
    }

    /** Moves the app to the background, as the back button does on a root screen. */
    @Command
    fun moveToBackground(invoke: Invoke) {
        Log.i(LOG_TAG, "moveToBackground")
        activity.runOnUiThread {
            activity.moveTaskToBack(true)
            invoke.resolve()
        }
    }

    /** Hides or shows the status and navigation bars with the API of Android 11 and later. */
    private fun applyImmersive(isEnabled: Boolean) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            applyLegacyImmersive(isEnabled)
            return
        }
        val controller = activity.window.insetsController ?: return
        controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        if (isEnabled) {
            controller.hide(WindowInsets.Type.systemBars())
        } else {
            controller.show(WindowInsets.Type.systemBars())
        }
    }

    /**
     * Android 9 and 10 have no WindowInsetsController, so the deprecated system UI flags are the
     * only way to hide the bars there. Only the hide flags are toggled; the layout flags that
     * edge-to-edge display sets stay untouched.
     */
    @Suppress("DEPRECATION")
    private fun applyLegacyImmersive(isEnabled: Boolean) {
        val decorView = activity.window.decorView
        val hideBars = View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_FULLSCREEN
        val hideFlags = hideBars or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        val flags = decorView.systemUiVisibility
        decorView.systemUiVisibility = if (isEnabled) flags or hideFlags else flags and hideFlags.inv()
    }
}

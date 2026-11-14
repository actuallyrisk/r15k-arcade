// R15K Arcade – Android library of the "device" Tauri plugin. The Android Gradle and Kotlin
// plugin versions come from the generated app project, which includes this library through
// Tauri's plugin mechanism. Its only dependency is Tauri's own Android library, so there are no
// extra versions to pin.
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "dev.r15k.arcade.device"
    compileSdk = 36

    defaultConfig {
        minSdk = 28
        consumerProguardFiles("consumer-rules.pro")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_17
    }
}

dependencies {
    implementation(project(":tauri-android"))
}

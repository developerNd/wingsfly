# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native specific rules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native HTML to PDF
-keep class io.github.elyx0.rnhtmltopdf.** { *; }
-keep class com.github.barteksc.pdfviewer.** { *; }
-dontwarn io.github.elyx0.rnhtmltopdf.**

# PDFBox and related libraries - FIX for R8 errors
-keep class com.tom_roush.pdfbox.** { *; }
-keep class org.apache.pdfbox.** { *; }
-dontwarn com.tom_roush.pdfbox.**
-dontwarn org.apache.pdfbox.**
-dontwarn com.gemalto.jp2.JP2Decoder
-dontwarn org.bouncycastle.**
-dontwarn org.apache.commons.**

# React Native FS (File System)
-keep class com.rnfs.** { *; }
-dontwarn com.rnfs.**

# React Native Share
-keep class cl.json.** { *; }
-keep class cl.json.social.** { *; }
-dontwarn cl.json.**

# WebView related (needed for PDF generation)
-keep class android.webkit.** { *; }
-keep class * extends android.webkit.WebViewClient
-keep class * extends android.webkit.WebChromeClient

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep R class and subclasses
-keep class **.R$* {
    <fields>;
}

# Keep custom classes that might be used via reflection
-keep class * extends java.lang.Exception

# Networking (if your app makes API calls)
-dontwarn okio.**
-dontwarn retrofit2.**
-dontwarn okhttp3.**
-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# JSON serialization
-keepattributes *Annotation*
-keepclassmembers class ** {
    @com.fasterxml.jackson.annotation.JsonProperty <fields>;
    @com.fasterxml.jackson.annotation.JsonProperty <methods>;
}

# Keep classes that might be accessed via JNI
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.common.** { *; }

# Vector Icons (if you're using them)
-keep class com.oblador.vectoricons.** { *; }

# Navigation (React Navigation)
-keep class com.reactnavigation.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }

# AsyncStorage (if used)
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Permissions (React Native Permissions)
-keep class com.zoontek.rnpermissions.** { *; }

# Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.reanimated.** { *; }

# General Android components
-keep class * extends android.app.Activity
-keep class * extends android.app.Service
-keep class * extends android.content.BroadcastReceiver
-keep class * extends android.content.ContentProvider

# Keep Serializable classes
-keepnames class * implements java.io.Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep Parcelable classes
-keepnames class * implements android.os.Parcelable
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Remove debug logs in release builds
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}

# Keep annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Crashlytics (if using Firebase Crashlytics)
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# If you're using Hermes
-keep class com.facebook.hermes.reactexecutor.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# Additional PDF generation related rules
-keep class org.apache.** { *; }
-dontwarn org.apache.**

# HTML rendering related
-keep class com.android.webview.** { *; }
-keep class android.print.** { *; }

# File operations
-keep class java.io.** { *; }
-keep class java.nio.** { *; }

# Additional rules to handle missing classes in R8
-dontwarn java.awt.**
-dontwarn javax.swing.**
-dontwarn sun.java2d.**
-dontwarn java.beans.**
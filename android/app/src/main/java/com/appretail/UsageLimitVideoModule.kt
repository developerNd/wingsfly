package com.wingsfly

import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

class UsageLimitVideoModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val sharedPreferences: SharedPreferences = reactContext.getSharedPreferences(
        "UsageLimitVideo",
        Context.MODE_PRIVATE
    )

    override fun getName(): String {
        return "UsageLimitVideoModule"
    }

    /**
     * Save video data to SharedPreferences
     * Called from React Native after fetching video
     */
    @ReactMethod
    fun saveVideoData(videoUrl: String, videoName: String, timestamp: Double, promise: Promise) {
        try {
            val editor = sharedPreferences.edit()
            editor.putString("video_url", videoUrl)
            editor.putString("video_name", videoName)
            editor.putLong("last_fetched", timestamp.toLong())
            editor.apply()
            
            android.util.Log.d("UsageLimitVideo", "✅ Video data saved: $videoName")
            android.util.Log.d("UsageLimitVideo", "📍 URL: $videoUrl")
            
            promise.resolve(true)
        } catch (e: Exception) {
            android.util.Log.e("UsageLimitVideo", "❌ Error saving video data: ${e.message}", e)
            promise.reject("SAVE_ERROR", "Failed to save video data: ${e.message}")
        }
    }

    /**
     * Get cached video data from SharedPreferences
     */
    @ReactMethod
    fun getVideoData(promise: Promise) {
        try {
            val videoUrl = sharedPreferences.getString("video_url", "") ?: ""
            val videoName = sharedPreferences.getString("video_name", "") ?: ""
            val lastFetched = sharedPreferences.getLong("last_fetched", 0L)
            
            val result: WritableMap = Arguments.createMap()
            result.putString("videoUrl", videoUrl)
            result.putString("videoName", videoName)
            result.putBoolean("hasVideo", videoUrl.isNotEmpty())
            result.putDouble("lastFetched", lastFetched.toDouble())
            
            if (videoUrl.isNotEmpty()) {
                android.util.Log.d("UsageLimitVideo", "📦 Retrieved cached video: $videoName")
            } else {
                android.util.Log.d("UsageLimitVideo", "⚠️ No cached video found")
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            android.util.Log.e("UsageLimitVideo", "❌ Error getting video data: ${e.message}", e)
            promise.reject("GET_ERROR", "Failed to get video data: ${e.message}")
        }
    }
    
    /**
     * Clear all cached video data
     */
    @ReactMethod
    fun clearVideoCache(promise: Promise) {
        try {
            val editor = sharedPreferences.edit()
            editor.clear()
            editor.apply()
            
            android.util.Log.d("UsageLimitVideo", "🗑️ Video cache cleared")
            
            promise.resolve(true)
        } catch (e: Exception) {
            android.util.Log.e("UsageLimitVideo", "❌ Error clearing cache: ${e.message}", e)
            promise.reject("CLEAR_ERROR", "Failed to clear cache: ${e.message}")
        }
    }

    /**
     * Check if video cache exists
     */
    @ReactMethod
    fun hasCachedVideo(promise: Promise) {
        try {
            val videoUrl = sharedPreferences.getString("video_url", "") ?: ""
            val hasVideo = videoUrl.isNotEmpty()
            
            promise.resolve(hasVideo)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", "Failed to check cache: ${e.message}")
        }
    }
}
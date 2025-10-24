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
    
    @ReactMethod
    fun saveVideoData(
        videoFilePath: String,
        videoFileName: String,
        youtubeLink: String,
        promise: Promise
    ) {
        try {
            val editor = sharedPreferences.edit()
            editor.putString("video_file_path", videoFilePath)
            editor.putString("video_file_name", videoFileName)
            editor.putString("youtube_link", youtubeLink)
            editor.apply()
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SAVE_ERROR", "Failed to save video data: ${e.message}")
        }
    }
    
    @ReactMethod
    fun getVideoData(promise: Promise) {
        try {
            val videoFilePath = sharedPreferences.getString("video_file_path", "") ?: ""
            val videoFileName = sharedPreferences.getString("video_file_name", "") ?: ""
            val youtubeLink = sharedPreferences.getString("youtube_link", "") ?: ""
            
            val result: WritableMap = Arguments.createMap()
            result.putString("videoFilePath", videoFilePath)
            result.putString("videoFileName", videoFileName)
            result.putString("youtubeLink", youtubeLink)
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("GET_ERROR", "Failed to get video data: ${e.message}")
        }
    }
}
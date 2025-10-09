package com.wingsfly

import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import android.util.Log
import android.content.Intent

class UserDataModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val sharedPreferences: SharedPreferences = 
        reactContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
    
    companion object {
        private const val TAG = "UserDataModule"
    }

    override fun getName(): String {
        return "UserDataModule"
    }

    @ReactMethod
    fun saveUserData(userData: ReadableMap, promise: Promise) {
        try {
            val editor = sharedPreferences.edit()
            
            Log.d(TAG, "Saving user data: ${userData.toString()}")
            
            // Save user data with various key formats that the service expects
            if (userData.hasKey("username")) {
                val username = userData.getString("username")
                Log.d(TAG, "Saving username: $username")
                editor.putString("username", username)
                editor.putString("user_name", username)
                // Also save as display_name if display_name is not provided
                if (!userData.hasKey("display_name") || userData.getString("display_name").isNullOrEmpty()) {
                    editor.putString("display_name", username)
                }
            }
            
            if (userData.hasKey("display_name")) {
                val displayName = userData.getString("display_name")
                Log.d(TAG, "Saving display_name: $displayName")
                editor.putString("display_name", displayName)
                editor.putString("user_display_name", displayName)
                // If no username, use display_name as username too
                if (!userData.hasKey("username") || userData.getString("username").isNullOrEmpty()) {
                    editor.putString("username", displayName)
                    editor.putString("user_name", displayName)
                }
            }
            
            if (userData.hasKey("email")) {
                val email = userData.getString("email")
                Log.d(TAG, "Saving email: $email")
                editor.putString("user_email", email)
                
                // If no username or display_name, derive from email
                if ((!userData.hasKey("username") || userData.getString("username").isNullOrEmpty()) &&
                    (!userData.hasKey("display_name") || userData.getString("display_name").isNullOrEmpty())) {
                    val emailUsername = email?.split("@")?.get(0) ?: "User"
                    editor.putString("username", emailUsername)
                    editor.putString("user_name", emailUsername)
                    editor.putString("display_name", emailUsername)
                }
            }
            
            if (userData.hasKey("phone")) {
                editor.putString("user_phone", userData.getString("phone"))
            }
            
            // Save user metadata if present
            if (userData.hasKey("user_metadata")) {
                val userMetadata = userData.getMap("user_metadata")
                userMetadata?.let { metadata ->
                    if (metadata.hasKey("username")) {
                        val metaUsername = metadata.getString("username")
                        editor.putString("user_metadata_username", metaUsername)
                        Log.d(TAG, "Saving user_metadata_username: $metaUsername")
                    }
                    if (metadata.hasKey("display_name")) {
                        val metaDisplayName = metadata.getString("display_name")
                        editor.putString("user_metadata_display_name", metaDisplayName)
                        Log.d(TAG, "Saving user_metadata_display_name: $metaDisplayName")
                    }
                    if (metadata.hasKey("full_name")) {
                        val metaFullName = metadata.getString("full_name")
                        editor.putString("user_metadata_full_name", metaFullName)
                        Log.d(TAG, "Saving user_metadata_full_name: $metaFullName")
                    }
                }
            }
            
            // Mark user as logged in with timestamp
            editor.putBoolean("user_logged_in", true)
            editor.putLong("login_timestamp", System.currentTimeMillis())
            
            // Apply changes
            val success = editor.commit() // Use commit instead of apply for immediate persistence
            
            if (success) {
                Log.d(TAG, "User data saved successfully to SharedPreferences")
                
                // Log what was actually saved for debugging
                logSavedUserData()
                
                // Update the service notification immediately
                updateServiceNotification()
                
                promise.resolve("User data saved successfully")
            } else {
                Log.e(TAG, "Failed to save user data to SharedPreferences")
                promise.reject("SAVE_ERROR", "Failed to save user data to SharedPreferences")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error saving user data: ${e.message}", e)
            promise.reject("SAVE_ERROR", "Failed to save user data: ${e.message}")
        }
    }

    @ReactMethod
    fun clearUserData(promise: Promise) {
        try {
            val editor = sharedPreferences.edit()
            
            // Clear all user-related data
            val keysToRemove = listOf(
                "username", "user_name", "display_name", "user_display_name",
                "user_email", "user_phone", "user_metadata_username",
                "user_metadata_display_name", "user_metadata_full_name",
                "user_logged_in", "login_timestamp"
            )
            
            keysToRemove.forEach { key ->
                editor.remove(key)
            }
            
            val success = editor.commit() // Use commit for immediate persistence
            
            if (success) {
                Log.d(TAG, "User data cleared successfully")
                
                // Update the service notification immediately
                updateServiceNotification()
                
                promise.resolve("User data cleared successfully")
            } else {
                Log.e(TAG, "Failed to clear user data from SharedPreferences")
                promise.reject("CLEAR_ERROR", "Failed to clear user data from SharedPreferences")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing user data: ${e.message}", e)
            promise.reject("CLEAR_ERROR", "Failed to clear user data: ${e.message}")
        }
    }

    @ReactMethod
    fun getUserData(promise: Promise) {
        try {
            // Create a WritableMap which is the correct type for React Native bridge
            val userData: WritableMap = WritableNativeMap()
            
            // Add data to WritableMap
            userData.putString("username", sharedPreferences.getString("username", null))
            userData.putString("display_name", sharedPreferences.getString("display_name", null))
            userData.putString("user_email", sharedPreferences.getString("user_email", null))
            userData.putString("user_phone", sharedPreferences.getString("user_phone", null))
            userData.putBoolean("user_logged_in", sharedPreferences.getBoolean("user_logged_in", false))
            userData.putDouble("login_timestamp", sharedPreferences.getLong("login_timestamp", 0).toDouble())
            
            Log.d(TAG, "Retrieved user data successfully")
            
            promise.resolve(userData)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting user data: ${e.message}", e)
            promise.reject("GET_ERROR", "Failed to get user data: ${e.message}")
        }
    }

    @ReactMethod
    fun updateServiceNotification(promise: Promise) {
        try {
            updateServiceNotification()
            promise.resolve("Notification updated")
        } catch (e: Exception) {
            promise.reject("UPDATE_ERROR", "Failed to update notification: ${e.message}")
        }
    }

    // Overloaded method without promise for internal use
    @ReactMethod
    fun updateServiceNotification() {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, AppLockService::class.java)
            intent.putExtra("refresh_notification", true)
            
            // Add a small delay to ensure SharedPreferences are fully written
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                try {
                    context.startService(intent)
                    Log.d(TAG, "Service notification update requested")
                } catch (e: Exception) {
                    Log.e(TAG, "Error starting service for notification update: ${e.message}", e)
                }
            }, 100) // 100ms delay
            
        } catch (e: Exception) {
            Log.e(TAG, "Error updating service notification: ${e.message}", e)
        }
    }
    
    // Helper method to log what was actually saved (for debugging)
    private fun logSavedUserData() {
        try {
            val allKeys = listOf(
                "username", "user_name", "display_name", "user_display_name",
                "user_email", "user_phone", "user_metadata_username",
                "user_metadata_display_name", "user_metadata_full_name",
                "user_logged_in", "login_timestamp"
            )
            
            Log.d(TAG, "=== SAVED USER DATA DEBUG ===")
            allKeys.forEach { key ->
                when (key) {
                    "user_logged_in" -> {
                        val value = sharedPreferences.getBoolean(key, false)
                        Log.d(TAG, "$key = $value")
                    }
                    "login_timestamp" -> {
                        val value = sharedPreferences.getLong(key, 0)
                        Log.d(TAG, "$key = $value")
                    }
                    else -> {
                        val value = sharedPreferences.getString(key, null)
                        if (value != null) {
                            Log.d(TAG, "$key = $value")
                        }
                    }
                }
            }
            Log.d(TAG, "=== END SAVED USER DATA DEBUG ===")
        } catch (e: Exception) {
            Log.e(TAG, "Error logging saved user data: ${e.message}", e)
        }
    }
}
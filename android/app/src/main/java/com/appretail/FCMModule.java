package com.wingsfly;

import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.messaging.FirebaseMessaging;

public class FCMModule extends ReactContextBaseJavaModule {
    private static final String TAG = "FCMModule";

    public FCMModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "FCMModule";
    }

    /**
     * Get the current FCM token
     */
    @ReactMethod
    public void getToken(final Promise promise) {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(new OnCompleteListener<String>() {
                @Override
                public void onComplete(@NonNull Task<String> task) {
                    if (!task.isSuccessful()) {
                        Log.e(TAG, "❌ Fetching FCM token failed", task.getException());
                        promise.reject("TOKEN_ERROR", "Failed to get FCM token", task.getException());
                        return;
                    }

                    // Get the FCM token
                    String token = task.getResult();
                    Log.d(TAG, "✅ FCM Token retrieved: " + token);
                    promise.resolve(token);
                }
            });
    }

    /**
     * Delete the current FCM token (for testing or logout)
     */
    @ReactMethod
    public void deleteToken(final Promise promise) {
        FirebaseMessaging.getInstance().deleteToken()
            .addOnCompleteListener(new OnCompleteListener<Void>() {
                @Override
                public void onComplete(@NonNull Task<Void> task) {
                    if (task.isSuccessful()) {
                        Log.d(TAG, "✅ FCM Token deleted");
                        promise.resolve("Token deleted successfully");
                    } else {
                        Log.e(TAG, "❌ Failed to delete FCM token", task.getException());
                        promise.reject("DELETE_ERROR", "Failed to delete FCM token", task.getException());
                    }
                }
            });
    }

    /**
     * Check if FCM is supported and auto-init is enabled
     */
    @ReactMethod
    public void isAutoInitEnabled(final Promise promise) {
        boolean isEnabled = FirebaseMessaging.getInstance().isAutoInitEnabled();
        Log.d(TAG, "FCM Auto-init enabled: " + isEnabled);
        promise.resolve(isEnabled);
    }

    /**
     * Enable/disable FCM auto-initialization
     */
    @ReactMethod
    public void setAutoInitEnabled(boolean enabled, final Promise promise) {
        try {
            FirebaseMessaging.getInstance().setAutoInitEnabled(enabled);
            Log.d(TAG, "✅ FCM Auto-init set to: " + enabled);
            promise.resolve("Auto-init set to: " + enabled);
        } catch (Exception e) {
            Log.e(TAG, "❌ Error setting auto-init", e);
            promise.reject("SET_AUTO_INIT_ERROR", "Failed to set auto-init", e);
        }
    }
}
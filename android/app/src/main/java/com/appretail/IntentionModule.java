package com.wingsfly;

import android.content.Context;
import android.content.SharedPreferences;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

public class IntentionModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "IntentionModule";
    private static final String PREFS_NAME = "IntentionPrefs";
    private static final String KEY_INTENTION_TEXT = "intention_text";
    private static final String KEY_AUDIO_FILE_PATH = "intention_audio_path";
    private static final String KEY_AUDIO_FILE_NAME = "intention_audio_name";
    
    private ReactApplicationContext reactContext;
    
    public IntentionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }
    
    @Override
    public String getName() {
        return "IntentionModule";
    }
    
    /**
     * Save intention data - supports both text and audio file
     */
    @ReactMethod
    public void saveIntentionData(String text, String audioFilePath, String audioFileName, Promise promise) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            // Save text (empty if using audio)
            editor.putString(KEY_INTENTION_TEXT, text != null ? text : "");
            
            // Save audio file info (empty if using text)
            editor.putString(KEY_AUDIO_FILE_PATH, audioFilePath != null ? audioFilePath : "");
            editor.putString(KEY_AUDIO_FILE_NAME, audioFileName != null ? audioFileName : "");
            
            editor.apply();
            
            android.util.Log.d(TAG, "Intention saved - Text: " + (text != null && !text.isEmpty()) + 
                              ", Audio: " + (audioFilePath != null && !audioFilePath.isEmpty()));
            
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SAVE_ERROR", e.getMessage());
        }
    }
    
    /**
     * Get intention data - returns object with text, audioFilePath, audioFileName
     */
    @ReactMethod
    public void getIntentionData(Promise promise) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            
            String text = prefs.getString(KEY_INTENTION_TEXT, "");
            String audioFilePath = prefs.getString(KEY_AUDIO_FILE_PATH, "");
            String audioFileName = prefs.getString(KEY_AUDIO_FILE_NAME, "");
            
            WritableMap result = Arguments.createMap();
            result.putString("text", text);
            result.putString("audioFilePath", audioFilePath);
            result.putString("audioFileName", audioFileName);
            
            android.util.Log.d(TAG, "Retrieved intention - Text: " + !text.isEmpty() + 
                              ", Audio: " + !audioFilePath.isEmpty());
            
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("GET_ERROR", e.getMessage());
        }
    }
    
    /**
     * DEPRECATED: Use saveIntentionData() instead
     */
    @ReactMethod
    public void saveIntentionCommand(String commandText, Promise promise) {
        saveIntentionData(commandText, "", "", promise);
    }
    
    /**
     * DEPRECATED: Use getIntentionData() instead
     */
    @ReactMethod
    public void getIntentionCommand(Promise promise) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String command = prefs.getString(KEY_INTENTION_TEXT, "");
            promise.resolve(command);
        } catch (Exception e) {
            promise.reject("GET_ERROR", e.getMessage());
        }
    }
}
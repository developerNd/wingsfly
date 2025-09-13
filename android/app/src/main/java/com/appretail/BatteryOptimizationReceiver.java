package com.wingsfly;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

public class BatteryOptimizationReceiver extends BroadcastReceiver {
    
    private static final String TAG = "BatteryOptimizationReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "Received action: " + action);
        
        if (action != null) {
            if ("android.os.action.DEVICE_IDLE_MODE_CHANGED".equals(action)) {
                handleDozeMode(context);
            } else if ("android.os.action.POWER_SAVE_MODE_CHANGED".equals(action)) {
                handlePowerSaveMode(context);
            } else {
                Log.d(TAG, "Unhandled action: " + action);
            }
        }
    }
    
    private void handleDozeMode(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                boolean isDozing = powerManager.isDeviceIdleMode();
                Log.d(TAG, "Device idle mode (Doze): " + isDozing);
                
                if (isDozing) {
                    Log.d(TAG, "Device entered Doze mode - alarms may be affected");
                    // Could notify the app or take preventive measures
                }
            }
        }
    }
    
    private void handlePowerSaveMode(Context context) {
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            boolean isPowerSaveMode = powerManager.isPowerSaveMode();
            Log.d(TAG, "Power save mode: " + isPowerSaveMode);
            
            if (isPowerSaveMode) {
                Log.d(TAG, "Device in power save mode - background activity restricted");
            }
        }
    }
    
    // Static method to check if app is whitelisted from battery optimization
    public static boolean isBatteryOptimizationDisabled(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                String packageName = context.getPackageName();
                boolean isIgnored = powerManager.isIgnoringBatteryOptimizations(packageName);
                Log.d(TAG, "Battery optimization ignored: " + isIgnored);
                return isIgnored;
            }
        }
        return true; // Assume no restrictions on older versions
    }
    
    // Static method to request battery optimization whitelist
    public static void requestBatteryOptimizationWhitelist(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!isBatteryOptimizationDisabled(context)) {
                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(android.net.Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    Log.d(TAG, "Requested battery optimization whitelist");
                } catch (Exception e) {
                    Log.e(TAG, "Error requesting battery optimization whitelist", e);
                }
            }
        }
    }
}
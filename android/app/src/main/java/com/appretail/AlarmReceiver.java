package com.wingsfly;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.app.NotificationChannel;
import android.app.Notification;
import android.app.PendingIntent;

public class AlarmReceiver extends BroadcastReceiver {
    
    private static final String TAG = "AlarmReceiver";
    private static final String AGGRESSIVE_CHANNEL_ID = "aggressive_fullscreen_channel";
    private static final int AGGRESSIVE_NOTIFICATION_ID = 3001;
    
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "SIMPLE AlarmReceiver triggered - ACTIVITY ONLY (no service to prevent duplicates)");
        
        try {
            String alarmId = intent.getStringExtra("alarmId");
            String taskTitle = intent.getStringExtra("taskTitle");
            String taskMessage = intent.getStringExtra("taskMessage");
            String taskId = intent.getStringExtra("taskId");
            String ttsMessage = intent.getStringExtra("ttsMessage");
            String userName = intent.getStringExtra("userName");
            boolean useElevenLabs = intent.getBooleanExtra("useElevenLabs", false);
            
            if (alarmId == null) {
                Log.e(TAG, "No alarm ID provided");
                return;
            }
            
            Log.d(TAG, "SIMPLE LAUNCH for alarm: " + alarmId);
            Log.d(TAG, "ElevenLabs enabled: " + useElevenLabs);
            
            // Check current audio status through singleton
            ElevenLabsNativeServiceSingleton audioSingleton = ElevenLabsNativeServiceSingleton.getInstance();
            Log.d(TAG, "Current audio status: " + audioSingleton.getStatus());
            
            // Fallback TTS message
            if (ttsMessage == null || ttsMessage.trim().isEmpty()) {
                ttsMessage = String.format("%s, your task %s is ready. Are you available?", 
                    userName != null ? userName.trim() : "Hello there", 
                    taskTitle != null ? taskTitle : "");
            }
            
            // STEP 1: Brief wake lock for screen activation
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wakeLock = null;
            
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                    PowerManager.ON_AFTER_RELEASE,
                    "SimpleAlarm:FORCE_SCREEN"
                );
                wakeLock.acquire(2 * 60 * 1000L); // 2 minutes only
                Log.d(TAG, "Simple wake lock acquired");
            }
            
            KeyguardManager keyguardManager = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
            boolean isLocked = keyguardManager != null && keyguardManager.isKeyguardLocked();
            
            // STEP 2: Create notification channel
            createSimpleFullScreenChannel(context);
            
            // STEP 3: SINGLE ACTIVITY LAUNCH ONLY - no service, no backups
            launchSingleActivityOnly(context, alarmId, taskTitle, taskMessage, 
                                   taskId, ttsMessage, userName, isLocked, useElevenLabs);
            
            // STEP 4: Backup notification (but still no service)
            createSimpleFullScreenNotification(context, alarmId, taskTitle, taskMessage, 
                                             taskId, ttsMessage, userName, isLocked, useElevenLabs);
            
            // STEP 5: NO SERVICE - Release wake lock after short delay
            final PowerManager.WakeLock fWakeLock = wakeLock;
            if (fWakeLock != null) {
                android.os.Handler handler = new android.os.Handler();
                handler.postDelayed(() -> {
                    try {
                        if (fWakeLock.isHeld()) {
                            fWakeLock.release();
                            Log.d(TAG, "Simple wake lock released");
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error releasing wake lock", e);
                    }
                }, 30000); // Release after 30 seconds
            }
            
        } catch (Exception e) {
            Log.e(TAG, "CRITICAL ERROR in simple alarm launch", e);
        }
    }
    
    private void launchSingleActivityOnly(Context context, String alarmId, String taskTitle, 
                                        String taskMessage, String taskId, String ttsMessage, 
                                        String userName, boolean isLocked, boolean useElevenLabs) {
        
        Log.d(TAG, "SINGLE ACTIVITY LAUNCH ONLY - no service, no backups");
        
        try {
            Intent activityIntent = new Intent(context, AlarmActivity.class);
            activityIntent.putExtra("alarmId", alarmId);
            activityIntent.putExtra("taskTitle", taskTitle);
            activityIntent.putExtra("taskMessage", taskMessage);
            activityIntent.putExtra("taskId", taskId);
            activityIntent.putExtra("isDeviceLocked", isLocked);
            activityIntent.putExtra("alarmType", "VOICE_ONLY");
            activityIntent.putExtra("launchedFrom", "SIMPLE_LAUNCH");
            activityIntent.putExtra("ttsMessage", ttsMessage);
            activityIntent.putExtra("userName", userName);
            activityIntent.putExtra("useElevenLabs", useElevenLabs);
            
            // Single top to prevent multiple instances
            activityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT |
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            );
            
            context.startActivity(activityIntent);
            Log.d(TAG, "✅ SINGLE ACTIVITY LAUNCHED - no service (ElevenLabs: " + useElevenLabs + ")");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ SINGLE ACTIVITY LAUNCH FAILED: " + e.getMessage());
        }
    }
    
    private void createSimpleFullScreenChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                AGGRESSIVE_CHANNEL_ID,
                "Simple Full Screen Alarms",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Simple full screen alarm notifications");
            channel.setSound(null, null);
            channel.enableVibration(false);
            channel.setBypassDnd(true);
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            
            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                Log.d(TAG, "Simple full-screen channel created");
            }
        }
    }
    
    private void createSimpleFullScreenNotification(Context context, String alarmId, String taskTitle, 
                                                  String taskMessage, String taskId, String ttsMessage, 
                                                  String userName, boolean isLocked, boolean useElevenLabs) {
        
        Log.d(TAG, "Creating simple full-screen notification (backup only)");
        
        try {
            Intent fullScreenIntent = new Intent(context, AlarmActivity.class);
            fullScreenIntent.putExtra("alarmId", alarmId);
            fullScreenIntent.putExtra("taskTitle", taskTitle);
            fullScreenIntent.putExtra("taskMessage", taskMessage);
            fullScreenIntent.putExtra("taskId", taskId);
            fullScreenIntent.putExtra("isDeviceLocked", isLocked);
            fullScreenIntent.putExtra("alarmType", "VOICE_ONLY");
            fullScreenIntent.putExtra("launchedFrom", "BACKUP_NOTIFICATION");
            fullScreenIntent.putExtra("ttsMessage", ttsMessage);
            fullScreenIntent.putExtra("userName", userName);
            fullScreenIntent.putExtra("useElevenLabs", useElevenLabs);
            
            // SINGLE_TOP to prevent multiple activities
            fullScreenIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_NO_USER_ACTION |
                Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT
            );
            
            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                context, 
                alarmId.hashCode() + 1000, 
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            PendingIntent contentPendingIntent = PendingIntent.getActivity(
                context,
                alarmId.hashCode() + 2000,
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            String title = "ALARM: " + (taskTitle != null ? taskTitle : "Task Ready");
            String text = ttsMessage.length() > 50 ? ttsMessage.substring(0, 50) + "..." : ttsMessage;
            
            if (useElevenLabs) {
                text += " [Single Audio]";
            }
            
            Notification.Builder builder = new Notification.Builder(context);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder.setChannelId(AGGRESSIVE_CHANNEL_ID);
            }
            
            builder.setSmallIcon(android.R.drawable.ic_dialog_alert)
                   .setContentTitle(title)
                   .setContentText(text)
                   .setPriority(Notification.PRIORITY_MAX)
                   .setCategory(Notification.CATEGORY_ALARM)
                   .setVisibility(Notification.VISIBILITY_PUBLIC)
                   .setOngoing(true)
                   .setAutoCancel(false)
                   .setContentIntent(contentPendingIntent)
                   .setFullScreenIntent(fullScreenPendingIntent, true)
                   .setDefaults(0)
                   .setTimeoutAfter(30000); // Auto-remove after 30 seconds
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                builder.setColor(0xFFFF0000)
                       .setSound(null);
            }
            
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.notify(AGGRESSIVE_NOTIFICATION_ID, builder.build());
                Log.d(TAG, "Simple notification posted (ElevenLabs: " + useElevenLabs + ")");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "CRITICAL: Simple notification creation failed", e);
        }
    }
}
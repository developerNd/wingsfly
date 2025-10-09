package com.wingsfly;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

public class CustomAlarmService extends Service {
    
    private static final String TAG = "CustomAlarmService";
    private static final String CHANNEL_ID = "custom_alarm_channel";
    private static final int NOTIFICATION_ID = 2001;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Custom alarm service created");
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Custom alarm service started");
        
        if (intent != null) {
            String action = intent.getStringExtra("serviceAction");
            String alarmId = intent.getStringExtra("alarmId");
            
            if ("START_CUSTOM_ALARM".equals(action) && alarmId != null) {
                handleCustomAlarm(intent);
            } else if ("STOP_CUSTOM_ALARM".equals(action) && alarmId != null) {
                stopAlarmService(alarmId);
            }
        }
        
        return START_NOT_STICKY; // Don't restart if killed
    }
    
    private void handleCustomAlarm(Intent intent) {
        String alarmId = intent.getStringExtra("alarmId");
        String time = intent.getStringExtra("time");
        String label = intent.getStringExtra("label");
        String days = intent.getStringExtra("days");
        String userId = intent.getStringExtra("userId");
        boolean isDeviceLocked = intent.getBooleanExtra("isDeviceLocked", false);
        boolean isSnooze = intent.getBooleanExtra("isSnooze", false);
        
        // NEW: Extract custom tone data
        String toneType = intent.getStringExtra("toneType");
        String customToneUri = intent.getStringExtra("customToneUri");
        String customToneName = intent.getStringExtra("customToneName");
        
        Log.d(TAG, "Handling custom alarm in service: " + alarmId);
        Log.d(TAG, "Tone type: " + toneType + ", Custom tone: " + (customToneUri != null ? "PROVIDED" : "NULL"));
        
        // Create foreground notification
        Notification notification = createAlarmNotification(alarmId, time, label, isSnooze, toneType, customToneName);
        startForeground(NOTIFICATION_ID, notification);
        
        // Try to launch the alarm activity from service
        launchAlarmActivity(alarmId, time, label, days, userId, isDeviceLocked, isSnooze, toneType, customToneUri, customToneName);
        
        // Auto-stop service after 10 minutes
        new android.os.Handler().postDelayed(() -> {
            Log.d(TAG, "Auto-stopping custom alarm service after 10 minutes");
            stopAlarmService(alarmId);
        }, 10 * 60 * 1000);
    }
    
    private void launchAlarmActivity(String alarmId, String time, String label, String days, 
                                   String userId, boolean isDeviceLocked, boolean isSnooze,
                                   String toneType, String customToneUri, String customToneName) {
        try {
            Intent activityIntent = new Intent(this, CustomAlarmActivity.class);
            activityIntent.putExtra("alarmId", alarmId);
            activityIntent.putExtra("time", time);
            activityIntent.putExtra("label", label);
            activityIntent.putExtra("days", days);
            activityIntent.putExtra("userId", userId);
            activityIntent.putExtra("isDeviceLocked", isDeviceLocked);
            activityIntent.putExtra("isSnooze", isSnooze);
            activityIntent.putExtra("triggeredTime", System.currentTimeMillis());
            activityIntent.putExtra("launchedFrom", "SERVICE");
            
            // NEW: Pass custom tone data to activity
            activityIntent.putExtra("toneType", toneType != null ? toneType : "default");
            activityIntent.putExtra("customToneUri", customToneUri);
            activityIntent.putExtra("customToneName", customToneName);
            
            activityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            );
            
            startActivity(activityIntent);
            Log.d(TAG, "Alarm activity launched from service with tone type: " + toneType);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch alarm activity from service", e);
        }
    }
    
    private Notification createAlarmNotification(String alarmId, String time, String label, boolean isSnooze, String toneType, String customToneName) {
        // Create intent for notification tap
        Intent notificationIntent = new Intent(this, CustomAlarmActivity.class);
        notificationIntent.putExtra("alarmId", alarmId);
        notificationIntent.putExtra("time", time);
        notificationIntent.putExtra("label", label);
        notificationIntent.putExtra("triggeredTime", System.currentTimeMillis());
        notificationIntent.putExtra("launchedFrom", "NOTIFICATION");
        
        // NEW: Include tone data in notification intent
        notificationIntent.putExtra("toneType", toneType != null ? toneType : "default");
        
        notificationIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            alarmId.hashCode(), 
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Create full screen intent
        PendingIntent fullScreenIntent = PendingIntent.getActivity(
            this,
            alarmId.hashCode() + 1000,
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        String title = isSnooze ? "Alarm (Snoozed)" : "Alarm";
        String text = (label != null && !label.isEmpty()) ? label : ("Alarm for " + time);
        
        // NEW: Add tone info to notification text if custom tone
        if ("custom".equals(toneType) && customToneName != null && !customToneName.isEmpty()) {
            text += " • " + customToneName;
        }
        
        Notification.Builder builder = new Notification.Builder(this);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setChannelId(CHANNEL_ID);
        }
        
        builder.setSmallIcon(android.R.drawable.ic_dialog_alert)
               .setContentTitle(title)
               .setContentText(text)
               .setContentIntent(pendingIntent)
               .setFullScreenIntent(fullScreenIntent, true)
               .setPriority(Notification.PRIORITY_HIGH)
               .setCategory(Notification.CATEGORY_ALARM)
               .setVisibility(Notification.VISIBILITY_PUBLIC)
               .setOngoing(true)
               .setAutoCancel(false);
               
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            builder.setColor(0xFFFF0000); // Red color for alarm
        }
        
        // Add action buttons
        addNotificationActions(builder, alarmId);
        
        return builder.build();
    }
    
    private void addNotificationActions(Notification.Builder builder, String alarmId) {
        // Snooze action
        Intent snoozeIntent = new Intent(this, CustomAlarmActionReceiver.class);
        snoozeIntent.putExtra("alarmId", alarmId);
        snoozeIntent.putExtra("action", "snooze");
        
        PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
            this,
            ("snooze_" + alarmId).hashCode(),
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Stop action
        Intent stopIntent = new Intent(this, CustomAlarmActionReceiver.class);
        stopIntent.putExtra("alarmId", alarmId);
        stopIntent.putExtra("action", "stop");
        
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
            this,
            ("stop_" + alarmId).hashCode(),
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            builder.addAction(new Notification.Action.Builder(
                android.R.drawable.ic_media_pause,
                "Snooze",
                snoozePendingIntent
            ).build());
            
            builder.addAction(new Notification.Action.Builder(
                android.R.drawable.ic_delete,
                "Stop",
                stopPendingIntent
            ).build());
        }
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Custom Alarm Notifications",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for custom alarms with tone support");
            channel.setSound(null, null); // No sound, handled by activity
            channel.enableVibration(false); // No vibration, handled by activity
            channel.setBypassDnd(true);
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                Log.d(TAG, "Notification channel created with custom tone support");
            }
        }
    }
    
    public static void stopAlarmService(Context context, String alarmId) {
        try {
            Intent stopIntent = new Intent(context, CustomAlarmService.class);
            stopIntent.putExtra("serviceAction", "STOP_CUSTOM_ALARM");
            stopIntent.putExtra("alarmId", alarmId);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(stopIntent);
            } else {
                context.startService(stopIntent);
            }
            
            Log.d(TAG, "Stop service intent sent for alarm: " + alarmId);
            
        } catch (Exception e) {
            Log.e(TAG, "Error stopping custom alarm service", e);
        }
    }
    
    private void stopAlarmService(String alarmId) {
        Log.d(TAG, "Stopping custom alarm service for: " + alarmId);
        
        // Clear notification
        NotificationManager notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.cancel(NOTIFICATION_ID);
        }
        
        // Stop foreground service
        stopForeground(true);
        stopSelf();
    }
    
    @Override
    public void onDestroy() {
        Log.d(TAG, "Custom alarm service destroyed");
        super.onDestroy();
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null; // We don't provide binding
    }
}
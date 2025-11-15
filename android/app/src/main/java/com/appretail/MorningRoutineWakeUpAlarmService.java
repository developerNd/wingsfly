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

public class MorningRoutineWakeUpAlarmService extends Service {
    
    private static final String TAG = "MorningWakeUpService";
    private static final String CHANNEL_ID = "morning_wakeup_channel";
    private static final int NOTIFICATION_ID = 5001;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Morning wake-up alarm service created");
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service started");
        
        if (intent != null) {
            String action = intent.getStringExtra("serviceAction");
            String userId = intent.getStringExtra("userId");
            
            if ("START_WAKEUP_ALARM".equals(action) && userId != null) {
                handleWakeUpAlarm(intent);
            } else if ("STOP_WAKEUP_ALARM".equals(action) && userId != null) {
                stopWakeUpService(userId);
            }
        }
        
        return START_NOT_STICKY;
    }
    
    private void handleWakeUpAlarm(Intent intent) {
        String userId = intent.getStringExtra("userId");
        String name = intent.getStringExtra("name");
        String time = intent.getStringExtra("time");
        String commands = intent.getStringExtra("commands");
        boolean isDeviceLocked = intent.getBooleanExtra("isDeviceLocked", false);
        boolean isSnooze = intent.getBooleanExtra("isSnooze", false);
        
        Log.d(TAG, "Handling wake-up alarm for user: " + userId);
        
        // Create foreground notification
        Notification notification = createWakeUpNotification(userId, name, time, isSnooze);
        startForeground(NOTIFICATION_ID, notification);
        
        // Launch activity
        launchWakeUpActivity(userId, name, time, commands, isDeviceLocked, isSnooze);
        
        // Auto-stop after 2 hours
        new android.os.Handler().postDelayed(() -> {
            Log.d(TAG, "Auto-stopping service after 2 hours");
            stopWakeUpService(userId);
        }, 2 * 60 * 60 * 1000);
    }
    
    private void launchWakeUpActivity(String userId, String name, String time, 
                                      String commands, boolean isDeviceLocked, boolean isSnooze) {
        try {
            Intent activityIntent = new Intent(this, MorningRoutineWakeUpAlarmActivity.class);
            activityIntent.putExtra("userId", userId);
            activityIntent.putExtra("name", name);
            activityIntent.putExtra("time", time);
            activityIntent.putExtra("commands", commands);
            activityIntent.putExtra("isDeviceLocked", isDeviceLocked);
            activityIntent.putExtra("isSnooze", isSnooze);
            activityIntent.putExtra("triggeredTime", System.currentTimeMillis());
            activityIntent.putExtra("launchedFrom", "SERVICE");
            
            activityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            );
            
            startActivity(activityIntent);
            Log.d(TAG, "Activity launched from service");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch activity", e);
        }
    }
    
    private Notification createWakeUpNotification(String userId, String name, String time, boolean isSnooze) {
        Intent notificationIntent = new Intent(this, MorningRoutineWakeUpAlarmActivity.class);
        notificationIntent.putExtra("userId", userId);
        notificationIntent.putExtra("name", name);
        notificationIntent.putExtra("time", time);
        
        notificationIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP
        );
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            userId.hashCode(), 
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        String title = isSnooze ? "Morning Alarm (Snoozed)" : "Morning Alarm";
        String text = (name != null && !name.isEmpty()) ? name : "Time to wake up!";
        
        Notification.Builder builder = new Notification.Builder(this);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setChannelId(CHANNEL_ID);
        }
        
        builder.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
               .setContentTitle(title)
               .setContentText(text)
               .setContentIntent(pendingIntent)
               .setPriority(Notification.PRIORITY_HIGH)
               .setCategory(Notification.CATEGORY_ALARM)
               .setOngoing(true)
               .setAutoCancel(false);
        
        return builder.build();
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Morning Wake-Up Alarm",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for morning wake-up alarm");
            channel.setSound(null, null);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
    
    private void stopWakeUpService(String userId) {
        Log.d(TAG, "Stopping service for user: " + userId);
        
        NotificationManager notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.cancel(NOTIFICATION_ID);
        }
        
        stopForeground(true);
        stopSelf();
    }
    
    @Override
    public void onDestroy() {
        Log.d(TAG, "Service destroyed");
        super.onDestroy();
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
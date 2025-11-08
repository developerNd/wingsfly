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

public class MorningRoutineService extends Service {
    
    private static final String TAG = "MorningRoutineService";
    private static final String CHANNEL_ID = "morning_routine_channel";
    private static final int NOTIFICATION_ID = 4001;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Morning routine service created");
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service started");
        
        if (intent != null) {
            String action = intent.getStringExtra("serviceAction");
            String userId = intent.getStringExtra("userId");
            
            if ("START_MORNING_ROUTINE".equals(action) && userId != null) {
                handleMorningRoutine(intent);
            } else if ("STOP_MORNING_ROUTINE".equals(action) && userId != null) {
                stopRoutineService(userId);
            }
        }
        
        return START_NOT_STICKY;
    }
    
    private void handleMorningRoutine(Intent intent) {
        String userId = intent.getStringExtra("userId");
        String name = intent.getStringExtra("name");
        String time = intent.getStringExtra("time");
        String commands = intent.getStringExtra("commands");
        boolean isDeviceLocked = intent.getBooleanExtra("isDeviceLocked", false);
        int startFromIndex = intent.getIntExtra("startFromIndex", 0);
        
        Log.d(TAG, "Handling morning routine for user: " + userId);
        Log.d(TAG, "Starting from command index: " + startFromIndex);
        
        // Create foreground notification
        Notification notification = createRoutineNotification(userId, name, time);
        startForeground(NOTIFICATION_ID, notification);
        
        // Launch activity
        launchRoutineActivity(userId, name, time, commands, isDeviceLocked, startFromIndex);
        
        // Auto-stop after 2 hours
        new android.os.Handler().postDelayed(() -> {
            Log.d(TAG, "Auto-stopping service after 2 hours");
            stopRoutineService(userId);
        }, 2 * 60 * 60 * 1000);
    }
    
    private void launchRoutineActivity(String userId, String name, String time, 
                                       String commands, boolean isDeviceLocked, int startFromIndex) {
        try {
            Intent activityIntent = new Intent(this, MorningVoiceCommandActivity.class);
            activityIntent.putExtra("userId", userId);
            activityIntent.putExtra("name", name);
            activityIntent.putExtra("time", time);
            activityIntent.putExtra("commands", commands);
            activityIntent.putExtra("isDeviceLocked", isDeviceLocked);
            activityIntent.putExtra("triggeredTime", System.currentTimeMillis());
            activityIntent.putExtra("launchedFrom", "SERVICE");
            
            // CRITICAL: Pass the starting command index
            activityIntent.putExtra("startFromIndex", startFromIndex);
            
            activityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            );
            
            startActivity(activityIntent);
            Log.d(TAG, "Activity launched from service with command index: " + startFromIndex);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch activity", e);
        }
    }
    
    private Notification createRoutineNotification(String userId, String name, String time) {
        Intent notificationIntent = new Intent(this, MorningVoiceCommandActivity.class);
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
        
        String title = "Morning Routine";
        String text = (name != null && !name.isEmpty()) ? name : "Voice commands ready";
        
        Notification.Builder builder = new Notification.Builder(this);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setChannelId(CHANNEL_ID);
        }
        
        builder.setSmallIcon(android.R.drawable.ic_dialog_info)
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
                "Morning Routine",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for morning routine");
            channel.setSound(null, null);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
    
    private void stopRoutineService(String userId) {
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
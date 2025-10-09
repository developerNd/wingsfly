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

public class VoiceCommandAlarmService extends Service {
    
    private static final String TAG = "VoiceCommandAlarmService";
    private static final String CHANNEL_ID = "voice_command_alarm_channel";
    private static final int NOTIFICATION_ID = 3001;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Voice command alarm service created");
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service started");
        
        if (intent != null) {
            String action = intent.getStringExtra("serviceAction");
            String alarmId = intent.getStringExtra("alarmId");
            
            if ("START_VOICE_COMMAND_ALARM".equals(action) && alarmId != null) {
                handleVoiceCommandAlarm(intent);
            } else if ("STOP_VOICE_COMMAND_ALARM".equals(action) && alarmId != null) {
                stopAlarmService(alarmId);
            }
        }
        
        return START_NOT_STICKY;
    }
    
    private void handleVoiceCommandAlarm(Intent intent) {
        String alarmId = intent.getStringExtra("alarmId");
        String name = intent.getStringExtra("name");
        String time = intent.getStringExtra("time");
        String days = intent.getStringExtra("days");
        String commands = intent.getStringExtra("commands");
        boolean isDeviceLocked = intent.getBooleanExtra("isDeviceLocked", false);
        
        Log.d(TAG, "Handling voice command alarm: " + alarmId);
        
        // Create foreground notification
        Notification notification = createAlarmNotification(alarmId, name, time);
        startForeground(NOTIFICATION_ID, notification);
        
        // Launch alarm activity
        launchAlarmActivity(alarmId, name, time, days, commands, isDeviceLocked);
        
        // Auto-stop after 30 minutes
        new android.os.Handler().postDelayed(() -> {
            Log.d(TAG, "Auto-stopping service after 30 minutes");
            stopAlarmService(alarmId);
        }, 30 * 60 * 1000);
    }
    
    private void launchAlarmActivity(String alarmId, String name, String time, 
                                     String days, String commands, boolean isDeviceLocked) {
        try {
            Intent activityIntent = new Intent(this, VoiceCommandAlarmActivity.class);
            activityIntent.putExtra("alarmId", alarmId);
            activityIntent.putExtra("name", name);
            activityIntent.putExtra("time", time);
            activityIntent.putExtra("days", days);
            activityIntent.putExtra("commands", commands);
            activityIntent.putExtra("isDeviceLocked", isDeviceLocked);
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
    
    private Notification createAlarmNotification(String alarmId, String name, String time) {
        Intent notificationIntent = new Intent(this, VoiceCommandAlarmActivity.class);
        notificationIntent.putExtra("alarmId", alarmId);
        notificationIntent.putExtra("name", name);
        notificationIntent.putExtra("time", time);
        
        notificationIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP
        );
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            alarmId.hashCode(), 
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        String title = "Voice Command Alarm";
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
                "Voice Command Alarms",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for voice command alarms");
            channel.setSound(null, null);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
    
    private void stopAlarmService(String alarmId) {
        Log.d(TAG, "Stopping service for: " + alarmId);
        
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
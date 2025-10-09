package com.wingsfly;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

public class TaskConfirmationAlarmService extends Service {
    
    private static final String TAG = "TaskConfirmService";
    private static final String CHANNEL_ID = "task_confirmation_channel";
    private static final int NOTIFICATION_ID = 4001;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Task confirmation service created");
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service started");
        
        if (intent != null) {
            String action = intent.getStringExtra("serviceAction");
            String planId = intent.getStringExtra("planId");
            
            if ("START_TASK_CONFIRMATION".equals(action) && planId != null) {
                handleTaskConfirmation(intent);
            } else if ("STOP_TASK_CONFIRMATION".equals(action) && planId != null) {
                stopConfirmationService(planId);
            }
        }
        
        return START_NOT_STICKY;
    }
    
    private void handleTaskConfirmation(Intent intent) {
        String planId = intent.getStringExtra("planId");
        String taskTitle = intent.getStringExtra("taskTitle");
        String taskDescription = intent.getStringExtra("taskDescription");
        String startTime = intent.getStringExtra("startTime");
        String category = intent.getStringExtra("category");
        boolean isDeviceLocked = intent.getBooleanExtra("isDeviceLocked", false);
        
        Log.d(TAG, "Handling task confirmation: " + taskTitle);
        
        // Create foreground notification
        Notification notification = createConfirmationNotification(planId, taskTitle, startTime);
        startForeground(NOTIFICATION_ID, notification);
        
        // Launch confirmation activity
        launchConfirmationActivity(planId, taskTitle, taskDescription, startTime, category, isDeviceLocked);
        
        // Auto-stop after 10 minutes
        new android.os.Handler().postDelayed(() -> {
            Log.d(TAG, "Auto-stopping service after 10 minutes");
            stopConfirmationService(planId);
        }, 10 * 60 * 1000);
    }
    
    private void launchConfirmationActivity(String planId, String taskTitle, String taskDescription,
                                           String startTime, String category, boolean isDeviceLocked) {
        try {
            Intent activityIntent = new Intent(this, TaskConfirmationAlarmActivity.class);
            activityIntent.putExtra("planId", planId);
            activityIntent.putExtra("taskTitle", taskTitle);
            activityIntent.putExtra("taskDescription", taskDescription);
            activityIntent.putExtra("startTime", startTime);
            activityIntent.putExtra("category", category);
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
    
    private Notification createConfirmationNotification(String planId, String taskTitle, String startTime) {
        Intent notificationIntent = new Intent(this, TaskConfirmationAlarmActivity.class);
        notificationIntent.putExtra("planId", planId);
        notificationIntent.putExtra("taskTitle", taskTitle);
        notificationIntent.putExtra("startTime", startTime);
        
        notificationIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP
        );
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            planId.hashCode(), 
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        String title = "Task Confirmation Required";
        String text = taskTitle + " starts soon";
        
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
                "Task Confirmations",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for task confirmation alarms");
            channel.setSound(null, null);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
    
    private void stopConfirmationService(String planId) {
        Log.d(TAG, "Stopping service for: " + planId);
        
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
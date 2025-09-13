package com.wingsfly;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.util.Log;

public class AlarmForegroundService extends Service {
    
    private static final String TAG = "AlarmService";
    private static final int NOTIFICATION_ID = 6001;
    private static final String CHANNEL_ID = "alarm_service_channel";
    
    private Handler handler;
    private String alarmId;
    private String taskTitle;
    private String ttsMessage;
    private String userName;
    private String taskMessage;
    private String taskId;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private boolean isDeviceLocked;
    private boolean aggressiveMode;
    private boolean useElevenLabs;
    
    // SINGLE INSTANCE audio management
    private ElevenLabsAudioManager audioManager;
    private boolean hasAttemptedBackupAudio = false;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "AlarmForegroundService created - SINGLE INSTANCE AUDIO mode");
        
        // Initialize single instance audio manager
        audioManager = ElevenLabsAudioManager.getInstance();
        
        createServiceChannel();
        acquireServiceWakeLock();
    }
    
    private void acquireServiceWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ON_AFTER_RELEASE,
                    "AlarmService:AudioWakeLock"
                );
                wakeLock.acquire(10 * 60 * 1000L); // Hold for 10 minutes
                Log.d(TAG, "Service wake lock acquired");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring service wake lock", e);
        }
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "AlarmForegroundService started - SINGLE INSTANCE AUDIO mode");
        
        if (intent != null) {
            alarmId = intent.getStringExtra("alarmId");
            taskTitle = intent.getStringExtra("taskTitle");
            taskMessage = intent.getStringExtra("taskMessage");
            taskId = intent.getStringExtra("taskId");
            String alarmType = intent.getStringExtra("alarmType");
            isDeviceLocked = intent.getBooleanExtra("isDeviceLocked", false);
            aggressiveMode = intent.getBooleanExtra("aggressiveMode", false);
            useElevenLabs = intent.getBooleanExtra("useElevenLabs", false);
            
            ttsMessage = intent.getStringExtra("ttsMessage");
            userName = intent.getStringExtra("userName");
            
            Log.d(TAG, "Service for alarm: " + taskTitle);
            Log.d(TAG, "Aggressive mode: " + aggressiveMode);
            Log.d(TAG, "ElevenLabs enabled: " + useElevenLabs);
            Log.d(TAG, "Current audio status: " + audioManager.getStatus());
            
            // Start foreground immediately
            startForeground(NOTIFICATION_ID, createServiceNotification());
            
            // Check if we should provide audio backup ONLY if enabled
            if (useElevenLabs && aggressiveMode) {
                Log.d(TAG, "Aggressive mode - will check for backup audio after delay");
                
                // Wait for activity to handle audio first
                if (handler == null) {
                    handler = new Handler();
                }
                
                handler.postDelayed(() -> {
                    checkAndProvideBackupAudio();
                }, 5000); // Wait 5 seconds for activity to start audio
                
            } else {
                Log.d(TAG, "Service will NOT provide backup audio (aggressiveMode: " + aggressiveMode + ", useElevenLabs: " + useElevenLabs + ")");
            }
            
            startServiceVibration();
            
            // Auto-stop after 8 minutes
            if (handler == null) {
                handler = new Handler();
            }
            handler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    Log.d(TAG, "Auto-stopping service after 8 minutes");
                    stopAudioAndVibration();
                    stopSelf();
                }
            }, 8 * 60 * 1000);
        }
        
        return START_STICKY;
    }
    
    private void checkAndProvideBackupAudio() {
        if (hasAttemptedBackupAudio) {
            Log.d(TAG, "Service backup audio already attempted");
            return;
        }
        
        hasAttemptedBackupAudio = true;
        
        Log.d(TAG, "Checking if backup audio is needed...");
        Log.d(TAG, "Current audio status: " + audioManager.getStatus());
        
        // Check if any audio is currently playing through the single instance manager
        boolean anyAudioPlaying = audioManager.isAudioPlaying();
        String currentPlayingAlarm = audioManager.getCurrentPlayingAlarmId();
        
        Log.d(TAG, "Audio check - Any playing: " + anyAudioPlaying + ", Current alarm: " + currentPlayingAlarm);
        
        if (!anyAudioPlaying) {
            Log.d(TAG, "No audio detected - service will provide SINGLE INSTANCE backup audio");
            startBackupAudioSafely();
        } else {
            Log.d(TAG, "Audio already playing (" + currentPlayingAlarm + ") - service backup not needed");
        }
    }
    
    private void startBackupAudioSafely() {
        try {
            Log.d(TAG, "🎵 Requesting SINGLE INSTANCE backup audio from SERVICE");
            
            String scheduleTime = extractTimeFromMessage(ttsMessage);
            
            // Request single instance backup audio
            boolean audioGranted = audioManager.requestAudioPlayback(
                alarmId,
                taskTitle,
                scheduleTime,
                userName,
                this,
                "SERVICE_BACKUP"
            );
            
            if (audioGranted) {
                Log.d(TAG, "✅ SINGLE INSTANCE backup audio granted to service");
            } else {
                Log.d(TAG, "🔇 Service backup audio BLOCKED - activity audio is playing");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error requesting backup audio from service", e);
        }
    }
    
    private String extractTimeFromMessage(String message) {
        if (message == null || message.isEmpty()) {
            return "12:00";
        }
        
        try {
            if (message.contains(" at ")) {
                String[] parts = message.split(" at ");
                if (parts.length > 1) {
                    String timePart = parts[1].split(" ")[0];
                    if (timePart.contains(":")) {
                        return timePart;
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error extracting time", e);
        }
        
        return "12:00";
    }
    
    private void createServiceChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Single Instance Audio Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Single instance audio coordination service for alarms");
            channel.setSound(null, null);
            channel.enableVibration(false);
            channel.setBypassDnd(false);
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_SECRET);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
            
            Log.d(TAG, "Single instance service notification channel created");
        }
    }
    
    private Notification createServiceNotification() {
        String contentText = "Single audio: " + (taskTitle != null ? taskTitle : "Task");
        if (useElevenLabs) {
            contentText += " (ElevenLabs)";
        }
        
        // Action intent to launch activity
        Intent actionIntent = new Intent(this, AlarmActivity.class);
        if (alarmId != null) {
            actionIntent.putExtra("alarmId", alarmId);
            actionIntent.putExtra("taskTitle", taskTitle);
            actionIntent.putExtra("taskMessage", taskMessage);
            actionIntent.putExtra("taskId", taskId);
            actionIntent.putExtra("ttsMessage", ttsMessage);
            actionIntent.putExtra("userName", userName);
            actionIntent.putExtra("alarmType", "VOICE_ONLY");
            actionIntent.putExtra("isDeviceLocked", isDeviceLocked);
            actionIntent.putExtra("useElevenLabs", useElevenLabs);
            actionIntent.putExtra("launchedFrom", "SERVICE_NOTIFICATION");
            actionIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        }
        
        PendingIntent actionPendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            actionIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | 
            (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );
        
        Notification.Builder builder = new Notification.Builder(this);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setChannelId(CHANNEL_ID);
        }
        
        builder.setContentTitle("Single Instance Audio")
                .setContentText(contentText)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(actionPendingIntent)
                .setOngoing(false)
                .setAutoCancel(true)
                .setPriority(Notification.PRIORITY_LOW)
                .setDefaults(0);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            builder.setCategory(Notification.CATEGORY_SERVICE)
                   .setVisibility(Notification.VISIBILITY_SECRET);
        }
        
        // Add action button to open alarm screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            builder.addAction(android.R.drawable.ic_dialog_info, "Open Alarm", actionPendingIntent);
        }
        
        return builder.build();
    }
    
    private void startServiceVibration() {
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                // Very gentle service vibration pattern (minimal interference)
                long[] pattern = new long[]{
                    0,      // Start immediately 
                    100,    // Very brief pulse
                    4000,   // Long pause for primary audio
                    50,     // Tiny reminder pulse
                    6000    // Final pause
                };
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    VibrationEffect effect = VibrationEffect.createWaveform(pattern, -1);
                    vibrator.vibrate(effect);
                } else {
                    vibrator.vibrate(pattern, -1);
                }
                
                Log.d(TAG, "Service vibration started (minimal pattern)");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting service vibration", e);
        }
    }
    
    private void stopAudioAndVibration() {
        Log.d(TAG, "Stopping service audio and vibration");
        
        // Stop single instance audio through manager
        if (audioManager != null && alarmId != null) {
            audioManager.stopAudio(alarmId, "SERVICE_STOP");
        }
        
        if (vibrator != null) {
            try {
                vibrator.cancel();
                Log.d(TAG, "Service vibration stopped");
            } catch (Exception e) {
                Log.e(TAG, "Error stopping service vibration", e);
            }
        }
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "AlarmForegroundService destroyed");
        
        stopAudioAndVibration();
        
        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }
        
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "Service wake lock released");
        }
        
        Log.d(TAG, "Service cleanup completed with single instance audio coordination");
    }
    
    public static void stopAlarmService(Context context, String alarmId) {
        Intent stopIntent = new Intent(context, AlarmForegroundService.class);
        context.stopService(stopIntent);
        Log.d("AlarmService", "Single instance alarm service stop requested for: " + alarmId);
    }
}
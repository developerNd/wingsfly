package com.wingsfly;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class CustomAlarmActivity extends Activity {

    private static final String TAG = "CustomAlarmActivity";
    private static final int SNOOZE_MINUTES = 5;
    
    private Vibrator vibrator;
    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private Handler timeHandler;
    private Runnable timeRunnable;
    private PowerManager.WakeLock wakeLock;
    private PowerManager powerManager;
    private KeyguardManager keyguardManager;
    
    // UI Elements
    private TextView timeTextView;
    private TextView dateTextView;
    private TextView alarmLabelTextView;
    private TextView alarmTimeTextView;
    private Button snoozeButton;
    private Button stopButton;
    
    // Alarm data
    private String alarmId;
    private String alarmTime;
    private String alarmLabel;
    private String days;
    private String userId;
    private boolean isDeviceLocked;
    private boolean isSnooze;
    private long triggeredTime;
    
    // Custom tone data
    private String toneType = "default";
    private String customToneUri;
    private String customToneName;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "Custom alarm activity created");
        
        // Initialize system services
        powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        
        // Force screen on and show when locked
        setupScreenFlags();
        
        // Acquire wake lock
        acquireWakeLock();
        
        setContentView(R.layout.activity_custom_alarm);
        
        // Extract alarm data from intent
        extractAlarmData();
        
        // Initialize UI components
        initializeViews();
        
        // Start alarm sound and vibration
        startAlarmSoundAndVibration();
        
        // Start time updates
        startTimeUpdates();
        
        // Auto-dismiss after 10 minutes
        new Handler().postDelayed(() -> {
            Log.d(TAG, "Auto-dismissing alarm after 10 minutes");
            stopAllAlarmComponents();
            terminateAlarmActivity();
        }, 10 * 60 * 1000);
        
        Log.d(TAG, "Custom alarm activity initialized for alarm: " + alarmId + " with tone type: " + toneType);
    }
    
    private void setupScreenFlags() {
        Window window = getWindow();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        
        // Request keyguard dismiss
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                if (keyguardManager != null) {
                    keyguardManager.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                        @Override
                        public void onDismissSucceeded() {
                            Log.d(TAG, "Keyguard dismissed successfully");
                        }
                        
                        @Override
                        public void onDismissError() {
                            Log.w(TAG, "Failed to dismiss keyguard");
                        }
                    });
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error dismissing keyguard", e);
        }
    }
    
    private void acquireWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                    PowerManager.ON_AFTER_RELEASE,
                    "CustomAlarm:AlarmActivity"
                );
                wakeLock.acquire(10 * 60 * 1000L); // 10 minutes
                Log.d(TAG, "Wake lock acquired");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring wake lock", e);
        }
    }
    
    private void extractAlarmData() {
        Intent intent = getIntent();
        alarmId = intent.getStringExtra("alarmId");
        alarmTime = intent.getStringExtra("time");
        alarmLabel = intent.getStringExtra("label");
        days = intent.getStringExtra("days");
        userId = intent.getStringExtra("userId");
        isDeviceLocked = intent.getBooleanExtra("isDeviceLocked", false);
        isSnooze = intent.getBooleanExtra("isSnooze", false);
        triggeredTime = intent.getLongExtra("triggeredTime", System.currentTimeMillis());
        
        // Extract custom tone data
        toneType = intent.getStringExtra("toneType");
        customToneUri = intent.getStringExtra("customToneUri");
        customToneName = intent.getStringExtra("customToneName");
        
        // Default to "default" if toneType is null
        if (toneType == null) {
            toneType = "default";
        }
        
        Log.d(TAG, "Alarm data - ID: " + alarmId + ", Time: " + alarmTime + ", Label: " + alarmLabel);
        Log.d(TAG, "Device locked: " + isDeviceLocked + ", Is snooze: " + isSnooze);
        Log.d(TAG, "Tone type: " + toneType + ", Custom tone URI: " + (customToneUri != null ? customToneUri : "NULL"));
        Log.d(TAG, "Custom tone name: " + customToneName);
    }
    
    private void initializeViews() {
        timeTextView = findViewById(R.id.currentTime);
        dateTextView = findViewById(R.id.currentDate);
        alarmLabelTextView = findViewById(R.id.alarmLabel);
        alarmTimeTextView = findViewById(R.id.alarmTime);
        snoozeButton = findViewById(R.id.snoozeButton);
        stopButton = findViewById(R.id.stopButton);
        
        // Set alarm information
        if (alarmLabel != null && !alarmLabel.isEmpty()) {
            alarmLabelTextView.setText(alarmLabel);
            alarmLabelTextView.setVisibility(View.VISIBLE);
        } else {
            alarmLabelTextView.setVisibility(View.GONE);
        }
        
        if (alarmTime != null) {
            alarmTimeTextView.setText(formatDisplayTime(alarmTime));
        }
        
        // Set button listeners
        snoozeButton.setOnClickListener(v -> snoozeAlarm());
        stopButton.setOnClickListener(v -> stopAlarm());
        
        // Update current time and date
        updateTime();
        updateDate();
    }
    
    private void startAlarmSoundAndVibration() {
        // Start vibration
        startVibration();
        
        // Start alarm sound (default or custom)
        startAlarmSound();
    }
    
    private void startVibration() {
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 1000, 1000, 1000, 1000, 1000, 1000};
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    VibrationEffect effect = VibrationEffect.createWaveform(pattern, 0);
                    vibrator.vibrate(effect);
                } else {
                    vibrator.vibrate(pattern, 0);
                }
                
                Log.d(TAG, "Vibration started");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting vibration", e);
        }
    }
    
    /**
     * FINAL FIX: Simplified alarm sound start with proper custom tone handling
     */
    private void startAlarmSound() {
        try {
            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            
            // Set alarm volume to maximum
            if (audioManager != null) {
                int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0);
            }
            
            Uri alarmUri = null;
            boolean useCustom = false;
            
            // FINAL FIX: Skip validation and try to use custom tone directly
            if ("custom".equals(toneType) && customToneUri != null && !customToneUri.isEmpty()) {
                try {
                    alarmUri = Uri.parse(customToneUri);
                    useCustom = true;
                    Log.d(TAG, "Attempting to use custom tone directly: " + customToneUri);
                } catch (Exception e) {
                    Log.w(TAG, "Error parsing custom tone URI, falling back to default", e);
                    alarmUri = null;
                    useCustom = false;
                }
            }
            
            // Create MediaPlayer
            mediaPlayer = new MediaPlayer();
            
            // Set audio attributes first
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                mediaPlayer.setAudioAttributes(attributes);
            } else {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
            }
            
            boolean customToneWorked = false;
            
            // FINAL FIX: Try custom tone first if specified
            if (useCustom && alarmUri != null) {
                try {
                    Log.d(TAG, "Setting custom tone data source: " + alarmUri.toString());
                    mediaPlayer.setDataSource(this, alarmUri);
                    mediaPlayer.setLooping(true);
                    mediaPlayer.prepare();
                    mediaPlayer.start();
                    
                    customToneWorked = true;
                    Log.d(TAG, "SUCCESS: Custom tone is now playing!");
                    
                } catch (Exception e) {
                    Log.w(TAG, "Custom tone failed to play, will use default", e);
                    // Reset MediaPlayer for fallback
                    try {
                        mediaPlayer.reset();
                    } catch (Exception resetException) {
                        Log.w(TAG, "Error resetting MediaPlayer", resetException);
                        mediaPlayer = new MediaPlayer();
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            AudioAttributes attributes = new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build();
                            mediaPlayer.setAudioAttributes(attributes);
                        } else {
                            mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
                        }
                    }
                }
            }
            
            // FINAL FIX: Use default tone if custom didn't work
            if (!customToneWorked) {
                Uri defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (defaultUri == null) {
                    defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                }
                if (defaultUri == null) {
                    defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                }
                
                if (defaultUri != null) {
                    try {
                        Log.d(TAG, "Using default alarm tone: " + defaultUri.toString());
                        mediaPlayer.setDataSource(this, defaultUri);
                        mediaPlayer.setLooping(true);
                        mediaPlayer.prepare();
                        mediaPlayer.start();
                        Log.d(TAG, "Default alarm tone started");
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to start default alarm tone", e);
                        // Even default failed, try ringtone fallback
                        tryEmergencyFallbackSound();
                    }
                } else {
                    Log.e(TAG, "No default alarm tones available");
                    tryEmergencyFallbackSound();
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Critical error in startAlarmSound", e);
            tryEmergencyFallbackSound();
        }
    }
    
    /**
     * FINAL FIX: Emergency fallback if everything else fails
     */
    private void tryEmergencyFallbackSound() {
        Log.d(TAG, "Attempting emergency fallback sound");
        
        try {
            // Try system notification sound as last resort
            Uri emergencyUri = RingtoneManager.getActualDefaultRingtoneUri(
                this, RingtoneManager.TYPE_NOTIFICATION);
            
            if (emergencyUri == null) {
                emergencyUri = android.provider.Settings.System.DEFAULT_NOTIFICATION_URI;
            }
            
            if (emergencyUri != null && mediaPlayer != null) {
                try {
                    mediaPlayer.reset();
                    mediaPlayer.setDataSource(this, emergencyUri);
                    mediaPlayer.setLooping(true);
                    mediaPlayer.prepare();
                    mediaPlayer.start();
                    Log.d(TAG, "Emergency fallback sound started");
                } catch (Exception e) {
                    Log.e(TAG, "Emergency fallback sound failed", e);
                }
            } else {
                Log.e(TAG, "No emergency fallback sound available");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error in emergency fallback", e);
        }
    }
    
    private void startTimeUpdates() {
        timeHandler = new Handler();
        timeRunnable = new Runnable() {
            @Override
            public void run() {
                updateTime();
                updateDate();
                timeHandler.postDelayed(this, 1000);
            }
        };
        timeHandler.post(timeRunnable);
    }
    
    private void updateTime() {
        if (timeTextView != null) {
            SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.getDefault());
            String currentTime = sdf.format(new Date());
            timeTextView.setText(currentTime);
        }
    }
    
    private void updateDate() {
        if (dateTextView != null) {
            SimpleDateFormat sdf = new SimpleDateFormat("EEEE, d MMMM", Locale.getDefault());
            String currentDate = sdf.format(new Date());
            dateTextView.setText(currentDate);
        }
    }
    
    private String formatDisplayTime(String time) {
        try {
            String[] parts = time.split(":");
            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);
            
            SimpleDateFormat inputFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
            SimpleDateFormat outputFormat = new SimpleDateFormat("h:mm a", Locale.getDefault());
            
            Date date = inputFormat.parse(time);
            return outputFormat.format(date);
        } catch (Exception e) {
            return time;
        }
    }
    
    private void snoozeAlarm() {
        Log.d(TAG, "Snooze button pressed - IMMEDIATE STOP");
        
        // STEP 1: IMMEDIATELY stop all alarm components
        stopAllAlarmComponents();
        
        // STEP 2: Schedule snooze alarm with custom tone data
        scheduleSnoozeAlarm();
        
        // STEP 3: Set result
        Intent resultIntent = new Intent();
        resultIntent.putExtra("action", "snoozed");
        resultIntent.putExtra("alarmId", alarmId);
        resultIntent.putExtra("snoozeMinutes", SNOOZE_MINUTES);
        setResult(RESULT_OK, resultIntent);
        
        // STEP 4: IMMEDIATELY terminate activity
        terminateAlarmActivity();
    }
    
    private void stopAlarm() {
        Log.d(TAG, "Stop button pressed - IMMEDIATE STOP");
        
        // STEP 1: IMMEDIATELY stop all alarm components
        stopAllAlarmComponents();
        
        // STEP 2: Set result
        Intent resultIntent = new Intent();
        resultIntent.putExtra("action", "stopped");
        resultIntent.putExtra("alarmId", alarmId);
        setResult(RESULT_OK, resultIntent);
        
        // STEP 3: IMMEDIATELY terminate activity
        terminateAlarmActivity();
    }
    
    /**
     * Immediately stops all alarm components (sound, vibration, services)
     */
    private void stopAllAlarmComponents() {
        Log.d(TAG, "Stopping ALL alarm components immediately");
        
        // Stop sound and vibration IMMEDIATELY
        stopAlarmSoundAndVibration();
        
        // Stop alarm service
        stopAlarmService();
        
        // Cancel any notifications
        cancelAlarmNotifications();
        
        // Release wake lock immediately
        releaseWakeLock();
        
        // Clear all window flags immediately
        clearWindowFlags();
        
        Log.d(TAG, "All alarm components stopped");
    }
    
    /**
     * Stops any running alarm service for this alarm
     */
    private void stopAlarmService() {
        try {
            // Stop the custom alarm service
            Intent stopServiceIntent = new Intent(this, CustomAlarmService.class);
            stopServiceIntent.putExtra("serviceAction", "STOP_CUSTOM_ALARM");
            stopServiceIntent.putExtra("alarmId", alarmId);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(stopServiceIntent);
            } else {
                startService(stopServiceIntent);
            }
            
            Log.d(TAG, "Alarm service stop command sent");
            
        } catch (Exception e) {
            Log.e(TAG, "Error stopping alarm service", e);
        }
    }
    
    /**
     * Immediately terminates the alarm activity
     */
    private void terminateAlarmActivity() {
        Log.d(TAG, "Terminating alarm activity IMMEDIATELY");
        
        try {
            // Move to home screen FIRST to ensure we don't see the activity
            Intent homeIntent = new Intent(Intent.ACTION_MAIN);
            homeIntent.addCategory(Intent.CATEGORY_HOME);
            homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(homeIntent);
            
            // Then finish the activity
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                finishAndRemoveTask();
            } else {
                finish();
            }
            
            // Move task to back as final step
            moveTaskToBack(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error terminating activity", e);
            // Fallback - just finish
            finish();
        }
    }
    
    /**
     * Cancels alarm notifications
     */
    private void cancelAlarmNotifications() {
        try {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancelAll();
                Log.d(TAG, "All notifications cancelled");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling notifications", e);
        }
    }
    
    /**
     * Clears all window flags that keep screen on
     */
    private void clearWindowFlags() {
        try {
            Window window = getWindow();
            window.clearFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            );
            Log.d(TAG, "Window flags cleared");
        } catch (Exception e) {
            Log.e(TAG, "Error clearing window flags", e);
        }
    }
    
    /**
     * Schedule snooze alarm with custom tone data preserved
     */
    private void scheduleSnoozeAlarm() {
        try {
            long snoozeTime = System.currentTimeMillis() + (SNOOZE_MINUTES * 60 * 1000);
            
            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                Log.e(TAG, "AlarmManager not available for snooze");
                return;
            }
            
            Intent snoozeIntent = new Intent(this, CustomAlarmReceiver.class);
            snoozeIntent.putExtra("alarmId", alarmId);
            snoozeIntent.putExtra("time", alarmTime);
            snoozeIntent.putExtra("label", alarmLabel + " (Snoozed)");
            snoozeIntent.putExtra("days", "");
            snoozeIntent.putExtra("userId", userId);
            snoozeIntent.putExtra("isSnooze", true);
            snoozeIntent.putExtra("alarmType", "CUSTOM_ALARM_SNOOZE");
            
            // Preserve custom tone data in snooze
            snoozeIntent.putExtra("toneType", toneType);
            snoozeIntent.putExtra("customToneUri", customToneUri);
            snoozeIntent.putExtra("customToneName", customToneName);
            
            snoozeIntent.setAction("CUSTOM_ALARM_SNOOZE_" + alarmId + "_" + System.currentTimeMillis());
            
            int requestCode = Math.abs(("snooze_" + alarmId + "_" + System.currentTimeMillis()).hashCode());
            PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
                this,
                requestCode,
                snoozeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, snoozeTime, snoozePendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, snoozeTime, snoozePendingIntent);
            }
            
            Log.d(TAG, "Snooze alarm scheduled for: " + new Date(snoozeTime) + " (" + SNOOZE_MINUTES + " minutes from now) with tone type: " + toneType);
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling snooze alarm", e);
        }
    }
    
    private void stopAlarmSoundAndVibration() {
        // Stop vibration
        if (vibrator != null) {
            try {
                vibrator.cancel();
                Log.d(TAG, "Vibration stopped");
            } catch (Exception e) {
                Log.e(TAG, "Error stopping vibration", e);
            }
            vibrator = null;
        }
        
        // Stop media player
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
                Log.d(TAG, "Media player stopped and released");
            } catch (Exception e) {
                Log.e(TAG, "Error stopping media player", e);
            }
        }
        
        // Stop time updates
        if (timeHandler != null && timeRunnable != null) {
            timeHandler.removeCallbacks(timeRunnable);
            timeHandler = null;
            timeRunnable = null;
        }
        
        Log.d(TAG, "All sound and vibration stopped");
    }
    
    /**
     * Releases wake lock safely
     */
    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
                Log.d(TAG, "Wake lock released");
            } catch (Exception e) {
                Log.e(TAG, "Error releasing wake lock", e);
            }
        }
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Log.d(TAG, "New intent received");
        
        // Update alarm data if new intent has different alarm ID
        String newAlarmId = intent.getStringExtra("alarmId");
        if (newAlarmId != null && !newAlarmId.equals(alarmId)) {
            Log.d(TAG, "New alarm ID: " + newAlarmId);
            
            // Stop current alarm
            stopAlarmSoundAndVibration();
            
            // Update with new alarm data
            setIntent(intent);
            extractAlarmData();
            
            // Restart with new alarm (including custom tone)
            startAlarmSoundAndVibration();
            
            // Update UI
            if (alarmLabelTextView != null && alarmLabel != null) {
                alarmLabelTextView.setText(alarmLabel);
            }
            if (alarmTimeTextView != null && alarmTime != null) {
                alarmTimeTextView.setText(formatDisplayTime(alarmTime));
            }
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "Activity resumed");
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        Log.d(TAG, "Activity paused");
    }
    
    @Override
    protected void onDestroy() {
        Log.d(TAG, "Activity destroying");
        
        stopAlarmSoundAndVibration();
        releaseWakeLock();
        
        super.onDestroy();
        Log.d(TAG, "Activity destroyed");
    }
    
    @Override
    public void onBackPressed() {
        // Prevent back button from closing alarm
        Log.d(TAG, "Back button pressed - ignoring");
    }
}
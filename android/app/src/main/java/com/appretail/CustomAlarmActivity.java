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
        
        Log.d(TAG, "========================================");
        Log.d(TAG, "ALARM ACTIVITY CREATED");
        Log.d(TAG, "========================================");
        Log.d(TAG, "Time: " + new Date().toString());
        Log.d(TAG, "Thread: " + Thread.currentThread().getName());
        
        // Initialize system services
        powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        
        Log.d(TAG, "System services initialized");
        Log.d(TAG, "  - PowerManager: " + (powerManager != null ? "OK" : "NULL"));
        Log.d(TAG, "  - KeyguardManager: " + (keyguardManager != null ? "OK" : "NULL"));
        
        // Force screen on and show when locked - MUST BE DONE BEFORE setContentView
        setupScreenFlags();
        
        // Acquire wake lock
        acquireWakeLock();
        
        setContentView(R.layout.activity_custom_alarm);
        Log.d(TAG, "Content view set");
        
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
            Log.w(TAG, "AUTO-DISMISSING alarm after 10 minutes timeout");
            stopAllAlarmComponents();
            terminateAlarmActivity();
        }, 10 * 60 * 1000);
        
        Log.d(TAG, "Alarm activity initialization complete");
        Log.d(TAG, "  - AlarmID: " + alarmId);
        Log.d(TAG, "  - ToneType: " + toneType);
        Log.d(TAG, "  - DeviceLocked: " + isDeviceLocked);
        Log.d(TAG, "========================================");
    }
    
    private void setupScreenFlags() {
        Log.d(TAG, "Setting up screen flags for lock screen display...");
        
        Window window = getWindow();
        
        // For Android 8.1+ (API 27+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            Log.d(TAG, "  - Used setShowWhenLocked() and setTurnScreenOn() (API 27+)");
        }
        
        // Add window flags (works for all versions)
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        Log.d(TAG, "  - Window flags added: KEEP_SCREEN_ON, SHOW_WHEN_LOCKED, TURN_SCREEN_ON, DISMISS_KEYGUARD, FULLSCREEN");
        
        // For Android 10+ (API 29+), also request to show on top
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            Log.d(TAG, "  - Added Android 10+ specific flags");
        }
        
        // Request keyguard dismiss
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                if (keyguardManager != null) {
                    keyguardManager.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                        @Override
                        public void onDismissSucceeded() {
                            Log.d(TAG, "  - Keyguard dismissed successfully");
                        }
                        
                        @Override
                        public void onDismissError() {
                            Log.w(TAG, "  - Failed to dismiss keyguard");
                        }
                        
                        @Override
                        public void onDismissCancelled() {
                            Log.w(TAG, "  - Keyguard dismiss cancelled");
                        }
                    });
                    Log.d(TAG, "  - Keyguard dismiss requested");
                } else {
                    Log.w(TAG, "  - KeyguardManager is null, cannot request dismiss");
                }
            } else {
                Log.d(TAG, "  - Keyguard dismiss not available (API < 26)");
            }
        } catch (Exception e) {
            Log.e(TAG, "  - Error dismissing keyguard", e);
        }
        
        Log.d(TAG, "Screen flags setup complete");
    }
    
    private void acquireWakeLock() {
        Log.d(TAG, "Acquiring wake lock...");
        
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
                Log.d(TAG, "  - Wake lock acquired successfully (10 min timeout)");
                Log.d(TAG, "  - Wake lock type: FULL_WAKE_LOCK | ACQUIRE_CAUSES_WAKEUP | ON_AFTER_RELEASE");
            } else {
                Log.e(TAG, "  - PowerManager is null, cannot acquire wake lock!");
            }
        } catch (Exception e) {
            Log.e(TAG, "  - Error acquiring wake lock", e);
        }
    }
    
    private void extractAlarmData() {
        Log.d(TAG, "Extracting alarm data from intent...");
        
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
            Log.w(TAG, "  - ToneType was null, defaulting to 'default'");
        }
        
        Log.d(TAG, "Alarm data extracted:");
        Log.d(TAG, "  - AlarmID: " + alarmId);
        Log.d(TAG, "  - Time: " + alarmTime);
        Log.d(TAG, "  - Label: " + alarmLabel);
        Log.d(TAG, "  - Days: " + days);
        Log.d(TAG, "  - UserID: " + userId);
        Log.d(TAG, "  - Device Locked: " + isDeviceLocked);
        Log.d(TAG, "  - Is Snooze: " + isSnooze);
        Log.d(TAG, "  - Triggered Time: " + new Date(triggeredTime));
        Log.d(TAG, "  - Tone Type: " + toneType);
        Log.d(TAG, "  - Custom Tone URI: " + (customToneUri != null ? customToneUri : "NULL"));
        Log.d(TAG, "  - Custom Tone Name: " + (customToneName != null ? customToneName : "NULL"));
    }
    
    private void initializeViews() {
        Log.d(TAG, "Initializing views...");
        
        timeTextView = findViewById(R.id.currentTime);
        dateTextView = findViewById(R.id.currentDate);
        alarmLabelTextView = findViewById(R.id.alarmLabel);
        alarmTimeTextView = findViewById(R.id.alarmTime);
        snoozeButton = findViewById(R.id.snoozeButton);
        stopButton = findViewById(R.id.stopButton);
        
        Log.d(TAG, "  - Views found: " + 
            (timeTextView != null ? "timeTextView " : "") +
            (dateTextView != null ? "dateTextView " : "") +
            (alarmLabelTextView != null ? "alarmLabelTextView " : "") +
            (alarmTimeTextView != null ? "alarmTimeTextView " : "") +
            (snoozeButton != null ? "snoozeButton " : "") +
            (stopButton != null ? "stopButton" : ""));
        
        // Set alarm information
        if (alarmLabel != null && !alarmLabel.isEmpty()) {
            alarmLabelTextView.setText(alarmLabel);
            alarmLabelTextView.setVisibility(View.VISIBLE);
            Log.d(TAG, "  - Label set: " + alarmLabel);
        } else {
            alarmLabelTextView.setVisibility(View.GONE);
            Log.d(TAG, "  - No label, hiding label view");
        }
        
        if (alarmTime != null) {
            alarmTimeTextView.setText(formatDisplayTime(alarmTime));
            Log.d(TAG, "  - Time set: " + alarmTime);
        }
        
        // Set button listeners
        snoozeButton.setOnClickListener(v -> {
            Log.d(TAG, "SNOOZE BUTTON CLICKED");
            snoozeAlarm();
        });
        stopButton.setOnClickListener(v -> {
            Log.d(TAG, "STOP BUTTON CLICKED");
            stopAlarm();
        });
        
        // Update current time and date
        updateTime();
        updateDate();
        
        Log.d(TAG, "Views initialized successfully");
    }
    
    private void startAlarmSoundAndVibration() {
        Log.d(TAG, "Starting alarm sound and vibration...");
        
        // Start vibration
        startVibration();
        
        // Start alarm sound (default or custom)
        startAlarmSound();
        
        Log.d(TAG, "Alarm sound and vibration started");
    }
    
    private void startVibration() {
        Log.d(TAG, "Starting vibration...");
        
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 1000, 1000, 1000, 1000, 1000, 1000};
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    VibrationEffect effect = VibrationEffect.createWaveform(pattern, 0);
                    vibrator.vibrate(effect);
                    Log.d(TAG, "  - Vibration started with VibrationEffect (API 26+)");
                } else {
                    vibrator.vibrate(pattern, 0);
                    Log.d(TAG, "  - Vibration started with pattern (legacy)");
                }
            } else {
                Log.w(TAG, "  - Vibrator not available or no vibrator");
            }
        } catch (Exception e) {
            Log.e(TAG, "  - Error starting vibration", e);
        }
    }
    
    private void startAlarmSound() {
        Log.d(TAG, "Starting alarm sound...");
        Log.d(TAG, "  - Tone type: " + toneType);
        Log.d(TAG, "  - Custom tone URI: " + (customToneUri != null ? customToneUri : "NULL"));
        
        try {
            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            
            // Set alarm volume to maximum
            if (audioManager != null) {
                int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                int currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0);
                Log.d(TAG, "  - Alarm volume set to max: " + maxVolume + " (was: " + currentVolume + ")");
            } else {
                Log.w(TAG, "  - AudioManager is null");
            }
            
            Uri alarmUri = null;
            boolean useCustom = false;
            
            // Check if we should use custom tone
            if ("custom".equals(toneType) && customToneUri != null && !customToneUri.isEmpty()) {
                try {
                    alarmUri = Uri.parse(customToneUri);
                    useCustom = true;
                    Log.d(TAG, "  - Will attempt to use custom tone: " + customToneUri);
                } catch (Exception e) {
                    Log.w(TAG, "  - Error parsing custom tone URI, falling back to default", e);
                    alarmUri = null;
                    useCustom = false;
                }
            }
            
            // Create MediaPlayer
            mediaPlayer = new MediaPlayer();
            Log.d(TAG, "  - MediaPlayer created");
            
            // Set audio attributes first
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                mediaPlayer.setAudioAttributes(attributes);
                Log.d(TAG, "  - Audio attributes set (USAGE_ALARM)");
            } else {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
                Log.d(TAG, "  - Audio stream type set (STREAM_ALARM - legacy)");
            }
            
            boolean customToneWorked = false;
            
            // Try custom tone first if specified
            if (useCustom && alarmUri != null) {
                try {
                    Log.d(TAG, "  - Attempting to load custom tone...");
                    mediaPlayer.setDataSource(this, alarmUri);
                    mediaPlayer.setLooping(true);
                    mediaPlayer.prepare();
                    mediaPlayer.start();
                    
                    customToneWorked = true;
                    Log.d(TAG, "  - SUCCESS: Custom tone is now playing!");
                    
                } catch (Exception e) {
                    Log.w(TAG, "  - Custom tone failed to play, will use default", e);
                    e.printStackTrace();
                    
                    // Reset MediaPlayer for fallback
                    try {
                        mediaPlayer.reset();
                        Log.d(TAG, "  - MediaPlayer reset for fallback");
                    } catch (Exception resetException) {
                        Log.w(TAG, "  - Error resetting MediaPlayer, creating new instance", resetException);
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
            
            // Use default tone if custom didn't work
            if (!customToneWorked) {
                Log.d(TAG, "  - Loading default alarm tone...");
                
                Uri defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                Log.d(TAG, "  - Default ALARM URI: " + (defaultUri != null ? defaultUri.toString() : "NULL"));
                
                if (defaultUri == null) {
                    defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                    Log.d(TAG, "  - Fallback to NOTIFICATION URI: " + (defaultUri != null ? defaultUri.toString() : "NULL"));
                }
                if (defaultUri == null) {
                    defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                    Log.d(TAG, "  - Fallback to RINGTONE URI: " + (defaultUri != null ? defaultUri.toString() : "NULL"));
                }
                
                if (defaultUri != null) {
                    try {
                        mediaPlayer.setDataSource(this, defaultUri);
                        mediaPlayer.setLooping(true);
                        mediaPlayer.prepare();
                        mediaPlayer.start();
                        Log.d(TAG, "  - SUCCESS: Default alarm tone is now playing");
                    } catch (Exception e) {
                        Log.e(TAG, "  - Failed to start default alarm tone", e);
                        e.printStackTrace();
                        tryEmergencyFallbackSound();
                    }
                } else {
                    Log.e(TAG, "  - No default alarm tones available!");
                    tryEmergencyFallbackSound();
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "  - CRITICAL error in startAlarmSound", e);
            e.printStackTrace();
            tryEmergencyFallbackSound();
        }
    }
    
    private void tryEmergencyFallbackSound() {
        Log.w(TAG, "Attempting emergency fallback sound...");
        
        try {
            Uri emergencyUri = RingtoneManager.getActualDefaultRingtoneUri(
                this, RingtoneManager.TYPE_NOTIFICATION);
            
            if (emergencyUri == null) {
                emergencyUri = android.provider.Settings.System.DEFAULT_NOTIFICATION_URI;
            }
            
            Log.d(TAG, "  - Emergency URI: " + (emergencyUri != null ? emergencyUri.toString() : "NULL"));
            
            if (emergencyUri != null && mediaPlayer != null) {
                try {
                    mediaPlayer.reset();
                    mediaPlayer.setDataSource(this, emergencyUri);
                    mediaPlayer.setLooping(true);
                    mediaPlayer.prepare();
                    mediaPlayer.start();
                    Log.d(TAG, "  - Emergency fallback sound started");
                } catch (Exception e) {
                    Log.e(TAG, "  - Emergency fallback sound failed", e);
                }
            } else {
                Log.e(TAG, "  - No emergency fallback sound available");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "  - Error in emergency fallback", e);
        }
    }
    
    private void startTimeUpdates() {
        Log.d(TAG, "Starting time updates...");
        
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
            Log.w(TAG, "Error formatting time: " + time, e);
            return time;
        }
    }
    
    private void snoozeAlarm() {
        Log.d(TAG, "========================================");
        Log.d(TAG, "SNOOZE ALARM INITIATED");
        Log.d(TAG, "========================================");
        
        // STEP 1: IMMEDIATELY stop all alarm components
        Log.d(TAG, "Step 1: Stopping all alarm components...");
        stopAllAlarmComponents();
        
        // STEP 2: Schedule snooze alarm with custom tone data
        Log.d(TAG, "Step 2: Scheduling snooze alarm...");
        scheduleSnoozeAlarm();
        
        // STEP 3: Set result
        Log.d(TAG, "Step 3: Setting result...");
        Intent resultIntent = new Intent();
        resultIntent.putExtra("action", "snoozed");
        resultIntent.putExtra("alarmId", alarmId);
        resultIntent.putExtra("snoozeMinutes", SNOOZE_MINUTES);
        setResult(RESULT_OK, resultIntent);
        
        // STEP 4: IMMEDIATELY terminate activity
        Log.d(TAG, "Step 4: Terminating activity...");
        terminateAlarmActivity();
        
        Log.d(TAG, "========================================");
        Log.d(TAG, "SNOOZE COMPLETE");
        Log.d(TAG, "========================================");
    }
    
    private void stopAlarm() {
        Log.d(TAG, "========================================");
        Log.d(TAG, "STOP ALARM INITIATED");
        Log.d(TAG, "========================================");
        
        // STEP 1: IMMEDIATELY stop all alarm components
        Log.d(TAG, "Step 1: Stopping all alarm components...");
        stopAllAlarmComponents();
        
        // STEP 2: Set result
        Log.d(TAG, "Step 2: Setting result...");
        Intent resultIntent = new Intent();
        resultIntent.putExtra("action", "stopped");
        resultIntent.putExtra("alarmId", alarmId);
        setResult(RESULT_OK, resultIntent);
        
        // STEP 3: IMMEDIATELY terminate activity
        Log.d(TAG, "Step 3: Terminating activity...");
        terminateAlarmActivity();
        
        Log.d(TAG, "========================================");
        Log.d(TAG, "STOP COMPLETE");
        Log.d(TAG, "========================================");
    }
    
    private void stopAllAlarmComponents() {
        Log.d(TAG, "Stopping ALL alarm components...");
        
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
    
    private void stopAlarmService() {
        Log.d(TAG, "Stopping alarm service...");
        
        try {
            Intent stopServiceIntent = new Intent(this, CustomAlarmService.class);
            stopServiceIntent.putExtra("serviceAction", "STOP_CUSTOM_ALARM");
            stopServiceIntent.putExtra("alarmId", alarmId);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(stopServiceIntent);
                Log.d(TAG, "  - Stop command sent via startForegroundService");
            } else {
                startService(stopServiceIntent);
                Log.d(TAG, "  - Stop command sent via startService");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "  - Error stopping alarm service", e);
        }
    }
    
    private void terminateAlarmActivity() {
        Log.d(TAG, "Terminating alarm activity...");
        
        try {
            // Move to home screen FIRST
            Log.d(TAG, "  - Moving to home screen...");
            Intent homeIntent = new Intent(Intent.ACTION_MAIN);
            homeIntent.addCategory(Intent.CATEGORY_HOME);
            homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(homeIntent);
            Log.d(TAG, "  - Home screen launched");
            
            // Then finish the activity
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                finishAndRemoveTask();
                Log.d(TAG, "  - Activity finished and removed from task (API 21+)");
            } else {
                finish();
                Log.d(TAG, "  - Activity finished (legacy)");
            }
            
            // Move task to back as final step
            moveTaskToBack(true);
            Log.d(TAG, "  - Task moved to back");
            
        } catch (Exception e) {
            Log.e(TAG, "  - Error terminating activity", e);
            // Fallback - just finish
            finish();
        }
    }
    
    private void cancelAlarmNotifications() {
        Log.d(TAG, "Cancelling notifications...");
        
        try {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancelAll();
                Log.d(TAG, "  - All notifications cancelled");
            } else {
                Log.w(TAG, "  - NotificationManager is null");
            }
        } catch (Exception e) {
            Log.e(TAG, "  - Error cancelling notifications", e);
        }
    }
    
    private void clearWindowFlags() {
        Log.d(TAG, "Clearing window flags...");
        
        try {
            Window window = getWindow();
            window.clearFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            );
            Log.d(TAG, "  - Window flags cleared");
        } catch (Exception e) {
            Log.e(TAG, "  - Error clearing window flags", e);
        }
    }
    
    private void scheduleSnoozeAlarm() {
        Log.d(TAG, "Scheduling snooze alarm...");
        
        try {
            long snoozeTime = System.currentTimeMillis() + (SNOOZE_MINUTES * 60 * 1000);
            Log.d(TAG, "  - Snooze time: " + new Date(snoozeTime) + " (" + SNOOZE_MINUTES + " min from now)");
            
            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                Log.e(TAG, "  - AlarmManager not available for snooze!");
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
                Log.d(TAG, "  - Snooze scheduled using setExactAndAllowWhileIdle");
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, snoozeTime, snoozePendingIntent);
                Log.d(TAG, "  - Snooze scheduled using setExact");
            }
            
            Log.d(TAG, "  - Snooze alarm scheduled successfully with tone type: " + toneType);
            
        } catch (Exception e) {
            Log.e(TAG, "  - Error scheduling snooze alarm", e);
        }
    }
    
    private void stopAlarmSoundAndVibration() {
        Log.d(TAG, "Stopping alarm sound and vibration...");
        
        // Stop vibration
        if (vibrator != null) {
            try {
                vibrator.cancel();
                Log.d(TAG, "  - Vibration stopped");
            } catch (Exception e) {
                Log.e(TAG, "  - Error stopping vibration", e);
            }
            vibrator = null;
        }
        
        // Stop media player
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                    Log.d(TAG, "  - MediaPlayer stopped");
                }
                mediaPlayer.release();
                mediaPlayer = null;
                Log.d(TAG, "  - MediaPlayer released");
            } catch (Exception e) {
                Log.e(TAG, "  - Error stopping media player", e);
            }
        }
        
        // Stop time updates
        if (timeHandler != null && timeRunnable != null) {
            timeHandler.removeCallbacks(timeRunnable);
            timeHandler = null;
            timeRunnable = null;
            Log.d(TAG, "  - Time updates stopped");
        }
    }
    
    private void releaseWakeLock() {
        Log.d(TAG, "Releasing wake lock...");
        
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
                Log.d(TAG, "  - Wake lock released");
            } catch (Exception e) {
                Log.e(TAG, "  - Error releasing wake lock", e);
            }
        } else {
            Log.d(TAG, "  - Wake lock already released or null");
        }
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Log.d(TAG, "========================================");
        Log.d(TAG, "NEW INTENT RECEIVED");
        Log.d(TAG, "========================================");
        
        // Update alarm data if new intent has different alarm ID
        String newAlarmId = intent.getStringExtra("alarmId");
        Log.d(TAG, "  - New AlarmID: " + newAlarmId);
        Log.d(TAG, "  - Current AlarmID: " + alarmId);
        
        if (newAlarmId != null && !newAlarmId.equals(alarmId)) {
            Log.d(TAG, "  - Different alarm, restarting with new data...");
            
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
            
            Log.d(TAG, "  - Restarted with new alarm data");
        } else {
            Log.d(TAG, "  - Same alarm or null ID, ignoring");
        }
        
        Log.d(TAG, "========================================");
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "Activity RESUMED");
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        Log.d(TAG, "Activity PAUSED");
    }
    
    @Override
    protected void onDestroy() {
        Log.d(TAG, "========================================");
        Log.d(TAG, "Activity DESTROYING");
        Log.d(TAG, "========================================");
        
        stopAlarmSoundAndVibration();
        releaseWakeLock();
        
        super.onDestroy();
        Log.d(TAG, "Activity DESTROYED");
    }
    
    @Override
    public void onBackPressed() {
        // Prevent back button from closing alarm
        Log.d(TAG, "Back button pressed - IGNORING (alarm cannot be dismissed with back button)");
    }
}
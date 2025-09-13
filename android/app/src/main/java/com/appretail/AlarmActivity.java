package com.wingsfly;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
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

public class AlarmActivity extends Activity {

    private static final String TAG = "AlarmActivity";
    private static final int AGGRESSIVE_NOTIFICATION_ID = 3001;
    
    private Vibrator vibrator;
    private Handler timeHandler;
    private Runnable timeRunnable;
    private TextView timeTextView;
    private TextView dateTextView;
    private TextView taskTitle;
    private TextView voiceMessageText;
    private String alarmId;
    private String taskTitleStr;
    private String taskMessage;
    private String taskId;
    private String ttsMessage;
    private String userName;
    private String launchedFrom;
    private PowerManager.WakeLock wakeLock;
    private boolean isDeviceLocked;
    private boolean useElevenLabs;
    
    // ABSOLUTE singleton audio control
    private ElevenLabsNativeServiceSingleton audioSingleton;
    private boolean hasAttemptedAudio = false;
    
    // Control state
    private boolean isBlinkingStopped = false;
    private boolean isClosing = false;
    private boolean isFullyInitialized = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Log.d(TAG, "🚀 AlarmActivity onCreate - ABSOLUTE SINGLE AUDIO MODE");

        // STEP 1: Get ABSOLUTE singleton audio controller
        audioSingleton = ElevenLabsNativeServiceSingleton.getInstance();
        
        // STEP 2: IMMEDIATELY force screen activation
        forceScreenActivationMax();
        
        // STEP 3: Acquire aggressive wake lock
        acquireMaxWakeLock();

        // STEP 4: Clear ALL notifications immediately
        clearAllAggressiveNotifications();

        // STEP 5: Set content view
        setContentView(R.layout.activity_alarm);

        // STEP 6: Extract intent data
        extractIntentData();

        if (alarmId == null) {
            Log.e(TAG, "No alarm ID provided, finishing activity");
            properFinish();
            return;
        }

        Log.d(TAG, "✅ ALARM SCREEN LAUNCHED - Absolute single audio control");
        Log.d(TAG, "Launch source: " + launchedFrom);
        Log.d(TAG, "Task: " + taskTitleStr);
        Log.d(TAG, "Device locked: " + isDeviceLocked);
        Log.d(TAG, "ElevenLabs enabled: " + useElevenLabs);
        Log.d(TAG, "Audio Status: " + audioSingleton.getStatus());
        
        // STEP 7: Initialize UI
        initializeViews();
        startTimeUpdates();
        startControlledPulseAnimation();
        
        // STEP 8: Mark as fully initialized
        isFullyInitialized = true;
        
        // STEP 9: Request ABSOLUTE single audio
        if (useElevenLabs) {
            requestAbsoluteSingleAudio();
        }

        // Auto-dismiss after 10 minutes
        new Handler().postDelayed(() -> {
            Log.d(TAG, "Auto-dismissing alarm after 10 minutes");
            stopAlarm();
        }, 10 * 60 * 1000);
    }

    private void requestAbsoluteSingleAudio() {
        if (hasAttemptedAudio) {
            Log.d(TAG, "Audio already attempted by this activity");
            return;
        }
        
        hasAttemptedAudio = true;
        
        Log.d(TAG, "🎵 Requesting ABSOLUTE SINGLE audio for: " + alarmId);
        Log.d(TAG, "Current audio status: " + audioSingleton.getStatus());
        
        // Always start vibration first
        startAlarmVibration();
        
        // Request ABSOLUTE single audio - this CANNOT be bypassed
        boolean audioStarted = audioSingleton.playEnhancedAlarmSpeech(
            alarmId,
            taskTitleStr,
            extractTimeFromMessage(ttsMessage),
            userName,
            this,
            "ACTIVITY_" + launchedFrom
        );
        
        if (audioStarted) {
            Log.d(TAG, "✅ ABSOLUTE SINGLE audio started successfully");
        } else {
            Log.d(TAG, "🔇 ABSOLUTE audio BLOCKED - another instance is active");
            Log.d(TAG, "Current status: " + audioSingleton.getStatus());
        }
    }

    private void forceScreenActivationMax() {
        Window window = getWindow();
        Log.d(TAG, "🔥 FORCING MAXIMUM screen activation");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }

        int allFlags = WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                       WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                       WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                       WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                       WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON |
                       WindowManager.LayoutParams.FLAG_FULLSCREEN |
                       WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
        
        window.addFlags(allFlags);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                window.setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY);
            } else {
                window.setType(WindowManager.LayoutParams.TYPE_SYSTEM_ALERT);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not set window type: " + e.getMessage());
        }

        try {
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                keyguardManager.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                    @Override
                    public void onDismissSucceeded() {
                        Log.d(TAG, "✅ Keyguard dismiss succeeded");
                    }
                    
                    @Override
                    public void onDismissError() {
                        Log.w(TAG, "⚠️ Keyguard dismiss error");
                    }
                    
                    @Override
                    public void onDismissCancelled() {
                        Log.w(TAG, "⚠️ Keyguard dismiss cancelled");
                    }
                });
            }
        } catch (Exception e) {
            Log.w(TAG, "Error requesting keyguard dismiss: " + e.getMessage());
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.setStatusBarColor(0xFF000000);
                
                int uiFlags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                             View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                             View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                             View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                             View.SYSTEM_UI_FLAG_FULLSCREEN;
                             
                window.getDecorView().setSystemUiVisibility(uiFlags);
            }
        } catch (Exception e) {
            Log.w(TAG, "Error setting UI flags: " + e.getMessage());
        }

        Log.d(TAG, "✅ MAXIMUM screen activation completed");
    }

    private void acquireMaxWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                    PowerManager.ON_AFTER_RELEASE,
                    "MaxAlarm:FORCE_SCREEN_WAKE"
                );
                wakeLock.acquire(15 * 60 * 1000L);
                Log.d(TAG, "✅ MAXIMUM wake lock acquired");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring maximum wake lock", e);
        }
    }

    private void clearAllAggressiveNotifications() {
        try {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(AGGRESSIVE_NOTIFICATION_ID);
                notificationManager.cancel(AGGRESSIVE_NOTIFICATION_ID + 1);
                notificationManager.cancel(6001);
                Log.d(TAG, "✅ All notifications cleared");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error clearing notifications", e);
        }
    }

    private void extractIntentData() {
        Intent intent = getIntent();
        alarmId = intent.getStringExtra("alarmId");
        taskTitleStr = intent.getStringExtra("taskTitle");
        taskMessage = intent.getStringExtra("taskMessage");
        ttsMessage = intent.getStringExtra("ttsMessage");
        userName = intent.getStringExtra("userName");
        taskId = intent.getStringExtra("taskId");
        isDeviceLocked = intent.getBooleanExtra("isDeviceLocked", false);
        launchedFrom = intent.getStringExtra("launchedFrom");
        useElevenLabs = intent.getBooleanExtra("useElevenLabs", true);
        
        Log.d(TAG, "Intent data extracted - Launch source: " + launchedFrom);
        Log.d(TAG, "ElevenLabs enabled: " + useElevenLabs);
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
            
            java.util.regex.Pattern timePattern = java.util.regex.Pattern.compile("\\b(\\d{1,2}):(\\d{2})\\b");
            java.util.regex.Matcher matcher = timePattern.matcher(message);
            if (matcher.find()) {
                return matcher.group();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error extracting time from message: " + e.getMessage());
        }
        
        return "12:00";
    }

    private void initializeViews() {
        taskTitle = findViewById(R.id.taskTitle);
        voiceMessageText = findViewById(R.id.voiceMessageText);
        timeTextView = findViewById(R.id.currentTime);
        dateTextView = findViewById(R.id.dateInfo);
        
        // FIX: Use the correct button IDs from the layout
        Button yesButton = findViewById(R.id.snoozeButton);  // This is actually the YES button in layout
        Button noButton = findViewById(R.id.stopButton);     // This is the NO button in layout
        Button dismissButton = findViewById(R.id.dismissButton);  // Hidden button
        Button emergencyStop = findViewById(R.id.emergencyStop);  // Hidden button
        Button repeatButton = findViewById(R.id.repeatButton);

        if (taskTitleStr != null && !taskTitleStr.isEmpty()) {
            taskTitle.setText(taskTitleStr);
            taskTitle.setVisibility(View.VISIBLE);
        } else {
            taskTitle.setVisibility(View.GONE);
        }

        if (voiceMessageText != null) {
            String displayMessage = ttsMessage;
            if (displayMessage == null || displayMessage.trim().isEmpty()) {
                displayMessage = String.format("%s, your task is ready. Are you available?", 
                    userName != null ? userName : "Hello there");
            }
            
            voiceMessageText.setText(displayMessage);
            voiceMessageText.setVisibility(View.VISIBLE);
        }

        updateDate();

        // Set up button click listeners with correct buttons
        if (yesButton != null) {
            yesButton.setOnClickListener(v -> dismissAlarm());  // YES button closes alarm
            Log.d(TAG, "YES button listener set up");
        }
        
        if (noButton != null) {
            noButton.setOnClickListener(v -> stopAlarm());  // NO button also closes alarm
            Log.d(TAG, "NO button listener set up");
        }

        if (repeatButton != null) {
            repeatButton.setOnClickListener(v -> repeatElevenLabs());
        }

        // Keep hidden buttons for compatibility
        if (dismissButton != null) {
            dismissButton.setOnClickListener(v -> dismissAlarm());
        }
        if (emergencyStop != null) {
            emergencyStop.setOnClickListener(v -> stopAlarm());
        }
    }

    private void repeatElevenLabs() {
        Log.d(TAG, "Repeat button pressed - requesting ABSOLUTE repeat audio");
        
        if (!useElevenLabs) {
            Log.w(TAG, "ElevenLabs not enabled for repeat");
            return;
        }
        
        Log.d(TAG, "Current audio status: " + audioSingleton.getStatus());
        
        // Request absolute repeat audio
        boolean repeatStarted = audioSingleton.playHindiQuoteOnly(alarmId, "MANUAL_REPEAT", this);
        
        if (repeatStarted) {
            Log.d(TAG, "✅ ABSOLUTE repeat audio started");
        } else {
            Log.w(TAG, "🔇 Repeat audio blocked");
            Log.d(TAG, "Status: " + audioSingleton.getStatus());
        }
    }

    private void startTimeUpdates() {
        timeHandler = new Handler();
        timeRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isClosing) {
                    updateTime();
                    updateDate();
                    timeHandler.postDelayed(this, 1000);
                }
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

    private void startControlledPulseAnimation() {
        View pulseCircle = findViewById(R.id.pulseCircle);
        if (pulseCircle != null && !isBlinkingStopped) {
            android.view.animation.Animation pulseAnimation = android.view.animation.AnimationUtils.loadAnimation(this, R.anim.pulse_animation);
            pulseCircle.startAnimation(pulseAnimation);
            
            new Handler().postDelayed(() -> {
                isBlinkingStopped = true;
                if (pulseCircle != null) {
                    pulseCircle.clearAnimation();
                    Log.d(TAG, "Pulse animation stopped after 30 seconds");
                }
            }, 30000);
        }
    }

    private void startAlarmVibration() {
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = new long[]{
                    0, 500, 1500, 300, 2500, 200, 3000
                };

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    VibrationEffect effect = VibrationEffect.createWaveform(pattern, -1);
                    vibrator.vibrate(effect);
                } else {
                    vibrator.vibrate(pattern, -1);
                }

                Log.d(TAG, "ElevenLabs vibration started");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting ElevenLabs vibration", e);
        }
    }

    // REMOVED: snoozeAlarm() method completely

    private void dismissAlarm() {
        Log.d(TAG, "Dismiss button pressed");
        
        stopAlarmSoundAndVibration();
        AlarmForegroundService.stopAlarmService(this, alarmId);
        clearAllAggressiveNotifications();

        Intent resultIntent = new Intent();
        resultIntent.putExtra("action", "dismissed");
        resultIntent.putExtra("alarmId", alarmId);
        resultIntent.putExtra("taskId", taskId);
        setResult(RESULT_OK, resultIntent);

        properFinish();
    }

    private void stopAlarm() {
        Log.d(TAG, "Stop button pressed - closing alarm immediately");
        
        // Immediately stop all alarm functions
        stopAlarmSoundAndVibration();
        
        // Stop any foreground service
        try {
            AlarmForegroundService.stopAlarmService(this, alarmId);
        } catch (Exception e) {
            Log.w(TAG, "Error stopping foreground service: " + e.getMessage());
        }
        
        // Clear all notifications
        clearAllAggressiveNotifications();

        // Set result for any listening components
        Intent resultIntent = new Intent();
        resultIntent.putExtra("action", "stopped");
        resultIntent.putExtra("alarmId", alarmId);
        resultIntent.putExtra("taskId", taskId);
        setResult(RESULT_OK, resultIntent);

        // Force immediate finish
        Log.d(TAG, "Force closing alarm activity immediately");
        isClosing = true;
        
        // Immediate finish without delay
        try {
            finishAndRemoveTask();
            Log.d(TAG, "Alarm activity closed successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error with finishAndRemoveTask, using regular finish", e);
            finish();
        }
    }

    private void properFinish() {
        if (isClosing) {
            return;
        }
        
        isClosing = true;
        Log.d(TAG, "Starting proper finish sequence");
        
        stopAlarmSoundAndVibration();
        clearAllAggressiveNotifications();
        
        try {
            Window window = getWindow();
            if (window != null) {
                window.clearFlags(
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                );
                Log.d(TAG, "Window flags cleared");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error clearing window flags", e);
        }
        
        new Handler().postDelayed(() -> {
            try {
                finishAndRemoveTask();
                Log.d(TAG, "Activity finished and removed from task");
            } catch (Exception e) {
                Log.e(TAG, "Error with finishAndRemoveTask, using regular finish", e);
                finish();
            }
        }, 100);
    }

    private void stopAlarmSoundAndVibration() {
        isBlinkingStopped = true;
        View pulseCircle = findViewById(R.id.pulseCircle);
        if (pulseCircle != null) {
            pulseCircle.clearAnimation();
        }
        
        // Stop ABSOLUTE single audio instance
        if (audioSingleton != null && alarmId != null) {
            audioSingleton.stopAudio(alarmId, "ACTIVITY_STOP");
            Log.d(TAG, "Absolute single audio instance stopped");
        }

        if (vibrator != null) {
            try {
                vibrator.cancel();
                Log.d(TAG, "Vibration stopped");
            } catch (Exception e) {
                Log.e(TAG, "Error stopping vibration", e);
            }
        }

        if (timeHandler != null && timeRunnable != null) {
            timeHandler.removeCallbacks(timeRunnable);
        }

        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "Wake lock released");
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Log.d(TAG, "AlarmActivity received new intent");
        
        clearAllAggressiveNotifications();
        setIntent(intent);
        
        String newAlarmId = intent.getStringExtra("alarmId");
        if (newAlarmId != null && !newAlarmId.equals(alarmId)) {
            Log.d(TAG, "New alarm ID: " + newAlarmId + " (current: " + alarmId + ")");
            
            // Stop current audio
            if (audioSingleton != null && alarmId != null) {
                audioSingleton.stopAudio(alarmId, "NEW_INTENT");
            }
            
            // Update to new alarm
            extractIntentData();
            
            // Request audio for new alarm
            if (useElevenLabs) {
                requestAbsoluteSingleAudio();
            }
        } else {
            Log.d(TAG, "Same alarm ID in new intent");
            if (audioSingleton != null) {
                Log.d(TAG, "Current audio status: " + audioSingleton.getStatus());
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "AlarmActivity resumed");
        
        clearAllAggressiveNotifications();
        
        if (isFullyInitialized && !isClosing) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
        
        if (audioSingleton != null) {
            Log.d(TAG, "Audio status on resume: " + audioSingleton.getStatus());
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        Log.d(TAG, "AlarmActivity paused");
    }

    @Override
    protected void onDestroy() {
        isClosing = true;
        isBlinkingStopped = true;
        
        Log.d(TAG, "AlarmActivity destroying - cleaning up absolute audio");
        
        // Stop absolute single audio
        if (audioSingleton != null && alarmId != null) {
            audioSingleton.stopAudio(alarmId, "ACTIVITY_DESTROY");
        }
        
        stopAlarmSoundAndVibration();
        clearAllAggressiveNotifications();
        super.onDestroy();
        Log.d(TAG, "AlarmActivity destroyed - absolute single audio mode");
    }

    @Override
    public void onBackPressed() {
        Log.d(TAG, "Back button pressed - ignoring");
        // Don't call super.onBackPressed() to prevent closing
    }
}
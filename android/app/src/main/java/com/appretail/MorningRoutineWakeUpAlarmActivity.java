package com.wingsfly;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.PixelFormat;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MorningRoutineWakeUpAlarmActivity extends Activity {

    private static final String TAG = "MorningWakeUpAlarm";
    private static final int SNOOZE_MINUTES = 5;
    
    private Vibrator vibrator;
    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private Handler timeHandler;
    private Runnable timeRunnable;
    private PowerManager.WakeLock wakeLock;
    
    // PERSISTENT OVERLAY
    private android.view.View persistentOverlay;
    private WindowManager windowManager;
    private boolean isOverlayCreated = false;
    private boolean isHandlingScreenEvent = false;
    private boolean isProceeding = false;
    
    // UI Elements (in overlay)
    private TextView overlayTimeTextView;
    private TextView overlayDateTextView;
    private TextView overlayRoutineNameTextView;
    private TextView overlayMessageTextView;
    private Button overlaySnoozeButton;
    private Button overlayProceedButton;
    
    // Alarm data
    private String userId;
    private String routineName;
    private String wakeUpTime;
    private String commands;
    private boolean isSnooze;
    
    // Screen state receiver
    private final BroadcastReceiver screenStateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (isHandlingScreenEvent) {
                Log.d(TAG, "⏭️ Already handling screen event, skipping");
                return;
            }
            
            isHandlingScreenEvent = true;
            
            String action = intent.getAction();
            if (Intent.ACTION_SCREEN_OFF.equals(action)) {
                Log.d(TAG, "📱 Screen turned OFF - User pressed lock button");
                handleScreenOff();
            } else if (Intent.ACTION_SCREEN_ON.equals(action)) {
                Log.d(TAG, "📱 Screen turned ON");
                handleScreenOn();
            } else if (Intent.ACTION_USER_PRESENT.equals(action)) {
                Log.d(TAG, "🔓 User unlocked device");
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    if (isOverlayCreated && persistentOverlay != null) {
                        persistentOverlay.bringToFront();
                        persistentOverlay.invalidate();
                    }
                    isHandlingScreenEvent = false;
                }, 200);
                return;
            }
            
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                isHandlingScreenEvent = false;
            }, 1000);
        }
    };
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "========================================");
        Log.d(TAG, "MORNING WAKE-UP ALARM ACTIVITY CREATED");
        Log.d(TAG, "========================================");
        
        extractAlarmData();
        
        // Check overlay permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Log.e(TAG, "❌ NO OVERLAY PERMISSION");
                // Fallback to regular activity
                setupScreenFlags();
                setContentView(R.layout.activity_morning_wakeup_alarm);
                initializeRegularViews();
                startAlarmSoundAndVibration();
                startTimeUpdates();
                return;
            }
        }
        
        // ✅ CRITICAL: Setup in correct order
        setupBasicActivity();
        
        // Set basic content view (transparent)
        setContentView(R.layout.activity_morning_wakeup_alarm);
        
        startAlarmSoundAndVibration();
        
        // ✅ Create overlay with delay
        new Handler(Looper.getMainLooper()).postDelayed(this::createPersistentAlarmOverlay, 300);
        
        registerReceivers();
        startTimeUpdates();
        
        Log.d(TAG, "✅ Morning wake-up alarm with overlay active");
        Log.d(TAG, "========================================");
    }
    
    /**
     * ✅ Setup basic activity (EXACTLY like NightModeLockActivity)
     */
    private void setupBasicActivity() {
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        );
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        
        acquireWakeLock();
        
        Log.d(TAG, "✅ Basic activity setup complete - lock screen bypassed");
    }
    
    private void setupScreenFlags() {
        Log.d(TAG, "Setting up screen flags for wake-up alarm...");
        
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
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                if (keyguardManager != null) {
                    keyguardManager.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                        @Override
                        public void onDismissSucceeded() {
                            Log.d(TAG, "Keyguard dismissed");
                        }
                    });
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error dismissing keyguard", e);
        }
        
        acquireWakeLock();
    }
    
    /**
     * ✅ ENHANCED: Acquire aggressive wake lock
     */
    private void acquireWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                // ✅ Use FULL_WAKE_LOCK for maximum power
                wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                    PowerManager.ON_AFTER_RELEASE,
                    "MorningRoutine:WakeUpAlarm"
                );
                wakeLock.acquire(60 * 60 * 1000L); // 60 minutes
                Log.d(TAG, "✅ FULL wake lock acquired (60 min)");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring wake lock", e);
        }
    }
    
    /**
     * ✅ Handle screen off - AGGRESSIVELY wake screen back up
     */
    private void handleScreenOff() {
        try {
            Log.d(TAG, "========================================");
            Log.d(TAG, "🔒 USER PRESSED LOCK BUTTON");
            Log.d(TAG, "========================================");
            
            // ✅ CRITICAL: Acquire NEW aggressive wake lock to turn screen back ON
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock screenWakeLock = null;
            
            if (powerManager != null) {
                screenWakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                    PowerManager.ON_AFTER_RELEASE,
                    "MorningRoutine:ScreenOnWake"
                );
                
                // ✅ This will FORCE the screen to turn back on
                screenWakeLock.acquire(3000L); // 3 seconds to wake screen
            }
            
            Log.d(TAG, "🔆 Aggressive wake lock acquired - FORCING screen back ON");
            
            // ✅ Keep main wake lock active too
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(60 * 60 * 1000L);
            }
            
            // ✅ Release the aggressive wake lock after delay
            PowerManager.WakeLock finalScreenWakeLock = screenWakeLock;
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    if (finalScreenWakeLock != null && finalScreenWakeLock.isHeld()) {
                        finalScreenWakeLock.release();
                        Log.d(TAG, "🔓 Released aggressive screen wake lock");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error releasing screen wake lock", e);
                }
            }, 3000);
            
            Log.d(TAG, "⏸️ Screen will turn back ON automatically");
            Log.d(TAG, "========================================");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error handling screen off", e);
        }
    }
    
    /**
     * ✅ Handle screen on - Simply refresh overlay
     */
    private void handleScreenOn() {
        try {
            // Simply ensure the existing overlay is visible
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (isOverlayCreated && persistentOverlay != null) {
                    // Just bring to front, don't recreate
                    persistentOverlay.bringToFront();
                    persistentOverlay.invalidate();
                    
                    // Update displays
                    updateTime();
                    
                    Log.d(TAG, "✅ Overlay refreshed on screen on");
                } else {
                    // Only recreate if it's missing
                    Log.w(TAG, "⚠️ Overlay missing on screen on - recreating");
                    createPersistentAlarmOverlay();
                }
            }, 150);
        } catch (Exception e) {
            Log.e(TAG, "Error handling screen on", e);
        }
    }
    
    private void createPersistentAlarmOverlay() {
        try {
            if (isOverlayCreated && persistentOverlay != null) {
                Log.d(TAG, "⏭️ Overlay already exists, skipping creation");
                return;
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(this)) {
                    Log.e(TAG, "❌ Cannot create overlay");
                    return;
                }
            }
            
            windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
            
            // Remove existing overlay if present
            if (persistentOverlay != null) {
                try {
                    windowManager.removeView(persistentOverlay);
                } catch (Exception e) { 
                    Log.w(TAG, "Error removing old overlay", e);
                }
                persistentOverlay = null;
            }
            
            // Inflate the wake-up alarm layout
            LayoutInflater inflater = (LayoutInflater) getSystemService(Context.LAYOUT_INFLATER_SERVICE);
            persistentOverlay = inflater.inflate(R.layout.activity_morning_wakeup_alarm, null);
            
            // Initialize UI elements
            overlayTimeTextView = persistentOverlay.findViewById(R.id.currentTime);
            overlayDateTextView = persistentOverlay.findViewById(R.id.currentDate);
            overlayRoutineNameTextView = persistentOverlay.findViewById(R.id.routineName);
            overlayMessageTextView = persistentOverlay.findViewById(R.id.messageText);
            overlaySnoozeButton = persistentOverlay.findViewById(R.id.snoozeButton);
            overlayProceedButton = persistentOverlay.findViewById(R.id.proceedButton);
            
            // Set routine name
            if (routineName != null && !routineName.isEmpty()) {
                overlayRoutineNameTextView.setText(routineName);
            } else {
                overlayRoutineNameTextView.setText("Morning Routine");
            }
            
            // Set message
            if (isSnooze) {
                overlayMessageTextView.setText("Time to wake up! (Snoozed)");
            } else {
                overlayMessageTextView.setText("Good morning! Time to start your day");
            }
            
            // Update time and date
            updateTime();
            updateDate();
            
            // ✅ Button click handlers
            overlaySnoozeButton.setOnClickListener(v -> {
                Log.d(TAG, "========================================");
                Log.d(TAG, "SNOOZE BUTTON CLICKED");
                Log.d(TAG, "========================================");
                
                if (isProceeding) {
                    Log.d(TAG, "⏭️ Already proceeding, ignoring");
                    return;
                }
                
                isProceeding = true;
                overlaySnoozeButton.setEnabled(false);
                overlaySnoozeButton.setAlpha(0.5f);
                
                handleSnooze();
            });
            
            overlayProceedButton.setOnClickListener(v -> {
                Log.d(TAG, "========================================");
                Log.d(TAG, "PROCEED BUTTON CLICKED");
                Log.d(TAG, "========================================");
                
                if (isProceeding) {
                    Log.d(TAG, "⏭️ Already proceeding, ignoring");
                    return;
                }
                
                isProceeding = true;
                overlayProceedButton.setEnabled(false);
                overlayProceedButton.setAlpha(0.5f);
                
                handleProceed();
            });
            
            // ✅ Window parameters for persistent overlay
            WindowManager.LayoutParams layoutParams = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    : WindowManager.LayoutParams.TYPE_SYSTEM_ERROR,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN |
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS |
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED |
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
            );
            
            layoutParams.gravity = Gravity.TOP | Gravity.START;
            layoutParams.x = 0;
            layoutParams.y = 0;
            
            // Add the overlay to WindowManager
            windowManager.addView(persistentOverlay, layoutParams);
            
            isOverlayCreated = true;
            Log.d(TAG, "✅ Persistent alarm overlay created and displayed");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error creating persistent overlay", e);
            isOverlayCreated = false;
        }
    }
    
    private void extractAlarmData() {
        Intent intent = getIntent();
        userId = intent.getStringExtra("userId");
        routineName = intent.getStringExtra("name");
        wakeUpTime = intent.getStringExtra("time");
        commands = intent.getStringExtra("commands");
        isSnooze = intent.getBooleanExtra("isSnooze", false);
        
        Log.d(TAG, "Wake-up alarm data extracted:");
        Log.d(TAG, "  - UserID: " + userId);
        Log.d(TAG, "  - RoutineName: " + routineName);
        Log.d(TAG, "  - WakeUpTime: " + wakeUpTime);
        Log.d(TAG, "  - IsSnooze: " + isSnooze);
    }
    
    private void initializeRegularViews() {
        TextView timeTextView = findViewById(R.id.currentTime);
        TextView dateTextView = findViewById(R.id.currentDate);
        TextView routineNameTextView = findViewById(R.id.routineName);
        TextView messageTextView = findViewById(R.id.messageText);
        Button snoozeButton = findViewById(R.id.snoozeButton);
        Button proceedButton = findViewById(R.id.proceedButton);
        
        if (routineName != null && !routineName.isEmpty()) {
            routineNameTextView.setText(routineName);
        } else {
            routineNameTextView.setText("Morning Routine");
        }
        
        if (isSnooze) {
            messageTextView.setText("Time to wake up! (Snoozed)");
        } else {
            messageTextView.setText("Good morning! Time to start your day");
        }
        
        snoozeButton.setOnClickListener(v -> handleSnooze());
        proceedButton.setOnClickListener(v -> handleProceed());
    }
    
    private void startAlarmSoundAndVibration() {
        Log.d(TAG, "Starting alarm sound and vibration...");
        startVibration();
        startAlarmSound();
    }
    
    private void startVibration() {
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 1000, 1000};
                
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
    
    private void startAlarmSound() {
        try {
            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            
            if (audioManager != null) {
                int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0);
            }
            
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            
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
            
            mediaPlayer.setDataSource(this, alarmUri);
            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
            
            Log.d(TAG, "Alarm sound started");
            
        } catch (Exception e) {
            Log.e(TAG, "Error starting alarm sound", e);
        }
    }
    
    private void handleSnooze() {
        stopAlarmSoundAndVibration();
        scheduleSnoozeAlarm();
        
        Log.d(TAG, "Alarm snoozed for " + SNOOZE_MINUTES + " minutes");
        finishActivity();
    }
    
    private void handleProceed() {
        stopAlarmSoundAndVibration();
        startVoiceCommands();
        
        Log.d(TAG, "Proceeding to voice commands");
        finishActivity();
    }
    
    private void scheduleSnoozeAlarm() {
        try {
            long snoozeTime = System.currentTimeMillis() + (SNOOZE_MINUTES * 60 * 1000);
            
            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                Log.e(TAG, "AlarmManager not available");
                return;
            }
            
            Intent snoozeIntent = new Intent(this, MorningRoutineWakeUpAlarmReceiver.class);
            snoozeIntent.putExtra("userId", userId);
            snoozeIntent.putExtra("name", routineName);
            snoozeIntent.putExtra("time", wakeUpTime);
            snoozeIntent.putExtra("commands", commands);
            snoozeIntent.putExtra("isSnooze", true);
            snoozeIntent.putExtra("alarmType", "MORNING_WAKEUP_SNOOZE");
            snoozeIntent.setAction("MORNING_WAKEUP_SNOOZE_" + userId + "_" + System.currentTimeMillis());
            
            int requestCode = Math.abs(("morning_snooze_" + userId + "_" + System.currentTimeMillis()).hashCode());
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
            
            SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
            Log.d(TAG, "Snooze alarm scheduled for: " + sdf.format(new Date(snoozeTime)));
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling snooze alarm", e);
        }
    }
    
    private void startVoiceCommands() {
        try {
            Log.d(TAG, "Starting voice commands sequence...");
            
            Intent voiceIntent = new Intent(this, MorningVoiceCommandActivity.class);
            voiceIntent.putExtra("userId", userId);
            voiceIntent.putExtra("name", routineName);
            voiceIntent.putExtra("time", wakeUpTime);
            voiceIntent.putExtra("commands", commands);
            voiceIntent.putExtra("startFromIndex", 0);
            voiceIntent.putExtra("triggeredTime", System.currentTimeMillis());
            voiceIntent.putExtra("fromWakeUpAlarm", true);
            
            voiceIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            );
            
            startActivity(voiceIntent);
            Log.d(TAG, "Voice commands activity started");
            
        } catch (Exception e) {
            Log.e(TAG, "Error starting voice commands", e);
        }
    }
    
    private void stopAlarmSoundAndVibration() {
        Log.d(TAG, "Stopping alarm sound and vibration...");
        
        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Exception e) {
                Log.e(TAG, "Error stopping vibration", e);
            }
            vibrator = null;
        }
        
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Exception e) {
                Log.e(TAG, "Error stopping media player", e);
            }
            mediaPlayer = null;
        }
        
        if (timeHandler != null && timeRunnable != null) {
            timeHandler.removeCallbacks(timeRunnable);
        }
    }
    
    private void removePersistentOverlay() {
        try {
            if (persistentOverlay != null) {
                windowManager.removeView(persistentOverlay);
                persistentOverlay = null;
                isOverlayCreated = false;
                Log.d(TAG, "✅ Persistent overlay removed");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error removing overlay", e);
            isOverlayCreated = false;
        }
    }
    
    private void finishActivity() {
        Log.d(TAG, "Finishing wake-up alarm activity...");
        
        stopAlarmService();
        cancelNotifications();
        removePersistentOverlay();
        releaseWakeLock();
        clearWindowFlags();
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                finishAndRemoveTask();
            } else {
                finish();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error finishing activity", e);
            finish();
        }
    }
    
    private void stopAlarmService() {
        try {
            Intent stopServiceIntent = new Intent(this, MorningRoutineWakeUpAlarmService.class);
            stopServiceIntent.putExtra("serviceAction", "STOP_WAKEUP_ALARM");
            stopServiceIntent.putExtra("userId", userId);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(stopServiceIntent);
            } else {
                startService(stopServiceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping service", e);
        }
    }
    
    private void cancelNotifications() {
        try {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancelAll();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling notifications", e);
        }
    }
    
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
            Log.d(TAG, "✅ Window flags cleared");
        } catch (Exception e) {
            Log.e(TAG, "Error clearing window flags", e);
        }
    }
    
    private void registerReceivers() {
        IntentFilter screenFilter = new IntentFilter();
        screenFilter.addAction(Intent.ACTION_SCREEN_OFF);
        screenFilter.addAction(Intent.ACTION_SCREEN_ON);
        screenFilter.addAction(Intent.ACTION_USER_PRESENT);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenStateReceiver, screenFilter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(screenStateReceiver, screenFilter);
        }
        
        Log.d(TAG, "✅ Screen state receivers registered");
    }
    
    private void startTimeUpdates() {
        timeHandler = new Handler(Looper.getMainLooper());
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
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.getDefault());
            String currentTime = sdf.format(new Date());
            
            if (overlayTimeTextView != null) {
                overlayTimeTextView.setText(currentTime);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating time", e);
        }
    }
    
    private void updateDate() {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("EEEE, d MMMM", Locale.getDefault());
            String currentDate = sdf.format(new Date());
            
            if (overlayDateTextView != null) {
                overlayDateTextView.setText(currentDate);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating date", e);
        }
    }
    
    @Override
    public void onBackPressed() {
        // Disable back button during alarm
        Log.d(TAG, "Back button pressed - ignoring");
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Log.d(TAG, "🔄 onNewIntent called");
        
        if (!isProceeding && isOverlayCreated && persistentOverlay != null) {
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                persistentOverlay.bringToFront();
                updateTime();
                updateDate();
            }, 100);
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "▶️ onResume");
        
        // Only check if overlay exists, don't recreate
        if (!isProceeding) {
            if (isOverlayCreated && persistentOverlay != null) {
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    persistentOverlay.bringToFront();
                    persistentOverlay.invalidate();
                }, 100);
            }
        }
    }
    
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        Log.d(TAG, "🎯 Window focus changed: " + hasFocus);
        
        if (hasFocus && !isProceeding) {
            // ✅ Every time we get focus, ensure we're visible
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (isOverlayCreated && persistentOverlay != null) {
                    persistentOverlay.bringToFront();
                    persistentOverlay.invalidate();
                }
            }, 50);
        }
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        Log.d(TAG, "⏸️ onPause - isProceeding: " + isProceeding);
    }
    
    @Override
    protected void onStop() {
        super.onStop();
        Log.d(TAG, "⏹️ onStop - isProceeding: " + isProceeding);
    }
    
    @Override
    protected void onDestroy() {
        Log.d(TAG, "Activity destroying");
        
        try {
            unregisterReceiver(screenStateReceiver);
        } catch (Exception e) {
            Log.e(TAG, "Error unregistering receiver", e);
        }
        
        stopAlarmSoundAndVibration();
        removePersistentOverlay();
        releaseWakeLock();
        clearWindowFlags();
        
        super.onDestroy();
        
        Log.d(TAG, "========================================");
        Log.d(TAG, "✅ ALARM ACTIVITY DESTROYED");
        Log.d(TAG, "========================================");
    }
}
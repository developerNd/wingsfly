package com.wingsfly;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MorningVoiceCommandActivity extends Activity {

    private static final String TAG = "MorningVoiceCommand";
    
    private TextView currentTimeTextView;
    private TextView currentDateTextView;
    private TextView routineNameTextView;
    private TextView currentCommandTextView;
    private TextView commandCounterTextView;
    
    private PowerManager.WakeLock wakeLock;
    private Handler timeHandler;
    private Runnable timeRunnable;
    private BroadcastReceiver screenUnlockReceiver;
    
    // Alarm data
    private String userId;
    private String routineName;
    private String alarmTime;
    private boolean isDeviceLocked;
    private long triggeredTime;
    
    // Commands data
    private List<CommandItem> commands;
    private int currentCommandIndex = 0;
    
    // TTS Service
    private MorningRoutineTTSService ttsService;
    
    // Auto-close handler
    private Handler autoCloseHandler;
    private Runnable autoCloseRunnable;
    
    // Kiosk mode flag
    private boolean isKioskModeActive = false;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "========================================");
        Log.d(TAG, "Morning Voice Command Activity Created");
        Log.d(TAG, "========================================");
        
        setupScreenFlags();
        acquireWakeLock();
        
        setContentView(R.layout.activity_morning_voice_command);
        
        extractAlarmData();
        initializeViews();
        
        ttsService = new MorningRoutineTTSService(this);
        autoCloseHandler = new Handler(Looper.getMainLooper());
        
        // Enable kiosk mode
        enableKioskMode();
        
        // Register screen unlock receiver
        registerScreenUnlockReceiver();
        
        startTimeUpdates();
        showCurrentCommand();
        
        Log.d(TAG, "Morning routine initialized with " + commands.size() + " commands");
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
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                KeyguardManager keyguardManager = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
                if (keyguardManager != null) {
                    keyguardManager.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                        @Override
                        public void onDismissSucceeded() {
                            Log.d(TAG, "Keyguard dismissed");
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
            PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                    PowerManager.ON_AFTER_RELEASE,
                    "MorningRoutine:Activity"
                );
                wakeLock.acquire(60 * 60 * 1000L); // 1 hour max
                Log.d(TAG, "Wake lock acquired");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring wake lock", e);
        }
    }
    
    private void extractAlarmData() {
        Intent intent = getIntent();
        userId = intent.getStringExtra("userId");
        routineName = intent.getStringExtra("name");
        alarmTime = intent.getStringExtra("time");
        isDeviceLocked = intent.getBooleanExtra("isDeviceLocked", false);
        triggeredTime = intent.getLongExtra("triggeredTime", System.currentTimeMillis());
        
        // CRITICAL: Get the starting command index if provided
        currentCommandIndex = intent.getIntExtra("startFromIndex", 0);
        
        String commandsJson = intent.getStringExtra("commands");
        commands = new ArrayList<>();
        
        try {
            if (commandsJson != null && !commandsJson.isEmpty()) {
                JSONArray jsonArray = new JSONArray(commandsJson);
                
                for (int i = 0; i < jsonArray.length(); i++) {
                    JSONObject jsonCmd = jsonArray.getJSONObject(i);
                    
                    CommandItem cmd = new CommandItem();
                    cmd.id = jsonCmd.getString("id");
                    cmd.sequence = jsonCmd.getInt("sequence");
                    cmd.text = jsonCmd.optString("text", "");
                    cmd.duration = jsonCmd.has("duration") ? jsonCmd.getInt("duration") : 2;
                    cmd.gapMinutes = jsonCmd.has("gap_minutes") ? jsonCmd.getInt("gap_minutes") : 0;
                    
                    commands.add(cmd);
                    
                    Log.d(TAG, "Command " + (i+1) + ": " + cmd.text + 
                          ", duration: " + cmd.duration + " min, gap: " + cmd.gapMinutes + " min");
                }
                
                Log.d(TAG, "========================================");
                Log.d(TAG, "Parsed " + commands.size() + " commands");
                Log.d(TAG, "Starting from command index: " + currentCommandIndex);
                Log.d(TAG, "========================================");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error parsing commands JSON", e);
        }
    }
    
    private void initializeViews() {
        currentTimeTextView = findViewById(R.id.currentTime);
        currentDateTextView = findViewById(R.id.currentDate);
        routineNameTextView = findViewById(R.id.routineName);
        currentCommandTextView = findViewById(R.id.currentCommandText);
        commandCounterTextView = findViewById(R.id.commandCounter);
        
        if (routineName != null && !routineName.isEmpty()) {
            routineNameTextView.setText(routineName);
            routineNameTextView.setVisibility(View.VISIBLE);
        } else {
            routineNameTextView.setVisibility(View.GONE);
        }
        
        updateTime();
        updateDate();
    }
    
    // ==================== KIOSK MODE ====================
    
    private void enableKioskMode() {
        try {
            Log.d(TAG, "Enabling kiosk mode...");
            
            // Start lock task (app pinning)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                try {
                    ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
                    if (activityManager != null) {
                        int lockTaskMode = activityManager.getLockTaskModeState();
                        
                        if (lockTaskMode == ActivityManager.LOCK_TASK_MODE_NONE) {
                            startLockTask();
                            isKioskModeActive = true;
                            Log.d(TAG, "✅ Kiosk mode activated");
                        }
                    }
                } catch (SecurityException e) {
                    Log.w(TAG, "⚠️ Kiosk mode requires device owner or manual pinning: " + e.getMessage());
                } catch (Exception e) {
                    Log.w(TAG, "⚠️ Kiosk mode not available: " + e.getMessage());
                }
            }
            
            // Hide system UI
            hideSystemUI();
            
            // Start continuous system UI hiding
            startContinuousSystemUIHiding();
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error enabling kiosk mode: " + e.getMessage());
        }
    }
    
    private void disableKioskMode() {
        try {
            Log.d(TAG, "Disabling kiosk mode...");
            
            // Stop continuous system UI hiding
            stopContinuousSystemUIHiding();
            
            // Exit lock task
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                try {
                    ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
                    if (activityManager != null && activityManager.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE) {
                        stopLockTask();
                        isKioskModeActive = false;
                        Log.d(TAG, "✅ Kiosk mode deactivated");
                    }
                } catch (Exception e) {
                    Log.w(TAG, "⚠️ Error exiting kiosk mode: " + e.getMessage());
                }
            }
            
            // Show system UI
            showSystemUI();
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error disabling kiosk mode: " + e.getMessage());
        }
    }
    
    private void hideSystemUI() {
        try {
            Window window = getWindow();
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.setDecorFitsSystemWindows(false);
                window.getInsetsController().hide(
                    android.view.WindowInsets.Type.statusBars() | 
                    android.view.WindowInsets.Type.navigationBars() |
                    android.view.WindowInsets.Type.systemBars()
                );
                window.getInsetsController().setSystemBarsBehavior(
                    android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            } else {
                window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LOW_PROFILE
                );
            }
            
            // Set navigation and status bar colors
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.setStatusBarColor(Color.WHITE);
                window.setNavigationBarColor(Color.WHITE);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error hiding system UI", e);
        }
    }
    
    private void showSystemUI() {
        try {
            Window window = getWindow();
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.setDecorFitsSystemWindows(true);
                window.getInsetsController().show(
                    android.view.WindowInsets.Type.statusBars() | 
                    android.view.WindowInsets.Type.navigationBars() |
                    android.view.WindowInsets.Type.systemBars()
                );
            } else {
                window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error showing system UI", e);
        }
    }
    
    private void startContinuousSystemUIHiding() {
        Handler handler = new Handler(Looper.getMainLooper());
        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                if (isKioskModeActive) {
                    hideSystemUI();
                    handler.postDelayed(this, 500);
                }
            }
        };
        handler.post(runnable);
    }
    
    private void stopContinuousSystemUIHiding() {
        // Handler will stop on its own when isKioskModeActive = false
    }
    
    // ==================== SCREEN UNLOCK RECEIVER ====================
    
    private void registerScreenUnlockReceiver() {
        try {
            screenUnlockReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (Intent.ACTION_USER_PRESENT.equals(intent.getAction())) {
                        Log.d(TAG, "🔓 Screen unlocked - Reapplying kiosk lock");
                        if (isKioskModeActive) {
                            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                                enableKioskMode();
                            }, 200);
                        }
                    }
                }
            };
            
            IntentFilter filter = new IntentFilter(Intent.ACTION_USER_PRESENT);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(screenUnlockReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(screenUnlockReceiver, filter);
            }
            
            Log.d(TAG, "✅ Screen unlock receiver registered");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error registering screen unlock receiver: " + e.getMessage());
        }
    }
    
    private void unregisterScreenUnlockReceiver() {
        try {
            if (screenUnlockReceiver != null) {
                unregisterReceiver(screenUnlockReceiver);
                Log.d(TAG, "✅ Screen unlock receiver unregistered");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error unregistering receiver: " + e.getMessage());
        } finally {
            screenUnlockReceiver = null;
        }
    }
    
    // ==================== COMMAND DISPLAY ====================
    
    private void showCurrentCommand() {
        if (commands.isEmpty()) {
            Log.e(TAG, "No commands to show");
            finishAllCommands();
            return;
        }
        
        if (currentCommandIndex >= commands.size()) {
            Log.d(TAG, "All commands completed");
            finishAllCommands();
            return;
        }
        
        CommandItem currentCommand = commands.get(currentCommandIndex);
        
        // Update UI
        commandCounterTextView.setText("Command " + (currentCommandIndex + 1) + " of " + commands.size());
        currentCommandTextView.setText(currentCommand.text);
        currentCommandTextView.setVisibility(View.VISIBLE);
        
        // Play TTS
        playCommandAudio(currentCommand);
        
        // Schedule auto-close after duration
        scheduleAutoClose(currentCommand.duration);
        
        Log.d(TAG, "Showing command " + (currentCommandIndex + 1) + " - Will auto-close in " + currentCommand.duration + " minutes");
    }
    
    private void playCommandAudio(CommandItem command) {
        try {
            if (ttsService != null && command.text != null && !command.text.isEmpty()) {
                Log.d(TAG, "Playing TTS for: " + command.text);
                ttsService.speakCommand(command.text);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error playing command audio", e);
        }
    }
    
    private void scheduleAutoClose(int durationMinutes) {
        // Cancel any existing auto-close
        if (autoCloseRunnable != null) {
            autoCloseHandler.removeCallbacks(autoCloseRunnable);
        }
        
        // Schedule new auto-close
        autoCloseRunnable = () -> {
            Log.d(TAG, "Auto-close triggered after " + durationMinutes + " minutes");
            onCommandComplete();
        };
        
        long delayMillis = durationMinutes * 60 * 1000L;
        autoCloseHandler.postDelayed(autoCloseRunnable, delayMillis);
        
        Log.d(TAG, "Auto-close scheduled for " + durationMinutes + " minutes");
    }
    
    private void onCommandComplete() {
        Log.d(TAG, "Command completed");
        
        // Stop TTS
        if (ttsService != null) {
            ttsService.stopAudio();
        }
        
        // Get current command
        if (currentCommandIndex >= commands.size()) {
            finishAllCommands();
            return;
        }
        
        CommandItem currentCommand = commands.get(currentCommandIndex);
        
        // Move to next command index
        currentCommandIndex++;
        
        // Check if this was the last command
        if (currentCommandIndex >= commands.size()) {
            Log.d(TAG, "All commands completed");
            finishAllCommands();
            return;
        }
        
        // Check if current command has gap time
        if (currentCommand.gapMinutes > 0) {
            // Schedule next command after gap time
            scheduleNextCommand(currentCommand.gapMinutes);
            
            // Close this activity
            finishActivity();
        } else {
            // No gap, show next command immediately
            showCurrentCommand();
        }
    }
    
    private void scheduleNextCommand(int gapMinutes) {
        Log.d(TAG, "========================================");
        Log.d(TAG, "Scheduling next command after " + gapMinutes + " minutes");
        Log.d(TAG, "Next command index will be: " + currentCommandIndex);
        Log.d(TAG, "========================================");
        
        try {
            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                Log.e(TAG, "AlarmManager not available");
                return;
            }
            
            // Calculate trigger time
            long triggerTime = System.currentTimeMillis() + (gapMinutes * 60 * 1000L);
            
            // Create intent for next command
            Intent intent = new Intent(this, MorningRoutineAlarmReceiver.class);
            intent.putExtra("userId", userId);
            intent.putExtra("name", routineName);
            intent.putExtra("time", alarmTime);
            intent.putExtra("commands", getIntent().getStringExtra("commands"));
            intent.putExtra("alarmType", "MORNING_ROUTINE_NEXT");
            intent.putExtra("isDeviceLocked", isDeviceLocked);
            intent.putExtra("triggeredTime", System.currentTimeMillis());
            
            // CRITICAL: Pass the NEXT command index to start from
            intent.putExtra("startFromIndex", currentCommandIndex);
            
            intent.setAction("MORNING_ROUTINE_NEXT_" + userId + "_" + currentCommandIndex);
            
            int requestCode = Math.abs(("morning_next_" + userId + "_" + currentCommandIndex).hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                this,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Schedule alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                Log.d(TAG, "✅ Scheduled using setExactAndAllowWhileIdle");
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                Log.d(TAG, "✅ Scheduled using setExact");
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                Log.d(TAG, "✅ Scheduled using set");
            }
            
            SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
            Log.d(TAG, "⏰ Next command (index " + currentCommandIndex + ") scheduled for: " + sdf.format(new Date(triggerTime)));
            Log.d(TAG, "========================================");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error scheduling next command", e);
        }
    }
    
    private void finishActivity() {
        Log.d(TAG, "Finishing activity...");
        
        // Disable kiosk mode
        disableKioskMode();
        
        // Unregister receiver
        unregisterScreenUnlockReceiver();
        
        // Cancel auto-close
        if (autoCloseRunnable != null) {
            autoCloseHandler.removeCallbacks(autoCloseRunnable);
        }
        
        if (ttsService != null) {
            ttsService.stopAudio();
            ttsService.cleanup();
        }
        
        releaseWakeLock();
        
        if (timeHandler != null && timeRunnable != null) {
            timeHandler.removeCallbacks(timeRunnable);
        }
        
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
    
    private void finishAllCommands() {
        Log.d(TAG, "All commands finished - Closing morning routine");
        finishActivity();
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
        } catch (Exception e) {
            Log.e(TAG, "Error clearing window flags", e);
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
        if (currentTimeTextView != null) {
            SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.getDefault());
            String currentTime = sdf.format(new Date());
            currentTimeTextView.setText(currentTime);
        }
    }
    
    private void updateDate() {
        if (currentDateTextView != null) {
            SimpleDateFormat sdf = new SimpleDateFormat("EEEE, d MMMM", Locale.getDefault());
            String currentDate = sdf.format(new Date());
            currentDateTextView.setText(currentDate);
        }
    }
    
    @Override
    protected void onDestroy() {
        Log.d(TAG, "Activity destroying");
        
        disableKioskMode();
        unregisterScreenUnlockReceiver();
        
        if (autoCloseRunnable != null) {
            autoCloseHandler.removeCallbacks(autoCloseRunnable);
        }
        
        if (ttsService != null) {
            ttsService.stopAudio();
            ttsService.cleanup();
        }
        
        releaseWakeLock();
        
        super.onDestroy();
    }
    
    @Override
    public void onBackPressed() {
        // Disable back button during kiosk mode
        Log.d(TAG, "Back button pressed - ignoring during kiosk mode");
    }
    
    private static class CommandItem {
        String id;
        int sequence;
        String text;
        int duration; // Minutes to show lock screen
        int gapMinutes; // Minutes to wait before next command
    }
}
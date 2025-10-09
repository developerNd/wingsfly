package com.wingsfly;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.PowerManager;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class VoiceCommandAlarmActivity extends Activity {

    private static final String TAG = "VoiceCommandAlarmActivity";
    private static final String PREFS_NAME = "VoiceCommandAlarmPrefs";
    
    private TextView currentTimeTextView;
    private TextView currentDateTextView;
    private TextView alarmNameTextView;
    private TextView commandCounterTextView;
    private TextView currentCommandTextView;
    private TextView completedCommandsTextView;
    private Button nextButton;
    private LinearLayout completedCommandsLayout;
    
    private PowerManager.WakeLock wakeLock;
    private Handler timeHandler;
    private Runnable timeRunnable;
    
    // Alarm data
    private String alarmId;
    private String alarmName;
    private String alarmTime;
    private String days;
    private boolean isDeviceLocked;
    private long triggeredTime;
    
    // Commands data
    private List<CommandItem> commands;
    private int currentCommandIndex = 0;
    
    // TTS Service
    private VoiceCommandTTSService ttsService;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "Voice command alarm activity created");
        
        setupScreenFlags();
        acquireWakeLock();
        
        setContentView(R.layout.activity_voice_command_alarm);
        
        extractAlarmData();
        
        // Load current command index from saved state
        loadCommandIndex();
        
        initializeViews();
        
        ttsService = new VoiceCommandTTSService(this);
        
        startTimeUpdates();
        showCurrentCommand();
        
        Log.d(TAG, "Voice command alarm activity initialized with command index: " + currentCommandIndex);
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
                    "VoiceCommandAlarm:Activity"
                );
                wakeLock.acquire(30 * 60 * 1000L);
                Log.d(TAG, "Wake lock acquired");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring wake lock", e);
        }
    }
    
    private void extractAlarmData() {
        Intent intent = getIntent();
        alarmId = intent.getStringExtra("alarmId");
        alarmName = intent.getStringExtra("name");
        alarmTime = intent.getStringExtra("time");
        days = intent.getStringExtra("days");
        isDeviceLocked = intent.getBooleanExtra("isDeviceLocked", false);
        triggeredTime = intent.getLongExtra("triggeredTime", System.currentTimeMillis());
        
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
                    cmd.gapMinutes = jsonCmd.has("gap_minutes") ? jsonCmd.getInt("gap_minutes") : 0;
                    
                    // Extract audio file path
                    if (jsonCmd.has("audio_file_path") && !jsonCmd.isNull("audio_file_path")) {
                        cmd.audioFilePath = jsonCmd.getString("audio_file_path");
                        Log.d(TAG, "Command " + (i+1) + " has audio file: " + cmd.audioFilePath);
                    }
                    
                    if (jsonCmd.has("audio_file_name") && !jsonCmd.isNull("audio_file_name")) {
                        cmd.audioFileName = jsonCmd.getString("audio_file_name");
                    }
                    
                    commands.add(cmd);
                    
                    String cmdType = cmd.audioFilePath != null ? "Audio" : "Text";
                    Log.d(TAG, "Command " + (i+1) + " [" + cmdType + "]: " + 
                          (cmd.audioFilePath != null ? cmd.audioFileName : cmd.text) + 
                          ", gap: " + cmd.gapMinutes + " min");
                }
                
                Log.d(TAG, "Parsed " + commands.size() + " commands");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error parsing commands JSON", e);
        }
    }
    
    private void loadCommandIndex() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        currentCommandIndex = prefs.getInt(alarmId + "_command_index", 0);
        Log.d(TAG, "Loaded command index: " + currentCommandIndex);
    }
    
    private void saveCommandIndex() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putInt(alarmId + "_command_index", currentCommandIndex).apply();
        Log.d(TAG, "Saved command index: " + currentCommandIndex);
    }
    
    private void clearCommandIndex() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(alarmId + "_command_index").apply();
        Log.d(TAG, "Cleared command index");
    }
    
    private void initializeViews() {
        currentTimeTextView = findViewById(R.id.currentTime);
        currentDateTextView = findViewById(R.id.currentDate);
        alarmNameTextView = findViewById(R.id.alarmName);
        commandCounterTextView = findViewById(R.id.commandCounter);
        currentCommandTextView = findViewById(R.id.currentCommandText);
        completedCommandsTextView = findViewById(R.id.completedCommandsText);
        nextButton = findViewById(R.id.nextButton);
        completedCommandsLayout = findViewById(R.id.completedCommandsLayout);
        
        if (alarmName != null && !alarmName.isEmpty()) {
            alarmNameTextView.setText(alarmName);
            alarmNameTextView.setVisibility(View.VISIBLE);
        } else {
            alarmNameTextView.setVisibility(View.GONE);
        }
        
        nextButton.setOnClickListener(v -> onNextCommand());
        
        updateTime();
        updateDate();
    }
    
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
        
        // Update UI - show audio file name or text
        commandCounterTextView.setText("Command " + (currentCommandIndex + 1) + " of " + commands.size());
        
        if (currentCommand.audioFilePath != null && !currentCommand.audioFilePath.isEmpty()) {
            // Show audio file name
            String displayText = currentCommand.audioFileName != null ? 
                "🎵 " + currentCommand.audioFileName : "🎵 Playing audio...";
            currentCommandTextView.setText(displayText);
        } else {
            // Show text command
            currentCommandTextView.setText(currentCommand.text);
        }
        
        currentCommandTextView.setVisibility(View.VISIBLE);
        
        // Update button text
        if (currentCommandIndex == commands.size() - 1) {
            nextButton.setText("Complete");
        } else {
            nextButton.setText("Next");
        }
        
        nextButton.setEnabled(true);
        
        updateCompletedCommands();
        playCommandAudio(currentCommand);
        
        Log.d(TAG, "Showing command " + (currentCommandIndex + 1));
    }
    
    private void playCommandAudio(CommandItem command) {
        try {
            if (ttsService != null) {
                // Pass both text and audio file path - service will decide which to use
                Log.d(TAG, "Playing command audio - Text: " + command.text + ", File: " + command.audioFilePath);
                ttsService.speakCommand(command.text, command.audioFilePath);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error playing command audio", e);
        }
    }
    
    private void updateCompletedCommands() {
        if (currentCommandIndex == 0) {
            completedCommandsLayout.setVisibility(View.GONE);
            return;
        }
        
        completedCommandsLayout.setVisibility(View.VISIBLE);
        StringBuilder completed = new StringBuilder("Completed:\n");
        
        for (int i = 0; i < currentCommandIndex; i++) {
            CommandItem cmd = commands.get(i);
            String cmdText = cmd.audioFileName != null ? "🎵 " + cmd.audioFileName : cmd.text;
            completed.append("✓ ").append(cmdText).append("\n");
        }
        
        completedCommandsTextView.setText(completed.toString().trim());
    }
    
    private void onNextCommand() {
        Log.d(TAG, "Next button pressed");
        
        // Stop current audio
        if (ttsService != null) {
            ttsService.stopAudio();
        }
        
        // Get current command
        if (currentCommandIndex >= commands.size()) {
            finishAllCommands();
            return;
        }
        
        CommandItem currentCommand = commands.get(currentCommandIndex);
        Log.d(TAG, "Current command gap: " + currentCommand.gapMinutes + " minutes");
        
        // Move to next command index
        currentCommandIndex++;
        saveCommandIndex();
        
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
            // No gap, reopen immediately with next command
            reopenForNextCommand();
        }
    }
    
    private void scheduleNextCommand(int gapMinutes) {
        Log.d(TAG, "Scheduling next command after " + gapMinutes + " minutes");
        
        try {
            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                Log.e(TAG, "AlarmManager not available");
                return;
            }
            
            // Calculate trigger time
            long triggerTime = System.currentTimeMillis() + (gapMinutes * 60 * 1000L);
            
            // Create intent for next command
            Intent intent = new Intent(this, VoiceCommandAlarmReceiver.class);
            intent.putExtra("alarmId", alarmId);
            intent.putExtra("name", alarmName);
            intent.putExtra("time", alarmTime);
            intent.putExtra("days", days);
            intent.putExtra("commands", getIntent().getStringExtra("commands"));
            intent.putExtra("alarmType", "VOICE_COMMAND_ALARM");
            intent.putExtra("isDeviceLocked", isDeviceLocked);
            intent.putExtra("triggeredTime", System.currentTimeMillis());
            intent.setAction("VOICE_COMMAND_NEXT_" + alarmId + "_" + currentCommandIndex);
            
            int requestCode = Math.abs(("voice_next_" + alarmId + "_" + currentCommandIndex).hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                this,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Schedule alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
            }
            
            SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
            Log.d(TAG, "Next command scheduled for: " + sdf.format(new Date(triggerTime)));
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling next command", e);
        }
    }
    
    private void reopenForNextCommand() {
        Log.d(TAG, "Reopening for next command");
        
        // Create new intent with same data
        Intent intent = new Intent(this, VoiceCommandAlarmActivity.class);
        intent.putExtra("alarmId", alarmId);
        intent.putExtra("name", alarmName);
        intent.putExtra("time", alarmTime);
        intent.putExtra("days", days);
        intent.putExtra("commands", getIntent().getStringExtra("commands"));
        intent.putExtra("isDeviceLocked", isDeviceLocked);
        intent.putExtra("triggeredTime", System.currentTimeMillis());
        
        intent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        
        // Close current activity
        finish();
        
        // Start new activity
        startActivity(intent);
    }
    
    private void finishActivity() {
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
        Log.d(TAG, "Finishing all commands");
        
        // Clear saved command index
        clearCommandIndex();
        
        // Finish activity
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
        
        if (ttsService != null) {
            ttsService.stopAudio();
            ttsService.cleanup();
        }
        
        releaseWakeLock();
        
        super.onDestroy();
    }
    
    @Override
    public void onBackPressed() {
        Log.d(TAG, "Back button pressed - ignoring");
    }
    
    private static class CommandItem {
        String id;
        int sequence;
        String text;
        int gapMinutes;
        String audioFilePath;
        String audioFileName;
    }
}
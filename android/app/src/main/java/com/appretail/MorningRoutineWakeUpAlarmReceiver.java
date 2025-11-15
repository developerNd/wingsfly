package com.wingsfly;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import android.app.KeyguardManager;
import android.app.NotificationManager;

import androidx.core.app.NotificationCompat;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MorningRoutineWakeUpAlarmReceiver extends BroadcastReceiver {
    
    private static final String TAG = "MorningWakeUpReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "========================================");
        Log.d(TAG, "MORNING WAKE-UP ALARM TRIGGERED");
        Log.d(TAG, "========================================");
        
        try {
            String action = intent.getAction();
            
            // Handle boot completed - reschedule all alarms
            if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
                Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action) ||
                "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
                Log.d(TAG, "📱 Device booted - rescheduling morning routine alarm");
                rescheduleAfterBoot(context);
                return;
            }
            
            String userId = intent.getStringExtra("userId");
            String name = intent.getStringExtra("name");
            String time = intent.getStringExtra("time");
            String alarmType = intent.getStringExtra("alarmType");
            boolean isSnooze = intent.getBooleanExtra("isSnooze", false);
            
            if (userId == null) {
                Log.e(TAG, "Missing user ID in wake-up alarm");
                return;
            }
            
            // ⏰ AUTO-RESCHEDULE FOR TOMORROW (Do this FIRST before anything else)
            if (!isSnooze && time != null) {
                rescheduleForNextDay(context, userId, name, time);
            }
            
            // ✅ FETCH COMMANDS FROM DATABASE when alarm triggers
            Log.d(TAG, "📥 Fetching fresh commands from database...");
            
            String commands = null;
            
            // Run database fetch in background thread with timeout
            final String[] commandsResult = new String[1];
            final Thread fetchThread = new Thread(() -> {
                try {
                    List<MorningRoutineDatabase.VoiceCommand> dbCommands = 
                            MorningRoutineDatabase.fetchVoiceCommands();
                    
                    if (dbCommands != null && !dbCommands.isEmpty()) {
                        commandsResult[0] = MorningRoutineDatabase.convertCommandsToJson(dbCommands);
                        Log.d(TAG, "✅ Commands fetched from database: " + dbCommands.size() + " commands");
                    } else {
                        Log.e(TAG, "❌ No commands found in database");
                        commandsResult[0] = null;
                    }
                } catch (Exception e) {
                    Log.e(TAG, "❌ Error fetching commands from database", e);
                    commandsResult[0] = null;
                }
            });
            
            fetchThread.start();
            
            // Wait for fetch to complete (max 10 seconds)
            try {
                fetchThread.join(10000);
                commands = commandsResult[0];
            } catch (InterruptedException e) {
                Log.e(TAG, "Thread interrupted", e);
                commands = null;
            }
            
            if (commands == null || commands.isEmpty()) {
                Log.e(TAG, "❌ No commands available from database");
                showNoCommandsNotification(context);
                // Even if no commands, alarm is already rescheduled for tomorrow
                return;
            }
            
            Log.d(TAG, "Wake-up alarm data:");
            Log.d(TAG, "  - User: " + userId);
            Log.d(TAG, "  - Name: " + name);
            Log.d(TAG, "  - Time: " + time);
            Log.d(TAG, "  - AlarmType: " + alarmType);
            Log.d(TAG, "  - IsSnooze: " + isSnooze);
            Log.d(TAG, "  - Commands: Fetched from database");
            
            // Acquire wake lock
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wakeLock = null;
            
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                    PowerManager.ON_AFTER_RELEASE,
                    "MorningRoutine:WakeUpReceiver"
                );
                wakeLock.acquire(5 * 60 * 1000L);
                Log.d(TAG, "Wake lock acquired");
            }
            
            // Check if device is locked
            KeyguardManager keyguardManager = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
            boolean isLocked = keyguardManager != null && keyguardManager.isKeyguardLocked();
            
            // Start the wake-up alarm activity
            Intent activityIntent = new Intent(context, MorningRoutineWakeUpAlarmActivity.class);
            activityIntent.putExtra("userId", userId);
            activityIntent.putExtra("name", name);
            activityIntent.putExtra("time", time);
            activityIntent.putExtra("commands", commands);
            activityIntent.putExtra("isDeviceLocked", isLocked);
            activityIntent.putExtra("alarmType", alarmType);
            activityIntent.putExtra("isSnooze", isSnooze);
            activityIntent.putExtra("triggeredTime", System.currentTimeMillis());
            
            activityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            );
            
            try {
                context.startActivity(activityIntent);
                Log.d(TAG, "✅ Wake-up alarm activity started");
            } catch (Exception e) {
                Log.e(TAG, "Failed to start activity", e);
                
                // Fallback: Start foreground service
                startWakeUpAlarmService(context, userId, name, time, commands, isLocked, isSnooze);
            }
            
            // Release wake lock after delay
            final PowerManager.WakeLock finalWakeLock = wakeLock;
            if (finalWakeLock != null) {
                android.os.Handler handler = new android.os.Handler();
                handler.postDelayed(() -> {
                    try {
                        if (finalWakeLock.isHeld()) {
                            finalWakeLock.release();
                            Log.d(TAG, "Wake lock released");
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error releasing wake lock", e);
                    }
                }, 30000);
            }
            
            Log.d(TAG, "========================================");
            
        } catch (Exception e) {
            Log.e(TAG, "Error in wake-up alarm receiver", e);
        }
    }
    
    /**
     * ⏰ AUTO-RESCHEDULE ALARM FOR NEXT DAY
     * This is called immediately when alarm fires
     */
    private void rescheduleForNextDay(Context context, String userId, String name, String time) {
        try {
            Log.d(TAG, "⏰ AUTO-RESCHEDULING alarm for tomorrow...");
            
            // Calculate tomorrow's alarm time
            long nextAlarmTime = MorningRoutineAlarmModule.calculateNextDayAlarmTime(time);
            
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
            Log.d(TAG, "📅 Next alarm scheduled for: " + sdf.format(new Date(nextAlarmTime)));
            
            // Schedule next day's alarm
            boolean scheduled = MorningRoutineAlarmModule.scheduleAlarmInternal(
                context, 
                userId, 
                name, 
                time, 
                "", // Commands will be fetched from DB when alarm fires
                nextAlarmTime
            );
            
            if (scheduled) {
                Log.d(TAG, "✅ Successfully rescheduled for tomorrow at " + time);
            } else {
                Log.e(TAG, "❌ Failed to reschedule alarm for tomorrow");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error rescheduling alarm for next day", e);
        }
    }
    
    /**
     * Reschedule alarm after device boot
     */
    private void rescheduleAfterBoot(Context context) {
        try {
            Log.d(TAG, "🔄 Attempting to reschedule alarm after boot...");
            
            // Get saved routine configuration
            MorningRoutineAlarmModule.RoutineConfig config = 
                    MorningRoutineAlarmModule.getRoutineConfig(context);
            
            if (config == null || !config.isEnabled) {
                Log.d(TAG, "No active routine to reschedule");
                return;
            }
            
            Log.d(TAG, "Found saved routine config: " + config.userId + " at " + config.time);
            
            // Calculate next alarm time
            long nextAlarmTime = MorningRoutineAlarmModule.calculateNextDayAlarmTime(config.time);
            
            // If alarm time is more than 12 hours away, schedule for today instead
            long hoursUntilAlarm = (nextAlarmTime - System.currentTimeMillis()) / (1000 * 60 * 60);
            if (hoursUntilAlarm > 12) {
                // Recalculate for today
                String[] timeParts = config.time.split(":");
                int hour = Integer.parseInt(timeParts[0]);
                int minute = Integer.parseInt(timeParts[1]);
                
                java.util.Calendar calendar = java.util.Calendar.getInstance();
                calendar.set(java.util.Calendar.HOUR_OF_DAY, hour);
                calendar.set(java.util.Calendar.MINUTE, minute);
                calendar.set(java.util.Calendar.SECOND, 0);
                calendar.set(java.util.Calendar.MILLISECOND, 0);
                
                if (calendar.getTimeInMillis() > System.currentTimeMillis()) {
                    nextAlarmTime = calendar.getTimeInMillis();
                }
            }
            
            // Schedule the alarm
            boolean scheduled = MorningRoutineAlarmModule.scheduleAlarmInternal(
                context,
                config.userId,
                config.name,
                config.time,
                "",
                nextAlarmTime
            );
            
            if (scheduled) {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
                Log.d(TAG, "✅ Alarm rescheduled after boot for: " + sdf.format(new Date(nextAlarmTime)));
            } else {
                Log.e(TAG, "❌ Failed to reschedule alarm after boot");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error rescheduling after boot", e);
        }
    }
    
    private void showNoCommandsNotification(Context context) {
        try {
            NotificationManager notificationManager = 
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            
            if (notificationManager != null) {
                NotificationCompat.Builder builder = 
                        new NotificationCompat.Builder(context, "morning_wakeup_channel")
                        .setSmallIcon(android.R.drawable.ic_dialog_alert)
                        .setContentTitle("Morning Routine - No Commands")
                        .setContentText("No voice commands configured. Please contact admin.")
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setAutoCancel(true);
                
                notificationManager.notify(9999, builder.build());
                Log.d(TAG, "Notification shown: No commands available");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error showing notification", e);
        }
    }
    
    private void startWakeUpAlarmService(Context context, String userId, String name, 
                                        String time, String commands, boolean isLocked, boolean isSnooze) {
        try {
            Intent serviceIntent = new Intent(context, MorningRoutineWakeUpAlarmService.class);
            serviceIntent.putExtra("userId", userId);
            serviceIntent.putExtra("name", name);
            serviceIntent.putExtra("time", time);
            serviceIntent.putExtra("commands", commands);
            serviceIntent.putExtra("isDeviceLocked", isLocked);
            serviceIntent.putExtra("isSnooze", isSnooze);
            serviceIntent.putExtra("serviceAction", "START_WAKEUP_ALARM");
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            
            Log.d(TAG, "Wake-up alarm service started");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to start service", e);
        }
    }
}
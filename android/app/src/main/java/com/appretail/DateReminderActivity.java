package com.wingsfly;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.TextView;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class DateReminderActivity extends Activity {

    private static final String TAG = "DateReminderActivity";
    private static final String PREFS_NAME = "DateReminderPrefs";
    
    private PowerManager.WakeLock wakeLock;
    private TextView dateTextView;
    private TextView dayOfWeekTextView;
    private TextView remainingDaysTextView;
    private TextView closeButton;
    private ImageView customImageView;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Setup full screen with black status bar
        setupFullScreen();
        
        // Acquire wake lock to turn on screen
        acquireWakeLock();
        
        setContentView(R.layout.activity_date_reminder);
        
        // Initialize views
        dateTextView = findViewById(R.id.reminderDate);
        dayOfWeekTextView = findViewById(R.id.dayOfWeek);
        remainingDaysTextView = findViewById(R.id.remainingDays);
        closeButton = findViewById(R.id.closeButton);
        customImageView = findViewById(R.id.customImage);
        
        // Get reminder type from intent
        boolean isMorning = getIntent().getBooleanExtra("isMorning", true);
        
        Log.d(TAG, "Activity started - Reminder type: " + (isMorning ? "MORNING" : "EVENING"));
        
        // Load and display appropriate image
        loadCustomImage(isMorning);
        
        // Set current date and remaining days
        updateDate();
        updateRemainingDays();
        
        // Setup close button
        closeButton.setOnClickListener(v -> closeReminder());
        
        // Auto-dismiss after 30 seconds if enabled
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean autoClose = prefs.getBoolean("auto_close", false);
        
        if (autoClose) {
            dateTextView.postDelayed(this::closeReminder, 30000);
            Log.d(TAG, "Auto-close enabled - will dismiss in 30 seconds");
        } else {
            Log.d(TAG, "Auto-close disabled - will stay until manually closed");
        }
    }
    
    private void setupFullScreen() {
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
            WindowManager.LayoutParams.FLAG_FULLSCREEN |
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        );
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(0xFF000000);
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            window.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
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
                    "DateReminder:ReminderActivity"
                );
                wakeLock.acquire(60000); // 1 minute
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring wake lock", e);
        }
    }
    
    private void loadCustomImage(boolean isMorning) {
        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String imageKey = isMorning ? "morning_image_uri" : "evening_image_uri";
                String imageUrl = prefs.getString(imageKey, "");
                
                Log.d(TAG, "Loading " + (isMorning ? "MORNING" : "EVENING") + " image");
                Log.d(TAG, "Image URL: " + imageUrl);
                
                if (imageUrl != null && !imageUrl.isEmpty()) {
                    // Download image from URL
                    URL url = new URL(imageUrl);
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.setDoInput(true);
                    connection.connect();
                    
                    InputStream inputStream = connection.getInputStream();
                    Bitmap bitmap = BitmapFactory.decodeStream(inputStream);
                    inputStream.close();
                    
                    // Update UI on main thread
                    runOnUiThread(() -> {
                        customImageView.setImageBitmap(bitmap);
                        customImageView.setVisibility(View.VISIBLE);
                    });
                    
                    Log.d(TAG, "✅ " + (isMorning ? "Morning" : "Evening") + " image loaded successfully");
                } else {
                    runOnUiThread(() -> customImageView.setVisibility(View.GONE));
                    Log.d(TAG, "⚠️ No " + (isMorning ? "morning" : "evening") + " image URL");
                }
            } catch (Exception e) {
                Log.e(TAG, "❌ Error loading custom image", e);
                runOnUiThread(() -> customImageView.setVisibility(View.GONE));
            }
        }).start();
    }
    
    private void updateDate() {
        SimpleDateFormat dateFormat = new SimpleDateFormat("d MMM yyyy", Locale.getDefault());
        String formattedDate = dateFormat.format(new Date());
        dateTextView.setText(formattedDate);
        
        SimpleDateFormat dayFormat = new SimpleDateFormat("EEEE", Locale.getDefault());
        String dayOfWeek = dayFormat.format(new Date());
        dayOfWeekTextView.setText(dayOfWeek.toUpperCase());
    }
    
    private void updateRemainingDays() {
        try {
            Calendar calendar = Calendar.getInstance();
            int currentDay = calendar.get(Calendar.DAY_OF_MONTH);
            int maxDaysInMonth = calendar.getActualMaximum(Calendar.DAY_OF_MONTH);
            int remainingDays = maxDaysInMonth - currentDay;
            
            SimpleDateFormat monthFormat = new SimpleDateFormat("MMMM", Locale.getDefault());
            String monthName = monthFormat.format(calendar.getTime());
            
            String remainingText;
            if (remainingDays == 0) {
                remainingText = "Last day of " + monthName;
            } else if (remainingDays == 1) {
                remainingText = "1 day remaining in " + monthName;
            } else {
                remainingText = remainingDays + " days remaining in " + monthName;
            }
            
            remainingDaysTextView.setText(remainingText);
            
            Log.d(TAG, "Remaining days: " + remainingText);
        } catch (Exception e) {
            Log.e(TAG, "Error calculating remaining days", e);
            remainingDaysTextView.setText("");
        }
    }
    
    private void closeReminder() {
        releaseWakeLock();
        finish();
    }
    
    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception e) {
                Log.e(TAG, "Error releasing wake lock", e);
            }
        }
    }
    
    @Override
    protected void onDestroy() {
        releaseWakeLock();
        super.onDestroy();
    }
    
    @Override
    public void onBackPressed() {
        closeReminder();
    }
    
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                );
            }
        }
    }
}
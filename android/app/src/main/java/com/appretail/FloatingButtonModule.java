package com.wingsfly;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class FloatingButtonModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;
    private static Intent serviceIntent;
    private static final String TAG = "FloatingButton";

    FloatingButtonModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "FloatingButtonModule";
    }

    @ReactMethod
    public void checkPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                boolean hasPermission = Settings.canDrawOverlays(reactContext);
                Log.d(TAG, "Check permission result: " + hasPermission);
                promise.resolve(hasPermission);
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking permission: " + e.getMessage());
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(reactContext)) {
                    Log.d(TAG, "Requesting overlay permission");
                    Intent intent = new Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + reactContext.getPackageName())
                    );
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    reactContext.startActivity(intent);
                    promise.resolve(false);
                } else {
                    Log.d(TAG, "Permission already granted");
                    promise.resolve(true);
                }
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting permission: " + e.getMessage());
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void saveUserId(String userId, Promise promise) {
        try {
            Log.d(TAG, "Saving userId to native SharedPreferences: " + userId);
            
            SharedPreferences prefs = reactContext.getSharedPreferences("RN_USER_DATA", Context.MODE_PRIVATE);
            prefs.edit().putString("user_id", userId).apply();
            
            Log.d(TAG, "✅ UserId saved successfully: " + userId);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error saving userId: " + e.getMessage());
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void showFloatingButton(Promise promise) {
        try {
            Log.d(TAG, "showFloatingButton called");
            
            if (serviceIntent == null) {
                serviceIntent = new Intent(reactContext, FloatingButtonService.class);
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
                Log.d(TAG, "Started foreground service");
            } else {
                reactContext.startService(serviceIntent);
                Log.d(TAG, "Started service");
            }
            
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error starting service: " + e.getMessage(), e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void hideFloatingButton(Promise promise) {
        try {
            Log.d(TAG, "hideFloatingButton called");
            
            if (serviceIntent != null) {
                reactContext.stopService(serviceIntent);
                Log.d(TAG, "Service stopped");
            }
            
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping service: " + e.getMessage(), e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    public static class FloatingButtonService extends Service {
        private static final String TAG = "FloatingButtonService";
        private static final int NOTIFICATION_ID = 12346;
        private static final String CHANNEL_ID = "floating_notes_channel";
        private static final String PREFS_NAME = "FloatingNotesPrefs";
        private static final String KEY_NOTE_ID = "note_id";
        private static final String KEY_WINDOW_WIDTH = "window_width";
        private static final String KEY_WINDOW_HEIGHT = "window_height";
        private static final String KEY_WINDOW_X = "window_x";
        private static final String KEY_WINDOW_Y = "window_y";
        private static final long AUTO_SAVE_DELAY = 2000;
        
        // Notification actions
        private static final String ACTION_EDIT = "com.wingsfly.ACTION_EDIT";
        private static final String ACTION_STOP = "com.wingsfly.ACTION_STOP";
        
        // Window size constraints
        private static final int MIN_WINDOW_WIDTH = 500;
        private static final int MIN_WINDOW_HEIGHT = 600;
        private int maxWindowWidth;
        private int maxWindowHeight;
        
        private WindowManager windowManager;
        private View floatingButtonView;
        private View circularMenuView;
        private View notesWindowView;
        private WindowManager.LayoutParams buttonParams;
        private WindowManager.LayoutParams menuParams;
        private WindowManager.LayoutParams notesParams;
        private boolean isCircularMenuVisible = false;
        private boolean isNotesWindowVisible = false;
        
        private EditText notesEditText;
        private SharedPreferences prefs;
        private Handler autoSaveHandler;
        private Runnable autoSaveRunnable;
        
        // Button references
        private ImageView notesButtonImage;
        private ImageButton closeMenuButton;
        
        // Loader references
        private ProgressBar saveLoader;
        private ProgressBar clearLoader;
        private Button saveButton;
        private Button clearButton;
        
        // Pinch-to-zoom for resizing
        private ScaleGestureDetector scaleGestureDetector;
        private float scaleFactor = 1.0f;
        private int initialWindowWidth;
        private int initialWindowHeight;
        
        // Dragging variables for notes window
        private boolean isDraggingWindow = false;
        private int initialWindowX, initialWindowY;
        private float initialWindowTouchX, initialWindowTouchY;
        
        // Dragging variables for button
        private boolean isDraggingButton = false;
        private int initialButtonX, initialButtonY;
        private float initialButtonTouchX, initialButtonTouchY;
        
        // Supabase integration
        private String userId;
        private String currentNoteId;
        private boolean isSaving = false;

        @Override
        public void onCreate() {
            super.onCreate();
            Log.d(TAG, "========================================");
            Log.d(TAG, "FloatingButtonService onCreate START");
            Log.d(TAG, "========================================");

            try {
                prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                autoSaveHandler = new Handler(Looper.getMainLooper());
                
                // Get screen dimensions for max size
                WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
                android.util.DisplayMetrics metrics = new android.util.DisplayMetrics();
                wm.getDefaultDisplay().getMetrics(metrics);
                maxWindowWidth = (int) (metrics.widthPixels * 0.95);
                maxWindowHeight = (int) (metrics.heightPixels * 0.85);
                
                // Get user ID from SharedPreferences
                userId = NotesDatabase.getUserIdFromPrefs(this);
                Log.d(TAG, "User ID: " + userId);
                
                // Load saved note ID
                currentNoteId = prefs.getString(KEY_NOTE_ID, null);
                Log.d(TAG, "Current note ID: " + currentNoteId);
                
                // Create foreground service
                createNotificationChannel();
                Notification notification = createNotificationWithActions();
                startForeground(NOTIFICATION_ID, notification);
                Log.d(TAG, "✅ Started as foreground service");
                
                // Get window manager
                windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
                if (windowManager == null) {
                    Log.e(TAG, "❌ WindowManager is NULL!");
                    return;
                }
                
                // Create floating button
                createFloatingButton();
                
                Log.d(TAG, "✅✅✅ SERVICE FULLY INITIALIZED! ✅✅✅");
                
            } catch (Exception e) {
                Log.e(TAG, "❌ CRITICAL ERROR:", e);
                e.printStackTrace();
            }
        }

        @Override
        public int onStartCommand(Intent intent, int flags, int startId) {
            if (intent != null && intent.getAction() != null) {
                String action = intent.getAction();
                Log.d(TAG, "Notification action received: " + action);
                
                if (ACTION_EDIT.equals(action)) {
                    // Open notes window
                    if (!isNotesWindowVisible) {
                        showNotesWindow();
                    }
                } else if (ACTION_STOP.equals(action)) {
                    // Stop the service
                    stopSelf();
                }
            }
            return START_STICKY;
        }

        private void createFloatingButton() {
            try {
                floatingButtonView = LayoutInflater.from(this).inflate(R.layout.floating_button_layout, null);
                
                int LAYOUT_FLAG = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE;

                buttonParams = new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        LAYOUT_FLAG,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                        PixelFormat.TRANSLUCENT);

                buttonParams.gravity = Gravity.TOP | Gravity.END;
                buttonParams.x = 20;
                buttonParams.y = 500;
                
                windowManager.addView(floatingButtonView, buttonParams);
                Log.d(TAG, "✅ Floating button added");

                notesButtonImage = floatingButtonView.findViewById(R.id.floating_button);
                closeMenuButton = floatingButtonView.findViewById(R.id.close_menu_button_on_main);
                
                // Initially hide close button
                closeMenuButton.setVisibility(View.GONE);
                
                // Click on notes button - show menu
                notesButtonImage.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        if (!isCircularMenuVisible) {
                            Log.d(TAG, "📝 Notes button clicked - showing circular menu");
                            showCircularMenu();
                        }
                    }
                });
                
                // Click on X button - close menu
                closeMenuButton.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        Log.d(TAG, "❌ Close button clicked - hiding circular menu");
                        hideCircularMenu();
                    }
                });

                // Touch listener for dragging the button
                View.OnTouchListener dragTouchListener = new View.OnTouchListener() {
                    private long touchStartTime;

                    @Override
                    public boolean onTouch(View v, MotionEvent event) {
                        switch (event.getAction()) {
                            case MotionEvent.ACTION_DOWN:
                                initialButtonX = buttonParams.x;
                                initialButtonY = buttonParams.y;
                                initialButtonTouchX = event.getRawX();
                                initialButtonTouchY = event.getRawY();
                                touchStartTime = System.currentTimeMillis();
                                isDraggingButton = false;
                                return true;
                                
                            case MotionEvent.ACTION_MOVE:
                                float deltaX = event.getRawX() - initialButtonTouchX;
                                float deltaY = event.getRawY() - initialButtonTouchY;
                                
                                if (!isDraggingButton && (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15)) {
                                    isDraggingButton = true;
                                    // Hide menu when dragging starts to prevent interference
                                    if (isCircularMenuVisible) {
                                        hideCircularMenu();
                                    }
                                }
                                
                                if (isDraggingButton) {
                                    buttonParams.x = initialButtonX - (int) deltaX;
                                    buttonParams.y = initialButtonY + (int) deltaY;
                                    windowManager.updateViewLayout(floatingButtonView, buttonParams);
                                }
                                return true;
                                
                            case MotionEvent.ACTION_UP:
                            case MotionEvent.ACTION_CANCEL:
                                if (!isDraggingButton && System.currentTimeMillis() - touchStartTime < 200) {
                                    v.performClick();
                                }
                                isDraggingButton = false;
                                return true;
                        }
                        return false;
                    }
                };
                
                // Apply touch listener to both buttons
                notesButtonImage.setOnTouchListener(dragTouchListener);
                closeMenuButton.setOnTouchListener(dragTouchListener);
                
            } catch (Exception e) {
                Log.e(TAG, "Error creating floating button:", e);
            }
        }

        private void showCircularMenu() {
            try {
                if (isCircularMenuVisible) return;
                
                Log.d(TAG, "🔵 Showing circular menu");
                
                // Switch to X button
                notesButtonImage.setVisibility(View.GONE);
                closeMenuButton.setVisibility(View.VISIBLE);
                
                // Create circular menu layout
                circularMenuView = LayoutInflater.from(this).inflate(R.layout.circular_menu_layout, null);
                
                int LAYOUT_FLAG = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE;

                menuParams = new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        LAYOUT_FLAG,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                        PixelFormat.TRANSLUCENT);

                // Calculate responsive menu position
                calculateCircularMenuPosition();
                
                windowManager.addView(circularMenuView, menuParams);
                isCircularMenuVisible = true;
                
                // Setup button listeners
                ImageButton editButton = circularMenuView.findViewById(R.id.edit_button);
                ImageButton stopButton = circularMenuView.findViewById(R.id.stop_button);
                
                editButton.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        Log.d(TAG, "✏️ Edit clicked - opening notes window");
                        hideCircularMenu();
                        showNotesWindow();
                    }
                });
                
                stopButton.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        Log.d(TAG, "🛑 Stop clicked - stopping service");
                        Toast.makeText(FloatingButtonService.this, "Overlay stopped", Toast.LENGTH_SHORT).show();
                        stopSelf();
                    }
                });
                
                Log.d(TAG, "✅ Circular menu visible");
                
            } catch (Exception e) {
                Log.e(TAG, "Error showing circular menu:", e);
                e.printStackTrace();
            }
        }
        
        private void calculateCircularMenuPosition() {
            // Get screen dimensions
            WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
            android.util.DisplayMetrics metrics = new android.util.DisplayMetrics();
            wm.getDefaultDisplay().getMetrics(metrics);
            int screenWidth = metrics.widthPixels;
            int screenHeight = metrics.heightPixels;
            
            // Convert dp to pixels
            float density = metrics.density;
            int buttonWidthPx = (int) (48 * density);
            int menuWidthPx = (int) (63 * density);
            int menuHeightPx = (int) (150 * density);
            
            // REDUCED professional spacing - smaller gap on both sides
            int horizontalSpacingPx = (int) (12 * density); // Reduced from 90 to 12dp for tighter spacing
            int verticalOffsetPx = (int) (35 * density);    // Menu slightly above button (increased from 30 to 35)
            
            // Safe margin
            int safeMarginPx = (int) (8 * density);
            
            // Get button's screen position
            int buttonScreenX = screenWidth - buttonParams.x - buttonWidthPx;
            int buttonScreenY = buttonParams.y;
            
            Log.d(TAG, "📍 Button at screenX: " + buttonScreenX + ", screenY: " + buttonScreenY);
            
            // Check which half of screen button is on
            boolean isOnRightSide = buttonScreenX > (screenWidth / 2);
            
            int menuX, menuY;
            
            if (isOnRightSide) {
                // ✅ BUTTON ON RIGHT → Menu goes LEFT
                menuParams.gravity = Gravity.TOP | Gravity.END;
                // Calculate from right edge: button's X position + button width + gap
                menuX = buttonParams.x + buttonWidthPx + horizontalSpacingPx;
                
                // Safety check: ensure menu doesn't go off left edge
                int menuLeftEdge = screenWidth - menuX - menuWidthPx;
                if (menuLeftEdge < safeMarginPx) {
                    menuX = screenWidth - menuWidthPx - safeMarginPx;
                }
                
                Log.d(TAG, "📍 RIGHT side placement - Menu X from right: " + menuX);
                
            } else {
                // ✅ BUTTON ON LEFT → Menu goes RIGHT
                menuParams.gravity = Gravity.TOP | Gravity.START;
                menuX = buttonScreenX + buttonWidthPx + horizontalSpacingPx;
                
                // Safety check: ensure menu doesn't go off right edge
                if (menuX + menuWidthPx > screenWidth - safeMarginPx) {
                    menuX = screenWidth - menuWidthPx - safeMarginPx;
                }
                
                Log.d(TAG, "📍 LEFT side placement - Menu X from left: " + menuX);
            }
            
            // Vertical positioning (same for both sides)
            menuY = buttonScreenY - verticalOffsetPx;
            
            // Keep menu within vertical screen bounds
            if (menuY < safeMarginPx) {
                menuY = safeMarginPx;
            } else if (menuY + menuHeightPx > screenHeight - safeMarginPx) {
                menuY = screenHeight - menuHeightPx - safeMarginPx;
            }
            
            menuParams.x = menuX;
            menuParams.y = menuY;
            
            Log.d(TAG, "✅ Final menu position - Gravity: " + menuParams.gravity + ", X: " + menuX + ", Y: " + menuY);
        }

        private void updateCircularMenuPosition() {
            if (menuParams != null && circularMenuView != null) {
                calculateCircularMenuPosition();
                try {
                    windowManager.updateViewLayout(circularMenuView, menuParams);
                } catch (Exception e) {
                    Log.e(TAG, "Error updating menu position", e);
                }
            }
        }

        private void hideCircularMenu() {
            try {
                if (!isCircularMenuVisible) return;
                
                Log.d(TAG, "🔵 Hiding circular menu");
                
                // Switch back to notes button
                closeMenuButton.setVisibility(View.GONE);
                notesButtonImage.setVisibility(View.VISIBLE);
                
                if (circularMenuView != null && windowManager != null) {
                    windowManager.removeView(circularMenuView);
                    circularMenuView = null;
                }
                
                isCircularMenuVisible = false;
                Log.d(TAG, "✅ Circular menu hidden");
                
            } catch (Exception e) {
                Log.e(TAG, "Error hiding circular menu:", e);
            }
        }

        private void showNotesWindow() {
            try {
                if (isNotesWindowVisible) return;
                
                Log.d(TAG, "📝 Showing notes window");
                
                notesWindowView = LayoutInflater.from(this).inflate(R.layout.floating_notes_window, null);
                
                // Get saved window size or use default
                WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
                android.util.DisplayMetrics metrics = new android.util.DisplayMetrics();
                wm.getDefaultDisplay().getMetrics(metrics);
                
                int screenWidth = metrics.widthPixels;
                int screenHeight = metrics.heightPixels;
                
                // Load saved size or use defaults
                int defaultWidth = (int) (screenWidth * 0.9);
                int defaultHeight = (int) (screenHeight * 0.5);
                
                int windowWidth = prefs.getInt(KEY_WINDOW_WIDTH, defaultWidth);
                int windowHeight = prefs.getInt(KEY_WINDOW_HEIGHT, defaultHeight);
                
                // Store initial size for scaling
                initialWindowWidth = windowWidth;
                initialWindowHeight = windowHeight;
                scaleFactor = 1.0f;
                
                int LAYOUT_FLAG = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE;

                notesParams = new WindowManager.LayoutParams(
                        windowWidth,
                        windowHeight,
                        LAYOUT_FLAG,
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                        PixelFormat.TRANSLUCENT);

                // Load saved position or center
                int savedX = prefs.getInt(KEY_WINDOW_X, 0);
                int savedY = prefs.getInt(KEY_WINDOW_Y, 0);
                
                if (savedX != 0 || savedY != 0) {
                    notesParams.gravity = Gravity.TOP | Gravity.START;
                    notesParams.x = savedX;
                    notesParams.y = savedY;
                } else {
                    notesParams.gravity = Gravity.CENTER;
                }
                
                windowManager.addView(notesWindowView, notesParams);
                isNotesWindowVisible = true;
                
                setupNotesWindow();
                setupWindowDragging();
                setupPinchToZoom();
                loadNotesFromDatabase();
                
                Log.d(TAG, "✅ Notes window visible - Size: " + windowWidth + "x" + windowHeight);
                
            } catch (Exception e) {
                Log.e(TAG, "Error showing notes window:", e);
                e.printStackTrace();
            }
        }

        private void setupWindowDragging() {
            RelativeLayout headerLayout = notesWindowView.findViewById(R.id.notes_header);
            
            if (headerLayout != null) {
                headerLayout.setOnTouchListener(new View.OnTouchListener() {
                    @Override
                    public boolean onTouch(View v, MotionEvent event) {
                        switch (event.getAction()) {
                            case MotionEvent.ACTION_DOWN:
                                isDraggingWindow = true;
                                
                                if (notesParams.gravity == Gravity.CENTER) {
                                    WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
                                    android.util.DisplayMetrics metrics = new android.util.DisplayMetrics();
                                    wm.getDefaultDisplay().getMetrics(metrics);
                                    
                                    int centerX = (metrics.widthPixels - notesParams.width) / 2;
                                    int centerY = (metrics.heightPixels - notesParams.height) / 2;
                                    
                                    notesParams.gravity = Gravity.TOP | Gravity.START;
                                    notesParams.x = centerX;
                                    notesParams.y = centerY;
                                    windowManager.updateViewLayout(notesWindowView, notesParams);
                                }
                                
                                initialWindowX = notesParams.x;
                                initialWindowY = notesParams.y;
                                initialWindowTouchX = event.getRawX();
                                initialWindowTouchY = event.getRawY();
                                return true;
                                
                            case MotionEvent.ACTION_MOVE:
                                if (isDraggingWindow) {
                                    float deltaX = event.getRawX() - initialWindowTouchX;
                                    float deltaY = event.getRawY() - initialWindowTouchY;
                                    
                                    notesParams.x = initialWindowX + (int) deltaX;
                                    notesParams.y = initialWindowY + (int) deltaY;
                                    
                                    try {
                                        windowManager.updateViewLayout(notesWindowView, notesParams);
                                    } catch (Exception e) {
                                        Log.e(TAG, "Error updating window position", e);
                                    }
                                }
                                return true;
                                
                            case MotionEvent.ACTION_UP:
                            case MotionEvent.ACTION_CANCEL:
                                if (isDraggingWindow) {
                                    isDraggingWindow = false;
                                    prefs.edit()
                                        .putInt(KEY_WINDOW_X, notesParams.x)
                                        .putInt(KEY_WINDOW_Y, notesParams.y)
                                        .apply();
                                    Log.d(TAG, "💾 Saved window position: " + notesParams.x + ", " + notesParams.y);
                                }
                                return true;
                        }
                        return false;
                    }
                });
            }
        }

        private void setupPinchToZoom() {
            scaleGestureDetector = new ScaleGestureDetector(this, new ScaleGestureDetector.SimpleOnScaleGestureListener() {
                @Override
                public boolean onScale(ScaleGestureDetector detector) {
                    float scaleChange = detector.getScaleFactor();
                    
                    // Much higher sensitivity (4.0x) for very easy zooming
                    float amplifiedScale = 1.0f + ((scaleChange - 1.0f) * 4.0f);
                    scaleFactor *= amplifiedScale;
                    
                    // Wider range: 0.2x to 4.0x
                    scaleFactor = Math.max(0.2f, Math.min(scaleFactor, 4.0f));
                    
                    int newWidth = (int) (initialWindowWidth * scaleFactor);
                    int newHeight = (int) (initialWindowHeight * scaleFactor);
                    
                    // Enforce size constraints
                    newWidth = Math.max(MIN_WINDOW_WIDTH, Math.min(newWidth, maxWindowWidth));
                    newHeight = Math.max(MIN_WINDOW_HEIGHT, Math.min(newHeight, maxWindowHeight));
                    
                    notesParams.width = newWidth;
                    notesParams.height = newHeight;
                    
                    try {
                        windowManager.updateViewLayout(notesWindowView, notesParams);
                        Log.d(TAG, "🔍 Zooming - Scale: " + String.format("%.2f", scaleFactor) + 
                              " Size: " + newWidth + "x" + newHeight);
                    } catch (Exception e) {
                        Log.e(TAG, "Error updating window layout", e);
                    }
                    
                    return true;
                }
                
                @Override
                public boolean onScaleBegin(ScaleGestureDetector detector) {
                    Log.d(TAG, "🔍 Pinch zoom started");
                    return true;
                }
                
                @Override
                public void onScaleEnd(ScaleGestureDetector detector) {
                    super.onScaleEnd(detector);
                    
                    // Reset for next zoom operation
                    initialWindowWidth = notesParams.width;
                    initialWindowHeight = notesParams.height;
                    scaleFactor = 1.0f;
                    
                    // Save the new size
                    prefs.edit()
                        .putInt(KEY_WINDOW_WIDTH, notesParams.width)
                        .putInt(KEY_WINDOW_HEIGHT, notesParams.height)
                        .apply();
                    
                    Log.d(TAG, "💾 Saved window size: " + notesParams.width + "x" + notesParams.height);
                }
            });
            
            // Apply zoom to the entire notes container for easier gesture detection
            View containerView = notesWindowView.findViewById(R.id.notes_container);
            if (containerView != null) {
                containerView.setOnTouchListener(new View.OnTouchListener() {
                    private boolean isScaling = false;
                    
                    @Override
                    public boolean onTouch(View v, MotionEvent event) {
                        // Detect multi-touch for zooming
                        if (event.getPointerCount() > 1) {
                            isScaling = true;
                            scaleGestureDetector.onTouchEvent(event);
                            return true;
                        } else if (event.getAction() == MotionEvent.ACTION_UP || 
                                   event.getAction() == MotionEvent.ACTION_CANCEL) {
                            // Reset scaling flag when touch ends
                            if (isScaling) {
                                isScaling = false;
                                return true;
                            }
                        }
                        return false;
                    }
                });
            }
        }

        private void setupNotesWindow() {
            notesEditText = notesWindowView.findViewById(R.id.notes_text);
            ImageButton closeButton = notesWindowView.findViewById(R.id.close_button);
            saveButton = notesWindowView.findViewById(R.id.save_button);
            clearButton = notesWindowView.findViewById(R.id.clear_button);
            saveLoader = notesWindowView.findViewById(R.id.save_loader);
            clearLoader = notesWindowView.findViewById(R.id.clear_loader);
            
            notesEditText.addTextChangedListener(new TextWatcher() {
                @Override
                public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                
                @Override
                public void onTextChanged(CharSequence s, int start, int before, int count) {}
                
                @Override
                public void afterTextChanged(Editable s) {
                    if (autoSaveRunnable != null) {
                        autoSaveHandler.removeCallbacks(autoSaveRunnable);
                    }
                    
                    autoSaveRunnable = new Runnable() {
                        @Override
                        public void run() {
                            String content = s.toString();
                            saveNotesToDatabase(content, false);
                        }
                    };
                    autoSaveHandler.postDelayed(autoSaveRunnable, AUTO_SAVE_DELAY);
                }
            });
            
            closeButton.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    hideNotesWindow();
                }
            });
            
            saveButton.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    String notes = notesEditText.getText().toString();
                    
                    // Show loader, hide button text
                    saveButton.setEnabled(false);
                    saveButton.setText("");
                    saveLoader.setVisibility(View.VISIBLE);
                    
                    saveNotesToDatabase(notes, true);
                }
            });
            
            clearButton.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    // Show loader, hide button text
                    clearButton.setEnabled(false);
                    clearButton.setText("");
                    clearLoader.setVisibility(View.VISIBLE);
                    
                    if (currentNoteId != null) {
                        new Thread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    NotesDatabase.Note clearedNote = NotesDatabase.clearNotes(currentNoteId);
                                    if (clearedNote != null) {
                                        runOnUiThread(new Runnable() {
                                            @Override
                                            public void run() {
                                                notesEditText.setText("");
                                                Toast.makeText(FloatingButtonService.this, "Notes cleared!", Toast.LENGTH_SHORT).show();
                                                
                                                // Hide loader, show button text
                                                clearLoader.setVisibility(View.GONE);
                                                clearButton.setText("Clear");
                                                clearButton.setEnabled(true);
                                            }
                                        });
                                    }
                                } catch (Exception e) {
                                    Log.e(TAG, "Error clearing notes from database", e);
                                    runOnUiThread(new Runnable() {
                                        @Override
                                        public void run() {
                                            Toast.makeText(FloatingButtonService.this, "Failed to clear notes", Toast.LENGTH_SHORT).show();
                                            
                                            // Hide loader, show button text
                                            clearLoader.setVisibility(View.GONE);
                                            clearButton.setText("Clear");
                                            clearButton.setEnabled(true);
                                        }
                                    });
                                }
                            }
                        }).start();
                    } else {
                        notesEditText.setText("");
                        Toast.makeText(FloatingButtonService.this, "Notes cleared!", Toast.LENGTH_SHORT).show();
                        
                        // Hide loader, show button text
                        clearLoader.setVisibility(View.GONE);
                        clearButton.setText("Clear");
                        clearButton.setEnabled(true);
                    }
                }
            });
        }
        
        private void loadNotesFromDatabase() {
            if (userId == null) {
                Log.w(TAG, "Cannot load notes - userId is null");
                return;
            }
            
            if (notesEditText != null) {
                notesEditText.setEnabled(false);
                notesEditText.setHint("Loading notes...");
            }
            
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Log.d(TAG, "📥 Loading notes from database...");
                        NotesDatabase.Note note = NotesDatabase.getUserNotes(userId);
                        
                        if (note != null) {
                            currentNoteId = note.id;
                            prefs.edit().putString(KEY_NOTE_ID, currentNoteId).apply();
                            
                            final String content = note.content != null ? note.content : "";
                            
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    if (notesEditText != null) {
                                        notesEditText.setText(content);
                                        notesEditText.setEnabled(true);
                                        notesEditText.setHint("Write your notes here...");
                                        Log.d(TAG, "✅ Notes loaded successfully");
                                    }
                                }
                            });
                        } else {
                            Log.d(TAG, "ℹ️ No notes found for user");
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    if (notesEditText != null) {
                                        notesEditText.setEnabled(true);
                                        notesEditText.setHint("Write your notes here...");
                                    }
                                }
                            });
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "❌ Error loading notes from database", e);
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                if (notesEditText != null) {
                                    notesEditText.setEnabled(true);
                                    notesEditText.setHint("Error loading notes");
                                }
                                Toast.makeText(FloatingButtonService.this, "Failed to load notes", Toast.LENGTH_SHORT).show();
                            }
                        });
                    }
                }
            }).start();
        }
        
        private void saveNotesToDatabase(String content, final boolean showToast) {
            if (userId == null) {
                Log.w(TAG, "Cannot save notes - userId is null");
                if (showToast) {
                    Toast.makeText(this, "Cannot save - not logged in", Toast.LENGTH_SHORT).show();
                    
                    // Hide loader, show button text
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            saveLoader.setVisibility(View.GONE);
                            saveButton.setText("Save");
                            saveButton.setEnabled(true);
                        }
                    });
                }
                return;
            }
            
            if (isSaving) {
                Log.d(TAG, "Already saving - skipping");
                return;
            }
            
            isSaving = true;
            
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Log.d(TAG, "💾 Saving notes to database...");
                        NotesDatabase.Note savedNote = NotesDatabase.saveNotes(userId, content, currentNoteId);
                        
                        if (savedNote != null) {
                            currentNoteId = savedNote.id;
                            prefs.edit().putString(KEY_NOTE_ID, currentNoteId).apply();
                            
                            Log.d(TAG, "✅ Notes saved successfully");
                            
                            if (showToast) {
                                runOnUiThread(new Runnable() {
                                    @Override
                                    public void run() {
                                        Toast.makeText(FloatingButtonService.this, "Notes saved!", Toast.LENGTH_SHORT).show();
                                        
                                        // Hide loader, show button text
                                        saveLoader.setVisibility(View.GONE);
                                        saveButton.setText("Save");
                                        saveButton.setEnabled(true);
                                    }
                                });
                            }
                        } else {
                            Log.e(TAG, "❌ Failed to save notes");
                            if (showToast) {
                                runOnUiThread(new Runnable() {
                                    @Override
                                    public void run() {
                                        Toast.makeText(FloatingButtonService.this, "Failed to save notes", Toast.LENGTH_SHORT).show();
                                        
                                        // Hide loader, show button text
                                        saveLoader.setVisibility(View.GONE);
                                        saveButton.setText("Save");
                                        saveButton.setEnabled(true);
                                    }
                                });
                            }
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "❌ Error saving notes to database", e);
                        if (showToast) {
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    Toast.makeText(FloatingButtonService.this, "Error saving notes", Toast.LENGTH_SHORT).show();
                                    
                                    // Hide loader, show button text
                                    saveLoader.setVisibility(View.GONE);
                                    saveButton.setText("Save");
                                    saveButton.setEnabled(true);
                                }
                            });
                        }
                    } finally {
                        isSaving = false;
                    }
                }
            }).start();
        }
        
        private void runOnUiThread(Runnable action) {
            new Handler(Looper.getMainLooper()).post(action);
        }

        private void hideNotesWindow() {
            try {
                if (!isNotesWindowVisible) return;
                
                Log.d(TAG, "📝 Hiding notes window");
                
                if (autoSaveRunnable != null) {
                    autoSaveHandler.removeCallbacks(autoSaveRunnable);
                }
                
                if (notesEditText != null && userId != null) {
                    String content = notesEditText.getText().toString();
                    saveNotesToDatabase(content, false);
                }
                
                if (notesWindowView != null && windowManager != null) {
                    windowManager.removeView(notesWindowView);
                    notesWindowView = null;
                }
                
                isNotesWindowVisible = false;
                isDraggingWindow = false;
                Log.d(TAG, "✅ Notes window hidden");
                
            } catch (Exception e) {
                Log.e(TAG, "Error hiding notes window:", e);
            }
        }

        private void createNotificationChannel() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Quick Notes",
                        NotificationManager.IMPORTANCE_MIN 
                );
                channel.setDescription("Quick access to notes");
                channel.setShowBadge(false);
                channel.setSound(null, null);
                channel.enableVibration(false);
                channel.enableLights(false);
                channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_SECRET);
                
                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null) {
                    manager.createNotificationChannel(channel);
                }
            }
        }

        private Notification createNotificationWithActions() {
            android.widget.RemoteViews notificationLayout = new android.widget.RemoteViews(
                    getPackageName(), 
                    R.layout.notification_layout
            );

            Intent editIntent = new Intent(this, FloatingButtonService.class);
            editIntent.setAction(ACTION_EDIT);
            PendingIntent editPendingIntent = PendingIntent.getService(
                    this, 
                    0, 
                    editIntent, 
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            Intent stopIntent = new Intent(this, FloatingButtonService.class);
            stopIntent.setAction(ACTION_STOP);
            PendingIntent stopPendingIntent = PendingIntent.getService(
                    this, 
                    1, 
                    stopIntent, 
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            notificationLayout.setOnClickPendingIntent(R.id.btn_edit_container, editPendingIntent);
            notificationLayout.setOnClickPendingIntent(R.id.btn_stop_container, stopPendingIntent);
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(R.drawable.app_logo)
                    .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
                    .setCustomContentView(notificationLayout)
                    .setPriority(NotificationCompat.PRIORITY_MIN)
                    .setCategory(NotificationCompat.CATEGORY_SERVICE)
                    .setOngoing(true)
                    .setSilent(true)
                    .setShowWhen(false)
                    .setVisibility(NotificationCompat.VISIBILITY_SECRET);

            return builder.build();
        }

        @Override
        public void onDestroy() {
            super.onDestroy();
            Log.d(TAG, "FloatingButtonService onDestroy");
            
            try {
                if (autoSaveHandler != null && autoSaveRunnable != null) {
                    autoSaveHandler.removeCallbacks(autoSaveRunnable);
                }
                
                if (circularMenuView != null && windowManager != null) {
                    windowManager.removeView(circularMenuView);
                }
                if (notesWindowView != null && windowManager != null) {
                    windowManager.removeView(notesWindowView);
                }
                if (floatingButtonView != null && windowManager != null) {
                    windowManager.removeView(floatingButtonView);
                }
                stopForeground(true);
            } catch (Exception e) {
                Log.e(TAG, "Error in onDestroy:", e);
            }
        }

        @Nullable
        @Override
        public IBinder onBind(Intent intent) {
            return null;
        }
    }
}
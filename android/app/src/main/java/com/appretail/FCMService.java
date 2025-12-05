package com.wingsfly;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import android.media.AudioAttributes;
import android.net.Uri;

import java.util.Map;

public class FCMService extends FirebaseMessagingService {
    private static final String TAG = "FCMService";
    private static final String CHANNEL_ID = "admin_notifications";
    private static final String CHANNEL_NAME = "Admin Notifications";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "FCMService created");
        createNotificationChannel();
    }

    /**
     * Called when a new FCM token is generated
     * This happens on first app install, after app reinstall, or when token is refreshed
     */
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "🔑 New FCM Token: " + token);

        // Send token to React Native
        sendTokenToReactNative(token);
    }

    /**
     * Called when a message is received from FCM
     * This method is called EVEN WHEN APP IS KILLED ✅
     */
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "📨 Message received from: " + remoteMessage.getFrom());

        // Check if message contains a notification payload
        if (remoteMessage.getNotification() != null) {
            String title = remoteMessage.getNotification().getTitle();
            String body = remoteMessage.getNotification().getBody();
            String imageUrl = remoteMessage.getNotification().getImageUrl() != null 
                ? remoteMessage.getNotification().getImageUrl().toString() 
                : null;

            Log.d(TAG, "📬 Notification Title: " + title);
            Log.d(TAG, "📬 Notification Body: " + body);

            // Show notification
            showNotification(title, body, imageUrl, remoteMessage.getData());
        }

        // Check if message contains data payload
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "📦 Data Payload: " + remoteMessage.getData());
            
            // Send data to React Native (if app is in foreground)
            sendMessageToReactNative(remoteMessage.getData());
        }
    }

    /**
     * Create notification channel (required for Android 8.0+)
     */
    private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        // Set custom sound
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build();

        Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.noti);

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Notifications from admin panel");
        channel.enableVibration(true);
        channel.enableLights(true);
        channel.setSound(soundUri, audioAttributes);  // ✅ Set custom sound

        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        if (notificationManager != null) {
            notificationManager.createNotificationChannel(channel);
            Log.d(TAG, "✅ Notification channel created with custom sound: " + CHANNEL_ID);
        }
    }
}

    /**
     * Show notification to user
     */
    private void showNotification(String title, String body, String imageUrl, Map<String, String> data) {
        // Create intent to open app when notification is tapped
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        // ✅ FIX 1: Changed data.entries() to data.entrySet()
        if (data != null) {
            for (Map.Entry<String, String> entry : data.entrySet()) {
                intent.putExtra(entry.getKey(), entry.getValue());
            }
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        // Build notification
Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.noti);

NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
    .setSmallIcon(R.mipmap.ic_launcher)
    .setContentTitle(title != null ? title : "WingsFly")
    .setContentText(body != null ? body : "You have a new notification")
    .setAutoCancel(true)
    .setPriority(NotificationCompat.PRIORITY_HIGH)
    .setContentIntent(pendingIntent)
    .setSound(soundUri)  // ✅ Custom sound for older Android
    .setStyle(new NotificationCompat.BigTextStyle().bigText(body));

        // Show notification
        NotificationManager notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(0, notificationBuilder.build());
            Log.d(TAG, "✅ Notification displayed");
        }
    }

    /**
     * Send FCM token to React Native
     * ✅ FIX 2: Added null checks and proper error handling
     */
    private void sendTokenToReactNative(String token) {
        try {
            MainApplication application = (MainApplication) getApplication();
            if (application != null && 
                application.getReactNativeHost() != null && 
                application.getReactNativeHost().getReactInstanceManager() != null &&
                application.getReactNativeHost().getReactInstanceManager().getCurrentReactContext() != null) {
                
                WritableMap params = Arguments.createMap();
                params.putString("token", token);

                application.getReactNativeHost()
                    .getReactInstanceManager()
                    .getCurrentReactContext()
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("FCMTokenRefreshed", params);

                Log.d(TAG, "✅ Token sent to React Native");
            } else {
                Log.w(TAG, "⚠️ React Native context not ready, token will be sent later");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error sending token to React Native: " + e.getMessage());
        }
    }

    /**
     * Send message data to React Native (when app is in foreground)
     * ✅ FIX 3: Added null checks and proper error handling
     */
    private void sendMessageToReactNative(Map<String, String> data) {
        try {
            MainApplication application = (MainApplication) getApplication();
            if (application != null && 
                application.getReactNativeHost() != null && 
                application.getReactNativeHost().getReactInstanceManager() != null &&
                application.getReactNativeHost().getReactInstanceManager().getCurrentReactContext() != null) {
                
                WritableMap params = Arguments.createMap();
                for (Map.Entry<String, String> entry : data.entrySet()) {
                    params.putString(entry.getKey(), entry.getValue());
                }

                application.getReactNativeHost()
                    .getReactInstanceManager()
                    .getCurrentReactContext()
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("FCMMessageReceived", params);

                Log.d(TAG, "✅ Message data sent to React Native");
            } else {
                Log.w(TAG, "⚠️ React Native context not ready");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error sending message to React Native: " + e.getMessage());
        }
    }

    @Override
    public void onDeletedMessages() {
        super.onDeletedMessages();
        Log.d(TAG, "⚠️ Messages deleted on server");
    }

    @Override
    public void onMessageSent(String msgId) {
        super.onMessageSent(msgId);
        Log.d(TAG, "✅ Message sent: " + msgId);
    }

    @Override
    public void onSendError(String msgId, Exception exception) {
        super.onSendError(msgId, exception);
        Log.e(TAG, "❌ Send error: " + msgId + " - " + exception.getMessage());
    }
}
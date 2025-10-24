package com.wingsfly

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class ChallengeAlarmReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "ChallengeAlarmReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        try {
            Log.d(TAG, "========================================")
            Log.d(TAG, "🎯 CHALLENGE TRIGGER RECEIVED!")
            Log.d(TAG, "========================================")
            
            val challengeId = intent.getStringExtra("challenge_id")
            val challengeName = intent.getStringExtra("challenge_name")
            val videoPath = intent.getStringExtra("video_path")
            val category = intent.getStringExtra("category")
            val slotNumber = intent.getIntExtra("slot_number", 1)
            val endTime = intent.getStringExtra("end_time")
            
            Log.d(TAG, "Challenge ID: $challengeId")
            Log.d(TAG, "Challenge Name: $challengeName")
            Log.d(TAG, "Video Path: $videoPath")
            Log.d(TAG, "Slot Number: $slotNumber")
            Log.d(TAG, "End Time: $endTime")
            
            if (challengeId == null || videoPath == null || endTime == null) {
                Log.e(TAG, "❌ Missing required data")
                return
            }
            
            // Start ChallengeLockActivity with end time
            val activityIntent = Intent(context, ChallengeLockActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
                putExtra("challenge_id", challengeId)
                putExtra("video_path", videoPath)
                putExtra("challenge_name", challengeName ?: "Challenge")
                putExtra("category", category ?: "General")
                putExtra("slot_number", slotNumber)
                putExtra("end_time", endTime) // Pass end time to activity
            }
            
            context.startActivity(activityIntent)
            
            Log.d(TAG, "✅ ChallengeLockActivity started with end time: $endTime")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error handling challenge trigger: ${e.message}", e)
        }
    }
}
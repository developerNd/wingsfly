// BreakVoiceService.js - Voice Commands for Plan Your Day Breaks
import Sound from 'react-native-sound';
import RNFetchBlob from 'rn-fetch-blob';

const VOICE_ID = "V79Doapn9P53cEABwysz";
const API_KEY = "sk_a8d17c3417ec69810deaa8e76e3e423321a59f3577769982";
const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

const BREAK_MESSAGES = {
  SHORT_BREAK: [
    "Great job! Take a short break. Stretch, hydrate, and relax for a few minutes.",
    "Well done! Time for a quick break. Get some water and rest your eyes."
  ],
  LONG_BREAK: [
    "Excellent work! You've earned a long break. Take time to recharge completely.",
    "Amazing progress! Enjoy your long break. Walk around and refresh your mind."
  ]
};

class BreakVoiceService {
  constructor() {
    this.isInitialized = false;
    this.currentSound = null;
    this.cacheDir = RNFetchBlob.fs.dirs.CacheDir;
    this.pendingCleanups = new Map(); // Track cleanup timers
    this.activeAudioFiles = new Set(); // Track files currently in use
  }

  initialize = async () => {
    try {
      Sound.setCategory('Playback');
      Sound.setMode('Default');
      Sound.setActive(true);
      
      this.isInitialized = true;
      console.log('✅ BreakVoiceService initialized');
    } catch (error) {
      console.error('❌ Error initializing BreakVoiceService:', error);
    }
  };

  generateSpeech = async (text, filename = 'break_tts.mp3') => {
    try {
      console.log(`🎤 Generating break speech:`, text);
      
      const voiceSettings = {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.5,
        use_speaker_boost: true,
        speaking_rate: 1.0,
        pitch: 1.0,
      };

      const requestBody = {
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: voiceSettings,
        output_format: "mp3_44100_128",
        optimize_streaming_latency: 0,
      };

      const response = await fetch(ELEVENLABS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API failed: ${response.status} - ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const filePath = `${this.cacheDir}/${filename}`;
      await RNFetchBlob.fs.writeFile(filePath, base64Audio, 'base64');
      
      console.log(`✅ Break audio saved to:`, filePath);
      return filePath;
    } catch (error) {
      console.error('❌ Error generating break speech:', error);
      throw error;
    }
  };

  playAudioFile = (filePath) => {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔊 Playing break audio: ${filePath}`);
        
        // Mark file as active
        this.activeAudioFiles.add(filePath);
        
        if (this.currentSound) {
          this.currentSound.stop();
          this.currentSound.release();
        }

        this.currentSound = new Sound(filePath, '', (error) => {
          if (error) {
            console.error('❌ Error loading sound:', error);
            this.activeAudioFiles.delete(filePath);
            reject(error);
            return;
          }

          this.currentSound.setVolume(1.0);
          
          this.currentSound.play((success) => {
            if (success) {
              console.log(`✅ Break audio played successfully`);
              resolve(true);
            } else {
              console.error('❌ Break audio playback failed');
              reject(new Error('Playback failed'));
            }
            
            this.currentSound.release();
            this.currentSound = null;
            
            // Mark file as no longer active after playback
            this.activeAudioFiles.delete(filePath);
          });
        });
      } catch (error) {
        console.error('❌ Error in playAudioFile:', error);
        this.activeAudioFiles.delete(filePath);
        reject(error);
      }
    });
  };

  // Safe file deletion with checks
  safeDeleteFile = async (filePath) => {
    try {
      // Check if file is still being used
      if (this.activeAudioFiles.has(filePath)) {
        console.log(`⏳ File still in use, will retry: ${filePath}`);
        // Retry after 2 seconds
        setTimeout(() => this.safeDeleteFile(filePath), 2000);
        return;
      }

      // Check if file exists before deleting
      const exists = await RNFetchBlob.fs.exists(filePath);
      if (!exists) {
        console.log(`ℹ️ File already deleted: ${filePath}`);
        return;
      }

      await RNFetchBlob.fs.unlink(filePath);
      console.log(`🗑️ Successfully deleted: ${filePath}`);
      
      // Clear from pending cleanups
      if (this.pendingCleanups.has(filePath)) {
        clearTimeout(this.pendingCleanups.get(filePath));
        this.pendingCleanups.delete(filePath);
      }
    } catch (error) {
      // Only log if it's not a "file doesn't exist" error
      if (!error.message.includes('ENOENT')) {
        console.error(`❌ Error deleting file ${filePath}:`, error.message);
      }
    }
  };

  playBreakVoice = async (breakType = 'short', retryCount = 0) => {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`🎯 Playing ${breakType} break voice command (attempt ${retryCount + 1})`);
      
      const message = this.getRandomMessage(breakType);
      console.log(`📝 Message: ${message}`);
      
      const audioFilePath = await this.generateSpeech(
        message, 
        `break_${breakType}_${Date.now()}.mp3`
      );
      
      await this.playAudioFile(audioFilePath);
      
      // Schedule cleanup after 15 seconds (increased to ensure playback completes)
      const cleanupTimer = setTimeout(() => {
        this.safeDeleteFile(audioFilePath);
      }, 15000);
      
      // Track the cleanup timer
      this.pendingCleanups.set(audioFilePath, cleanupTimer);

      return true;
    } catch (error) {
      console.error(`❌ Error playing break voice (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < 2) {
        console.log(`🔄 Retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await this.playBreakVoice(breakType, retryCount + 1);
      }
      
      return false;
    }
  };

  getRandomMessage = (breakType) => {
    const messages = breakType === 'long' 
      ? BREAK_MESSAGES.LONG_BREAK 
      : BREAK_MESSAGES.SHORT_BREAK;
    
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  };

  testBreakVoice = async (breakType = 'short') => {
    console.log(`🧪 Testing ${breakType} break voice...`);
    return await this.playBreakVoice(breakType);
  };

  stopAudio = () => {
    try {
      if (this.currentSound) {
        this.currentSound.stop();
        this.currentSound.release();
        this.currentSound = null;
        console.log('🛑 Break audio stopped');
      }
    } catch (error) {
      console.error('❌ Error stopping break audio:', error);
    }
  };

  cleanup = async () => {
    try {
      this.stopAudio();
      
      // Clear all pending cleanup timers
      for (const [filePath, timer] of this.pendingCleanups.entries()) {
        clearTimeout(timer);
        this.pendingCleanups.delete(filePath);
      }
      
      // Clear active files tracking
      this.activeAudioFiles.clear();
      
      // Clean up old break audio files
      const files = await RNFetchBlob.fs.ls(this.cacheDir);
      const breakAudioFiles = files.filter(file => 
        file.endsWith('.mp3') && file.startsWith('break_')
      );
      
      for (const file of breakAudioFiles) {
        const filePath = `${this.cacheDir}/${file}`;
        await this.safeDeleteFile(filePath);
      }
      
      console.log('🧹 BreakVoiceService cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  };
}

export default new BreakVoiceService();
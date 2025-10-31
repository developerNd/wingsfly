// NightModeVoiceService.js - Voice Commands for Night Mode Session End
import Sound from 'react-native-sound';
import RNFetchBlob from 'rn-fetch-blob';
import { ELEVENLABS_API_KEY } from '@env';

const VOICE_ID = "V79Doapn9P53cEABwysz";
const API_KEY = ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

class NightModeVoiceService {
  constructor() {
    this.isInitialized = false;
    this.currentSound = null;
    this.cacheDir = RNFetchBlob.fs.dirs.CacheDir;
    this.pendingCleanups = new Map();
    this.activeAudioFiles = new Set();
  }

  initialize = async () => {
    try {
      Sound.setCategory('Playback');
      Sound.setMode('Default');
      Sound.setActive(true);
      
      this.isInitialized = true;
      console.log('✅ NightModeVoiceService initialized');
    } catch (error) {
      console.error('❌ Error initializing NightModeVoiceService:', error);
    }
  };

  generateSpeech = async (text, filename = 'nightmode_tts.mp3') => {
    try {
      console.log(`🎤 Generating Night Mode speech:`, text);
      
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
      
      console.log(`✅ Night Mode audio saved to:`, filePath);
      return filePath;
    } catch (error) {
      console.error('❌ Error generating Night Mode speech:', error);
      throw error;
    }
  };

  playAudioFile = (filePath) => {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔊 Playing Night Mode audio: ${filePath}`);
        
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
              console.log(`✅ Night Mode audio played successfully`);
              resolve(true);
            } else {
              console.error('❌ Night Mode audio playback failed');
              reject(new Error('Playback failed'));
            }
            
            this.currentSound.release();
            this.currentSound = null;
            
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

  safeDeleteFile = async (filePath) => {
    try {
      if (this.activeAudioFiles.has(filePath)) {
        console.log(`⏳ File still in use, will retry: ${filePath}`);
        setTimeout(() => this.safeDeleteFile(filePath), 2000);
        return;
      }

      const exists = await RNFetchBlob.fs.exists(filePath);
      if (!exists) {
        console.log(`ℹ️ File already deleted: ${filePath}`);
        return;
      }

      await RNFetchBlob.fs.unlink(filePath);
      console.log(`🗑️ Successfully deleted: ${filePath}`);
      
      if (this.pendingCleanups.has(filePath)) {
        clearTimeout(this.pendingCleanups.get(filePath));
        this.pendingCleanups.delete(filePath);
      }
    } catch (error) {
      if (!error.message.includes('ENOENT')) {
        console.error(`❌ Error deleting file ${filePath}:`, error.message);
      }
    }
  };

  playSessionEndVoice = async (customMessage, retryCount = 0) => {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`🎯 Playing Night Mode session end voice (attempt ${retryCount + 1})`);
      console.log(`📝 Message: ${customMessage}`);
      
      const audioFilePath = await this.generateSpeech(
        customMessage, 
        `nightmode_${Date.now()}.mp3`
      );
      
      await this.playAudioFile(audioFilePath);
      
      const cleanupTimer = setTimeout(() => {
        this.safeDeleteFile(audioFilePath);
      }, 15000);
      
      this.pendingCleanups.set(audioFilePath, cleanupTimer);

      return true;
    } catch (error) {
      console.error(`❌ Error playing Night Mode voice (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < 2) {
        console.log(`🔄 Retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await this.playSessionEndVoice(customMessage, retryCount + 1);
      }
      
      return false;
    }
  };

  testVoice = async (message) => {
    console.log(`🧪 Testing Night Mode voice...`);
    return await this.playSessionEndVoice(message);
  };

  stopAudio = () => {
    try {
      if (this.currentSound) {
        this.currentSound.stop();
        this.currentSound.release();
        this.currentSound = null;
        console.log('🛑 Night Mode audio stopped');
      }
    } catch (error) {
      console.error('❌ Error stopping Night Mode audio:', error);
    }
  };

  cleanup = async () => {
    try {
      this.stopAudio();
      
      for (const [filePath, timer] of this.pendingCleanups.entries()) {
        clearTimeout(timer);
        this.pendingCleanups.delete(filePath);
      }
      
      this.activeAudioFiles.clear();
      
      const files = await RNFetchBlob.fs.ls(this.cacheDir);
      const nightModeAudioFiles = files.filter(file => 
        file.endsWith('.mp3') && file.startsWith('nightmode_')
      );
      
      for (const file of nightModeAudioFiles) {
        const filePath = `${this.cacheDir}/${file}`;
        await this.safeDeleteFile(filePath);
      }
      
      console.log('🧹 NightModeVoiceService cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  };
}

export default new NightModeVoiceService();
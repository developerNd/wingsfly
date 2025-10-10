import Sound from 'react-native-sound';
import RNFetchBlob from 'rn-fetch-blob';
import RNFS from 'react-native-fs';
import { ELEVENLABS_API_KEY } from '@env';


const VOICE_ID = "V79Doapn9P53cEABwysz";
const API_KEY = ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

class AppreciationVoiceService {
  constructor() {
    this.isInitialized = false;
    this.currentSound = null;
    this.cacheDir = RNFetchBlob.fs.dirs.CacheDir;
  }

  // Initialize the service
  initialize = async () => {
    try {
      Sound.setCategory('Playback');
      Sound.setMode('Default');
      Sound.setActive(true);
      
      this.isInitialized = true;
      console.log('✅ AppreciationVoiceService initialized');
    } catch (error) {
      console.error('❌ Error initializing AppreciationVoiceService:', error);
    }
  };

  // Generate speech using ElevenLabs
  generateSpeech = async (text, filename = 'appreciation_tts.mp3') => {
    try {
      console.log(`🎤 Generating appreciation speech:`, text);
      
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
      
      console.log(`✅ Appreciation audio saved to:`, filePath);
      return filePath;
    } catch (error) {
      console.error('❌ Error generating appreciation speech:', error);
      throw error;
    }
  };

  // Play audio file
  playAudioFile = (filePath) => {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔊 Playing appreciation audio: ${filePath}`);
        
        if (this.currentSound) {
          this.currentSound.stop();
          this.currentSound.release();
        }

        this.currentSound = new Sound(filePath, '', (error) => {
          if (error) {
            console.error('❌ Error loading sound:', error);
            reject(error);
            return;
          }

          this.currentSound.setVolume(1.0);
          
          this.currentSound.play((success) => {
            if (success) {
              console.log(`✅ Appreciation audio played successfully`);
              resolve(true);
            } else {
              console.error('❌ Appreciation audio playback failed');
              reject(new Error('Playback failed'));
            }
            
            this.currentSound.release();
            this.currentSound = null;
          });
        });
      } catch (error) {
        console.error('❌ Error in playAudioFile:', error);
        reject(error);
      }
    });
  };

  // Play appreciation message with retry
  playAppreciationMessage = async (appreciationData, retryCount = 0) => {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`🎯 Playing appreciation message (attempt ${retryCount + 1})`);
      
      let audioFilePath;

      if (appreciationData.audioFilePath) {
        // Check if uploaded audio file exists
        console.log('📁 Checking uploaded audio file:', appreciationData.audioFilePath);
        
        const fileExists = await RNFS.exists(appreciationData.audioFilePath);
        if (!fileExists) {
          console.error('❌ Audio file not found:', appreciationData.audioFilePath);
          throw new Error('Audio file not found');
        }
        
        // Play uploaded audio file
        console.log('▶️ Playing uploaded audio file');
        audioFilePath = appreciationData.audioFilePath;
        await this.playAudioFile(audioFilePath);
        
      } else if (appreciationData.text) {
        // Generate speech using ElevenLabs
        console.log('📝 Generating speech for text:', appreciationData.text);
        audioFilePath = await this.generateSpeech(
          appreciationData.text, 
          `appreciation_${Date.now()}.mp3`
        );
        
        await this.playAudioFile(audioFilePath);
        
        // Clean up generated file after 10 seconds (don't delete uploaded files)
        setTimeout(() => {
          RNFetchBlob.fs.unlink(audioFilePath).catch(console.error);
        }, 10000);
      }

      return true;
    } catch (error) {
      console.error(`❌ Error playing appreciation (attempt ${retryCount + 1}):`, error);
      
      // Retry up to 2 times with delay
      if (retryCount < 2) {
        console.log(`🔄 Retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await this.playAppreciationMessage(appreciationData, retryCount + 1);
      }
      
      return false;
    }
  };

  // Stop current audio
  stopAudio = () => {
    try {
      if (this.currentSound) {
        this.currentSound.stop();
        this.currentSound.release();
        this.currentSound = null;
        console.log('🛑 Appreciation audio stopped');
      }
    } catch (error) {
      console.error('❌ Error stopping appreciation audio:', error);
    }
  };

  // Cleanup
  cleanup = async () => {
    try {
      this.stopAudio();
      
      const files = await RNFetchBlob.fs.ls(this.cacheDir);
      const appreciationAudioFiles = files.filter(file => 
        file.endsWith('.mp3') && file.startsWith('appreciation_')
      );
      
      for (const file of appreciationAudioFiles) {
        await RNFetchBlob.fs.unlink(`${this.cacheDir}/${file}`);
      }
      
      console.log('🧹 AppreciationVoiceService cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  };
}

export default new AppreciationVoiceService();
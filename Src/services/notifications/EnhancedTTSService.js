// EnhancedTTSService.js - ElevenLabs Integration with UPDATED FLOW
import Sound from 'react-native-sound';
import RNFetchBlob from 'rn-fetch-blob';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VOICE_ID = "V79Doapn9P53cEABwysz";
const API_KEY = "sk_5b19dc2ac1cd8beaad0e9997137a954ac4477b56496545c6";
const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

// Dynamic motivational quotes with placeholders (ONLY these quotes - no additional ones)
const DYNAMIC_MOTIVATIONAL_QUOTES = [
  "{name}, याद रखो — सफलता सुबह की मेहनत से शुरू होती है। अभी {time} बजे तुम्हारा कार्य है: {task}।",
  "{name}, मेहनत कभी बेकार नहीं जाती। यह {time} का समय है, अब तुम्हें पूरा करना है: {task}।",
  "हर बड़ा सपना मेहनत से पूरा होता है, {name}। अभी {time} बजे तुम्हारा कार्य है: {task}।",
  "{name}, हार मत मानो। लगातार कोशिश ही जीत दिलाती है। {time} बजे तुम्हें करना है: {task}।",
  "मुश्किल रास्ते ही खूबसूरत मंज़िल तक ले जाते हैं, {name}। तुम्हारा कार्य {task} {time} बजे पूरा होना चाहिए।"
];

class EnhancedTTSService {
  constructor() {
    this.isInitialized = false;
    this.currentSound = null;
    this.cacheDir = RNFetchBlob.fs.dirs.CacheDir;
    this.userProfile = null;
  }

  // Initialize the service
  initialize = async () => {
    try {
      // Enable sound in silence mode
      Sound.setCategory('Playback');
      Sound.setMode('Default');
      Sound.setActive(true);
      
      this.isInitialized = true;
      console.log('EnhancedTTSService initialized - UPDATED FLOW: English message + Dynamic quote only');
    } catch (error) {
      console.error('Error initializing EnhancedTTSService:', error);
    }
  };

  // Set user profile for personalized messages
  setUserProfile = (userProfile) => {
    this.userProfile = userProfile;
    console.log('User profile set for ElevenLabs TTS:', userProfile?.username || userProfile?.display_name);
  };

  // Detect if text contains Hindi characters
  containsHindi = (text) => {
    const hindiRegex = /[\u0900-\u097F]/;
    return hindiRegex.test(text);
  };

  // Generate speech with proper speed control for Hindi vs English
  generateSpeech = async (text, filename = 'tts.mp3', forceLanguage = null) => {
    try {
      const isHindi = forceLanguage === 'hindi' || (forceLanguage !== 'english' && this.containsHindi(text));
      
      console.log(`🎤 Generating speech with ElevenLabs for ${isHindi ? 'HINDI' : 'ENGLISH'}:`, text);
      
      const voiceSettings = isHindi ? {
        // SLOW SETTINGS FOR HINDI
        stability: 0.85,
        similarity_boost: 0.9,
        style: 0.2,
        use_speaker_boost: true,
        speaking_rate: 0.6,           // 60% speed for Hindi
        pitch: 0.9,
      } : {
        // NORMAL SETTINGS FOR ENGLISH
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.5,
        use_speaker_boost: true,
        speaking_rate: 1.0,           // Normal speed for English
        pitch: 1.0,
      };

      const requestBody = {
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: voiceSettings,
        output_format: "mp3_44100_128",
        optimize_streaming_latency: 0,
        ...(isHindi && {
          language_code: "hi",
          pronunciation_dictionary_locators: ["hindi"]
        })
      };

      console.log(`📝 Request body for ${isHindi ? 'HINDI' : 'ENGLISH'}:`, JSON.stringify(requestBody, null, 2));

      const response = await fetch(ELEVENLABS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
          "Accept": "audio/mpeg",
          "User-Agent": "WingsFly-App/1.0"
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ElevenLabs API failed: ${response.status} - ${errorText}`);
        throw new Error(`ElevenLabs API failed: ${response.status} - ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const filePath = `${this.cacheDir}/${filename}`;
      await RNFetchBlob.fs.writeFile(filePath, base64Audio, 'base64');
      
      console.log(`✅ ElevenLabs ${isHindi ? 'HINDI (SLOW)' : 'ENGLISH (NORMAL)'} audio saved to:`, filePath);
      
      const fileInfo = await RNFetchBlob.fs.stat(filePath);
      console.log(`📊 Audio file size: ${Math.round(fileInfo.size / 1024)}KB`);
      
      return filePath;
    } catch (error) {
      console.error('❌ Error generating speech with ElevenLabs:', error);
      throw error;
    }
  };

  // Get random dynamic motivational quote
  getRandomDynamicQuote = () => {
    const randomIndex = Math.floor(Math.random() * DYNAMIC_MOTIVATIONAL_QUOTES.length);
    const quote = DYNAMIC_MOTIVATIONAL_QUOTES[randomIndex];
    console.log(`🎯 Selected dynamic quote template #${randomIndex + 1}:`, quote);
    return quote;
  };

  // NEW: Generate simple English message for task notification
  generateSimpleEnglishMessage = (taskData, reminderData) => {
    const userName = this.userProfile?.username || 
                     this.userProfile?.display_name || 
                     this.userProfile?.user_metadata?.display_name ||
                     'there';

    const taskTitle = taskData.title || 'reminder';
    const scheduleTime = taskData.blockTimeData?.startTime || 'now';
    
    const message = `Hello ${userName}, your task ${taskTitle} is scheduled at ${scheduleTime}`;
    
    console.log(`📝 Generated simple English message:`, message);
    console.log(`👤 User: ${userName}, ⏰ Time: ${scheduleTime}, 📋 Task: ${taskTitle}`);
    
    return message;
  };

  // UPDATED: Generate dynamic motivational quote with placeholders
  generateDynamicQuote = (taskData, reminderData) => {
    const userName = this.userProfile?.username || 
                     this.userProfile?.display_name || 
                     this.userProfile?.user_metadata?.display_name ||
                     'there';

    const taskTitle = taskData.title || 'reminder';
    const scheduleTime = taskData.blockTimeData?.startTime || 'now';
    
    // Get random dynamic quote
    const quoteTemplate = this.getRandomDynamicQuote();
    
    // Replace placeholders with actual data
    const personalizedMessage = quoteTemplate
      .replace(/{name}/g, userName)
      .replace(/{time}/g, scheduleTime)
      .replace(/{task}/g, taskTitle);
    
    console.log(`📝 Generated dynamic quote:`, personalizedMessage);
    console.log(`👤 User: ${userName}, ⏰ Time: ${scheduleTime}, 📋 Task: ${taskTitle}`);
    
    return personalizedMessage;
  };

  // Play audio file with debugging
  playAudioFile = (filePath, expectedSpeed = 'auto-detected') => {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔊 Playing audio file: ${filePath} (Expected speed: ${expectedSpeed})`);
        
        // Stop any currently playing sound
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
          
          const duration = this.currentSound.getDuration();
          console.log(`⏱️ Audio duration: ${duration.toFixed(2)} seconds`);
          
          this.currentSound.play((success) => {
            if (success) {
              console.log(`✅ Audio played successfully (${expectedSpeed} speed)`);
              resolve(true);
            } else {
              console.error('❌ Audio playback failed');
              reject(new Error('Playback failed'));
            }
            
            // Release the sound resource
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

  // UPDATED: Play enhanced alarm speech with new two-part flow
  playEnhancedAlarmSpeech = async (taskData, reminderData) => {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('🚨 === NEW FLOW: ENGLISH MESSAGE + DYNAMIC QUOTE ONLY ===');
      
      // Generate simple English message
      const englishMessage = this.generateSimpleEnglishMessage(taskData, reminderData);
      
      // Generate dynamic motivational quote
      const dynamicQuote = this.generateDynamicQuote(taskData, reminderData);
      
      console.log('📢 English Message:', englishMessage);
      console.log('🎯 Dynamic Quote:', dynamicQuote);

      // Generate separate audio files for perfect speed control
      console.log('🎵 Generating ENGLISH audio with normal speed...');
      const englishAudioPath = await this.generateSpeech(
        englishMessage, 
        `english_${Date.now()}.mp3`, 
        'english' // Force English settings for normal speed
      );
      
      console.log('🎵 Generating DYNAMIC QUOTE audio with slow speed...');
      const quoteAudioPath = await this.generateSpeech(
        dynamicQuote, 
        `quote_${Date.now()}.mp3`, 
        'hindi' // Force Hindi settings for slow speed (contains Hindi)
      );
      
      // Play English message first at normal speed
      console.log('▶️ Playing English message (normal speed)...');
      await this.playAudioFile(englishAudioPath, 'normal');
      
      // Wait 1.5 seconds between messages
      console.log('⏸️ Pausing 1.5 seconds between messages...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Play dynamic quote at slow speed
      console.log('▶️ Playing dynamic motivational quote (SLOW speed)...');
      await this.playAudioFile(quoteAudioPath, 'slow (60%)');
      
      // Clean up files after delay
      setTimeout(() => {
        console.log('🧹 Cleaning up audio files...');
        RNFetchBlob.fs.unlink(englishAudioPath).catch(console.error);
        RNFetchBlob.fs.unlink(quoteAudioPath).catch(console.error);
      }, 10000);

      console.log('✅ Enhanced alarm speech with new flow completed successfully!');
      return true;
      
    } catch (error) {
      console.error('❌ Error playing enhanced alarm speech:', error);
      
      // FALLBACK: Try combined message
      try {
        console.log('🔄 Fallback: Trying combined message...');
        const englishMessage = this.generateSimpleEnglishMessage(taskData, reminderData);
        const dynamicQuote = this.generateDynamicQuote(taskData, reminderData);
        
        const combinedMessage = `${englishMessage}. ${dynamicQuote}`;
        
        const audioFilePath = await this.generateSpeech(
          combinedMessage, 
          `combined_${Date.now()}.mp3`, 
          'hindi' // Use Hindi settings for slow speed (quote contains Hindi)
        );
        
        await this.playAudioFile(audioFilePath, 'slow (Hindi optimized)');
        
        setTimeout(() => {
          RNFetchBlob.fs.unlink(audioFilePath).catch(console.error);
        }, 5000);
        
        console.log('✅ Fallback completed successfully!');
        return true;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return false;
      }
    }
  };

  // NEW: Play only dynamic quote (for testing)
  playDynamicQuoteOnly = async (taskData, reminderData) => {
    try {
      const dynamicQuote = this.generateDynamicQuote(taskData, reminderData);
      console.log('🎯 === PLAYING DYNAMIC QUOTE ONLY ===');
      console.log('📝 Dynamic Quote:', dynamicQuote);
      console.log('🐌 Speed Setting: 60% (0.6x) for clear pronunciation');
      
      const audioFilePath = await this.generateSpeech(
        dynamicQuote, 
        `quote_${Date.now()}.mp3`, 
        'hindi' // Force Hindi settings for slow speed
      );
      
      await this.playAudioFile(audioFilePath, 'slow (60%)');
      
      setTimeout(() => {
        RNFetchBlob.fs.unlink(audioFilePath).catch(console.error);
      }, 5000);

      console.log('✅ Dynamic quote playback completed!');
      return true;
    } catch (error) {
      console.error('❌ Error playing dynamic quote:', error);
      return false;
    }
  };

  // NEW: Play only English message (for testing)
  playEnglishMessageOnly = async (taskData, reminderData) => {
    try {
      const englishMessage = this.generateSimpleEnglishMessage(taskData, reminderData);
      console.log('📢 === PLAYING ENGLISH MESSAGE ONLY ===');
      console.log('📝 English Message:', englishMessage);
      
      const audioFilePath = await this.generateSpeech(
        englishMessage, 
        `english_${Date.now()}.mp3`, 
        'english' // Force English settings for normal speed
      );
      await this.playAudioFile(audioFilePath, 'normal');
      
      setTimeout(() => {
        RNFetchBlob.fs.unlink(audioFilePath).catch(console.error);
      }, 5000);

      return true;
    } catch (error) {
      console.error('❌ Error playing English message:', error);
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
        console.log('🛑 Audio stopped');
      }
    } catch (error) {
      console.error('❌ Error stopping audio:', error);
    }
  };

  // UPDATED: Test the TTS service with new flow
  testTTS = async (userName = 'Rahul') => {
    const testTaskData = {
      title: 'Complete Project Report',
      blockTimeData: {
        startTime: 'eleven thirty'
      }
    };

    const testReminderData = {
      type: 'alarm'
    };

    // Set test user profile
    this.setUserProfile({ username: userName });

    console.log('🧪 === TESTING NEW FLOW: ENGLISH MESSAGE + DYNAMIC QUOTE ===');
    
    try {
      console.log('1️⃣ Testing English message only...');
      await this.playEnglishMessageOnly(testTaskData, testReminderData);
      
      console.log('⏸️ Waiting 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('2️⃣ Testing dynamic quote only...');
      await this.playDynamicQuoteOnly(testTaskData, testReminderData);
      
      console.log('⏸️ Waiting 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('3️⃣ Testing complete two-part flow...');
      const result = await this.playEnhancedAlarmSpeech(testTaskData, testReminderData);
      
      console.log('✅ All tests completed!');
      return result;
      
    } catch (error) {
      console.error('❌ Error during testing:', error);
      return false;
    }
  };

  // UPDATED: Get service info with new flow
  getServiceInfo = () => {
    return {
      isInitialized: this.isInitialized,
      provider: 'ElevenLabs',
      model: 'eleven_multilingual_v2',
      voiceId: VOICE_ID,
      flow: 'two_part_english_then_dynamic_quote',
      features: [
        'simple_english_task_messages', 
        'dynamic_motivational_quotes_with_placeholders', 
        'two_part_sequential_playback',
        'proper_speed_control_per_language',
        'automatic_cleanup'
      ],
      quotesCount: DYNAMIC_MOTIVATIONAL_QUOTES.length,
      speedSettings: {
        englishMessage: '1.0x (normal speed)',
        dynamicQuote: '0.6x (60% speed - slow for clear Hindi pronunciation)',
        pauseBetween: '1.5 seconds'
      },
      placeholders: {
        available: ['{name}', '{time}', '{task}'],
        autoReplacement: 'enabled',
        randomSelection: 'enabled'
      },
      userProfile: this.userProfile ? {
        hasUsername: !!this.userProfile.username,
        hasDisplayName: !!this.userProfile.display_name
      } : null
    };
  };

  // Enhanced cleanup
  cleanup = async () => {
    try {
      this.stopAudio();
      
      // Clean up any cached audio files
      const files = await RNFetchBlob.fs.ls(this.cacheDir);
      const audioFiles = files.filter(file => file.endsWith('.mp3') && 
        (file.startsWith('english_') || file.startsWith('quote_') || 
         file.startsWith('combined_') || file.startsWith('test_')));
      
      for (const file of audioFiles) {
        await RNFetchBlob.fs.unlink(`${this.cacheDir}/${file}`);
      }
      
      console.log('🧹 EnhancedTTSService cleanup completed - removed', audioFiles.length, 'audio files');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  };
}

export default new EnhancedTTSService();
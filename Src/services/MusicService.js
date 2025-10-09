import Sound from 'react-native-sound';
import {Platform} from 'react-native';

class MusicService {
  constructor() {
    this.planYourDaySound = null;
    this.isInitialized = false;
    this.isPlaying = false;
    this.playAttempts = 0;
    this.maxRetries = 3;
    this.stopAttempts = 0;
    this.maxStopRetries = 3;
    
    // Initialize Sound library with proper settings
    this.initializeSound();
  }

  // Initialize sound with proper audio session settings
  initializeSound() {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Allow playback even in silent mode and mix with other audio
        Sound.setCategory('Playback', true); // true = mixWithOthers
        Sound.setActive(true);
      } else {
        // Android: Set category for music playbook
        Sound.setCategory('Playback');
      }
      console.log('🎵 MusicService: Sound category set for platform:', Platform.OS);
    } catch (error) {
      console.log('🎵 MusicService: Sound initialization warning:', error.message);
      // Continue without failing - this is optional
    }
  }

  // Initialize the music service
  async initialize() {
    try {
      console.log('🎵 MusicService: Initializing...');
      if (this.isInitialized) {
        console.log('🎵 MusicService: Already initialized');
        return true;
      }

      this.isInitialized = true;
      console.log('🎵 MusicService: Initialized successfully');
      return true;
    } catch (error) {
      console.error('🎵 MusicService: Error initializing:', error);
      // Don't throw - allow app to continue without music
      return false;
    }
  }

  // Load Plan Your Day background music
  async loadPlanYourDayMusic() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🎵 MusicService: Loading Plan Your Day music...');
        
        const fileName = 'plan_your_day_music.mp3';
        console.log('🎵 MusicService: Loading file:', fileName);
        
        this.planYourDaySound = new Sound(fileName, Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.error('🎵 MusicService: Failed to load music file:', error);
            reject(error);
            return;
          }
          
          console.log('🎵 MusicService: ✅ Music file loaded successfully');
          console.log('🎵 MusicService: Duration:', this.planYourDaySound.getDuration(), 'seconds');
          resolve(this.planYourDaySound);
        });
      } catch (error) {
        console.error('🎵 MusicService: Error in loadPlanYourDayMusic:', error);
        reject(error);
      }
    });
  }

  // Start Plan Your Day background music with retry logic
  async startPlanYourDayMusic() {
    try {
      console.log('🎵 MusicService: 🎵 Starting Plan Your Day background music...');
      console.log('🎵 MusicService: Current playing state:', this.isPlaying);
      console.log('🎵 MusicService: Current sound object exists:', !!this.planYourDaySound);
      
      // Initialize if not already done
      if (!this.isInitialized) {
        console.log('🎵 MusicService: Not initialized, initializing now...');
        await this.initialize();
      }

      // Stop any currently playing music
      if (this.isPlaying) {
        console.log('🎵 MusicService: Music already playing, stopping first...');
        await this.stopPlanYourDayMusic();
      }

      // Load music if not already loaded
      if (!this.planYourDaySound) {
        console.log('🎵 MusicService: Music not loaded, loading now...');
        await this.loadPlanYourDayMusic();
      }

      // Reset play attempts for new start
      this.playAttempts = 0;
      
      const success = await this.attemptPlay();
      console.log('🎵 MusicService: Start music final result:', success);
      return success;
    } catch (error) {
      console.log('🎵 MusicService: Music start failed (continuing without music):', error.message);
      this.isPlaying = false;
      // Don't throw - allow app to continue without music
      return false;
    }
  }

  // Attempt to play with retry logic
  async attemptPlay() {
    return new Promise((resolve) => {
      this.playAttempts++;
      console.log('🎵 MusicService: Play attempt', this.playAttempts, '/', this.maxRetries);

      if (!this.planYourDaySound) {
        console.log('🎵 MusicService: No sound object available for playing');
        resolve(false);
        return;
      }

      // Set up audio before playing
      try {
        this.planYourDaySound.setVolume(0.2); // Lower volume
        this.planYourDaySound.setNumberOfLoops(-1); // Infinite loop
        console.log('🎵 MusicService: Audio settings applied - volume: 0.2, loops: infinite');
      } catch (settingsError) {
        console.log('🎵 MusicService: Error setting audio properties:', settingsError.message);
      }

      this.planYourDaySound.play((success) => {
        if (success) {
          console.log('🎵 MusicService: ✅ Plan Your Day music started successfully!');
          this.isPlaying = true;
          this.playAttempts = 0; // Reset on success
          resolve(true);
        } else {
          console.log('🎵 MusicService: ❌ Play attempt', this.playAttempts, 'failed');
          
          if (this.playAttempts < this.maxRetries) {
            // Wait a bit and retry
            console.log('🎵 MusicService: Waiting 1 second before retry...');
            setTimeout(() => {
              console.log('🎵 MusicService: Retrying music playback...');
              this.attemptPlay().then(resolve);
            }, 1000);
          } else {
            console.log('🎵 MusicService: 🔇 Music playbook failed after all retries');
            console.log('🎵 MusicService: 💡 Device may be on silent/busy - this is normal');
            console.log('🎵 MusicService: Continuing without background music');
            this.isPlaying = false;
            resolve(false); // Don't fail the app
          }
        }
      });
    });
  }

  // Stop Plan Your Day background music with retry logic
  async stopPlanYourDayMusic() {
    try {
      console.log('🎵 MusicService: Attempting to stop Plan Your Day music...');
      console.log('🎵 MusicService: Current state - isPlaying:', this.isPlaying, 'hasSound:', !!this.planYourDaySound);
      
      // Reset stop attempts
      this.stopAttempts = 0;
      
      if (this.planYourDaySound) {
        return await this.attemptStop();
      } else {
        console.log('🎵 MusicService: No music object to stop');
        this.isPlaying = false;
        return true;
      }
    } catch (error) {
      console.log('🎵 MusicService: Music stop error:', error.message);
      this.isPlaying = false;
      return true; // Don't fail the operation
    }
  }

  // Attempt to stop with retry logic
  async attemptStop() {
    return new Promise((resolve) => {
      this.stopAttempts++;
      console.log('🎵 MusicService: Stop attempt', this.stopAttempts, '/', this.maxStopRetries);
      
      this.planYourDaySound.stop((success) => {
        if (success) {
          console.log('🎵 MusicService: 🔇 Plan Your Day music stopped successfully');
          this.isPlaying = false;
          this.stopAttempts = 0;
          resolve(true);
        } else {
          console.log('🎵 MusicService: ❌ Stop attempt', this.stopAttempts, 'failed');
          
          if (this.stopAttempts < this.maxStopRetries) {
            // Wait and retry
            setTimeout(() => {
              console.log('🎵 MusicService: Retrying music stop...');
              this.attemptStop().then(resolve);
            }, 500);
          } else {
            console.log('🎵 MusicService: Stop failed after all retries, forcing state update');
            this.isPlaying = false;
            resolve(true); // Consider it stopped even if callback failed
          }
        }
      });
    });
  }

  // Force stop with multiple aggressive approaches
  async forceStopPlanYourDayMusic() {
    try {
      console.log('🎵 MusicService: 🚨 FORCE STOPPING Plan Your Day music...');
      console.log('🎵 MusicService: Current state before force stop:');
      console.log('🎵 MusicService: - isPlaying:', this.isPlaying);
      console.log('🎵 MusicService: - hasSound:', !!this.planYourDaySound);
      console.log('🎵 MusicService: - isInitialized:', this.isInitialized);
      
      // Set playing state to false immediately
      this.isPlaying = false;
      console.log('🎵 MusicService: ✅ Playing state set to false immediately');
      
      if (this.planYourDaySound) {
        // Method 1: Try normal stop
        try {
          console.log('🎵 MusicService: Attempting method 1 - stop()...');
          await new Promise((resolve) => {
            this.planYourDaySound.stop((success) => {
              console.log('🎵 MusicService: Method 1 stop() result:', success);
              resolve(success);
            });
            
            // Don't wait more than 2 seconds
            setTimeout(() => {
              console.log('🎵 MusicService: Method 1 timeout, continuing...');
              resolve(false);
            }, 2000);
          });
        } catch (stopError) {
          console.log('🎵 MusicService: Method 1 stop() failed:', stopError.message);
        }

        // Method 2: Try pause
        try {
          console.log('🎵 MusicService: Attempting method 2 - pause()...');
          this.planYourDaySound.pause();
          console.log('🎵 MusicService: ✅ Method 2 pause() executed');
        } catch (pauseError) {
          console.log('🎵 MusicService: Method 2 pause() failed:', pauseError.message);
        }

        // Method 3: Set volume to 0
        try {
          console.log('🎵 MusicService: Attempting method 3 - setVolume(0)...');
          this.planYourDaySound.setVolume(0);
          console.log('🎵 MusicService: ✅ Method 3 volume set to 0');
        } catch (volumeError) {
          console.log('🎵 MusicService: Method 3 setVolume failed:', volumeError.message);
        }

        // Method 4: Set number of loops to 0 (stop looping)
        try {
          console.log('🎵 MusicService: Attempting method 4 - setNumberOfLoops(0)...');
          this.planYourDaySound.setNumberOfLoops(0);
          console.log('🎵 MusicService: ✅ Method 4 loops set to 0');
        } catch (loopError) {
          console.log('🎵 MusicService: Method 4 setNumberOfLoops failed:', loopError.message);
        }

        // Method 5: Release and recreate (nuclear option)
        try {
          console.log('🎵 MusicService: Attempting method 5 - release()...');
          this.planYourDaySound.release();
          this.planYourDaySound = null;
          console.log('🎵 MusicService: ✅ Method 5 sound object released and nullified');
        } catch (releaseError) {
          console.log('🎵 MusicService: Method 5 release() failed:', releaseError.message);
          // Force nullify anyway
          this.planYourDaySound = null;
          console.log('🎵 MusicService: ✅ Sound object force nullified');
        }
      } else {
        console.log('🎵 MusicService: No sound object to force stop');
      }
      
      // Final state verification
      console.log('🎵 MusicService: 🔇 FORCE STOP completed');
      console.log('🎵 MusicService: Final state:');
      console.log('🎵 MusicService: - isPlaying:', this.isPlaying);
      console.log('🎵 MusicService: - hasSound:', !!this.planYourDaySound);
      
      return true;
    } catch (error) {
      console.log('🎵 MusicService: Force stop error:', error.message);
      // Ensure state is clean even on error
      this.isPlaying = false;
      this.planYourDaySound = null;
      console.log('🎵 MusicService: Force stop error recovery completed');
      return true; // Don't fail the operation
    }
  }

  // Pause music (for when app goes to background)
  async pausePlanYourDayMusic() {
    try {
      console.log('🎵 MusicService: Attempting to pause music...');
      console.log('🎵 MusicService: Current state - isPlaying:', this.isPlaying, 'hasSound:', !!this.planYourDaySound);
      
      if (this.planYourDaySound && this.isPlaying) {
        this.planYourDaySound.pause();
        console.log('🎵 MusicService: ⏸️ Plan Your Day music paused');
        return true;
      }
      console.log('🎵 MusicService: No music to pause or not playing');
      return false;
    } catch (error) {
      console.log('🎵 MusicService: Music pause warning:', error.message);
      return false;
    }
  }

  // Resume music (for when app comes to foreground)
  async resumePlanYourDayMusic() {
    try {
      console.log('🎵 MusicService: Attempting to resume music...');
      console.log('🎵 MusicService: Current state - isPlaying:', this.isPlaying, 'hasSound:', !!this.planYourDaySound);
      
      if (this.planYourDaySound && !this.isPlaying) {
        const success = await this.attemptPlay();
        console.log('🎵 MusicService: Resume result:', success);
        return success;
      }
      console.log('🎵 MusicService: Cannot resume - no sound or already playing');
      return false;
    } catch (error) {
      console.log('🎵 MusicService: Music resume warning:', error.message);
      return false;
    }
  }

  // Set volume (0.0 to 1.0)
  setVolume(volume) {
    try {
      if (this.planYourDaySound) {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        this.planYourDaySound.setVolume(clampedVolume);
        console.log('🎵 MusicService: 🔊 Volume set to:', clampedVolume);
        return true;
      }
      console.log('🎵 MusicService: Cannot set volume - no sound loaded');
      return false;
    } catch (error) {
      console.log('🎵 MusicService: Volume set warning:', error.message);
      return false;
    }
  }

  // Get current playing status
  getPlayingStatus() {
    const status = {
      isPlaying: this.isPlaying,
      isLoaded: !!this.planYourDaySound,
      isInitialized: this.isInitialized,
      stopAttempts: this.stopAttempts,
      playAttempts: this.playAttempts,
    };
    console.log('🎵 MusicService: Current status:', status);
    return status;
  }

  // Get detailed diagnostic info
  getDiagnosticInfo() {
    const info = {
      isPlaying: this.isPlaying,
      isInitialized: this.isInitialized,
      hasSoundObject: !!this.planYourDaySound,
      playAttempts: this.playAttempts,
      stopAttempts: this.stopAttempts,
      maxRetries: this.maxRetries,
      maxStopRetries: this.maxStopRetries,
      platform: Platform.OS,
      soundDuration: this.planYourDaySound ? this.planYourDaySound.getDuration() : null,
    };
    
    console.log('🎵 MusicService: Diagnostic info:', info);
    return info;
  }

  // Emergency reset - clears all state and recreates service
  async emergencyReset() {
    try {
      console.log('🎵 MusicService: 🚨 EMERGENCY RESET initiated...');
      
      // Force stop everything
      await this.forceStopPlanYourDayMusic();
      
      // Reset all internal state
      this.isPlaying = false;
      this.isInitialized = false;
      this.playAttempts = 0;
      this.stopAttempts = 0;
      this.planYourDaySound = null;
      
      // Reinitialize
      await this.initialize();
      
      console.log('🎵 MusicService: ✅ Emergency reset completed');
      return true;
    } catch (error) {
      console.log('🎵 MusicService: Emergency reset error:', error.message);
      return false;
    }
  }

  // Release resources (call when component unmounts or app closes)
  async cleanup() {
    try {
      console.log('🎵 MusicService: Starting cleanup...');
      console.log('🎵 MusicService: Current state before cleanup:', this.getPlayingStatus());
      
      if (this.planYourDaySound) {
        // Stop music first
        await this.forceStopPlanYourDayMusic();
        
        // Release resources if sound object still exists
        if (this.planYourDaySound) {
          try {
            this.planYourDaySound.release();
            console.log('🎵 MusicService: Sound object released');
          } catch (releaseError) {
            console.log('🎵 MusicService: Release error:', releaseError.message);
          }
          this.planYourDaySound = null;
        }
        
        console.log('🎵 MusicService: 🧹 Music resources cleaned up');
      }
      
      // Reset all state
      this.isInitialized = false;
      this.isPlaying = false;
      this.playAttempts = 0;
      this.stopAttempts = 0;
      
      console.log('🎵 MusicService: Cleanup completed successfully');
      return true;
    } catch (error) {
      console.log('🎵 MusicService: Cleanup warning:', error.message);
      // Force clean state even on error
      this.planYourDaySound = null;
      this.isInitialized = false;
      this.isPlaying = false;
      return false;
    }
  }
}

// Export singleton instance
export default new MusicService();
import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
  NativeModules,
  AppState,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
  useProgress,
  Event,
} from 'react-native-track-player';
import Voice from '@react-native-voice/voice';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import AudioPlayer from '../../Components/Audioplayer';
import VideoPlayer from '../../Components/Videoplayer';
import nightModeVoiceService from '../../services/NightModeVoiceService';
import {supabase} from '../../../supabase';
import {YOUTUBE_API_KEY} from '@env';

const {YouTubeNightModeModule} = NativeModules;

const YOUTUBE_KEY = YOUTUBE_API_KEY;
const SESSION_TIMER_KEY = '@youtube_session_timer';
const VOICE_COMMAND_PLAYED_KEY = '@voice_command_played';
const TRIGGER_COMPLETED_KEY = '@trigger_completed';

let isServiceRegistered = false;
if (!isServiceRegistered) {
  try {
    TrackPlayer.registerPlaybackService(() => require('./playbackService'));
    isServiceRegistered = true;
  } catch (error) {
    console.log('Playback service already registered');
  }
}

const YouTubeVideosScreen = ({navigation, route}) => {
  const [settings, setSettings] = useState(null);
  const [content, setContent] = useState({videos: [], audios: []});
  const [videoDetails, setVideoDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const isLockedRef = useRef(false);

  const playbackState = usePlaybackState();
  const progress = useProgress();
  const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);
  const [triggerPauseStartTime, setTriggerPauseStartTime] = useState(null);
  const [accumulatedPauseTime, setAccumulatedPauseTime] = useState(0);

  // Timer and Voice Command States
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [hasPlayedVoiceCommand, setHasPlayedVoiceCommand] = useState(false);
  const [hasTriggeredNavigation, setHasTriggeredNavigation] = useState(false);

  // NEW: Trigger timer pause state (only for Plan Your Day timer)
  const [isTriggerTimerPaused, setIsTriggerTimerPaused] = useState(false);
  const [pausedTriggerSeconds, setPausedTriggerSeconds] = useState(0);

  // Voice Command Audio - Using TrackPlayer
  const [isPlayingVoiceCommand, setIsPlayingVoiceCommand] = useState(false);
  const [hasPlayedInitialVoiceCommand, setHasPlayedInitialVoiceCommand] =
    useState(false);

  // CRITICAL: Flag to prevent duplicate voice command playback
  const isLoadingVoiceCommand = useRef(false);
  const [isVoiceCommandTrack, setIsVoiceCommandTrack] = useState(false);

  // Voice Recognition states
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showVoiceToast, setShowVoiceToast] = useState(false);
  const [voiceToastMessage, setVoiceToastMessage] = useState('');

  const timerIntervalRef = useRef(null);
  const backgroundTimeRef = useRef(null);
  const voiceToastTimeoutRef = useRef(null);

  const lockMode = route.params?.lockMode || true;

  useEffect(() => {
    checkVoiceCommandStatus();
  }, []);

  // Modify the existing checkVoiceCommandStatus function to also check trigger
  const checkVoiceCommandStatus = async () => {
    try {
      const played = await AsyncStorage.getItem(VOICE_COMMAND_PLAYED_KEY);
      if (played === 'true') {
        console.log('✅ Voice command already played in previous session');
        setHasPlayedInitialVoiceCommand(true);
        setIsPlayingVoiceCommand(false);
        setIsVoiceCommandTrack(false);
      }

      // ✅ Check if trigger already completed
      const triggerCompleted = await AsyncStorage.getItem(
        TRIGGER_COMPLETED_KEY,
      );
      if (triggerCompleted === 'true') {
        console.log(
          '✅ Trigger already completed - user returned for relaxation',
        );
        setHasTriggeredNavigation(true); // Mark as already triggered
      }
    } catch (error) {
      console.error('Error checking voice command status:', error);
    }
  };

  useEffect(() => {
    setupPlayer();
    nightModeVoiceService.initialize();
    setupVoiceRecognition();

    return () => {
      // Cleanup TrackPlayer
      TrackPlayer.reset().catch(err => console.log('Reset error:', err));

      nightModeVoiceService.cleanup();
      Voice.destroy().then(Voice.removeAllListeners);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (voiceToastTimeoutRef.current) {
        clearTimeout(voiceToastTimeoutRef.current);
      }
    };
  }, []);

  // FIXED: Play initial voice command audio ONLY ONCE when settings are loaded
  useEffect(() => {
    if (
      settings?.voice_command_audio_url &&
      !hasPlayedInitialVoiceCommand &&
      !isPlayingVoiceCommand &&
      !isLoadingVoiceCommand.current &&
      !isVoiceCommandTrack
    ) {
      console.log('🔊 Initial voice command audio trigger - playing ONCE');
      playVoiceCommandAudio();
    }
  }, [settings?.voice_command_audio_url]);

  // Setup Voice Recognition
  const setupVoiceRecognition = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Night Mode needs microphone access for voice commands.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Microphone permission denied');
          return;
        }
      }

      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;

      setVoiceEnabled(true);
      console.log('✅ Voice recognition setup complete');
    } catch (error) {
      console.error('Error setting up voice recognition:', error);
    }
  };

  const onSpeechStart = () => {
    console.log('🎤 Speech recognition started');
    setIsListening(true);
  };

  const onSpeechEnd = () => {
    console.log('🎤 Speech recognition ended');
    setIsListening(false);
  };

  const onSpeechResults = event => {
    const text = event.value[0].toLowerCase();
    console.log('🗣️ Recognized:', text);
    setRecognizedText(text);
    processVoiceCommand(text);
  };

  const onSpeechError = error => {
    console.error('Speech recognition error:', error);
    setIsListening(false);

    if (error.error && error.error.code) {
      const errorCode = error.error.code;

      if (errorCode === '5') {
        console.log('Client side error, voice recognition available for retry');
      } else if (errorCode === '7') {
        showVoiceToastMessage('No speech detected. Try again.');
      } else if (errorCode === '6') {
        showVoiceToastMessage('No internet connection');
      }
    }
  };

  const startListening = async () => {
    if (!voiceEnabled) {
      Alert.alert(
        'Voice Commands Unavailable',
        'Please enable microphone permissions in settings.',
      );
      return;
    }

    if (isSessionExpired) {
      showVoiceToastMessage('Session has ended');
      return;
    }

    if (isListening) {
      console.log('Already listening, ignoring request');
      return;
    }

    try {
      try {
        await Voice.destroy();
        await Voice.removeAllListeners();
      } catch (e) {
        console.log('No existing session to destroy');
      }

      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;

      await new Promise(resolve => setTimeout(resolve, 200));

      await Voice.start('en-US');
      setRecognizedText('');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      showVoiceToastMessage('Failed to start voice recognition');
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    if (!isListening) {
      console.log('Not listening, ignoring stop request');
      return;
    }

    try {
      setIsListening(false);
      await Voice.stop();
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      setIsListening(false);
    }
  };

  const showVoiceToastMessage = (message, duration = 2000) => {
    setVoiceToastMessage(message);
    setShowVoiceToast(true);

    if (voiceToastTimeoutRef.current) {
      clearTimeout(voiceToastTimeoutRef.current);
    }

    voiceToastTimeoutRef.current = setTimeout(() => {
      setShowVoiceToast(false);
    }, duration);
  };

  const toggleTriggerTimerPause = () => {
    if (isTriggerTimerPaused) {
      // Resume trigger timer
      console.log('▶️ Resuming Plan Your Day timer...');

      // Calculate how long we were paused
      if (triggerPauseStartTime) {
        const pauseDuration = Date.now() - triggerPauseStartTime;
        const newAccumulatedPause = accumulatedPauseTime + pauseDuration;

        console.log(
          `⏸️ Was paused for ${Math.floor(pauseDuration / 1000)} seconds`,
        );
        console.log(
          `📊 Total accumulated pause time: ${Math.floor(
            newAccumulatedPause / 1000,
          )} seconds`,
        );

        // Update accumulated pause time
        setAccumulatedPauseTime(newAccumulatedPause);
      }

      setIsTriggerTimerPaused(false);
      setTriggerPauseStartTime(null);

      showVoiceToastMessage('▶️ Plan Your Day timer resumed');
    } else {
      // Pause trigger timer
      console.log('⏸️ Pausing Plan Your Day timer...');

      // Record when we paused
      setTriggerPauseStartTime(Date.now());

      // Store current elapsed time for display while paused
      const currentAdjustedElapsed = Math.floor(
        (Date.now() - sessionStartTime - accumulatedPauseTime) / 1000,
      );
      setPausedTriggerSeconds(currentAdjustedElapsed);

      setIsTriggerTimerPaused(true);

      showVoiceToastMessage('⏸️ Plan Your Day timer paused');
    }
  };

  const playVoiceCommandAudio = async () => {
    // CRITICAL: Check if already loading or playing
    if (isLoadingVoiceCommand.current || isVoiceCommandTrack) {
      console.log(
        '⚠️ Voice command audio already loading or playing, skipping',
      );
      return;
    }

    if (!settings?.voice_command_audio_url) {
      console.log('No voice command audio URL');
      return;
    }

    if (isPlayingVoiceCommand || hasPlayedInitialVoiceCommand) {
      console.log('Voice command audio already played or playing');
      return;
    }

    console.log('🔊 Starting voice command audio via TrackPlayer (ONCE)...');

    // CRITICAL: Set loading flag IMMEDIATELY
    isLoadingVoiceCommand.current = true;
    setIsPlayingVoiceCommand(true);

    try {
      // Setup player if not initialized
      if (!isPlayerInitialized) {
        await setupPlayer();
      }

      // Reset any existing tracks
      await TrackPlayer.reset();

      // Add voice command audio track with special metadata
      const voiceCommandTrack = {
        id: 'voice-command-intro',
        url: settings.voice_command_audio_url,
        title: 'Welcome to Night Mode',
        artist: 'Night Mode Introduction',
        artwork: 'https://via.placeholder.com/300/4CAF50/FFFFFF?text=🌙',
        isVoiceCommand: true,
      };

      console.log('Adding voice command track to TrackPlayer');
      await TrackPlayer.add(voiceCommandTrack);

      // Play the track
      await TrackPlayer.play();

      setIsVoiceCommandTrack(true);
      console.log(
        '✅ Voice command audio playing via TrackPlayer with notification',
      );

      // Listen for track end
      const onPlaybackState = async data => {
        if (data.state === State.Stopped || data.state === State.Ended) {
          console.log('🎵 Voice command audio completed');
          setIsPlayingVoiceCommand(false);
          setHasPlayedInitialVoiceCommand(true);
          setIsVoiceCommandTrack(false);
          isLoadingVoiceCommand.current = false;

          // ✅ Save completion status to AsyncStorage
          try {
            await AsyncStorage.setItem(VOICE_COMMAND_PLAYED_KEY, 'true');
            console.log('✅ Voice command completion saved to AsyncStorage');
          } catch (error) {
            console.error('Error saving voice command status:', error);
          }
        }
      };

      TrackPlayer.addEventListener(Event.PlaybackState, onPlaybackState);
    } catch (error) {
      console.error('❌ Failed to play voice command audio:', error);
      setIsPlayingVoiceCommand(false);
      isLoadingVoiceCommand.current = false;
      setIsVoiceCommandTrack(false);
    }
  };

  // Toggle voice command play/pause AND Plan Your Day timer
  const toggleVoiceCommandPlayPause = async () => {
    if (!isVoiceCommandTrack) {
      console.log('No voice command track loaded');
      return;
    }

    try {
      const state = await TrackPlayer.getState();

      if (state === State.Playing) {
        // Pause voice command audio AND Plan Your Day timer
        await TrackPlayer.pause();

        // Pause Plan Your Day timer
        if (!isTriggerTimerPaused) {
          console.log(
            '⏸️ Pausing voice command audio AND Plan Your Day timer...',
          );

          // Record when we paused
          setTriggerPauseStartTime(Date.now());

          // Store current elapsed time for display while paused
          const currentAdjustedElapsed = Math.floor(
            (Date.now() - sessionStartTime - accumulatedPauseTime) / 1000,
          );
          setPausedTriggerSeconds(currentAdjustedElapsed);

          setIsTriggerTimerPaused(true);
        }

        showVoiceToastMessage(
          '⏸️ Voice command and Plan Your Day timer paused',
        );
      } else {
        // Resume voice command audio AND Plan Your Day timer
        await TrackPlayer.play();

        // Resume Plan Your Day timer
        if (isTriggerTimerPaused) {
          console.log(
            '▶️ Resuming voice command audio AND Plan Your Day timer...',
          );

          // Calculate how long we were paused
          if (triggerPauseStartTime) {
            const pauseDuration = Date.now() - triggerPauseStartTime;
            const newAccumulatedPause = accumulatedPauseTime + pauseDuration;

            console.log(
              `⏸️ Was paused for ${Math.floor(pauseDuration / 1000)} seconds`,
            );
            console.log(
              `📊 Total accumulated pause time: ${Math.floor(
                newAccumulatedPause / 1000,
              )} seconds`,
            );

            // Update accumulated pause time
            setAccumulatedPauseTime(newAccumulatedPause);
          }

          setIsTriggerTimerPaused(false);
          setTriggerPauseStartTime(null);
        }

        showVoiceToastMessage(
          '▶️ Voice command and Plan Your Day timer resumed',
        );
      }
    } catch (error) {
      console.error('Error toggling voice command:', error);
    }
  };

  // Format time
  const formatVoiceCommandTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const processVoiceCommand = async text => {
    try {
      // Play/Pause Audio Commands
      if (text.includes('play') && !text.includes('video')) {
        if (currentPlayingAudio) {
          const state = await TrackPlayer.getState();
          if (state === State.Paused) {
            await TrackPlayer.play();
            showVoiceToastMessage('▶️ Playing audio');
          } else {
            showVoiceToastMessage('Audio is already playing');
          }
        } else if (content.audios.length > 0) {
          handleAudioPress(content.audios[0]);
          showVoiceToastMessage('▶️ Playing first audio');
        } else {
          showVoiceToastMessage('No audio available');
        }
      }
      // Pause Audio
      else if (text.includes('pause') || text.includes('stop')) {
        if (currentPlayingAudio || isVoiceCommandTrack) {
          await TrackPlayer.pause();
          showVoiceToastMessage('⏸️ Audio paused');
        } else {
          showVoiceToastMessage('No audio is playing');
        }
      }
      // Play specific audio by number
      else if (text.includes('play audio') || text.includes('play track')) {
        const numbers = ['first', 'second', 'third', 'fourth', 'fifth'];
        let index = -1;

        for (let i = 0; i < numbers.length; i++) {
          if (text.includes(numbers[i])) {
            index = i;
            break;
          }
        }

        if (index === -1) {
          const match = text.match(/\d+/);
          if (match) {
            index = parseInt(match[0]) - 1;
          }
        }

        if (index >= 0 && index < content.audios.length) {
          handleAudioPress(content.audios[index]);
          showVoiceToastMessage(`▶️ Playing audio ${index + 1}`);
        } else {
          showVoiceToastMessage('Audio not found');
        }
      }
      // Play specific video by number
      else if (text.includes('play video') || text.includes('open video')) {
        const numbers = ['first', 'second', 'third', 'fourth', 'fifth'];
        let index = -1;

        for (let i = 0; i < numbers.length; i++) {
          if (text.includes(numbers[i])) {
            index = i;
            break;
          }
        }

        if (index === -1) {
          const match = text.match(/\d+/);
          if (match) {
            index = parseInt(match[0]) - 1;
          }
        }

        if (index >= 0 && index < content.videos.length) {
          handleVideoPress(content.videos[index]);
          showVoiceToastMessage(`▶️ Opening video ${index + 1}`);
        } else {
          showVoiceToastMessage('Video not found');
        }
      }
      // Exit/Back commands
      else if (
        text.includes('exit') ||
        text.includes('quit') ||
        text.includes('close') ||
        text.includes('go back')
      ) {
        showVoiceToastMessage('👋 Exiting Night Mode');
        setTimeout(() => {
          handleExitPress();
        }, 1000);
      }
      // Show time remaining
      else if (
        text.includes('time') ||
        text.includes('timer') ||
        text.includes('remaining')
      ) {
        const sessionRemaining = getRemainingTime();
        const sessionMinutes = Math.floor(sessionRemaining / 60);
        const sessionSeconds = sessionRemaining % 60;
        const sessionTimeStr = `${sessionMinutes} minute${
          sessionMinutes !== 1 ? 's' : ''
        } ${sessionSeconds} second${sessionSeconds !== 1 ? 's' : ''}`;

        if (settings?.trigger_timestamp_seconds) {
          const triggerRemaining = getTriggerRemainingTime();
          const triggerMinutes = Math.floor(triggerRemaining / 60);
          const triggerSeconds = triggerRemaining % 60;
          const triggerTimeStr = `${triggerMinutes} minute${
            triggerMinutes !== 1 ? 's' : ''
          } ${triggerSeconds} second${triggerSeconds !== 1 ? 's' : ''}`;
          showVoiceToastMessage(
            `⏱️ Session: ${sessionTimeStr}\n📝 Plan Your Day: ${triggerTimeStr}`,
            4000,
          );
        } else {
          showVoiceToastMessage(`⏱️ Session: ${sessionTimeStr}`, 3000);
        }
      }
      // Refresh/Reload
      else if (text.includes('refresh') || text.includes('reload')) {
        loadSettings();
        showVoiceToastMessage('🔄 Refreshing content');
      }
      // Help command
      else if (text.includes('help') || text.includes('commands')) {
        showVoiceCommandsHelp();
      }
      // Command not recognized
      else {
        showVoiceToastMessage(
          'Command not recognized. Say "help" for commands',
        );
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      showVoiceToastMessage('Error processing command');
    }
  };

  const showVoiceCommandsHelp = () => {
    Alert.alert(
      '🎤 Voice Commands',
      '📹 Video Commands:\n' +
        '• "Play video [number/first/second]" - Open specific video\n\n' +
        '🎵 Audio Commands:\n' +
        '• "Play" - Play first audio\n' +
        '• "Pause/Stop" - Pause audio\n' +
        '• "Play audio [number/first/second]" - Play specific audio\n\n' +
        '🎛️ Navigation:\n' +
        '• "Exit/Quit/Go back" - Exit Night Mode\n' +
        '• "Refresh/Reload" - Refresh content\n\n' +
        '⏱️ Timer:\n' +
        '• "Time/Timer/Remaining" - Check time left\n\n' +
        '❓ Other:\n' +
        '• "Help/Commands" - Show this help',
      [{text: 'Got it', style: 'default'}],
    );
  };

  const setupPlayer = async () => {
    try {
      try {
        const state = await TrackPlayer.getState();
        console.log('✅ TrackPlayer already initialized, state:', state);
        setIsPlayerInitialized(true);
        return;
      } catch (e) {
        console.log('Setting up TrackPlayer for first time...');
      }

      await TrackPlayer.setupPlayer({
        waitForBuffer: true,
      });

      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
        ],
      });

      setIsPlayerInitialized(true);
      console.log('✅ TrackPlayer initialized successfully');
    } catch (error) {
      console.error('❌ TrackPlayer setup error:', error);
      if (!error.message?.includes('already initialized')) {
        Alert.alert('Error', 'Failed to initialize audio player');
      } else {
        setIsPlayerInitialized(true);
      }
    }
  };

  // Load settings and media from Supabase database
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📡 Fetching night mode settings from database...');

      const {data: settingsData, error: settingsError} = await supabase
        .from('night_mode_settings')
        .select('*')
        .order('created_at', {ascending: false})
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      if (settingsData) {
        console.log('✅ Settings loaded from database:', settingsData);
        setSettings(settingsData);
      }

      const {data: mediaData, error: mediaError} = await supabase
        .from('night_mode_media')
        .select('*')
        .eq('is_active', true)
        .order('display_order', {ascending: true});

      if (mediaError) {
        throw mediaError;
      }

      console.log('✅ Media items loaded:', mediaData);

      if (!mediaData || mediaData.length === 0) {
        setError(
          'No content available. Please add videos or audio in settings.',
        );
        setLoading(false);
        return;
      }

      const videos = mediaData
        .filter(item => item.type === 'youtube')
        .map(item => ({
          id: item.id,
          videoId: item.youtube_video_id,
          url: item.youtube_url,
          type: 'video',
        }));

      const audios = mediaData
        .filter(item => item.type === 'audio')
        .map(item => ({
          id: item.id,
          title: item.audio_title || item.audio_file_name || 'Audio',
          url: item.audio_file_url,
          uri: item.audio_file_url,
          name: item.audio_file_name || 'audio',
          thumbnail: item.thumbnail_url,
          size: item.audio_size,
          type: 'audio',
        }));

      setContent({videos, audios});
      setLoading(false);
    } catch (err) {
      console.error('❌ Error loading settings:', err);
      setError('Failed to load content. Please try again.');
      setLoading(false);
    }
  }, []);

  // Load or initialize session timer
  const loadSessionTimer = useCallback(async () => {
    try {
      const startFromSettings = route.params?.startFresh || false;

      if (startFromSettings) {
        console.log('🆕 Starting fresh session from settings...');

        const now = Date.now();
        const newTimerData = {
          startTime: now,
          initialized: new Date().toISOString(),
        };

        await AsyncStorage.setItem(
          SESSION_TIMER_KEY,
          JSON.stringify(newTimerData),
        );
        setSessionStartTime(now);
        setElapsedSeconds(0);
        setIsSessionExpired(false);
        setHasPlayedVoiceCommand(false);
        setHasTriggeredNavigation(false);

        console.log('⏱️ Fresh timer initialized:', newTimerData);
        return newTimerData;
      }

      const savedTimer = await AsyncStorage.getItem(SESSION_TIMER_KEY);
      if (savedTimer) {
        const timerData = JSON.parse(savedTimer);
        console.log('⏱️ Resuming existing timer:', timerData);

        const now = Date.now();
        const elapsed = Math.floor((now - timerData.startTime) / 1000);

        setSessionStartTime(timerData.startTime);
        setElapsedSeconds(elapsed);

        console.log(`⏱️ Resuming at ${elapsed} seconds elapsed`);
        return timerData;
      } else {
        const now = Date.now();
        const newTimerData = {
          startTime: now,
          initialized: new Date().toISOString(),
        };

        await AsyncStorage.setItem(
          SESSION_TIMER_KEY,
          JSON.stringify(newTimerData),
        );
        setSessionStartTime(now);
        setElapsedSeconds(0);

        console.log('⏱️ New timer initialized:', newTimerData);
        return newTimerData;
      }
    } catch (error) {
      console.error('Error with session timer:', error);
      const now = Date.now();
      setSessionStartTime(now);
      setElapsedSeconds(0);
      return {startTime: now};
    }
  }, [route.params?.startFresh]);

  // Initialize settings and timer
  useEffect(() => {
    const initializeSession = async () => {
      await loadSettings();
      await loadSessionTimer();
    };

    initializeSession();
  }, [loadSettings, loadSessionTimer]);

  // Fetch video details if YouTube videos exist
  useEffect(() => {
    if (content.videos && content.videos.length > 0) {
      fetchVideoDetails();
    }
  }, [content.videos]);

  // Timer tick effect - Update this useEffect
  useEffect(() => {
    if (!sessionStartTime) {
      return;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();

      const sessionElapsed = Math.floor((now - sessionStartTime) / 1000);
      setElapsedSeconds(sessionElapsed);

      const oneHourInSeconds = 60 * 60;
      if (
        sessionElapsed >= oneHourInSeconds &&
        !isSessionExpired &&
        !hasPlayedVoiceCommand
      ) {
        console.log('⏰ 1-hour session duration reached!');
        handleSessionExpiry();
      }

      // ✅ Only check trigger if NOT already triggered AND trigger not paused
      if (
        settings?.trigger_timestamp_seconds &&
        !isTriggerTimerPaused &&
        !hasTriggeredNavigation // This flag is now set from AsyncStorage
      ) {
        const triggerSeconds = settings.trigger_timestamp_seconds;
        const adjustedElapsed = Math.floor(
          (now - sessionStartTime - accumulatedPauseTime) / 1000,
        );

        if (adjustedElapsed >= triggerSeconds) {
          console.log(
            `⏰ Trigger timestamp reached (${triggerSeconds} seconds)!`,
          );
          handleTriggerTimestamp();
        }
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [
    sessionStartTime,
    settings?.trigger_timestamp_seconds,
    hasTriggeredNavigation,
    isSessionExpired,
    hasPlayedVoiceCommand,
    isTriggerTimerPaused,
    accumulatedPauseTime,
  ]);

  // Handle session expiry (1-hour duration)
  const handleSessionExpiry = useCallback(async () => {
    console.log('🎯 Handling 1-hour session expiry...');

    setIsSessionExpired(true);
    setHasPlayedVoiceCommand(true);

    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.error('Error pausing audio:', error);
    }

    if (isListening) {
      stopListening();
    }

    if (settings?.voice_command_text) {
      console.log('🔊 Playing voice command TTS:', settings.voice_command_text);

      setTimeout(async () => {
        try {
          await nightModeVoiceService.playSessionEndVoice(
            settings.voice_command_text,
          );
          console.log('✅ Voice command TTS played successfully');
        } catch (error) {
          console.error('❌ Error playing voice command TTS:', error);
        }
      }, 500);
    }
  }, [settings?.voice_command_text, isListening]);

  const handleTriggerTimestamp = useCallback(async () => {
    console.log('🎯 Handling trigger timestamp navigation...');

    setHasTriggeredNavigation(true);

    // ✅ Save trigger completion to AsyncStorage
    try {
      await AsyncStorage.setItem(TRIGGER_COMPLETED_KEY, 'true');
      console.log('✅ Trigger completion saved to AsyncStorage');
    } catch (error) {
      console.error('Error saving trigger completion:', error);
    }

    // ✅ DON'T stop or pause TrackPlayer - let it continue in background
    // ✅ DON'T reset or modify audio playback at all

    // Only stop voice listening
    if (isListening) {
      stopListening();
    }

    // Get current track info to pass to Plan Your Day screen
    let trackInfo = null;
    try {
      const currentTrackIndex = await TrackPlayer.getCurrentTrack();
      if (currentTrackIndex !== null) {
        trackInfo = await TrackPlayer.getTrack(currentTrackIndex);
        console.log('📊 Passing track info to PlanYourDay:', trackInfo?.title);
      }
    } catch (error) {
      console.error('Error getting current track:', error);
    }

    // Navigate with audio info
    navigateToPlanYourDay(trackInfo);
  }, [settings, isListening]);

  // Also update navigateToPlanYourDay to ensure it doesn't interfere with audio
  const navigateToPlanYourDay = (audioInfo = null) => {
    console.log('🚀 Navigating to PlanYourDayScreen...');
    console.log('📊 Audio info being passed:', audioInfo?.title);

    try {
      navigation.navigate('PlanYourDayScreen', {
        fromNightMode: true,
        sessionData: {
          startTime: sessionStartTime,
          elapsedSeconds: elapsedSeconds,
          triggerTimestamp: settings?.trigger_timestamp_seconds,
        },
        audioInfo: audioInfo, // Pass current playing audio info
        isVoiceCommand: isVoiceCommandTrack, // Flag if it's voice command audio
        // ✅ NEW: Flag to indicate audio should continue playing
        continueAudioPlayback: true,
      });
    } catch (error) {
      console.error('❌ Error navigating to PlanYourDayScreen:', error);
      Alert.alert('Navigation Error', 'Failed to open Plan Your Day screen.');
    }
  };

  // Background time handling
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundTimeRef.current = Date.now();
        console.log('📱 App went to background');
        if (isListening) {
          stopListening();
        }
      } else if (nextAppState === 'active') {
        if (backgroundTimeRef.current) {
          const backgroundDuration = Date.now() - backgroundTimeRef.current;
          console.log(
            `📱 App returned, was in background for ${Math.floor(
              backgroundDuration / 1000,
            )}s`,
          );

          if (sessionStartTime) {
            const newElapsed = Math.floor(
              (Date.now() - sessionStartTime) / 1000,
            );
            setElapsedSeconds(newElapsed);

            const oneHourInSeconds = 60 * 60;

            if (newElapsed >= oneHourInSeconds && !isSessionExpired) {
              handleSessionExpiry();
            }

            if (settings?.trigger_timestamp_seconds && !isTriggerTimerPaused) {
              const triggerSeconds = settings.trigger_timestamp_seconds;
              if (newElapsed >= triggerSeconds && !hasTriggeredNavigation) {
                handleTriggerTimestamp();
              }
            }
          }

          backgroundTimeRef.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [
    sessionStartTime,
    settings?.trigger_timestamp_seconds,
    hasTriggeredNavigation,
    handleTriggerTimestamp,
    isListening,
    isTriggerTimerPaused,
  ]);

  // Listen for navigation focus - Reset hasTriggeredNavigation when returning from Plan Your Day
  // Update the navigation focus effect
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSettings();

      // Check if we're returning from Plan Your Day with task created
      if (route.params?.taskCreated) {
        console.log(
          '✅ Returned from Plan Your Day - task created, resetting navigation flag',
        );

        // ✅ Mark trigger as completed in AsyncStorage
        AsyncStorage.setItem(TRIGGER_COMPLETED_KEY, 'true')
          .then(() => {
            console.log(
              '✅ Trigger completion saved - no more auto-navigation',
            );
          })
          .catch(error => {
            console.error('Error saving trigger completion:', error);
          });

        // Mark as triggered so timer doesn't trigger again
        setHasTriggeredNavigation(true);

        // Clear the param so it doesn't trigger again
        navigation.setParams({taskCreated: undefined});
      }

      if (sessionStartTime) {
        const now = Date.now();
        const elapsed = Math.floor((now - sessionStartTime) / 1000);
        const oneHourInSeconds = 60 * 60;

        if (elapsed >= oneHourInSeconds && !isSessionExpired) {
          handleSessionExpiry();
        }

        // ✅ Only check trigger if NOT already completed
        if (
          settings?.trigger_timestamp_seconds &&
          !isTriggerTimerPaused &&
          !hasTriggeredNavigation
        ) {
          const triggerSeconds = settings.trigger_timestamp_seconds;
          if (elapsed >= triggerSeconds) {
            handleTriggerTimestamp();
          }
        }
      }
    });

    return unsubscribe;
  }, [
    navigation,
    sessionStartTime,
    settings?.trigger_timestamp_seconds,
    isSessionExpired,
    hasTriggeredNavigation,
    handleSessionExpiry,
    handleTriggerTimestamp,
    loadSettings,
    isTriggerTimerPaused,
    route.params?.taskCreated,
  ]);

  useEffect(() => {
    let mounted = true;

    const enableLock = async () => {
      if (lockMode && YouTubeNightModeModule) {
        try {
          console.log('🔒 Enabling Night Mode Lock...');
          await YouTubeNightModeModule.enableKioskLock();
          if (mounted) {
            setIsLocked(true);
            isLockedRef.current = true;
            console.log('✅ Lock enabled successfully');
          }
        } catch (error) {
          console.error('❌ Error enabling lock:', error);
          Alert.alert(
            'Lock Error',
            'Could not enable lock mode. Please check permissions.',
            [{text: 'OK', onPress: () => navigation.goBack()}],
          );
        }
      }
    };

    enableLock();

    return () => {
      mounted = false;
      if (isLockedRef.current && YouTubeNightModeModule) {
        console.log('🔓 Disabling lock on unmount...');
        YouTubeNightModeModule.disableKioskLock()
          .then(() => console.log('✅ Lock disabled'))
          .catch(err => console.error('❌ Error disabling lock:', err));
      }
    };
  }, [lockMode, navigation]);

  useEffect(() => {
    if (!isLocked) return;

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        console.log('🚫 Back button blocked - screen is locked');
        return true;
      },
    );

    return () => backHandler.remove();
  }, [isLocked]);

  const fetchVideoDetails = async () => {
    try {
      if (!content.videos || content.videos.length === 0) return;

      const videoIds = content.videos.map(v => v.videoId).join(',');
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_KEY}`;

      const response = await fetch(detailsUrl);
      const data = await response.json();

      if (data.error) {
        console.error('YouTube API Error:', data.error);
        return;
      }

      if (data.items && data.items.length > 0) {
        const details = {};
        data.items.forEach(item => {
          details[item.id] = {
            title: item.snippet.title,
            description: item.snippet.description,
            channelName: item.snippet.channelTitle,
            thumbnailUrl:
              item.snippet.thumbnails.maxres?.url ||
              item.snippet.thumbnails.high?.url ||
              item.snippet.thumbnails.medium?.url,
            duration: formatDuration(item.contentDetails.duration),
          };
        });

        setVideoDetails(details);
      }
    } catch (err) {
      console.error('Error fetching video details:', err);
    }
  };

  const formatDuration = isoDuration => {
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');

    const formattedMinutes = hours
      ? `${parseInt(hours) * 60 + parseInt(minutes || 0)}`
      : minutes || '0';
    const formattedSeconds = (seconds || '0').padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
  };

  const getTimerData = () => ({
    sessionStartTime,
    voiceSettings: settings?.voice_command_text
      ? {
          enabled: true,
          text: settings.voice_command_text,
        }
      : null,
    isSessionExpired,
    triggerTimestamp: settings?.trigger_timestamp_seconds,
  });

  const handleVideoPress = useCallback(
    video => {
      if (isSessionExpired) {
        Alert.alert(
          'Session Ended',
          'Your 1-hour Night Mode session has ended.',
        );
        return;
      }

      if (isListening) {
        stopListening();
      }

      try {
        console.log('📹 Video pressed:', video.videoId);

        navigation.navigate('FullScreenVideoPlayer', {
          video: video,
          videoDetails: videoDetails[video.videoId] || {},
          timerData: getTimerData(),
        });
      } catch (error) {
        console.error('Error opening video:', error);
        Alert.alert('Error', 'Failed to open video player');
      }
    },
    [
      navigation,
      videoDetails,
      isSessionExpired,
      sessionStartTime,
      settings,
      isListening,
    ],
  );

  const handleAudioPress = useCallback(
    async audio => {
      if (isSessionExpired) {
        Alert.alert(
          'Session Ended',
          'Your 1-hour Night Mode session has ended.',
        );
        return;
      }

      if (isListening) {
        stopListening();
      }

      try {
        console.log('🎵 Audio pressed:', audio.id);

        if (!isPlayerInitialized) {
          console.log('Player not initialized, setting up...');
          await setupPlayer();
        }

        const audioUrl = audio.url || audio.uri;

        if (!audioUrl) {
          throw new Error('Audio URL is missing');
        }

        await TrackPlayer.reset();

        const track = {
          id: audio.id,
          url: audioUrl,
          title: audio.title || audio.name || 'Audio',
          artist: 'Night Mode Audio',
          artwork:
            audio.thumbnail ||
            'https://via.placeholder.com/300/1DB954/FFFFFF?text=🎵',
          isVoiceCommand: false, // Regular audio track
        };

        console.log('Adding track:', track);
        await TrackPlayer.add(track);
        await TrackPlayer.play();

        setCurrentPlayingAudio(audio.id);
        setIsVoiceCommandTrack(false); // Not a voice command

        navigation.navigate('FullScreenAudioPlayer', {
          audio: audio,
          timerData: getTimerData(),
        });

        console.log('✅ Audio playing and navigated to player');
      } catch (error) {
        console.error('❌ Error playing audio:', error);
        Alert.alert(
          'Audio Error',
          `Failed to play audio: ${error.message}\n\nPlease check if the audio URL is valid.`,
        );
      }
    },
    [
      isPlayerInitialized,
      navigation,
      isSessionExpired, // ✅ Changed from hasTriggeredNavigation
      setupPlayer,
      sessionStartTime,
      settings,
      isListening,
    ],
  );

  // Update handleExitPress to also clear trigger completion
  const handleExitPress = () => {
    if (isListening) {
      stopListening();
    }

    Alert.alert(
      'Exit Night Mode?',
      'Are you sure you want to exit Night Mode?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔓 User requested exit...');

              await TrackPlayer.reset();

              // ✅ Clear all session data
              await AsyncStorage.removeItem(SESSION_TIMER_KEY);
              await AsyncStorage.removeItem(VOICE_COMMAND_PLAYED_KEY);
              await AsyncStorage.removeItem(TRIGGER_COMPLETED_KEY);
              console.log('✅ All session data cleared');

              if (YouTubeNightModeModule) {
                await YouTubeNightModeModule.disableKioskLock();
                isLockedRef.current = false;
                console.log('✅ Lock disabled successfully');
              }
              setIsLocked(false);

              // ✅ Navigate to SettingsScreen instead of goBack
              navigation.navigate('BottomTab', {
                screen: 'Settings',
              });
            } catch (error) {
              console.error('❌ Error disabling lock:', error);
              Alert.alert('Error', 'Failed to exit. Please try again.');
            }
          },
        },
      ],
      {cancelable: true},
    );
  };

  const formatTimeDisplay = seconds => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    const oneHourInSeconds = 60 * 60;
    const remaining = Math.max(0, oneHourInSeconds - elapsedSeconds);
    return remaining;
  };

  const getTriggerRemainingTime = () => {
    if (!settings?.trigger_timestamp_seconds) return null;

    const triggerSeconds = settings.trigger_timestamp_seconds;

    if (isTriggerTimerPaused) {
      const remaining = Math.max(0, triggerSeconds - pausedTriggerSeconds);
      return remaining;
    }

    const currentElapsed = Math.floor(
      (Date.now() - sessionStartTime - accumulatedPauseTime) / 1000,
    );

    const remaining = Math.max(0, triggerSeconds - currentElapsed);
    return remaining;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.Primary || '#FF0000'}
        />
        <Headers title="Night Mode" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Primary || '#FF0000'} />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.Primary || '#FF0000'}
        />
        <Headers title="Night Mode" />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={WP(15)} color="#606060" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  const videos = content.videos.map(v => ({...v, type: 'video'}));
  const audios = content.audios.map(a => ({...a, type: 'audio'}));

  const showVoiceCommandPlayer =
    isPlayingVoiceCommand && !hasPlayedInitialVoiceCommand;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.Primary || '#FF0000'}
      />

      {isLocked ? (
        <View style={styles.lockedHeader}>
          <View style={styles.lockedTitleContainer}>
            <MaterialIcons
              name="lock"
              size={WP(6)}
              color="#FFFFFF"
              style={styles.lockIcon}
            />
            <View style={styles.headerTextContainer}>
              <Text style={styles.lockedTitle}>Night Mode</Text>
              <Text style={styles.timerText}>
                {isSessionExpired
                  ? 'Session Ended'
                  : `Session: ${formatTimeDisplay(getRemainingTime())}`}
              </Text>
              {settings?.trigger_timestamp_seconds &&
                !hasTriggeredNavigation && (
                  <View style={styles.triggerTimerRow}>
                    <Text
                      style={[
                        styles.triggerTimerText,
                        isTriggerTimerPaused && styles.triggerTimerTextPaused,
                      ]}>
                      Plan Your Day in:{' '}
                      {formatTimeDisplay(getTriggerRemainingTime() || 0)}
                      {isTriggerTimerPaused && ' (Paused)'}
                    </Text>
                  </View>
                )}
            </View>
          </View>
          <TouchableOpacity style={styles.exitButton} onPress={handleExitPress}>
            <MaterialIcons name="close" size={WP(6)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <Headers title="Night Mode" />
      )}

      {voiceEnabled && !showVoiceCommandPlayer && (
        <TouchableOpacity
          style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
          onPress={isListening ? stopListening : startListening}
          activeOpacity={0.8}>
          <MaterialIcons
            name={isListening ? 'mic' : 'mic-none'}
            size={WP(7)}
            color={colors.White}
          />
          {isListening && (
            <View style={styles.listeningIndicator}>
              <View style={styles.pulse} />
            </View>
          )}
        </TouchableOpacity>
      )}

      {voiceEnabled && !showVoiceCommandPlayer && (
        <TouchableOpacity
          style={styles.helpButton}
          onPress={showVoiceCommandsHelp}
          activeOpacity={0.8}>
          <MaterialIcons
            name="help-outline"
            size={WP(5)}
            color={colors.Primary}
          />
        </TouchableOpacity>
      )}

      {showVoiceToast && (
        <View style={styles.voiceToast}>
          <Text style={styles.voiceToastText}>{voiceToastMessage}</Text>
        </View>
      )}

      {isListening && !showVoiceCommandPlayer && (
        <View style={styles.listeningCard}>
          <MaterialIcons name="mic" size={WP(6)} color={colors.Primary} />
          <Text style={styles.listeningText}>Listening...</Text>
          {recognizedText !== '' && (
            <Text style={styles.recognizedText}>"{recognizedText}"</Text>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {showVoiceCommandPlayer && (
          <View style={styles.voiceCommandPlayerContainer}>
            <View style={styles.voiceCommandPlayerCard}>
              <View style={styles.audioWaveContainer}>
                <MaterialIcons
                  name="graphic-eq"
                  size={WP(25)}
                  color={colors.Primary}
                />
              </View>

              <Text style={styles.voiceCommandTitle}>
                Welcome to Night Mode
              </Text>
              <Text style={styles.voiceCommandSubtitle}>
                Playing introduction audio...
              </Text>

              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width:
                          progress.duration > 0
                            ? `${
                                (progress.position / progress.duration) * 100
                              }%`
                            : '0%',
                      },
                    ]}
                  />
                </View>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>
                    {formatVoiceCommandTime(progress.position)}
                  </Text>
                  <Text style={styles.timeText}>
                    {formatVoiceCommandTime(progress.duration)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.voiceCommandPlayButton}
                onPress={toggleVoiceCommandPlayPause}
                activeOpacity={0.8}>
                <MaterialIcons
                  name={
                    playbackState.state === State.Playing
                      ? 'pause'
                      : 'play-arrow'
                  }
                  size={WP(10)}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <Text style={styles.voiceCommandInfo}>
                Videos and audio will be available after this introduction
              </Text>
            </View>
          </View>
        )}

        {!showVoiceCommandPlayer && videos.length > 0 && (
          <View style={styles.videoSection}>
            {videos.map(video => (
              <VideoPlayer
                key={`video-${video.id}`}
                video={video}
                videoDetails={videoDetails}
                onPlayPress={() => handleVideoPress(video)}
              />
            ))}
          </View>
        )}

        {!showVoiceCommandPlayer && audios.length > 0 && (
          <View style={styles.audioSection}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionTitle}>Audio Tracks</Text>
              <Text style={styles.sectionSubtitle}>
                {audios.length} track{audios.length !== 1 ? 's' : ''}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.audioScrollContent}
              style={styles.audioScrollView}>
              {audios.map(audio => (
                <AudioPlayer
                  key={`audio-${audio.id}`}
                  audio={audio}
                  isPlaying={currentPlayingAudio === audio.id}
                  playbackState={playbackState}
                  onPlayPress={() => handleAudioPress(audio)}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Styles remain the same as original (excluding removed expiredContainer, moonIconContainer, expiredTitle, expiredMessage, planYourDayButton, planYourDayButtonText styles)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.Primary || '#FF0000',
    paddingHorizontal: WP(4),
    paddingVertical: HP(2),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  lockedTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lockIcon: {
    marginRight: WP(2),
  },
  headerTextContainer: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
  },
  timerText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: HP(0.2),
  },
  triggerTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: HP(0.3),
  },
  triggerTimerText: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFD700',
    flex: 1,
  },
  triggerTimerTextPaused: {
    color: '#FFA500',
  },
  pauseButton: {
    marginRight: WP(2),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: WP(5),
    width: WP(8),
    height: WP(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  exitButton: {
    padding: WP(2),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: WP(2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingTop: HP(1),
    paddingBottom: HP(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: HP(2),
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Medium',
    color: '#606060',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(8),
  },
  errorText: {
    marginTop: HP(2),
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Medium',
    color: '#606060',
    textAlign: 'center',
  },
  voiceCommandPlayerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(6),
    paddingVertical: HP(5),
    minHeight: HP(70),
  },
  voiceCommandPlayerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: WP(6),
    padding: WP(8),
    width: '100%',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.Primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  audioWaveContainer: {
    marginBottom: HP(3),
    backgroundColor: `${colors.Primary}15`,
    borderRadius: WP(20),
    padding: WP(8),
  },
  voiceCommandTitle: {
    fontSize: FS(2.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    marginBottom: HP(1),
    textAlign: 'center',
  },
  voiceCommandSubtitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
    marginBottom: HP(4),
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: HP(4),
  },
  progressBar: {
    width: '100%',
    height: HP(0.8),
    backgroundColor: '#E0E0E0',
    borderRadius: HP(0.4),
    overflow: 'hidden',
    marginBottom: HP(1),
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.Primary,
    borderRadius: HP(0.4),
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  timeText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Medium',
    color: '#606060',
  },
  voiceCommandPlayButton: {
    width: WP(20),
    height: WP(20),
    borderRadius: WP(10),
    backgroundColor: colors.Primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.Primary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: HP(3),
  },
  voiceCommandInfo: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#909090',
    textAlign: 'center',
    lineHeight: FS(2),
  },
  videoSection: {
    marginBottom: HP(2),
  },
  audioSection: {
    marginTop: HP(1),
    marginBottom: HP(2),
    overflow: 'visible',
  },
  sectionHeaderContainer: {
    paddingHorizontal: WP(4),
    marginBottom: HP(1.5),
  },
  sectionTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: '#0F0F0F',
    marginBottom: HP(0.3),
  },
  sectionSubtitle: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
  },
  audioScrollView: {
    paddingLeft: WP(4),
    overflow: 'visible',
  },
  audioScrollContent: {
    paddingRight: WP(4),
  },
  voiceButton: {
    position: 'absolute',
    bottom: HP(3),
    right: WP(4),
    width: WP(16),
    height: WP(16),
    borderRadius: WP(8),
    backgroundColor: colors.Primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.Primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 1000,
  },
  voiceButtonActive: {
    backgroundColor: '#E53935',
  },
  listeningIndicator: {
    position: 'absolute',
    width: WP(16),
    height: WP(16),
    borderRadius: WP(8),
  },
  pulse: {
    width: '100%',
    height: '100%',
    borderRadius: WP(8),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  helpButton: {
    position: 'absolute',
    bottom: HP(3),
    left: WP(4),
    width: WP(12),
    height: WP(12),
    borderRadius: WP(6),
    backgroundColor: colors.White,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 1000,
  },
  listeningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.White,
    marginHorizontal: WP(4),
    marginTop: HP(2),
    marginBottom: HP(1),
    padding: WP(4),
    borderRadius: WP(3),
    elevation: 4,
    shadowColor: colors.Primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  listeningText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    marginLeft: WP(3),
    flex: 1,
  },
  recognizedText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
    fontStyle: 'italic',
    marginLeft: WP(2),
  },
  voiceToast: {
    position: 'absolute',
    top: HP(12),
    left: WP(4),
    right: WP(4),
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(4),
    borderRadius: WP(3),
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 2000,
  },
  voiceToastText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
    textAlign: 'center',
  },
});

export default YouTubeVideosScreen;

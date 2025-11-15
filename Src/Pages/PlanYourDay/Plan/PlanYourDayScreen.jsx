import React, {useState, useEffect, useRef} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Animated,
  Dimensions,
  BackHandler,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import Voice from '@react-native-voice/voice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, {
  State,
  usePlaybackState,
  useProgress,
  Event,
} from 'react-native-track-player';
import Headers from '../../../Components/Headers';
import {colors, Icons} from '../../../Helper/Contants';
import {HP, WP, FS} from '../../../utils/dimentions';
import CustomToast from '../../../Components/CustomToast';
import {planYourDayService} from '../../../services/api/planYourDayService';
import {useAuth} from '../../../contexts/AuthContext';

const VOICE_COMMAND_COMPLETED_KEY = '@voice_command_completed_plan_your_day';

const PlanYourDayScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  const selectedCategory = route.params?.selectedCategory;
  const evaluationType = route.params?.evaluationType;
  const type = route.params?.type || 'Plan';
  const audioInfo = route.params?.audioInfo;
  const fromNightMode = route.params?.fromNightMode;
  const sessionData = route.params?.sessionData;
  const taskCreated = route.params?.taskCreated; // NEW: Check if task was created

  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedHours, setSelectedHours] = useState(null);
  const [showHourSelection, setShowHourSelection] = useState(false);
  const [offCanvasVisible, setOffCanvasVisible] = useState(false);
  const [slideAnim] = useState(
    new Animated.Value(Dimensions.get('window').width * 0.85),
  );
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const [createdTasks, setCreatedTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Audio Player States
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const playbackState = usePlaybackState();
  const progress = useProgress();

  // Voice Command Completion Tracking
  const [voiceCommandCompleted, setVoiceCommandCompleted] = useState(false);
  const hasNavigatedBack = useRef(false);

  // Voice Recognition States
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showVoiceToast, setShowVoiceToast] = useState(false);
  const [voiceToastMessage, setVoiceToastMessage] = useState('');
  const voiceToastTimeoutRef = useRef(null);

  const hourOptions = Array.from({length: 24}, (_, i) => i + 1);

  // Setup Voice Recognition
  useEffect(() => {
    setupVoiceRecognition();

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      if (voiceToastTimeoutRef.current) {
        clearTimeout(voiceToastTimeoutRef.current);
      }
    };
  }, []);

  // 🎯 Check and resume audio when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const checkAndResumeAudio = async () => {
        if (!fromNightMode) {
          console.log('ℹ️ Not from Night Mode - skipping audio check');
          return;
        }

        console.log('🔍 Checking audio state on focus...');
        console.log('📊 From Night Mode:', fromNightMode);
        console.log('📊 Task Created:', taskCreated);

        try {
          const state = await TrackPlayer.getState();
          console.log('🎵 Current playback state:', state);

          const trackIndex = await TrackPlayer.getCurrentTrack();
          console.log('🎵 Current track index:', trackIndex);

          if (trackIndex !== null) {
            const track = await TrackPlayer.getTrack(trackIndex);
            console.log('🎵 Current track:', track?.title);
            console.log('🎵 Track isVoiceCommand:', track?.isVoiceCommand);

            // Check if it's a voice command track
            if (track && track.isVoiceCommand === true) {
              console.log('✅ Voice command track detected!');
              setCurrentTrack(track);
              setShowMiniPlayer(true);

              // ✅ Handle different states appropriately
              if (state === State.Paused) {
                console.log('▶️ Resuming paused voice command audio...');
                await TrackPlayer.play();
                showVoiceToastMessage('▶️ Continuing audio playback');
              } else if (state === State.Playing) {
                console.log('✅ Audio already playing - showing mini player');
              } else if (state === State.Buffering || state === State.Loading) {
                console.log('⏳ Audio buffering/loading - showing mini player');
              } else if (state === State.Stopped || state === State.Ended) {
                console.log('⏹️ Audio has ended - will trigger navigation');
                setShowMiniPlayer(false);
                // Navigation will be handled by the playback state listener
              } else {
                console.log('ℹ️ Unknown audio state:', state);
              }
            } else {
              console.log('ℹ️ Not a voice command track');
              setShowMiniPlayer(false);
            }
          } else {
            console.log('ℹ️ No track currently loaded');
            setShowMiniPlayer(false);
          }
        } catch (error) {
          console.error('❌ Error checking audio state:', error);
        }
      };

      checkAndResumeAudio();

      return () => {
        if (isListening) {
          stopListening();
        }
      };
    }, [fromNightMode, taskCreated, isListening]),
  );

  // 🎯 Listen for voice command audio completion
  useEffect(() => {
    const onPlaybackState = async ({state}) => {
      console.log('📻 Playback state changed:', state);

      if (!fromNightMode) {
        return;
      }

      // Check if audio stopped or ended
      if (state === State.Stopped || state === State.Ended) {
        try {
          const trackIndex = await TrackPlayer.getCurrentTrack();

          if (trackIndex !== null) {
            const track = await TrackPlayer.getTrack(trackIndex);
            console.log('🔍 Track details on stop/end:', {
              title: track?.title,
              isVoiceCommand: track?.isVoiceCommand,
              fromNightMode: fromNightMode,
            });

            if (
              track &&
              track.isVoiceCommand === true &&
              fromNightMode &&
              !hasNavigatedBack.current
            ) {
              console.log('✅ Voice command audio naturally completed!');

              // Save completion status to AsyncStorage
              await AsyncStorage.setItem(VOICE_COMMAND_COMPLETED_KEY, 'true');
              console.log('✅ Voice command completion saved to AsyncStorage');

              setVoiceCommandCompleted(true);
              setShowMiniPlayer(false);
              setCurrentTrack(null);

              // Auto-navigate back to Night Mode after audio completes
              console.log('⏳ Waiting 1 second before auto-navigation...');
              setTimeout(() => {
                handleNavigateBackToNightMode();
              }, 1000); // Give user 1 second to see completion
            } else {
              console.log(
                'ℹ️ Audio stopped but conditions not met for auto-navigation:',
                {
                  isVoiceCommand: track?.isVoiceCommand,
                  fromNightMode: fromNightMode,
                  alreadyNavigated: hasNavigatedBack.current,
                },
              );
            }
          } else {
            console.log('ℹ️ No track index available');
          }
        } catch (error) {
          console.error('Error checking track completion:', error);
        }
      }
    };

    const playbackStateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      onPlaybackState,
    );

    return () => {
      playbackStateListener.remove();
    };
  }, [fromNightMode]);

  useFocusEffect(
    React.useCallback(() => {
      const checkVoiceCommandCompletion = async () => {
        // ✅ Only check if coming from Night Mode
        if (!fromNightMode) {
          console.log('ℹ️ Not from Night Mode, skipping completion check');
          return;
        }

        // ✅ Only check if we haven't already navigated
        if (hasNavigatedBack.current) {
          console.log('ℹ️ Already navigated back, skipping completion check');
          return;
        }

        try {
          const completed = await AsyncStorage.getItem(
            VOICE_COMMAND_COMPLETED_KEY,
          );

          console.log('🔍 Checking voice command completion flag:', completed);

          // ✅ This should only trigger if audio completed while screen was in background
          if (completed === 'true') {
            // Double-check: Is audio actually stopped?
            try {
              const state = await TrackPlayer.getState();
              console.log('🔍 Current audio state:', state);

              if (state === State.Stopped || state === State.Ended) {
                console.log(
                  '✅ Audio completed while screen was in background - auto-navigating',
                );
                handleNavigateBackToNightMode();
              } else {
                console.log(
                  '⚠️ Completion flag set but audio still playing - clearing flag',
                );
                await AsyncStorage.removeItem(VOICE_COMMAND_COMPLETED_KEY);
              }
            } catch (error) {
              console.error('Error checking audio state:', error);
            }
          }
        } catch (error) {
          console.error('Error checking voice command completion:', error);
        }
      };

      checkVoiceCommandCompletion();
    }, [fromNightMode]),
  );

  // 🎯 Handle navigation back to Night Mode
  const handleNavigateBackToNightMode = async () => {
    if (hasNavigatedBack.current) {
      console.log('⚠️ Already navigated back, skipping...');
      return;
    }

    hasNavigatedBack.current = true;

    console.log('🚀 Navigating back to Night Mode...');

    // Stop voice listening if active
    if (isListening) {
      await stopListening();
    }

    // Clear the completion flag
    try {
      await AsyncStorage.removeItem(VOICE_COMMAND_COMPLETED_KEY);
      console.log('✅ Voice command completion flag cleared');
    } catch (error) {
      console.error('Error clearing completion flag:', error);
    }

    // Show toast message
    showVoiceToastMessage(
      '🌙 Now for the relaxation time, watch audio and video',
      3000,
    );

    // Navigate back to Night Mode after a short delay
    setTimeout(() => {
      navigation.navigate('YouTubeVideosScreen', {
        returnedFromPlanYourDay: true,
        taskCreated: taskCreated || false,
      });
    }, 500);
  };

  const setupVoiceRecognition = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message:
              'Plan Your Day needs microphone access for voice commands.',
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

    setTimeout(() => {
      stopListening();
    }, 100);
  };

  const onSpeechError = error => {
    setIsListening(false);

    if (error.error && error.error.code) {
      const errorCode = error.error.code;

      if (errorCode === '5') {
        return;
      } else if (errorCode === '7') {
        console.log('No speech detected');
        showVoiceToastMessage('No speech detected. Try again.');
      } else if (errorCode === '6') {
        console.log('No internet connection');
        showVoiceToastMessage('No internet connection');
      } else {
        console.log('Speech recognition error code:', errorCode);
      }
    }
  };

  const startListening = async () => {
    if (!voiceEnabled) {
      showToast(
        'Voice Commands Unavailable. Please enable microphone permissions in settings.',
        'error',
      );
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

  const processVoiceCommand = async text => {
    try {
      // Audio Control Commands
      if (text.includes('play audio') || text.includes('play music')) {
        if (currentTrack) {
          await TrackPlayer.play();
          showVoiceToastMessage('▶️ Playing audio');
        } else {
          showVoiceToastMessage('No audio available');
        }
      } else if (text.includes('pause audio') || text.includes('pause music')) {
        await TrackPlayer.pause();
        showVoiceToastMessage('⏸️ Audio paused');
      } else if (text.includes('stop audio') || text.includes('stop music')) {
        await TrackPlayer.stop();
        setShowMiniPlayer(false);
        showVoiceToastMessage('⏹️ Audio stopped');
      }
      // Target Hours Command
      else if (
        text.includes('target hours') ||
        text.includes('target hour') ||
        text.includes('hours') ||
        text.includes('set hours')
      ) {
        handleTargetHoursPress();
        showVoiceToastMessage('⏰ Opening Target Hours');
      }
      // Target Tasks Command
      else if (
        text.includes('target tasks') ||
        text.includes('target task') ||
        text.includes('tasks') ||
        text.includes('set tasks')
      ) {
        handleTaskOptionSelect();
        showVoiceToastMessage('✅ Opening Target Tasks');
      }
      // Menu Command
      else if (
        text.includes('menu') ||
        text.includes('open menu') ||
        text.includes('show menu') ||
        text.includes('sidebar')
      ) {
        openSidebar();
        showVoiceToastMessage('📋 Opening Menu');
      }
      // Help Command
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
    showToast(
      '🎤 Voice Commands:\n\n' +
        '🎵 Audio:\n' +
        '• "Play/Pause/Stop Audio" - Control playback\n\n' +
        '⏰ "Target Hours" - Open Target Hours selection\n' +
        '✅ "Target Tasks" - Open Target Tasks selection\n' +
        '📋 "Menu" - Open sidebar menu\n' +
        '❓ "Help" - Show this help',
      'success',
    );
  };

  // 🎯 Custom back press handler - DISABLED for Night Mode flow
  const handleCustomBackPress = async () => {
    console.log('📱 PlanYourDayScreen: Custom back handler called');

    // 🚫 BLOCK back button if coming from Night Mode
    if (fromNightMode) {
      console.log('🚫 Back button blocked - Night Mode flow active');
      showVoiceToastMessage('⏳ Please wait for audio to complete');
      return;
    }

    if (isListening) {
      await stopListening();
    }

    // Check if we came from plan creation
    const fromPlanCreation = route.params?.fromPlanCreation || false;

    console.log('📱 PlanYourDayScreen: fromPlanCreation:', fromPlanCreation);

    if (fromPlanCreation) {
      // If coming from plan creation, navigate to Home tab
      console.log('📱 PlanYourDayScreen: Navigating to Home');
      navigation.reset({
        index: 0,
        routes: [{name: 'BottomTab', params: {screen: 'Home'}}],
      });
    } else {
      // If no screen to go back to, navigate to Home
      console.log('📱 PlanYourDayScreen: No back stack, navigating to Home');
      navigation.reset({
        index: 0,
        routes: [{name: 'BottomTab', params: {screen: 'Home'}}],
      });
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        console.log('📱 PlanYourDayScreen: Hardware back button pressed');
        handleCustomBackPress();
        return true;
      },
    );

    return () => backHandler.remove();
  }, [isListening, fromNightMode]);

  const loadUserPlans = async () => {
    if (!user) {
      console.log('No user found, skipping plan loading');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading Plan Your Day entries for user:', user.id);

      // ✅ GET TOMORROW'S DATE instead of today
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];

      console.log('Filtering plans for tomorrow:', tomorrowDate);

      const plans = await planYourDayService.getPlanYourDayEntries(user.id);
      console.log('Total plans loaded:', plans.length);

      // ✅ FILTER FOR TOMORROW'S PLANS
      const tomorrowPlans = plans.filter(
        plan => plan.start_date === tomorrowDate,
      );
      console.log('Plans for tomorrow:', tomorrowPlans.length);

      // ✅ UPDATE THE TRANSFORMATION to use tomorrowPlans
      const transformedPlans = tomorrowPlans.map(plan => ({
        id: plan.id,
        title: plan.title,
        type: 'Plan Your Day',
        category: plan.category || 'Work',
        targetValue: getPlanTargetValue(plan),
        status: getStatus(
          plan.actual_hours,
          plan.actual_tasks,
          plan.target_hours,
          plan.target_tasks,
        ),
        evaluationType: plan.evaluation_type,
        created_at: plan.created_at,
        start_date: plan.start_date,
      }));

      transformedPlans.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );

      console.log("Transformed tomorrow's plans:", transformedPlans.length);
      setCreatedTasks(transformedPlans);
    } catch (error) {
      console.error('Error loading Plan Your Day entries:', error);
      showToast('Failed to load Plan Your Day entries');
    } finally {
      setLoading(false);
    }
  };

  const getPlanTargetValue = plan => {
    if (plan.plan_type === 'hours' && plan.target_hours) {
      return `${plan.target_hours} hour${plan.target_hours !== 1 ? 's' : ''}`;
    } else if (plan.plan_type === 'tasks' && plan.target_tasks) {
      return `${plan.target_tasks} task${plan.target_tasks !== 1 ? 's' : ''}`;
    } else if (plan.evaluation_type === 'timerTracker') {
      return 'Timer Tracker';
    } else if (plan.evaluation_type === 'yesNo') {
      return 'Yes/No Task';
    } else if (plan.evaluation_type === 'timer') {
      return 'Focus Session';
    } else if (plan.evaluation_type === 'checklist') {
      return 'Checklist Task';
    }
    return 'Plan Your Day';
  };

  const getStatus = (actualHours, actualTasks, targetHours, targetTasks) => {
    if (targetHours && actualHours >= targetHours) {
      return 'Completed';
    } else if (targetTasks && actualTasks >= targetTasks) {
      return 'Completed';
    } else if (actualHours > 0 || actualTasks > 0) {
      return 'In Progress';
    }
    return 'Active';
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserPlans();
    }, [user]),
  );

  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const handleTargetHoursPress = () => {
    setSelectedOption('hours');
    setShowHourSelection(true);
    if (toastVisible) {
      hideToast();
    }
  };

  const handleHourSelect = hour => {
    setSelectedHours(hour);
  };

  const handleSaveHours = () => {
    if (!selectedHours) {
      showToast('Please select hours to continue');
      return;
    }

    const navigationData = {
      selectedCategory,
      evaluationType,
      type: 'Plan',
      planType: 'hours',
      targetHours: selectedHours,
    };

    showToast(
      `Target Hours saved: ${selectedHours} hour${
        selectedHours > 1 ? 's' : ''
      }`,
      'success',
    );
    setShowHourSelection(false);
  };

  const handleCancelHours = () => {
    setShowHourSelection(false);
    setSelectedOption(null);
    setSelectedHours(null);
  };

  const handleTaskOptionSelect = () => {
    const navigationData = {
      selectedCategory,
      evaluationType,
      type: 'Plan',
      planType: 'tasks',
      // Pass Night Mode params if coming from Night Mode
      fromNightMode: fromNightMode,
      audioInfo: audioInfo,
      sessionData: sessionData,
    };

    navigation.navigate('CategorySelection', navigationData);
  };

  const openSidebar = () => {
    setOffCanvasVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width * 0.85,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setOffCanvasVisible(false);
    });
  };

  // Audio Player Controls
  const handlePlayPause = async () => {
    try {
      const state = await TrackPlayer.getState();

      if (state === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render Mini Audio Player
  const renderMiniPlayer = () => {
    if (!showMiniPlayer || !currentTrack) return null;

    const isPlaying = playbackState.state === State.Playing;
    const isBuffering = playbackState.state === State.Buffering;

    return (
      <View style={styles.miniPlayerContainer}>
        {/* Album Art */}
        <View style={styles.miniPlayerArtwork}>
          <Ionicons name="moon-outline" size={WP(8)} color={colors.Primary} />
        </View>

        {/* Track Info */}
        <View style={styles.miniPlayerInfo}>
          <Text style={styles.miniPlayerTitle} numberOfLines={1}>
            {currentTrack.title || 'Audio Track'}
          </Text>
          <Text style={styles.miniPlayerArtist} numberOfLines={1}>
            {currentTrack.artist || 'Night Mode Audio'}
          </Text>
          <View style={styles.miniPlayerProgress}>
            <View style={styles.miniProgressBar}>
              <View
                style={[
                  styles.miniProgressFill,
                  {
                    width:
                      progress.duration > 0
                        ? `${(progress.position / progress.duration) * 100}%`
                        : '0%',
                  },
                ]}
              />
            </View>
            <Text style={styles.miniPlayerTime}>
              {formatTime(progress.position)} / {formatTime(progress.duration)}
            </Text>
          </View>
        </View>

        {/* Controls - Only Play/Pause */}
        <View style={styles.miniPlayerControls}>
          <TouchableOpacity
            onPress={handlePlayPause}
            style={styles.miniPlayerButton}
            activeOpacity={0.7}>
            <MaterialIcons
              name={
                isBuffering
                  ? 'hourglass-empty'
                  : isPlaying
                  ? 'pause'
                  : 'play-arrow'
              }
              size={WP(8)}
              color={colors.Primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const planOptions = [
    {
      id: 'hours',
      title: 'Target Hours',
      subtitle: selectedHours
        ? `Selected: ${selectedHours} hour${
            selectedHours > 1 ? 's' : ''
          } per day`
        : 'Set daily goals based on time spent on productive activities.',
      icon: Icons.Timer || Icons.Task,
    },
    {
      id: 'tasks',
      title: 'Target Tasks',
      subtitle: 'Set daily goals based on number of tasks completed.',
      icon: Icons.Task,
    },
  ];

  const renderPlanOption = option => (
    <TouchableOpacity
      key={option.id}
      style={[
        styles.optionCard,
        selectedOption === option.id && styles.optionCardSelected,
        selectedHours && option.id === 'hours' && styles.optionCardWithHours,
      ]}
      onPress={() => {
        if (option.id === 'tasks') {
          handleTaskOptionSelect();
        } else {
          handleTargetHoursPress();
        }
      }}
      activeOpacity={0.8}>
      <View style={styles.optionContent}>
        <View style={styles.optionIconContainer}>
          {option.id === 'hours' ? (
            <MaterialIcons
              name="schedule"
              size={WP(7)}
              color={colors.Primary}
            />
          ) : (
            <MaterialIcons
              name="task-alt"
              size={WP(7)}
              color={colors.Primary}
            />
          )}
        </View>

        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>{option.title}</Text>
          <Text
            style={[
              styles.optionSubtitle,
              selectedHours &&
                option.id === 'hours' &&
                styles.optionSubtitleSelected,
            ]}>
            {option.subtitle}
          </Text>
        </View>

        <View style={styles.arrowContainer}>
          <MaterialIcons
            name="keyboard-arrow-right"
            size={WP(6)}
            color="#666666"
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHourOption = hour => (
    <TouchableOpacity
      key={hour}
      style={[
        styles.hourOption,
        selectedHours === hour && styles.hourOptionSelected,
      ]}
      onPress={() => handleHourSelect(hour)}
      activeOpacity={0.7}>
      <Text
        style={[
          styles.hourOptionText,
          selectedHours === hour && styles.hourOptionTextSelected,
        ]}>
        {hour}
      </Text>
    </TouchableOpacity>
  );

  const renderHourSelectionModal = () => (
    <Modal
      visible={showHourSelection}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancelHours}>
      <View style={styles.hourSelectionOverlay}>
        <View style={styles.hourSelectionContainer}>
          <View style={styles.hourSelectionHeader}>
            <Text style={styles.hourSelectionTitle}>Select Target Hours</Text>
            <Text style={styles.hourSelectionSubtitle}>
              Choose how many hours per day you want to spend on this activity
            </Text>
          </View>

          <ScrollView
            style={styles.hourSelectionScroll}
            showsVerticalScrollIndicator={false}>
            <View style={styles.hourGrid}>
              {hourOptions.map(hour => renderHourOption(hour))}
            </View>
          </ScrollView>

          <View style={styles.hourSelectionActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelHours}
              activeOpacity={0.8}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                !selectedHours && styles.saveButtonDisabled,
              ]}
              onPress={handleSaveHours}
              activeOpacity={0.8}
              disabled={!selectedHours}>
              <Text
                style={[
                  styles.saveButtonText,
                  !selectedHours && styles.saveButtonTextDisabled,
                ]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const getTaskIcon = type => {
    switch (type) {
      case 'Habit':
        return 'psychology';
      case 'Recurring':
      case 'Recurring Task':
        return 'repeat';
      case 'Plan Your Day':
        return 'schedule';
      default:
        return 'task-alt';
    }
  };

  const renderTaskItem = task => (
    <TouchableOpacity
      key={`${task.source}-${task.id}`}
      style={styles.sidebarTaskItem}
      activeOpacity={0.7}>
      <View style={styles.sidebarTaskHeader}>
        <View style={styles.sidebarTaskIcon}>
          <MaterialIcons
            name={getTaskIcon(task.type)}
            size={WP(5)}
            color={colors.Primary}
          />
        </View>
        <View style={styles.sidebarTaskContent}>
          <Text style={styles.sidebarTaskTitle} numberOfLines={1}>
            {task.title}
          </Text>
          <Text style={styles.sidebarTaskCategory}>{task.category}</Text>
          <Text style={styles.sidebarTaskTarget}>{task.targetValue}</Text>
        </View>
        <View
          style={[
            styles.sidebarTaskStatus,
            task.status === 'Active'
              ? styles.sidebarTaskStatusActive
              : task.status === 'In Progress'
              ? styles.sidebarTaskStatusProgress
              : styles.sidebarTaskStatusCompleted,
          ]}>
          <Text
            style={[
              styles.sidebarTaskStatusText,
              task.status === 'Active'
                ? styles.sidebarTaskStatusActiveText
                : task.status === 'In Progress'
                ? styles.sidebarTaskStatusProgressText
                : styles.sidebarTaskStatusCompletedText,
            ]}>
            {task.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderOffCanvas = () => (
    <Modal
      visible={offCanvasVisible}
      transparent={true}
      animationType="none"
      onRequestClose={closeSidebar}>
      <View style={styles.offCanvasOverlay}>
        <TouchableOpacity
          style={styles.offCanvasBackdrop}
          onPress={closeSidebar}
          activeOpacity={1}
        />

        <Animated.View
          style={[
            styles.offCanvasSidebar,
            {transform: [{translateX: slideAnim}]},
          ]}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>My Plan Your Day Tasks</Text>
            <TouchableOpacity
              onPress={closeSidebar}
              style={styles.closeSidebarButton}>
              <MaterialIcons name="close" size={WP(6)} color="#666666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.sidebarContent}
            showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <MaterialIcons
                  name="hourglass-empty"
                  size={WP(8)}
                  color="#CCCCCC"
                />
                <Text style={styles.loadingText}>
                  Loading Plan Your Day tasks...
                </Text>
              </View>
            ) : createdTasks.length > 0 ? (
              <>
                <Text style={styles.taskCountText}>
                  {createdTasks.length} Plan Your Day entr
                  {createdTasks.length !== 1 ? 'ies' : 'y'} found
                </Text>
                {createdTasks.map(task => renderTaskItem(task))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="schedule" size={WP(12)} color="#CCCCCC" />
                <Text style={styles.emptyStateText}>
                  No Plan Your Day tasks yet
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Start by creating your first Plan Your Day task!
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
      <View style={styles.headerWrapper}>
        {/* 🎯 HIDE back button if coming from Night Mode */}
        <Headers
          title="Plan Your Day"
          onBackPress={fromNightMode ? null : handleCustomBackPress}
          showBackButton={!fromNightMode}>
          <TouchableOpacity onPress={openSidebar}>
            <MaterialIcons name="menu" size={WP(6)} color="#333333" />
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Mini Audio Player - Shown at top when audio is playing */}
      {renderMiniPlayer()}

      {/* Voice Control Button - Floating */}
      {voiceEnabled && (
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

      {/* Voice Help Button */}
      {voiceEnabled && (
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

      {/* Voice Toast */}
      {showVoiceToast && (
        <View style={styles.voiceToast}>
          <Text style={styles.voiceToastText}>{voiceToastMessage}</Text>
        </View>
      )}

      {/* Voice Recognition Status */}
      {isListening && (
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
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.videoContainer}>
            <View style={styles.videoPlaceholder}>
              <MaterialIcons
                name="play-circle-fill"
                size={WP(12)}
                color={colors.Primary}
              />
              <Text style={styles.videoText}>
                Watch: How to Plan Your Day Effectively
              </Text>
              <Text style={styles.videoSubtext}>2:30 min</Text>
            </View>
          </View>

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>
              Choose Your Planning Style
            </Text>
            <Text style={styles.instructionsText}>
              Select how you'd like to plan and track your daily productivity.
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            {planOptions.map(option => renderPlanOption(option))}
          </View>
        </View>
      </ScrollView>

      {renderHourSelectionModal()}
      {renderOffCanvas()}

      <CustomToast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={3000}
        onHide={hideToast}
        position="bottom"
        showIcon={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.White},
  headerWrapper: {marginTop: HP(2), paddingBottom: HP(0.625)},
  scrollContainer: {flex: 1},
  content: {paddingHorizontal: WP(4.533), paddingTop: HP(1)},

  // Mini Audio Player Styles
  miniPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: WP(4),
    marginTop: HP(1),
    marginBottom: HP(1),
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(3),
    borderRadius: WP(3),
    elevation: 4,
    shadowColor: colors.Primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.Primary,
  },
  miniPlayerArtwork: {
    width: WP(14),
    height: WP(14),
    borderRadius: WP(2),
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  miniPlayerArtworkImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  miniPlayerArtworkPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
  },
  miniPlayerInfo: {
    flex: 1,
    marginLeft: WP(3),
    marginRight: WP(2),
  },
  miniPlayerTitle: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    marginBottom: HP(0.2),
  },
  miniPlayerArtist: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginBottom: HP(0.5),
  },
  miniPlayerProgress: {
    width: '100%',
  },
  miniProgressBar: {
    width: '100%',
    height: HP(0.4),
    backgroundColor: '#E0E0E0',
    borderRadius: HP(0.2),
    overflow: 'hidden',
    marginBottom: HP(0.3),
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: colors.Primary,
    borderRadius: HP(0.2),
  },
  miniPlayerTime: {
    fontSize: FS(1),
    fontFamily: 'OpenSans-Medium',
    color: '#999999',
  },
  miniPlayerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniPlayerButton: {
    width: WP(10),
    height: WP(10),
    borderRadius: WP(5),
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: WP(2),
  },

  videoContainer: {marginBottom: HP(3)},
  videoPlaceholder: {
    backgroundColor: '#F8F9FA',
    borderRadius: WP(3.2),
    paddingVertical: HP(3),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8EAED',
    borderStyle: 'dashed',
  },
  videoText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    marginTop: HP(1),
    textAlign: 'center',
  },
  videoSubtext: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(0.5),
  },
  instructionsContainer: {marginBottom: HP(2.5)},
  instructionsTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    marginBottom: HP(0.8),
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: HP(2.8),
  },
  optionsContainer: {marginBottom: HP(2.5)},
  optionCard: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    padding: WP(4),
    marginBottom: HP(2),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  optionCardSelected: {borderColor: colors.Primary, elevation: 5},
  optionCardWithHours: {
    backgroundColor: '#F0F7FF',
    borderColor: colors.Primary,
    borderWidth: 2,
  },
  optionContent: {flexDirection: 'row', alignItems: 'center'},
  optionIconContainer: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(6),
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(3),
  },
  optionTextContainer: {flex: 1, paddingRight: WP(2)},
  optionTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    marginBottom: HP(0.5),
  },
  optionSubtitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    lineHeight: HP(2),
  },
  optionSubtitleSelected: {
    color: colors.Primary,
    fontFamily: 'OpenSans-SemiBold',
  },
  arrowContainer: {padding: WP(1)},
  hourSelectionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(4),
  },
  hourSelectionContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    width: '100%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: HP(1)},
    shadowOpacity: 0.3,
    shadowRadius: WP(4),
  },
  hourSelectionHeader: {
    paddingHorizontal: WP(5),
    paddingTop: HP(3),
    paddingBottom: HP(2),
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  hourSelectionTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: HP(0.5),
  },
  hourSelectionSubtitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: HP(2),
  },
  hourSelectionScroll: {maxHeight: HP(35), paddingHorizontal: WP(5)},
  hourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: HP(2),
  },
  hourOption: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: WP(2),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HP(1),
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  hourOptionSelected: {
    backgroundColor: colors.Primary,
    borderColor: colors.Primary,
  },
  hourOptionText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
  },
  hourOptionTextSelected: {color: colors.White},
  hourSelectionActions: {
    flexDirection: 'row',
    paddingHorizontal: WP(5),
    paddingVertical: HP(2.5),
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: HP(1.5),
    borderRadius: WP(2.5),
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(2),
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  cancelButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: '#666666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: HP(1.5),
    borderRadius: WP(2.5),
    backgroundColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: WP(2),
    elevation: 2,
    shadowColor: colors.Primary,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.3,
    shadowRadius: WP(1.5),
  },
  saveButtonDisabled: {backgroundColor: '#CCCCCC', elevation: 0},
  saveButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  saveButtonTextDisabled: {color: '#999999'},
  offCanvasOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  offCanvasBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  offCanvasSidebar: {
    width: '85%',
    height: '100%',
    backgroundColor: colors.White,
    elevation: 20,
    shadowColor: '#000000',
    shadowOffset: {width: -WP(1), height: 0},
    shadowOpacity: 0.25,
    shadowRadius: WP(4),
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(4.5),
    paddingVertical: HP(2.5),
    backgroundColor: colors.White,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  sidebarTitle: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
  },
  closeSidebarButton: {padding: WP(1)},
  sidebarContent: {flex: 1, paddingHorizontal: WP(4.5), paddingTop: HP(2)},
  taskCountText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
    marginBottom: HP(1.5),
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(6),
  },
  loadingText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(1),
    textAlign: 'center',
  },
  sidebarTaskItem: {
    backgroundColor: colors.White,
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(2),
    marginBottom: HP(1),
    borderRadius: WP(2),
    borderLeftWidth: 3,
    borderLeftColor: colors.Primary,
    elevation: 1,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: HP(0.125)},
    shadowOpacity: 0.05,
    shadowRadius: WP(1),
  },
  sidebarTaskHeader: {flexDirection: 'row', alignItems: 'center'},
  sidebarTaskIcon: {
    width: WP(8),
    height: WP(8),
    borderRadius: WP(4),
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(3),
  },
  sidebarTaskContent: {flex: 1},
  sidebarTaskTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    marginBottom: HP(0.2),
  },
  sidebarTaskCategory: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginBottom: HP(0.2),
  },
  sidebarTaskTarget: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
  sidebarTaskStatus: {
    paddingHorizontal: WP(2),
    paddingVertical: HP(0.3),
    borderRadius: WP(1),
  },
  sidebarTaskStatusActive: {backgroundColor: '#E8F5E8'},
  sidebarTaskStatusProgress: {backgroundColor: '#FFF8E1'},
  sidebarTaskStatusCompleted: {backgroundColor: '#FFF2E8'},
  sidebarTaskStatusText: {fontSize: FS(1.1), fontFamily: 'OpenSans-Bold'},
  sidebarTaskStatusActiveText: {color: '#4CAF50'},
  sidebarTaskStatusProgressText: {color: '#FF9800'},
  sidebarTaskStatusCompletedText: {color: '#FF9800'},
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(6),
  },
  emptyStateText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: '#666666',
    marginTop: HP(1.5),
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#999999',
    marginTop: HP(0.5),
    textAlign: 'center',
  },
  // Voice Recognition Styles
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

export default PlanYourDayScreen;

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

const PlanYourDayScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  const selectedCategory = route.params?.selectedCategory;
  const evaluationType = route.params?.evaluationType;
  const type = route.params?.type || 'Plan';
  const audioInfo = route.params?.audioInfo; // Audio info from Night Mode
  const fromNightMode = route.params?.fromNightMode;

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

  // NEW: Voice command audio completion tracking
  const [isVoiceCommandPlaying, setIsVoiceCommandPlaying] = useState(false);
  const [hasVoiceCommandCompleted, setHasVoiceCommandCompleted] =
    useState(true); // ✅ Changed default to true
  const [voiceCommandStarted, setVoiceCommandStarted] = useState(false); // ✅ Add new state to track if audio ever started

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

  // Check for VOICE COMMAND audio from Night Mode ONLY
  useEffect(() => {
    const checkAudioPlayback = async () => {
      try {
        const state = await TrackPlayer.getState();

        if (
          state === State.Playing ||
          state === State.Paused ||
          state === State.Buffering
        ) {
          const trackIndex = await TrackPlayer.getCurrentTrack();

          if (trackIndex !== null) {
            const track = await TrackPlayer.getTrack(trackIndex);

            // ONLY show mini player if it's a voice command track
            if (track && track.isVoiceCommand === true) {
              console.log(
                '📻 Voice command audio detected from Night Mode:',
                track.title,
              );
              setCurrentTrack(track);
              setShowMiniPlayer(true);
              setIsVoiceCommandPlaying(state === State.Playing);
              setVoiceCommandStarted(true); // ✅ Mark that voice command started
              setHasVoiceCommandCompleted(false);
            } else {
              console.log('📻 Regular audio detected, not showing mini player');
              setShowMiniPlayer(false);
            }
          }
        }
      } catch (error) {
        console.log('No audio currently playing');
      }
    };

    if (fromNightMode) {
      checkAudioPlayback();
    }
  }, [fromNightMode]);

  // Listen for TrackPlayer events - Track voice command completion
  useEffect(() => {
    const onTrackChange = async () => {
      try {
        const trackIndex = await TrackPlayer.getCurrentTrack();
        if (trackIndex !== null) {
          const track = await TrackPlayer.getTrack(trackIndex);

          // ONLY show mini player for voice command tracks
          if (track && track.isVoiceCommand === true) {
            console.log('📻 Voice command track changed:', track.title);
            setCurrentTrack(track);
            setShowMiniPlayer(true);
            setVoiceCommandStarted(true); // ✅ Mark that voice command started
            setHasVoiceCommandCompleted(false);
          } else {
            // Hide mini player for regular audio tracks
            console.log('📻 Regular audio track, hiding mini player');
            setShowMiniPlayer(false);
            setCurrentTrack(null);
          }
        }
      } catch (error) {
        console.log('Error getting track:', error);
      }
    };

    const onPlaybackState = async ({state}) => {
      if (currentTrack && currentTrack.isVoiceCommand) {
        if (state === State.Playing) {
          setIsVoiceCommandPlaying(true);
          setVoiceCommandStarted(true); // ✅ Mark that voice command started
          setHasVoiceCommandCompleted(false); // Reset when playing
        } else if (state === State.Paused) {
          setIsVoiceCommandPlaying(false);
          // ✅ Keep voiceCommandStarted as true - don't enable actions!
          // Don't set hasVoiceCommandCompleted to true here!
        } else if (state === State.Stopped || state === State.Ended) {
          console.log(
            '✅ Voice command audio completed - enabling all actions',
          );
          setShowMiniPlayer(false);
          setCurrentTrack(null);
          setIsVoiceCommandPlaying(false);
          setVoiceCommandStarted(false); // ✅ Reset started flag
          setHasVoiceCommandCompleted(true); // Only set to true when completely finished
        }
      }

      if (state === State.Stopped || state === State.None) {
        setShowMiniPlayer(false);
        setCurrentTrack(null);
      }
    };

    // Subscribe to events
    const trackChangeListener = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      onTrackChange,
    );

    const playbackStateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      onPlaybackState,
    );

    return () => {
      trackChangeListener.remove();
      playbackStateListener.remove();
    };
  }, [currentTrack]);

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
    // Disable voice recognition if voice command is still playing
    if (voiceCommandStarted && !hasVoiceCommandCompleted) {
      showVoiceToastMessage('Please wait for the introduction to complete');
      return;
    }

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

  const handleCustomBackPress = async () => {
    console.log('📱 PlanYourDayScreen: Custom back handler called');

    // Disable back button if voice command is still playing
    if (voiceCommandStarted && !hasVoiceCommandCompleted) {
      showVoiceToastMessage('Please wait for the introduction to complete');
      return true; // Prevent back action
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
      // Normal back navigation
      console.log('📱 PlanYourDayScreen: Going back normally');
      navigation.goBack();
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        console.log('📱 PlanYourDayScreen: Hardware back button pressed');

        // Disable back button if voice command is still playing
        if (voiceCommandStarted && !hasVoiceCommandCompleted) {
          showVoiceToastMessage('Please wait for the introduction to complete');
          return true; // Block the back action
        }

        handleCustomBackPress();
        return true; // Prevent default back action
      },
    );

    return () => backHandler.remove();
  }, [isListening, hasVoiceCommandCompleted, isVoiceCommandPlaying]); // Add dependencies

  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 PlanYourDayScreen: Screen FOCUSED');

      return () => {
        console.log('📱 PlanYourDayScreen: Screen BLURRED (losing focus)');

        if (isListening) {
          stopListening();
        }
      };
    }, [isListening]),
  );

  const loadUserPlans = async () => {
    if (!user) {
      console.log('No user found, skipping plan loading');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading Plan Your Day entries for user:', user.id);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      console.log('Filtering plans for today:', today);

      const plans = await planYourDayService.getPlanYourDayEntries(user.id);
      console.log('Total plans loaded:', plans.length);

      // Filter plans to show only today's tasks (based on start_date)
      const todayPlans = plans.filter(plan => plan.start_date === today);
      console.log('Plans for today:', todayPlans.length);

      const transformedPlans = todayPlans.map(plan => ({
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

      console.log("Transformed today's plans:", transformedPlans.length);
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
    // Disable if voice command is still playing
    if (voiceCommandStarted && !hasVoiceCommandCompleted) {
      showVoiceToastMessage('Please wait for the introduction to complete');
      return;
    }

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
    // Disable if voice command is still playing
    if (voiceCommandStarted && !hasVoiceCommandCompleted) {
      showVoiceToastMessage('Please wait for the introduction to complete');
      return;
    }

    const navigationData = {
      selectedCategory,
      evaluationType,
      type: 'Plan',
      planType: 'tasks',
      fromNightMode: fromNightMode, // Pass along Night Mode flag
    };

    navigation.navigate('CategorySelection', navigationData);
  };

  const openSidebar = () => {
    // Disable if voice command is still playing
    if (voiceCommandStarted && !hasVoiceCommandCompleted) {
      showVoiceToastMessage('Please wait for the introduction to complete');
      return;
    }

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

  const renderPlanOption = option => {
    // Disable options if voice command is still playing
    const isDisabled = !hasVoiceCommandCompleted && isVoiceCommandPlaying;

    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.optionCard,
          selectedOption === option.id && styles.optionCardSelected,
          selectedHours && option.id === 'hours' && styles.optionCardWithHours,
          isDisabled && styles.optionCardDisabled,
        ]}
        onPress={() => {
          if (isDisabled) {
            showVoiceToastMessage(
              'Please wait for the introduction to complete',
            );
            return;
          }
          if (option.id === 'tasks') {
            handleTaskOptionSelect();
          } else {
            handleTargetHoursPress();
          }
        }}
        activeOpacity={isDisabled ? 1 : 0.8}
        disabled={isDisabled}>
        <View style={styles.optionContent}>
          <View style={styles.optionIconContainer}>
            {option.id === 'hours' ? (
              <MaterialIcons
                name="schedule"
                size={WP(7)}
                color={isDisabled ? '#CCCCCC' : colors.Primary}
              />
            ) : (
              <MaterialIcons
                name="task-alt"
                size={WP(7)}
                color={isDisabled ? '#CCCCCC' : colors.Primary}
              />
            )}
          </View>

          <View style={styles.optionTextContainer}>
            <Text
              style={[
                styles.optionTitle,
                isDisabled && styles.optionTitleDisabled,
              ]}>
              {option.title}
            </Text>
            <Text
              style={[
                styles.optionSubtitle,
                selectedHours &&
                  option.id === 'hours' &&
                  styles.optionSubtitleSelected,
                isDisabled && styles.optionSubtitleDisabled,
              ]}>
              {option.subtitle}
            </Text>
          </View>

          <View style={styles.arrowContainer}>
            <MaterialIcons
              name="keyboard-arrow-right"
              size={WP(6)}
              color={isDisabled ? '#CCCCCC' : '#666666'}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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

  // Check if screen should be disabled (voice command playing OR started but not completed)
  const isScreenDisabled = voiceCommandStarted && !hasVoiceCommandCompleted; // ✅ Changed logic

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
      <View style={styles.headerWrapper}>
        <Headers
          title="Plan Your Day"
          onBackPress={isScreenDisabled ? null : handleCustomBackPress}
          disabled={isScreenDisabled}>
          <TouchableOpacity onPress={openSidebar} disabled={isScreenDisabled}>
            <MaterialIcons
              name="menu"
              size={WP(6)}
              color={isScreenDisabled ? '#CCCCCC' : '#333333'}
            />
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Mini Audio Player - Shown at top when audio is playing */}
      {renderMiniPlayer()}

      {/* Voice Control Button - Floating */}
      {voiceEnabled && (
        <TouchableOpacity
          style={[
            styles.voiceButton,
            isListening && styles.voiceButtonActive,
            isScreenDisabled && styles.voiceButtonDisabled,
          ]}
          onPress={isListening ? stopListening : startListening}
          activeOpacity={0.8}
          disabled={isScreenDisabled}>
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
          style={[
            styles.helpButton,
            isScreenDisabled && styles.helpButtonDisabled,
          ]}
          onPress={showVoiceCommandsHelp}
          activeOpacity={0.8}
          disabled={isScreenDisabled}>
          <MaterialIcons
            name="help-outline"
            size={WP(5)}
            color={isScreenDisabled ? '#CCCCCC' : colors.Primary}
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
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isScreenDisabled}>
        <View style={styles.content}>
          <View style={styles.videoContainer}>
            <View style={styles.videoPlaceholder}>
              <MaterialIcons
                name="play-circle-fill"
                size={WP(12)}
                color={isScreenDisabled ? '#CCCCCC' : colors.Primary}
              />
              <Text
                style={[
                  styles.videoText,
                  isScreenDisabled && styles.videoTextDisabled,
                ]}>
                Watch: How to Plan Your Day Effectively
              </Text>
              <Text
                style={[
                  styles.videoSubtext,
                  isScreenDisabled && styles.videoSubtextDisabled,
                ]}>
                2:30 min
              </Text>
            </View>
          </View>

          <View style={styles.instructionsContainer}>
            <Text
              style={[
                styles.instructionsTitle,
                isScreenDisabled && styles.instructionsTitleDisabled,
              ]}>
              Choose Your Planning Style
            </Text>
            <Text
              style={[
                styles.instructionsText,
                isScreenDisabled && styles.instructionsTextDisabled,
              ]}>
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
  videoTextDisabled: {
    color: '#CCCCCC',
  },
  videoSubtext: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(0.5),
  },
  videoSubtextDisabled: {
    color: '#CCCCCC',
  },
  instructionsContainer: {marginBottom: HP(2.5)},
  instructionsTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    marginBottom: HP(0.8),
    textAlign: 'center',
  },
  instructionsTitleDisabled: {
    color: '#CCCCCC',
  },
  instructionsText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: HP(2.8),
  },
  instructionsTextDisabled: {
    color: '#CCCCCC',
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
  optionCardDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
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
  optionTitleDisabled: {
    color: '#CCCCCC',
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
  optionSubtitleDisabled: {
    color: '#CCCCCC',
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
  voiceButtonDisabled: {
    backgroundColor: '#CCCCCC',
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
  helpButtonDisabled: {
    backgroundColor: '#F5F5F5',
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

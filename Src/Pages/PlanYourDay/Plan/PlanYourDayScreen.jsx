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
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import Headers from '../../../Components/Headers';
import {colors, Icons} from '../../../Helper/Contants';
import {HP, WP, FS} from '../../../utils/dimentions';
import CustomToast from '../../../Components/CustomToast';
import {planYourDayService} from '../../../services/api/planYourDayService';
import {useAuth} from '../../../contexts/AuthContext';
import {useMusic} from '../../../contexts/MusicContext';

const PlanYourDayScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();
  const {startPlanMusic, forceStopPlanMusic, isPlanFlowActive, canStartMusic} =
    useMusic();

  // CRITICAL FIX: Track if music was started by THIS screen
  const musicStartedByThisScreenRef = useRef(false);
  const isUnmountingRef = useRef(false);

  const selectedCategory = route.params?.selectedCategory;
  const evaluationType = route.params?.evaluationType;
  const type = route.params?.type || 'Plan';

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

  const hourOptions = Array.from({length: 24}, (_, i) => i + 1);

  // CRITICAL FIX 1: Custom back handler that stops music BEFORE navigation
  // CRITICAL FIX 1: Custom back handler that stops music BEFORE navigation
const handleCustomBackPress = async () => {
  console.log('🎵 PlanYourDayScreen: Custom back handler called');
  console.log('🎵 PlanYourDayScreen: Current music state - isPlanFlowActive:', isPlanFlowActive, 'musicStartedByThisScreen:', musicStartedByThisScreenRef.current);
  
  isUnmountingRef.current = true;
  
  // ALWAYS stop music unconditionally - don't check state
  console.log('🎵 PlanYourDayScreen: Forcing music stop on back press');
  try {
    await forceStopPlanMusic();
    musicStartedByThisScreenRef.current = false;
    console.log('🎵 PlanYourDayScreen: Music stopped successfully');
    
    // Small delay to ensure music is fully stopped
    await new Promise(resolve => setTimeout(resolve, 150));
  } catch (error) {
    console.error('🎵 PlanYourDayScreen: Error stopping music:', error);
  }
  
  // Navigate to BottomTab instead of goBack
  console.log('🎵 PlanYourDayScreen: Navigating to BottomTab');
  navigation.reset({
    index: 0,
    routes: [
      {
        name: 'BottomTab',
        params: {
          screen: 'Home', // or whatever your home tab is called
        },
      },
    ],
  });
};

  // CRITICAL FIX 2: Hardware back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        console.log('🎵 PlanYourDayScreen: Hardware back button pressed');

        // Handle back press with our custom handler
        handleCustomBackPress();

        // Return true to prevent default behavior (we handle it ourselves)
        return true;
      },
    );

    return () => backHandler.remove();
  }, [isPlanFlowActive]);

  // CRITICAL FIX 3: Focus effect with proper cleanup
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎵 PlanYourDayScreen: Screen FOCUSED');
      isUnmountingRef.current = false;

      // Start music when screen is focused
      const initializeMusic = async () => {
        try {
          if (canStartMusic && !isPlanFlowActive) {
            console.log('🎵 PlanYourDayScreen: Starting music on focus');
            const started = await startPlanMusic();
            if (started) {
              musicStartedByThisScreenRef.current = true;
              console.log('🎵 PlanYourDayScreen: Music started successfully');
            }
          } else {
            console.log(
              '🎵 PlanYourDayScreen: Music already playing or cannot start',
            );
          }
        } catch (error) {
          console.error('🎵 PlanYourDayScreen: Error starting music:', error);
        }
      };

      initializeMusic();

      // Cleanup function - called when screen loses focus
      return () => {
        console.log('🎵 PlanYourDayScreen: Screen BLURRED (losing focus)');
        isUnmountingRef.current = true;

        // Stop music SYNCHRONOUSLY when leaving
        const stopMusic = async () => {
          if (musicStartedByThisScreenRef.current || isPlanFlowActive) {
            console.log('🎵 PlanYourDayScreen: Stopping music on blur');
            try {
              await forceStopPlanMusic();
              musicStartedByThisScreenRef.current = false;
              console.log('🎵 PlanYourDayScreen: Music stopped on blur');
            } catch (error) {
              console.error(
                '🎵 PlanYourDayScreen: Error stopping music on blur:',
                error,
              );
            }
          }
        };

        // Execute immediately (don't wait)
        stopMusic();
      };
    }, [canStartMusic, isPlanFlowActive, startPlanMusic, forceStopPlanMusic]),
  );

  const loadUserPlans = async () => {
    if (!user) {
      console.log('No user found, skipping plan loading');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading Plan Your Day entries for user:', user.id);

      const plans = await planYourDayService.getPlanYourDayEntries(user.id);
      console.log('Loaded plans:', plans.length);

      const transformedPlans = plans.map(plan => ({
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
      }));

      transformedPlans.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );

      console.log('Transformed plans:', transformedPlans.length);
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
        <Headers title="Plan Your Day" onBackPress={handleCustomBackPress}>
          <TouchableOpacity onPress={openSidebar}>
            <MaterialIcons name="menu" size={WP(6)} color="#333333" />
          </TouchableOpacity>
        </Headers>
      </View>

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
  nextText: {
    fontSize: FS(1.8),
    color: '#1A73E8',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  scrollContainer: {flex: 1},
  content: {paddingHorizontal: WP(4.533), paddingTop: HP(1)},
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
});

export default PlanYourDayScreen;

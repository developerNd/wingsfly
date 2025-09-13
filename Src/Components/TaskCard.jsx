import React, {useState} from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors, Icons} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';
import {useNavigation} from '@react-navigation/native';
import DeleteTaskModal from './DeleteTaskModal';

const TaskCard = ({
  item,
  checkboxState,
  onToggle,
  onTaskCompleted,
  onTaskDelete,
  onTaskUpdate,
  selectedDate,
  taskCompletions,
}) => {
  const navigation = useNavigation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Helper function to get image source from category name
  const getImageSource = categoryName => {
    if (!categoryName) return Icons.Work;

    const categoryImageMap = {
      'Work & Career': Icons.Work,
      'Work and Career': Icons.Work,
      'Health & Wellness': Icons.Health,
      'Health and Wellness': Icons.Health,
      'Love & Relationship': Icons.Love,
      'Love and Relationship': Icons.Love,
      'Money & Finances': Icons.Money,
      'Money and Finances': Icons.Money,
      'Spirtuality & Faith': Icons.Faith,
      'Spirtuality and Faith': Icons.Faith,
      'Personal & Growth': Icons.Growth,
      'Personal and Growth': Icons.Growth,
      'Other Goals': Icons.Other,
      Other: Icons.Other,
      'Create a category': Icons.Create,
    };

    return categoryImageMap[categoryName] || Icons.Work;
  };

  const getFlagColor = () => {
    if (item.tags && item.tags.some(tag => tag.toLowerCase() === 'important')) {
      return colors.Primary;
    }
    return '#AF0000';
  };

  const getTimeTextColor = () => {
    const colorMap = {
      1: '#0E4C92',
      2: '#800080',
      3: '#C1A300',
      4: '#228B22',
      5: '#F37A29',
      6: '#006D5B',
    };
    return colorMap[item.id] || '#2E5BFF';
  };

  const getTimeIconColor = () => {
    const colorMap = {
      1: '#0E4C92',
      2: '#800080',
      3: '#C1A300',
      4: '#228B22',
      5: '#F37A29',
      6: '#006D5B',
    };
    return colorMap[item.id] || '#1A4BFF';
  };

  const getInitialIconInsideRadio = () => {
    switch (item.type) {
      case 'timer':
        return <Image source={Icons.Time} style={styles.timerIcon} />;
      case 'numeric':
        return (
          <View style={styles.staticCircle}>
            <Image source={Icons.Numeric} style={styles.iconInsideCircle} />
          </View>
        );
      case 'yesNo':
        return <View style={styles.staticCircle}></View>;
      case 'checklist':
        return (
          <View style={styles.staticCircle}>
            <Image source={Icons.Check} style={styles.iconInsideCircle} />
          </View>
        );
      case 'task':
      default:
        return (
          <View style={styles.staticCircle}>
            <Image source={Icons.Task} style={styles.iconInsideCircle} />
          </View>
        );
    }
  };

  // Function to get in-progress icon with same background colors as initial icons
  const getInProgressIcon = () => {
    return (
      <View style={styles.inProgressCircle}>
        <Image source={Icons.More} style={styles.moreIcon} />
      </View>
    );
  };

  // FIXED: Enhanced function to determine if task is in progress based on completion data
  const isTaskInProgress = () => {
    const completion = taskCompletions?.[item.id];

    if (!completion) return false;

    // If task is already completed, don't show in-progress
    if (completion.is_completed === true) return false;

    console.log(
      'TaskCard - Checking progress for task:',
      item.id,
      'completion:',
      completion,
    );

    switch (item.type) {
      case 'timer':
        // FIXED: Timer is in progress if:
        // 1. Timer value exists and has progress data
        // 2. Task is not marked as completed

        // Handle both old format (simple number) and new format (object)
        if (
          typeof completion.timer_value === 'object' &&
          completion.timer_value !== null
        ) {
          // New format - check for any actual progress
          const timerData = completion.timer_value;
          const totalSeconds =
            timerData.totalSeconds || timerData.actualCompletedTime || 0;
          const currentTime = timerData.currentTime || 0;
          const completedPomodoros = timerData.completedPomodoros || 0;
          const completedBreaks = timerData.completedBreaks || 0;
          const currentSessionIndex = timerData.currentSessionIndex || 0;

          // Show in-progress if:
          // - Has completed time OR current session time > 0
          // - OR has completed any pomodoros/breaks
          // - OR has progressed through sessions
          // - AND not fully completed
          const hasProgress =
            totalSeconds > 0 ||
            currentTime > 0 ||
            completedPomodoros > 0 ||
            completedBreaks > 0 ||
            currentSessionIndex > 0;
          const isNotFullyCompleted = !timerData.isFullyCompleted;

          console.log('TaskCard - Timer progress check:', {
            hasProgress,
            isNotFullyCompleted,
            totalSeconds,
            currentTime,
            completedPomodoros,
            completedBreaks,
            currentSessionIndex,
            isFullyCompleted: timerData.isFullyCompleted,
            finalResult:
              hasProgress && isNotFullyCompleted && !completion.is_completed,
          });

          return hasProgress && isNotFullyCompleted && !completion.is_completed;
        } else {
          // Old format - simple number check for backward compatibility
          const timerValueSeconds = completion.timer_value || 0;
          const timerValueMinutes = completion.timer_minutes || 0;
          const totalTimerValue = timerValueSeconds || timerValueMinutes * 60;

          console.log('TaskCard - Timer old format check:', {
            timerValueSeconds,
            timerValueMinutes,
            totalTimerValue,
            result: totalTimerValue > 0 && !completion.is_completed,
          });

          return totalTimerValue > 0 && !completion.is_completed;
        }

      case 'numeric':
        // In progress if numeric_value > 0 but not completed
        return completion.numeric_value > 0 && !completion.is_completed;

      case 'checklist':
        // In progress if some items are completed but not all
        if (
          completion.checklist_items &&
          completion.checklist_items.length > 0
        ) {
          const completedItems = completion.checklist_items.filter(
            checklistItem => checklistItem.completed,
          );
          return (
            completedItems.length > 0 &&
            completedItems.length < completion.checklist_items.length
          );
        }
        return false;

      case 'yesNo':
        // yesNo tasks are either completed or not, no in-progress state
        return false;

      case 'task':
      default:
        // Regular tasks don't have in-progress states
        return false;
    }
  };

  const handleCheckboxPress = () => {
    if (item.type === 'checklist') {
      console.log(
        'TaskCard - Navigating to TaskEvaluation with selectedDate:',
        selectedDate,
      );
      navigation.navigate('TaskEvaluation', {
        taskData: item,
        taskId: item.id,
        selectedDate: selectedDate,
      });
      return;
    }

    // UPDATED: Handle timer tasks - navigate to PomodoroTimerScreen if timer task
    if (item.type === 'timer') {
      console.log(
        'TaskCard - Navigating to PomodoroTimerScreen with selectedDate:',
        selectedDate,
      );
      navigation.navigate('PomoScreen', {
        task: item,
        taskId: item.id,
        selectedDate: selectedDate,
      });
      return;
    }

    onToggle();
  };

  // Handle task card regular press - no action (removed delete functionality)
  const handleTaskPress = () => {
    // You can add navigation or other functionality here if needed
    // For now, this does nothing as delete is moved to long press
  };

  // Handle long press for delete confirmation modal
  const handleLongPress = () => {
    setShowDeleteModal(true);
  };

  // Handle delete confirmation from modal
  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    if (onTaskDelete) {
      onTaskDelete(item.id);
    }
  };

  // Handle delete cancellation
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  const renderCheckbox = () => {
    // Check for completion first (highest priority)
    if (checkboxState === 4) {
      return (
        <View style={styles.completedContainer}>
          <View style={styles.checkedBox}>
            <Icon name="check" size={WP(3.2)} color="#00754B" />
          </View>
        </View>
      );
    }

    // Check for in-progress state based on actual data
    if (isTaskInProgress()) {
      console.log('TaskCard - Showing in-progress icon for task:', item.id);
      return getInProgressIcon();
    }

    // For loading states (2, 3) that are not in-progress, show initial icon
    if (checkboxState === 2 || checkboxState === 3) {
      return getInitialIconInsideRadio();
    }

    // For uncompleted state (1), show original type-specific icon
    return getInitialIconInsideRadio();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.taskContainer}
        onPress={handleTaskPress}
        onLongPress={handleLongPress}
        delayLongPress={800} // Increased to 800ms for better UX
        activeOpacity={0.8}>
        <Image
          source={getImageSource(item.category)}
          style={styles.taskImage}
        />
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{item.title}</Text>

          <View style={styles.taskMeta}>
            <View
              style={[
                styles.timeBox,
                {backgroundColor: item.timeColor || '#0E4C92'},
              ]}>
              <Icon
                name="access-time"
                size={WP(2.1)}
                color={getTimeIconColor()}
                marginRight={WP(0.5)}
              />
              <Icon
                name="hourglass-top"
                size={WP(2.1)}
                color={getTimeIconColor()}
                marginRight={WP(0.3)}
              />
              <Text style={[styles.timeText, {color: getTimeTextColor()}]}>
                {item.time}
              </Text>
            </View>

            {item.progress && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{item.progress}</Text>
              </View>
            )}

            <View style={styles.tagsContainer}>
              <View style={styles.combinedTagContainer}>
                {item.tags &&
                  item.tags.map((tag, index) => (
                    <Text key={index} style={styles.tagText}>
                      {tag}
                      {index < item.tags.length - 1 && (
                        <Text style={styles.separator}> | </Text>
                      )}
                    </Text>
                  ))}
                {item.hasFlag && (
                  <View style={styles.flagContainer}>
                    <Icon name="flag" size={WP(3.2)} color={getFlagColor()} />
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.bottomBorder} />
        </View>

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={handleCheckboxPress}>
          {renderCheckbox()}
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Custom Delete Modal */}
      <DeleteTaskModal
        visible={showDeleteModal}
        taskTitle={item.title}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

const styles = StyleSheet.create({
  taskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: WP(1.3),
    marginBottom: HP(0.125),
    paddingBottom: HP(1.95),
    backgroundColor: colors.White,
  },
  taskImage: {
    width: WP(14.1),
    height: WP(14.1),
    resizeMode: 'contain',
    marginRight: WP(2.7),
    marginLeft: WP(1.9),
  },
  taskInfo: {
    flex: 1,
    position: 'relative',
  },
  taskTitle: {
    fontSize: FS(1.82),
    fontFamily: 'Roboto-SemiBold',
    color: '#434343',
    marginBottom: HP(0.4),
    lineHeight: HP(2.5),
    width: '100%',
  },
  timeSection: {
    marginBottom: HP(0.75),
  },
  timeBox: {
    flexDirection: 'row',
    borderRadius: WP(1.1),
    paddingHorizontal: WP(0.9),
    marginRight: WP(0.8),
    paddingVertical: HP(0.25),
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  timeText: {
    marginLeft: WP(0.5),
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: HP(0.9),
  },
  progressContainer: {
    backgroundColor: '#F6F6F6',
    borderRadius: WP(1.1),
    paddingHorizontal: WP(2.25),
    paddingVertical: HP(0.25),
    marginRight: WP(0.8),
  },
  progressText: {
    fontSize: FS(1.2),
    color: '#6C6C6C',
    fontFamily: 'OpenSans-SemiBold',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  combinedTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: WP(1.1),
    paddingHorizontal: WP(1.1),
    paddingVertical: HP(0.2),
    marginRight: WP(1.6),
  },
  tagText: {
    fontSize: FS(1.2),
    color: '#6C6C6C',
    fontFamily: 'OpenSans-SemiBold',
  },
  separator: {
    color: '#6C6C6C',
    fontSize: FS(1.2),
  },
  flagContainer: {
    marginLeft: 0,
  },
  bottomBorder: {
    position: 'absolute',
    bottom: HP(-1.7),
    left: 0,
    right: WP(-16.0),
    height: HP(0.1),
    backgroundColor: '#DAD8D8',
  },
  checkboxContainer: {
    marginLeft: WP(2.7),
    padding: WP(1.1),
    marginRight: WP(1.2),
  },
  staticCircle: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.65),
    backgroundColor: '#E7E7E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInsideCircle: {
    width: WP(2.7),
    height: WP(2.7),
    resizeMode: 'contain',
  },
  timerIcon: {
    width: WP(5.3),
    height: WP(5.3),
    resizeMode: 'contain',
  },
  completedContainer: {
    width: WP(5.3),
    height: WP(5.3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    width: WP(5.3),
    height: WP(5.3),
    backgroundColor: '#BCE1D3',
    borderRadius: WP(2.65),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // FIXED: In-progress state uses same background color as initial icons
  inProgressCircle: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.65),
    backgroundColor: '#E7E7E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIcon: {
    width: WP(3.5),
    height: WP(3.5),
    resizeMode: 'contain',
    tintColor: '#6C6C6C',
  },
});

export default TaskCard;

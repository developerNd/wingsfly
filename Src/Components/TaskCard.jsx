import React, {useState} from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors, Icons} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';
import {useNavigation} from '@react-navigation/native';
import TaskOptionsModal from './TaskOptionsModal';

const TaskCard = ({
  item,
  checkboxState,
  onToggle,
  onTaskCompleted,
  onTaskDelete,
  onTaskUpdate,
  selectedDate,
  taskCompletions,
  isPlan = false,
}) => {
  const navigation = useNavigation();
  const [showOptionsModal, setShowOptionsModal] = useState(false);

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
    if (item.tags && item.tags.some(tag => tag.toLowerCase() === 'must')) {
      return '#AF0000';
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

  const parseTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    
    const timeStr12Hour = timeStr.trim().toUpperCase();
    const isAM = timeStr12Hour.includes('AM');
    const isPM = timeStr12Hour.includes('PM');
    
    if (!isAM && !isPM) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return null;
      return hours * 60 + minutes;
    } else {
      const timeWithoutAMPM = timeStr12Hour.replace(/AM|PM/g, '').trim();
      const [hours, minutes] = timeWithoutAMPM.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes)) return null;
      
      let adjustedHours = hours;
      if (isPM && hours !== 12) {
        adjustedHours += 12;
      } else if (isAM && hours === 12) {
        adjustedHours = 0;
      }
      
      return adjustedHours * 60 + minutes;
    }
  };

  const isInBlockTimePeriod = () => {
    if (isPlan) return false;
    
    if (!item.blockTimeEnabled || !item.blockTimeData) {
      return false;
    }

    const completion = taskCompletions?.[item.id];
    if (completion?.is_completed === true) {
      return false;
    }

    try {
      const blockTimeData = typeof item.blockTimeData === 'string' 
        ? JSON.parse(item.blockTimeData) 
        : item.blockTimeData;

      if (!blockTimeData.startTime || !blockTimeData.endTime) {
        return false;
      }

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const startMinutes = parseTime(blockTimeData.startTime);
      const endMinutes = parseTime(blockTimeData.endTime);

      if (startMinutes === null || endMinutes === null) {
        return false;
      }

      if (endMinutes < startMinutes) {
        return currentTime >= startMinutes || currentTime <= endMinutes;
      } else {
        return currentTime >= startMinutes && currentTime <= endMinutes;
      }

    } catch (error) {
      console.error('Error checking block time period:', error);
      return false;
    }
  };

  const isBlockTimeExpiredAndIncomplete = () => {
    if (isPlan) return false;

    if (!item.blockTimeEnabled || !item.blockTimeData) {
      return false;
    }

    const completion = taskCompletions?.[item.id];
    if (completion?.is_completed === true) {
      return false;
    }

    try {
      const blockTimeData = typeof item.blockTimeData === 'string' 
        ? JSON.parse(item.blockTimeData) 
        : item.blockTimeData;

      if (!blockTimeData.startTime || !blockTimeData.endTime) {
        return false;
      }

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const startMinutes = parseTime(blockTimeData.startTime);
      const endMinutes = parseTime(blockTimeData.endTime);

      if (startMinutes === null || endMinutes === null) {
        return false;
      }

      let isExpired = false;
      if (endMinutes < startMinutes) {
        const isInActivePeriod = currentTime >= startMinutes || currentTime <= endMinutes;
        const isUpcomingTask = currentTime < startMinutes;
        
        if (isUpcomingTask) {
          isExpired = false;
        } else {
          isExpired = !isInActivePeriod && currentTime > endMinutes;
        }
      } else {
        isExpired = currentTime > endMinutes;
      }

      if (isExpired && !completion) {
        return true;
      }

      return isExpired && !completion?.is_completed;

    } catch (error) {
      console.error('Error checking block time expiration:', error);
      return false;
    }
  };

  const getPlanInitialIcon = () => {
    switch (item.evaluationType) {
      case 'timer':
        return <Image source={Icons.Time} style={styles.timerIcon} />;
      case 'timerTracker':
        return (
          <View style={styles.startButtonContainer}>
            <Text style={styles.startButtonText}>Start</Text>
          </View>
        );
      case 'checklist':
        return (
          <View style={styles.staticCircle}>
            <Image source={Icons.Check} style={styles.iconInsideCircle} />
          </View>
        );
      case 'numeric':
        return (
          <View style={styles.staticCircle}>
            <Image source={Icons.Numeric} style={styles.iconInsideCircle} />
          </View>
        );
      case 'yesNo':
      default:
        return <View style={styles.staticCircle}></View>;
    }
  };

  const getInitialIconInsideRadio = () => {
    if (isPlan) {
      return getPlanInitialIcon();
    }

    switch (item.evaluation_type || item.type) {
      case 'timer':
        return <Image source={Icons.Time} style={styles.timerIcon} />;
      case 'timerTracker':
        return (
          <View style={styles.startButtonContainer}>
            <Text style={styles.startButtonText}>Start</Text>
          </View>
        );
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

  const getInProgressIcon = () => {
    const taskType = isPlan ? item.evaluationType : (item.evaluation_type || item.type);
    
    return (
      <View style={styles.inProgressCircle}>
        {taskType === 'timerTracker' ? (
          <Icon 
            name="play-arrow" 
            size={WP(4.2)} 
            color="#6C6C6C" 
          />
        ) : (
          <Image source={Icons.More} style={styles.moreIcon} />
        )}
      </View>
    );
  };

  const getStoppedIcon = () => {
    return (
      <View style={styles.stoppedCircle}>
        <Icon 
          name="close" 
          size={WP(3.8)} 
          color="#FF4444"
        />
      </View>
    );
  };

  const isPlanTimerTrackerStarted = () => {
    if (!isPlan) return false;
    
    const completion = taskCompletions?.[item.id];
    if (!completion) return false;

    if (typeof completion.timer_value === 'object' && completion.timer_value !== null) {
      const timerData = completion.timer_value;
      
      if (timerData.wasStopped || timerData.wasReset) {
        return false;
      }
      
      const totalSeconds = timerData.totalSeconds || timerData.actualCompletedTime || 0;
      const currentTime = timerData.currentTime || 0;
      const completedPomodoros = timerData.completedPomodoros || 0;
      const completedBreaks = timerData.completedBreaks || 0;
      const currentSessionIndex = timerData.currentSessionIndex || 0;

      return totalSeconds > 0 || currentTime > 0 || completedPomodoros > 0 || 
             completedBreaks > 0 || currentSessionIndex > 0;
    } else {
      const timerValueSeconds = completion.timer_value || 0;
      const timerValueMinutes = completion.timer_minutes || 0;
      const totalTimerValue = timerValueSeconds || timerValueMinutes * 60;
      return totalTimerValue > 0;
    }
  };

  const isPlanTimerTrackerStopped = () => {
    if (!isPlan) return false;
    
    const completion = taskCompletions?.[item.id];
    if (!completion || completion.is_completed === true) return false;

    if (typeof completion.timer_value === 'object' && completion.timer_value !== null) {
      const timerData = completion.timer_value;
      const wasStopped = timerData.wasStopped || timerData.wasReset || false;
      return wasStopped;
    }
    
    return false;
  };

  const isTimerTrackerStopped = () => {
    if (isPlan) return isPlanTimerTrackerStopped();
    
    const completion = taskCompletions?.[item.id];
    if (!completion || completion.is_completed === true) return false;

    if (typeof completion.timer_value === 'object' && completion.timer_value !== null) {
      const timerData = completion.timer_value;
      const wasStopped = timerData.wasStopped || timerData.wasReset || false;
      return wasStopped;
    }
    
    return false;
  };

  const isTimerTrackerStarted = () => {
    if (isPlan) return isPlanTimerTrackerStarted();
    
    const completion = taskCompletions?.[item.id];
    if (!completion) return false;

    if (typeof completion.timer_value === 'object' && completion.timer_value !== null) {
      const timerData = completion.timer_value;
      
      if (timerData.wasStopped || timerData.wasReset) {
        return false;
      }
      
      const totalSeconds = timerData.totalSeconds || timerData.actualCompletedTime || 0;
      const currentTime = timerData.currentTime || 0;
      const completedPomodoros = timerData.completedPomodoros || 0;
      const completedBreaks = timerData.completedBreaks || 0;
      const currentSessionIndex = timerData.currentSessionIndex || 0;

      return totalSeconds > 0 || currentTime > 0 || completedPomodoros > 0 || 
             completedBreaks > 0 || currentSessionIndex > 0;
    } else {
      const timerValueSeconds = completion.timer_value || 0;
      const timerValueMinutes = completion.timer_minutes || 0;
      const totalTimerValue = timerValueSeconds || timerValueMinutes * 60;
      return totalTimerValue > 0;
    }
  };

  const isPlanInProgress = () => {
    if (!isPlan) return false;
    
    const completion = taskCompletions?.[item.id];
    if (!completion) return false;
    if (completion.is_completed === true) return false;

    const taskType = item.evaluationType;

    switch (taskType) {
      case 'timer':
        if (typeof completion.timer_value === 'object' && completion.timer_value !== null) {
          const timerData = completion.timer_value;
          const totalSeconds = timerData.totalSeconds || timerData.actualCompletedTime || 0;
          const currentTime = timerData.currentTime || 0;
          const completedPomodoros = timerData.completedPomodoros || 0;
          const completedBreaks = timerData.completedBreaks || 0;
          const currentSessionIndex = timerData.currentSessionIndex || 0;

          const hasProgress = totalSeconds > 0 || currentTime > 0 || completedPomodoros > 0 || 
                            completedBreaks > 0 || currentSessionIndex > 0;
          const isNotFullyCompleted = !timerData.isFullyCompleted;

          return hasProgress && isNotFullyCompleted && !completion.is_completed;
        } else {
          const timerValueSeconds = completion.timer_value || 0;
          const timerValueMinutes = completion.timer_minutes || 0;
          const totalTimerValue = timerValueSeconds || timerValueMinutes * 60;
          return totalTimerValue > 0 && !completion.is_completed;
        }

      case 'timerTracker':
        if (isPlanTimerTrackerStopped()) {
          return false;
        }
        
        if (typeof completion.timer_value === 'object' && completion.timer_value !== null) {
          const timerData = completion.timer_value;
          const totalSeconds = timerData.totalSeconds || timerData.actualCompletedTime || 0;
          const currentTime = timerData.currentTime || 0;
          const completedPomodoros = timerData.completedPomodoros || 0;
          const completedBreaks = timerData.completedBreaks || 0;
          const currentSessionIndex = timerData.currentSessionIndex || 0;

          const hasProgress = totalSeconds > 0 || currentTime > 0 || completedPomodoros > 0 || 
                            completedBreaks > 0 || currentSessionIndex > 0;
          const isNotFullyCompleted = !timerData.isFullyCompleted;
          const wasNotStopped = !timerData.wasStopped && !timerData.wasReset;

          return hasProgress && isNotFullyCompleted && !completion.is_completed && wasNotStopped;
        } else {
          const timerValueSeconds = completion.timer_value || 0;
          const timerValueMinutes = completion.timer_minutes || 0;
          const totalTimerValue = timerValueSeconds || timerValueMinutes * 60;
          return totalTimerValue > 0 && !completion.is_completed;
        }

      case 'numeric':
        return completion.numeric_value > 0 && !completion.is_completed;

      case 'checklist':
        if (completion.checklist_items && completion.checklist_items.length > 0) {
          const completedItems = completion.checklist_items.filter(
            checklistItem => checklistItem.completed,
          );
          return completedItems.length > 0 && completedItems.length < completion.checklist_items.length;
        }
        return false;

      case 'yesNo':
        return false;

      default:
        return false;
    }
  };

  const isTaskInProgress = () => {
    if (isPlan) {
      return isPlanInProgress();
    }

    const completion = taskCompletions?.[item.id];

    if (!completion) return false;
    if (completion.is_completed === true) return false;

    const taskType = item.evaluation_type || item.type;

    switch (taskType) {
      case 'timer':
        if (typeof completion.timer_value === 'object' && completion.timer_value !== null) {
          const timerData = completion.timer_value;
          const totalSeconds = timerData.totalSeconds || timerData.actualCompletedTime || 0;
          const currentTime = timerData.currentTime || 0;
          const completedPomodoros = timerData.completedPomodoros || 0;
          const completedBreaks = timerData.completedBreaks || 0;
          const currentSessionIndex = timerData.currentSessionIndex || 0;

          const hasProgress = totalSeconds > 0 || currentTime > 0 || completedPomodoros > 0 || 
                            completedBreaks > 0 || currentSessionIndex > 0;
          const isNotFullyCompleted = !timerData.isFullyCompleted;

          return hasProgress && isNotFullyCompleted && !completion.is_completed;
        } else {
          const timerValueSeconds = completion.timer_value || 0;
          const timerValueMinutes = completion.timer_minutes || 0;
          const totalTimerValue = timerValueSeconds || timerValueMinutes * 60;
          return totalTimerValue > 0 && !completion.is_completed;
        }

      case 'timerTracker':
        if (isTimerTrackerStopped()) {
          return false;
        }
        
        if (typeof completion.timer_value === 'object' && completion.timer_value !== null) {
          const timerData = completion.timer_value;
          const totalSeconds = timerData.totalSeconds || timerData.actualCompletedTime || 0;
          const currentTime = timerData.currentTime || 0;
          const completedPomodoros = timerData.completedPomodoros || 0;
          const completedBreaks = timerData.completedBreaks || 0;
          const currentSessionIndex = timerData.currentSessionIndex || 0;

          const hasProgress = totalSeconds > 0 || currentTime > 0 || completedPomodoros > 0 || 
                            completedBreaks > 0 || currentSessionIndex > 0;
          const isNotFullyCompleted = !timerData.isFullyCompleted;
          const wasNotStopped = !timerData.wasStopped && !timerData.wasReset;

          return hasProgress && isNotFullyCompleted && !completion.is_completed && wasNotStopped;
        } else {
          const timerValueSeconds = completion.timer_value || 0;
          const timerValueMinutes = completion.timer_minutes || 0;
          const totalTimerValue = timerValueSeconds || timerValueMinutes * 60;
          return totalTimerValue > 0 && !completion.is_completed;
        }

      case 'numeric':
        return completion.numeric_value > 0 && !completion.is_completed;

      case 'checklist':
        if (completion.checklist_items && completion.checklist_items.length > 0) {
          const completedItems = completion.checklist_items.filter(
            checklistItem => checklistItem.completed,
          );
          return completedItems.length > 0 && completedItems.length < completion.checklist_items.length;
        }
        return false;

      case 'yesNo':
        return false;

      case 'task':
      default:
        return false;
    }
  };

  const getTaskTypeText = () => {
    if (isPlan) {
      return 'Plan Your Day';
    }

    const taskType = item.taskType || item.evaluation_type || item.type;

    switch (taskType) {
      case 'Habit':
        return 'Habit';
      case 'Recurring':
      case 'Recurring Task':
        return 'Recurring';
      case 'Task':
        return 'Task';
      case 'timer':
        return 'Timer';
      case 'timerTracker':
        return 'Timer Tracker';
      case 'numeric':
        return 'Numeric';
      case 'checklist':
        return 'Checklist';
      case 'yesNo':
        return 'Yes/No';
      default:
        return taskType || 'Task';
    }
  };

  const buildTagsArray = () => {
    const tagsArray = [];
    const existingTags = item.tags || [];
    
    if (isPlan) {
      tagsArray.push('Plan Your Day');
      
      const hasImportantTags = existingTags.some(tag => {
        const tagLower = tag.toLowerCase();
        return tagLower === 'important' || tagLower === 'must' || 
               tagLower === 'urgent' || tagLower === 'priority';
      });
      
      if (hasImportantTags) {
        existingTags.forEach(tag => {
          const tagLower = tag.toLowerCase();
          if (tagLower !== 'plan your day' && tagLower !== 'plan' &&
              !tagsArray.some(existingTag => existingTag.toLowerCase() === tagLower)) {
            tagsArray.push(tag);
          }
        });
      } else {
        const evaluationType = item.evaluationType;
        if (evaluationType && evaluationType !== 'yesNo') {
          switch (evaluationType) {
            case 'timer':
              tagsArray.push('Timer');
              break;
            case 'timerTracker':
              tagsArray.push('Timer Tracker');
              break;
            case 'checklist':
              tagsArray.push('Checklist');
              break;
            case 'numeric':
              tagsArray.push('Numeric');
              break;
          }
        }
        
        existingTags.forEach(tag => {
          const tagLower = tag.toLowerCase();
          if (tagLower !== 'plan your day' && 
              tagLower !== 'plan' && 
              tagLower !== 'timer' &&
              tagLower !== 'timer tracker' &&
              tagLower !== 'checklist' &&
              tagLower !== 'numeric' &&
              tagLower !== 'yes/no' &&
              tagLower !== 'yesno' &&
              tagLower !== 'important' && 
              tagLower !== 'must' && 
              tagLower !== 'urgent' && 
              tagLower !== 'priority' &&
              !tagsArray.some(existingTag => existingTag.toLowerCase() === tagLower)) {
            tagsArray.push(tag);
          }
        });
      }
    } else {
      const taskTypeText = getTaskTypeText();
      if (taskTypeText && !existingTags.some(tag => 
        tag.toLowerCase() === taskTypeText.toLowerCase())) {
        tagsArray.push(taskTypeText);
      }
      
      existingTags.forEach(tag => {
        if (!tagsArray.some(existingTag => existingTag.toLowerCase() === tag.toLowerCase())) {
          tagsArray.push(tag);
        }
      });
    }
    
    if (tagsArray.length === 0) {
      const taskTypeText = getTaskTypeText();
      tagsArray.push(taskTypeText);
    }
    
    return tagsArray;
  };

  const shouldShowFlag = () => {
    if (!item.tags || item.tags.length === 0) return false;
    
    return item.tags.some(tag => {
      const tagLower = tag.toLowerCase();
      return tagLower === 'important' || tagLower === 'must' || tagLower === 'urgent' || tagLower === 'priority';
    });
  };

  const handleCheckboxPress = () => {
    const taskType = isPlan ? item.evaluationType : (item.evaluation_type || item.type);

    if (taskType === 'checklist') {
      navigation.navigate('TaskEvaluation', {
        taskData: item,
        taskId: isPlan ? item.originalId : item.id,
        selectedDate: selectedDate,
        isPlan: isPlan,
      });
      return;
    }

    if (taskType === 'timer') {
      navigation.navigate('PomoScreen', {
        task: item,
        taskId: isPlan ? item.originalId : item.id,
        selectedDate: selectedDate,
        isPlan: isPlan,
      });
      return;
    }

    if (taskType === 'timerTracker') {
      navigation.navigate('PomoTrackerScreen', {
        task: item,
        taskId: isPlan ? item.originalId : item.id,
        selectedDate: selectedDate,
        isPlan: isPlan,
        isTimerTracker: true,
      });
      return;
    }

    onToggle();
  };

  const handleTaskPress = () => {
    // No action on regular press
  };

  const handleLongPress = () => {
    setShowOptionsModal(true);
  };

  const handleEditPress = () => {
    setShowOptionsModal(false);
    
    // Navigate to appropriate edit screen based on evaluation type
    if (isPlan) {
      const evaluationType = item.evaluationType;
      
      // Check if it's a Timer Tracker plan
      if (evaluationType === 'timerTracker') {
        navigation.navigate('EditPlanTimerTrackerScreen', {
          planData: item,
          planId: item.originalId || item.id,
          selectedDate: selectedDate,
        });
      } else {
        // For other plan types (timer, checklist, yesNo, numeric)
        navigation.navigate('EditPlanScreen', {
          planData: item,
          planId: item.originalId || item.id,
          selectedDate: selectedDate,
        });
      }
    }
  };

  const handleDeleteConfirm = () => {
    setShowOptionsModal(false);
    if (onTaskDelete) {
      onTaskDelete(item.id);
    }
  };

  const handleOptionsCancel = () => {
    setShowOptionsModal(false);
  };

  const renderCheckbox = () => {
    const taskType = isPlan ? item.evaluationType : (item.evaluation_type || item.type);

    if (checkboxState === 4) {
      return (
        <View style={styles.completedContainer}>
          <View style={styles.checkedBox}>
            <Icon name="check" size={WP(3.2)} color="#00754B" />
          </View>
        </View>
      );
    }

    if (taskType === 'timerTracker') {
      if (isTimerTrackerStopped()) {
        return getStoppedIcon();
      }
      
      if (isTaskInProgress()) {
        return getInProgressIcon();
      }
      
      if (isTimerTrackerStarted()) {
        return <View style={styles.staticCircle}></View>;
      }
      
      return (
        <View style={styles.startButtonContainer}>
          <Text style={styles.startButtonText}>Start</Text>
        </View>
      );
    }

    if (isTaskInProgress()) {
      return getInProgressIcon();
    }

    if (checkboxState === 2 || checkboxState === 3) {
      return getInitialIconInsideRadio();
    }

    return getInitialIconInsideRadio();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.taskContainer}
        onPress={handleTaskPress}
        onLongPress={handleLongPress}
        delayLongPress={800}
        activeOpacity={0.8}>
        <Image
          source={getImageSource(item.category)}
          style={styles.taskImage}
        />
        <View style={styles.taskInfo}>
          <View style={styles.titleContainer}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            {isInBlockTimePeriod() && (
              <View style={styles.blockTimeIndicator} />
            )}
            {isBlockTimeExpiredAndIncomplete() && (
              <View style={styles.expiredTimeIndicator} />
            )}
          </View>

          <View style={styles.taskMeta}>
            {item.time && (
              <View
                style={[
                  styles.timeBox,
                  {backgroundColor: item.timeColor || '#E4EBF3'},
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
            )}

            {isPlan && (
              <View style={styles.planInfoContainer}>
                {item.planType === 'hours' && item.targetHours && (
                  <View style={styles.planInfoBox}>
                    <Text style={styles.planInfoText}>
                      Target: {item.targetHours}h
                    </Text>
                  </View>
                )}
                {item.planType === 'tasks' && item.targetTasks && (
                  <View style={styles.planInfoBox}>
                    <Text style={styles.planInfoText}>
                      Target: {item.targetTasks} tasks
                    </Text>
                  </View>
                )}
              </View>
            )}

            {item.progress && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{item.progress}</Text>
              </View>
            )}

            <View style={styles.tagsContainer}>
              <View style={styles.combinedTagContainer}>
                {(() => {
                  const combinedTags = buildTagsArray();
                  return combinedTags.map((tag, index) => (
                    <Text key={index} style={styles.tagText}>
                      {tag}
                      {index < combinedTags.length - 1 && (
                        <Text style={styles.separator}> | </Text>
                      )}
                    </Text>
                  ));
                })()}
                {shouldShowFlag() && (
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

      <TaskOptionsModal
        visible={showOptionsModal}
        taskTitle={item.title}
        onCancel={handleOptionsCancel}
        onEdit={handleEditPress}
        onDelete={handleDeleteConfirm}
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(0.4),
    flexShrink: 1,
  },
  taskTitle: {
    fontSize: FS(1.82),
    fontFamily: 'Roboto-SemiBold',
    color: '#434343',
    lineHeight: HP(2.5),
    flexShrink: 1,
  },
  blockTimeIndicator: {
    width: WP(2.1),
    height: WP(2.1),
    borderRadius: WP(1.05),
    backgroundColor: '#4CAF50',
    marginLeft: WP(1.0),
    marginTop: HP(0.3),
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: HP(0.1),
    },
    shadowOpacity: 0.3,
    shadowRadius: WP(0.5),
    elevation: 2,
  },
  expiredTimeIndicator: {
    width: WP(2.1),
    height: WP(2.1),
    borderRadius: WP(1.05),
    backgroundColor: '#FF4444',
    marginLeft: WP(1.0),
    marginTop: HP(0.3),
    shadowColor: '#FF4444',
    shadowOffset: {
      width: 0,
      height: HP(0.1),
    },
    shadowOpacity: 0.3,
    shadowRadius: WP(0.5),
    elevation: 2,
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
  planInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planInfoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: WP(1.1),
    paddingHorizontal: WP(1.5),
    paddingVertical: HP(0.25),
    marginRight: WP(0.8),
  },
  planInfoText: {
    fontSize: FS(1.1),
    color: '#1976D2',
    fontFamily: 'OpenSans-SemiBold',
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
    marginLeft: WP(0.5),
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
  startButtonContainer: {
    width: WP(14),
    height: WP(6),
    backgroundColor: colors.Primary,
    borderRadius: WP(2.8),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(1),
  },
  startButtonText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  stoppedCircle: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.65),
    backgroundColor: '#FF444433',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TaskCard;
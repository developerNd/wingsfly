import React, {useState, useEffect, useMemo} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Headers from '../../../Components/Headers';
import DatePickerModal from '../../../Components/DatePickerModal';
import {colors, Icons} from '../../../Helper/Contants';
import {HP, WP, FS} from '../../../utils/dimentions';
import {challengeService} from '../../../services/api/challengeService';
import {useAuth} from '../../../contexts/AuthContext';

const ChallengeScreen = () => {
  const [challengeName, setChallengeName] = useState('');
  const [challengeWhy, setChallengeWhy] = useState('');
  const [numberOfDays, setNumberOfDays] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Focus states for input labels
  const [challengeNameFocused, setChallengeNameFocused] = useState(false);
  const [challengeWhyFocused, setChallengeWhyFocused] = useState(false);

  // Task management states
  const [tasks, setTasks] = useState([]);
  const [datePickerConfig, setDatePickerConfig] = useState({
    visible: false,
    type: 'challenge', // 'challenge', 'task_start'
    taskId: null,
    initialDate: new Date(),
    title: '',
    minimumDate: null,
    maximumDate: null,
  });

  const navigation = useNavigation();
  const {user} = useAuth();

  // Constants for task limits
  const MAX_ROOT_TASKS = 4;
  const MAX_SUBTASKS_PER_TASK = 4;
  const MAX_NESTING_LEVELS = 4; // 0: root, 1: level 1, 2: level 2, 3: level 3

  // Calculate end date automatically based on start date and number of days
  const endDate = useMemo(() => {
    if (!numberOfDays || isNaN(parseInt(numberOfDays))) {
      return null;
    }
    const days = parseInt(numberOfDays);
    if (days <= 0) return null;

    const end = new Date(startDate);
    end.setDate(end.getDate() + days - 1);
    return end;
  }, [startDate, numberOfDays]);

  // Format date for display
  const formatDate = date => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format date for compact display in tasks
  const formatCompactDate = date => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Generate unique ID for tasks
  const generateTaskId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get task level (for nesting visualization)
  const getTaskLevel = (parentTaskId) => {
    if (!parentTaskId) return 0;
    const parentTask = tasks.find(t => t.id === parentTaskId);
    return parentTask ? parentTask.level + 1 : 0;
  };

  // Check if can add more tasks/subtasks
  const canAddRootTask = () => {
    const rootTasks = getRootTasks();
    return rootTasks.length < MAX_ROOT_TASKS;
  };

  const canAddSubtask = (parentTaskId) => {
    const parentTask = tasks.find(t => t.id === parentTaskId);
    if (!parentTask) return false;
    
    // Check if we've reached maximum nesting level
    if (parentTask.level >= MAX_NESTING_LEVELS - 1) return false;
    
    const childTasks = getChildTasks(parentTaskId);
    return childTasks.length < MAX_SUBTASKS_PER_TASK;
  };

  // Add new task
  const addTask = (parentTaskId = null) => {
    // Check limits before adding
    if (parentTaskId) {
      if (!canAddSubtask(parentTaskId)) {
        const parentTask = tasks.find(t => t.id === parentTaskId);
        if (parentTask && parentTask.level >= MAX_NESTING_LEVELS - 1) {
          Alert.alert('Nesting Limit Reached', `You can only nest tasks up to ${MAX_NESTING_LEVELS} levels deep.`);
        } else {
          Alert.alert('Limit Reached', `You can only add up to ${MAX_SUBTASKS_PER_TASK} subtasks per task.`);
        }
        return;
      }
    } else {
      if (!canAddRootTask()) {
        Alert.alert('Limit Reached', `You can only add up to ${MAX_ROOT_TASKS} root tasks.`);
        return;
      }
    }

    const newTask = {
      id: generateTaskId(),
      parentTaskId,
      title: '',
      startDate: new Date(startDate),
      level: getTaskLevel(parentTaskId),
      isExpanded: true,
    };

    setTasks(prevTasks => [...prevTasks, newTask]);
  };

  // Remove task and its subtasks
  const removeTask = (taskId) => {
    setTasks(prevTasks => {
      const taskToRemove = prevTasks.find(t => t.id === taskId);
      if (!taskToRemove) return prevTasks;

      // Get all descendant task IDs recursively
      const getDescendantIds = (parentId) => {
        const children = prevTasks.filter(t => t.parentTaskId === parentId);
        let descendants = children.map(c => c.id);
        children.forEach(child => {
          descendants = [...descendants, ...getDescendantIds(child.id)];
        });
        return descendants;
      };

      const descendantIds = getDescendantIds(taskId);
      const idsToRemove = [taskId, ...descendantIds];

      return prevTasks.filter(task => !idsToRemove.includes(task.id));
    });
  };

  // Update task field
  const updateTask = (taskId, field, value) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, [field]: value } : task
      )
    );
  };

  // Toggle task expansion
  const toggleTaskExpansion = (taskId) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, isExpanded: !task.isExpanded } : task
      )
    );
  };

  // Get child tasks
  const getChildTasks = (parentTaskId) => {
    return tasks.filter(task => task.parentTaskId === parentTaskId);
  };

  // Get root tasks
  const getRootTasks = () => {
    return tasks.filter(task => !task.parentTaskId);
  };

  // Get task number for hierarchical display (e.g., 2.1.2.1)
  const getTaskNumber = (task) => {
    const buildNumber = (currentTask, path = []) => {
      if (!currentTask.parentTaskId) {
        // Root task
        const rootTasks = getRootTasks();
        const rootIndex = rootTasks.indexOf(currentTask) + 1;
        return [rootIndex, ...path].join('.');
      } else {
        // Find parent and siblings
        const parentTask = tasks.find(t => t.id === currentTask.parentTaskId);
        const siblings = getChildTasks(currentTask.parentTaskId);
        const siblingIndex = siblings.indexOf(currentTask) + 1;
        
        if (parentTask) {
          return buildNumber(parentTask, [siblingIndex, ...path]);
        } else {
          return [siblingIndex, ...path].join('.');
        }
      }
    };

    return buildNumber(task);
  };

  // Get level indicator for visual hierarchy
  const getLevelIndicator = (level) => {
    const indicators = ['assignment', 'radio-button-unchecked', 'remove', 'fiber-manual-record'];
    return indicators[Math.min(level, indicators.length - 1)];
  };

  // Get professional styling based on level using only app theme colors
  const getLevelStyling = (level) => {
    const styles = [
      { 
        bg: colors.White, 
        text: colors.Black,
        accent: colors.Primary,
        shadow: true,
      }, // Root
      { 
        bg: colors.White, 
        text: '#333333',
        accent: '#666666',
        shadow: true,
      }, // Level 1
      { 
        bg: colors.White, 
        text: '#555555',
        accent: '#888888',
        shadow: true,
      }, // Level 2
      { 
        bg: colors.White, 
        text: '#666666',
        accent: '#999999',
        shadow: true,
      }, // Level 3
    ];
    return styles[Math.min(level, styles.length - 1)];
  };

  // Validate form inputs
  const isFormValid = () => {
    if (!challengeName.trim()) return false;
    if (!challengeWhy.trim()) return false;
    if (!numberOfDays || isNaN(parseInt(numberOfDays)) || parseInt(numberOfDays) <= 0) return false;
    if (!hoursPerDay || isNaN(parseFloat(hoursPerDay)) || parseFloat(hoursPerDay) <= 0 || parseFloat(hoursPerDay) > 24) return false;
    if (!user) return false;

    // Validate all tasks have titles and valid dates
    for (const task of tasks) {
      if (!task.title.trim()) return false;
      if (!task.startDate) return false;
      
      // Check if task dates are within challenge dates
      if (task.startDate < startDate || task.startDate > endDate) return false;
    }

    return true;
  };

  // Handle date selection
  const handleDateSelect = date => {
    const { type, taskId } = datePickerConfig;
    
    if (type === 'challenge') {
      setStartDate(date);
    } else if (type === 'task_start' && taskId) {
      updateTask(taskId, 'startDate', date);
    }

    setDatePickerConfig(prev => ({ ...prev, visible: false }));
  };

  // Show date picker for challenge
  const showChallengeDatePicker = () => {
    setDatePickerConfig({
      visible: true,
      type: 'challenge',
      taskId: null,
      initialDate: startDate,
      title: 'Select Start Date',
      minimumDate: new Date(),
      maximumDate: null,
    });
  };

  // Show date picker for task
  const showTaskDatePicker = (taskId, dateType) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setDatePickerConfig({
      visible: true,
      type: 'task_start',
      taskId,
      initialDate: task.startDate,
      title: 'Select Date',
      minimumDate: startDate,
      maximumDate: endDate,
    });
  };

  // Handle number of days input
  const handleDaysInput = text => {
    const numericText = text.replace(/[^0-9]/g, '');
    setNumberOfDays(numericText);
  };

  // Handle hours per day input
  const handleHoursInput = text => {
    // Allow decimals for hours (e.g., 2.5 hours)
    const cleanedText = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanedText.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to one decimal place
    if (parts[1] && parts[1].length > 1) {
      setHoursPerDay(parts[0] + '.' + parts[1].substring(0, 1));
      return;
    }
    
    setHoursPerDay(cleanedText);
  };

  // Handle challenge creation with tasks
  const handleCreateChallenge = async () => {
    if (!isFormValid()) {
      Alert.alert('Validation Error', 'Please fill in all fields correctly and ensure task dates are within the challenge period.');
      return;
    }

    const days = parseInt(numberOfDays);
    if (days > 365) {
      Alert.alert('Invalid Duration', 'Challenge duration cannot exceed 365 days.');
      return;
    }

    const hours = parseFloat(hoursPerDay);
    if (hours > 24) {
      Alert.alert('Invalid Hours', 'Hours per day cannot exceed 24.');
      return;
    }

    setLoading(true);

    try {
      const challengeData = {
        userId: user.id,
        name: challengeName.trim(),
        why: challengeWhy.trim(),
        numberOfDays: days,
        hoursPerDay: hours,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      console.log('Creating challenge:', challengeData);

      // Create challenge
      const newChallenge = await challengeService.createChallenge(challengeData);

      // Create tasks if any - format tasks to ensure dates are ISO strings
      if (tasks.length > 0) {
        const formattedTasks = tasks.map(task => ({
          ...task,
          startDate: task.startDate.toISOString(),
        }));
        await challengeService.createChallengeTasks(newChallenge.id, formattedTasks);
      }

      console.log('Challenge and tasks created successfully');

      Alert.alert(
        'Challenge Created!',
        `Your ${days}-day challenge "${challengeName}" with ${hours} hours per day commitment and ${tasks.length} tasks is ready to begin!`,
        [
          {
            text: 'View Challenges',
            onPress: () => {
              navigation.navigate('BottomTab', {challengeCreated: true});
            },
          },
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ],
      );

      // Reset form
      setChallengeName('');
      setChallengeWhy('');
      setNumberOfDays('');
      setHoursPerDay('');
      setStartDate(new Date());
      setTasks([]);

    } catch (error) {
      console.error('Error creating challenge:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create challenge. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Render task item with professional design
  const renderTaskItem = (task, index) => {
    const childTasks = getChildTasks(task.id);
    const hasChildren = childTasks.length > 0;
    const taskNumber = getTaskNumber(task);
    const canAddMoreSubtasks = canAddSubtask(task.id);
    const levelStyling = getLevelStyling(task.level);

    return (
      <View key={task.id} style={styles.taskWrapper}>
        {/* Professional Task Card */}
        <View style={[
          styles.professionalTaskCard,
          { 
            marginLeft: WP(task.level * 4),
            backgroundColor: levelStyling.bg,
            ...(levelStyling.shadow && {
              elevation: 3,
              shadowColor: colors.Shadow,
              shadowOffset: { width: 0, height: HP(0.25) },
              shadowOpacity: 0.08,
              shadowRadius: WP(2.133),
            })
          }
        ]}>
          
          {/* Task Header Row */}
          <View style={styles.professionalTaskHeader}>
            <View style={styles.taskNumberSection}>
              {/* Task Level Indicator */}
              <View style={[
                styles.taskLevelIndicator,
                task.level === 0 && { backgroundColor: colors.Primary },
                task.level > 0 && { backgroundColor: 'transparent', borderWidth: 1, borderColor: levelStyling.accent }
              ]}>
                <Text style={[
                  styles.taskLevelText,
                  { color: task.level === 0 ? colors.White : levelStyling.accent }
                ]}>
                  {task.level === 0 ? 'T' : task.level}
                </Text>
              </View>
              
              {/* Task Number */}
              <Text style={[styles.professionalTaskNumber, { color: levelStyling.text }]}>
                {taskNumber}
              </Text>
              
              {/* Expand/Collapse for parent tasks */}
              {hasChildren && (
                <TouchableOpacity
                  onPress={() => toggleTaskExpansion(task.id)}
                  style={styles.professionalExpandButton}
                >
                  <MaterialIcons
                    name={task.isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={18}
                    color={levelStyling.accent}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Remove Button with Background */}
            <TouchableOpacity 
              onPress={() => removeTask(task.id)} 
              style={styles.professionalRemoveButton}
            >
              <MaterialIcons name="close" size={16} color="#CC0000" />
            </TouchableOpacity>
          </View>

          {/* Task Title Input with Background and Shadow */}
          <View style={styles.professionalInputWrapper}>
            <TextInput
              style={styles.professionalTaskInput}
              placeholder={task.level === 0 ? 'Enter task title...' : 'Enter subtask title...'}
              value={task.title}
              onChangeText={(text) => updateTask(task.id, 'title', text)}
              maxLength={100}
              placeholderTextColor="#929292"
              multiline={false}
            />
          </View>

          {/* Task Date Section and Add Subtask Row */}
          <View style={styles.professionalDateRow}>
            <TouchableOpacity
              style={styles.professionalDateButton}
              onPress={() => showTaskDatePicker(task.id, 'start')}
            >
              <MaterialIcons name="calendar-today" size={14} color={levelStyling.accent} />
              <Text style={styles.professionalDateText}>
                {formatCompactDate(task.startDate)}
              </Text>
            </TouchableOpacity>

            {/* Add Subtask Button - Right Side */}
            {canAddMoreSubtasks && (
              <TouchableOpacity
                style={styles.professionalAddSubtaskButton}
                onPress={() => addTask(task.id)}
              >
                <MaterialIcons 
                  name="add" 
                  size={14} 
                  color={colors.Primary} 
                />
                <Text style={styles.professionalAddSubtaskText}>
                  Add Subtask ({childTasks.length}/{MAX_SUBTASKS_PER_TASK})
                </Text>
              </TouchableOpacity>
            )}

            {/* Subtask count for parent tasks without add button */}
            {hasChildren && !canAddMoreSubtasks && (
              <View style={styles.subtaskCount}>
                <Text style={styles.subtaskCountText}>
                  {childTasks.length} subtask{childTasks.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Child Tasks Container */}
        {hasChildren && task.isExpanded && (
          <View style={styles.professionalChildContainer}>
            {childTasks.map((childTask, childIndex) =>
              renderTaskItem(childTask, childIndex)
            )}
          </View>
        )}
      </View>
    );
  };

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      Alert.alert(
        'Authentication Required',
        'Please log in to create challenges.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    }
  }, [user, navigation]);

  // Label active states
  const isChallengeNameLabelActive = challengeNameFocused || challengeName.length > 0;
  const isChallengeWhyLabelActive = challengeWhyFocused || challengeWhy.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <Headers title="Create Challenge">
          <TouchableOpacity
            onPress={handleCreateChallenge}
            disabled={!isFormValid() || loading}
          >
            <Text
              style={[
                styles.createText,
                (!isFormValid() || loading) && styles.createTextDisabled,
              ]}
            >
              {loading ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Challenge Name Section */}
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isChallengeNameLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}
          >
            Challenge Name
          </Text>
          <TextInput
            style={styles.textInput}
            value={challengeName}
            onChangeText={setChallengeName}
            onFocus={() => setChallengeNameFocused(true)}
            onBlur={() => setChallengeNameFocused(false)}
            placeholder=""
            placeholderTextColor="#575656"
            maxLength={70}
          />
        </View>

        {/* Why Section */}
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isChallengeWhyLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}
          >
            Why This Challenge?
          </Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={challengeWhy}
            onChangeText={setChallengeWhy}
            onFocus={() => setChallengeWhyFocused(true)}
            onBlur={() => setChallengeWhyFocused(false)}
            placeholder=""
            placeholderTextColor="#575656"
            maxLength={200}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Duration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Challenge Duration</Text>
          <View style={styles.durationContainer}>
            <View style={styles.daysInputContainer}>
              <TextInput
                style={styles.daysInput}
                placeholder="30"
                value={numberOfDays}
                onChangeText={handleDaysInput}
                keyboardType="numeric"
                maxLength={3}
                placeholderTextColor="#929292"
              />
              <Text style={styles.daysLabel}>days</Text>
            </View>
          </View>
        </View>

        {/* Hours Per Day Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hours Per Day</Text>
          <View style={styles.durationContainer}>
            <View style={styles.daysInputContainer}>
              <TextInput
                style={styles.daysInput}
                placeholder="2.5"
                value={hoursPerDay}
                onChangeText={handleHoursInput}
                keyboardType="decimal-pad"
                maxLength={4}
                placeholderTextColor="#929292"
              />
              <Text style={styles.daysLabel}>hours/day</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            How many hours per day will you dedicate to this challenge?
          </Text>
        </View>

        {/* Start Date Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Date</Text>
          <TouchableOpacity style={styles.dateSelector} onPress={showChallengeDatePicker}>
            <Image source={Icons.Calendar} style={styles.iconImage} />
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>{formatDate(startDate)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* End Date Display */}
        {endDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>End Date</Text>
            <View style={styles.dateSelector}>
              <Image source={Icons.Calendar} style={styles.iconImage} />
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tasks Section */}
        <View style={styles.section}>
          <View style={styles.tasksSectionHeader}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            <TouchableOpacity 
              style={[
                styles.addTaskButton,
                !canAddRootTask() && styles.addTaskButtonDisabled
              ]} 
              onPress={() => addTask()}
              disabled={!canAddRootTask()}
            >
              <MaterialIcons 
                name="add-circle" 
                size={20} 
                color={canAddRootTask() ? colors.Primary : '#CCC'} 
              />
              <Text style={[
                styles.addTaskText,
                !canAddRootTask() && styles.addTaskTextDisabled
              ]}>
                Add Task ({getRootTasks().length}/{MAX_ROOT_TASKS})
              </Text>
            </TouchableOpacity>
          </View>

          {tasks.length === 0 ? (
            <View style={styles.emptyTasksContainer}>
              <MaterialIcons name="assignment" size={48} color="#E0E0E0" />
              <Text style={styles.emptyTasksTitle}>No tasks yet</Text>
              <Text style={styles.emptyTasksDesc}>
                Add tasks to break down your challenge into manageable steps.
                You can nest subtasks up to {MAX_NESTING_LEVELS} levels deep!
              </Text>
            </View>
          ) : (
            <View style={styles.tasksContainer}>
              {getRootTasks().map((task, index) => renderTaskItem(task, index))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerConfig.visible}
        onClose={() => setDatePickerConfig(prev => ({ ...prev, visible: false }))}
        onDateSelect={handleDateSelect}
        initialDate={datePickerConfig.initialDate}
        title={datePickerConfig.title}
        minimumDate={datePickerConfig.minimumDate}
        maximumDate={datePickerConfig.maximumDate}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  headerWrapper: {
    marginTop: HP(2.5),
    paddingBottom: HP(0.625),
  },
  createText: {
    fontSize: FS(1.8),
    color: colors.Primary,
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  createTextDisabled: {
    color: '#A5A5A5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: WP(4.533),
    paddingBottom: HP(2),
    paddingTop: HP(2.8),
  },
  section: {
    marginBottom: HP(2.3),
  },
  sectionTitle: {
    fontSize: FS(1.625),
    color: '#666666',
    fontFamily: 'OpenSans-Bold',
    marginBottom: HP(1),
  },
  inputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    padding: WP(2.133),
    marginBottom: HP(2.3),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minHeight: HP(4.375),
  },
  inputLabel: {
    fontSize: FS(1.625),
    color: '#666666',
    fontFamily: 'OpenSans-Bold',
    position: 'absolute',
    backgroundColor: colors.White,
    paddingHorizontal: WP(1.7),
    zIndex: 1,
  },
  inputLabelActive: {
    top: HP(-1.25),
    left: WP(2.7),
    fontSize: FS(1.5),
    color: '#666666',
    fontFamily: 'OpenSans-Bold',
  },
  inputLabelInactive: {
    top: HP(1.5),
    left: WP(3.2),
    fontSize: FS(1.7),
    color: '#575656',
    fontFamily: 'OpenSans-Bold',
  },
  textInput: {
    fontSize: FS(2.0),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    paddingVertical: HP(-0.25),
    paddingHorizontal: WP(2.133),
  },
  textArea: {
    minHeight: HP(8),
    maxHeight: HP(15),
    textAlignVertical: 'top',
    paddingTop: HP(1),
  },
  durationContainer: {
    alignItems: 'flex-start',
  },
  daysInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.White,
    elevation: 3,
    borderRadius: WP(2.133),
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingRight: WP(4),
    minHeight: HP(4.375),
  },
  daysInput: {
    padding: WP(4),
    fontSize: FS(2.0),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    minWidth: WP(20),
    textAlign: 'center',
  },
  daysLabel: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#929292',
    marginLeft: WP(2),
  },
  helperText: {
    fontSize: FS(1.3),
    color: '#888888',
    fontFamily: 'OpenSans-Regular',
    marginTop: HP(0.8),
    lineHeight: HP(2),
  },
  dateSelector: {
    backgroundColor: colors.White,
    elevation: 3,
    borderRadius: WP(2.133),
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: WP(4),
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: HP(4.375),
  },
  dateContainer: {
    backgroundColor: '#EFEFEF',
    paddingHorizontal: WP(5),
    paddingVertical: HP(1),
    borderRadius: WP(1.5),
    marginLeft: WP(3),
  },
  dateText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#5F5F5F',
  },
  iconImage: {
    width: WP(6),
    height: WP(6),
    tintColor: '#4F4F4F',
    resizeMode: 'contain',
    marginBottom: HP(0.4),
  },

  // Professional Task-related styles using only app theme colors
  tasksSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: HP(2),
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.Primary + '12',
    paddingHorizontal: WP(4),
    paddingVertical: HP(1),
    borderRadius: WP(1.5),
    borderWidth: 1,
    borderColor: colors.Primary + '30',
  },
  addTaskButtonDisabled: {
    backgroundColor: '#F8F8F8',
    borderColor: '#E0E0E0',
  },
  addTaskText: {
    fontSize: FS(1.4),
    color: colors.Primary,
    fontFamily: 'OpenSans-Bold',
    marginLeft: WP(1.5),
  },
  addTaskTextDisabled: {
    color: '#CCCCCC',
  },
  
  // Empty state - Professional
  emptyTasksContainer: {
    alignItems: 'center',
    padding: WP(8),
    backgroundColor: colors.White,
    borderRadius: WP(2),
    borderWidth: 2,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
  },
  emptyTasksTitle: {
    fontSize: FS(1.7),
    color: '#333333',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(1.5),
    marginBottom: HP(0.8),
  },
  emptyTasksDesc: {
    fontSize: FS(1.4),
    color: '#666666',
    fontFamily: 'OpenSans-Regular',
    textAlign: 'center',
    lineHeight: HP(2.2),
  },
  
  // Professional Task container
  tasksContainer: {
    marginTop: HP(0.5),
  },
  taskWrapper: {
    marginBottom: HP(1.5),
  },
  
  // Professional Task Card Design
  professionalTaskCard: {
    borderRadius: WP(2.133),
    padding: WP(4),
    marginBottom: HP(0.8),
  },
  
  // Professional Task Header
  professionalTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: HP(1.2),
  },
  taskNumberSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskLevelIndicator: {
    width: WP(6),
    height: WP(6),
    borderRadius: WP(3),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: WP(2.5),
  },
  taskLevelText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Bold',
  },
  professionalTaskNumber: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    marginRight: WP(2),
  },
  professionalExpandButton: {
    padding: WP(0.5),
    marginLeft: WP(1),
  },
  
  // Remove Button with Background
  professionalRemoveButton: {
    backgroundColor: '#FFE5E5',
    padding: WP(1.5),
    borderRadius: WP(1),
    elevation: 1,
    shadowColor: colors.Shadow,
    shadowOffset: { width: 0, height: HP(0.1) },
    shadowOpacity: 0.1,
    shadowRadius: WP(1),
  },
  
  // Professional Input Design with Background and Shadow
  professionalInputWrapper: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    marginBottom: HP(1.2),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: { width: 0, height: HP(0.25) },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  professionalTaskInput: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    paddingHorizontal: WP(3),
    paddingVertical: HP(1.2),
    minHeight: HP(3.5),
  },
  
  // Professional Date Row - Combined Date and Add Subtask
  professionalDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: HP(0.5),
  },
  
  // Professional Date Button with Background and Shadow
  professionalDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.White,
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.8),
    borderRadius: WP(2.133),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: { width: 0, height: HP(0.25) },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    flex: 0.45,
  },
  professionalDateText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: '#333333',
    marginLeft: WP(1.5),
  },
  
  // Subtask count
  subtaskCount: {
    backgroundColor: colors.White,
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.8),
    borderRadius: WP(2.133),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: { width: 0, height: HP(0.25) },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    flex: 0.45,
    alignItems: 'center',
  },
  subtaskCountText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
  },
  
  // Professional Add Subtask Button - Right Side
  professionalAddSubtaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.White,
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.8),
    borderRadius: WP(2.133),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: { width: 0, height: HP(0.25) },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    flex: 0.45,
  },
  professionalAddSubtaskText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    marginLeft: WP(1),
  },
  
  // Professional Child Container
  professionalChildContainer: {
    marginTop: HP(1),
  },
});

export default ChallengeScreen;
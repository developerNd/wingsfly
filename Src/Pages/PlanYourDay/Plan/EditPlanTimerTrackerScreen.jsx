import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert, 
  FlatList,
  Platform,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Headers from '../../../Components/Headers';
import DatePickerModal from '../../../Components/DatePickerModal';
import ReminderModal from '../../../Components/ReminderModal';
import CustomToast from '../../../Components/CustomToast';
import TaskSkeleton from '../../../Components/TaskSkeleton';
import {HP, WP, FS} from '../../../utils/dimentions';
import {colors, Icons} from '../../../Helper/Contants';
import {planYourDayService} from '../../../services/api/planYourDayService';
import {useAuth} from '../../../contexts/AuthContext';
import ReminderScheduler from '../../../services/notifications/ReminderScheduler';
import taskConfirmationAlarmManager from '../../../services/TaskConfirmation/taskConfirmationAlarmManager';

const EditPlanTimerTrackerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  // Get plan data from route params
  const {planData, planId} = route.params;

  // Loading state
  const [loading, setLoading] = useState(true);

  // NEW: Track if auto-open has been triggered
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Task name states
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [taskNameFocused, setTaskNameFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);

  // Schedule states
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [endDateSelected, setEndDateSelected] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Start Time states
  const [startTime, setStartTime] = useState(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());

  // Feature toggles
  const [addReminder, setAddReminder] = useState(false);
  const [addToGoogleCalendar, setAddToGoogleCalendar] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderData, setReminderData] = useState(null);

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  // Store category for alarm scheduling
  const [category, setCategory] = useState('Work and Career');

  // Label states
  const isTaskNameLabelActive = taskNameFocused || taskName.length > 0;
  const isDescriptionLabelActive = descriptionFocused || description.length > 0;

  // Load existing plan data on mount
  useEffect(() => {
    loadPlanData();
  }, []);

  const loadPlanData = async () => {
    try {
      setLoading(true);
      
      // Fetch complete plan data from database
      const plan = await planYourDayService.getPlanYourDayById(planId);
      
      if (plan) {
        // Basic information
        setTaskName(plan.title || '');
        setDescription(plan.note || plan.description || '');
        setCategory(plan.category || 'Work and Career');

        // Start date
        if (plan.start_date) {
          setStartDate(new Date(plan.start_date));
        }

        // End date
        if (plan.is_end_date_enabled && plan.end_date) {
          setEndDateSelected(true);
          setEndDate(new Date(plan.end_date));
        } else {
          setEndDateSelected(false);
        }

        // Load start time
        if (plan.start_time) {
          setStartTime(plan.start_time);
        }

        // Reminder data
        if (plan.reminder_enabled && plan.reminder_data) {
          setAddReminder(true);
          setReminderData(typeof plan.reminder_data === 'string'
            ? JSON.parse(plan.reminder_data)
            : plan.reminder_data
          );
        }

        // Google Calendar
        setAddToGoogleCalendar(plan.add_to_google_calendar || false);
      }

      setLoading(false);
      
      // NEW: Auto-open Start Time picker if triggered from reschedule
      if (route.params?.fromReschedule && !hasAutoOpened) {
        console.log('[EDIT TIMER TRACKER] Auto-opening Start Time picker from reschedule');
        setHasAutoOpened(true);
        // Small delay to ensure UI is ready
        setTimeout(() => {
          handleStartTimePress();
        }, 500);
      }
    } catch (error) {
      console.error('Error loading plan data:', error);
      Alert.alert('Error', 'Failed to load plan data');
      setLoading(false);
      navigation.goBack();
    }
  };

  // Load data when screen comes into focus (when returning from navigation)
  useFocusEffect(
    React.useCallback(() => {
      if (route.params && route.params.timerTrackerData) {
        const data = deserializeDatesFromNavigation(route.params.timerTrackerData);
        
        if (data.taskName) setTaskName(data.taskName);
        if (data.description) setDescription(data.description);
        if (data.startDate) setStartDate(data.startDate);
        if (data.endDate) setEndDate(data.endDate);
        if (data.endDateSelected !== undefined) setEndDateSelected(data.endDateSelected);
        if (data.startTime) setStartTime(data.startTime);
        if (data.reminderData) setReminderData(data.reminderData);
        if (data.addReminder !== undefined) setAddReminder(data.addReminder);
        if (data.addToGoogleCalendar !== undefined) setAddToGoogleCalendar(data.addToGoogleCalendar);
      }
    }, [route.params]),
  );

  // Toast helper functions
  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  // Helper functions for date serialization
  const serializeDatesForNavigation = data => {
    if (!data) return data;
    const serialized = {...data};
    if (serialized.startDate instanceof Date) {
      serialized.startDate = serialized.startDate.toISOString();
    }
    if (serialized.endDate instanceof Date) {
      serialized.endDate = serialized.endDate.toISOString();
    }
    return serialized;
  };

  const deserializeDatesFromNavigation = data => {
    if (!data) return data;
    const deserialized = {...data};
    if (typeof deserialized.startDate === 'string') {
      deserialized.startDate = new Date(deserialized.startDate);
    }
    if (typeof deserialized.endDate === 'string') {
      deserialized.endDate = new Date(deserialized.endDate);
    }
    return deserialized;
  };

  // Handle task name change
  const handleTaskNameChange = text => {
    setTaskName(text);
    if (toastVisible) {
      hideToast();
    }
  };

  // Format time for display
  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return 'Set Time';
    
    const timeParts = timeString.split(':');
    let hour = parseInt(timeParts[0]);
    const minute = timeParts[1];
    
    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    
    return `${hour}:${minute} ${period}`;
  };

  // Handle start time selection
  const handleStartTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }

    if (event.type === 'set' && selectedTime) {
      // Convert Date to time string (HH:MM:SS)
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      const timeString = `${hours}:${minutes}:00`;
      
      setStartTime(timeString);
      
      if (Platform.OS === 'ios') {
        setShowStartTimePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowStartTimePicker(false);
    }
  };

  // Open time picker
  const handleStartTimePress = () => {
    // Set initial time for picker
    if (startTime) {
      const timeParts = startTime.split(':');
      const date = new Date();
      date.setHours(parseInt(timeParts[0]));
      date.setMinutes(parseInt(timeParts[1]));
      setTempTime(date);
    } else {
      setTempTime(new Date());
    }
    setShowStartTimePicker(true);
  };

  // Date formatting functions
  const formatDisplayDate = date => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return 'Today';
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();

    return `${dayName}, ${monthName} ${day}`;
  };

  const formatDateForEndDate = date => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const calculateDaysDifference = (startDate, endDate) => {
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Date handlers
  const handleStartDateSelect = date => {
    setStartDate(date);
    setShowStartDatePicker(false);
  };

  const handleEndDateSelect = date => {
    setEndDate(date);
    setEndDateSelected(true);
    setShowEndDatePicker(false);
  };

  const handleEndDateToggle = () => {
    if (endDateSelected) {
      setEndDateSelected(false);
    } else {
      setShowEndDatePicker(true);
    }
  };

  // Reminder handlers
  const handleReminderToggle = () => {
    if (addReminder) {
      setAddReminder(false);
      setReminderData(null);
    } else {
      setShowReminderModal(true);
    }
  };

  const handleReminderSave = data => {
    setReminderData(data);
    setAddReminder(data.enabled);
  };

  const handleReminderClose = () => {
    setShowReminderModal(false);
  };

  // UPDATED: Handle Update press with task confirmation alarm scheduling
  const handleUpdatePress = async () => {
    if (toastVisible) {
      hideToast();
    }

    // Validation
    if (!taskName.trim()) {
      showToast('Enter a task name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please log in to update Plan Your Day.');
      return;
    }

    try {
      // Prepare updated plan data (using correct database column names)
      const updatedPlanData = {
        title: taskName.trim(),
        description: description.trim(),
        note: description.trim() || '',
        category: category,

        // Scheduling settings
        start_date: startDate
          ? new Date(startDate).toISOString().split('T')[0]
          : null,
        end_date: endDateSelected && endDate
          ? new Date(endDate).toISOString().split('T')[0]
          : null,
        is_end_date_enabled: endDateSelected,
        start_time: startTime,

        // Evaluation type
        evaluation_type: 'timerTracker',

        // Additional features
        add_to_google_calendar: addToGoogleCalendar || false,
      };

      // Add reminder data if enabled
      if (addReminder && reminderData) {
        updatedPlanData.reminder_enabled = true;
        updatedPlanData.reminder_data = reminderData;
      } else {
        updatedPlanData.reminder_enabled = false;
        updatedPlanData.reminder_data = null;
      }

      console.log('Updating Plan Your Day Timer Tracker:', updatedPlanData);

      // Update plan in database
      const updatedPlan = await planYourDayService.updatePlanYourDay(planId, updatedPlanData);
      console.log('Plan updated successfully:', updatedPlan);

      // Schedule task confirmation alarm if start time is available
      if (startTime && startDate) {
        try {
          console.log('Scheduling task confirmation alarm for timer tracker...');
          
          const confirmationResult = await taskConfirmationAlarmManager.scheduleConfirmationAlarm({
            id: updatedPlan.id,
            title: taskName.trim(),
            description: description.trim(),
            start_date: new Date(startDate).toISOString().split('T')[0],
            start_time: startTime, // Already in HH:MM:SS format
            category: category,
            evaluationType: 'timerTracker',
          });

          if (confirmationResult.success) {
            console.log('Task confirmation alarm scheduled:', confirmationResult.data);
          } else {
            console.warn('Failed to schedule confirmation alarm:', confirmationResult.error);
          }
        } catch (confirmError) {
          console.error('Error scheduling task confirmation:', confirmError);
        }
      }

      // Schedule reminders if enabled
      let reminderMessage = '';
      if (updatedPlanData.reminder_enabled && updatedPlanData.reminder_data) {
        try {
          const userProfile = {
            username: user?.user_metadata?.display_name || user?.user_metadata?.username || user?.email?.split('@')[0],
            display_name: user?.user_metadata?.display_name,
            user_metadata: user?.user_metadata,
            email: user?.email,
          };

          const scheduledReminders = await ReminderScheduler.scheduleTaskReminders(
            {
              ...updatedPlanData,
              userProfile: userProfile,
            },
            updatedPlan,
          );

          if (scheduledReminders.length > 0) {
            reminderMessage = ` ${scheduledReminders.length} reminder(s) scheduled.`;
          }
        } catch (reminderError) {
          console.error('Error scheduling reminders:', reminderError);
          reminderMessage = ' (Note: Reminders could not be scheduled)';
        }
      }

      // Show success message
      Alert.alert('Success', `Plan Your Day Timer Tracker updated successfully!${reminderMessage}`, [
        {
          text: 'OK',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{name: 'BottomTab', params: {planUpdated: true}}],
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Error updating Plan Your Day Timer Tracker:', error);
      Alert.alert('Error', 'Failed to update plan. Please try again.');
    }
  };

  // Toggle component
  const renderToggle = (isEnabled, onToggle) => {
    return (
      <TouchableOpacity
        style={styles.toggleContainer}
        onPress={onToggle}
        activeOpacity={0.7}>
        <View
          style={[
            styles.toggleTrack,
            isEnabled ? styles.toggleTrackActive : styles.toggleTrackInactive,
          ]}>
          <View
            style={[
              styles.toggleSwitch,
              isEnabled ? styles.toggleSwitchActive : styles.toggleSwitchInactive,
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Option row component
  const renderOptionRow = (
    iconSource,
    title,
    hasToggle = false,
    toggleState = false,
    onTogglePress = null,
    hasPlus = false,
    onPlusPress = null,
    subtitle = null,
    customRight = null,
    onRowPress = null,
  ) => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity
          style={styles.optionRow}
          activeOpacity={onRowPress ? 0.7 : hasToggle || hasPlus ? 1 : 0.7}
          onPress={onRowPress || (() => {})}>
          <View style={styles.optionLeft}>
            {iconSource && (
              <Image
                source={iconSource}
                style={styles.optionIcon}
                resizeMode="contain"
              />
            )}
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, !iconSource && styles.addTitle]}>{title}</Text>
              {subtitle && (
                <Text style={[styles.optionSubtitle, !iconSource && styles.optionSubtitle1]}>{subtitle}</Text>
              )}
            </View>
          </View>

          <View style={styles.optionRight}>
            {hasToggle && renderToggle(toggleState, onTogglePress)}
            {hasPlus && (
              <TouchableOpacity
                onPress={onPlusPress}
                style={styles.plusButton}
                activeOpacity={0.7}>
                <Image
                  source={Icons.Plus}
                  style={styles.plusIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
            {customRight && customRight}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // End date section component
  const renderEndDateSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
          <View style={styles.optionLeft}>
            <Image
              source={Icons.Set}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>End Date</Text>
            </View>
          </View>

          <View style={styles.optionRight}>
            {renderToggle(endDateSelected, handleEndDateToggle)}
          </View>
        </TouchableOpacity>

        {endDateSelected && (
          <View style={styles.endDateDetailsContainer}>
            <TouchableOpacity
              onPress={() => setShowEndDatePicker(true)}
              style={styles.endDateDetailRow}
              activeOpacity={0.7}>
              <Text style={styles.endDateLabel}>
                {formatDateForEndDate(endDate)}
              </Text>
              <View style={styles.daysDifferenceContainer}>
                <Text style={styles.daysDifferenceNumber}>
                  {calculateDaysDifference(startDate, endDate)}
                </Text>
                <Text style={styles.daysDifferenceText}>days.</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

        {/* Header */}
        <View style={styles.headerWrapper}>
          <Headers title="Edit Timer Tracker">
            <View style={{width: WP(15)}} />
          </Headers>
        </View>

        {/* TaskSkeleton Loading */}
        <FlatList
          data={[1, 2, 3, 4, 5, 6, 7, 8]}
          keyExtractor={(item, index) => `skeleton-${index}`}
          renderItem={() => <TaskSkeleton />}
          contentContainerStyle={{paddingHorizontal: WP(4.533), paddingTop: HP(2)}}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <Headers title="Edit Timer Tracker">
          <TouchableOpacity onPress={handleUpdatePress}>
            <Text style={styles.doneText}>Update</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Name Input */}
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isTaskNameLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}>
            Task Name
          </Text>
          <TextInput
            style={styles.textInput}
            value={taskName}
            onChangeText={handleTaskNameChange}
            onFocus={() => setTaskNameFocused(true)}
            onBlur={() => setTaskNameFocused(false)}
            placeholder=""
            placeholderTextColor="#625F5F"
            maxLength={70}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isDescriptionLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}>
            Description (Optional)
          </Text>
          <TextInput
            style={styles.textInput}
            value={description}
            onChangeText={setDescription}
            onFocus={() => setDescriptionFocused(true)}
            onBlur={() => setDescriptionFocused(false)}
            placeholder=""
            placeholderTextColor="#625F5F"
            multiline={true}
            maxLength={200}
          />
        </View>

        {/* Start Date */}
        {renderOptionRow(
          Icons.Set,
          'Start Date',
          false,
          false,
          null,
          false,
          null,
          null,
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDisplayDate(startDate)}</Text>
          </View>,
          () => setShowStartDatePicker(true),
        )}

        {/* Start Time */}
        {renderOptionRow(
          Icons.Clock,
          'Start Time',
          false,
          false,
          null,
          false,
          null,
          null,
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatTimeForDisplay(startTime)}</Text>
          </View>,
          handleStartTimePress,
        )}

        {/* End Date Section */}
        {renderEndDateSection()}

        {/* Add a Reminder */}
        {renderOptionRow(
          null,
          'Add a Reminder',
          true,
          addReminder,
          handleReminderToggle,
          false,
          null,
          reminderData && addReminder
            ? `${reminderData.type === 'notification'
                ? '🔔 Notification'
                : reminderData.type === 'alarm'
                ? '⏰ Alarm'
                : '🔕 No reminder'} at ${reminderData.time}`
            : null,
        )}

        {/* Add to Google Calendar */}
        <View style={styles.calendarContainer}>
          <View
            style={[
              styles.optionContainer,
              addToGoogleCalendar ? styles.noBottomBorder : null,
            ]}>
            <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
              <View style={styles.optionLeft}>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Add to Google Calendar</Text>
                </View>
              </View>
              <View>
                {renderToggle(addToGoogleCalendar, () =>
                  setAddToGoogleCalendar(!addToGoogleCalendar),
                )}
              </View>
            </TouchableOpacity>
          </View>

          {addToGoogleCalendar && (
            <View style={[styles.optionContainer, styles.connectedContainer]}>
              <TouchableOpacity style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle1}>Select Calendar</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Date Picker Modals */}
      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onDateSelect={handleStartDateSelect}
        initialDate={startDate}
        title="Select Start Date"
      />

      <DatePickerModal
        visible={showEndDatePicker}
        onClose={() => setShowEndDatePicker(false)}
        onDateSelect={handleEndDateSelect}
        initialDate={endDate}
        title="Select End Date"
      />

      {/* Native Time Picker */}
      {showStartTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartTimeChange}
        />
      )}

      {/* Reminder Modal */}
      <ReminderModal
        visible={showReminderModal}
        onClose={handleReminderClose}
        onSave={handleReminderSave}
        initialData={reminderData}
        blockTimeData={null}
      />

      {/* Custom Toast */}
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
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  headerWrapper: {
    marginTop: HP(2),
    paddingBottom: HP(0.625),
  },
  doneText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(4.533),
    paddingTop: HP(2),
  },
  inputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    padding: WP(2.133),
    marginBottom: HP(2),
    elevation: 5,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.White,
    height: HP(6.3),
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
    left: WP(2),
    fontSize: FS(1.5),
    color: '#625F5F',
    fontFamily: 'OpenSans-Bold',
  },
  inputLabelInactive: {
    top: HP(1.7),
    left: WP(2.5),
    fontSize: FS(1.7),
    color: '#625F5F',
    fontFamily: 'OpenSans-SemiBold',
  },
  textInput: {
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-SemiBold',
    color: '#625F5F',
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(2.133),
  },
  optionContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    padding: WP(2.133),
    marginBottom: HP(0.9),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minHeight: HP(4.375),
  },
  noBottomBorder: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  connectedContainer: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: 0,
    position: 'relative',
    borderTopWidth: 0,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(1),
    marginLeft: WP(-0.5),
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: WP(4.8),
    height: WP(4.8),
    marginRight: WP(3),
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    paddingVertical: HP(0.75),
  },
  optionTitle1: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    paddingVertical: HP(0.5),
    top: -2,
  },
  addTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    paddingVertical: HP(0.8),
    marginLeft: WP(3),
  },
  optionSubtitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(-0.4),
  },
  optionSubtitle1: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(-0.4),
    marginLeft: WP(2.3),
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContainer: {
    backgroundColor: '#EFEFEF',
    paddingHorizontal: WP(5),
    paddingVertical: HP(1),
    borderRadius: WP(1.5),
    marginRight: WP(-1.5),
  },
  dateText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#5F5F5F',
  },
  plusButton: {
    padding: WP(0.5),
  },
  plusIcon: {
    width: WP(3.7),
    height: WP(3.7),
    tintColor: '#646464',
  },
  toggleContainer: {
    width: WP(8.0),
    height: HP(2.0),
    position: 'relative',
    justifyContent: 'center',
    marginRight: WP(-0.8),
  },
  toggleTrack: {
    width: WP(8.0),
    height: HP(2.0),
    borderRadius: WP(2.7),
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  toggleTrackActive: {
    backgroundColor: colors.Primary,
  },
  toggleTrackInactive: {
    backgroundColor: '#CAC9C9',
  },
  toggleSwitch: {
    width: WP(3),
    height: WP(3),
    borderRadius: WP(1.5),
    position: 'absolute',
    top: HP(0.25),
    left: WP(0.5),
  },
  toggleSwitchActive: {
    backgroundColor: colors.White,
    left: WP(4.2),
  },
  toggleSwitchInactive: {
    backgroundColor: colors.White,
    left: WP(0.5),
  },
  endDateDetailsContainer: {},
  endDateDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: WP(2),
    paddingVertical: HP(0.8),
  },
  endDateLabel: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    letterSpacing: 0.5,
    marginRight: WP(4),
    backgroundColor: '#EFEFEF',
    paddingHorizontal: WP(2),
    paddingVertical: HP(0.6),
    borderRadius: WP(2.2),
  },
  daysDifferenceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  daysDifferenceNumber: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    textAlign: 'center',
    marginRight: WP(3),
    borderBottomWidth: 2,
    borderColor: '#F0F0F0',
    minWidth: WP(14),
  },
  daysDifferenceText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
  },
  calendarContainer: {
    marginBottom: HP(0.9),
  },
  bottomSpacer: {
    height: HP(3),
  },
});

export default EditPlanTimerTrackerScreen;
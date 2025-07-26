import React, {useState} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Headers from '../../../Components/Headers';
import CustomDropdown from '../../../Components/Dropdown';
import TimePicker from '../../../Components/TimePicker';
import DatePickerModal from '../../../Components/DatePickerModal';
import BlockTimeModal from '../../../Components/BlockTime';
import ReminderModal from '../../../Components/ReminderModal';
import NoteModal from '../../../Components/NoteModal';
import {HP, WP, FS} from '../../../utils/dimentions';
import {colors, Icons} from '../../../Helper/Contants';

const RecurringTimerScreen = () => {
  const navigation = useNavigation();

  // Task form states
  const [habit, setHabit] = useState('');
  const [description, setDescription] = useState('');
  const [habitFocused, setHabitFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Work and Career');
  const [priority, setPriority] = useState('');
  const [note, setNote] = useState('');
  const [isPendingTask, setIsPendingTask] = useState(false);

  // Dropdown and time states
  const [selectedDropdownValue, setSelectedDropdownValue] =
    useState('At Least');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Feature states
  const [addPomodoro, setAddPomodoro] = useState(false);
  const [addReminder, setAddReminder] = useState(false);
  const [addToGoogleCalendar, setAddToGoogleCalendar] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [blockTimeData, setBlockTimeData] = useState(null);
  const [reminderData, setReminderData] = useState(null);

  // Date picker states
  const [startDate, setStartDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  const dropdownOptions = ['At Least', 'Less than', 'Any Value'];

  const priorityOptions = [
    {
      label: 'Must',
      value: 'Must',
      backgroundColor: '#EFCCCC',
      textColor: '#AF0000',
    },
    {
      label: 'Important',
      value: 'Important',
      backgroundColor: '#D0D1E3',
      textColor: colors.Primary,
    },
  ];

  // Check if habit label should be active
  const isHabitLabelActive = habitFocused || habit.length > 0;

  // Handle dropdown selection
  const handleDropdownSelect = value => {
    setSelectedDropdownValue(value);
  };

  // Handle time selection
  const handleTimeSelect = time => {
    setSelectedTime(time);
  };

  // Handle Next button press
  const handleNextPress = () => {
    const taskData = {
      habit,
      description,
      selectedCategory,
      selectedDropdownValue,
      selectedTime,
      startDate,
      blockTimeData,
      addPomodoro,
      priority,
      note,
      isPendingTask,
      reminderData,
      addReminder,
      addToGoogleCalendar,
    };

    console.log('Task data:', taskData);
    // Navigate to next screen
    // navigation.navigate("NextScreen", taskData);
  };

  // Date formatting
  const formatDisplayDate = date => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return 'Today';
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();

    return `${dayName}, ${monthName} ${day}`;
  };

  const formatDisplayTime = time => {
    const {hours, minutes} = time;
    if (hours === 0 && minutes === 0) {
      return '00:00';
    }
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  };

  // Event handlers
  const handleStartDateSelect = date => {
    setStartDate(date);
    setShowStartDatePicker(false);
  };

  const handleBlockTimePress = () => {
    setShowBlockTimeModal(true);
  };

  const handleBlockTimeSave = timeData => {
    setBlockTimeData(timeData);
  };

  const handlePriorityPress = () => {
    setShowPriorityDropdown(!showPriorityDropdown);
  };

  const handlePrioritySelect = selectedPriority => {
    setPriority(selectedPriority.value);
    setShowPriorityDropdown(false);
  };

  const handleNotePress = () => {
    setShowNoteModal(true);
  };

  const handleNoteSave = noteText => {
    setNote(noteText);
  };

  const handleReminderToggle = () => {
    if (addReminder) {
      setAddReminder(false);
      setReminderData(null);
    } else {
      setAddReminder(true);
      setShowReminderModal(true);
    }
  };

  const handleReminderSave = data => {
    setReminderData(data);
    setAddReminder(data.enabled);
  };

  const handleReminderClose = () => {
    setShowReminderModal(false);
    if (!reminderData) {
      setAddReminder(false);
    }
  };

  const handleLinkToGoalPress = () => {
    navigation.navigate('LinkGoal');
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
              isEnabled
                ? styles.toggleSwitchActive
                : styles.toggleSwitchInactive,
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <Headers title="Define Your Task">
          <TouchableOpacity onPress={handleNextPress}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{paddingBottom: HP(3)}}
        showsVerticalScrollIndicator={false}>
        {/* Habit Input with Floating Label */}
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isHabitLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}>
            Habit
          </Text>
          <TextInput
            style={styles.textInput}
            value={habit}
            onChangeText={setHabit}
            onFocus={() => setHabitFocused(true)}
            onBlur={() => setHabitFocused(false)}
            placeholder=""
            placeholderTextColor="#575656"
          />
        </View>

        {/* Custom Dropdown */}
        <CustomDropdown
          options={dropdownOptions}
          defaultValue="At Least"
          onSelect={handleDropdownSelect}
          placeholder="Select option"
        />

        {/* Time Display Container */}
        <View style={styles.timeMainContainer}>
          <TouchableOpacity
            style={styles.timeDisplayContainer}
            onPress={() => setShowTimePicker(true)}>
            <Text style={styles.timeDisplayText}>
              {formatDisplayTime(selectedTime)}
            </Text>
          </TouchableOpacity>
          <Text style={styles.dayText}>a day.</Text>
        </View>

        {/* Example Text */}
        <Text style={styles.exampleText}>
          e.g. Study for the exam. At least 2 chapters a day
        </Text>

        {/* Description Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor="#575656"
            multiline={true}
          />
        </View>

        {/* Category */}
        <View style={styles.optionContainer}>
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Category}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Category</Text>
              </View>
            </View>

            <View style={styles.categoryRight}>
              <Text style={styles.categoryText}>{selectedCategory}</Text>
              <Image
                source={Icons.Taskhome}
                style={styles.categoryIcon}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* Start Date */}
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setShowStartDatePicker(true)}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Set}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Start Date</Text>
              </View>
            </View>

            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>
                {formatDisplayDate(startDate)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Block Time */}
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={handleBlockTimePress}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Alarm}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Block Time</Text>
                {blockTimeData && (
                  <Text style={styles.optionSubtitle}>
                    {blockTimeData.startTime} - {blockTimeData.endTime}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleBlockTimePress}
              style={styles.plusButton}>
              <Image
                source={Icons.Plus}
                style={styles.plusIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Add Pomodoro */}
        <View style={styles.optionContainer}>
          <TouchableOpacity style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Clock}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Add Pomodoro</Text>
              </View>
            </View>

            <MaterialIcons
              name="keyboard-arrow-down"
              size={WP(6)}
              color="#646464"
            />
          </TouchableOpacity>
        </View>

        {/* Priority */}
        <View
          style={[
            styles.optionContainer,
            showPriorityDropdown && styles.priorityContainerExpanded,
          ]}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={handlePriorityPress}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Flag}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Priority</Text>
              </View>
            </View>

            <MaterialIcons
              name={
                showPriorityDropdown
                  ? 'keyboard-arrow-up'
                  : 'keyboard-arrow-down'
              }
              size={WP(6)}
              color="#646464"
            />
          </TouchableOpacity>

          {showPriorityDropdown && (
            <View style={styles.priorityDropdown}>
              <View style={styles.priorityButtonsContainer}>
                {priorityOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.priorityButton,
                      {backgroundColor: option.backgroundColor},
                      priority === option.value &&
                        styles.priorityButtonSelected,
                    ]}
                    onPress={() => handlePrioritySelect(option)}>
                    <Text
                      style={[
                        styles.priorityButtonText,
                        {color: option.textColor},
                      ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Note */}
        <View style={styles.optionContainer}>
          <TouchableOpacity style={styles.optionRow} onPress={handleNotePress}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Note}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Note</Text>
                {note && (
                  <Text style={styles.optionSubtitle} numberOfLines={1}>
                    {note}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Pending Task */}
        <View style={styles.optionContainer}>
          <TouchableOpacity style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Pending}
                style={styles.optionIcon1}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Pending Task</Text>
                <Text style={styles.pendingSubtitle}>
                  It will be shown each day until completed.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.radioButton}
              onPress={() => setIsPendingTask(!isPendingTask)}>
              <View
                style={[
                  styles.radioOuter,
                  isPendingTask && styles.radioOuterSelected,
                ]}>
                {isPendingTask && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Link To Goal */}
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={handleLinkToGoalPress}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Link}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Link To Goal</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.plusButton}
              onPress={handleLinkToGoalPress}>
              <Image
                source={Icons.Plus}
                style={styles.plusIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Add a Reminder */}
        <View style={styles.optionContainer}>
          <TouchableOpacity style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <View style={styles.optionTextContainer}>
                <Text style={styles.addTitle}>Add a Reminder</Text>
                {reminderData && addReminder && (
                  <Text style={styles.optionSubtitle}>
                    {reminderData.type === 'notification'
                      ? '🔔 Notification'
                      : reminderData.type === 'alarm'
                      ? '⏰ Alarm'
                      : '🔕 No reminder'}{' '}
                    at {reminderData.time}
                  </Text>
                )}
              </View>
            </View>

            {renderToggle(addReminder, handleReminderToggle)}
          </TouchableOpacity>
        </View>

        {/* Add to Google Calendar */}
        <View style={styles.calendarContainer}>
          <View
            style={[
              styles.optionContainer,
              addToGoogleCalendar ? styles.noBottomBorder : null,
            ]}>
            <TouchableOpacity style={styles.optionRow}>
              <View style={styles.optionLeft}>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Add to Google Calendar</Text>
                </View>
              </View>

              {renderToggle(addToGoogleCalendar, () =>
                setAddToGoogleCalendar(!addToGoogleCalendar),
              )}
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

        <View style={styles.bottomSpacer} />

        {/* Progress Indicator */}
        <View style={styles.progressIndicator}>
          <View style={styles.progressDotCompleted}>
            <MaterialIcons name="check" size={WP(3.2)} color={colors.White} />
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressDotActive}>
            <View style={styles.progressDotActiveInner}>
              <Text style={styles.progressDotTextActive}>2</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <TimePicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onTimeSelect={handleTimeSelect}
        initialTime={selectedTime}
      />

      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onDateSelect={handleStartDateSelect}
        initialDate={startDate}
        title="Select Start Date"
      />

      <BlockTimeModal
        visible={showBlockTimeModal}
        onClose={() => setShowBlockTimeModal(false)}
        onSave={handleBlockTimeSave}
      />

      <ReminderModal
        visible={showReminderModal}
        onClose={handleReminderClose}
        onSave={handleReminderSave}
        initialData={reminderData}
      />

      <NoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSave={handleNoteSave}
        initialNote={note}
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
    marginTop: HP(2.5),
    paddingBottom: HP(0.625),
  },
  nextText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(4.533),
    paddingTop: HP(2.8),
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
    fontSize: FS(1.7),
    color: '#666666',
    fontFamily: 'OpenSans-Bold',
  },
  inputLabelInactive: {
    top: HP(1.5),
    left: WP(3.2),
    fontSize: FS(1.9),
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
  timeMainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1.7),
  },
  timeDisplayContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    paddingHorizontal: WP(17),
    paddingVertical: HP(2),
    marginRight: WP(4.0),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.125),
    },
    shadowOpacity: 0.05,
    shadowRadius: WP(0.533),
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  timeDisplayText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    textAlign: 'center',
  },
  dayText: {
    fontSize: FS(1.625),
    fontFamily: 'OpenSans-SemiBold',
    color: '#929292',
  },
  exampleText: {
    fontSize: FS(1.25),
    fontFamily: 'OpenSans-SemiBold',
    color: '#A3A3A3',
    marginBottom: HP(2.0),
    lineHeight: HP(2.25),
    textAlign: 'center',
  },
  descriptionInput: {
    fontSize: FS(1.75),
    fontFamily: 'OpenSans-Regular',
    color: '#575656',
    minHeight: HP(2.0),
    paddingVertical: HP(0.4375),
    paddingHorizontal: WP(2.667),
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
    minHeight: HP(6.6),
    justifyContent: 'center',
  },
  priorityContainerExpanded: {
    minHeight: HP(12),
    paddingBottom: HP(1.5),
  },
  noBottomBorder: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    borderBottomWidth: 1,
  },
  connectedContainer: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: 0,
    borderTopWidth: 0,
    height: HP(5.5),
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
  categoryRight: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexDirection: 'row',
    position: 'absolute',
    right: WP(-0.5),
  },
  optionIcon: {
    width: WP(4.8),
    height: WP(4.8),
    marginRight: WP(2),
  },
  optionIcon1: {
    width: WP(4.8),
    height: WP(4.8),
    marginRight: WP(2),
    marginBottom: HP(1),
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
    marginLeft: WP(4),
  },
  optionSubtitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(-0.4),
  },
  pendingSubtitle: {
    fontSize: FS(1.28),
    fontFamily: 'OpenSans-Regular',
    color: '#8A8A8A',
    marginTop: HP(-1),
    marginBottom: HP(0.8),
  },
  categoryText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    marginRight: WP(2),
  },
  categoryIcon: {
    width: WP(12),
    height: WP(12),
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
    marginRight: WP(2),
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
  radioButton: {
    padding: WP(1),
  },
  radioOuter: {
    width: WP(4.5),
    height: WP(4.5),
    borderRadius: WP(2.25),
    borderWidth: 2,
    borderColor: '#595959',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.Primary,
  },
  radioInner: {
    width: WP(2.5),
    height: WP(2.5),
    borderRadius: WP(1.25),
    backgroundColor: colors.Primary,
  },
  bottomSpacer: {
    height: HP(3),
  },
  calendarContainer: {
    // Container for calendar sections
  },
  priorityDropdown: {
    paddingTop: HP(1),
    paddingHorizontal: WP(10),
  },
  priorityButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  priorityButton: {
    paddingVertical: HP(1.2),
    borderRadius: WP(2),
    width: WP(28.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityButtonSelected: {
    opacity: 0.8,
    transform: [{scale: 0.95}],
  },
  priorityButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HP(2),
  },
  progressDotCompleted: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.65),
    backgroundColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: WP(0.5),
    borderColor: colors.Primary,
  },
  progressDotActive: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.6),
    backgroundColor: colors.White,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: WP(0.68),
    borderColor: colors.Primary,
  },
  progressDotActiveInner: {
    width: WP(3.6),
    height: WP(3.6),
    borderRadius: WP(1.85),
    backgroundColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotTextActive: {
    color: colors.White,
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Bold',
  },
  progressDotInactive: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.65),
    backgroundColor: 'transparent',
    borderWidth: WP(0.5),
    borderColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotTextInactive: {
    color: colors.Primary,
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Bold',
  },
  progressLine: {
    width: WP(5.3),
    height: HP(0.16),
    marginLeft: WP(0.5),
    marginRight: WP(0.5),
    backgroundColor: colors.Primary,
  },
});

export default RecurringTimerScreen;

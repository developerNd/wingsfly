import React, {useState} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useRoute} from '@react-navigation/native';
import Headers from '../../../Components/Headers';
import DatePickerModal from '../../../Components/DatePickerModal';
import BlockTimeModal from '../../../Components/BlockTime';
import ReminderModal from '../../../Components/ReminderModal';
import NoteModal from '../../../Components/NoteModal';
import CustomToast from '../../../Components/CustomToast';
import {colors, Icons} from '../../../Helper/Contants';
import {HP, WP, FS} from '../../../utils/dimentions';

// Custom Dropdown Component
const CustomDropdown = ({
  options = [],
  defaultValue = '',
  onSelect = () => {},
  placeholder = 'Select an option',
  style = {},
  dropdownStyle = {},
  optionStyle = {},
  textStyle = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue);

  const handleOptionSelect = option => {
    setSelectedValue(option);
    setIsOpen(false);
    onSelect(option);
  };

  return (
    <View style={[styles.dropdownWrapper, style]}>
      <TouchableOpacity
        style={[
          styles.dropdownContainer,
          isOpen && styles.dropdownContainerOpen,
          dropdownStyle,
        ]}
        onPress={() => setIsOpen(!isOpen)}>
        <Text
          style={[
            styles.dropdownText,
            !selectedValue && styles.placeholderText,
            textStyle,
          ]}>
          {selectedValue || placeholder}
        </Text>
        <MaterialIcons
          name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={24}
          color="#666666"
        />
      </TouchableOpacity>

      {/* Dropdown Options */}
      {isOpen && (
        <View style={[styles.dropdownOptions, optionStyle]}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dropdownOption,
                index === options.length - 1 && styles.dropdownOptionLast,
              ]}
              onPress={() => handleOptionSelect(option)}>
              <Text
                style={[
                  styles.dropdownOptionText,
                  selectedValue === option && styles.dropdownOptionTextSelected,
                ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const RecurringNumericScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // FIXED: Handle selectedCategory as object or string
  const selectedCategoryParam =
    route.params?.selectedCategory || 'Work and Career';
  const selectedCategory =
    typeof selectedCategoryParam === 'object'
      ? selectedCategoryParam.title ||
        selectedCategoryParam.name ||
        'Work and Career'
      : selectedCategoryParam;

  const evaluationType = route.params?.evaluationType;

  const [habit, setHabit] = useState('');
  const [goal, setGoal] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [habitFocused, setHabitFocused] = useState(false);
  const [goalFocused, setGoalFocused] = useState(false);
  const [selectedDropdownValue, setSelectedDropdownValue] =
    useState('At Least');
  const [priority, setPriority] = useState('');
  const [note, setNote] = useState('');
  const [isPendingTask, setIsPendingTask] = useState(false);

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

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

  const dropdownOptions = ['At Least', 'Less than', 'Exactly', 'Any Value'];

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

  const isHabitLabelActive = habitFocused || habit.length > 0;
  const isGoalLabelActive = goalFocused || goal.length > 0;

  // Toast helper functions
  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  // Validation function
  const validateForm = () => {
    if (!habit.trim()) {
      showToast('Enter a name');
      return false;
    }

    // Check if goal is required based on dropdown selection
    if (selectedDropdownValue !== 'Any Value') {
      if (!goal.trim()) {
        showToast('Enter a value');
        return false;
      }
    }

    if (!blockTimeData) {
      showToast('Select a Block Time');
      return false;
    }

    return true;
  };

  const handleDropdownSelect = value => {
    setSelectedDropdownValue(value);

    if (toastVisible) {
      hideToast();
    }

    console.log('Selected option:', value);
  };

  const handleHabitChange = text => {
    setHabit(text);

    if (toastVisible) {
      hideToast();
    }
  };

  const handleGoalChange = text => {
    setGoal(text);

    if (toastVisible && selectedDropdownValue !== 'Any Value') {
      if (text.trim()) {
        hideToast();
      }
    }
  };

  const handleHabitBlur = () => {
    setHabitFocused(false);
  };

  const handleGoalBlur = () => {
    setGoalFocused(false);
  };

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

  const handleStartDateSelect = date => {
    setStartDate(date);
    setShowStartDatePicker(false);
  };

  const handleBlockTimePress = () => {
    setShowBlockTimeModal(true);
  };

  const handleBlockTimeSave = timeData => {
    setBlockTimeData(timeData);

    if (toastVisible) {
      hideToast();
    }
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

  const handleNextPress = () => {
    if (!validateForm()) {
      return;
    }

    const navigationData = {
      selectedCategory,
      evaluationType,
      habit: habit.trim(),
      goal: goal.trim(),
      unit: unit.trim(),
      description: description.trim(),
      selectedDropdownValue,
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

    // Navigate to next screen
    navigation.navigate('FrequencyScreen', navigationData);
  };

  const handleLinkToGoalPress = () => {
    navigation.navigate('LinkGoal');
  };

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
            <Image
              source={iconSource}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>{title}</Text>
              {subtitle && (
                <Text style={styles.optionSubtitle}>{subtitle}</Text>
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

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
      <View style={styles.headerWrapper}>
        <Headers title="Define Your Task">
          <TouchableOpacity onPress={handleNextPress}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{paddingBottom: HP(3)}}
        showsVerticalScrollIndicator={false}>
        {/* Habit Input Container */}
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
            onChangeText={handleHabitChange}
            onFocus={() => setHabitFocused(true)}
            onBlur={handleHabitBlur}
            placeholder=""
            placeholderTextColor="#575656"
            maxLength={70}
          />
        </View>

        {/* Dropdown and Goal Row */}
        <View style={styles.rowContainer}>
          {/* Custom Dropdown */}
          <View style={styles.dropdownContainerWrapper}>
            <CustomDropdown
              options={dropdownOptions}
              defaultValue="At Least"
              onSelect={handleDropdownSelect}
              placeholder="Select option"
              style={styles.dropdownStyle}
            />
          </View>

          {/* Goal Input Container */}
          <View style={[styles.inputContainer, styles.goalContainer]}>
            <Text
              style={[
                styles.inputLabel,
                isGoalLabelActive
                  ? styles.inputLabelActive
                  : styles.inputLabelInactive1,
              ]}>
              Goal
            </Text>
            <TextInput
              style={styles.textInput1}
              value={goal}
              onChangeText={handleGoalChange}
              onFocus={() => setGoalFocused(true)}
              onBlur={handleGoalBlur}
              placeholder=""
              placeholderTextColor="#575656"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Unit and Day Row */}
        <View style={styles.unitMainContainer}>
          <View style={styles.unitDisplayContainer}>
            <TextInput
              style={styles.unitDisplayText}
              value={unit}
              onChangeText={setUnit}
              placeholder="Unit (optional)"
              placeholderTextColor="#929292"
            />
          </View>
          <Text style={styles.dayText}>a day.</Text>
        </View>

        {/* Example Text */}
        <Text style={styles.exampleText}>
          e.g. go running. At least 3 miles a day.
        </Text>

        {/* Description Input Container */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor="#575656"
            multiline={true}
            maxLength={200}
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

        {/* Block Time */}
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
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

            <View style={styles.optionRight}>
              <TouchableOpacity
                onPress={handleBlockTimePress}
                style={styles.plusButton}
                activeOpacity={0.7}>
                <Image
                  source={Icons.Plus}
                  style={styles.plusIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Add Pomodoro */}
        {renderOptionRow(Icons.Clock, 'Add Pomodoro')}

        {/* Priority with dropdown */}
        <View
          style={[
            styles.optionContainer,
            showPriorityDropdown && styles.priorityContainerExpanded,
          ]}>
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
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

            <View style={styles.optionRight}>
              <MaterialIcons
                name={
                  showPriorityDropdown
                    ? 'keyboard-arrow-up'
                    : 'keyboard-arrow-down'
                }
                size={WP(6)}
                color="#646464"
              />
            </View>
          </TouchableOpacity>

          {/* Priority Options with Custom Colors */}
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
                    onPress={() => handlePrioritySelect(option)}
                    activeOpacity={0.8}>
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
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={handleNotePress}>
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
          <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
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

            <View style={styles.optionRight}>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => setIsPendingTask(!isPendingTask)}
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.radioOuter,
                    isPendingTask && styles.radioOuterSelected,
                  ]}>
                  {isPendingTask && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Link To Goal */}
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
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

            <View style={styles.optionRight}>
              <TouchableOpacity
                style={styles.plusButton}
                activeOpacity={0.7}
                onPress={handleLinkToGoalPress}>
                <Image
                  source={Icons.Plus}
                  style={styles.plusIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Add a Reminder */}
        <View style={styles.optionContainer}>
          <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
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

            <View style={styles.optionRight}>
              {renderToggle(addReminder, handleReminderToggle)}
            </View>
          </TouchableOpacity>
        </View>

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

          {/* Select Calendar - Only show if Google Calendar is enabled */}
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

        {/* Spacer for bottom content */}
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

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onDateSelect={handleStartDateSelect}
        initialDate={startDate}
        title="Select Start Date"
      />

      {/* Block Time Modal */}
      <BlockTimeModal
        visible={showBlockTimeModal}
        onClose={() => setShowBlockTimeModal(false)}
        onSave={handleBlockTimeSave}
      />

      {/* Reminder Modal */}
      <ReminderModal
        visible={showReminderModal}
        onClose={handleReminderClose}
        onSave={handleReminderSave}
        initialData={reminderData}
      />

      {/* Note Modal */}
      <NoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSave={handleNoteSave}
        initialNote={note}
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
    marginTop: HP(2.2),
    paddingBottom: HP(0.625),
  },
  nextText: {
    fontSize: FS(1.8),
    color: '#1A73E8',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(4.533),
    paddingTop: HP(2.7),
  },
  inputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(1.8),
    padding: WP(2.133),
    marginBottom: HP(1.7),
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
    paddingHorizontal: WP(1.4),
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
  inputLabelInactive1: {
    top: HP(1.7),
    left: WP(3.2),
    fontSize: FS(1.9),
    color: '#929292',
    fontFamily: 'OpenSans-SemiBold',
  },
  textInput: {
    fontSize: FS(2.0),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    paddingVertical: HP(-0.25),
    paddingHorizontal: WP(2.133),
  },
  textInput1: {
    fontSize: FS(2.0),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    paddingVertical: HP(0.3),
    paddingHorizontal: WP(2.133),
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1.0),
    gap: WP(1.5),
  },
  dropdownContainerWrapper: {
    flex: 1,
    marginRight: WP(3.0),
  },
  dropdownStyle: {
    marginBottom: HP(2.3),
  },
  goalContainer: {
    flex: 1,
  },
  unitMainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1.7),
    marginTop: HP(-1.5),
  },
  unitDisplayContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(1.8),
    padding: WP(2.133),
    marginBottom: HP(0.7),
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
    width: WP(41),
  },
  unitDisplayText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    paddingVertical: HP(0.25),
    paddingHorizontal: WP(2.133),
  },
  dayText: {
    fontSize: FS(1.625),
    fontFamily: 'OpenSans-SemiBold',
    color: '#929292',
    marginLeft: WP(3),
    marginBottom: HP(1.4),
  },
  exampleText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#A3A3A3',
    marginBottom: HP(2.0),
    lineHeight: HP(2.25),
    textAlign: 'center',
  },
  descriptionInput: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Regular',
    color: '#575656',
    minHeight: HP(2.0),
    paddingVertical: HP(0.3),
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
    position: 'relative',
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
  optionRight: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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
  dropdownWrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2),
    padding: WP(2.133),
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: HP(0.6),
    paddingHorizontal: WP(3.2),
    marginTop: HP(0.6),
  },
  dropdownContainerOpen: {
    borderColor: colors.Primary,
    borderWidth: 1.5,
  },
  dropdownText: {
    fontSize: FS(1.875),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    paddingVertical: HP(1.375),
    marginLeft: WP(1.867),
  },
  placeholderText: {
    color: '#575656',
    fontFamily: 'OpenSans-SemiBold',
  },
  dropdownOptions: {
    backgroundColor: colors.White,
    borderBottomLeftRadius: WP(1.5),
    borderBottomRightRadius: WP(1.5),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    position: 'absolute',
    top: '99%',
    left: 0,
    right: 0,
    zIndex: 1001,
    paddingHorizontal: WP(0.933),
    height: HP(23.5),
    marginTop: HP(0.1),
  },
  dropdownOption: {
    paddingHorizontal: WP(4.267),
    paddingVertical: HP(0.3),
    marginTop: HP(2.2),
    marginLeft: WP(-0.5),
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
    marginBottom: HP(1.0),
  },
  dropdownOptionText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
  },
  dropdownOptionTextSelected: {
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
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
    height: WP(3.65),
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

export default RecurringNumericScreen;

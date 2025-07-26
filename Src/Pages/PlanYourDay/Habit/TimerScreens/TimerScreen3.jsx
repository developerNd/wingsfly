import React, {useState} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Headers from '../../../../Components/Headers';
import DatePickerModal from '../../../../Components/DatePickerModal';
import BlockTimeModal from '../../../../Components/BlockTime';
import DurationModal from '../../../../Components/DurationModal';
import ReminderModal from '../../../../Components/ReminderModal';
import {HP, WP, FS} from '../../../../utils/dimentions';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {colors, Icons} from '../../../../Helper/Contants';

const SchedulePreference = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const previousData = route.params || {};

  const [endDateSelected, setEndDateSelected] = useState(false);
  const [addPomodoro, setAddPomodoro] = useState(false);
  const [addReminder, setAddReminder] = useState(false);
  const [addToGoogleCalendar, setAddToGoogleCalendar] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [blockTimeData, setBlockTimeData] = useState(null);
  const [durationData, setDurationData] = useState(null);
  const [reminderData, setReminderData] = useState(null);

  // Date picker states
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Helper function to serialize dates for navigation
  const serializeDatesForNavigation = data => {
    if (!data) return data;

    const serialized = {...data};

    // Convert Date objects to ISO strings
    if (serialized.startDate instanceof Date) {
      serialized.startDate = serialized.startDate.toISOString();
    }
    if (serialized.endDate instanceof Date) {
      serialized.endDate = serialized.endDate.toISOString();
    }

    return serialized;
  };

  // Helper function to deserialize dates when receiving navigation params
  const deserializeDatesFromNavigation = data => {
    if (!data) return data;

    const deserialized = {...data};

    // Convert ISO strings back to Date objects
    if (typeof deserialized.startDate === 'string') {
      deserialized.startDate = new Date(deserialized.startDate);
    }
    if (typeof deserialized.endDate === 'string') {
      deserialized.endDate = new Date(deserialized.endDate);
    }

    return deserialized;
  };

  // Handle Done button press
  const handleDonePress = () => {
    const scheduleData = {
      startDate,
      endDate,
      endDateSelected,
      blockTimeData,
      durationData,
      addPomodoro,
      reminderData,
      addReminder,
      addToGoogleCalendar,
    };

    // Serialize dates before combining with previous data
    const serializedScheduleData = serializeDatesForNavigation(scheduleData);

    const finalData = {
      ...previousData,
      scheduleData: serializedScheduleData,
    };

    // Navigate to completion screen or save data
    // replace this with your desired completion flow
    console.log('Final habit data:', finalData);
  };

  // Handle Link To Goal press
  const handleLinkToGoalPress = () => {
    const currentData = {
      ...previousData,
      scheduleData: {
        startDate,
        endDate,
        endDateSelected,
        blockTimeData,
        durationData,
        addPomodoro,
        reminderData,
        addReminder,
        addToGoogleCalendar,
      },
    };

    // Serialize dates before navigation
    const serializedData = {
      ...currentData,
      scheduleData: serializeDatesForNavigation(currentData.scheduleData),
    };

    navigation.navigate('LinkGoal', serializedData);
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

  const handleBlockTimePress = () => {
    setShowBlockTimeModal(true);
  };

  const handleBlockTimeSave = timeData => {
    setBlockTimeData(timeData);
  };

  // Updated handlers for duration modal
  const handleDurationPress = () => {
    setShowDurationModal(true);
  };

  const handleDurationSave = duration => {
    setDurationData(duration);
  };

  // Handlers for reminder functionality
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

  const renderBlockTimeSection = () => {
    return (
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
    );
  };

  const renderDurationSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity
          style={styles.optionRow}
          activeOpacity={0.7}
          onPress={handleDurationPress}>
          <View style={styles.optionLeft}>
            <Image
              source={Icons.Alarm}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Duration</Text>
              {durationData && (
                <Text style={styles.optionSubtitle}>
                  {durationData.formattedDuration ||
                    `${String(durationData.hours).padStart(2, '0')}:${String(
                      durationData.minutes,
                    ).padStart(2, '0')}`}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.optionRight}>
            <TouchableOpacity
              onPress={handleDurationPress}
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
    );
  };

  const renderReminderSection = () => {
    return (
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
    );
  };

  const renderLinkGoalSection = () => {
    return (
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
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <Headers title="What Schedule Would You Prefer?">
          <TouchableOpacity onPress={handleDonePress}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* End Date Section */}
        {renderEndDateSection()}

        {/* Block Time */}
        {renderBlockTimeSection()}

        {/* Duration */}
        {renderDurationSection()}

        {/* Add Pomodoro */}
        {renderOptionRow(Icons.Clock, 'Add Pomodoro', true, addPomodoro, () =>
          setAddPomodoro(!addPomodoro),
        )}

        {/* Add a Reminder */}
        {renderReminderSection()}

        {/* Add to Google Calendar with connected Select Calendar */}
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

        {/* Link To Goal - Now with navigation functionality */}
        {renderLinkGoalSection()}

        {/* Spacer for bottom content */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Progress Indicator */}
      <View style={styles.progressIndicator}>
        <View style={styles.progressDotCompleted}>
          <MaterialIcons name="check" size={WP(3.2)} color={colors.White} />
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDotCompleted}>
          <MaterialIcons name="check" size={WP(3.2)} color={colors.White} />
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDotCompleted}>
          <MaterialIcons name="check" size={WP(3.2)} color={colors.White} />
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDotActive}>
          <View style={styles.progressDotActiveInner}>
            <Text style={styles.progressDotTextActive}>4</Text>
          </View>
        </View>
      </View>

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

      {/* Block Time Modal */}
      <BlockTimeModal
        visible={showBlockTimeModal}
        onClose={() => setShowBlockTimeModal(false)}
        onSave={handleBlockTimeSave}
      />

      {/* Duration Modal */}
      <DurationModal
        visible={showDurationModal}
        onClose={() => setShowDurationModal(false)}
        onSave={handleDurationSave}
        initialHours={durationData?.hours}
        initialMinutes={durationData?.minutes}
      />

      {/* Reminder Modal */}
      <ReminderModal
        visible={showReminderModal}
        onClose={handleReminderClose}
        onSave={handleReminderSave}
        initialData={reminderData}
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
  doneText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(3),
    paddingTop: HP(1.3),
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
  optionValue: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
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
  endDateDetailsContainer: {
    //  marginTop: HP(1),
  },
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
  bottomSpacer: {
    height: HP(3),
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(2.7),
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
  checkIcon: {
    width: WP(3.2),
    height: WP(3.2),
    tintColor: colors.White,
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
    width: WP(3.65),
    height: WP(3.6),
    borderRadius: WP(1.8),
    backgroundColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotTextActive: {
    color: colors.White,
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

export default SchedulePreference;

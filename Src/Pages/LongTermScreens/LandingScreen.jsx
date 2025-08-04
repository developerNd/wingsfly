import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import Headers from '../../Components/Headers';
import DatePickerModal from '../../Components/DatePickerModal';
import BlockTimeModal from '../../Components/BlockTime';
import DurationModal from '../../Components/DurationModal';
import ReminderModal from '../../Components/ReminderModal';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';

const LandingPage = () => {
  const [landingPageText, setLandingPageText] = useState('');
  const [noteText, setNoteText] = useState('');
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

  const handleDurationPress = () => {
    setShowDurationModal(true);
  };

  const handleDurationSave = duration => {
    setDurationData(duration);
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

          <View style={styles.optionRight1}>
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

  const renderAssignToSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.7}>
          <View style={styles.optionLeft}>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle2}>Assign To</Text>
            </View>
          </View>

          <View style={styles.optionRight}>
            <TouchableOpacity style={styles.plusButton} activeOpacity={0.7}>
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
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Landing Page">
          <TouchableOpacity>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <View style={styles.contentWrapper}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.contentContainer}>
            {/* Main Image with Text Inputs */}
            <View style={styles.mainImageContainer}>
              <Image
                source={Icons.Landing}
                style={styles.goalImage}
                resizeMode="contain"
              />

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Landing Page"
                  placeholderTextColor={colors.Black}
                  value={landingPageText}
                  onChangeText={setLandingPageText}
                />
                <View style={styles.divider} />
                <TextInput
                  style={[styles.input, styles.noteInput]}
                  placeholder="Enter Note"
                  placeholderTextColor={colors.Black}
                  value={noteText}
                  onChangeText={setNoteText}
                />
              </View>
            </View>

            {/* Options Section */}
            <View style={styles.optionsSection}>
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
                  <Text style={styles.dateText}>
                    {formatDisplayDate(startDate)}
                  </Text>
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
              {renderOptionRow(
                Icons.Clock,
                'Add Pomodoro',
                true,
                addPomodoro,
                () => setAddPomodoro(!addPomodoro),
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
                        <Text style={styles.optionTitle}>
                          Add to Google Calendar
                        </Text>
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
                  <View
                    style={[styles.optionContainer, styles.connectedContainer]}>
                    <TouchableOpacity style={styles.optionRow}>
                      <View style={styles.optionLeft}>
                        <View style={styles.optionTextContainer}>
                          <Text style={styles.optionTitle1}>
                            Select Calendar
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Assign To */}
              {renderAssignToSection()}
            </View>
          </View>
        </ScrollView>
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
    </SafeAreaView>
  );
};

export default LandingPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  headerWrapper: {
    marginTop: HP(2.2),
    marginBottom: -HP(7.8),
  },
  nextText: {
    fontSize: FS(1.8),
    color: '#151B73',
    fontFamily: 'OpenSans-Bold',
  },
  contentWrapper: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    paddingHorizontal: WP(3.8),
    paddingBottom: HP(3),
  },
  mainImageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: HP(-9.1),
  },
  goalImage: {
    width: WP(94),
    height: HP(50),
  },
  inputContainer: {
    position: 'absolute',
    bottom: HP(11.4),
    left: WP(2),
    right: WP(8),
    backgroundColor: colors.White,
    borderRadius: WP(1.2),
    borderWidth: 0.35,
    borderColor: '#868686',
    width: WP(88),
    height: HP(9),
  },
  input: {
    paddingHorizontal: WP(3.2),
    paddingVertical: HP(0.3),
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: '#000000',
    backgroundColor: 'transparent',
  },
  noteInput: {
    borderTopWidth: 0,
  },
  divider: {
    height: 0.2,
    backgroundColor: '#868686',
  },
  optionsSection: {
    paddingHorizontal: WP(-1),
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
  optionTitle2: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    paddingVertical: HP(0.75),
    marginLeft: WP(0.2),
  },
  addTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    paddingVertical: HP(0.8),
    marginLeft: WP(0.7),
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
  calendarContainer: {},
  endDateDetailsContainer: {
    // marginTop: HP(1),
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
  optionRight1: {
    marginRight: WP(1.5),
  },
});

import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import CustomToast from '../../Components/CustomToast';
import {useAuth} from '../../contexts/AuthContext';
import {nightRoutineService} from '../../services/api/nightRoutineService';
import NightModeScheduler from '../../services/NightModeScheduler';
import MorningModeScheduler from '../../services/MorningModeScheduler';

const NightRoutineScreen = ({navigation}) => {
  const {user} = useAuth();

  // Time states
  const [wakeUpTime, setWakeUpTime] = useState(new Date());
  const [bedTime, setBedTime] = useState(new Date());
  const [showWakeUpPicker, setShowWakeUpPicker] = useState(false);

  // Sleep duration in hours (as input by user)
  const [sleepHours, setSleepHours] = useState('8');
  const [sleepMinutes, setSleepMinutes] = useState('0');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Load existing night routine on mount
  useEffect(() => {
    loadNightRoutine();
  }, []);

  // Calculate bedtime whenever wake-up time or sleep duration changes
  useEffect(() => {
    calculateBedTime();
  }, [wakeUpTime, sleepHours, sleepMinutes]);

  const loadNightRoutine = async () => {
    try {
      setIsLoading(true);
      const routine = await nightRoutineService.getFormattedNightRoutine(
        user?.id,
      );

      if (routine) {
        setWakeUpTime(routine.wakeUpTime);

        // Calculate sleep duration from existing routine
        const duration = calculateSleepDurationFromTimes(
          routine.wakeUpTime,
          routine.bedTime,
        );
        setSleepHours(duration.hours.toString());
        setSleepMinutes(duration.minutes.toString());

        console.log('✅ Loaded existing night routine');
      } else {
        // Set default times if no routine exists
        const defaultWakeUp = new Date();
        defaultWakeUp.setHours(7, 0, 0, 0);
        setWakeUpTime(defaultWakeUp);
        setSleepHours('8');
        setSleepMinutes('0');

        console.log('ℹ️ No existing routine, using defaults');
      }
    } catch (error) {
      console.error('Error loading night routine:', error);
      showToast('Failed to load routine', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSleepDurationFromTimes = (wakeUp, bed) => {
    let wakeUpMinutes = wakeUp.getHours() * 60 + wakeUp.getMinutes();
    let bedTimeMinutes = bed.getHours() * 60 + bed.getMinutes();

    if (wakeUpMinutes < bedTimeMinutes) {
      wakeUpMinutes += 24 * 60;
    }

    const totalMinutes = wakeUpMinutes - bedTimeMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {hours, minutes};
  };

  const calculateBedTime = () => {
    const hours = parseInt(sleepHours) || 0;
    const minutes = parseInt(sleepMinutes) || 0;

    // Create a new date object based on wake-up time
    const calculatedBedTime = new Date(wakeUpTime);

    // Subtract sleep duration from wake-up time
    calculatedBedTime.setHours(calculatedBedTime.getHours() - hours);
    calculatedBedTime.setMinutes(calculatedBedTime.getMinutes() - minutes);

    setBedTime(calculatedBedTime);
  };

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const getTotalSleepMinutes = () => {
    const hours = parseInt(sleepHours) || 0;
    const minutes = parseInt(sleepMinutes) || 0;
    return hours * 60 + minutes;
  };

  const formatTime = date => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const onWakeUpTimeChange = (event, selectedDate) => {
    setShowWakeUpPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setWakeUpTime(selectedDate);
    }
  };

  const handleSleepHoursChange = text => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    if (
      numericValue === '' ||
      (parseInt(numericValue) >= 0 && parseInt(numericValue) <= 23)
    ) {
      setSleepHours(numericValue);
    }
  };

  const handleSleepMinutesChange = text => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    if (
      numericValue === '' ||
      (parseInt(numericValue) >= 0 && parseInt(numericValue) <= 59)
    ) {
      setSleepMinutes(numericValue);
    }
  };

  const handleSave = async () => {
    if (toastVisible) {
      hideToast();
    }

    const totalMinutes = getTotalSleepMinutes();

    // Validate minimum sleep time (at least 4 hours)
    if (totalMinutes < 240) {
      showToast('Sleep duration should be at least 4 hours', 'error');
      return;
    }

    // Validate maximum sleep time (not more than 16 hours)
    if (totalMinutes > 960) {
      showToast('Sleep duration should not exceed 16 hours', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const routineData = {
        userId: user?.id,
        wakeUpTime: nightRoutineService.formatTimeForDatabase(wakeUpTime),
        bedTime: nightRoutineService.formatTimeForDatabase(bedTime),
        sleepDuration: totalMinutes,
      };

      console.log('=== SAVING NIGHT ROUTINE ===');
      console.log('Wake-up Time:', formatTime(wakeUpTime));
      console.log('Bed Time (Calculated):', formatTime(bedTime));
      console.log('Sleep Duration:', `${sleepHours}h ${sleepMinutes}m`);

      await nightRoutineService.saveNightRoutine(routineData);

      // Update the Night Mode Scheduler (for bedtime)
      console.log('🌙 Updating Night Mode Scheduler...');
      await NightModeScheduler.updateNightRoutine(user?.id);

      // ✅ NEW: Update the Morning Mode Scheduler (for wake-up time)
      console.log('☀️ Updating Morning Mode Scheduler...');
      await MorningModeScheduler.updateNightRoutine(user?.id);

      showToast('Sleep schedule saved successfully!', 'success');

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error saving night routine:', error);
      showToast('Failed to save sleep schedule', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const totalMinutes = getTotalSleepMinutes();
  const sleepQuality = nightRoutineService.getSleepQuality(totalMinutes);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Sleep Schedule" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Primary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Sleep Schedule" />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <MaterialIcons
              name="nightlight-round"
              size={WP(8)}
              color={colors.Primary}
            />
            <Text style={styles.infoTitle}>Set Your Sleep Schedule</Text>
            <Text style={styles.infoDescription}>
              Set your wake-up time and desired sleep duration. We'll calculate
              your bedtime and schedule both Night Mode and Morning Mode alarms
              automatically.
            </Text>
          </View>

          {/* Wake-up Time Card */}
          <TouchableOpacity
            style={styles.timeCard}
            onPress={() => setShowWakeUpPicker(true)}
            activeOpacity={0.7}
            disabled={isSaving}>
            <View style={styles.timeCardContent}>
              <View style={styles.timeCardLeft}>
                <View
                  style={[styles.iconContainer, {backgroundColor: '#FFA726'}]}>
                  <MaterialIcons
                    name="wb-sunny"
                    size={WP(6)}
                    color={colors.White}
                  />
                </View>
                <View style={styles.timeTextContainer}>
                  <Text style={styles.timeCardTitle}>Wake-up Time</Text>
                  <Text style={styles.timeCardSubtitle}>
                    Morning Mode triggers here
                  </Text>
                </View>
              </View>
              <View style={styles.timeCardRight}>
                <Text style={styles.timeText}>{formatTime(wakeUpTime)}</Text>
                <MaterialIcons
                  name="keyboard-arrow-right"
                  size={WP(6)}
                  color={colors.Shadow}
                  style={styles.arrowIcon}
                />
              </View>
            </View>
          </TouchableOpacity>

          {/* Sleep Duration Input Card */}
          <View style={styles.durationInputCard}>
            <View style={styles.durationHeader}>
              <MaterialIcons
                name="access-time"
                size={WP(6)}
                color={colors.Primary}
              />
              <Text style={styles.durationTitle}>Sleep Duration</Text>
            </View>

            <View style={styles.durationInputContent}>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.durationInput}
                  value={sleepHours}
                  onChangeText={handleSleepHoursChange}
                  keyboardType="numeric"
                  maxLength={2}
                  editable={!isSaving}
                />
                <Text style={styles.inputLabel}>Hours</Text>
              </View>

              <Text style={styles.inputSeparator}>:</Text>

              <View style={styles.inputBox}>
                <TextInput
                  style={styles.durationInput}
                  value={sleepMinutes}
                  onChangeText={handleSleepMinutesChange}
                  keyboardType="numeric"
                  maxLength={2}
                  editable={!isSaving}
                />
                <Text style={styles.inputLabel}>Minutes</Text>
              </View>
            </View>

            {/* Sleep Quality Indicator */}
            <View style={styles.qualityIndicator}>
              <View style={styles.qualityBadge}>
                <MaterialIcons
                  name={sleepQuality.icon}
                  size={WP(4)}
                  color={sleepQuality.color}
                />
                <Text style={[styles.qualityText, {color: sleepQuality.color}]}>
                  {sleepQuality.message}
                </Text>
              </View>
            </View>
          </View>

          {/* Calculated Bedtime Display */}
          <View style={styles.bedtimeCard}>
            <View style={styles.bedtimeContent}>
              <View style={styles.bedtimeLeft}>
                <View
                  style={[styles.iconContainer, {backgroundColor: '#5C6BC0'}]}>
                  <MaterialIcons
                    name="bedtime"
                    size={WP(6)}
                    color={colors.White}
                  />
                </View>
                <View style={styles.bedtimeTextContainer}>
                  <Text style={styles.bedtimeLabel}>Bedtime</Text>
                  <Text style={styles.bedtimeSubtitle}>
                    Night Mode triggers 1hr before
                  </Text>
                </View>
              </View>
              <View style={styles.bedtimeRight}>
                <Text style={styles.bedtimeValue}>{formatTime(bedTime)}</Text>
              </View>
            </View>
          </View>

          {/* Schedule Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <MaterialIcons
                name="event-note"
                size={WP(5)}
                color={colors.Primary}
              />
              <Text style={styles.summaryTitle}>Alarm Schedule</Text>
            </View>
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <View style={styles.summaryIconContainer}>
                  <MaterialIcons name="bedtime" size={WP(4)} color="#5C6BC0" />
                </View>
                <View style={styles.summaryTextContainer}>
                  <Text style={styles.summaryLabel}>Night Mode</Text>
                  <Text style={styles.summaryValue}>
                    {formatTime(
                      new Date(
                        bedTime.getTime() - 60 * 60 * 1000, // 1 hour before bed
                      ),
                    )}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <View style={styles.summaryIconContainer}>
                  <MaterialIcons
                    name="wb-sunny"
                    size={WP(4)}
                    color="#FFA726"
                  />
                </View>
                <View style={styles.summaryTextContainer}>
                  <Text style={styles.summaryLabel}>Morning Mode</Text>
                  <Text style={styles.summaryValue}>
                    {formatTime(wakeUpTime)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.White} />
            ) : (
              <>
                <MaterialIcons
                  name="check-circle"
                  size={WP(5)}
                  color={colors.White}
                />
                <Text style={styles.saveButtonText}>Save Sleep Schedule</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Sleep Tips</Text>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>
                Aim for 7-9 hours of sleep per night
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>
                Keep consistent sleep and wake times
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>
                Night Mode helps you wind down before bed
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>
                Morning Mode helps you wake up energized
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{height: HP(4)}} />
      </ScrollView>

      {/* Wake-up Time Picker */}
      {showWakeUpPicker && (
        <DateTimePicker
          value={wakeUpTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onWakeUpTimeChange}
        />
      )}

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
    paddingBottom: HP(0.25),
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: WP(4),
    paddingTop: HP(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: HP(2),
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
  },
  infoCard: {
    backgroundColor: '#F8F9FF',
    borderRadius: WP(3),
    padding: WP(4),
    marginBottom: HP(3),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8FF',
  },
  infoTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginTop: HP(1),
    marginBottom: HP(0.5),
  },
  infoDescription: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    textAlign: 'center',
    lineHeight: HP(2.5),
  },
  timeCard: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(4),
    marginBottom: HP(2),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  timeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(6),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(3),
  },
  timeTextContainer: {
    flex: 1,
  },
  timeCardTitle: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
  },
  timeCardSubtitle: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    marginTop: HP(0.3),
  },
  timeCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    marginRight: WP(2),
  },
  arrowIcon: {
    opacity: 0.6,
  },
  durationInputCard: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(4),
    marginBottom: HP(2),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  durationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(2),
  },
  durationTitle: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginLeft: WP(2),
  },
  durationInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(2),
  },
  inputBox: {
    alignItems: 'center',
    minWidth: WP(25),
  },
  durationInput: {
    fontSize: FS(4),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    borderBottomWidth: 2,
    borderBottomColor: colors.Primary,
    paddingHorizontal: WP(4),
    paddingVertical: HP(0.5),
    minWidth: WP(20),
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
    marginTop: HP(0.5),
  },
  inputSeparator: {
    fontSize: FS(4),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    marginHorizontal: WP(2),
    marginBottom: HP(2),
  },
  qualityIndicator: {
    marginTop: HP(1),
    paddingTop: HP(2),
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    marginLeft: WP(2),
  },
  bedtimeCard: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(4),
    marginBottom: HP(2),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bedtimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bedtimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bedtimeTextContainer: {
    marginLeft: WP(3),
  },
  bedtimeLabel: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
  },
  bedtimeSubtitle: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    marginTop: HP(0.3),
  },
  bedtimeRight: {
    alignItems: 'flex-end',
  },
  bedtimeValue: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
  },
  summaryCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: WP(3),
    padding: WP(4),
    marginBottom: HP(3),
    borderWidth: 1,
    borderColor: '#FFE8A3',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1.5),
  },
  summaryTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginLeft: WP(2),
  },
  summaryContent: {
    marginTop: HP(1),
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: HP(1),
  },
  summaryIconContainer: {
    width: WP(9),
    height: WP(9),
    borderRadius: WP(4.5),
    backgroundColor: colors.White,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(3),
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
  },
  summaryValue: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginTop: HP(0.2),
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#FFE8A3',
    marginVertical: HP(0.5),
  },
  saveButton: {
    backgroundColor: colors.Primary,
    borderRadius: WP(3),
    paddingVertical: HP(1.8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HP(3),
    elevation: 3,
    shadowColor: colors.Primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
    marginLeft: WP(2),
  },
  tipsSection: {
    backgroundColor: '#FFFBF0',
    borderRadius: WP(3),
    padding: WP(4),
    borderWidth: 1,
    borderColor: '#FFE8A3',
  },
  tipsTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginBottom: HP(1.5),
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: HP(1),
  },
  tipBullet: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    marginRight: WP(2),
    marginTop: HP(0.2),
  },
  tipText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    flex: 1,
    lineHeight: HP(2.2),
  },
});

export default NightRoutineScreen;
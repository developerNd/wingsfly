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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import CustomToast from '../../Components/CustomToast';
import {useAuth} from '../../contexts/AuthContext';
import {nightRoutineService} from '../../services/api/nightRoutineService';
import NightModeScheduler from '../../services/NightModeScheduler';
import morningRoutineAlarmManager from '../../services/MorningRoutine/morningRoutineAlarmManager';

const NightRoutineScreen = ({navigation}) => {
  const {user} = useAuth();

  // Time states
  const [bedTime, setBedTime] = useState(new Date());
  const [wakeUpTime, setWakeUpTime] = useState(new Date());
  const [showBedTimePicker, setShowBedTimePicker] = useState(false);
  const [showWakeUpPicker, setShowWakeUpPicker] = useState(false);

  // Sleep duration (calculated automatically)
  const [sleepHours, setSleepHours] = useState(0);
  const [sleepMinutes, setSleepMinutes] = useState(0);

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

  // Calculate sleep duration whenever bedtime or wake-up time changes
  useEffect(() => {
    calculateSleepDuration();
  }, [bedTime, wakeUpTime]);

  const loadNightRoutine = async () => {
    try {
      setIsLoading(true);
      const routine = await nightRoutineService.getFormattedNightRoutine(
        user?.id,
      );

      if (routine) {
        setBedTime(routine.bedTime);
        setWakeUpTime(routine.wakeUpTime);
        console.log('✅ Loaded existing night routine');
      } else {
        // Set default times if no routine exists
        const defaultBedTime = new Date();
        defaultBedTime.setHours(22, 0, 0, 0); // 10:00 PM

        const defaultWakeUp = new Date();
        defaultWakeUp.setHours(7, 0, 0, 0); // 7:00 AM

        setBedTime(defaultBedTime);
        setWakeUpTime(defaultWakeUp);

        console.log('ℹ️ No existing routine, using defaults');
      }
    } catch (error) {
      console.error('Error loading night routine:', error);
      showToast('Failed to load routine', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSleepDuration = () => {
    // Calculate sleep duration in minutes
    let wakeUpMinutes = wakeUpTime.getHours() * 60 + wakeUpTime.getMinutes();
    let bedTimeMinutes = bedTime.getHours() * 60 + bedTime.getMinutes();

    // If wake-up time is earlier in the day than bedtime, add 24 hours
    if (wakeUpMinutes <= bedTimeMinutes) {
      wakeUpMinutes += 24 * 60;
    }

    const totalMinutes = wakeUpMinutes - bedTimeMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    setSleepHours(hours);
    setSleepMinutes(minutes);
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
    return sleepHours * 60 + sleepMinutes;
  };

  const formatTime = date => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const onBedTimeChange = (event, selectedDate) => {
    setShowBedTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBedTime(selectedDate);
    }
  };

  const onWakeUpTimeChange = (event, selectedDate) => {
    setShowWakeUpPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setWakeUpTime(selectedDate);
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
      console.log('Bed Time:', formatTime(bedTime));
      console.log('Wake-up Time:', formatTime(wakeUpTime));
      console.log(
        'Sleep Duration (Calculated):',
        `${sleepHours}h ${sleepMinutes}m`,
      );

      // 1. Save night routine
      await nightRoutineService.saveNightRoutine(routineData);

      // 2. Update the Night Mode Scheduler
      console.log('🌙 Updating Night Mode Scheduler...');
      await NightModeScheduler.updateNightRoutine(user?.id);

      // 3. ✅ NEW: Schedule Morning Routine Alarm based on wake-up time
      console.log('🌅 Scheduling Morning Routine Alarm...');
      try {
        await morningRoutineAlarmManager.scheduleMorningRoutine(user?.id);
        console.log('✅ Morning routine alarm scheduled successfully');
      } catch (morningError) {
        console.warn('⚠️ Morning routine scheduling failed:', morningError.message);
        // Don't fail the whole save if morning routine fails
        // User can still use night mode
      }

      showToast('Routines saved successfully!', 'success');

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error saving night routine:', error);
      showToast('Failed to save night routine', 'error');
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
          <Headers title="Night Routine" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Primary} />
          <Text style={styles.loadingText}>Loading routine...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Night Routine" />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="moon" size={WP(8)} color={colors.Primary} />
            <Text style={styles.infoTitle}>Set Your Sleep Schedule</Text>
            <Text style={styles.infoDescription}>
              Set your bedtime and wake-up time. We'll automatically schedule your morning routine.
            </Text>
          </View>

          {/* Bedtime Card */}
          <TouchableOpacity
            style={styles.timeCard}
            onPress={() => setShowBedTimePicker(true)}
            activeOpacity={0.7}
            disabled={isSaving}>
            <View style={styles.timeCardContent}>
              <View style={styles.timeCardLeft}>
                <View
                  style={[styles.iconContainer, {backgroundColor: '#5C6BC0'}]}>
                  <MaterialIcons
                    name="bedtime"
                    size={WP(6)}
                    color={colors.White}
                  />
                </View>
                <Text style={styles.timeCardTitle}>Bedtime</Text>
              </View>
              <View style={styles.timeCardRight}>
                <Text style={styles.timeText}>{formatTime(bedTime)}</Text>
                <MaterialIcons
                  name="keyboard-arrow-right"
                  size={WP(6)}
                  color={colors.Shadow}
                  style={styles.arrowIcon}
                />
              </View>
            </View>
          </TouchableOpacity>

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
                <Text style={styles.timeCardTitle}>Wake-up Time</Text>
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

          {/* Calculated Sleep Duration Display */}
          <View style={styles.durationDisplayCard}>
            <View style={styles.durationHeader}>
              <MaterialIcons
                name="access-time"
                size={WP(6)}
                color={colors.Primary}
              />
              <Text style={styles.durationTitle}>Sleep Duration</Text>
            </View>

            <View style={styles.durationDisplay}>
              <View style={styles.durationBox}>
                <Text style={styles.durationValue}>{sleepHours}</Text>
                <Text style={styles.durationLabel}>Hours</Text>
              </View>

              <Text style={styles.durationSeparator}>:</Text>

              <View style={styles.durationBox}>
                <Text style={styles.durationValue}>{sleepMinutes}</Text>
                <Text style={styles.durationLabel}>Minutes</Text>
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
                <Text style={styles.saveButtonText}>Save Routine</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 What Happens Next</Text>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>
                Night Mode will start at your bedtime
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>
                Morning routine alarm will trigger at wake-up time
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>
                Voice commands are managed by admin
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>
                Aim for 7-9 hours of sleep per night
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{height: HP(4)}} />
      </ScrollView>

      {/* Bedtime Picker */}
      {showBedTimePicker && (
        <DateTimePicker
          value={bedTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onBedTimeChange}
        />
      )}

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
  timeCardTitle: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
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
  durationDisplayCard: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(4),
    marginBottom: HP(3),
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
    flex: 1,
  },
  durationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(2),
    backgroundColor: '#F8F9FF',
    borderRadius: WP(2),
  },
  durationBox: {
    alignItems: 'center',
    minWidth: WP(25),
  },
  durationValue: {
    fontSize: FS(4),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
  },
  durationLabel: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
    marginTop: HP(0.5),
  },
  durationSeparator: {
    fontSize: FS(4),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    marginHorizontal: WP(2),
  },
  qualityIndicator: {
    marginTop: HP(1.5),
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
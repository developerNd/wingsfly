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
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import CustomToast from '../../Components/CustomToast';
import {useAuth} from '../../contexts/AuthContext';
import {nightRoutineService} from '../../services/api/nightRoutineService';
import NightModeScheduler from '../../services/NightModeScheduler';

const NightRoutineScreen = ({navigation}) => {
  const {user} = useAuth();

  // Time states
  const [wakeUpTime, setWakeUpTime] = useState(new Date());
  const [bedTime, setBedTime] = useState(new Date());
  const [showWakeUpPicker, setShowWakeUpPicker] = useState(false);
  const [showBedTimePicker, setShowBedTimePicker] = useState(false);

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

  const loadNightRoutine = async () => {
    try {
      setIsLoading(true);
      const routine = await nightRoutineService.getFormattedNightRoutine(
        user?.id,
      );

      if (routine) {
        setWakeUpTime(routine.wakeUpTime);
        setBedTime(routine.bedTime);
        console.log('✅ Loaded existing night routine');
      } else {
        // Set default times if no routine exists
        const defaultWakeUp = new Date();
        defaultWakeUp.setHours(7, 0, 0, 0);
        const defaultBedTime = new Date();
        defaultBedTime.setHours(23, 0, 0, 0);

        setWakeUpTime(defaultWakeUp);
        setBedTime(defaultBedTime);
        console.log('ℹ️ No existing routine, using defaults');
      }
    } catch (error) {
      console.error('Error loading night routine:', error);
      showToast('Failed to load routine', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  // Calculate total sleep duration
  const calculateSleepDuration = () => {
    let wakeUpMinutes = wakeUpTime.getHours() * 60 + wakeUpTime.getMinutes();
    let bedTimeMinutes = bedTime.getHours() * 60 + bedTime.getMinutes();

    // If wake up time is earlier than bed time, it means wake up is next day
    if (wakeUpMinutes < bedTimeMinutes) {
      wakeUpMinutes += 24 * 60; // Add 24 hours
    }

    const totalMinutes = wakeUpMinutes - bedTimeMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {hours, minutes, totalMinutes};
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

  const onBedTimeChange = (event, selectedDate) => {
    setShowBedTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBedTime(selectedDate);
    }
  };

  const handleSave = async () => {
    if (toastVisible) {
      hideToast();
    }

    const duration = calculateSleepDuration();

    // Validate minimum sleep time (at least 4 hours)
    if (duration.totalMinutes < 240) {
      showToast('Sleep duration should be at least 4 hours', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const routineData = {
        userId: user?.id,
        wakeUpTime: nightRoutineService.formatTimeForDatabase(wakeUpTime),
        bedTime: nightRoutineService.formatTimeForDatabase(bedTime),
        sleepDuration: duration.totalMinutes,
      };

      console.log('=== SAVING NIGHT ROUTINE ===');
      console.log('Wake-up Time:', formatTime(wakeUpTime));
      console.log('Bed Time:', formatTime(bedTime));
      console.log('Sleep Duration:', `${duration.hours}h ${duration.minutes}m`);

      await nightRoutineService.saveNightRoutine(routineData);

      // ✅ ADD THIS: Update the Night Mode Scheduler
      console.log('🌙 Updating Night Mode Scheduler...');
      await NightModeScheduler.updateNightRoutine(user?.id);

      showToast('Night routine saved successfully!', 'success');

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

  const sleepDuration = calculateSleepDuration();
  const sleepQuality = nightRoutineService.getSleepQuality(
    sleepDuration.totalMinutes,
  );

  const TimePickerCard = ({
    title,
    time,
    icon,
    onPress,
    iconColor = colors.Primary,
  }) => (
    <TouchableOpacity
      style={styles.timeCard}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isSaving}>
      <View style={styles.timeCardContent}>
        <View style={styles.timeCardLeft}>
          <View style={[styles.iconContainer, {backgroundColor: iconColor}]}>
            <MaterialIcons name={icon} size={WP(6)} color={colors.White} />
          </View>
          <Text style={styles.timeCardTitle}>{title}</Text>
        </View>
        <View style={styles.timeCardRight}>
          <Text style={styles.timeText}>{formatTime(time)}</Text>
          <MaterialIcons
            name="keyboard-arrow-right"
            size={WP(6)}
            color={colors.Shadow}
            style={styles.arrowIcon}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

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
            <MaterialIcons
              name="nightlight-round"
              size={WP(8)}
              color={colors.Primary}
            />
            <Text style={styles.infoTitle}>Set Your Sleep Schedule</Text>
            <Text style={styles.infoDescription}>
              Maintain a consistent sleep routine for better health and
              productivity. We'll remind you when it's time to wind down.
            </Text>
          </View>

          {/* Wake-up Time Card */}
          <TimePickerCard
            title="Wake-up Time"
            time={wakeUpTime}
            icon="wb-sunny"
            iconColor="#FFA726"
            onPress={() => setShowWakeUpPicker(true)}
          />

          {/* Bedtime Card */}
          <TimePickerCard
            title="Bedtime"
            time={bedTime}
            icon="bedtime"
            iconColor="#5C6BC0"
            onPress={() => setShowBedTimePicker(true)}
          />

          {/* Sleep Duration Display */}
          <View style={styles.durationCard}>
            <View style={styles.durationHeader}>
              <MaterialIcons
                name="access-time"
                size={WP(6)}
                color={colors.Primary}
              />
              <Text style={styles.durationTitle}>Total Sleep Duration</Text>
            </View>
            <View style={styles.durationContent}>
              <View style={styles.durationBox}>
                <Text style={styles.durationNumber}>{sleepDuration.hours}</Text>
                <Text style={styles.durationLabel}>Hours</Text>
              </View>
              <Text style={styles.durationSeparator}>:</Text>
              <View style={styles.durationBox}>
                <Text style={styles.durationNumber}>
                  {sleepDuration.minutes}
                </Text>
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
                <Text style={styles.saveButtonText}>Save Night Routine</Text>
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
                Avoid screens 30 minutes before bedtime
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{height: HP(4)}} />
      </ScrollView>

      {/* Time Pickers */}
      {showWakeUpPicker && (
        <DateTimePicker
          value={wakeUpTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onWakeUpTimeChange}
        />
      )}

      {showBedTimePicker && (
        <DateTimePicker
          value={bedTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onBedTimeChange}
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
  durationCard: {
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
  },
  durationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(2),
  },
  durationBox: {
    alignItems: 'center',
    minWidth: WP(20),
  },
  durationNumber: {
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

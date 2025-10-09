import React, {useState, useRef, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useRoute} from '@react-navigation/native';
import Headers from '../../../../Components/Headers';
import MonthDateSelector from '../../../../Components/MonthDateSelector';
import YearDateSelector from '../../../../Components/YearDateSelector';
import PeriodSelector from '../../../../Components/PeriodSelector';
import RepeatSelector from '../../../../Components/RepeatSelector';
import CustomToast from '../../../../Components/CustomToast';
import {colors} from '../../../../Helper/Contants';
import {HP, WP, FS} from '../../../../utils/dimentions';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const FrequencyScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Get data passed from previous screens
  const previousData = route.params || {};

  const [selectedFrequency, setSelectedFrequency] = useState('Every Day');
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  const [selectedMonthDates, setSelectedMonthDates] = useState([]);
  const [selectedYearDates, setSelectedYearDates] = useState([]);
  const [isFlexible, setIsFlexible] = useState(false);
  const [isMonthFlexible, setIsMonthFlexible] = useState(false);
  const [isYearFlexible, setIsYearFlexible] = useState(false);
  const [useDayOfWeek, setUseDayOfWeek] = useState(false);

  // states for period selector
  const [periodDays, setPeriodDays] = useState('1');
  const [selectedPeriod, setSelectedPeriod] = useState('Week');

  // states for repeat selector
  const [isRepeatFlexible, setIsRepeatFlexible] = useState(false);
  const [isRepeatAlternateDays, setIsRepeatAlternateDays] = useState(false);
  // NEW: States for repeat data
  const [repeatData, setRepeatData] = useState({
    everyDays: null,
    activityDays: null,
    restDays: null,
    isRepeatFlexible: false,
    isRepeatAlternateDays: false,
  });

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  // Animation values for radio buttons
  const radioAnimations = useRef(
    [
      'Every Day',
      'Specific days of the week',
      'Specific days of the month',
      'Specific days of the year',
      'Some days per period',
      'Repeat',
    ].reduce((acc, option) => {
      acc[option] = {
        innerScale: new Animated.Value(0),
      };
      return acc;
    }, {}),
  ).current;

  // Animation value for weekday section
  const weekdayOpacity = useRef(new Animated.Value(0)).current;
  const weekdayTranslateY = useRef(new Animated.Value(-10)).current;

  // Animation values for checkboxes
  const checkboxAnimations = useRef(
    [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ].reduce((acc, day) => {
      acc[day] = {
        checkScale: new Animated.Value(0),
      };
      return acc;
    }, {}),
  ).current;

  // Animation value for flexible tick
  const flexibleTickAnimation = useRef(new Animated.Value(0)).current;

  const frequencyOptions = [
    'Every Day',
    'Specific days of the week',
    'Specific days of the month',
    'Specific days of the year',
    'Some days per period',
    'Repeat',
  ];

  const weekdays = [
    {key: 'monday', label: 'Monday'},
    {key: 'tuesday', label: 'Tuesday'},
    {key: 'wednesday', label: 'Wednesday'},
    {key: 'thursday', label: 'Thursday'},
    {key: 'friday', label: 'Friday'},
    {key: 'saturday', label: 'Saturday'},
    {key: 'sunday', label: 'Sunday'},
  ];

  // Toast helper functions
  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  // NEW: Handler for repeat data changes
  const handleRepeatDataChange = data => {
    setRepeatData(data);
    console.log('Repeat data updated:', data);
  };

  // Validation function
  const validateSelection = () => {
    switch (selectedFrequency) {
      case 'Specific days of the week':
        if (selectedWeekdays.length === 0) {
          showToast('Select at least one day');
          return false;
        }
        break;
      case 'Specific days of the month':
        if (selectedMonthDates.length === 0) {
          showToast('Select at least one day');
          return false;
        }
        break;
      case 'Specific days of the year':
        if (selectedYearDates.length === 0) {
          showToast('Select at least one day');
          return false;
        }
        break;
      case 'Some days per period':
        if (!periodDays || periodDays === '0') {
          showToast('Select at least one day');
          return false;
        }
        break;
      case 'Repeat':
        // Validate repeat data
        if (repeatData.isRepeatAlternateDays) {
          if (!repeatData.activityDays || !repeatData.restDays) {
            showToast('Please enter both activity and rest days');
            return false;
          }
        } else {
          if (!repeatData.everyDays) {
            showToast('Please enter number of days for repeat');
            return false;
          }
        }
        break;
      default:
        // 'Every Day' doesn't need validation
        break;
    }
    return true;
  };

  const handleNextPress = () => {
    if (!validateSelection()) {
      return;
    }

    const frequencyData = {
      selectedFrequency,
      selectedWeekdays,
      selectedMonthDates,
      selectedYearDates,
      isFlexible,
      isMonthFlexible,
      isYearFlexible,
      useDayOfWeek,
      periodDays,
      selectedPeriod,
      isRepeatFlexible,
      isRepeatAlternateDays,
      everyDays: repeatData.everyDays,
      activityDays: repeatData.activityDays,
      restDays: repeatData.restDays,
    };

    const navigationData = {
      ...previousData,
      frequencyData,
    };

    console.log('Navigation data with repeat info:', navigationData);
    if (previousData.evaluationType === 'timerTracker') {
      navigation.navigate('TimerTrackerScreen', navigationData);
    } else {
      navigation.navigate('SchedulePreference', navigationData);
    }
  };

  // Animate radio button selection
  const animateRadioButton = (option, isSelected) => {
    const animations = radioAnimations[option];

    Animated.timing(animations.innerScale, {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Animate weekday section appearance/disappearance
  const animateWeekdaySection = show => {
    if (show) {
      Animated.parallel([
        Animated.timing(weekdayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(weekdayTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(weekdayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(weekdayTranslateY, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Animate checkbox selection
  const animateCheckbox = (weekdayKey, isSelected) => {
    const animations = checkboxAnimations[weekdayKey];

    // Only animate the check mark
    Animated.timing(animations.checkScale, {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Animate flexible tick
  const animateFlexibleTick = isSelected => {
    Animated.timing(flexibleTickAnimation, {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleFrequencySelect = frequency => {
    const isSelected = frequency === selectedFrequency ? false : true;

    // Hide toast if visible when user makes a selection
    if (toastVisible) {
      hideToast();
    }

    Object.keys(radioAnimations).forEach(option => {
      if (option !== frequency) {
        animateRadioButton(option, false);
      }
    });

    // Animate the selected radio button
    animateRadioButton(frequency, isSelected);

    setSelectedFrequency(frequency);

    // Handle section animations
    const shouldShowWeekdays = frequency === 'Specific days of the week';

    // Use LayoutAnimation for smooth layout changes
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });

    // Reset selections based on frequency type
    if (frequency !== 'Specific days of the week') {
      setSelectedWeekdays([]);
      setIsFlexible(false);
      animateFlexibleTick(false);
      animateWeekdaySection(false);
    } else {
      animateWeekdaySection(true);
    }

    if (frequency !== 'Specific days of the month') {
      setSelectedMonthDates([]);
      setIsMonthFlexible(false);
      setUseDayOfWeek(false);
    }

    if (frequency !== 'Specific days of the year') {
      setSelectedYearDates([]);
      setIsYearFlexible(false);
    }

    if (frequency !== 'Some days per period') {
      setPeriodDays('1');
      setSelectedPeriod('Week');
    }

    if (frequency !== 'Repeat') {
      setIsRepeatFlexible(false);
      setIsRepeatAlternateDays(false);
      // NEW: Reset repeat data when frequency changes
      setRepeatData({
        everyDays: null,
        activityDays: null,
        restDays: null,
        isRepeatFlexible: false,
        isRepeatAlternateDays: false,
      });
    }

    console.log('Selected frequency:', frequency);
  };

  const handleWeekdayToggle = weekdayKey => {
    setSelectedWeekdays(prev => {
      const isSelected = prev.includes(weekdayKey);
      const newSelection = isSelected
        ? prev.filter(day => day !== weekdayKey)
        : [...prev, weekdayKey];

      // Animate checkbox
      animateCheckbox(weekdayKey, !isSelected);

      // Hide toast if visible when user makes a selection
      if (toastVisible) {
        hideToast();
      }

      return newSelection;
    });
  };

  const handleFlexibleToggle = () => {
    const newFlexibleState = !isFlexible;
    setIsFlexible(newFlexibleState);
    animateFlexibleTick(newFlexibleState);
  };

  // Handler for month date selection
  const handleMonthDateToggle = date => {
    setSelectedMonthDates(prev => {
      const isSelected = prev.includes(date);
      const newSelection = isSelected
        ? prev.filter(d => d !== date)
        : [...prev, date];

      // Hide toast if visible when user makes a selection
      if (toastVisible && newSelection.length > 0) {
        hideToast();
      }

      return newSelection;
    });
  };

  // Handler for month flexible toggle
  const handleMonthFlexibleToggle = isSelected => {
    setIsMonthFlexible(isSelected);
  };

  // Handler for use day of week toggle
  const handleUseDayOfWeekToggle = isSelected => {
    setUseDayOfWeek(isSelected);
  };

  // Handler for year date selection
  const handleYearDateToggle = date => {
    setSelectedYearDates(prev => {
      const isSelected = prev.includes(date);
      const newSelection = isSelected
        ? prev.filter(d => d !== date)
        : [...prev, date];

      // Hide toast if visible when user makes a selection
      if (toastVisible && newSelection.length > 0) {
        hideToast();
      }

      return newSelection;
    });
  };

  // Handler for year flexible toggle
  const handleYearFlexibleToggle = isSelected => {
    setIsYearFlexible(isSelected);
  };

  // Handlers for period selector
  const handlePeriodDaysChange = days => {
    setPeriodDays(days);

    // Hide toast if visible when user makes a selection
    if (toastVisible && days && days !== '0') {
      hideToast();
    }

    console.log('Period days changed:', days);
  };

  const handlePeriodChange = period => {
    setSelectedPeriod(period);
    console.log('Period changed:', period);
  };

  // Handlers for repeat selector
  const handleRepeatFlexibleToggle = isSelected => {
    setIsRepeatFlexible(isSelected);
    console.log('Repeat flexible toggled:', isSelected);
  };

  const handleRepeatAlternateDaysToggle = isSelected => {
    setIsRepeatAlternateDays(isSelected);
    console.log('Repeat alternate days toggled:', isSelected);
  };

  // Initialize animations on mount
  useEffect(() => {
    if (radioAnimations[selectedFrequency]) {
      radioAnimations[selectedFrequency].innerScale.setValue(1);
    }

    // Initialize checkbox animations based on selected weekdays
    selectedWeekdays.forEach(day => {
      if (checkboxAnimations[day]) {
        checkboxAnimations[day].checkScale.setValue(1);
      }
    });

    if (isFlexible) {
      flexibleTickAnimation.setValue(1);
    }
  }, []);

  const renderRadioButton = option => {
    const isSelected = selectedFrequency === option;
    const animations = radioAnimations[option];

    return (
      <TouchableOpacity
        key={option}
        style={styles.radioButtonContainer}
        onPress={() => handleFrequencySelect(option)}
        activeOpacity={0.7}>
        <View
          style={[
            styles.radioButton,
            isSelected
              ? styles.radioButtonSelected
              : styles.radioButtonUnselected,
          ]}>
          <Animated.View
            style={[
              styles.radioButtonInner,
              {
                transform: [{scale: animations.innerScale}],
              },
            ]}
          />
        </View>
        <Text
          style={[
            styles.radioButtonText,
            isSelected
              ? styles.radioButtonTextSelected
              : styles.radioButtonTextUnselected,
          ]}>
          {option}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderWeekdayCheckbox = weekday => {
    const isSelected = selectedWeekdays.includes(weekday.key);
    const animations = checkboxAnimations[weekday.key];

    return (
      <TouchableOpacity
        key={weekday.key}
        style={styles.weekdayContainer}
        onPress={() => handleWeekdayToggle(weekday.key)}
        activeOpacity={0.7}>
        <View
          style={[
            styles.checkbox,
            isSelected ? styles.checkboxSelected : styles.checkboxUnselected,
          ]}>
          <Animated.View
            style={[
              styles.checkmarkContainer,
              {
                transform: [{scale: animations.checkScale}],
              },
            ]}>
            <MaterialIcons name="check" size={WP(3.2)} color={colors.White} />
          </Animated.View>
        </View>
        <Text
          style={[
            styles.weekdayText,
            isSelected
              ? styles.weekdayTextSelected
              : styles.weekdayTextUnselected,
          ]}>
          {weekday.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderWeekdaySelection = () => {
    if (selectedFrequency !== 'Specific days of the week') {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.weekdaySelectionContainer,
          {
            opacity: weekdayOpacity,
            transform: [{translateY: weekdayTranslateY}],
          },
        ]}>
        <View style={styles.weekdayRow}>
          {weekdays.slice(0, 3).map(weekday => renderWeekdayCheckbox(weekday))}
        </View>

        <View style={styles.weekdayRow}>
          {weekdays.slice(3, 6).map(weekday => renderWeekdayCheckbox(weekday))}
        </View>

        <View style={styles.weekdayRow}>
          {weekdays.slice(6).map(weekday => renderWeekdayCheckbox(weekday))}
        </View>

        {/* Flexible Container */}
        <View style={styles.flexibleContainer}>
          <TouchableOpacity
            style={styles.flexibleTouchable}
            onPress={handleFlexibleToggle}
            activeOpacity={0.7}>
            <View style={styles.flexibleContent}>
              <Text
                style={[
                  styles.flexibleTitle,
                  isFlexible
                    ? styles.flexibleTitleSelected
                    : styles.flexibleTitleUnselected,
                ]}>
                Flexible
              </Text>
              <Text style={styles.flexibleSubtitle}>
                It will be shown each day until completed
              </Text>
            </View>

            <View
              style={[
                styles.flexibleRadioButton,
                isFlexible
                  ? styles.flexibleRadioButtonSelected
                  : styles.flexibleRadioButtonUnselected,
              ]}>
              <Animated.View
                style={[
                  styles.flexibleCheckmarkContainer,
                  {
                    transform: [{scale: flexibleTickAnimation}],
                  },
                ]}>
                <MaterialIcons name="check" size={WP(2.7)} color="#018B5A" />
              </Animated.View>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="How Often Do You Want To Do It?">
          <TouchableOpacity onPress={handleNextPress}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <View style={styles.content}>
        {/* Radio Button Options */}
        <View style={styles.optionsContainer}>
          {frequencyOptions.map(option => {
            return (
              <View key={option}>
                {renderRadioButton(option)}
                {option === 'Specific days of the week' &&
                  renderWeekdaySelection()}
                {option === 'Specific days of the month' && (
                  <MonthDateSelector
                    isVisible={
                      selectedFrequency === 'Specific days of the month'
                    }
                    selectedDates={selectedMonthDates}
                    onDateToggle={handleMonthDateToggle}
                    onFlexibleToggle={handleMonthFlexibleToggle}
                    isFlexible={isMonthFlexible}
                    onUseDayOfWeekToggle={handleUseDayOfWeekToggle}
                    useDayOfWeek={useDayOfWeek}
                  />
                )}
                {option === 'Specific days of the year' && (
                  <YearDateSelector
                    isVisible={
                      selectedFrequency === 'Specific days of the year'
                    }
                    selectedDates={selectedYearDates}
                    onDateToggle={handleYearDateToggle}
                    onFlexibleToggle={handleYearFlexibleToggle}
                    isFlexible={isYearFlexible}
                  />
                )}
                {option === 'Some days per period' && (
                  <PeriodSelector
                    isVisible={selectedFrequency === 'Some days per period'}
                    onDaysChange={handlePeriodDaysChange}
                    onPeriodChange={handlePeriodChange}
                  />
                )}
                {option === 'Repeat' && (
                  <RepeatSelector
                    isVisible={selectedFrequency === 'Repeat'}
                    onFlexibleToggle={handleRepeatFlexibleToggle}
                    onAlternateDaysToggle={handleRepeatAlternateDaysToggle}
                    onRepeatDataChange={handleRepeatDataChange}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>

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
        <View style={styles.progressDotActive}>
          <View style={styles.progressDotActiveInner}>
            <Text style={styles.progressDotTextActive}>3</Text>
          </View>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDotInactive}>
          <Text style={styles.progressDotTextInactive}>4</Text>
        </View>
      </View>

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
    marginTop: HP(2.5),
    paddingBottom: HP(0.6),
  },
  nextText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(5),
    paddingTop: HP(0.8),
  },
  optionsContainer: {
    marginBottom: HP(2.5),
  },
  radioButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(0.6),
    paddingVertical: HP(1.0),
  },
  radioButton: {
    width: WP(4.3),
    height: WP(4.3),
    borderRadius: WP(2.15),
    borderWidth: WP(0.5),
    marginRight: WP(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.Primary,
    backgroundColor: colors.White,
  },
  radioButtonUnselected: {
    borderColor: '#595959',
    backgroundColor: colors.White,
  },
  radioButtonInner: {
    width: WP(2.1),
    height: WP(2.1),
    borderRadius: WP(1.05),
    backgroundColor: colors.Primary,
  },
  radioButtonText: {
    fontSize: FS(1.75),
    fontFamily: 'OpenSans-SemiBold',
    flex: 1,
  },
  radioButtonTextSelected: {
    color: '#595959',
  },
  radioButtonTextUnselected: {
    color: '#595959',
  },
  // Weekday Selection Styles
  weekdaySelectionContainer: {
    marginTop: HP(0.9),
    marginRight: WP(-6.2),
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: HP(2.6),
    justifyContent: 'flex-start',
    marginLeft: WP(0.2),
  },
  weekdayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    Width: '100%',
  },
  checkbox: {
    width: WP(4.3),
    height: WP(4.3),
    borderRadius: WP(0.8),
    borderWidth: WP(0.27),
    marginRight: WP(2.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: colors.Primary,
    backgroundColor: colors.Primary,
  },
  checkboxUnselected: {
    borderColor: '#747474',
    backgroundColor: colors.White,
  },
  checkmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    flexShrink: 1,
  },
  weekdayTextSelected: {
    color: '#747474',
  },
  weekdayTextUnselected: {
    color: '#747474',
  },
  flexibleContainer: {
    paddingVertical: HP(0.25),
    marginTop: HP(-0.25),
  },
  flexibleTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: WP(1.6),
    marginLeft: WP(0.5),
  },
  flexibleRadioButton: {
    width: WP(4.3),
    height: WP(4.3),
    borderRadius: WP(2.15),
    borderWidth: WP(0.5),
    marginRight: WP(5.1),
    marginBottom: HP(0.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexibleRadioButtonSelected: {
    borderColor: '#BFE3D2',
    backgroundColor: '#BFE3D2',
  },
  flexibleRadioButtonUnselected: {
    borderColor: '#8E8E8E',
    backgroundColor: colors.White,
  },
  flexibleCheckmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexibleContent: {
    flex: 1,
    paddingRight: WP(4.3),
  },
  flexibleTitle: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    marginBottom: HP(0.4),
  },
  flexibleTitleSelected: {
    color: '#595959',
  },
  flexibleTitleUnselected: {
    color: '#747474',
  },
  flexibleSubtitle: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Regular',
    color: '#8A8A8A',
    lineHeight: HP(1.5),
    marginBottom: HP(1.25),
  },
  // Progress Indicator Styles
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

export default FrequencyScreen;

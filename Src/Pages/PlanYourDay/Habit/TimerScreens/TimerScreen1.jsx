import React, {useState} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useRoute} from '@react-navigation/native';
import Headers from '../../../../Components/Headers';
import CustomDropdown from '../../../../Components/Dropdown';
import TimePicker from '../../../../Components/TimePicker';
import CustomToast from '../../../../Components/CustomToast';
import {colors} from '../../../../Helper/Contants';
import {HP, WP, FS} from '../../../../utils/dimentions';

const TimerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const selectedCategory = route.params?.selectedCategory;
  const evaluationType = route.params?.evaluationType;

  const [habit, setHabit] = useState('');
  const [description, setDescription] = useState('');
  const [habitFocused, setHabitFocused] = useState(false);
  const [selectedDropdownValue, setSelectedDropdownValue] =
    useState('At Least');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  const dropdownOptions = ['At Least', 'Less than', 'Any Value'];

  const isHabitLabelActive = habitFocused || habit.length > 0;

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

    if (selectedDropdownValue === 'Less than') {
      const {hours, minutes, seconds} = selectedTime;
      const totalTime = hours + minutes + seconds;

      if (totalTime === 0) {
        showToast('Enter a value greater than zero');
        return false;
      }
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

  const handleTimeSelect = time => {
    setSelectedTime(time);

    if (toastVisible && selectedDropdownValue === 'Less than') {
      const {hours, minutes, seconds} = time;
      const totalTime = hours + minutes + seconds;

      if (totalTime > 0) {
        hideToast();
      }
    }

    console.log('Selected time:', time);
  };

  const handleHabitChange = text => {
    setHabit(text);

    if (toastVisible) {
      hideToast();
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
      description: description.trim(),
      selectedDropdownValue,
      selectedTime,
    };

    // Navigate to FrequencyScreen
    navigation.navigate('FrequencyScreen', navigationData);
  };

  const handleHabitBlur = () => {
    setHabitFocused(false);
  };

  const formatTime = time => {
    const {hours, minutes, seconds} = time;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

      <View style={styles.content}>
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
      </View>

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
        <View style={styles.progressLine} />
        <View style={styles.progressDotInactive}>
          <Text style={styles.progressDotTextInactive}>3</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDotInactive}>
          <Text style={styles.progressDotTextInactive}>4</Text>
        </View>
      </View>

      {/* TimePicker Modal */}
      <TimePicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onTimeSelect={handleTimeSelect}
        initialTime={selectedTime}
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
    transition: 'all 0.2s ease',
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

export default TimerScreen;

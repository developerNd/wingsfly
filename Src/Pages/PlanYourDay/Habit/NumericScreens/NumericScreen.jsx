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
import {colors} from '../../../../Helper/Contants';
import {HP, WP, FS} from '../../../../utils/dimentions';

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

const NumericScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Get previous screen data
  const selectedCategory = route.params?.selectedCategory;
  const evaluationType = route.params?.evaluationType;

  const [habit, setHabit] = useState('');
  const [goal, setGoal] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [habitFocused, setHabitFocused] = useState(false);
  const [selectedDropdownValue, setSelectedDropdownValue] =
    useState('At Least');

  const dropdownOptions = ['At Least', 'Less than', 'Exactly', 'Any Value'];

  const isHabitLabelActive = habitFocused || habit.length > 0;

  const handleDropdownSelect = value => {
    setSelectedDropdownValue(value);
    console.log('Selected option:', value);
  };

  const handleNextPress = () => {
    const navigationData = {
      selectedCategory,
      evaluationType,
      habit,
      goal,
      unit,
      description,
      selectedDropdownValue,
    };

    // Navigate to next screen (you can change this to your desired screen)
    navigation.navigate('FrequencyScreen', navigationData);
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
            onChangeText={setHabit}
            onFocus={() => setHabitFocused(true)}
            onBlur={() => setHabitFocused(false)}
            placeholder=""
            placeholderTextColor="#575656"
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
            <TextInput
              style={styles.textInput1}
              value={goal}
              onChangeText={setGoal}
              placeholder="Goal"
              placeholderTextColor="#929292"
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

        {/* Description Input Container - Updated to match second file */}
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
  staticLabel: {
    fontSize: FS(1.7),
    color: '#666666',
    fontFamily: 'OpenSans-Bold',
    marginBottom: HP(0.5),
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
});

export default NumericScreen;

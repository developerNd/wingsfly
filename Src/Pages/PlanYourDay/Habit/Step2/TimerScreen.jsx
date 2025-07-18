import React, { useState } from "react";
import { Text, View, StyleSheet, StatusBar, TextInput, TouchableOpacity } from "react-native";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Headers from "../../../../Components/Headers";
import CustomDropdown from "../../../../Components/Dropdown";
import TimePicker from "../../../../Components/TimePicker"; 
import { colors } from "../../../../Helper/Contants";

const TimerScreen = () => {
  const [habit, setHabit] = useState("");
  const [description, setDescription] = useState("");
  const [habitFocused, setHabitFocused] = useState(false);
  const [selectedDropdownValue, setSelectedDropdownValue] = useState("At Least");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const dropdownOptions = [
    "At Least",
    "Less than",
    "Any Value"
  ];

  const isHabitLabelActive = habitFocused || habit.length > 0;

  const handleDropdownSelect = (value) => {
    setSelectedDropdownValue(value);
    console.log("Selected option:", value);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    console.log("Selected time:", time);
  };

  const formatTime = (time) => {
    const { hours, minutes, seconds } = time;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDisplayTime = (time) => {
    const { hours, minutes } = time;
    if (hours === 0 && minutes === 0) {
      return "00:00";
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <View style={styles.headerWrapper}>
        <Headers title="Define Your Task">
          <Text style={styles.nextText}>Next</Text>
        </Headers>
      </View>

      <View style={styles.content}>
        {/* Habit Input Container */}
        <View style={styles.inputContainer}>
          <Text style={[
            styles.inputLabel,
            isHabitLabelActive ? styles.inputLabelActive : styles.inputLabelInactive
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
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.timeDisplayText}>
              {formatDisplayTime(selectedTime)}
            </Text>
          </TouchableOpacity>
          <Text style={styles.dayText}>a day.</Text>
        </View>

        {/* Example Text */}
        <Text style={styles.exampleText}>e.g. Study for the exam. At least 2 chapters a day</Text>

        {/* Description Input Container */}
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
          <MaterialIcons 
            name="check" 
            size={12} 
            color="#FFFFFF" 
          />
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
    </View>
  );
};

export default TimerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerWrapper: {
    marginTop: 20,
    paddingBottom: 5,
  },
  nextText: {
    fontSize: 14,
    color: "#0059FF",
    fontFamily: "OpenSans-Bold",
    marginTop: 4
  },
  content: {
    flex: 1,
    paddingHorizontal: 17,
    paddingTop: 20,
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: "#F0F0F0",
    minHeight: 35,
  },
  inputLabel: {
    fontSize: 13,
    color: "#666666",
    fontFamily: "OpenSans-Bold",
    position: 'absolute',
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 4,
    zIndex: 1,
    transition: 'all 0.2s ease',
  },
  inputLabelActive: {
    top: -10,
    left: 12,
    fontSize: 13,
    color: "#666666",
    fontFamily: "OpenSans-Bold",
  },
  inputLabelInactive: {
    top: 12,
    left: 12,
    fontSize: 14,
    color: "#575656",
    fontFamily: "OpenSans-Bold",
  },
  textInput: {
    fontSize: 16,
    fontFamily: "OpenSans-SemiBold",
    color: "#000000",
    paddingVertical: -2,
    paddingHorizontal: 8,
  },
  timeMainContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  timeDisplayContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 57,
    paddingVertical: 15, 
    marginRight: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  timeDisplayText: {
    fontSize: 14, 
    fontFamily: "OpenSans-SemiBold",
    color: "#575656",
    textAlign: "center",
  },
  dayText: {
    fontSize: 13,
    fontFamily: "OpenSans-SemiBold",
    color: "#929292",
  },
  exampleText: {
    fontSize: 10,
    fontFamily: "OpenSans-SemiBold",
    color: "#A3A3A3",
    marginBottom: 16,
    lineHeight: 18,
    textAlign: "center",
  },
  descriptionInput: {
    fontSize: 14,
    fontFamily: "OpenSans-Regular",
    color: "#575656",
    minHeight: 16,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
  },
  progressIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  progressDotCompleted: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#151B73",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#151B73",
  },
  progressDotActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#151B73",
  },
  progressDotActiveInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#151B73",
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotTextActive: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "OpenSans-Bold",
  },
  progressDotInactive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "transparent", 
    borderWidth: 2, 
    borderColor: "#151B73", 
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotTextInactive: {
    color: "#151B73", 
    fontSize: 9,
    fontFamily: "OpenSans-Bold",
  },
  progressLine: {
    width: 20,
    height: 1.3,
    marginLeft: 2,
    marginRight: 2,
    backgroundColor: "#151B73",
  },
});
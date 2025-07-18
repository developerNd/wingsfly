import React, { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const CustomDropdown = ({
  options = [],
  defaultValue = "",
  onSelect = () => {},
  placeholder = "Select an option",
  style = {},
  dropdownStyle = {},
  optionStyle = {},
  textStyle = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue);

  const handleOptionSelect = (option) => {
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
          dropdownStyle
        ]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={[
          styles.dropdownText,
          !selectedValue && styles.placeholderText,
          textStyle
        ]}>
          {selectedValue || placeholder}
        </Text>
        <MaterialIcons
          name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
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
                index === options.length - 1 && styles.dropdownOptionLast
              ]}
              onPress={() => handleOptionSelect(option)}
            >
              <Text style={[
                styles.dropdownOptionText,
                selectedValue === option && styles.dropdownOptionTextSelected
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

export default CustomDropdown;

const styles = StyleSheet.create({
  dropdownWrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownContainer: {
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
    borderWidth: 1,
    borderColor: "#F0F0F0",
    minHeight: 35,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  dropdownContainerOpen: {
    marginBottom: 0,
    borderColor: "#151B73",
    borderWidth: 1.5
  },
  dropdownText: {
    fontSize: 14,
    fontFamily: "OpenSans-Regular",
    color: "#575656",
    paddingVertical: 11,
    marginLeft: 7
  },
  placeholderText: {
    color: "#575656",
    fontFamily: "OpenSans-SemiBold",
  },
  dropdownOptions: {
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: 15,
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1001,
    paddingVertical: 3,
    paddingHorizontal: 2
  },
  dropdownOption: {
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
  },
  dropdownOptionText: {
    fontSize: 14,
    fontFamily: "OpenSans-SemiBold",
    color: "#575656",
  },
  dropdownOptionTextSelected: {
    fontFamily: "OpenSans-SemiBold",
    color: "#575656",
  },
});
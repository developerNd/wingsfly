import React, {useState} from 'react';
import {Text, View, StyleSheet, TouchableOpacity} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {HP, WP, FS} from '../utils/dimentions';
import {colors} from '../Helper/Contants';

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
          size={WP(6.4)}
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

const styles = StyleSheet.create({
  dropdownWrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    padding: WP(2.133),
    marginBottom: HP(1.875),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: WP(0.267),
    borderColor: '#F0F0F0',
    minHeight: HP(4.375),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: HP(0.25),
    paddingHorizontal: WP(3.2),
  },
  dropdownContainerOpen: {
    marginBottom: 0,
    borderColor: colors.Primary,
    borderWidth: WP(0.4),
  },
  dropdownText: {
    fontSize: FS(1.87),
    fontFamily: 'OpenSans-Regular',
    color: '#575656',
    paddingVertical: HP(1.375),
    marginLeft: WP(1.87),
  },
  placeholderText: {
    color: '#575656',
    fontFamily: 'OpenSans-SemiBold',
  },
  dropdownOptions: {
    backgroundColor: colors.White,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderBottomLeftRadius: WP(2.133),
    borderBottomRightRadius: WP(2.133),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    marginBottom: HP(1.875),
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1001,
    paddingVertical: HP(0.375),
    paddingHorizontal: WP(0.933),
  },
  dropdownOption: {
    paddingVertical: HP(0.56),
    paddingHorizontal: WP(4.267),
    marginTop: HP(0.8),
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
    marginBottom: HP(1.2),
  },
  dropdownOptionText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
  },
  dropdownOptionTextSelected: {
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
  },
});

export default CustomDropdown;

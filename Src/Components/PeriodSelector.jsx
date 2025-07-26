import React, {useState, useRef} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const PeriodSelector = ({isVisible, onDaysChange, onPeriodChange}) => {
  const [days, setDays] = useState('1');
  const [period, setPeriod] = useState('Week');
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownOpacity = useRef(new Animated.Value(0)).current;
  const dropdownTranslateY = useRef(new Animated.Value(-10)).current;

  const periods = ['WEEK', 'MONTH', 'YEAR'];

  const animateDropdown = show => {
    if (show) {
      setShowDropdown(true);
      Animated.parallel([
        Animated.timing(dropdownOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(dropdownTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(dropdownOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(dropdownTranslateY, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setShowDropdown(false));
    }
  };

  const handleDaysChange = text => {
    setDays(text);
    onDaysChange && onDaysChange(text);
  };

  const handlePeriodSelect = selectedPeriod => {
    setPeriod(selectedPeriod);
    onPeriodChange && onPeriodChange(selectedPeriod);
    animateDropdown(false);
  };

  const toggleDropdown = () => {
    animateDropdown(!showDropdown);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.mainContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={days}
            onChangeText={handleDaysChange}
            keyboardType="numeric"
            maxLength={2}
          />
          <View style={styles.underline} />
        </View>

        <Text style={styles.daysPerText}>Days Per</Text>

        <TouchableOpacity
          style={styles.dropdownTrigger}
          onPress={toggleDropdown}
          activeOpacity={0.7}>
          <Text style={styles.dropdownText}>{period}</Text>
          <MaterialIcons
            name={showDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={WP(7)}
            color="#646464"
          />
        </TouchableOpacity>
      </View>

      {showDropdown && (
        <Animated.View
          style={[
            styles.dropdown,
            {
              opacity: dropdownOpacity,
              transform: [{translateY: dropdownTranslateY}],
            },
          ]}>
          {periods.map(periodOption => (
            <TouchableOpacity
              key={periodOption}
              style={styles.dropdownOption}
              onPress={() => handlePeriodSelect(periodOption)}
              activeOpacity={0.7}>
              <Text style={styles.dropdownOptionText}>{periodOption}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: HP(1),
    marginLeft: WP(13.3),
    marginBottom: HP(1),
    position: 'relative',
    zIndex: 1000,
  },
  mainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: WP(3),
    paddingHorizontal: WP(3),
    marginBottom: HP(0.5),
    alignSelf: 'flex-start',
    maxWidth: WP(70),
    height: HP(5.4),
  },
  inputContainer: {
    alignItems: 'center',
  },
  input: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#868686',
    textAlign: 'center',
    backgroundColor: 'transparent',
    marginLeft: WP(-0.7),
    marginBottom: HP(-2),
  },
  underline: {
    width: WP(5),
    height: 1,
    backgroundColor: colors.Primary,
    marginBottom: HP(2),
  },
  daysPerText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#868686',
    marginLeft: WP(6),
    marginRight: WP(5.5),
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dropdownText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#303030',
    marginRight: WP(6),
  },
  dropdown: {
    position: 'absolute',
    top: HP(0.7),
    right: WP(22.5),
    backgroundColor: colors.White,
    borderRadius: WP(1),
    width: WP(19.5),
    height: HP(12.7),
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  dropdownOption: {
    paddingVertical: HP(0.4),
    marginTop: HP(1.1),
  },
  dropdownOptionText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#303030',
    textAlign: 'center',
  },
});

export default PeriodSelector;

import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const RepeatSelector = ({
  isVisible,
  onFlexibleToggle,
  onAlternateDaysToggle,
  onRepeatDataChange,
}) => {
  const [selectedTab, setSelectedTab] = useState('Activity');
  const [repeatValue, setRepeatValue] = useState('2');
  const [activityValue, setActivityValue] = useState('');
  const [restValue, setRestValue] = useState('');
  const [isFlexible, setIsFlexible] = useState(true);
  const [isAlternateDays, setIsAlternateDays] = useState(false);

  // Animation values
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const containerTranslateY = useRef(new Animated.Value(-10)).current;
  const flexibleTickAnimation = useRef(new Animated.Value(1)).current;
  const alternateTickAnimation = useRef(new Animated.Value(0)).current;

  // Helper function to send data to parent
  const sendDataToParent = (overrides = {}) => {
    const data = {
      everyDays: isAlternateDays ? null : parseInt(repeatValue) || null,
      activityDays: isAlternateDays ? parseInt(activityValue) || null : null,
      restDays: isAlternateDays ? parseInt(restValue) || null : null,
      isRepeatFlexible: isFlexible,
      isRepeatAlternateDays: isAlternateDays,
      ...overrides,
    };

    console.log('Sending repeat data to parent:', data); // Debug log

    if (onRepeatDataChange) {
      onRepeatDataChange(data);
    }
  };

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(containerTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Send initial data when component becomes visible
      sendDataToParent();
    } else {
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(containerTranslateY, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  // Send data whenever any value changes
  useEffect(() => {
    if (isVisible) {
      sendDataToParent();
    }
  }, [
    repeatValue,
    activityValue,
    restValue,
    isFlexible,
    isAlternateDays,
    isVisible,
  ]);

  const animateFlexibleTick = isSelected => {
    Animated.timing(flexibleTickAnimation, {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const animateAlternateTick = isSelected => {
    Animated.timing(alternateTickAnimation, {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleTabPress = tab => {
    setSelectedTab(tab);
  };

  const handleFlexibleToggle = () => {
    const newFlexibleState = !isFlexible;
    setIsFlexible(newFlexibleState);
    animateFlexibleTick(newFlexibleState);

    if (onFlexibleToggle) {
      onFlexibleToggle(newFlexibleState);
    }
  };

  const handleAlternateDaysToggle = () => {
    const newAlternateState = !isAlternateDays;
    setIsAlternateDays(newAlternateState);
    animateAlternateTick(newAlternateState);

    let updatedFlexible = isFlexible;

    if (newAlternateState && isFlexible) {
      setIsFlexible(false);
      animateFlexibleTick(false);
      updatedFlexible = false;
      if (onFlexibleToggle) {
        onFlexibleToggle(false);
      }
    } else if (!newAlternateState && !isFlexible) {
      setIsFlexible(true);
      animateFlexibleTick(true);
      updatedFlexible = true;
      if (onFlexibleToggle) {
        onFlexibleToggle(true);
      }
    }

    if (onAlternateDaysToggle) {
      onAlternateDaysToggle(newAlternateState);
    }
  };

  const handleRepeatValueChange = value => {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '');
    setRepeatValue(numericValue);
  };

  const handleActivityValueChange = value => {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '');
    setActivityValue(numericValue);
    console.log('Activity value changed:', numericValue); // Debug log
  };

  const handleRestValueChange = value => {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '');
    setRestValue(numericValue);
    console.log('Rest value changed:', numericValue); // Debug log
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{translateY: containerTranslateY}],
        },
      ]}>
      {/* Show "Every X Days" when flexible is active OR when both options are inactive */}
      {(isFlexible && !isAlternateDays) || (!isFlexible && !isAlternateDays) ? (
        <View style={styles.repeatContainer}>
          <View style={styles.repeatSection}>
            <Text style={styles.repeatLabel}>Every</Text>
          </View>

          <View style={styles.repeatInputSection}>
            <TextInput
              style={styles.repeatInput}
              value={repeatValue}
              onChangeText={handleRepeatValueChange}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={styles.repeatSection}>
            <Text style={styles.repeatLabel}>Days</Text>
          </View>
        </View>
      ) : (
        /* Show Activity X Rest inputs when alternate days is active */
        <View style={styles.tabContainer}>
          <View style={styles.tab}>
            <TextInput
              style={styles.tabInput}
              value={activityValue}
              onChangeText={handleActivityValueChange}
              placeholder="Activity"
              placeholderTextColor="#868686"
              keyboardType="numeric"
              maxLength={2}
              textAlign="center"
              multiline={false}
              numberOfLines={1}
            />
            <View style={styles.underline} />
          </View>

          <View style={styles.centerXContainer}>
            <Text style={styles.centerX}>X</Text>
          </View>

          <View style={styles.tab}>
            <TextInput
              style={styles.tabInput}
              value={restValue}
              onChangeText={handleRestValueChange}
              placeholder="Rest"
              placeholderTextColor="#868686"
              keyboardType="numeric"
              maxLength={2}
              textAlign="center"
              multiline={false}
              numberOfLines={1}
            />
            <View style={styles.underline} />
          </View>
        </View>
      )}

      {/* Flexible Option */}
      {!isAlternateDays && (
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionTouchable}
            onPress={handleFlexibleToggle}
            activeOpacity={0.7}>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Flexible</Text>
              <Text style={styles.optionSubtitle}>
                It will be shown each day until completed
              </Text>
            </View>

            <View
              style={[
                styles.optionCheckbox,
                isFlexible
                  ? styles.optionCheckboxSelected
                  : styles.optionCheckboxUnselected,
              ]}>
              <Animated.View
                style={[
                  styles.checkmarkContainer,
                  {
                    transform: [{scale: flexibleTickAnimation}],
                  },
                ]}>
                <MaterialIcons name="check" size={WP(3.2)} color="#018B5A" />
              </Animated.View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Alternate Days Option */}
      <View style={styles.optionContainer}>
        <TouchableOpacity
          style={styles.optionTouchable}
          onPress={handleAlternateDaysToggle}
          activeOpacity={0.7}>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Alternate Days</Text>
          </View>

          <View style={styles.newToggleContainer}>
            <View
              style={[
                styles.newToggleTrack,
                isAlternateDays
                  ? styles.newToggleTrackActive
                  : styles.newToggleTrackInactive,
              ]}>
              <Animated.View
                style={[
                  styles.newToggleSwitch,
                  isAlternateDays
                    ? styles.newToggleSwitchActive
                    : styles.newToggleSwitchInactive,
                  {
                    transform: [
                      {
                        translateX: alternateTickAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [WP(0.5), WP(4.0)],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: HP(0.9),
    marginLeft: WP(0.5),
    marginBottom: HP(1),
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: HP(2),
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: WP(3),
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(2),
    width: '68%',
    alignSelf: 'center',
    height: HP(5.8),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: HP(4),
  },
  tabText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#868686',
    marginBottom: HP(0.7),
  },
  tabInput: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#868686',
    minWidth: WP(15),
    maxWidth: WP(20),
    textAlign: 'center',
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(1),
    height: HP(3),
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  centerXContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: WP(2),
  },
  centerX: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: '#8A8A8A',
  },
  underline: {
    position: 'absolute',
    bottom: HP(0.5),
    left: '50%',
    marginLeft: -WP(7.5),
    height: HP(0.2),
    width: WP(15),
    backgroundColor: '#C5C5C5',
    borderRadius: HP(0.1),
  },
  repeatContainer: {
    flexDirection: 'row',
    marginBottom: HP(2),
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: WP(3),
    paddingHorizontal: WP(1),
    width: '50%',
    height: '24%',
    alignSelf: 'center',
  },
  repeatSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatInputSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatLabel: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#868686',
  },
  repeatInput: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    textAlign: 'center',
    minWidth: WP(6),
  },
  optionContainer: {
    marginBottom: HP(1.5),
  },
  optionTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: HP(0.5),
  },
  optionContent: {
    flex: 1,
    paddingRight: WP(4),
  },
  optionTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#747474',
    marginBottom: HP(0.3),
  },
  optionSubtitle: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#8A8A8A',
    lineHeight: HP(1.7),
  },
  optionCheckbox: {
    width: WP(4.8),
    height: WP(4.8),
    borderRadius: WP(2.4),
    borderWidth: WP(0.4),
    top: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckboxSelected: {
    borderColor: '#BFE3D2',
    backgroundColor: '#BFE3D2',
  },
  optionCheckboxUnselected: {
    borderColor: '#C5C5C5',
    backgroundColor: colors.White,
  },
  checkmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  newToggleContainer: {
    width: WP(8.0),
    height: HP(2.0),
    position: 'relative',
    justifyContent: 'center',
  },
  newToggleTrack: {
    width: WP(8.0),
    height: HP(2.0),
    borderRadius: WP(2.7),
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderColor: colors.Primary,
    borderWidth: WP(0.3),
  },
  newToggleTrackActive: {
    backgroundColor: colors.Primary,
  },
  newToggleTrackInactive: {
    backgroundColor: '#EEEEEE',
  },
  newToggleSwitch: {
    width: WP(3),
    height: WP(3),
    borderRadius: WP(1.5),
    position: 'absolute',
    top: HP(0.15),
  },
  newToggleSwitchActive: {
    backgroundColor: colors.White,
  },
  newToggleSwitchInactive: {
    backgroundColor: colors.Primary,
  },
});

export default RepeatSelector;

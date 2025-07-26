import React, {useState, useRef, useEffect} from 'react';
import {Text, View, StyleSheet, TouchableOpacity, Animated} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {HP, WP, FS} from '../utils/dimentions';
import {colors} from '../Helper/Contants';

const MonthDateSelector = ({
  isVisible,
  selectedDates = [],
  onDateToggle,
  onFlexibleToggle,
  isFlexible = false,
  onUseDayOfWeekToggle,
  useDayOfWeek = false,
}) => {
  // Animation values for date buttons
  const dateAnimations = useRef({}).current;

  // Animation values for flexible and day of week toggles
  const flexibleTickAnimation = useRef(
    new Animated.Value(isFlexible ? 1 : 0),
  ).current;
  const dayOfWeekToggleAnimation = useRef(
    new Animated.Value(useDayOfWeek ? 1 : 0),
  ).current;

  // Container animation
  const containerOpacity = useRef(
    new Animated.Value(isVisible ? 1 : 0),
  ).current;
  const containerTranslateY = useRef(
    new Animated.Value(isVisible ? 0 : -10),
  ).current;

  // Initialize date animations
  useEffect(() => {
    for (let i = 1; i <= 31; i++) {
      if (!dateAnimations[i]) {
        dateAnimations[i] = new Animated.Value(
          selectedDates.includes(i) ? 1 : 0,
        );
      }
    }
  }, []);

  // Animate container visibility
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

  // Animate date selection
  const animateDate = (date, isSelected) => {
    if (!dateAnimations[date]) {
      dateAnimations[date] = new Animated.Value(0);
    }

    Animated.timing(dateAnimations[date], {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Animate flexible toggle
  const animateFlexibleTick = isSelected => {
    Animated.timing(flexibleTickAnimation, {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Animate day of week toggle
  const animateDayOfWeekToggle = isSelected => {
    Animated.timing(dayOfWeekToggleAnimation, {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleDatePress = date => {
    const isSelected = selectedDates.includes(date);
    animateDate(date, !isSelected);
    onDateToggle(date);
  };

  const handleFlexiblePress = () => {
    const newFlexibleState = !isFlexible;
    animateFlexibleTick(newFlexibleState);
    onFlexibleToggle(newFlexibleState);
  };

  const handleDayOfWeekPress = () => {
    const newDayOfWeekState = !useDayOfWeek;
    animateDayOfWeekToggle(newDayOfWeekState);
    onUseDayOfWeekToggle(newDayOfWeekState);
  };

  const renderDateButton = date => {
    const isSelected = selectedDates.includes(date);

    return (
      <TouchableOpacity
        key={date}
        style={styles.dateButton}
        onPress={() => handleDatePress(date)}
        activeOpacity={0.7}>
        <View
          style={[
            styles.dateButtonInner,
            isSelected
              ? styles.dateButtonSelected
              : styles.dateButtonUnselected,
          ]}>
          <Text
            style={[
              styles.dateText,
              isSelected ? styles.dateTextSelected : styles.dateTextUnselected,
            ]}>
            {date}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDateGrid = () => {
    const rows = [];
    const datesPerRow = 7;

    // First 4 rows (1-28)
    for (let row = 0; row < 4; row++) {
      const dates = [];
      for (let col = 0; col < datesPerRow; col++) {
        const date = row * datesPerRow + col + 1;
        dates.push(renderDateButton(date));
      }
      rows.push(
        <View key={row} style={styles.dateRow}>
          {dates}
        </View>,
      );
    }

    // Last row (29-31 + Last button)
    const lastRowDates = [29, 30, 31];
    const lastRow = (
      <View key="lastRow" style={styles.lastDateRow}>
        {lastRowDates.map(date => renderDateButton(date))}
        <TouchableOpacity
          style={styles.lastButton}
          onPress={() => handleDatePress('last')}
          activeOpacity={0.7}>
          <View
            style={[
              styles.lastButtonInner,
              selectedDates.includes('last')
                ? styles.dateButtonSelected
                : styles.dateButtonUnselected,
            ]}>
            <Text
              style={[
                styles.dateText,
                selectedDates.includes('last')
                  ? styles.dateTextSelected
                  : styles.dateTextUnselected,
              ]}>
              Last
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
    rows.push(lastRow);

    return rows;
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{translateY: containerTranslateY}],
        },
      ]}>
      {/* Date Grid */}
      <View style={styles.dateGrid}>{renderDateGrid()}</View>

      <Text style={styles.selectText}>Select at least one day</Text>

      <View style={styles.flexibleContainer}>
        <TouchableOpacity
          style={styles.flexibleTouchable}
          onPress={handleFlexiblePress}
          activeOpacity={0.7}>
          <View style={styles.flexibleContent}>
            <Text style={styles.flexibleTitle}>Flexible</Text>
            <Text style={styles.flexibleSubtitle}>
              It was be showp each day until completed
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

      {/* Use day of the week Option - Fixed toggle bounds */}
      <View style={styles.dayOfWeekContainer}>
        <View style={styles.dayOfWeekContent}>
          <Text style={styles.dayOfWeekText}>Use day of the week</Text>
        </View>

        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={handleDayOfWeekPress}
          activeOpacity={0.7}>
          <View
            style={[
              styles.toggleTrack,
              useDayOfWeek
                ? styles.toggleTrackActive
                : styles.toggleTrackInactive,
            ]}>
            <Animated.View
              style={[
                styles.toggleSwitch,
                useDayOfWeek
                  ? styles.toggleSwitchActive
                  : styles.toggleSwitchInactive,
                {
                  transform: [
                    {
                      translateX: dayOfWeekToggleAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [WP(0.5), WP(4.0)],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: HP(1.0),
    marginLeft: WP(6.7),
    marginRight: WP(7.0),
  },
  dateGrid: {
    marginBottom: HP(1.25),
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: HP(1.5),
    justifyContent: 'space-between',
  },
  lastDateRow: {
    flexDirection: 'row',
    marginBottom: HP(0.5),
    justifyContent: 'center',
    alignItems: 'center',
    gap: WP(3.2),
  },
  dateButton: {
    width: WP(7.85),
    height: HP(3.85),
  },
  dateButtonInner: {
    width: WP(7.85),
    height: HP(3.85),
    borderRadius: WP(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: WP(0.3),
  },
  dateButtonSelected: {
    backgroundColor: colors.Primary,
    borderColor: colors.Primary,
  },
  dateButtonUnselected: {
    backgroundColor: '#F1F1F1',
    borderColor: '#F1F1F1',
  },
  dateText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
  },
  dateTextSelected: {
    color: colors.White,
  },
  dateTextUnselected: {
    color: '#818181',
  },
  lastButton: {
    width: WP(11.6),
    height: HP(3.55),
  },
  lastButtonInner: {
    width: WP(11.6),
    height: HP(3.55),
    borderRadius: WP(2.4),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: WP(0.3),
  },
  selectText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#878787',
    textAlign: 'center',
    marginBottom: HP(1.9),
  },
  // Fixed Flexible Option Styles
  flexibleContainer: {
    paddingVertical: HP(0.25),
    marginBottom: HP(1.5),
  },
  flexibleTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: WP(0),
  },
  flexibleRadioButton: {
    width: WP(4.3),
    height: WP(4.3),
    borderRadius: WP(2.1),
    borderWidth: WP(0.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(-5.3),
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
    color: '#747474',
    marginLeft: WP(-6.1),
  },
  flexibleSubtitle: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Regular',
    color: '#8A8A8A',
    lineHeight: HP(1.5),
    marginLeft: WP(-6.1),
  },
  // Fixed toggle styles
  dayOfWeekContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: HP(0.6),
    marginBottom: HP(0.4),
  },
  dayOfWeekContent: {
    flex: 1,
  },
  dayOfWeekText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#747474',
    marginLeft: WP(-6.1),
  },
  toggleContainer: {
    width: WP(8.0),
    height: HP(2.0),
    position: 'relative',
    justifyContent: 'center',
    marginRight: WP(-5.3),
  },
  toggleTrack: {
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
  toggleTrackActive: {
    backgroundColor: colors.Primary,
  },
  toggleTrackInactive: {
    backgroundColor: '#EEEEEE',
  },
  toggleSwitch: {
    width: WP(3.2),
    height: WP(3.2),
    borderRadius: WP(1.6),
    position: 'absolute',
    top: HP(0.1),
  },
  toggleSwitchActive: {
    backgroundColor: colors.White,
  },
  toggleSwitchInactive: {
    backgroundColor: colors.Primary,
  },
});

export default MonthDateSelector;

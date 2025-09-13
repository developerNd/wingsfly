import React, {useState, useRef, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
  Image,
  StatusBar
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {HP, WP, FS} from '../utils/dimentions';
import {colors, Icons} from '../Helper/Contants';

const YearDateSelector = ({
  isVisible,
  selectedDates,
  onDateToggle,
  onFlexibleToggle,
  isFlexible,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('January');
  const [selectedDay, setSelectedDay] = useState(1);
  const [scrollOffsets, setScrollOffsets] = useState({
    months: 0,
    days: 0,
  });

  // Animation values
  const containerOpacity = useRef(
    new Animated.Value(isVisible ? 1 : 0),
  ).current;
  const containerTranslateY = useRef(
    new Animated.Value(isVisible ? 0 : -10),
  ).current;
  const flexibleTickAnimation = useRef(
    new Animated.Value(isFlexible ? 1 : 0),
  ).current;

  const monthScrollRef = useRef(null);
  const dayScrollRef = useRef(null);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const ITEM_HEIGHT = HP(5.0);

  const getDaysInMonth = month => {
    const monthIndex = months.indexOf(month);
    const year = new Date().getFullYear();
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  // Create extended arrays for infinite-like scrolling
  const createExtendedArray = array => {
    const extendedArray = [...array.slice(-3), ...array, ...array.slice(0, 3)];
    return extendedArray;
  };

  const extendedMonths = createExtendedArray(months);
  const extendedDays = createExtendedArray(
    Array.from({length: getDaysInMonth(selectedMonth)}, (_, i) => i + 1),
  );

  // Animate container appearance/disappearance
  const animateContainer = show => {
    if (show) {
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
  };

  // Animate flexible tick
  const animateFlexibleTick = isSelected => {
    Animated.timing(flexibleTickAnimation, {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    animateContainer(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => {
        const monthIndex = months.indexOf(selectedMonth);
        const dayIndex = selectedDay - 1;
        const initialOffset = 3 * ITEM_HEIGHT;

        monthScrollRef.current?.scrollTo({
          y: monthIndex * ITEM_HEIGHT + initialOffset,
          animated: false,
        });
        dayScrollRef.current?.scrollTo({
          y: dayIndex * ITEM_HEIGHT + initialOffset,
          animated: false,
        });
      }, 100);
    }
  }, [showModal, selectedMonth, selectedDay]);

  const handleAddDate = () => {
    setShowModal(true);
  };

  const handleDateSelect = () => {
    const dateString = `${selectedMonth} ${selectedDay}`;
    onDateToggle(dateString);
    setShowModal(false);
  };

  const handleRemoveDate = dateToRemove => {
    onDateToggle(dateToRemove);
  };

  const handleFlexibleToggle = () => {
    const newFlexibleState = !isFlexible;
    onFlexibleToggle(newFlexibleState);
    animateFlexibleTick(newFlexibleState);
  };

  const handleScroll = (event, type) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);

    setScrollOffsets(prev => ({
      ...prev,
      [type]: y,
    }));

    let originalArray, scrollRef;
    if (type === 'months') {
      originalArray = months;
      scrollRef = monthScrollRef;
    } else {
      originalArray = Array.from(
        {length: getDaysInMonth(selectedMonth)},
        (_, i) => i + 1,
      );
      scrollRef = dayScrollRef;
    }

    let actualIndex = index - 3;

    if (actualIndex < 0) {
      actualIndex = originalArray.length + actualIndex;
    } else if (actualIndex >= originalArray.length) {
      actualIndex = actualIndex - originalArray.length;
    }

    const value =
      originalArray[
        Math.max(0, Math.min(originalArray.length - 1, actualIndex))
      ];

    if (type === 'months') {
      if (value !== selectedMonth) {
        setSelectedMonth(value);
        const daysInNewMonth = getDaysInMonth(value);
        if (selectedDay > daysInNewMonth) {
          setSelectedDay(daysInNewMonth);
        }
      }
    } else {
      setSelectedDay(value);
    }

    // Handle infinite scroll wraparound
    if (index <= 2) {
      const newPosition =
        (originalArray.length + index - 3) * ITEM_HEIGHT + 3 * ITEM_HEIGHT;
      setTimeout(() => {
        scrollRef.current?.scrollTo({y: newPosition, animated: false});
      }, 0);
    } else if (index >= originalArray.length + 3) {
      const newPosition =
        (index - originalArray.length) * ITEM_HEIGHT + 3 * ITEM_HEIGHT;
      setTimeout(() => {
        scrollRef.current?.scrollTo({y: newPosition, animated: false});
      }, 0);
    }
  };

  const getItemPosition = (itemIndex, scrollOffset) => {
    const currentCenterIndex = Math.round(scrollOffset / ITEM_HEIGHT);
    return itemIndex - currentCenterIndex;
  };

  const renderScrollPicker = (data, selectedValue, type, scrollRef) => (
    <View style={styles.pickerContainer}>
      <View style={styles.pickerWrapper}>
        <View style={styles.selectionIndicatorTop} />
        <View style={styles.selectionIndicatorBottom} />

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={event => {
            const y = event.nativeEvent.contentOffset.y;
            setScrollOffsets(prev => ({
              ...prev,
              [type]: y,
            }));
          }}
          scrollEventThrottle={16}
          onMomentumScrollEnd={event => handleScroll(event, type)}
          onScrollEndDrag={event => handleScroll(event, type)}
          contentContainerStyle={styles.scrollViewContent}>
          <View style={[styles.pickerItem, {opacity: 0}]}>
            <Text style={styles.pickerItemText}>Placeholder</Text>
          </View>

          {data.map((item, index) => {
            const relativePosition = getItemPosition(
              index,
              scrollOffsets[type],
            );
            const isSelected = relativePosition === 0;
            const displayText = type === 'days' ? item.toString() : item;

            let textColor = '#242424';
            if (relativePosition === 1 || relativePosition === -1) {
              textColor = '#A8A8A8';
            } else if (!isSelected) {
              textColor = '#BFBFBF';
            }

            return (
              <View key={`${type}-${index}`} style={styles.pickerItem}>
                <Text
                  style={[
                    styles.pickerItemText,
                    isSelected && styles.pickerItemTextSelected,
                    {color: textColor},
                  ]}>
                  {displayText}
                </Text>
              </View>
            );
          })}

          <View style={[styles.pickerItem, {opacity: 0}]}>
            <Text style={styles.pickerItemText}>Placeholder</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );

  const handleClose = () => {
    setShowModal(false);
  };

  const resetToDefault = () => {
    setSelectedMonth('January');
    setSelectedDay(1);
    setTimeout(() => {
      const initialOffset = 3 * ITEM_HEIGHT;
      monthScrollRef.current?.scrollTo({y: initialOffset, animated: true});
      dayScrollRef.current?.scrollTo({y: initialOffset, animated: true});
    }, 100);
  };

  if (!isVisible) return null;

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: containerOpacity,
            transform: [{translateY: containerTranslateY}],
          },
        ]}>
        {/* Select Date Row */}
        <View style={styles.selectDateRow}>
          <View style={styles.selectTextContainer}>
            {selectedDates.length === 0 ? (
              <Text style={styles.selectDateText}>Select at least one day</Text>
            ) : (
              <View style={styles.selectedDatesInContainer}>
                <View style={styles.datesListContainer}>
                  {selectedDates.map((date, index) => (
                    <Text key={index} style={styles.selectedDateChipText}>
                      {date}
                      {index < selectedDates.length - 1 ? ', ' : ''}
                    </Text>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() =>
                    handleRemoveDate(selectedDates[selectedDates.length - 1])
                  }
                  style={styles.deleteButton}
                  activeOpacity={0.7}>
                  <Image source={Icons.Trash} style={styles.deleteIcon} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.plusIconContainer}
            onPress={handleAddDate}
            activeOpacity={0.7}>
            <MaterialIcons name="add" size={WP(5.3)} color={colors.White} />
          </TouchableOpacity>
        </View>

        {/* Flexible Option */}
        <View style={styles.flexibleContainer}>
          {selectedDates.length === 0 && (
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
          )}
        </View>
      </Animated.View>

      {/*Date Selection Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <StatusBar backgroundColor={colors.ModelBackground} barStyle="dark-content" />
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select a date</Text>

            <View style={styles.datePickerContainer}>
              {renderScrollPicker(
                extendedMonths,
                selectedMonth,
                'months',
                monthScrollRef,
              )}
              {renderScrollPicker(
                extendedDays,
                selectedDay,
                'days',
                dayScrollRef,
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}>
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.okButton}
                onPress={handleDateSelect}>
                <Text style={styles.okButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: HP(0.5),
    marginRight: WP(-6.2),
    paddingLeft: WP(0.3),
  },
  selectDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: HP(1.5),
    marginRight: WP(6.9),
    marginLeft: WP(2.1),
  },
  selectTextContainer: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: WP(2.1),
    paddingHorizontal: WP(4.7),
    marginRight: WP(3.2),
    minHeight: HP(5.4),
    justifyContent: 'center',
  },
  selectDateText: {
    fontSize: FS(1.62),
    color: '#9B9B9B',
    fontFamily: 'OpenSans-SemiBold',
  },
  // styles for selected dates display
  selectedDatesInContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  datesListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  selectedDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(0.5),
  },
  selectedDateChipText: {
    fontSize: FS(1.5),
    color: '#595959',
    fontFamily: 'OpenSans-SemiBold',
  },
  deleteButton: {
    padding: WP(1.1),
    marginLeft: WP(1.1),
    marginRight: WP(-2.1),
  },
  deleteIcon: {
    width: WP(3.7),
    height: WP(3.7),
  },
  plusIconContainer: {
    width: WP(10.8),
    height: HP(4.75),
    backgroundColor: colors.Primary,
    borderRadius: WP(3.4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDatesContainer: {
    marginBottom: HP(1.5),
    marginRight: WP(6.2),
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: WP(1.6),
    paddingHorizontal: WP(3.2),
    paddingVertical: HP(1.0),
    marginBottom: HP(0.8),
  },
  selectedDateText: {
    fontSize: FS(1.6),
    color: '#595959',
    fontFamily: 'OpenSans-SemiBold',
  },
  removeDateButton: {
    padding: WP(0.5),
  },
  // Flexible Option Styles
  flexibleContainer: {
    paddingVertical: HP(0.25),
    marginTop: HP(-0.25),
    marginRight: WP(6.2),
    minHeight: HP(5.0),
    justifyContent: 'center',
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
    borderRadius: WP(2.1),
    borderWidth: WP(0.5),
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
  // Enhanced Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.ModelBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(4.7),
    padding: WP(5.3),
    width: '75%',
    maxWidth: WP(87.5),
    elevation: 5,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.25,
    shadowRadius: WP(2.1),
  },
  modalTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    textAlign: 'center',
    marginBottom: HP(0.5),
    marginTop: HP(1.0),
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HP(1.5),
    height: HP(20),
    paddingHorizontal: WP(4.0),
  },
  pickerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  pickerWrapper: {
    height: HP(15.0),
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  selectionIndicatorTop: {
    position: 'absolute',
    top: HP(5.0),
    left: WP(6.4),
    right: WP(5.3),
    height: HP(0.2),
    backgroundColor: '#575757',
    zIndex: 1,
    width: WP(14.6),
  },
  selectionIndicatorBottom: {
    position: 'absolute',
    top: HP(10.0),
    left: WP(6.4),
    right: WP(5.3),
    height: HP(0.2),
    backgroundColor: '#575757',
    zIndex: 1,
    width: WP(14.6),
  },
  scrollView: {
    height: HP(15.0),
    width: '100%',
  },
  scrollViewContent: {
    paddingVertical: 0,
  },
  pickerItem: {
    height: HP(5.0),
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: FS(1.68),
    fontFamily: 'OpenSans-Regular',
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    fontSize: FS(1.68),
    fontFamily: 'OpenSans-SemiBold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: WP(11),
    marginRight: WP(2.7),
    marginTop: HP(-0.5),
  },
  cancelButton: {
    paddingHorizontal: WP(4.0),
    paddingVertical: HP(1.2),
  },
  cancelButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
  },
  okButton: {
    paddingHorizontal: WP(4.0),
    paddingVertical: HP(1.2),
  },
  okButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
  },
});

export default YearDateSelector;

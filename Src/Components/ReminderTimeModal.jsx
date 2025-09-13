import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import {HP, WP, FS} from '../utils/dimentions';
import {colors} from '../Helper/Contants';

const ITEM_HEIGHT = HP(3);
const VISIBLE_ITEMS = 6;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const CENTER_INDEX = 2;

const ReminderTimeModal = ({
  visible,
  onClose,
  onSave,
  initialHours = 9,
  initialMinutes = 0,
  modalTitle = 'Select Reminder Time',
}) => {
  const [selectedHours, setSelectedHours] = useState(9);
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState('AM');

  const [hoursScroll, setHoursScroll] = useState(0);
  const [minutesScroll, setMinutesScroll] = useState(0);
  const [amPmScroll, setAmPmScroll] = useState(0);

  const hoursScrollRef = useRef(null);
  const minutesScrollRef = useRef(null);
  const amPmScrollRef = useRef(null);

  // 12-hour format for display (1-12)
  const hours = Array.from({length: 12}, (_, i) => i + 1);
  
  // All minutes for time selection
  const minutes = Array.from({length: 60}, (_, i) => i);

  // AM/PM options
  const amPmOptions = ['AM', 'PM'];
  const amPmDisplay = ['', '', 'AM', 'PM', '', '', ''];

  const createExtendedArray = array => [
    ...array.slice(-3),
    ...array,
    ...array.slice(0, 3),
  ];

  // Convert 24-hour to 12-hour format
  const convertTo12Hour = hour24 => {
    if (hour24 === 0) return 12;
    if (hour24 > 12) return hour24 - 12;
    return hour24;
  };

  // Convert 12-hour to 24-hour format
  const convertTo24Hour = (hour12, amPm) => {
    if (amPm === 'AM') {
      return hour12 === 12 ? 0 : hour12;
    } else {
      return hour12 === 12 ? 12 : hour12 + 12;
    }
  };

  // Initialize scroll positions when modal becomes visible
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        const initialOffset = 3 * ITEM_HEIGHT;

        // Convert 24-hour to 12-hour format for display
        const displayHour = convertTo12Hour(initialHours);
        const displayAmPm = initialHours < 12 ? 'AM' : 'PM';

        setSelectedHours(displayHour);
        setSelectedMinutes(initialMinutes);
        setSelectedAmPm(displayAmPm);

        // Set initial positions for hours
        const hoursIndex = hours.indexOf(displayHour);
        if (hoursScrollRef.current && hoursIndex !== -1) {
          hoursScrollRef.current.scrollTo({
            y: hoursIndex * ITEM_HEIGHT + initialOffset,
            animated: false,
          });
        }

        // Set initial positions for minutes
        const minutesIndex = minutes.indexOf(initialMinutes);
        if (minutesScrollRef.current && minutesIndex !== -1) {
          minutesScrollRef.current.scrollTo({
            y: minutesIndex * ITEM_HEIGHT + initialOffset,
            animated: false,
          });
        }

        // Set AM/PM position
        const amPmIndex = displayAmPm === 'AM' ? 1 : 2;
        if (amPmScrollRef.current) {
          const targetY = (amPmIndex - 2) * ITEM_HEIGHT;
          amPmScrollRef.current.scrollTo({
            y: targetY,
            animated: false,
          });
          setAmPmScroll(targetY);
        }
      }, 100);
    }
  }, [visible, initialHours, initialMinutes]);

  // Update selected values when props change
  useEffect(() => {
    const displayHour = convertTo12Hour(initialHours);
    const displayAmPm = initialHours < 12 ? 'AM' : 'PM';

    setSelectedHours(displayHour);
    setSelectedMinutes(initialMinutes);
    setSelectedAmPm(displayAmPm);
  }, [initialHours, initialMinutes]);

  const getTextColorByPosition = absoluteIndex => {
    switch (absoluteIndex) {
      case 0:
        return '#DCDCDC';
      case 1:
        return '#BFBFBF';
      case 2:
        return '#6A6565'; // Center item color (darker)
      case 3:
        return '#BFBFBF';
      case 4:
        return '#DCDCDC';
      case 5:
        return '#E8E8E8';
      default:
        return '#999999';
    }
  };

  // AM/PM scroll handler for padded array
  const handleAmPmScroll = event => {
    const y = event.nativeEvent.contentOffset.y;
    setAmPmScroll(y);

    const index = Math.round(y / ITEM_HEIGHT) + 2;
    const value = amPmDisplay[index];
    if (value && value !== selectedAmPm && (value === 'AM' || value === 'PM')) {
      setSelectedAmPm(value);
    }
  };

  // AM/PM snap handler for padded array
  const handleAmPmMomentumEnd = event => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const targetY = index * ITEM_HEIGHT;

    if (Math.abs(y - targetY) > ITEM_HEIGHT * 0.1) {
      amPmScrollRef.current?.scrollTo({
        y: targetY,
        animated: true,
      });
      setAmPmScroll(targetY);
    }

    const centerIndex = index + 2;
    const value = amPmDisplay[centerIndex];
    if (value && (value === 'AM' || value === 'PM') && value !== selectedAmPm) {
      setSelectedAmPm(value);
    }
  };

  // scroll handler with infinite scrolling logic for hours and minutes
  const handleInfiniteScroll = (
    event,
    setter,
    setScrollPos,
    originalArray,
    scrollRef,
  ) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);

    setScrollPos(y);

    // Calculate actual index in original array
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
    setter(value);

    // Handle boundary wrapping
    if (index <= 2) {
      const newPosition =
        (originalArray.length + index - 3) * ITEM_HEIGHT + 3 * ITEM_HEIGHT;
      setTimeout(() => {
        scrollRef.current?.scrollTo({y: newPosition, animated: false});
        setScrollPos(newPosition);
      }, 0);
    } else if (index >= originalArray.length + 3) {
      const newPosition =
        (index - originalArray.length) * ITEM_HEIGHT + 3 * ITEM_HEIGHT;
      setTimeout(() => {
        scrollRef.current?.scrollTo({y: newPosition, animated: false});
        setScrollPos(newPosition);
      }, 0);
    }
  };

  const calculateItemPosition = (itemIndex, scrollPosition) => {
    const scrollIndex = Math.floor(
      (scrollPosition + ITEM_HEIGHT / 2) / ITEM_HEIGHT,
    );
    const relativeIndex =
      (itemIndex - scrollIndex + CENTER_INDEX + VISIBLE_ITEMS) % VISIBLE_ITEMS;
    return relativeIndex;
  };

  // Calculate position for AM/PM items - simplified for fixed array
  const calculateAmPmItemPosition = (itemIndex, scrollPosition) => {
    const scrollIndex = Math.floor(
      (scrollPosition + ITEM_HEIGHT / 2) / ITEM_HEIGHT,
    );
    return itemIndex - scrollIndex + 2;
  };

  const renderTimeColumn = (
    items,
    selectedValue,
    onSelect,
    scrollRef,
    scrollPosition,
    columnType = 'number',
  ) => {
    let displayItems;
    if (columnType === 'ampm') {
      displayItems = amPmDisplay;
    } else {
      displayItems = createExtendedArray(items);
    }

    return (
      <View
        style={[
          styles.timeColumnContainer,
          columnType === 'ampm' && styles.amPmColumnContainer,
        ]}>
        <View style={[styles.timeColumn, {height: PICKER_HEIGHT}]}>
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            bounces={false}
            contentContainerStyle={[
              styles.infiniteScrollContent,
              {
                paddingTop:
                  columnType === 'ampm' ? 0 : CENTER_INDEX * ITEM_HEIGHT,
                paddingBottom:
                  columnType === 'ampm' ? 0 : CENTER_INDEX * ITEM_HEIGHT,
              },
            ]}
            onScroll={e => {
              if (columnType === 'ampm') {
                handleAmPmScroll(e);
              } else if (items === hours) {
                setHoursScroll(e.nativeEvent.contentOffset.y);
              } else if (items === minutes) {
                setMinutesScroll(e.nativeEvent.contentOffset.y);
              }
            }}
            scrollEventThrottle={16}
            onMomentumScrollEnd={e => {
              if (columnType === 'ampm') {
                handleAmPmMomentumEnd(e);
              } else {
                handleInfiniteScroll(
                  e,
                  onSelect,
                  items === hours ? setHoursScroll : setMinutesScroll,
                  items,
                  scrollRef,
                );
              }
            }}
            onScrollEndDrag={e => {
              if (columnType === 'ampm') {
                handleAmPmMomentumEnd(e);
              } else {
                handleInfiniteScroll(
                  e,
                  onSelect,
                  items === hours ? setHoursScroll : setMinutesScroll,
                  items,
                  scrollRef,
                );
              }
            }}>
            {displayItems.map((item, index) => {
              const position =
                columnType === 'ampm'
                  ? calculateAmPmItemPosition(index, scrollPosition)
                  : calculateItemPosition(index, scrollPosition);

              // Skip rendering empty padding items for AM/PM
              if (columnType === 'ampm' && item === '') {
                return (
                  <View
                    key={`empty-${index}`}
                    style={[styles.timeItem, {height: ITEM_HEIGHT}]}
                  />
                );
              }

              return (
                <View
                  key={`${item}-${index}`}
                  style={[styles.timeItem, {height: ITEM_HEIGHT}]}>
                  <TouchableOpacity
                    style={styles.timeItemTouchable}
                    onPress={() => {
                      onSelect(item);
                      if (columnType === 'ampm') {
                        const amPmIndex = amPmDisplay.findIndex(
                          v => v === item,
                        );
                        const targetPosition = (amPmIndex - 2) * ITEM_HEIGHT;
                        if (scrollRef.current && amPmIndex !== -1) {
                          scrollRef.current.scrollTo({
                            y: Math.max(0, targetPosition),
                            animated: true,
                          });
                        }
                      } else {
                        const originalIndex = items.indexOf(item);
                        const targetPosition =
                          originalIndex * ITEM_HEIGHT + 3 * ITEM_HEIGHT;
                        if (scrollRef.current) {
                          scrollRef.current.scrollTo({
                            y: targetPosition,
                            animated: true,
                          });
                        }
                      }
                    }}>
                    <Text
                      style={[
                        styles.timeText,
                        {color: getTextColorByPosition(position)},
                        columnType === 'ampm' && styles.amPmText,
                      ]}>
                      {columnType === 'ampm'
                        ? item
                        : String(item).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  const handleCancel = () => {
    // Reset to initial values
    const displayHour = convertTo12Hour(initialHours);
    const displayAmPm = initialHours < 12 ? 'AM' : 'PM';

    setSelectedHours(displayHour);
    setSelectedMinutes(initialMinutes);
    setSelectedAmPm(displayAmPm);
    onClose();
  };

  const handleSave = () => {
    console.log('=== REMINDER TIME SAVE DEBUG ===');
    console.log('Selected Hours (12-hour format):', selectedHours);
    console.log('Selected Minutes:', selectedMinutes);
    console.log('Selected AM/PM:', selectedAmPm);

    // Convert to 24-hour format
    const finalHours24 = convertTo24Hour(selectedHours, selectedAmPm);

    console.log('Converting 12-hour to 24-hour:');
    console.log(
      `  Input: ${selectedHours}:${selectedMinutes} ${selectedAmPm}`,
    );
    console.log(
      `  Output: ${finalHours24}:${selectedMinutes} (24-hour format)`,
    );

    const timeData = {
      hours: finalHours24, // 24-hour format
      minutes: selectedMinutes,
      amPm: selectedAmPm, // Keep AM/PM for display purposes
      formattedTime: `${String(finalHours24).padStart(2, '0')}:${String(
        selectedMinutes,
      ).padStart(2, '0')}`, // 24-hour format without AM/PM
      displayTime: `${selectedHours}:${String(selectedMinutes).padStart(2, '0')} ${selectedAmPm}`, // 12-hour format for display
      totalMinutes: finalHours24 * 60 + selectedMinutes,
      hours24: finalHours24, // Final hours value (24-hour format)
      hours12: selectedHours, // 12-hour format for display
    };

    console.log('Final timeData object:', timeData);
    console.log('=== END REMINDER TIME SAVE DEBUG ===');

    onSave(timeData);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}>
        <StatusBar
          backgroundColor={colors.ModelBackground}
          barStyle="dark-content"
        />
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={e => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{modalTitle}</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.timePickerContainer}>
              {/* Fixed highlight backgrounds */}
              <View
                style={[styles.timeColumnHighlight, styles.hoursHighlight]}
              />
              <View
                style={[styles.timeColumnHighlight, styles.minutesHighlight]}
              />
              <View
                style={[styles.timeColumnHighlight, styles.amPmHighlight]}
              />

              <View style={styles.timeColumns}>
                {/* Hours Column */}
                {renderTimeColumn(
                  hours,
                  selectedHours,
                  setSelectedHours,
                  hoursScrollRef,
                  hoursScroll,
                  'number',
                )}

                {/* Minutes Column */}
                {renderTimeColumn(
                  minutes,
                  selectedMinutes,
                  setSelectedMinutes,
                  minutesScrollRef,
                  minutesScroll,
                  'number',
                )}

                {/* AM/PM Column */}
                {renderTimeColumn(
                  amPmOptions,
                  selectedAmPm,
                  setSelectedAmPm,
                  amPmScrollRef,
                  amPmScroll,
                  'ampm',
                )}
              </View>

              {/* Time separator */}
              <Text style={styles.timeSeparator}>:</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.7}>
                <Text style={styles.saveButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.ModelBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: WP(85),
    backgroundColor: colors.White,
    borderRadius: WP(2),
    overflow: 'hidden',
  },
  header: {
    backgroundColor: colors.Primary,
    paddingVertical: HP(2.1),
    paddingHorizontal: WP(6),
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
    marginLeft: WP(1),
  },
  content: {
    backgroundColor: colors.White,
    paddingBottom: HP(2),
  },
  timePickerContainer: {
    paddingHorizontal: WP(4),
    paddingTop: HP(2),
    paddingBottom: HP(2),
    position: 'relative',
  },
  timeColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: WP(2),
  },
  timeColumnContainer: {
    alignItems: 'center',
    width: WP(18),
  },
  amPmColumnContainer: {
    alignItems: 'center',
    width: WP(20),
  },
  timeColumn: {
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  infiniteScrollContent: {
    alignItems: 'center',
  },
  timeColumnHighlight: {
    position: 'absolute',
    top: HP(2.35) + CENTER_INDEX * ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    backgroundColor: '#E2E2E2',
    borderRadius: WP(0.5),
    zIndex: 0,
    height: HP(2.7),
  },
  hoursHighlight: {
    left: WP(6),
    width: WP(18),
  },
  minutesHighlight: {
    left: WP(32),
    width: WP(18),
  },
  amPmHighlight: {
    right: WP(8),
    width: WP(20),
  },
  timeItem: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeItemTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timeText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  amPmText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
    color: '#6A6565',
  },
  timeSeparator: {
    position: 'absolute',
    top: HP(2.8) + CENTER_INDEX * ITEM_HEIGHT,
    left: WP(28),
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: '#6A6565',
    zIndex: 3,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: WP(10.5),
    paddingTop: HP(1),
    justifyContent: 'space-between',
    gap: WP(5),
    marginBottom: 8,
  },
  cancelButton: {
    backgroundColor: '#E2E2E2',
    height: HP(4.4),
    paddingHorizontal: WP(8),
    borderRadius: WP(2),
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: WP(1),
  },
  cancelButtonText: {
    color: '#6A6565',
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
  },
  saveButton: {
    backgroundColor: colors.Primary,
    height: HP(4.4),
    paddingHorizontal: WP(9),
    borderRadius: WP(2),
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: WP(1),
  },
  saveButtonText: {
    color: colors.White,
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
  },
});

export default ReminderTimeModal;
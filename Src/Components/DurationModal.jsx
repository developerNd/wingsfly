import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {HP, WP, FS} from '../utils/dimentions';
import {colors} from '../Helper/Contants';

const ITEM_HEIGHT = HP(3);
const VISIBLE_ITEMS = 6;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const CENTER_INDEX = 2;

const DurationModal = ({
  visible,
  onClose,
  onSave,
  initialHours = 2,
  initialMinutes = 15,
}) => {
  const [selectedHours, setSelectedHours] = useState(initialHours);
  const [selectedMinutes, setSelectedMinutes] = useState(initialMinutes);

  // Scroll position states for color calculation
  const [hoursScroll, setHoursScroll] = useState(0);
  const [minutesScroll, setMinutesScroll] = useState(0);

  const hoursScrollRef = useRef(null);
  const minutesScrollRef = useRef(null);

  const hours = Array.from({length: 24}, (_, i) => i);
  const minutes = Array.from({length: 12}, (_, i) => i * 5);

  const createExtendedArray = array => {
    return [...array.slice(-3), ...array, ...array.slice(0, 3)];
  };

  // Initialize scroll positions when modal becomes visible
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        const initialOffset = 3 * ITEM_HEIGHT;

        // Set initial positions for hours
        const hoursIndex = hours.indexOf(selectedHours);
        if (hoursScrollRef.current && hoursIndex !== -1) {
          hoursScrollRef.current.scrollTo({
            y: hoursIndex * ITEM_HEIGHT + initialOffset,
            animated: false,
          });
        }

        // Set initial positions for minutes
        const minutesIndex = minutes.indexOf(selectedMinutes);
        if (minutesScrollRef.current && minutesIndex !== -1) {
          minutesScrollRef.current.scrollTo({
            y: minutesIndex * ITEM_HEIGHT + initialOffset,
            animated: false,
          });
        }
      }, 100);
    }
  }, [visible, selectedHours, selectedMinutes]);

  const getTextColorByPosition = absoluteIndex => {
    switch (absoluteIndex) {
      case 0:
        return '#DCDCDC';
      case 1:
        return '#BFBFBF';
      case 2:
        return '#6A6565';
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

  // scroll handler with infinite scrolling logic
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

  const handleScroll = (event, setValue, setScrollPos, items, scrollRef) => {
    handleInfiniteScroll(event, setValue, setScrollPos, items, scrollRef);
  };

  const calculateItemPosition = (itemIndex, scrollPosition) => {
    const scrollIndex = Math.floor(
      (scrollPosition + ITEM_HEIGHT / 2) / ITEM_HEIGHT,
    );
    const relativeIndex =
      (itemIndex - scrollIndex + CENTER_INDEX + VISIBLE_ITEMS) % VISIBLE_ITEMS;
    return relativeIndex;
  };

  const renderDurationColumn = (
    items,
    selectedValue,
    onSelect,
    scrollHandler,
    scrollRef,
    scrollPosition,
  ) => {
    const extendedItems = createExtendedArray(items);
    const selectedIndex = items.indexOf(selectedValue);

    return (
      <View style={styles.durationColumnContainer}>
        <View style={[styles.timeColumnContainer, {height: PICKER_HEIGHT}]}>
          <ScrollView
            ref={scrollRef}
            style={styles.timeColumn}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            contentContainerStyle={[
              styles.infiniteScrollContent,
              {
                paddingTop: CENTER_INDEX * ITEM_HEIGHT,
                paddingBottom: CENTER_INDEX * ITEM_HEIGHT,
              },
            ]}
            onScroll={e => {
              const y = e.nativeEvent.contentOffset.y;
              if (items === hours) {
                setHoursScroll(y);
              } else {
                setMinutesScroll(y);
              }
            }}
            scrollEventThrottle={16}
            onMomentumScrollEnd={e =>
              scrollHandler(
                e,
                onSelect,
                items === hours ? setHoursScroll : setMinutesScroll,
                items,
                scrollRef,
              )
            }
            onScrollEndDrag={e =>
              scrollHandler(
                e,
                onSelect,
                items === hours ? setHoursScroll : setMinutesScroll,
                items,
                scrollRef,
              )
            }>
            {extendedItems.map((item, index) => {
              const position = calculateItemPosition(index, scrollPosition);

              return (
                <View
                  key={`${item}-${index}`}
                  style={[styles.timeItem, {height: ITEM_HEIGHT}]}>
                  <TouchableOpacity
                    style={styles.timeItemTouchable}
                    onPress={() => {
                      onSelect(item);
                      const originalIndex = items.indexOf(item);
                      const targetPosition =
                        originalIndex * ITEM_HEIGHT + 3 * ITEM_HEIGHT;
                      if (scrollRef.current) {
                        scrollRef.current.scrollTo({
                          y: targetPosition,
                          animated: true,
                        });
                      }
                    }}>
                    <Text
                      style={[
                        styles.timeText,
                        {color: getTextColorByPosition(position)},
                      ]}>
                      {String(item).padStart(2, '0')}
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
    setSelectedHours(initialHours);
    setSelectedMinutes(initialMinutes);
    onClose();
  };

  const handleSave = () => {
    const durationData = {
      hours: selectedHours,
      minutes: selectedMinutes,
      formattedDuration: `${String(selectedHours).padStart(2, '0')}:${String(
        selectedMinutes,
      ).padStart(2, '0')}`,
    };
    onSave(durationData);
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
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={e => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Duration</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.durationPickerContainer}>
              {/* Fixed highlight backgrounds */}
              <View
                style={[styles.timeColumnHighlight, styles.hoursHighlight]}
              />
              <View
                style={[styles.timeColumnHighlight, styles.minutesHighlight]}
              />

              {/* Fixed labels */}
              <Text style={[styles.unitLabel, styles.fixedHoursLabel]}>
                hours
              </Text>
              <Text style={[styles.unitLabel, styles.fixedMinutesLabel]}>
                minutes
              </Text>

              <View style={styles.durationColumns}>
                {/* Hours Column */}
                {renderDurationColumn(
                  hours,
                  selectedHours,
                  setSelectedHours,
                  handleScroll,
                  hoursScrollRef,
                  hoursScroll,
                )}

                {/* Minutes Column */}
                {renderDurationColumn(
                  minutes,
                  selectedMinutes,
                  setSelectedMinutes,
                  handleScroll,
                  minutesScrollRef,
                  minutesScroll,
                )}
              </View>
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
    backgroundColor: '#47474773',
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
  durationPickerContainer: {
    paddingHorizontal: WP(4),
    paddingTop: HP(2),
    paddingBottom: HP(2),
    position: 'relative',
  },
  durationColumns: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: WP(2),
  },

  durationColumnContainer: {
    alignItems: 'center',
    width: WP(30),
  },
  timeColumnContainer: {
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  timeColumn: {
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
  },
  hoursHighlight: {
    left: WP(12),
    width: WP(14.5),
    height: HP(2.5),
  },
  minutesHighlight: {
    right: WP(26.5),
    width: WP(14.5),
    height: HP(2.7),
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
    marginRight: WP(15),
  },
  unitLabel: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#6A6565',
  },
  fixedHoursLabel: {
    position: 'absolute',
    top: HP(1.6) + CENTER_INDEX * ITEM_HEIGHT + ITEM_HEIGHT / 2 - FS(1.4) / 2,
    left: WP(30),
    zIndex: 2,
  },
  fixedMinutesLabel: {
    position: 'absolute',
    top: HP(1.6) + CENTER_INDEX * ITEM_HEIGHT + ITEM_HEIGHT / 2 - FS(1.4) / 2,
    right: WP(11),
    zIndex: 2,
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

export default DurationModal;

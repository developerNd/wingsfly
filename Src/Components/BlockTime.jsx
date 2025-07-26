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

const BlockTimeModal = ({visible, onClose, onSave}) => {
  const [startHour, setStartHour] = useState(11);
  const [startMinute, setStartMinute] = useState(40);
  const [startPeriod, setStartPeriod] = useState('AM');
  const [endHour, setEndHour] = useState(12);
  const [endMinute, setEndMinute] = useState(30);
  const [endPeriod, setEndPeriod] = useState('PM');

  // Scroll position states for color calculation
  const [startHourScroll, setStartHourScroll] = useState(0);
  const [startMinuteScroll, setStartMinuteScroll] = useState(0);
  const [startPeriodScroll, setStartPeriodScroll] = useState(0);
  const [endHourScroll, setEndHourScroll] = useState(0);
  const [endMinuteScroll, setEndMinuteScroll] = useState(0);
  const [endPeriodScroll, setEndPeriodScroll] = useState(0);

  const startHourScrollRef = useRef(null);
  const startMinuteScrollRef = useRef(null);
  const startPeriodScrollRef = useRef(null);
  const endHourScrollRef = useRef(null);
  const endMinuteScrollRef = useRef(null);
  const endPeriodScrollRef = useRef(null);

  const hours = Array.from({length: 12}, (_, i) => i + 1);
  const minutes = Array.from({length: 60}, (_, i) => i);
  const startPeriods = ['AM', 'PM'];
  const endPeriods = ['PM', 'AM'];

  const ITEM_HEIGHT = HP(2.5);
  const VISIBLE_ITEMS = 7;
  const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
  const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);

  const createExtendedArray = array => {
    return [...array.slice(-3), ...array, ...array.slice(0, 3)];
  };

  // Initialize scroll positions when modal becomes visible
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        const initialOffset = 3 * ITEM_HEIGHT;

        // Set initial positions for start time
        const startHourIndex = hours.indexOf(startHour);
        const startMinuteIndex = minutes.indexOf(startMinute);

        if (startHourScrollRef.current && startHourIndex !== -1) {
          startHourScrollRef.current.scrollTo({
            y: startHourIndex * ITEM_HEIGHT + initialOffset,
            animated: false,
          });
        }

        if (startMinuteScrollRef.current && startMinuteIndex !== -1) {
          startMinuteScrollRef.current.scrollTo({
            y: startMinuteIndex * ITEM_HEIGHT + initialOffset,
            animated: false,
          });
        }

        // Set initial positions for end time
        const endHourIndex = hours.indexOf(endHour);
        const endMinuteIndex = minutes.indexOf(endMinute);

        if (endHourScrollRef.current && endHourIndex !== -1) {
          endHourScrollRef.current.scrollTo({
            y: endHourIndex * ITEM_HEIGHT + initialOffset,
            animated: false,
          });
        }

        if (endMinuteScrollRef.current && endMinuteIndex !== -1) {
          endMinuteScrollRef.current.scrollTo({
            y: endMinuteIndex * ITEM_HEIGHT + initialOffset,
            animated: false,
          });
        }

        if (startPeriodScrollRef.current) {
          const startPeriodIndex = startPeriods.indexOf(startPeriod);
          if (startPeriodIndex !== -1) {
            const targetPosition = startPeriodIndex * ITEM_HEIGHT;
            startPeriodScrollRef.current.scrollTo({
              y: targetPosition,
              animated: false,
            });
            setStartPeriodScroll(targetPosition);
          }
        }

        if (endPeriodScrollRef.current) {
          const endPeriodIndex = endPeriods.indexOf(endPeriod);
          if (endPeriodIndex !== -1) {
            const targetPosition = endPeriodIndex * ITEM_HEIGHT;
            endPeriodScrollRef.current.scrollTo({
              y: targetPosition,
              animated: false,
            });
            setEndPeriodScroll(targetPosition);
          }
        }
      }, 100);
    }
  }, [
    visible,
    startHour,
    startMinute,
    startPeriod,
    endHour,
    endMinute,
    endPeriod,
  ]);

  const getTextColorByPosition = absoluteIndex => {
    switch (absoluteIndex) {
      case 0:
        return '#E8E8E8';
      case 1:
        return '#D0D0D0';
      case 2:
        return '#B8B8B8';
      case 3:
        return '#6A6565';
      case 4:
        return '#B8B8B8';
      case 5:
        return '#D0D0D0';
      case 6:
        return '#E8E8E8';
      default:
        return '#CCCCCC';
    }
  };

  // scroll handlers with infinite scrolling logic (for hours and minutes)
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

  // Fixed period scroll handler
  const handlePeriodScroll = (
    event,
    setPeriod,
    setScrollPos,
    periodsArray,
    scrollRef,
  ) => {
    const y = event.nativeEvent.contentOffset.y;
    setScrollPos(y);

    const itemIndex = Math.round(y / ITEM_HEIGHT);

    const clampedIndex = Math.max(
      0,
      Math.min(periodsArray.length - 1, itemIndex),
    );
    const value = periodsArray[clampedIndex];
    setPeriod(value);

    const snapPosition = clampedIndex * ITEM_HEIGHT;
    if (Math.abs(y - snapPosition) > 5) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({y: snapPosition, animated: true});
        setScrollPos(snapPosition);
      }, 0);
    }
  };

  const handleHourScroll = (event, setHour, setScrollPos, scrollRef) => {
    handleInfiniteScroll(event, setHour, setScrollPos, hours, scrollRef);
  };

  const handleMinuteScroll = (event, setMinute, setScrollPos, scrollRef) => {
    handleInfiniteScroll(event, setMinute, setScrollPos, minutes, scrollRef);
  };

  const calculateItemPosition = (
    itemIndex,
    scrollPosition,
    isPeriod = false,
  ) => {
    if (isPeriod) {
      // For periods, calculate position relative to center
      const scrollIndex = Math.round(scrollPosition / ITEM_HEIGHT);
      const relativePosition = itemIndex - scrollIndex + CENTER_INDEX;
      return Math.max(0, Math.min(6, relativePosition));
    } else {
      // For hours and minutes (infinite scroll)
      const scrollIndex = Math.floor(
        (scrollPosition + ITEM_HEIGHT / 2) / ITEM_HEIGHT,
      );
      const relativeIndex =
        (itemIndex - scrollIndex + CENTER_INDEX + VISIBLE_ITEMS) %
        VISIBLE_ITEMS;
      return relativeIndex;
    }
  };

  const renderTimeColumn = (
    items,
    selectedValue,
    onSelect,
    scrollHandler,
    scrollRef,
    scrollPosition,
    isMinute = false,
    isPeriod = false,
    columnType = '',
  ) => {
    if (isPeriod) {
      return (
        <View
          style={[
            styles.timeColumnContainer,
            styles.periodColumn,
            {height: PICKER_HEIGHT},
          ]}>
          <ScrollView
            ref={scrollRef}
            style={styles.timeColumn}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={[
              styles.timeColumnContent,
              {
                paddingTop: CENTER_INDEX * ITEM_HEIGHT,
                paddingBottom: CENTER_INDEX * ITEM_HEIGHT,
              },
            ]}
            onScroll={e => {
              const y = e.nativeEvent.contentOffset.y;
              const setScrollState =
                columnType === 'startPeriod'
                  ? setStartPeriodScroll
                  : setEndPeriodScroll;
              setScrollState(y);
            }}
            scrollEventThrottle={16}
            onMomentumScrollEnd={e =>
              scrollHandler(
                e,
                onSelect,
                columnType === 'startPeriod'
                  ? setStartPeriodScroll
                  : setEndPeriodScroll,
                items,
                scrollRef,
              )
            }
            onScrollEndDrag={e =>
              scrollHandler(
                e,
                onSelect,
                columnType === 'startPeriod'
                  ? setStartPeriodScroll
                  : setEndPeriodScroll,
                items,
                scrollRef,
              )
            }>
            {items.map((item, index) => {
              const position = calculateItemPosition(
                index,
                scrollPosition,
                true,
              );
              return (
                <View
                  key={`${item}-${index}`}
                  style={[
                    styles.timeItem,
                    styles.periodItem,
                    {height: ITEM_HEIGHT},
                  ]}>
                  <TouchableOpacity
                    style={styles.timeItemTouchable}
                    onPress={() => {
                      onSelect(item);
                      const targetPosition = index * ITEM_HEIGHT;
                      if (scrollRef.current) {
                        scrollRef.current.scrollTo({
                          y: targetPosition,
                          animated: true,
                        });
                      }
                      const setScrollState =
                        columnType === 'startPeriod'
                          ? setStartPeriodScroll
                          : setEndPeriodScroll;
                      setScrollState(targetPosition);
                    }}>
                    <Text
                      style={[
                        styles.timeText,
                        styles.periodText,
                        {color: getTextColorByPosition(position)},
                      ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      );
    }

    // Extended array for infinite scrolling (hours and minutes)
    const extendedItems = createExtendedArray(items);

    return (
      <View
        style={[
          styles.timeColumnContainer,
          isMinute && styles.minuteColumn,
          {height: PICKER_HEIGHT},
        ]}>
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
            const setScrollState =
              columnType === 'startHour'
                ? setStartHourScroll
                : columnType === 'startMinute'
                ? setStartMinuteScroll
                : columnType === 'endHour'
                ? setEndHourScroll
                : setEndMinuteScroll;
            setScrollState(y);
          }}
          scrollEventThrottle={16}
          onMomentumScrollEnd={e => {
            const setScrollState =
              columnType === 'startHour'
                ? setStartHourScroll
                : columnType === 'startMinute'
                ? setStartMinuteScroll
                : columnType === 'endHour'
                ? setEndHourScroll
                : setEndMinuteScroll;
            scrollHandler(e, onSelect, setScrollState, scrollRef);
          }}
          onScrollEndDrag={e => {
            const setScrollState =
              columnType === 'startHour'
                ? setStartHourScroll
                : columnType === 'startMinute'
                ? setStartMinuteScroll
                : columnType === 'endHour'
                ? setEndHourScroll
                : setEndMinuteScroll;
            scrollHandler(e, onSelect, setScrollState, scrollRef);
          }}>
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
                    {isMinute ? String(item).padStart(2, '0') : item}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderTimePicker = (
    title,
    hour,
    minute,
    period,
    onHourChange,
    onMinuteChange,
    onPeriodChange,
    hourRef,
    minuteRef,
    periodRef,
    isStart = true,
  ) => {
    const hourScroll = isStart ? startHourScroll : endHourScroll;
    const minuteScroll = isStart ? startMinuteScroll : endMinuteScroll;
    const periodScroll = isStart ? startPeriodScroll : endPeriodScroll;
    const periodsArray = isStart ? startPeriods : endPeriods;

    return (
      <View style={styles.timePickerContainer}>
        <Text style={styles.timePickerTitle}>{title}</Text>
        <View style={styles.timePickerWrapper}>
          <View style={styles.timeColumnHighlight} />
          <View style={styles.timePickerColumns}>
            {renderTimeColumn(
              hours,
              hour,
              onHourChange,
              handleHourScroll,
              hourRef,
              hourScroll,
              false,
              false,
              isStart ? 'startHour' : 'endHour',
            )}
            <View style={styles.minutesPeriodContainer}>
              {renderTimeColumn(
                minutes,
                minute,
                onMinuteChange,
                handleMinuteScroll,
                minuteRef,
                minuteScroll,
                true,
                false,
                isStart ? 'startMinute' : 'endMinute',
              )}
              {renderTimeColumn(
                periodsArray,
                period,
                onPeriodChange,
                handlePeriodScroll,
                periodRef,
                periodScroll,
                false,
                true,
                isStart ? 'startPeriod' : 'endPeriod',
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const handleSave = () => {
    const timeData = {
      startTime: `${startHour}:${String(startMinute).padStart(
        2,
        '0',
      )} ${startPeriod}`,
      endTime: `${endHour}:${String(endMinute).padStart(2, '0')} ${endPeriod}`,
    };
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
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={e => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Block Time</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.timePickersContainer}>
              {/* Start Time */}
              {renderTimePicker(
                'Start Time',
                startHour,
                startMinute,
                startPeriod,
                setStartHour,
                setStartMinute,
                setStartPeriod,
                startHourScrollRef,
                startMinuteScrollRef,
                startPeriodScrollRef,
                true,
              )}

              {/* End Time */}
              {renderTimePicker(
                'End Time',
                endHour,
                endMinute,
                endPeriod,
                setEndHour,
                setEndMinute,
                setEndPeriod,
                endHourScrollRef,
                endMinuteScrollRef,
                endPeriodScrollRef,
                false,
              )}
            </View>
            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.7}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
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
    width: WP(88),
    backgroundColor: colors.White,
    borderRadius: WP(2),
    overflow: 'hidden',
    marginBottom: HP(6),
  },
  header: {
    backgroundColor: colors.Primary,
    paddingVertical: HP(2.2),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: WP(6),
  },
  headerTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
  },
  closeButton: {
    width: WP(8),
    height: WP(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: FS(3.5),
    color: colors.White,
    lineHeight: FS(3.5),
    marginTop: HP(-0.5),
  },
  content: {
    backgroundColor: colors.White,
    paddingBottom: HP(2),
  },
  timePickersContainer: {
    flexDirection: 'row',
    paddingHorizontal: WP(4.5),
    paddingTop: HP(2),
  },
  timePickerContainer: {
    flex: 1,
    marginHorizontal: WP(2),
  },
  timePickerWrapper: {
    position: 'relative',
  },
  timePickerTitle: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#6A6565',
    marginBottom: HP(1),
    textAlign: 'center',
    marginRight: WP(6.5),
  },
  timePickerColumns: {
    flexDirection: 'row',
    borderRadius: WP(2),
    paddingHorizontal: WP(-1),
    paddingVertical: HP(0.5),
  },
  timeColumnContainer: {
    flex: 1,
    marginHorizontal: WP(0.5),
    justifyContent: 'center',
  },

  minutesPeriodContainer: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: WP(-5),
    alignItems: 'stretch',
    minWidth: WP(8),
  },
  minuteColumn: {
    flex: 1,
  },
  periodColumn: {
    flex: 0.5,
    marginLeft: WP(-8),
    minWidth: WP(8),
  },
  timeColumn: {
    flex: 1,
  },
  timeColumnContent: {
    alignItems: 'center',
  },
  infiniteScrollContent: {
    alignItems: 'center',
  },
  timeColumnHighlight: {
    position: 'absolute',
    top: 3 * HP(2.66),
    left: WP(1.4),
    right: WP(-1),
    height: HP(2.5),
    width: WP(33),
    backgroundColor: '#E2E2E2',
    borderRadius: WP(0.5),
    zIndex: -1,
  },
  timeItem: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodItem: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(1),
  },
  timeItemTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  periodText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
  },
  selectedTimeText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#6A6565',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  saveButton: {
    backgroundColor: colors.Primary,
    paddingVertical: HP(1.5),
    borderRadius: WP(2),
    marginHorizontal: WP(6),
    marginTop: HP(1),
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.White,
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
  },
});

export default BlockTimeModal;

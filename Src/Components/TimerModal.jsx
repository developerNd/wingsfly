import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import Modal from 'react-native-modal';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import {colors, Icons} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const TimeInputModal = ({isVisible, onClose, onSave, taskTitle}) => {
  const [selectedTime, setSelectedTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [scrollOffsets, setScrollOffsets] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const hoursScrollRef = useRef(null);
  const minutesScrollRef = useRef(null);
  const secondsScrollRef = useRef(null);

  // Generated arrays for hours (0-23), minutes (0-59), seconds (0-59)
  const hours = Array.from({length: 24}, (_, i) => i);
  const minutes = Array.from({length: 60}, (_, i) => i);
  const seconds = Array.from({length: 60}, (_, i) => i);

  const ITEM_HEIGHT = HP(7); // Further increased for larger size

  const getCurrentDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const createExtendedArray = array => {
    const extendedArray = [...array.slice(-3), ...array, ...array.slice(0, 3)];
    return extendedArray;
  };

  const extendedHours = createExtendedArray(hours);
  const extendedMinutes = createExtendedArray(minutes);
  const extendedSeconds = createExtendedArray(seconds);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        const initialOffset = 3 * ITEM_HEIGHT;
        hoursScrollRef.current?.scrollTo({
          y: selectedTime.hours * ITEM_HEIGHT + initialOffset,
          animated: false,
        });
        minutesScrollRef.current?.scrollTo({
          y: selectedTime.minutes * ITEM_HEIGHT + initialOffset,
          animated: false,
        });
        secondsScrollRef.current?.scrollTo({
          y: selectedTime.seconds * ITEM_HEIGHT + initialOffset,
          animated: false,
        });
      }, 100);
    }
  }, [isVisible, selectedTime]);

  const handleScroll = (event, type) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);

    setScrollOffsets(prev => ({
      ...prev,
      [type]: y,
    }));

    let maxValue, originalArray;
    if (type === 'hours') {
      maxValue = 23;
      originalArray = hours;
    } else {
      maxValue = 59;
      originalArray = minutes;
    }

    let actualIndex = index - 3;

    if (actualIndex < 0) {
      actualIndex = originalArray.length + actualIndex;
    } else if (actualIndex >= originalArray.length) {
      actualIndex = actualIndex - originalArray.length;
    }

    const value = Math.max(0, Math.min(maxValue, actualIndex));

    setSelectedTime(prev => ({
      ...prev,
      [type]: value,
    }));

    const scrollRef =
      type === 'hours'
        ? hoursScrollRef
        : type === 'minutes'
        ? minutesScrollRef
        : secondsScrollRef;

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

  const handleCancel = () => {
    setSelectedTime({hours: 0, minutes: 0, seconds: 0});
    onClose();
  };

  const handleOK = () => {
    onSave(selectedTime);
    setSelectedTime({hours: 0, minutes: 0, seconds: 0});
    onClose();
  };

  const resetToZero = () => {
    setSelectedTime({hours: 0, minutes: 0, seconds: 0});
    setTimeout(() => {
      const initialOffset = 3 * ITEM_HEIGHT;
      hoursScrollRef.current?.scrollTo({y: initialOffset, animated: true});
      minutesScrollRef.current?.scrollTo({y: initialOffset, animated: true});
      secondsScrollRef.current?.scrollTo({y: initialOffset, animated: true});
    }, 100);
  };

  const formatNumber = num => num.toString().padStart(2, '0');

  const getItemPosition = (itemIndex, scrollOffset) => {
    const currentCenterIndex = Math.round(scrollOffset / ITEM_HEIGHT);
    return itemIndex - currentCenterIndex;
  };

  const renderGradientText = (text, gradientColors) => {
    return (
      <MaskedView
        style={styles.maskedView}
        maskElement={
          <Text
            style={[
              styles.pickerItemText,
              {color: 'black', textAlign: 'center'},
            ]}>
            {text}
          </Text>
        }>
        <LinearGradient colors={gradientColors} style={styles.gradient} />
      </MaskedView>
    );
  };

  const renderScrollPicker = (data, selectedValue, type, label, scrollRef) => (
    <View style={styles.pickerContainer}>
      <View style={styles.pickerWrapper}>
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
            <Text style={styles.pickerItemText}>00</Text>
          </View>

          {data.map((item, index) => {
            const relativePosition = getItemPosition(
              index,
              scrollOffsets[type],
            );
            const isSelected = relativePosition === 0;

            let textComponent;

            if (relativePosition === 1) {
              textComponent = renderGradientText(formatNumber(item), [
                '#201F1F',
                '#BFBFBF',
              ]);
            } else if (relativePosition === -1) {
              textComponent = renderGradientText(formatNumber(item), [
                '#FAFAFA',
                '#201F1F',
              ]);
            } else {
              textComponent = (
                <Text
                  style={[
                    styles.pickerItemText,
                    isSelected && styles.pickerItemTextSelected,
                    {color: isSelected ? '#242424' : '#BFBFBF'},
                  ]}>
                  {formatNumber(item)}
                </Text>
              );
            }

            return (
              <View key={`${type}-${index}`} style={styles.pickerItem}>
                {textComponent}
              </View>
            );
          })}

          <View style={[styles.pickerItem, {opacity: 0}]}>
            <Text style={styles.pickerItemText}>00</Text>
          </View>
        </ScrollView>

        <View style={styles.centerLineTop} />
        <View style={styles.centerLineBottom} />
      </View>
      <Text style={styles.pickerLabel}>{label}</Text>
    </View>
  );

  const getTotalSeconds = () => {
    return (
      selectedTime.hours * 3600 +
      selectedTime.minutes * 60 +
      selectedTime.seconds
    );
  };

  const formatTimeDisplay = () => {
    const totalSeconds = getTotalSeconds();
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(
      seconds,
    )}`;
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={handleCancel}
      onBackButtonPress={handleCancel}
      style={styles.modal}
      useNativeDriver>
      <View style={styles.modalContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>Timer</Text>
            </View>
            <View style={styles.dateContainer}>
              <Text style={styles.headerDate}>{getCurrentDate()}</Text>
            </View>
          </View>
          <View style={styles.habitIcon}>
            <Image source={Icons.Goal} style={styles.iconImage} />
          </View>
        </View>

        {/* Time Picker Section */}
        <View style={styles.timePickerContainer}>
          {renderScrollPicker(
            extendedHours,
            selectedTime.hours,
            'hours',
            'hours',
            hoursScrollRef,
          )}

          <View style={styles.separator}>
            <Text style={styles.separatorText}>:</Text>
          </View>

          {renderScrollPicker(
            extendedMinutes,
            selectedTime.minutes,
            'minutes',
            'minutes',
            minutesScrollRef,
          )}

          <View style={styles.separator}>
            <Text style={styles.separatorText}>:</Text>
          </View>

          {renderScrollPicker(
            extendedSeconds,
            selectedTime.seconds,
            'seconds',
            'seconds',
            secondsScrollRef,
          )}
        </View>

        {/* Progress Section */}
        <View style={styles.progressContainer}>
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Today</Text>
            <Text style={styles.progressValue}>
              {formatTimeDisplay()} / 24:00:00
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>CLOSE</Text>
            </TouchableOpacity>

            <View style={styles.verticalDivider} />

            <TouchableOpacity style={styles.resetButton} onPress={resetToZero}>
              <Image source={Icons.Refresh} style={styles.refreshIcon} />
            </TouchableOpacity>

            <View style={styles.verticalDivider} />

            <TouchableOpacity style={styles.okButton} onPress={handleOK}>
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  modalContent: {
    backgroundColor: colors.White,
    borderRadius: WP(5),
    width: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(4),
    marginBottom: HP(0.5),
    borderBottomWidth: 0.7,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    alignItems: 'flex-start',
  },
  titleContainer: {
    marginBottom: HP(0.5),
  },
  headerTitle: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
  },
  dateContainer: {
    backgroundColor: '#E4E6FF',
    borderRadius: WP(1.5),
    paddingHorizontal: WP(1.2),
    marginLeft: WP(-0.3),
  },
  headerDate: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
  habitIcon: {
    backgroundColor: colors.Primary,
    borderRadius: WP(2.5),
    padding: WP(2),
  },
  iconImage: {
    width: WP(6),
    height: WP(6),
    tintColor: colors.White,
    resizeMode: 'contain',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HP(2),
    height: HP(28),
    marginTop: HP(-1),
    paddingHorizontal: WP(8),
  },
  pickerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  pickerWrapper: {
    height: HP(21),
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  scrollView: {
    height: HP(20.5),
    width: '100%',
  },
  scrollViewContent: {
    paddingVertical: 0,
  },
  pickerItem: {
    height: HP(7),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(2),
  },
  pickerItemText: {
    fontSize: FS(3.6),
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    fontSize: FS(3.6),
    fontFamily: 'OpenSans-SemiBold',
  },
  maskedView: {
    height: HP(4.2),
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  pickerLabel: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#767272',
    marginTop: HP(1.2),
    textAlign: 'center',
  },
  separator: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: HP(3.3),
  },
  separatorText: {
    fontSize: FS(4.2),
    fontFamily: 'OpenSans-SemiBold',
    color: '#242424',
  },
  centerLineTop: {
    position: 'absolute',
    top: HP(7),
    left: WP(2),
    right: WP(2),
    height: HP(0.125),
    width: WP(18),
    backgroundColor: '#D4D4D4',
    zIndex: 1,
  },
  centerLineBottom: {
    position: 'absolute',
    top: HP(14),
    left: WP(2),
    right: WP(2),
    height: HP(0.125),
    width: WP(18),
    backgroundColor: '#D4D4D4',
    zIndex: 1,
  },
  progressContainer: {
    paddingHorizontal: WP(5),
    marginBottom: HP(2.5),
  },
  progressSection: {
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: WP(2),
    paddingVertical: HP(1),
    paddingHorizontal: WP(4),
  },
  progressLabel: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#999999',
    marginBottom: HP(0.3),
  },
  progressValue: {
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-Regular',
    color: '#333333',
  },
  actionButtonsContainer: {
    borderTopWidth: 0.7,
    borderTopColor: '#E0E0E0',
  },
  actionButtons: {
    flexDirection: 'row',
    minHeight: HP(6.4),
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: HP(1.6),
  },
  cancelButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginLeft: WP(-1),
  },
  resetButton: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: HP(1.6),
    marginRight: WP(3),
    marginLeft: WP(3),
  },
  refreshIcon: {
    width: WP(4.5),
    height: WP(4.5),
    resizeMode: 'contain',
    tintColor: '#666666',
  },
  verticalDivider: {
    width: 0.7,
    backgroundColor: '#E0E0E0',
    height: '100%',
  },
  okButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: HP(1.6),
  },
  okButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
});

export default TimeInputModal;

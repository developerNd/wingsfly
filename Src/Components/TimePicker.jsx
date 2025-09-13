import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  StatusBar
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import {HP, WP, FS} from '../utils/dimentions';
import {colors, Icons} from '../Helper/Contants';

const TimePicker = ({
  visible,
  onClose,
  onTimeSelect,
  initialTime = {hours: 0, minutes: 0, seconds: 0},
}) => {
  const [selectedTime, setSelectedTime] = useState(initialTime);
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

  const ITEM_HEIGHT = HP(5.0);

  const createExtendedArray = array => {
    const extendedArray = [...array.slice(-3), ...array, ...array.slice(0, 3)];
    return extendedArray;
  };

  const extendedHours = createExtendedArray(hours);
  const extendedMinutes = createExtendedArray(minutes);
  const extendedSeconds = createExtendedArray(seconds);

  useEffect(() => {
    if (visible) {
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
  }, [visible, selectedTime]);

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

  const handleOk = () => {
    onTimeSelect(selectedTime);
    onClose();
  };

  const handleClose = () => {
    setSelectedTime(initialTime);
    onClose();
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

  const resetToZero = () => {
    setSelectedTime({hours: 0, minutes: 0, seconds: 0});
    setTimeout(() => {
      const initialOffset = 3 * ITEM_HEIGHT;
      hoursScrollRef.current?.scrollTo({y: initialOffset, animated: true});
      minutesScrollRef.current?.scrollTo({y: initialOffset, animated: true});
      secondsScrollRef.current?.scrollTo({y: initialOffset, animated: true});
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <StatusBar backgroundColor={colors.ModelBackground} barStyle="dark-content" />
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Goal</Text>

          <View style={styles.titleUnderline} />

          <View style={styles.timePickerContainer}>
            {renderScrollPicker(
              extendedHours,
              selectedTime.hours,
              'hours',
              'Hours',
              hoursScrollRef,
            )}

            <View style={styles.separator}>
              <Text style={styles.separatorText}>:</Text>
            </View>

            {renderScrollPicker(
              extendedMinutes,
              selectedTime.minutes,
              'minutes',
              'Minutes',
              minutesScrollRef,
            )}

            <View style={styles.separator}>
              <Text style={styles.separatorText}>:</Text>
            </View>

            {renderScrollPicker(
              extendedSeconds,
              selectedTime.seconds,
              'seconds',
              'Second',
              secondsScrollRef,
            )}
          </View>

          <View style={styles.buttonTopLine} />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>CLOSE</Text>
            </TouchableOpacity>

            <View style={styles.resetButtonRightLine1} />

            <View style={styles.resetButtonContainer}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetToZero}>
                <Image source={Icons.Refresh} style={styles.arrowImage} />
              </TouchableOpacity>

              <View style={styles.resetButtonRightLine} />
            </View>

            <TouchableOpacity style={styles.okButton} onPress={handleOk}>
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    backgroundColor: colors.White,
    borderRadius: WP(2.1),
    padding: WP(5.3),
    width: '78%',
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
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    textAlign: 'center',
    marginBottom: HP(1.0),
    marginTop: HP(-1.0),
  },
  titleUnderline: {
    height: HP(0.125),
    backgroundColor: '#D4D4D4',
    marginBottom: HP(-0.5),
    alignSelf: 'center',
    width: WP(78),
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HP(2),
    height: HP(22),
    marginTop: HP(-1.25),
    paddingHorizontal: WP(5.3),
  },
  pickerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  pickerWrapper: {
    height: HP(16),
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
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
    paddingHorizontal: WP(2.7),
  },
  pickerItemText: {
    fontSize: FS(2.4),
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    fontSize: FS(2.4),
    fontFamily: 'OpenSans-SemiBold',
  },
  maskedView: {
    height: HP(2.8),
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
    fontSize: FS(1.0),
    fontFamily: 'OpenSans-SemiBold',
    color: '#767272',
    marginTop: HP(0.2),
    textAlign: 'center',
    marginBottom: HP(-2.5),
  },
  separator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(2.7),
    marginBottom: 0,
  },
  separatorText: {
    fontSize: FS(2.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#242424',
  },
  centerLineTop: {
    position: 'absolute',
    top: HP(5.0),
    left: WP(2.7),
    right: 0,
    height: HP(0.125),
    width: WP(8.0),
    backgroundColor: '#D4D4D4',
    zIndex: 1,
  },
  centerLineBottom: {
    position: 'absolute',
    top: HP(10.0),
    left: WP(2.7),
    right: 0,
    height: HP(0.125),
    width: WP(8.0),
    backgroundColor: '#D4D4D4',
    zIndex: 1,
  },
  buttonTopLine: {
    height: HP(0.125),
    backgroundColor: '#F0F0F0',
    marginBottom: 0,
    width: WP(78),
    marginLeft: WP(-5.3),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    paddingHorizontal: WP(5.3),
    marginBottom: HP(-1.875),
    marginLeft: WP(-2.4),
  },
  closeButtonText: {
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
  },
  resetButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  resetButton: {
    padding: WP(2.7),
    marginBottom: HP(-1.875),
  },
  resetButtonRightLine: {
    width: HP(0.125),
    height: HP(5.625),
    backgroundColor: '#F0F0F0',
    marginLeft: WP(8.0),
    marginBottom: HP(-2.5),
  },
  resetButtonRightLine1: {
    width: HP(0.125),
    height: HP(5.625),
    backgroundColor: '#F0F0F0',
    marginBottom: HP(-2.5),
    marginRight: WP(5.3),
  },
  okButton: {
    paddingHorizontal: WP(5.3),
    marginBottom: HP(-2),
  },
  okButtonText: {
    fontSize: FS(1.57),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    marginLeft: WP(1.87),
  },
  arrowImage: {
    width: WP(4.9),
    height: HP(1.9),
    resizeMode: 'contain',
    marginTop: HP(0.5),
  },
});

export default TimePicker;

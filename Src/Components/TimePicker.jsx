import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

const TimePicker = ({ visible, onClose, onTimeSelect, initialTime = { hours: 0, minutes: 0, seconds: 0 } }) => {
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [scrollOffsets, setScrollOffsets] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const hoursScrollRef = useRef(null);
  const minutesScrollRef = useRef(null);
  const secondsScrollRef = useRef(null);

  // Generated arrays for hours (0-23), minutes (0-59), seconds (0-59)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const seconds = Array.from({ length: 60 }, (_, i) => i);

  const ITEM_HEIGHT = 40;

  const createExtendedArray = (array) => {
    const extendedArray = [
      ...array.slice(-3), 
      ...array,           
      ...array.slice(0, 3) 
    ];
    return extendedArray;
  };

  const extendedHours = createExtendedArray(hours);
  const extendedMinutes = createExtendedArray(minutes);
  const extendedSeconds = createExtendedArray(seconds);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        const initialOffset = 3 * ITEM_HEIGHT;
        hoursScrollRef.current?.scrollTo({ y: (selectedTime.hours * ITEM_HEIGHT) + initialOffset, animated: false });
        minutesScrollRef.current?.scrollTo({ y: (selectedTime.minutes * ITEM_HEIGHT) + initialOffset, animated: false });
        secondsScrollRef.current?.scrollTo({ y: (selectedTime.seconds * ITEM_HEIGHT) + initialOffset, animated: false });
      }, 100);
    }
  }, [visible, selectedTime]);

  const handleScroll = (event, type) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    
    setScrollOffsets(prev => ({
      ...prev,
      [type]: y
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
      [type]: value
    }));

    const scrollRef = type === 'hours' ? hoursScrollRef : 
                     type === 'minutes' ? minutesScrollRef : secondsScrollRef;
    
    if (index <= 2) {
      const newPosition = (originalArray.length + index - 3) * ITEM_HEIGHT + (3 * ITEM_HEIGHT);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: newPosition, animated: false });
      }, 0);
    } else if (index >= originalArray.length + 3) {
      const newPosition = (index - originalArray.length) * ITEM_HEIGHT + (3 * ITEM_HEIGHT);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: newPosition, animated: false });
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

  const formatNumber = (num) => num.toString().padStart(2, '0');

  const getItemPosition = (itemIndex, scrollOffset) => {
    const currentCenterIndex = Math.round(scrollOffset / ITEM_HEIGHT);
    return itemIndex - currentCenterIndex;
  };

  const renderGradientText = (text, gradientColors) => {
    return (
      <MaskedView
        style={styles.maskedView}
        maskElement={
          <Text style={[styles.pickerItemText, { color: 'black', textAlign: 'center' }]}>{text}</Text>
        }
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
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
          onScroll={(event) => {
            const y = event.nativeEvent.contentOffset.y;
            setScrollOffsets(prev => ({
              ...prev,
              [type]: y
            }));
          }}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => handleScroll(event, type)}
          onScrollEndDrag={(event) => handleScroll(event, type)}
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={[styles.pickerItem, { opacity: 0 }]}>
            <Text style={styles.pickerItemText}>00</Text>
          </View>
          
          {data.map((item, index) => {
            const relativePosition = getItemPosition(index, scrollOffsets[type]);
            const isSelected = relativePosition === 0;
            
            let textComponent;
            
            if (relativePosition === 1) {
              textComponent = renderGradientText(formatNumber(item), ['#201F1F', '#BFBFBF']);
            } else if (relativePosition === -1) {
              textComponent = renderGradientText(formatNumber(item), ['#BFBFBF', '#201F1F']);
            } else {
              textComponent = (
                <Text style={[
                  styles.pickerItemText,
                  isSelected && styles.pickerItemTextSelected,
                  { color: isSelected ? '#242424' : '#BFBFBF' }
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
          
          <View style={[styles.pickerItem, { opacity: 0 }]}>
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
    setSelectedTime({ hours: 0, minutes: 0, seconds: 0 });
    setTimeout(() => {
      const initialOffset = 3 * ITEM_HEIGHT;
      hoursScrollRef.current?.scrollTo({ y: initialOffset, animated: true });
      minutesScrollRef.current?.scrollTo({ y: initialOffset, animated: true });
      secondsScrollRef.current?.scrollTo({ y: initialOffset, animated: true });
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Goal</Text>
          
          <View style={styles.titleUnderline} />
          
          <View style={styles.timePickerContainer}>
            {renderScrollPicker(extendedHours, selectedTime.hours, 'hours', 'Hours', hoursScrollRef)}
            
            <View style={styles.separator}>
              <Text style={styles.separatorText}>:</Text>
            </View>
            
            {renderScrollPicker(extendedMinutes, selectedTime.minutes, 'minutes', 'Minutes', minutesScrollRef)}
            
            <View style={styles.separator}>
              <Text style={styles.separatorText}>:</Text>
            </View>
            
            {renderScrollPicker(extendedSeconds, selectedTime.seconds, 'seconds', 'Second', secondsScrollRef)}
          </View>

          <View style={styles.buttonTopLine} />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>CLOSE</Text>
            </TouchableOpacity>

            <View style={styles.resetButtonRightLine1} />
            
            <View style={styles.resetButtonContainer}>
              <TouchableOpacity style={styles.resetButton} onPress={resetToZero}>
                <Image 
                  source={require('../assets/icons/refresh.png')}
                  style={styles.arrowImage}
                />
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
    backgroundColor: 'rgba(207, 207, 207, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    width: '76%',
    maxWidth: 350,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 13,
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: -8
  },
  titleUnderline: {
    height: 1,
    backgroundColor: '#D4D4D4',
    marginBottom: -3,
    alignSelf: 'center',
    width: 273,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    height: 150,
    marginTop: -10
  },
  pickerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  pickerWrapper: {
    height: 120,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  scrollView: {
    height: 120,
    width: '100%',
  },
  scrollViewContent: {
    paddingVertical: 0,
  },
  pickerItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  pickerItemText: {
    fontSize: 18,
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    fontSize: 18,
    fontFamily: 'OpenSans-SemiBold',
  },
  maskedView: {
    height: 20,
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
    fontSize: 8,
    fontFamily: 'OpenSans-SemiBold',
    color: '#767272',
    marginTop: 7,
    textAlign: 'center',
    marginBottom: -20
  },
  separator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 0
  },
  separatorText: {
    fontSize: 20,
    fontFamily: 'OpenSans-SemiBold',
    color: '#242424',
  },
  centerLineTop: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 0,
    height: 1,
    width: 30,
    backgroundColor: '#D4D4D4',
    zIndex: 1,
  },
  centerLineBottom: {
    position: 'absolute',
    top: 80, 
    left: 16,
    right: 0,
    height: 1,
    width: 30,
    backgroundColor: '#D4D4D4',
    zIndex: 1,
  },
  buttonTopLine: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 0,
    width: 273,
    marginLeft: -20
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    paddingHorizontal: 20,
    marginBottom: -15,
    marginLeft: -8
  },
  closeButtonText: {
    fontSize: 12,
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
  },
  resetButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  resetButton: {
    padding: 10,
    marginBottom: -15
  },
  resetButtonRightLine: {
    width: 1,
    height: 45,
    backgroundColor: '#F0F0F0',
    marginLeft: 30,
    marginBottom: -20
  },
  resetButtonRightLine1: {
    width: 1,
    height: 45,
    backgroundColor: '#F0F0F0',
    marginBottom: -20,
    marginRight: 20
  },
  okButton: {
    paddingHorizontal: 20,
    marginBottom: -15
  },
  okButtonText: {
    fontSize: 12,
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    marginLeft: 7
  },
  arrowImage: {
    width: 18,
    height: 14,
    resizeMode: 'contain',
    marginTop: 4
  },
});

export default TimePicker;
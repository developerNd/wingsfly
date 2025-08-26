import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  TextInput,
  StatusBar,
} from 'react-native';
import {colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const SuccessConditionModal = ({visible, onClose, onConfirm}) => {
  const [selectedOption, setSelectedOption] = useState('custom');
  const [customValue, setCustomValue] = useState('1');

  // Animation values
  const slideAnim = useRef(new Animated.Value(HP(100))).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const animateOut = callback => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: HP(100),
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  const handleCancel = () => {
    animateOut(() => {
      onClose();
    });
  };

  const handleOK = () => {
    const result = {
      type: selectedOption,
      value: selectedOption === 'custom' ? customValue : null,
    };
    animateOut(() => {
      onConfirm(result);
    });
  };

  const handleOverlayPress = () => {
    handleCancel();
  };

  const handleModalPress = () => {
    // Prevent modal from closing when touching inside
  };

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={handleCancel}
      presentationStyle="overFullScreen"
      supportedOrientations={['portrait']}>
      <View style={styles.modalWrapper}>
        <StatusBar
          backgroundColor={colors.ModelBackground}
          barStyle="dark-content"
        />
        <TouchableWithoutFeedback onPress={handleOverlayPress}>
          <View style={styles.container}>
            {/* Light overlay to show background content */}
            <Animated.View
              style={[styles.overlay, {opacity: overlayOpacity}]}
            />

            <View style={styles.modalPositioner}>
              <Animated.View
                style={[
                  styles.modalContainer,
                  {
                    transform: [{translateY: slideAnim}],
                  },
                ]}>
                <TouchableWithoutFeedback onPress={handleModalPress}>
                  <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                      <Text style={styles.headerTitle}>success condition</Text>
                    </View>

                    {/* Header Border Line */}
                    <View style={styles.headerBorderLine} />

                    {/* Options */}
                    <View style={styles.optionsContainer}>
                      {/* All Item Option */}
                      <TouchableOpacity
                        style={styles.optionRow}
                        onPress={() => setSelectedOption('all')}
                        activeOpacity={0.7}>
                        <View style={styles.radioContainer}>
                          <View
                            style={[
                              styles.radioButton,
                              selectedOption === 'all' &&
                                styles.radioButtonSelected,
                            ]}>
                            {selectedOption === 'all' && (
                              <View style={styles.radioInner} />
                            )}
                          </View>
                          <Text style={styles.optionText}>All Item</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Custom Option */}
                      <TouchableOpacity
                        style={styles.optionRow}
                        onPress={() => setSelectedOption('custom')}
                        activeOpacity={0.7}>
                        <View style={styles.radioContainer}>
                          <View
                            style={[
                              styles.radioButton,
                              selectedOption === 'custom' &&
                                styles.radioButtonSelected,
                            ]}>
                            {selectedOption === 'custom' && (
                              <View style={styles.radioInner} />
                            )}
                          </View>
                          <Text style={styles.optionText}>custom</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Custom Input Field */}
                      {selectedOption === 'custom' && (
                        <View style={styles.customInputContainer}>
                          <View style={styles.customInputWrapper}>
                            <TextInput
                              style={styles.customInput}
                              value={customValue}
                              onChangeText={setCustomValue}
                              keyboardType="numeric"
                              maxLength={3}
                              blurOnSubmit={true}
                              returnKeyType="done"
                            />
                            <View style={styles.customInputLine} />
                          </View>
                          <Text style={styles.itemText}>item's</Text>
                        </View>
                      )}
                    </View>

                    {/* Footer Border Line */}
                    <View style={styles.footerBorderLine} />

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleCancel}
                        activeOpacity={0.7}>
                        <Text style={styles.cancelButtonText}>CANCEL</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.okButton}
                        onPress={handleOK}
                        activeOpacity={0.7}>
                        <Text style={styles.okButtonText}>OK</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </Animated.View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
    width: WP(100),
    height: HP(100),
  },
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ModelBackground,
    width: WP(100),
    height: HP(100),
  },
  modalPositioner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: WP(100),
    height: HP(100),
  },
  modalContainer: {
    width: WP(89),
    backgroundColor: colors.White,
    borderRadius: WP(6.5),
    elevation: 15,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 15,
    position: 'absolute',
  },
  modalContent: {
    paddingVertical: HP(2.7),
    paddingHorizontal: WP(6),
  },
  header: {
    alignItems: 'center',
    marginBottom: HP(1.5),
  },
  headerTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#494747',
    textAlign: 'center',
  },
  headerBorderLine: {
    height: 1,
    backgroundColor: '#EDEDED',
    marginHorizontal: WP(-6),
    marginBottom: HP(3.2),
  },
  optionsContainer: {
    marginBottom: HP(2),
  },
  optionRow: {
    marginBottom: HP(2),
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: WP(1.5),
  },
  radioButton: {
    width: WP(4.5),
    height: WP(4.5),
    borderRadius: WP(2.25),
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: WP(3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.Primary,
  },
  radioInner: {
    width: WP(2.5),
    height: WP(2.5),
    borderRadius: WP(1.25),
    backgroundColor: colors.Primary,
  },
  optionText: {
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: HP(1.5),
    paddingHorizontal: WP(4),
    backgroundColor: '#F6F6F6',
    borderRadius: WP(2),
    paddingVertical: HP(1),
    marginHorizontal: WP(2),
    marginTop: WP(1),
    marginBottom: HP(1),
  },
  customInputWrapper: {
    alignItems: 'center',
    marginRight: WP(2),
  },
  customInput: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    textAlign: 'center',
    minWidth: WP(8),
    paddingVertical: HP(0.5),
    backgroundColor: 'transparent',
    marginTop: HP(-0.7),
  },
  customInputLine: {
    width: WP(8.5),
    height: 1,
    backgroundColor: '#666',
    marginTop: HP(-0.9),
  },
  itemText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#868686',
  },
  footerBorderLine: {
    height: 1,
    backgroundColor: '#EDEDED',
    marginHorizontal: WP(-6),
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: WP(9),
    paddingTop: HP(1),
  },
  cancelButton: {
    paddingVertical: HP(0.45),
    paddingHorizontal: WP(8),
    marginTop: HP(1.3),
  },
  cancelButtonText: {
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    textAlign: 'center',
  },
  okButton: {
    paddingVertical: HP(0.45),
    paddingHorizontal: WP(10),
    borderRadius: WP(2),
    marginTop: HP(1.5),
  },
  okButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    textAlign: 'center',
  },
});

export default SuccessConditionModal;

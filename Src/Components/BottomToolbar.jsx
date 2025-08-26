import React, {useState} from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Text,
  Modal,
  Animated,
} from 'react-native';
import {colors, Icons} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const BottomToolbar = ({
  onAddPress,
  onDeletePress,
  onMorePress,
  onLeftActionPress,
  onRightActionPress,
  onCompletePress,
  selectedNodeId,
  isNodeCompleted = false,
}) => {
  const [showMorePopup, setShowMorePopup] = useState(false);
  const [popupAnimation] = useState(new Animated.Value(0));

  const handleMorePress = () => {
    setShowMorePopup(true);
    Animated.spring(popupAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const hidePopup = () => {
    Animated.timing(popupAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowMorePopup(false);
    });
  };

  const handleCompletePress = () => {
    if (onCompletePress && selectedNodeId) {
      onCompletePress(selectedNodeId);
    }
    hidePopup();
  };

  const handleDuplicatePress = () => {
    // Add duplicate functionality here
    console.log('Duplicate pressed');
    hidePopup();
  };

  const handleEditPress = () => {
    // Add edit functionality here
    console.log('Edit pressed');
    hidePopup();
  };

  return (
    <>
      <View style={styles.bottomContainer}>
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.leftActionButton]}
            onPress={onLeftActionPress}
            activeOpacity={0.7}>
            <Image
              source={Icons.BottomAdd}
              style={styles.actionIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <View style={styles.centerActions}>
            <TouchableOpacity
              style={styles.centerButton}
              onPress={onAddPress}
              activeOpacity={0.7}>
              <Image
                source={Icons.Plus}
                style={styles.centerIcon1}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.centerButton}
              onPress={onDeletePress}
              activeOpacity={0.7}>
              <Image
                source={Icons.Bin}
                style={styles.centerIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.centerButton}
              onPress={handleMorePress}
              activeOpacity={0.7}>
              <Image
                source={Icons.More}
                style={styles.centerIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.rightActionButton]}
            onPress={onRightActionPress}
            activeOpacity={0.7}>
            <Image
              source={Icons.RightAdd}
              style={styles.actionIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* More Options Popup */}
      <Modal
        visible={showMorePopup}
        transparent={true}
        animationType="none"
        onRequestClose={hidePopup}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={hidePopup}>
          <Animated.View
            style={[
              styles.popupContainer,
              {
                transform: [
                  {
                    translateY: popupAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                  {
                    scale: popupAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
                opacity: popupAnimation,
              },
            ]}>
            <TouchableOpacity
              style={styles.popupOption}
              onPress={handleCompletePress}
              activeOpacity={0.7}>
              <View style={styles.optionContent}>
                <View
                  style={[
                    styles.completionIcon,
                    {backgroundColor: isNodeCompleted ? '#4CAF50' : '#E0E0E0'},
                  ]}>
                  {isNodeCompleted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.optionText}>
                  {isNodeCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupOption}
              onPress={handleEditPress}
              activeOpacity={0.7}>
              <View style={styles.optionContent}>
                <View style={styles.optionIcon}>
                  <Text style={styles.iconText}>✏️</Text>
                </View>
                <Text style={styles.optionText}>Edit Node</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupOption}
              onPress={handleDuplicatePress}
              activeOpacity={0.7}>
              <View style={styles.optionContent}>
                <View style={styles.optionIcon}>
                  <Text style={styles.iconText}>📋</Text>
                </View>
                <Text style={styles.optionText}>Duplicate</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.popupArrow} />
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.White,
    paddingBottom: HP(2.5),
    paddingTop: HP(1),
    paddingHorizontal: WP(5),
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: HP(6),
  },
  actionButton: {
    width: WP(10),
    height: WP(10),
    borderRadius: WP(5),
    backgroundColor: colors.White,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  actionIcon: {
    width: WP(5),
    height: WP(5),
  },
  centerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.White,
    borderRadius: WP(6),
    paddingHorizontal: WP(2),
    paddingVertical: HP(0.5),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  centerButton: {
    width: WP(8),
    height: WP(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: WP(1),
  },
  centerIcon: {
    width: WP(4.5),
    height: WP(4.5),
    tintColor: '#666',
  },
  centerIcon1: {
    width: WP(3.5),
    height: WP(3.5),
    tintColor: '#666',
  },
  // Popup Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: HP(12),
  },
  popupContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    paddingVertical: HP(1),
    minWidth: WP(45),
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    position: 'relative',
  },
  popupOption: {
    paddingVertical: HP(1.2),
    paddingHorizontal: WP(4),
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionIcon: {
    width: WP(6),
    height: WP(6),
    borderRadius: WP(3),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: WP(3),
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  checkmark: {
    color: colors.White,
    fontSize: FS(1.2),
    fontWeight: 'bold',
  },
  optionIcon: {
    width: WP(6),
    height: WP(6),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: WP(3),
  },
  iconText: {
    fontSize: FS(1.6),
  },
  optionText: {
    fontSize: FS(1.6),
    color: '#333',
    fontFamily: 'OpenSans-SemiBold',
  },
  popupArrow: {
    position: 'absolute',
    bottom: -WP(2),
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: WP(2),
    borderRightWidth: WP(2),
    borderTopWidth: WP(2),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.White,
  },
});

export default BottomToolbar;

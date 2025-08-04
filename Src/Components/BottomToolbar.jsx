import React from 'react';
import {View, TouchableOpacity, Image, StyleSheet} from 'react-native';
import {colors, Icons} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const BottomToolbar = ({
  onAddPress,
  onDeletePress,
  onMorePress,
  onLeftActionPress,
  onRightActionPress,
}) => {
  return (
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
            onPress={onMorePress}
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
});

export default BottomToolbar;

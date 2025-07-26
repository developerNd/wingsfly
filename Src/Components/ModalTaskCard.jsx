import React from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native';
import RightIcon from 'react-native-vector-icons/MaterialIcons';
import {HP, WP, FS} from '../utils/dimentions';

const ModalTaskCard = ({
  item,
  checked,
  onToggle,
  isLastItem,
  isGoalOfDay,
  isFirstItem,
}) => {
  const getIconSize = () => {
    if (item.id === '2' || item.id === '4') {
      return {width: WP(5.9), height: WP(5.9)};
    }
    return {width: WP(6.9), height: WP(6.9)};
  };

  return (
    <TouchableOpacity
      onPress={() => item.navigation()}
      style={[
        styles.taskContainer,
        isFirstItem && styles.firstItem,
        isGoalOfDay && styles.lastItem,
      ]}>
      <View style={styles.iconWrapper}>
        <Image source={item.image} style={[styles.taskImage, getIconSize()]} />
      </View>
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle}>{item.Heading}</Text>
        <Text style={styles.taskDesc}>{item.title}</Text>
        {!isGoalOfDay && <View style={styles.bottomBorder} />}
      </View>

      <View style={styles.arrowWrapper}>
        <RightIcon name="chevron-right" size={WP(6.9)} color="#151F73" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  taskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: WP(2.7),
    padding: WP(1.3),
    marginBottom: HP(1.25),
  },
  firstItem: {
    marginTop: HP(-1.35),
  },
  lastItem: {
    marginBottom: HP(-0.4),
  },
  iconWrapper: {
    width: WP(12.3),
    height: WP(12.3),
    borderRadius: WP(6.15),
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: WP(3.2),
  },
  taskImage: {
    resizeMode: 'contain',
  },
  taskInfo: {
    flex: 1,
    marginLeft: WP(2.4),
    position: 'relative',
  },
  taskTitle: {
    fontSize: FS(1.9),
    fontFamily: 'OpenSans-Bold',
    color: '#141414',
    marginBottom: HP(0.3),
    marginTop: HP(0.25),
  },
  taskDesc: {
    fontSize: FS(1.15),
    color: '#4C4C4C',
    fontFamily: 'OpenSans-Regular',
    lineHeight: HP(1.75),
    marginBottom: HP(0.8),
    width: '94%',
  },
  bottomBorder: {
    position: 'absolute',
    bottom: HP(-1.25),
    left: 0,
    right: WP(-13.3),
    height: HP(0.125),
    backgroundColor: '#EAEAEA',
  },
  arrowWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: WP(2.7),
    marginRight: WP(1.6),
  },
  checkbox: {
    marginLeft: WP(2.7),
  },
});

export default ModalTaskCard;

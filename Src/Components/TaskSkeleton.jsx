import React from 'react';
import {View, StyleSheet, Animated} from 'react-native';
import {WP, HP} from '../utils/dimentions';

const TaskSkeleton = () => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.skeleton, {opacity}]}>
        <View style={styles.header}>
          <View style={styles.icon} />
          <View style={styles.titleContainer}>
            <View style={styles.title} />
            <View style={styles.subtitle} />
          </View>
          <View style={styles.checkbox} />
        </View>
        <View style={styles.footer}>
          <View style={styles.time} />
          <View style={styles.category} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: HP(1),
  },
  skeleton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: WP(4),
    marginHorizontal: WP(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1),
  },
  icon: {
    width: WP(10),
    height: WP(10),
    borderRadius: WP(5),
    backgroundColor: '#e0e0e0',
    marginRight: WP(3),
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    height: HP(2.5),
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: HP(0.5),
    width: '80%',
  },
  subtitle: {
    height: HP(1.5),
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    width: '60%',
  },
  checkbox: {
    width: WP(6),
    height: WP(6),
    borderRadius: WP(3),
    backgroundColor: '#e0e0e0',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    height: HP(2),
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    width: WP(15),
  },
  category: {
    height: HP(2),
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    width: WP(20),
  },
});

export default TaskSkeleton; 
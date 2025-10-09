import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, Icons } from '../Helper/Contants';
import { HP, WP, FS } from '../utils/dimentions';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DailyTaskReminderModal = ({
  visible,
  challenge,
  totalCompletedDays,
  totalCompletedHours,
  onClose,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      const autoCloseTimer = setTimeout(() => {
        onClose();
      }, 7000);

      return () => clearTimeout(autoCloseTimer);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, onClose]);

  if (!visible || !challenge) {
    return null;
  }

  // Calculate remaining days based on start date
  const calculateRemainingDays = () => {
    const today = new Date();
    const startDate = new Date(challenge.start_date);
    const endDate = new Date(challenge.end_date);
    
    if (today < startDate) {
      return challenge.number_of_days;
    }
    
    if (today > endDate) {
      return 0;
    }
    
    const timeDiff = endDate - today;
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    return Math.max(0, daysRemaining);
  };

  // Calculate current day based on start date
  const calculateCurrentDay = () => {
    const today = new Date();
    const startDate = new Date(challenge.start_date);
    
    if (today < startDate) {
      return 0;
    }
    
    const timeDiff = today - startDate;
    const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.min(daysPassed, challenge.number_of_days);
  };

  // Calculate remaining hours
  const calculateRemainingHours = () => {
    if (!challenge.hours_per_day) {
      return null;
    }
    
    const totalTargetHours = challenge.number_of_days * challenge.hours_per_day;
    const completedHours = totalCompletedHours || 0;
    const remainingHours = totalTargetHours - completedHours;
    
    console.log('Challenge:', challenge.name);
    console.log('Total target hours:', totalTargetHours);
    console.log('Completed hours received:', completedHours);
    console.log('Remaining hours:', remainingHours);
    
    return Math.max(0, remainingHours);
  };

  const remainingDays = calculateRemainingDays();
  const currentDay = calculateCurrentDay();
  const remainingHours = calculateRemainingHours();

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      statusBarTranslucent={true}>
      <StatusBar backgroundColor="rgba(0,0,0,0.6)" barStyle="light-content" />
      
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ],
            }
          ]}>
          
          {/* Close Button */}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeButtonInner}>
              <Icon name="close" size={WP(4)} color="#666666" />
            </View>
          </TouchableOpacity>

          {/* Header with Icon */}
          <View style={styles.header}>
            <View style={styles.headerIconContainer}>
              <Image source={Icons.Calendar} style={styles.iconImage} />
            </View>
            <Text style={styles.headerTitle}>Today's Challenge</Text>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            
            {/* Challenge Name */}
            <View style={styles.challengeNameContainer}>
              <Text style={styles.challengeName} numberOfLines={2}>
                {challenge.name}
              </Text>
            </View>

            {/* Progress Section - Cards in Row */}
            <View style={styles.progressSection}>
              {/* Remaining Days Card */}
              <View style={styles.cardWrapper}>
                <View style={styles.remainingCard}>
                  <Text style={styles.dayCardNumber}>{remainingDays}</Text>
                  <Text style={styles.dayCardLabel}>Days Remaining</Text>
                </View>
              </View>

              {/* Remaining Hours Card - Only show if hours_per_day is set */}
              {challenge.hours_per_day && remainingHours !== null && (
                <View style={styles.cardWrapper}>
                  <View style={[styles.remainingCard, styles.hoursCard]}>
                    <Text style={[styles.dayCardNumber, styles.hoursNumber]}>
                      {remainingHours.toFixed(1)}
                    </Text>
                    <Text style={styles.dayCardLabel}>Hours Remaining</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Progress Stats - Show completed stats */}
            {challenge.hours_per_day && (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{totalCompletedDays || 0}</Text>
                  <Text style={styles.statLabel}>Days Done</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {(totalCompletedHours || 0).toFixed(1)}h
                  </Text>
                  <Text style={styles.statLabel}>Hours Done</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {challenge.hours_per_day}h
                  </Text>
                  <Text style={styles.statLabel}>Daily Target</Text>
                </View>
              </View>
            )}

            {/* Why Section */}
            {challenge.why && (
              <View style={styles.whyContainer}>
                <View style={styles.whyHeader}>
                  <Icon name="lightbulb-outline" size={WP(4)} color={colors.Primary} />
                  <Text style={styles.whyLabel}>Why this matters</Text>
                </View>
                <Text style={styles.whyText} numberOfLines={4}>
                  {challenge.why}
                </Text>
              </View>
            )}

            {/* Motivational footer */}
            <View style={styles.motivationContainer}>
              <Text style={styles.motivationText}>
                Keep going! Every day counts 💪
              </Text>
            </View>

          </View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(5),
  },
  modalContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(5),
    width: '100%',
    maxWidth: WP(88),
    elevation: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: HP(2) },
    shadowOpacity: 0.3,
    shadowRadius: WP(4),
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: HP(1.5),
    right: WP(4),
    zIndex: 10,
  },
  closeButtonInner: {
    width: WP(8),
    height: WP(8),
    borderRadius: WP(4),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: WP(4),
    paddingTop: HP(3),
    paddingBottom: HP(1),
  },
  headerIconContainer: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(6),
    backgroundColor: `${colors.Primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: HP(1),
  },
  headerTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#555555',
    letterSpacing: 0.5,
  },
  content: {
    paddingHorizontal: WP(5),
    paddingBottom: HP(3),
  },
  challengeNameContainer: {
    alignItems: 'center',
    marginBottom: HP(2.5),
    paddingHorizontal: WP(2),
  },
  challengeName: {
    fontSize: FS(2.4),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    textAlign: 'center',
    lineHeight: FS(2.8),
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: HP(1.5),
    gap: WP(3),
  },
  cardWrapper: {
    flex: 1,
  },
  remainingCard: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
    borderRadius: WP(3),
    paddingVertical: HP(1.2),
    paddingHorizontal: WP(2),
    alignItems: 'center',
    borderWidth: 1,
  },
  hoursCard: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFCC80',
  },
  iconImage: {
    width: WP(5.5),
    height: WP(5.5),
    tintColor: colors.Primary,
    resizeMode: 'contain',
  },
  dayCardNumber: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    marginBottom: HP(0.3),
  },
  hoursNumber: {
    color: '#FF9800',
  },
  dayCardLabel: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: WP(3),
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(2),
    marginBottom: HP(2),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    marginBottom: HP(0.2),
  },
  statLabel: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: HP(3),
    backgroundColor: '#E0E0E0',
  },
  whyContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: WP(3),
    padding: WP(4),
    marginBottom: HP(1.5),
    borderLeftWidth: WP(1),
    borderLeftColor: colors.Primary,
  },
  whyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1),
  },
  whyLabel: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    marginLeft: WP(2),
  },
  whyText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#444444',
    lineHeight: FS(1.9),
    marginLeft: WP(1),
  },
  motivationContainer: {
    alignItems: 'center',
    paddingTop: HP(1),
  },
  motivationText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    textAlign: 'center',
  },
});

export default DailyTaskReminderModal;
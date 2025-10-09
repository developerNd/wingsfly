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

const { width: screenWidth } = Dimensions.get('window');

const MOTIVATIONAL_QUOTES = [
  "Every day is a new opportunity to move closer to your goals.",
  "The secret of getting ahead is getting started.",
  "Don't watch the clock; do what it does. Keep going.",
  "Small daily improvements are the key to staggering long-term results.",
  "Your future is created by what you do today, not tomorrow.",
  "Success is the sum of small efforts repeated day in and day out.",
  "The only way to do great work is to love what you do.",
  "Believe you can and you're halfway there."
];

const MonthReminderModal = ({ visible, onClose, userName }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [currentMonth, setCurrentMonth] = useState('');

  // Extract first name from email or full name
  const getDisplayName = (name) => {
    if (!name) return '';
    
    // If it's an email, extract the part before @
    if (name.includes('@')) {
      name = name.split('@')[0];
    }
    
    // Split by common separators and get first part
    const firstName = name.split(/[._\s-]/)[0];
    
    // Capitalize first letter
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  };

  useEffect(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const remaining = lastDay.getDate() - now.getDate() + 1;
    
    setDaysRemaining(remaining);
    setCurrentMonth(now.toLocaleString('default', { month: 'long', year: 'numeric' }));
    
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setQuote(randomQuote);
  }, [visible]);

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
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      const autoCloseTimer = setTimeout(() => {
        onClose();
      }, 8000);

      return () => clearTimeout(autoCloseTimer);
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  const displayName = getDisplayName(userName);

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
          { opacity: fadeAnim }
        ]}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}>
          
          {/* Close Button */}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={WP(6)} color="#999999" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <Image source={Icons.Calendar} style={styles.iconImage} />
            </View>
            <Text style={styles.monthText}>{currentMonth}</Text>
            {displayName ? (
              <Text style={styles.greetingText}>Hi {displayName}!</Text>
            ) : null}
          </View>

          {/* Days Remaining - Compact */}
          <View style={styles.daysSection}>
            <Text style={styles.daysNumber}>{daysRemaining}</Text>
            <Text style={styles.daysLabel}>Days Remaining</Text>
            <Text style={styles.daysSubtext}>Make every day count!</Text>
          </View>

          {/* Quote Section */}
          <View style={styles.quoteSection}>
            <Icon name="format-quote" size={WP(6)} color={colors.Primary} style={styles.quoteIcon} />
            <Text style={styles.quoteText}>{quote}</Text>
          </View>

          {/* CTA Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={onClose}
              activeOpacity={0.8}>
              <Text style={styles.ctaText}>Let's Make It Count</Text>
              <Icon name="arrow-forward" size={WP(4.5)} color={colors.White} />
            </TouchableOpacity>
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
    borderRadius: WP(4),
    width: '100%',
    maxWidth: WP(85),
    elevation: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: HP(2) },
    shadowOpacity: 0.3,
    shadowRadius: WP(5),
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: HP(1.5),
    right: WP(3),
    zIndex: 10,
    padding: WP(2),
  },
  header: {
    alignItems: 'center',
    paddingTop: HP(4),
    paddingBottom: HP(1.5),
    paddingHorizontal: WP(5),
  },
  iconWrapper: {
    width: WP(15),
    height: WP(15),
    borderRadius: WP(7.5),
    backgroundColor: `${colors.Primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: HP(1.5),
  },
  iconImage: {
    width: WP(6),
    height: WP(6),
    tintColor: '#4F4F4F',
    resizeMode: 'contain',
  },
  monthText: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: '#1a1a1a',
    marginBottom: HP(0.5),
  },
  greetingText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
  daysSection: {
    alignItems: 'center',
    paddingVertical: HP(2),
    paddingHorizontal: WP(5),
    backgroundColor: `${colors.Primary}10`,
    marginHorizontal: WP(5),
    marginBottom: HP(2),
    borderRadius: WP(2.5),
  },
  daysNumber: {
    fontSize: FS(3.5),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    lineHeight: FS(4.8),
  },
  daysLabel: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: '#2a2a2a',
    marginTop: HP(0.3),
    marginBottom: HP(0.3),
  },
  daysSubtext: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
  },
  quoteSection: {
    paddingHorizontal: WP(5),
    marginBottom: HP(2.5),
    alignItems: 'center',
  },
  quoteIcon: {
    opacity: 0.2,
    marginBottom: HP(0.8),
  },
  quoteText: {
    fontSize: FS(1.45),
    fontFamily: 'OpenSans-Medium',
    color: '#333333',
    lineHeight: FS(2.2),
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: WP(5),
    paddingBottom: HP(3),
  },
  ctaButton: {
    backgroundColor: colors.Primary,
    borderRadius: WP(2.5),
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(5),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.Primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  ctaText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
    marginRight: WP(2),
  },
});

export default MonthReminderModal;
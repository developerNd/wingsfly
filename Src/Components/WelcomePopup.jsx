import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {Icons, colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';
import {supabase} from '../../supabase';
import {userTimeResponseService} from '../services/api/userTimeResponseService';

const WelcomePopup = ({visible, onClose, userName = 'User'}) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDisplayName, setUserDisplayName] = useState(userName);
  const [isReady, setIsReady] = useState(false);
  const [userResponse, setUserResponse] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user profile immediately when component mounts or visible changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Get current user from Supabase auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          setUserDisplayName(userName);
          setIsReady(true);
          return;
        }
        
        if (!user) {
          setUserDisplayName(userName);
          setIsReady(true);
          return;
        }
        
        setCurrentUser(user);
        
        // Extract name using the same logic as AchievementScreen
        const extractedName = user.user_metadata?.username ||
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split('@')[0] : userName);
        
        setUserDisplayName(extractedName);
        setIsReady(true);
        
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserDisplayName(userName);
        setIsReady(true);
      }
    };

    // Fetch user profile when visible prop becomes true
    if (visible && !isReady) {
      fetchUserProfile();
    }
  }, [visible, userName, isReady]);

  // Dynamic user name extraction
  const getDynamicUserName = () => {
    return userDisplayName;
  };

  // Function to get time-based greeting in IST
  const getTimeBasedGreeting = () => {
    const now = new Date();
    
    // Convert to IST (UTC + 5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const hours = istTime.getUTCHours();

    if (hours >= 5 && hours < 12) {
      return {
        greeting: 'Good Morning',
        emoji: '🌅',
        message: 'Hope you\'re having a great start to your day!',
      };
    } else if (hours >= 12 && hours < 17) {
      return {
        greeting: 'Good Afternoon',
        emoji: '☀️',
        message: 'Hope your afternoon is going wonderfully!',
      };
    } else if (hours >= 17 && hours < 21) {
      return {
        greeting: 'Good Evening',
        emoji: '🌆',
        message: 'Hope you\'re having a pleasant evening!',
      };
    } else {
      return {
        greeting: 'Good Night',
        emoji: '🌙',
        message: 'Hope you have a restful night!',
      };
    }
  };

  const handleSaveAndClose = async () => {
    // Make input optional - proceed even if empty
    if (!currentUser) {
      // If no user but input is empty, just close
      if (!userResponse.trim()) {
        onClose();
        return;
      }
      Alert.alert('Error', 'User not found. Please try again.');
      return;
    }

    try {
      setIsSaving(true);

      // Only save if there's actual input
      if (userResponse.trim()) {
        await userTimeResponseService.createUserTimeResponse(
          currentUser.id,
          userResponse.trim()
        );
        console.log('User response saved successfully:', userResponse.trim());
      }
      
      // Clear the input and close the modal
      setUserResponse('');
      onClose();
    } catch (error) {
      console.error('Error saving user response:', error);
      Alert.alert(
        'Error',
        'Failed to save your response. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const {greeting, emoji, message} = getTimeBasedGreeting();
  const displayName = getDynamicUserName();

  return (
    <Modal
      visible={visible && isReady}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <StatusBar
          backgroundColor={colors.ModelBackground}
          barStyle="dark-content"
        />
        <View style={styles.modalContainer}>
          {/* Title with Logo */}
          <View style={styles.titleRow}>
            <Image source={Icons.Wingsfly} style={styles.logoImage} />
            <View style={styles.titleContainer}>
              <Text style={styles.welcomeTitle}>Welcome back!</Text>
              <Text style={styles.greetingText}>
                {greeting} {emoji}
              </Text>
            </View>
          </View>

          {/* Message - aligned with logo start */}
          <View style={styles.messageContainer}>
            <Text style={styles.modalMessage}>
              <Text style={styles.userName}>{displayName}</Text>, {message}
            </Text>
          </View>

          {/* Input Section - Matching ChecklistScreen style with placeholder */}
          <View style={styles.inputOuterContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={userResponse}
                onChangeText={setUserResponse}
                placeholder="What did you do when away from this app?"
                placeholderTextColor="#999999"
                multiline={true}
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Action Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                isSaving && styles.continueButtonDisabled
              ]}
              onPress={handleSaveAndClose}
              activeOpacity={0.7}
              disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color={colors.White} size="small" />
              ) : (
                <Text style={styles.continueButtonText}>Let's Get Started!</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.ModelBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(4),
  },
  modalContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(5),
    paddingVertical: HP(4),
    paddingHorizontal: WP(2),
    width: '100%',
    maxWidth: WP(88),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: HP(1),
    },
    shadowOpacity: 0.3,
    shadowRadius: WP(4),
    elevation: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(3),
    justifyContent: 'flex-start',
    width: '100%',
  },
  logoImage: {
    width: WP(8),
    height: WP(8),
    resizeMode: 'contain',
    marginRight: WP(3),
    marginLeft: WP(5),
  },
  titleContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: FS(2.4),
    fontFamily: 'Roboto-Bold',
    color: colors.Primary,
    marginBottom: HP(0.5),
  },
  greetingText: {
    fontSize: FS(2.0),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
  },
  messageContainer: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: HP(2.5),
  },
  modalMessage: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Regular',
    color: '#555555',
    lineHeight: FS(2.4),
    marginRight: WP(3),
    marginLeft: WP(5),
    textAlign: 'left',
  },
  userName: {
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    fontSize: FS(1.8),
  },
  inputOuterContainer: {
    width: '100%',
    paddingHorizontal: WP(5),
    marginBottom: HP(2.5),
  },
  inputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(1.8),
    padding: WP(2.133),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minHeight: HP(12),
  },
  textInput: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Regular',
    color: '#575656',
    minHeight: HP(10),
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(2.667),
    textAlignVertical: 'top',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: WP(6),
  },
  continueButton: {
    backgroundColor: colors.Primary,
    paddingVertical: HP(1.5),
    borderRadius: WP(3),
    alignItems: 'center',
    justifyContent: 'center',
    height: HP(5.5),
    shadowColor: colors.Primary,
    shadowOffset: {
      width: 0,
      height: HP(0.3),
    },
    shadowOpacity: 0.3,
    shadowRadius: WP(2),
    elevation: 5,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
});

export default WelcomePopup;
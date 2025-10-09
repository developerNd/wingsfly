import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import CustomButton from '../../Components/CustomButton';
import {colors, routes} from '../../Helper/Contants';
import Logo from '../../assets/Images/brand.svg';
import {useNavigation} from '@react-navigation/native';
import {supabase} from '../../../supabase';
import {HP, WP, FS} from '../../utils/dimentions';
import {useAuth} from '../../contexts/AuthContext';
import {NativeModules} from 'react-native';
// FIXED: Import UserDataService properly
import UserDataService from '../../services/UserData/UserDataService';
// NEW: Import SessionService for login/logout tracking
import SessionService from '../../services/api/SessionService';

// FIXED: Get UserDataModule from NativeModules
const {UserDataModule, InstalledApps} = NativeModules;

// Storage keys for remember me functionality
const STORAGE_KEYS = {
  REMEMBER_ME: 'remember_me',
  SAVED_EMAIL: 'saved_email',
  SAVED_PASSWORD: 'saved_password',
};

const Login = () => {
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Password Reset Modal States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const navigation = useNavigation();
  const {startPasswordReset, completePasswordReset} = useAuth();

  // OTP Timer Effect
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(timer => timer - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Load saved credentials when component mounts
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  // Credential Management Functions
  const loadSavedCredentials = async () => {
    try {
      const savedRememberMe = await AsyncStorage.getItem(
        STORAGE_KEYS.REMEMBER_ME,
      );

      if (savedRememberMe === 'true') {
        const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_EMAIL);
        const savedPassword = await AsyncStorage.getItem(
          STORAGE_KEYS.SAVED_PASSWORD,
        );

        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const saveCredentials = async (emailToSave, passwordToSave) => {
    try {
      if (rememberMe) {
        await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
        await AsyncStorage.setItem(STORAGE_KEYS.SAVED_EMAIL, emailToSave);
        await AsyncStorage.setItem(STORAGE_KEYS.SAVED_PASSWORD, passwordToSave);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
        await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_EMAIL);
        await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_PASSWORD);
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  const handleRememberMeToggle = async () => {
    const newRememberMeState = !rememberMe;
    setRememberMe(newRememberMeState);

    if (!newRememberMeState) {
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
        await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_EMAIL);
        await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_PASSWORD);
      } catch (error) {
        console.error('Error clearing credentials:', error);
      }
    }
  };

  // UPDATED: Login function with session tracking
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    console.log('=== LOGIN PROCESS STARTED ===');
    setLoading(true);

    try {
      const {data, error} = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      setLoading(false);

      if (error) {
        console.log('Login failed:', error.message);
        Alert.alert('Login Failed', error.message);
        return;
      }

      console.log(
        'Login successful, user data:',
        JSON.stringify(data.user, null, 2),
      );

      // NEW: Track login session
      if (data.user) {
        try {
          console.log('=== TRACKING LOGIN SESSION ===');
          const sessionResult = await SessionService.trackLogin(data.user.id);
          if (sessionResult.success) {
            console.log('✅ Login session tracked successfully');
          } else {
            console.error(
              '❌ Failed to track login session:',
              sessionResult.error,
            );
          }
        } catch (sessionError) {
          console.error('Error tracking login session:', sessionError);
        }
      }

      // Save credentials first
      await saveCredentials(email, password);
      console.log('Credentials saved');

      // FIXED: Save user data to Android SharedPreferences after successful login
      if (data.user) {
        try {
          console.log('=== SAVING USER DATA TO ANDROID ===');
          console.log(
            'User profile to save:',
            JSON.stringify(data.user, null, 2),
          );

          // Check if UserDataModule is available
          if (!UserDataModule) {
            console.error('❌ UserDataModule is NULL or undefined!');
            Alert.alert(
              'Error',
              'UserDataModule not available. Please check native module setup.',
            );
            return;
          }

          console.log('✅ UserDataModule is available');

          // FIXED: Call the save function using UserDataService
          const saveResult = await UserDataService.saveUserDataAfterLogin(
            data.user,
          );
          console.log('Save result:', saveResult);

          if (saveResult) {
            console.log('✅ User data saved successfully after login');

            try {
              await InstalledApps.refreshNotification();
              console.log('Notification refreshed after removing limit');
            } catch (error) {
              console.warn('Failed to refresh notification:', error);
            }

            // Wait a bit longer and then debug what was actually saved
            setTimeout(async () => {
              console.log('=== DEBUGGING SAVED DATA ===');
              try {
                // Check AsyncStorage
                const asyncUserData = await AsyncStorage.getItem('user_data');
                const asyncLoggedIn = await AsyncStorage.getItem(
                  'user_logged_in',
                );
                console.log('AsyncStorage user_data:', asyncUserData);
                console.log('AsyncStorage user_logged_in:', asyncLoggedIn);

                // Check native module
                if (UserDataModule) {
                  const nativeUserData = await UserDataModule.getUserData();
                  console.log(
                    'Native user data:',
                    JSON.stringify(nativeUserData, null, 2),
                  );
                }

                // Force update service notification
                console.log('🔄 Forcing service notification update...');
                await UserDataService.updateServiceNotification();
              } catch (debugError) {
                console.error('Debug error:', debugError);
              }
            }, 3000); // Wait 3 seconds
          } else {
            console.error('❌ Failed to save user data after login');
            Alert.alert(
              'Warning',
              'Login successful but failed to save user data locally',
            );
          }
        } catch (saveError) {
          console.error('❌ Error saving user data after login:', saveError);
          Alert.alert(
            'Warning',
            `Login successful but error saving user data: ${saveError.message}`,
          );
        }
      } else {
        console.error('❌ No user data received from Supabase');
      }

      console.log('=== LOGIN PROCESS COMPLETED ===');
    } catch (loginError) {
      setLoading(false);
      console.error('Login error:', loginError);
      Alert.alert(
        'Login Error',
        loginError.message || 'An unexpected error occurred',
      );
    }
  };

  // Password Reset Modal Functions
  const openResetModal = async () => {
    setResetEmail(email);
    setShowResetModal(true);
    setResetStep(1);
    await startPasswordReset();
  };

  const closeResetModal = async () => {
    setShowResetModal(false);
    setResetStep(1);
    setResetEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpTimer(0);
    await completePasswordReset();
  };

  // Step 1: Send OTP to Email
  const handleSendOTP = async () => {
    if (!resetEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setResetLoading(true);

    try {
      const {data, error} = await supabase.auth.signInWithOtp({
        email: resetEmail,
        options: {
          shouldCreateUser: false,
          data: {
            purpose: 'password_reset',
          },
        },
      });

      setResetLoading(false);

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          Alert.alert('Error', 'Please verify your email address first.');
        } else if (error.message.includes('User not found')) {
          Alert.alert('Error', 'No account found with this email address.');
        } else {
          Alert.alert('Error', error.message);
        }
        console.error('OTP send error:', error);
      } else {
        setResetStep(2);
        setOtpTimer(300);
        Alert.alert(
          'Code Sent',
          `A 6-digit verification code has been sent to ${resetEmail}. Please check your email and enter the code below.`,
        );
      }
    } catch (error) {
      setResetLoading(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('OTP send error:', error);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    const cleanOtpCode = otpCode.replace(/\s/g, '');

    if (!/^\d{6}$/.test(cleanOtpCode)) {
      Alert.alert('Error', 'Please enter only numbers (6 digits)');
      return;
    }

    setResetLoading(true);

    try {
      const {data, error} = await supabase.auth.verifyOtp({
        email: resetEmail,
        token: cleanOtpCode,
        type: 'email',
      });

      setResetLoading(false);

      if (error) {
        console.error('OTP verification error:', error);

        if (error.message.includes('expired')) {
          Alert.alert(
            'Code Expired',
            'Your verification code has expired. Please request a new one.',
            [
              {text: 'Get New Code', onPress: () => setResetStep(1)},
              {text: 'Cancel', style: 'cancel'},
            ],
          );
        } else if (error.message.includes('invalid')) {
          Alert.alert(
            'Invalid Code',
            'The code you entered is incorrect. Please check your email and try again.',
          );
          setOtpCode('');
        } else {
          Alert.alert('Verification Failed', error.message);
        }
      } else {
        console.log('OTP verified successfully');
        setResetStep(3);
        Alert.alert('Success', 'Code verified! Now create your new password.');
      }
    } catch (error) {
      setResetLoading(false);
      Alert.alert(
        'Error',
        'Something went wrong during verification. Please try again.',
      );
      console.error('OTP verify error:', error);
    }
  };

  // Step 3: Set New Password
  const handleSetNewPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setResetLoading(true);

    try {
      const {data, error} = await supabase.auth.updateUser({
        password: newPassword,
      });

      setResetLoading(false);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Password Reset Successful',
          'Your password has been updated successfully. Please log in with your new password.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await supabase.auth.signOut();
                await completePasswordReset();

                setShowResetModal(false);
                setResetStep(1);
                setResetEmail('');
                setOtpCode('');
                setNewPassword('');
                setConfirmPassword('');
                setOtpTimer(0);

                setEmail(resetEmail);
                setPassword('');

                setTimeout(() => {
                  Alert.alert(
                    'Ready to Login',
                    'You can now log in with your new password.',
                  );
                }, 500);
              },
            },
          ],
        );
      }
    } catch (error) {
      setResetLoading(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('Password update error:', error);
    }
  };

  const resendOTP = async () => {
    if (otpTimer > 0) return;

    setResetLoading(true);
    setOtpCode('');

    try {
      const {data, error} = await supabase.auth.signInWithOtp({
        email: resetEmail,
        options: {
          shouldCreateUser: false,
          data: {purpose: 'password_reset'},
        },
      });

      setResetLoading(false);

      if (!error) {
        setOtpTimer(300);
        Alert.alert(
          'New Code Sent',
          `A fresh 6-digit code has been sent to ${resetEmail}.`,
        );
      } else {
        Alert.alert('Error', error.message);
      }
    } catch (error) {
      setResetLoading(false);
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    }
  };

  const formatTimer = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderResetModalContent = () => {
    switch (resetStep) {
      case 1:
        return (
          <>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalDescription}>
              Enter your email address and we'll send you a verification code.
            </Text>
            <TextInput
              value={resetEmail}
              onChangeText={setResetEmail}
              placeholder="Enter Your Email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.modalInput}
              editable={!resetLoading}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeResetModal}
                disabled={resetLoading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.resetButton,
                  resetLoading && styles.disabledButton,
                ]}
                onPress={handleSendOTP}
                disabled={resetLoading}>
                <Text style={styles.resetButtonText}>
                  {resetLoading ? 'Sending...' : 'Send Code'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        );

      case 2:
        return (
          <>
            <Text style={styles.modalTitle}>Enter Verification Code</Text>
            <Text style={styles.modalDescription}>
              We sent a 6-digit code to {resetEmail}
            </Text>
            <TextInput
              value={otpCode}
              onChangeText={text => {
                const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                setOtpCode(numericText);
              }}
              placeholder="Enter 6-digit code"
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.modalInput, styles.otpInput]}
              editable={!resetLoading}
            />

            {otpTimer > 0 && (
              <Text style={styles.timerText}>
                Code expires in {formatTimer(otpTimer)}
              </Text>
            )}

            <TouchableOpacity
              onPress={resendOTP}
              disabled={otpTimer > 0 || resetLoading}
              style={styles.resendButton}>
              <Text
                style={[
                  styles.resendButtonText,
                  (otpTimer > 0 || resetLoading) && styles.disabledText,
                ]}>
                {otpTimer > 0
                  ? `Resend in ${formatTimer(otpTimer)}`
                  : 'Resend Code'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setResetStep(1)}
                disabled={resetLoading}>
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.resetButton,
                  resetLoading && styles.disabledButton,
                ]}
                onPress={handleVerifyOTP}
                disabled={resetLoading}>
                <Text style={styles.resetButtonText}>
                  {resetLoading ? 'Verifying...' : 'Verify'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        );

      case 3:
        return (
          <>
            <Text style={styles.modalTitle}>Set New Password</Text>
            <Text style={styles.modalDescription}>
              Create a strong password for your account
            </Text>

            <View style={styles.passwordInputContainer}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter New Password"
                secureTextEntry={!showNewPassword}
                style={styles.modalInput}
                editable={!resetLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowNewPassword(!showNewPassword)}>
                <MaterialIcons
                  name={showNewPassword ? 'visibility' : 'visibility-off'}
                  size={FS(2)}
                  color="gray"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordInputContainer}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm New Password"
                secureTextEntry={!showConfirmPassword}
                style={styles.modalInput}
                editable={!resetLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <MaterialIcons
                  name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                  size={FS(2)}
                  color="gray"
                />
              </TouchableOpacity>
            </View>

            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeResetModal}
                disabled={resetLoading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.resetButton,
                  resetLoading && styles.disabledButton,
                ]}
                onPress={handleSetNewPassword}
                disabled={resetLoading}>
                <Text style={styles.resetButtonText}>
                  {resetLoading ? 'Updating...' : 'Update Password'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={['#94BCEB', '#D9DDDF', '#94BCEB']}
      start={{x: 2, y: 0.01}}
      end={{x: 0.1, y: 1.3}}
      style={styles.container}>
      <StatusBar
        backgroundColor="#b4cfee"
        barStyle="dark-content"
        translucent={false}
      />
      <SafeAreaView style={styles.container}>
        <Logo width={WP(28)} height={WP(28)} style={styles.logo} />
        <View style={styles.innerContainer}>
          <Text style={styles.signText}>Sign in to your Account</Text>
          <Text style={styles.signsmallText}>
            Enter your email and password to log in
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter Your Email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.inputbox}
              editable={!loading}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter Your Password"
              secureTextEntry
              style={styles.inputbox}
              editable={!loading}
            />
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={handleRememberMeToggle}
              disabled={loading}>
              <View
                style={[styles.checkbox, rememberMe && styles.checkedCheckbox]}>
                {rememberMe && (
                  <MaterialIcons
                    name="check"
                    size={FS(1.6)}
                    color={colors.White}
                  />
                )}
              </View>
              <Text style={styles.rememberMeText}>Remember Me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openResetModal}
              disabled={loading}
              style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <CustomButton
            buttonStyle={[styles.loginButton, loading && styles.disabledButton]}
            TextStyle={styles.loginButtonText}
            text={loading ? 'Logging in...' : 'Login'}
            onClick={handleLogin}
            disabled={loading}
          />

          <View style={styles.separator}>
            <Text style={styles.line}></Text>
            <Text style={styles.orText}>OR</Text>
            <Text style={styles.line}></Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate(routes.SIGNUP_SCREEN)}
            style={styles.signupContainer}
            disabled={loading}>
            <Text style={styles.signupText}>
              New user? <Text style={styles.signupLink}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Password Reset Modal */}
        <Modal
          visible={showResetModal}
          animationType="slide"
          transparent={true}
          onRequestClose={closeResetModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={closeResetModal}
                  style={styles.closeButton}>
                  <MaterialIcons
                    name="close"
                    size={FS(2.5)}
                    color={colors.Shadow}
                  />
                </TouchableOpacity>
              </View>

              {renderResetModalContent()}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logo: {
    height: WP(25),
    width: WP(25),
    alignSelf: 'center',
    marginTop: HP(2.5),
  },
  innerContainer: {
    width: '80%',
    alignSelf: 'center',
    marginTop: HP(2),
  },
  signText: {
    fontSize: FS(4.3),
    fontWeight: 'bold',
    color: colors.Shadow,
    letterSpacing: 1,
  },
  signsmallText: {
    marginTop: HP(1.2),
    fontSize: FS(1.9),
    fontWeight: '500',
    color: 'gray',
  },
  inputContainer: {
    marginTop: HP(3),
  },
  inputbox: {
    width: '100%',
    height: HP(6.6),
    backgroundColor: colors.White,
    marginTop: HP(3.1),
    borderRadius: WP(2),
    paddingLeft: WP(4),
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: HP(2.5),
    paddingHorizontal: WP(1),
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: WP(4.5),
    height: WP(4.5),
    borderWidth: 2,
    borderColor: colors.Primary,
    borderRadius: WP(1),
    marginRight: WP(2.5),
    backgroundColor: colors.White,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: colors.Primary,
    borderColor: colors.Primary,
  },
  rememberMeText: {
    fontSize: FS(1.8),
    color: colors.Shadow,
    fontWeight: '500',
  },
  forgotPasswordContainer: {
    paddingVertical: HP(0.5),
  },
  forgotPasswordText: {
    fontSize: FS(1.8),
    color: colors.Primary,
    fontWeight: '500',
  },
  loginButton: {
    height: HP(6.6),
    backgroundColor: colors.Primary,
    marginTop: HP(3.8),
    borderRadius: WP(2.5),
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: colors.White,
    fontSize: FS(2.4),
    fontWeight: '500',
    letterSpacing: 1,
  },
  separator: {
    flexDirection: 'row',
    marginTop: HP(5),
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  line: {
    width: WP(33),
    height: HP(0.15),
    backgroundColor: 'gray',
  },
  orText: {
    textAlign: 'center',
    fontSize: FS(1.6),
    color: colors.Shadow,
  },
  signupContainer: {
    marginTop: HP(3.1),
    alignSelf: 'center',
  },
  signupText: {
    fontSize: FS(1.8),
    color: colors.Shadow,
  },
  signupLink: {
    fontWeight: 'bold',
    color: colors.Primary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(5),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: HP(1),
  },
  closeButton: {
    padding: WP(1),
  },
  modalTitle: {
    fontSize: FS(3),
    fontWeight: 'bold',
    color: colors.Shadow,
    textAlign: 'center',
    marginBottom: HP(1.5),
  },
  modalDescription: {
    fontSize: FS(1.8),
    color: 'gray',
    textAlign: 'center',
    marginBottom: HP(3),
    lineHeight: FS(2.5),
  },
  modalInput: {
    width: '100%',
    height: HP(6),
    backgroundColor: '#f5f5f5',
    borderRadius: WP(2),
    paddingLeft: WP(4),
    marginBottom: HP(2),
    fontSize: FS(1.8),
  },
  otpInput: {
    textAlign: 'center',
    fontSize: FS(2.2),
    letterSpacing: 4,
    fontWeight: 'bold',
  },
  passwordInputContainer: {
    position: 'relative',
    marginBottom: HP(2),
  },
  eyeIcon: {
    position: 'absolute',
    right: WP(3),
    top: HP(1.5),
    padding: WP(1),
  },
  timerText: {
    textAlign: 'center',
    fontSize: FS(1.6),
    color: colors.Primary,
    fontWeight: '500',
    marginBottom: HP(2),
  },
  resendButton: {
    alignSelf: 'center',
    paddingVertical: HP(1),
    paddingHorizontal: WP(3),
    marginBottom: HP(2),
  },
  resendButtonText: {
    fontSize: FS(1.7),
    color: colors.Primary,
    fontWeight: '500',
  },
  disabledText: {
    color: '#ccc',
  },
  errorText: {
    color: '#ff4444',
    fontSize: FS(1.6),
    textAlign: 'center',
    marginBottom: HP(2),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: WP(3),
    marginTop: HP(2),
  },
  modalButton: {
    flex: 1,
    height: HP(5.5),
    borderRadius: WP(2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resetButton: {
    backgroundColor: colors.Primary,
  },
  cancelButtonText: {
    fontSize: FS(1.9),
    color: colors.Shadow,
    fontWeight: '500',
  },
  resetButtonText: {
    fontSize: FS(1.9),
    color: colors.White,
    fontWeight: '500',
  },
});

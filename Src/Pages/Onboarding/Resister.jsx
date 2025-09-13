import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import CustomButton from '../../Components/CustomButton';
import { colors, routes } from '../../Helper/Contants';
import Logo from '../../assets/Images/brand.svg';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../supabase';
import { HP, WP, FS } from '../../utils/dimentions';

const Register = () => {
  const [username, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleMobileChange = (text) => {
    // Only allow numbers and limit to 10 digits
    const numericValue = text.replace(/[^0-9]/g, '');
    if (numericValue.length <= 10) {
      setMobile(numericValue);
    }
  };

  // Function to filter out emojis and keep only professional characters
  const filterProfessionalText = (text) => {
    // Allow alphanumeric, basic punctuation, and common symbols
    // This regex removes emojis, special Unicode characters, etc.
    return text.replace(/[^\w\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g, '');
  };

  const handlePasswordChange = (text) => {
    const filteredText = filterProfessionalText(text);
    setPassword(filteredText);
  };

  const handleUsernameChange = (text) => {
    const filteredText = filterProfessionalText(text);
    setUserName(filteredText);
  };

  const validateMobile = () => {
    return mobile.length === 10;
  };

  const handleSignup = async () => {
  if (!username || !email || !mobile || !password) {
    Alert.alert('Error', 'Please fill in all fields');
    return;
  }

  if (!validateMobile()) {
    Alert.alert('Error', 'Mobile number must be exactly 10 digits');
    return;
  }

  setLoading(true);
  
  // Format phone number to E.164 format (assuming Indian numbers)
  const formattedPhone = `+91${mobile}`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: username,
        phone: formattedPhone,
        username: username,
        mobile: mobile,
        profile_setup_complete: false,
      },
    },
  });

  setLoading(false);

  if (error) {
    Alert.alert('Signup Failed', error.message);
  } else {
    navigation.navigate(routes.GENDERSELECTION_SCREEN);
  }
};

  return (
    <LinearGradient
      colors={['#94BCEB', '#D9DDDF', '#94BCEB']}
      start={{ x: 2, y: 0.01 }}
      end={{ x: 0.1, y: 1.3 }}
      style={styles.container}
    >
      <StatusBar 
        backgroundColor="#b4cfee" 
        barStyle="dark-content"
        translucent={false}
      />
      <SafeAreaView style={styles.container}>
        <Logo width={WP(28)} height={WP(28)} style={styles.logo} />
        <View style={styles.innerContainer}>
          <Text style={styles.signText}>Create an Account</Text>
          <Text style={styles.signsmallText}>
            Please fill in the details to sign up
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="Username"
              style={styles.inputbox}
              editable={!loading}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.inputbox}
              editable={!loading}
            />
            <TextInput
              value={mobile}
              onChangeText={handleMobileChange}
              placeholder="Mobile Number"
              keyboardType="numeric"
              style={[
                styles.inputbox,
                mobile.length > 0 && !validateMobile() && styles.invalidInput
              ]}
              editable={!loading}
              maxLength={10}
            />
            <View style={styles.passwordContainer}>
              <TextInput
                value={password}
                onChangeText={handlePasswordChange}
                placeholder="Password"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                editable={!loading}
                autoCapitalize="none"
                textContentType="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                disabled={loading}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={21}
                  color="gray"
                />
              </TouchableOpacity>
            </View>
          </View>

          <CustomButton
            buttonStyle={[styles.loginButton, loading && styles.disabledButton]}
            TextStyle={styles.loginButtonText}
            text={loading ? "Creating Account..." : "Sign Up"}
            onClick={handleSignup}
            disabled={loading}
          />

          <TouchableOpacity 
            onPress={() => navigation.navigate(routes.LOGIN_SCREEN)} 
            style={styles.signupContainer}
            disabled={loading}
          >
            <Text style={styles.signupText}>
              Already have an account?{' '}
              <Text style={styles.signupLink}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logo: {
    height: WP(28),
    width: WP(28),
    alignSelf: 'center',
    marginTop: HP(2.5),
  },
  innerContainer: {
    width: '80%',
    alignSelf: 'center',
    marginTop: HP(2),
  },
  signText: {
    fontSize: FS(3.8),
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
    marginTop: HP(2.5),
  },
  inputbox: {
    width: '100%',
    height: HP(6.6),
    backgroundColor: colors.White,
    marginTop: HP(2.5),
    borderRadius: WP(2),
    paddingLeft: WP(4),
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.White,
    marginTop: HP(2.5),
    borderRadius: WP(2),
    height: HP(6.6),
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingLeft: WP(4),
    paddingRight: WP(12),
  },
  eyeIcon: {
    position: 'absolute',
    right: WP(3),
    padding: WP(1),
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
    fontSize: FS(2.3),
    fontWeight: '500',
    letterSpacing: 1,
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
});
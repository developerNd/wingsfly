import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CustomButton from '../../Components/CustomButton';
import { colors, routes } from '../../Helper/Contants';
import Logo from '../../assets/Images/brand.svg';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../supabase';

const Register = () => {
  const [username, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleSignup = async () => {
    if (!username || !email || !mobile || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          mobile: mobile,
        },
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Signup Failed', error.message);
    } else {
      Alert.alert(
        'Signup Success', 
        'Account created successfully! Please check your email for verification.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate(routes.LOGIN_SCREEN)
          }
        ]
      );
    }
  };

  return (
    <LinearGradient
      colors={['#94BCEB', '#D9DDDF', '#94BCEB']}
      start={{ x: 2, y: 0.01 }}
      end={{ x: 0.1, y: 1.3 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <Logo width={100} height={100} style={styles.logo} />
        <View style={styles.innerContainer}>
          <Text style={styles.signText}>Create an Account</Text>
          <Text style={styles.signsmallText}>
            Please fill in the details to sign up
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              value={username}
              onChangeText={setUserName}
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
              onChangeText={setMobile}
              placeholder="Mobile Number"
              keyboardType="phone-pad"
              style={styles.inputbox}
              editable={!loading}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              style={styles.inputbox}
              editable={!loading}
            />
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
    height: 100,
    width: 100,
    alignSelf: 'center',
    marginTop: 20,
  },
  innerContainer: {
    width: '80%',
    alignSelf: 'center',
    marginTop: 15,
  },
  signText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.Shadow,
    letterSpacing: 1,
  },
  signsmallText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
    color: 'gray',
  },
  inputContainer: {
    marginTop: 20,
  },
  inputbox: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    marginTop: 20,
    borderRadius: 8,
    paddingLeft: 15,
  },
  loginButton: {
    height: 50,
    backgroundColor: colors.Primary,
    marginTop: 30,
    borderRadius: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 1,
  },
  signupContainer: {
    marginTop: 25,
    alignSelf: 'center',
  },
  signupText: {
    fontSize: 14,
    color: colors.Shadow,
  },
  signupLink: {
    fontWeight: 'bold',
    color: colors.Primary,
  },
});
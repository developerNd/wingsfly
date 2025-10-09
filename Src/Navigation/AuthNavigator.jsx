import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, StatusBar } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import Logo from '../assets/Images/brand.svg';

const AuthNavigator = () => {
  const { user, loading, needsProfileSetup, isPasswordResetInProgress } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash || loading) {
    return (
      <View style={styles.container}>
        <StatusBar 
          backgroundColor="#FFFFFF" 
          barStyle="dark-content" 
          translucent={false}
        />
        <View style={styles.logoContainer}>
          <Logo width={50} height={50} style={styles.logo} />
          <Text style={styles.text}>Wingsfly</Text>
        </View>
      </View>
    );
  }

  // If no user, show auth stack
  if (!user) {
    return <AuthStack />;
  }

  // FIXED: If password reset is in progress, stay in AuthStack even if user exists
  if (isPasswordResetInProgress) {
    console.log('Password reset in progress - staying in AuthStack');
    return <AuthStack />;
  }

  // If user exists and profile setup is needed, show auth stack
  if (user && needsProfileSetup) {
    return <AuthStack />;
  }

  // If user exists, no profile setup needed, and no password reset in progress, show app
  if (user && !needsProfileSetup) {
    return <AppStack />;
  }

  // Fallback to auth stack
  return <AuthStack />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    height: 50,
    width: 50,
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default AuthNavigator;
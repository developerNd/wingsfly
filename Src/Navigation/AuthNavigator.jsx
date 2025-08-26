import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import Logo from '../assets/Images/brand.svg';

const AuthNavigator = () => {
  const { user, loading, needsProfileSetup } = useAuth();
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
        <View style={styles.logoContainer}>
          <Logo width={50} height={50} style={styles.logo} />
          <Text style={styles.text}>wingsfly</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return <AuthStack />;
  }

  if (user && !needsProfileSetup) {
    return <AppStack />;
  }

  if (user && needsProfileSetup) {
    return <AuthStack />;
  }

  return <AuthStack />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
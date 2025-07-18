import React, {useEffect} from 'react';
import {Image, Text, View, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {routes} from '../../Helper/Contants';
import Logo from '../../assets/Images/brand.svg';

const Splash = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace(routes.LOGIN_SCREEN);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
         <Logo width={100} height={100} style={styles.logo} />
        <Text style={styles.text}>wingsfly</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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

export default Splash;

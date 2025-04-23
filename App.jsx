import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppStack from './Src/Navigation/AppStack';
import AuthStack from './Src/Navigation/AuthStack';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from './Src/Context/AuthContect';
import AsyncStorage from '@react-native-async-storage/async-storage';



const EntryScreen = () => {
  let { login, setIslogin } = useAuth()

  const CheckUserToken = async () => {
    let login = await AsyncStorage.getItem('token');
    if (login !== null) {
      setIslogin(true);
    } else {
      setIslogin(false);
    }
  };

  useEffect(() => {
    CheckUserToken();
  }, []);


  return (
    <>
      <NavigationContainer>
        {login ? <AppStack></AppStack> : <AuthStack></AuthStack>}
      </NavigationContainer>
    </>
  );
};

const App = () => {
  return (
    <>
      <AuthProvider>
        <EntryScreen></EntryScreen>
        <Toast />
      </AuthProvider>
    </>
  );
};

export default App;

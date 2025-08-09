import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './Src/contexts/AuthContext';
import AuthNavigator from './Src/Navigation/AuthNavigator';

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
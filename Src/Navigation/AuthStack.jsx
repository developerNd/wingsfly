import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { routes } from '../Helper/Contants';
import { useAuth } from '../contexts/AuthContext';
import Login from '../Pages/Onboarding/Login';
import GenderSelection from '../Pages/Onboarding/GenderSelection';
import OnBoard from '../Pages/Onboarding/OnBoard';
import Register from '../Pages/Onboarding/Resister';
import AppStack from './AppStack';

const Stack = createNativeStackNavigator();

function AuthStack() {
  const { user, needsProfileSetup } = useAuth();
    
  const getInitialRoute = () => {
    if (user && needsProfileSetup) {
      return routes.GENDERSELECTION_SCREEN;
    }
    
    return routes.LOGIN_SCREEN;
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={getInitialRoute()}
    >
      <Stack.Screen name={routes.LOGIN_SCREEN} component={Login} />
      <Stack.Screen name={routes.SIGNUP_SCREEN} component={Register} />
      <Stack.Screen name={routes.GENDERSELECTION_SCREEN} component={GenderSelection} />
      <Stack.Screen name={routes.ONBOARD_SCREEN} component={OnBoard} />
      <Stack.Screen name="AppStack" component={AppStack} />
      
    </Stack.Navigator>
  );
}

export default AuthStack;
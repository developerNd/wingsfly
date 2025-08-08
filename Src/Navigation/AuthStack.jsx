import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { routes } from '../Helper/Contants';
import Login from '../Pages/Onboarding/Login';
import GenderSelection from '../Pages/Onboarding/GenderSelection';
import OnBoard from '../Pages/Onboarding/OnBoard';
import Register from '../Pages/Onboarding/Resister';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={routes.LOGIN_SCREEN}
    >
      <Stack.Screen name={routes.LOGIN_SCREEN} component={Login} />
      <Stack.Screen name={routes.SIGNUP_SCREEN} component={Register} />
      <Stack.Screen name={routes.GENDERSELECTION_SCREEN} component={GenderSelection} />
      <Stack.Screen name={routes.ONBOARD_SCREEN} component={OnBoard} />
    </Stack.Navigator>
  );
}

export default AuthStack;
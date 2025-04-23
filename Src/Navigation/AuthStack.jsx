import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Route } from '../Helper/Contants/Route';
import Splash from '../Pages/Onboarding/Splash';
import Login from '../Pages/Onboarding/Login';
import Verification from '../Pages/Onboarding/Otp/Verification';
import Signup from '../Pages/Onboarding/Signup';
import CompleteVerification from '../Pages/Onboarding/Otp/CompleteVerification';


const Stack = createNativeStackNavigator();

function AuthStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}>
            <Stack.Screen name={Route.SPLASH_SCREEN} component={Splash} />
            <Stack.Screen name={Route.LOGIN_SCREEN} component={Login} />
            <Stack.Screen name={Route.SIGNUP_SCREEN} component={Signup} />
            <Stack.Screen name={Route.OTPVERIFICATION_SCREEN} component={Verification} />
            <Stack.Screen name={Route.CONFORM_SCREEN} component={CompleteVerification} />
        </Stack.Navigator>
    );
}

export default AuthStack;

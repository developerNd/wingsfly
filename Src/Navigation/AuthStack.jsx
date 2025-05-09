import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { routes } from '../Helper/Contants';
import Splash from '../Pages/Onboarding/Splash';
import Login from '../Pages/Onboarding/Login';
import GenderSelection from '../Pages/Onboarding/GenderSelection';
import OnBoard from '../Pages/Onboarding/OnBoard';
import Resister from '../Pages/Onboarding/Resister';
import Task from '../Pages/Onboarding/Task';

const Stack = createNativeStackNavigator();

function AuthStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}>
            <Stack.Screen name={routes.SPLASH_SCREEN} component={Splash} />
            <Stack.Screen name={routes.LOGIN_SCREEN} component={Login} />
            <Stack.Screen name={routes.SIGNUP_SCREEN} component={Resister} />
            <Stack.Screen
                name={routes.GENDERSELECTION_SCREEN}
                component={GenderSelection}
            />
            <Stack.Screen name={routes.ONBOARD_SCREEN} component={OnBoard} />
            <Stack.Screen name={routes.TASKSLECTION_SCREEN} component={Task} />
        </Stack.Navigator>
    );
}

export default AuthStack;

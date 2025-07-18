import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { routes } from '../Helper/Contants';
import Home from '../Pages/Home/Home';
import CateogerySelection from '../Pages/Home/CateogerySelection';
import EvaluateProgress from "../Pages/PlanYourDay/Habit/Step1/EvaluateProgress";
import BottomTabNavigator from './BottomTabBar';


const Stack = createNativeStackNavigator();

function AppStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}>
            <Stack.Screen name={routes.BOTTOM_TAB} component={BottomTabNavigator} />
            <Stack.Screen name={routes.CATEOGEYSELECTION_SCREEN} component={CateogerySelection} />
            <Stack.Screen name={routes.EVALUATEPROGRESS_SCREEN} component={EvaluateProgress} />

        </Stack.Navigator>
    );
}

export default AppStack;

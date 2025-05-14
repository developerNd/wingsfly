import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { routes } from '../Helper/Contants';
import Home from '../Pages/Home/Home';
import CateogerySelection from '../Pages/Home/CateogerySelection';


const Stack = createNativeStackNavigator();

function AppStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}>
            <Stack.Screen name={routes.HOME_SCREEN} component={Home} />
            <Stack.Screen name={routes.CATEOGEYSELECTION_SCREEN} component={CateogerySelection} />

        </Stack.Navigator>
    );
}

export default AppStack;

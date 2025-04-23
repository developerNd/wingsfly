import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Bottomtab from './BottomTab';
import { Route } from '../Helper/Contants/Route';


const Stack = createNativeStackNavigator();

const AppStack = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}>
            <Stack.Screen
                name={Route.BOTTOM_TAB}
                component={Bottomtab}
            />

        </Stack.Navigator>
    );
};

export default AppStack;

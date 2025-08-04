import * as React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {routes} from '../Helper/Contants';
import Splash from '../Pages/Onboarding/Splash';
import Login from '../Pages/Onboarding/Login';
import GenderSelection from '../Pages/Onboarding/GenderSelection';
import OnBoard from '../Pages/Onboarding/OnBoard';
import Resister from '../Pages/Onboarding/Resister';
import Task from '../Pages/Onboarding/Task';
import CategoryScreen from '../Pages/LongTermScreens/CategoryScreen';
import AddGoalScreen from '../Pages/LongTermScreens/AddGoalScreen';
import SetLongTermGoal from '../Pages/LongTermScreens/SetGoalScreen';
import MindMapScreen from '../Pages/LongTermScreens/MindMapScreen';
import LandingPage from '../Pages/LongTermScreens/LandingScreen';
import AppStack from './AppStack';

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

      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="GoalScreen" component={AddGoalScreen} />
      <Stack.Screen name="SetGoalScreen" component={SetLongTermGoal} />
      <Stack.Screen name="MindMapScreen" component={MindMapScreen} />
      <Stack.Screen name="LandingPage" component={LandingPage} />
      <Stack.Screen name="AppStack" component={AppStack} />
      
    </Stack.Navigator>
  );
}

export default AuthStack;

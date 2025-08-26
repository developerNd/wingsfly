import * as React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {routes} from '../Helper/Contants';

import CateogerySelection from '../Pages/Home/CateogerySelection';
import EvaluateProgress from '../Pages/Home/EvaluateProgress';
import BottomTabNavigator from './BottomTabBar';

// Habit screens
import TimerScreen from '../Pages/PlanYourDay/Habit/TimerScreens/TimerScreen1';
import FrequencyScreen from '../Pages/PlanYourDay/Habit/TimerScreens/TimerScreen2';
import SchedulePreference from '../Pages/PlanYourDay/Habit/TimerScreens/TimerScreen3';
import LinkGoal from '../Pages/PlanYourDay/Habit/TimerScreens/LinkGoal';
import ChecklistScreen from '../Pages/PlanYourDay/Habit/ChecklistScreens/ChecklistScreen';
import NumericScreen from '../Pages/PlanYourDay/Habit/NumericScreens/NumericScreen';
import YesorNoScreen from '../Pages/PlanYourDay/Habit/YesorNoScreens/YesorNoScreen';

// Recurring Task screens
import RecurringYesorNoScreen from '../Pages/PlanYourDay/Recurring/RecurringYesorNoScreen';
import RecurringChecklistScreen from '../Pages/PlanYourDay/Recurring/RecurringChecklistScreen';
import RecurringTimerScreen from '../Pages/PlanYourDay/Recurring/RecurringTimerScreen';
import RecurringNumericScreen from '../Pages/PlanYourDay/Recurring/RecurringNumericScreen';

// Goal Task screens
import GoalScreen from '../Pages/PlanYourDay/Goal/GoalScreen';

// Onboarding screens that should be accessible after login
import Task from '../Pages/Onboarding/Task';
import CategoryScreen from '../Pages/LongTermScreens/CategoryScreen';
import AddGoalScreen from '../Pages/LongTermScreens/AddGoalScreen';
import SetLongTermGoal from '../Pages/LongTermScreens/SetGoalScreen';
import MindMapScreen from '../Pages/LongTermScreens/MindMapScreen';
import LandingPage from '../Pages/LongTermScreens/LandingScreen';

//Checklist screens
import TaskEvaluationScreen from '../Pages/ChecklistScreens/TaskEvaluationScreen';
import SortingScreen from '../Pages/ChecklistScreens/SortingScreen';

//Pomodoro Timer & Settings Screens
import PomoScreen from '../Pages/PomodoroScreens/PomoScreen';
import PomodoroTimerScreen from '../Pages/PomodoroScreens/PomodoroScreen';
import PomodoroSettings from '../Pages/PomodoroScreens/PomodoroSettings';

import AppBlockerScreen from '../Pages/SettingsScreens/AppBlockerScreen';

const Stack = createNativeStackNavigator();

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={routes.TASKSLECTION_SCREEN}>
      {/* Initial screen after login */}
      <Stack.Screen name={routes.TASKSLECTION_SCREEN} component={Task} />

      {/* Long-term goal setup screens */}
      <Stack.Screen name="CategoryLongTerm" component={CategoryScreen} />
      <Stack.Screen name="GoalScreen" component={AddGoalScreen} />
      <Stack.Screen name="SetGoalScreen" component={SetLongTermGoal} />
      <Stack.Screen name="MindMapScreen" component={MindMapScreen} />
      <Stack.Screen name="LandingPage" component={LandingPage} />

      {/* Main app navigation */}
      <Stack.Screen name="BottomTab" component={BottomTabNavigator} />
      <Stack.Screen name="CategorySelection" component={CateogerySelection} />
      <Stack.Screen name="EvaluateProgress" component={EvaluateProgress} />

      {/* HABIT FLOW SCREENS */}
      <Stack.Screen name="TimerScreen" component={TimerScreen} />
      <Stack.Screen name="FrequencyScreen" component={FrequencyScreen} />
      <Stack.Screen name="SchedulePreference" component={SchedulePreference} />
      <Stack.Screen name="LinkGoal" component={LinkGoal} />
      <Stack.Screen name="ChecklistScreen" component={ChecklistScreen} />
      <Stack.Screen name="NumericScreen" component={NumericScreen} />
      <Stack.Screen name="YesorNoScreen" component={YesorNoScreen} />

      {/* RECURRING TASK FLOW SCREENS */}
      <Stack.Screen
        name="RecurringYesorNoScreen"
        component={RecurringYesorNoScreen}
      />
      <Stack.Screen
        name="RecurringChecklistScreen"
        component={RecurringChecklistScreen}
      />
      <Stack.Screen
        name="RecurringTimerScreen"
        component={RecurringTimerScreen}
      />
      <Stack.Screen
        name="RecurringNumericScreen"
        component={RecurringNumericScreen}
      />

      {/* Goal TASK FLOW SCREEN */}
      <Stack.Screen name="GoalTaskScreen" component={GoalScreen} />

      {/* CheckList FLOW SCREENS */}
      <Stack.Screen
        name="TaskEvaluation"
        component={TaskEvaluationScreen}
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          cardStyle: {backgroundColor: 'transparent'},
          cardOverlayEnabled: true,
          animationTypeForReplace: 'push',
        }}
      />
      <Stack.Screen name="SortingScreen" component={SortingScreen} />

      {/* Pomodoro Timer & Settings Screen */}
      <Stack.Screen
        name="PomodoroTimerScreen"
        component={PomodoroTimerScreen}
      />
      <Stack.Screen name="PomodoroSettings" component={PomodoroSettings} />

      <Stack.Screen name="AppBlockerScreen" component={AppBlockerScreen} />

      <Stack.Screen name="PomoScreen" component={PomoScreen} />
    </Stack.Navigator>
  );
}

export default AppStack;

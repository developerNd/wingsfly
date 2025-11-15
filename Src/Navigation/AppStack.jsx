import * as React from 'react';
import {View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {routes} from '../Helper/Contants';
import {useAuth} from '../contexts/AuthContext';

// Import Notes Components
import NotesButton from '../Components/NotesButton';
import NotesModal from '../Components/NotesModal';

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
import TimerTrackerScreen from '../Pages/PlanYourDay/Habit/TimerTracker/TimerTrackerScreen';

// Recurring Task screens
import RecurringYesorNoScreen from '../Pages/PlanYourDay/Recurring/RecurringYesorNoScreen';
import RecurringChecklistScreen from '../Pages/PlanYourDay/Recurring/RecurringChecklistScreen';
import RecurringTimerScreen from '../Pages/PlanYourDay/Recurring/RecurringTimerScreen';
import RecurringNumericScreen from '../Pages/PlanYourDay/Recurring/RecurringNumericScreen';

// Goal Task screens
import TaskScreen from '../Pages/PlanYourDay/Task/TaskScreen';
import TaskChecklistScreen from '../Pages/PlanYourDay/Task/TaskChecklistScreen';

// Challenge Task screens
import ChallengeScreen from '../Pages/PlanYourDay/Challenge/ChallengeScreen';
import EditChallengeScreen from '../Pages/PlanYourDay/Challenge/EditChallengeScreen';
import ChallengeDetailScreen from '../Pages/ChallengesScreen/ChallengeDetailScreen';

import CreateChallengeScreen from '../Pages/PlanYourDay/ChallengeLock/CreateChallengeScreen';
import LockChallengesScreen from '../Pages/LockChallengesScreen/LockChallengesScreen';
import LockChallengeDetailScreen from '../Pages/LockChallengesScreen/LockChallengeDetailScreen';

// Plan Your Day Task screens
import PlanYourDayScreen from '../Pages/PlanYourDay/Plan/PlanYourDayScreen';
import PlanScreen from '../Pages/PlanYourDay/Plan/PlanScreen';
import PlanTimerTrackerScreen from '../Pages/PlanYourDay/Plan/PlanTimerTrackerScreen';
import PlanChecklistScreen from '../Pages/PlanYourDay/Plan/PlanChecklistScreen';
import EditPlanTimerTrackerScreen from '../Pages/PlanYourDay/Plan/EditPlanTimerTrackerScreen';
import EditPlanScreen from '../Pages/PlanYourDay/Plan/EditPlanScreen';

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
import PomodoroSettings from '../Pages/PomodoroScreens/PomodoroSettings';
import AchievementScreen from '../Pages/PomodoroScreens/AchievementScreen';
import PomoTrackerScreen from '../Pages/PomodoroScreens/PomoTrackerScreen';

import AppBlockerScreen from '../Pages/SettingsScreens/AppBlockerScreen';
import AppUsageScreen from '../Pages/SettingsScreens/AppUsageScreen';
import AlarmScreen from '../Pages/SettingsScreens/AlarmScreen';
import CreateAlarmScreen from '../Pages/SettingsScreens/CreateAlarmScreen';
import VoiceCommandListScreen from '../Pages/SettingsScreens/VoiceCommandListScreen';
import CreateVoiceCommandScreen from '../Pages/SettingsScreens/CreateVoiceCommandScreen';
import DigitalDetoxScreen from '../Pages/SettingsScreens/DigitalDetoxScreen';
import GetBackScreen from '../Pages/SettingsScreens/GetBackScreen';
import GetBackConfirmationScreen from '../Pages/SettingsScreens/GetBackConfirmationScreen';
import DateReminderSettingsScreen from '../Pages/SettingsScreens/DateReminderSettingsScreen';
import YouTubeVideosScreen from '../Pages/SettingsScreens/YouTubeVideosScreen';
import YouTubeIntegrationScreen from '../Pages/SettingsScreens/YouTubeIntegrationScreen';
import NightRoutineScreen from '../Pages/SettingsScreens/NightRoutineScreen';
import FullScreenAudioPlay from '../Pages/SettingsScreens/FullScreenAudioPlay';
import FullScreenVideoPlayer from '../Pages/SettingsScreens/FullScreenVideoPlayer';
import MorningVideosScreen from '../Pages/SettingsScreens/MorningVideosScreen';
import LeaderboardScreen from '../Pages/SettingsScreens/LeaderboardScreen';

const Stack = createNativeStackNavigator();

// Wrapper component that adds NotesButton to every screen
const ScreenWithNotes = ({children}) => {
  return (
    <View style={{flex: 1}}>
      {children}
      <NotesButton />
    </View>
  );
};

function AppStack({route}) {
  const {getSelectedGender} = useAuth();

  // Extract initial params from AuthStack navigation
  const initialParams = route?.params;

  // Create a default params object with gender from context
  const defaultParams = {
    selectedGender: getSelectedGender(),
    ...initialParams,
  };

  console.log('AppStack received params:', initialParams);
  console.log('AppStack using params:', defaultParams);

  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={routes.TASKSLECTION_SCREEN}>
        {/* Wrap each screen with ScreenWithNotes */}
        <Stack.Screen name={routes.TASKSLECTION_SCREEN}>
          {props => (
            <ScreenWithNotes>
              <Task {...props} initialParams={defaultParams} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        {/* Long-term goal setup screens */}
        <Stack.Screen name="CategoryLongTerm">
          {props => (
            <ScreenWithNotes>
              <CategoryScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="GoalScreen">
          {props => (
            <ScreenWithNotes>
              <AddGoalScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="SetGoalScreen">
          {props => (
            <ScreenWithNotes>
              <SetLongTermGoal {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="MindMapScreen">
          {props => (
            <ScreenWithNotes>
              <MindMapScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="LandingPage">
          {props => (
            <ScreenWithNotes>
              <LandingPage {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        {/* Main app navigation - BottomTab has its own NotesButton wrapping */}
        <Stack.Screen name="BottomTab" component={BottomTabNavigator} />

        <Stack.Screen name="CategorySelection">
          {props => (
            <ScreenWithNotes>
              <CateogerySelection {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="EvaluateProgress">
          {props => (
            <ScreenWithNotes>
              <EvaluateProgress {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        {/* HABIT FLOW SCREENS */}
        <Stack.Screen name="TimerScreen">
          {props => (
            <ScreenWithNotes>
              <TimerScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="FrequencyScreen">
          {props => (
            <ScreenWithNotes>
              <FrequencyScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="SchedulePreference">
          {props => (
            <ScreenWithNotes>
              <SchedulePreference {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="LinkGoal">
          {props => (
            <ScreenWithNotes>
              <LinkGoal {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="ChecklistScreen">
          {props => (
            <ScreenWithNotes>
              <ChecklistScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="NumericScreen">
          {props => (
            <ScreenWithNotes>
              <NumericScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="YesorNoScreen">
          {props => (
            <ScreenWithNotes>
              <YesorNoScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="TimerTrackerScreen">
          {props => (
            <ScreenWithNotes>
              <TimerTrackerScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        {/* RECURRING TASK FLOW SCREENS */}
        <Stack.Screen name="RecurringYesorNoScreen">
          {props => (
            <ScreenWithNotes>
              <RecurringYesorNoScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="RecurringChecklistScreen">
          {props => (
            <ScreenWithNotes>
              <RecurringChecklistScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="RecurringTimerScreen">
          {props => (
            <ScreenWithNotes>
              <RecurringTimerScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="RecurringNumericScreen">
          {props => (
            <ScreenWithNotes>
              <RecurringNumericScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        {/*TASK FLOW SCREEN */}
        <Stack.Screen name="TaskScreen">
          {props => (
            <ScreenWithNotes>
              <TaskScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="TaskChecklistScreen">
          {props => (
            <ScreenWithNotes>
              <TaskChecklistScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        {/* Challenge TASK FLOW SCREEN */}
        <Stack.Screen name="ChallengeScreen">
          {props => (
            <ScreenWithNotes>
              <ChallengeScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="EditChallengeScreen">
          {props => (
            <ScreenWithNotes>
              <EditChallengeScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="ChallengeDetailScreen">
          {props => (
            <ScreenWithNotes>
              <ChallengeDetailScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="CreateChallengeScreen">
          {props => (
            <ScreenWithNotes>
              <CreateChallengeScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="LockChallengesScreen">
          {props => (
            <ScreenWithNotes>
              <LockChallengesScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="LockChallengeDetailScreen">
          {props => (
            <ScreenWithNotes>
              <LockChallengeDetailScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        {/* Plan Your Day TASK FLOW SCREEN */}
        <Stack.Screen name="PlanYourDayScreen">
          {props => (
            <ScreenWithNotes>
              <PlanYourDayScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="PlanScreen">
          {props => (
            <ScreenWithNotes>
              <PlanScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="PlanTimerTrackerScreen">
          {props => (
            <ScreenWithNotes>
              <PlanTimerTrackerScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="PlanChecklistScreen">
          {props => (
            <ScreenWithNotes>
              <PlanChecklistScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="EditPlanTimerTrackerScreen">
          {props => (
            <ScreenWithNotes>
              <EditPlanTimerTrackerScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="EditPlanScreen">
          {props => (
            <ScreenWithNotes>
              <EditPlanScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        {/* CheckList FLOW SCREENS */}
        <Stack.Screen
          name="TaskEvaluation"
          options={{
            presentation: 'transparentModal',
            headerShown: false,
            cardStyle: {backgroundColor: 'transparent'},
            cardOverlayEnabled: true,
            animationTypeForReplace: 'push',
          }}>
          {props => (
            <ScreenWithNotes>
              <TaskEvaluationScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="SortingScreen">
          {props => (
            <ScreenWithNotes>
              <SortingScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        {/* Pomodoro Timer & Settings Screen */}
        <Stack.Screen name="PomodoroSettings">
          {props => (
            <ScreenWithNotes>
              <PomodoroSettings {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="PomoTrackerScreen">
          {props => (
            <ScreenWithNotes>
              <PomoTrackerScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="AppBlockerScreen">
          {props => (
            <ScreenWithNotes>
              <AppBlockerScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="AppUsageScreen">
          {props => (
            <ScreenWithNotes>
              <AppUsageScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="AlarmScreen">
          {props => (
            <ScreenWithNotes>
              <AlarmScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="CreateAlarmScreen">
          {props => (
            <ScreenWithNotes>
              <CreateAlarmScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="CreateVoiceCommandScreen">
          {props => (
            <ScreenWithNotes>
              <CreateVoiceCommandScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="VoiceCommandListScreen">
          {props => (
            <ScreenWithNotes>
              <VoiceCommandListScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="DigitalDetoxScreen">
          {props => (
            <ScreenWithNotes>
              <DigitalDetoxScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="GetBackScreen">
          {props => (
            <ScreenWithNotes>
              <GetBackScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="GetBackConfirmationScreen">
          {props => (
            <ScreenWithNotes>
              <GetBackConfirmationScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="DateReminderSettingsScreen">
          {props => (
            <ScreenWithNotes>
              <DateReminderSettingsScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="YouTubeVideosScreen">
          {props => (
            <ScreenWithNotes>
              <YouTubeVideosScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="YouTubeIntegrationScreen">
          {props => (
            <ScreenWithNotes>
              <YouTubeIntegrationScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="NightRoutineScreen">
          {props => (
            <ScreenWithNotes>
              <NightRoutineScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="MorningVideosScreen">
          {props => (
            <ScreenWithNotes>
              <MorningVideosScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="FullScreenAudioPlayer">
          {props => (
            <ScreenWithNotes>
              <FullScreenAudioPlay {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="FullScreenVideoPlayer">
          {props => (
            <ScreenWithNotes>
              <FullScreenVideoPlayer {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="LeaderboardScreen">
          {props => (
            <ScreenWithNotes>
              <LeaderboardScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="PomoScreen">
          {props => (
            <ScreenWithNotes>
              <PomoScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>

        <Stack.Screen name="AchievementScreen">
          {props => (
            <ScreenWithNotes>
              <AchievementScreen {...props} />
            </ScreenWithNotes>
          )}
        </Stack.Screen>
      </Stack.Navigator>

      {/* SINGLE NotesModal - Rendered ONCE at the top level */}
      <NotesModal />
    </>
  );
}

export default AppStack;

import React from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Home from '../Pages/Home/Home';
import PlannerScreen from '../Pages/Planner/PlannerScreen';
import SettingsScreen from '../Pages/SettingsScreens/SettingsScreen';
import TaskAnalyticsScreen from '../Pages/AnalysisScreens/AnalysisScreen';
import ChallengesScreen from '../Pages/ChallengesScreen/ChallengesTab';
import {Icons, colors} from '../Helper/Contants';

// Import ONLY NotesButton (NotesModal is rendered in AppStack)
import NotesButton from '../Components/NotesButton';

const Tab = createBottomTabNavigator();

// Wrapper component that adds NotesButton to every tab screen
const ScreenWithNotes = ({children}) => {
  return (
    <View style={{flex: 1}}>
      {children}
      <NotesButton />
    </View>
  );
};

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color}) => {
          let iconSource;

          switch (route.name) {
            case 'Home':
              iconSource = Icons.Home;
              break;
            case 'Planner':
              iconSource = Icons.Planner;
              break;
            case 'Analysis':
              iconSource = Icons.Analysis;
              break;
            case 'Uplift':
              iconSource = Icons.Uplift;
              break;
            case 'Settings':
              iconSource = Icons.Settings;
              break;
            default:
              iconSource = Icons.Home;
          }

          return (
            <Image
              source={iconSource}
              style={[
                styles.tabIcon,
                {
                  width: 30,
                  height: 30,
                  tintColor: color,
                },
              ]}
              resizeMode="contain"
            />
          );
        },
        tabBarActiveTintColor: colors.Black,
        tabBarInactiveTintColor: '#aba8a8',
        tabBarStyle: {
          backgroundColor: '#F7F7F7',
          height: 75,
          paddingTop: 7,
          paddingBottom: 5,
          marginRight: -9,
          marginLeft: -12,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '400',
          marginTop: 1,
        },
        headerShown: false,
      })}>
      <Tab.Screen name="Home">
        {(props) => (
          <ScreenWithNotes>
            <Home {...props} />
          </ScreenWithNotes>
        )}
      </Tab.Screen>

      <Tab.Screen name="Planner">
        {(props) => (
          <ScreenWithNotes>
            <PlannerScreen {...props} />
          </ScreenWithNotes>
        )}
      </Tab.Screen>

      <Tab.Screen name="Analysis">
        {(props) => (
          <ScreenWithNotes>
            <TaskAnalyticsScreen {...props} />
          </ScreenWithNotes>
        )}
      </Tab.Screen>

      <Tab.Screen name="Uplift">
        {(props) => (
          <ScreenWithNotes>
            <ChallengesScreen {...props} />
          </ScreenWithNotes>
        )}
      </Tab.Screen>

      <Tab.Screen name="Settings">
        {(props) => (
          <ScreenWithNotes>
            <SettingsScreen {...props} />
          </ScreenWithNotes>
        )}
      </Tab.Screen>
    </Tab.Navigator>
    // NO NotesModal HERE - It's rendered once in AppStack
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
  },
});

export default BottomTabNavigator;
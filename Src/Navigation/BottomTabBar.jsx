import React from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Home from '../Pages/Home/Home';
import {Icons, colors} from '../Helper/Contants';

const Tab = createBottomTabNavigator();

// Placeholder screens
const PlaceholderScreen = ({screenName}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{screenName}</Text>
      <Text style={styles.subtitle}>Coming Soon</Text>
    </View>
  );
};

const PlannerScreen = () => <PlaceholderScreen screenName="Planner" />;
const AnalysisScreen = () => <PlaceholderScreen screenName="Analysis" />;
const UpliftScreen = () => <PlaceholderScreen screenName="Uplift" />;
const SettingsScreen = () => <PlaceholderScreen screenName="Settings" />;

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
        tabBarInactiveTintColor: '#666666',
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
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Planner" component={PlannerScreen} />
      <Tab.Screen name="Analysis" component={AnalysisScreen} />
      <Tab.Screen name="Uplift" component={UpliftScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
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

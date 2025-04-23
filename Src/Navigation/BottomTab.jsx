import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Route } from '../Helper/Contants/Route';

// Screens
import Home from '../Pages/Home/Home';
import Earning from '../Pages/Earning/Earning';
import Performance from '../Pages/Performance/Performance';
import Jobs from '../Pages/Jobs/Jobs';
import Awards from '../Pages/Awards/Awards';
import Leaderboard from '../Pages/Leaderboard/Leaderboard';

// Icons
import HomeIcon from 'react-native-vector-icons/AntDesign';
import EarningIcon from 'react-native-vector-icons/FontAwesome';
import JobIcon from 'react-native-vector-icons/Ionicons';
import AwardsIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import TrophyIcon from 'react-native-vector-icons/FontAwesome5';
import PerformanceIcon from 'react-native-vector-icons/Fontisto';

const Tab = createBottomTabNavigator();

const Bottomtab = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: '#fff',
                    height: 50,
                },
            }}
        >
            <Tab.Screen
                name={Route.HOME_SCREEN}
                component={Home}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.iconWrapper}>
                            <HomeIcon name="home" size={24} color={focused ? '#3366FF' : '#000'} />
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name={Route.EARNING_SCREEN}
                component={Earning}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.iconWrapper}>
                            <EarningIcon name="rupee" size={24} color={focused ? '#3366FF' : '#000'} />
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name={Route.PERFORMANCE_SCREEN}
                component={Performance}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.iconWrapper}>
                            <PerformanceIcon name="heartbeat" size={22} color={focused ? '#3366FF' : '#000'} />
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name={Route.JOBS_SCREEN}
                component={Jobs}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.iconWrapper}>
                            <JobIcon name="bag-handle" size={24} color={focused ? '#3366FF' : '#000'} />
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name={Route.LEADERBOARD_SCREEN}
                component={Leaderboard}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.iconWrapper}>
                            <AwardsIcon name="medal-outline" size={24} color={focused ? '#3366FF' : '#000'} />
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name={Route.AWARDS_SCREEN}
                component={Awards}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.iconWrapper}>
                            <TrophyIcon name="trophy" size={22} color={focused ? '#3366FF' : '#000'} />
                        </View>
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

export default Bottomtab;

const styles = {
    iconWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
};

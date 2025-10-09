import React from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { colors, Icons } from '../../Helper/Contants';
import Headers from '../../Components/Headers';
import { useNavigation, useRoute } from '@react-navigation/native';
import { HP, WP, FS } from '../../utils/dimentions';
import { useAuth } from '../../contexts/AuthContext';

const TaskCard = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { getSelectedGender } = useAuth();

    // Use context as primary source, route params as fallback
    const selectedGender = 
        route.params?.selectedGender || 
        getSelectedGender();

    console.log('=== TaskCard Debug ===');
    console.log('Route params:', route.params);
    console.log('Selected gender:', selectedGender);
    console.log('Context gender:', getSelectedGender());
    
    const getTaskImages = () => {
        console.log('Getting task images for gender:', selectedGender);
        
        if (selectedGender === 'Female') {
            console.log('Returning female images');
            return {
                task1: Icons.WomenTask1, 
                task2: Icons.WomenTask3,
                task3: Icons.WomenTask2,
            };
        } else {
            console.log('Returning male images');
            return {
                task1: Icons.Task1, 
                task2: Icons.Task2,
                task3: Icons.Task3,
            };
        }
    };

    const taskImages = getTaskImages();
    console.log('Task images being used:', taskImages);

    // Navigation handlers - pass selectedGender to all navigation calls
    const handleLongTermGoalPress = () => {
        navigation.navigate('CategoryLongTerm', {
            goalType: 'longTerm',
            selectedGender: selectedGender
        });
    };

    const handleRecurringGoalPress = () => {
        navigation.navigate('BottomTab', {
            selectedGender: selectedGender
        });
    };

    const handlePlanYourDayPress = () => {
        navigation.navigate('BottomTab', {
            selectedGender: selectedGender
        });
    };

    const handleCustomGoalPress = () => {
        navigation.navigate('CustomGoal', {
            selectedGender: selectedGender
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
            <View style={styles.headerWrapper}>
                <Headers></Headers>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.contentWrapper}>
                    {/* Long-Term Goal Card */}
                    <TouchableOpacity onPress={handleLongTermGoalPress} activeOpacity={0.8}>
                        <ImageBackground
                            style={styles.image}
                            source={taskImages.task1}
                            imageStyle={{ borderRadius: WP(3) }}
                        >
                            <View style={styles.button}>
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardTitle1}>Set Long-Term Goal</Text>
                                    <Text style={styles.cardDescription1}>Define your target, identity milestones, and create an action plan</Text>
                                </View>
                            </View>
                        </ImageBackground>
                    </TouchableOpacity>

                    {/* Recurring Goal Card */}
                    <TouchableOpacity onPress={handleRecurringGoalPress} activeOpacity={0.8}>
                        <ImageBackground
                            style={styles.image}
                            source={taskImages.task3}
                            imageStyle={{ borderRadius: WP(3) }}
                        >
                            <View style={styles.button}>
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardTitle}>Set Recurring Goal</Text>
                                    <Text style={styles.cardDescription}>Create a routine and set schedule</Text>
                                </View>
                            </View>
                        </ImageBackground>
                    </TouchableOpacity>

                    {/* Plan Your Day Card */}
                    <TouchableOpacity onPress={handlePlanYourDayPress} activeOpacity={0.8}>
                        <ImageBackground
                            style={styles.image}
                            source={taskImages.task2}
                            imageStyle={{ borderRadius: WP(3) }}
                        >
                            <View style={styles.button}>
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardTitle}>Plan Your Day</Text>
                                    <Text style={styles.cardDescription}>Create Today's To Do List</Text>
                                </View>
                            </View>
                        </ImageBackground>
                    </TouchableOpacity>

                    {/* Custom Goals Card */}
                    <View style={styles.customGoalWrapper}>
                        <TouchableOpacity onPress={handleCustomGoalPress} activeOpacity={0.8}>
                            <View style={styles.button}>
                                <View style={styles.cardContent1}>
                                    <Text style={styles.cardTitle1}>Custom Goals</Text>
                                    <Text style={styles.cardDescription1}>Set personalized targets tailored to your needs</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default TaskCard;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.White
    },
    headerWrapper: {
        marginTop: HP(2.2),
    },
    contentWrapper: {
        marginTop: HP(5),
        width: "89%",
        alignSelf: "center",
    },
    image: {
        height: HP(22),
        justifyContent: 'flex-end',
        padding: WP(4),
        marginBottom: HP(2.55),
    },
    button: {
        backgroundColor: colors.Primary,
        borderTopLeftRadius: WP(2),
        borderTopRightRadius: WP(2),
        height: HP(5.45),
        width: "113%",
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.9,
        marginTop: HP(2.5),
        position: "relative",
        top: HP(2),
        marginLeft: WP(-5)
    },
    cardContent: {
        width: "96%",
        height: HP(8.1),
        backgroundColor: colors.White,
        position: "absolute",
        bottom: HP(0.8),
        borderBottomLeftRadius: WP(2),
        borderBottomRightRadius: WP(2),
        paddingTop: HP(0.6),
        paddingHorizontal: WP(2),
    },
    cardTitle: {
        fontSize: FS(1.8),
        textAlign: "center",
        marginTop: HP(-0.1),
        fontFamily: 'Inter-SemiBold',
        color: colors.Black,
        marginBottom: HP(1.05),
    },
    cardDescription: {
        textAlign: "center",
        fontSize: FS(1.6),
        width: "80%",
        alignSelf: "center",
        marginTop: HP(0.5),
        fontFamily: 'Inter-Medium',
        color: colors.Black,
        lineHeight: FS(2),
    },
    cardTitle1: {
        fontSize: FS(1.75),
        textAlign: "center",
        marginTop: HP(-0.1),
        fontFamily: 'Inter-SemiBold',
        color: colors.Black,
        marginBottom: HP(0.8),
    },
    cardDescription1: {
        textAlign: "center",
        fontSize: FS(1.6),
        width: "80%",
        alignSelf: "center",
        fontFamily: 'Inter-Medium',
        color: "#211E1E",
        lineHeight: FS(2),
    },
    customGoalWrapper: {
        width: "90.5%",
        alignSelf: "center",
        marginTop: HP(0.8),
    },
    cardContent1: {
        width: "96%",
        height: HP(8.1),
        backgroundColor: "#F2F2F9",
        position: "absolute",
        bottom: HP(0.8),
        borderRadius: WP(2.5),
        paddingTop: HP(0.6),
        paddingHorizontal: WP(2),
    },
});
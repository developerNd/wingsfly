import React, { useState } from "react";
import {
    Text,
    View,
    StyleSheet,
    FlatList,
    Pressable,
    StatusBar,
    Image
} from "react-native";
import Logo from "../../assets/Images/brand.svg";
import PlusIcon from "react-native-vector-icons/AntDesign";
import Calender from "../../Components/Calender";
import { colors, routes } from "../../Helper/Contants";
import Modal from "react-native-modal";
import TaskCard from "../../Components/TaskCard";
import ModalTaskCard from "../../Components/ModalTaskCard";
import { useNavigation } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/MaterialIcons';

const tasks = [
    {
        id: "1",
        title: "Schedule a meeting with Harshit Sir",
        time: "09:00 AM",
        timeColor: "#E4EBF3",
        tags: ["Habit", "Must"],
        image: require("../../assets/Images/taskhome.png"),
        hasFlag: true, 
    },
    {
        id: "2",
        title: "2.5 Hours Simran and Meditation",
        time: "09:00 AM",
        timeColor: "#F1E3F1", 
        tags: ["Habit", "Must"],
        image: require("../../assets/Images/yogo.png"),
        hasFlag: true, 
    },
    {
        id: "3",
        title: "Save 200 Rupees Daily",
        time: "12:00 PM",
        timeColor: "#F8F5E3", 
        tags: ["Habit", "Must"],
        image: require("../../assets/Images/walk.png"),
        hasFlag: true, 
    },
    {
        id: "4",
        title: "Walk 10k Step Daily",
        time: "07:00 AM",
        timeColor: "#E7F2E7", 
        progress: "12/31", 
        tags: ["Habit", "Important"],
        image: require("../../assets/Images/money.png"),
        hasFlag: true, 
    },
    {
        id: "5",
        title: "Buy Sunflower for Mumma",
        time: "11:00 AM",
        timeColor: "#FEF0E7", 
        progress: "0/1", 
        tags: ["Task", "Important"],
        image: require("../../assets/Images/task5.png"),
        hasFlag: true, 
    },
    {
        id: "6",
        title: "Make Mandala and Colour Daily",
        time: "09:30 PM",
        timeColor: "#E3EFED", 
        progress: "12/30",
        tags: ["Task", "Important"],
        image: require("../../assets/Images/task6.png"),
        hasFlag: true,
    },
];

const Home = () => {
    const [checkboxStates, setCheckboxStates] = useState({});
    const [isModalVisible, setModalVisible] = useState(false);

    const navigation = useNavigation()

    const modaltasks = [
        {
            id: "1",
            Heading:"Habit",
            title: "Activity that repeats over time it has detailed tracking and statistics.",
            image: require("../../assets/Images/habit.png"),
            navigation: () => navigation.navigate(routes.CATEOGEYSELECTION_SCREEN),
        },
        {
            id: "2",
            Heading:"Recurring Task",
            title: "Activity that repeats over time it has detailed tracking and statistics.",
            image: require("../../assets/Images/recurring.png"),
            //  navigation: () => navigation.navigate(routes.RECURRING_TASK_SCREEN),
        },
        {
            id: "3",
            Heading:"Task",
            title: "Single instance activity without tracking over time.",
            image: require("../../assets/Images/task.png"),
            //  navigation: () => navigation.navigate(routes.TASK_SCREEN),
        },
        {
            id: "4",
            Heading:"Goal of the Day",
            title: "A specific target set for oneself to achieve within a single day.",
            image: require("../../assets/Images/goal.png"),
            //  navigation: () => navigation.navigate(routes.GOAL_SCREEN),
        },
    ];

    const toggleCheckbox = (id) => {
        setCheckboxStates((prev) => {
            const currentState = prev[id] || 1; 
            const nextState = (currentState + 1) % 5; 
            return {
                ...prev,
                [id]: nextState,
            };
        });
    };

    const renderTask = ({ item, index }) => (
        <View style={index === tasks.length - 1 ? styles.lastTaskCard : null}>
            <TaskCard
                item={item}
                checkboxState={checkboxStates[item.id] || 1}
                onToggle={() => toggleCheckbox(item.id)}
            />
        </View>
    );

   const renderNewTask = ({ item, index }) => (
    <ModalTaskCard
        item={item}
        checked={!!checkboxStates[item.id]}
        onToggle={() => toggleCheckbox(item.id)}
        isFirstItem={index === 0}
        isGoalOfDay={item.Heading === "Goal of the Day"}
    />
);

    const progress = 65;

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#fff" barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Logo width={29} height={29} />
                    <Text style={styles.brandText}>WingsFly</Text>
                </View>
                <View style={styles.iconRow}>
                    <Icon name="search" size={20} color="#4F4F4F" />
                    <Image
                      source={require('../../assets/icons/calendar.png')} 
                      style={styles.iconImage}
                    />
                    <Icon name="help-outline" size={20} color="#4F4F4F" />
                </View>
            </View>

            {/* Calendar */}
            <Calender />

            {/* Quote Card */}
            <View style={styles.quoteCard}>
                <Text style={styles.quoteTitle}>Today's Quote</Text>
                <Text style={styles.quoteText}>
                    "You must do the things, you think you cannot do."
                </Text>
                <Text style={styles.progressText}>Progress {progress}%</Text>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                    <View style={[styles.progressThumb, { left: `${progress}%` }]} />
                </View>
            </View>

            {/* Task List */}
            <FlatList
                data={tasks}
                keyExtractor={(item) => item.id}
                renderItem={renderTask}
                contentContainerStyle={{ marginTop: 20 }}
                showsVerticalScrollIndicator={false}
            />

            {/* Plus Button */}
            <Pressable
                style={styles.fab}
                onPress={() => setModalVisible(true)}
            >
                <PlusIcon name="plus" size={24} color="#fff" />
            </Pressable>

            {/* Bottom Modal */}
            <Modal
                isVisible={isModalVisible}
                onBackdropPress={() => setModalVisible(false)}
                onBackButtonPress={() => setModalVisible(false)}
                style={styles.bottomModal}
                swipeDirection="down"
                onSwipeComplete={() => setModalVisible(false)}
                useNativeDriver
            >
                <View style={styles.modalContent}>
                    <FlatList
                        data={modaltasks}
                        keyExtractor={(item) => item.id}
                        renderItem={renderNewTask}
                        contentContainerStyle={{ marginTop: 20 }}
                    />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
        width: "90%",
        alignSelf: "center",
        marginTop: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6
    },
    logoRow: { flexDirection: "row", width: "73%" },
    brandText: {
        fontSize: 19.5,
        fontFamily: "Anton-Regular",
        color: "#363636",
        marginLeft: 7,
        marginTop: -5.5
    },
    iconRow: {
        flexDirection: "row",
        width: "30%",
        gap: 12,
        marginTop: 5
    },
    iconImage: {
        width: 20,
        height: 20,
        tintColor: '#4F4F4F',
        resizeMode: 'contain',
    },
    quoteCard: {
        width: "92%",
        alignSelf: "center",
        backgroundColor: "#fff",
        elevation: 2,
        marginTop: 15,
        borderRadius: 8,
        paddingBottom: 15,
        paddingTop: 8,
        height: 104
    },
    quoteTitle: {
        fontSize: 16,
        fontFamily: "Roboto-Bold",
        textAlign: "center",
        marginBottom: 10,
        color: "#3B3B3B"
    },
    quoteText: {
        fontSize: 13,
        fontFamily: "OpenSans-SemiBold",
        textAlign: "center",
        color: "#5B5B5B",
        marginBottom: 8
    },
    progressText: {
        position: "absolute",
        left: 10,
        bottom: 13,
        fontSize: 12,
        fontFamily: "OpenSans-SemiBold",
        color: colors.PRIMARY
    },
    progressBarContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        height: 5,
        width: "100%",
        backgroundColor: "#DBDBDB",
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        overflow: "visible"
    },
    progressBar: {
        height: "100%",
        backgroundColor: colors.PRIMARY,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    progressThumb: {
        position: "absolute",
        top: -6,
        width: 18,
        height: 18,
        backgroundColor: colors.PRIMARY,
        borderRadius: 9,
        marginLeft: -9,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    lastTaskCard: {
        marginBottom: 50,
    },
    fab: {
        position: "absolute",
        right: 15,
        bottom: 5,
        height: 45,
        width: 45,
        backgroundColor: colors.PRIMARY,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
        elevation: 5
    },
    bottomModal: {
        justifyContent: "flex-end",
        margin: 0
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
    },
});

export default Home;
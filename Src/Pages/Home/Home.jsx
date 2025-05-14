import React, { useState } from "react";
import {
    Text,
    View,
    StyleSheet,
    FlatList,
    Pressable,
} from "react-native";
import Logo from "../../Assests/Images/brand.svg";
import SearchIcon from "react-native-vector-icons/EvilIcons";
import ANTIcon from "react-native-vector-icons/AntDesign";
import PlusIcon from "react-native-vector-icons/AntDesign";
import Calender from "../../Components/Calender";
import { colors, routes } from "../../Helper/Contants";
import Modal from "react-native-modal";
import TaskCard from "../../Components/TaskCard";
import ModalTaskCard from "../../Components/ModalTaskCard";
import { useNavigation } from "@react-navigation/native";


const tasks = [
    {
        id: "1",
        title: "Schedule a meeting with Harshit Sir",
        time: "09:00 AM",
        tags: ["Habit", "Must"],
        image: require("../../Assests/Images/taskhome.png"),
    },
    {
        id: "2",
        title: "Complete UI Design Draft",
        time: "11:00 AM",
        tags: ["Work", "Important"],
        image: require("../../Assests/Images/taskhome.png"),
    },
    {
        id: "3",
        title: "Review PR on GitHub",
        time: "02:00 PM",
        tags: ["Code", "Must"],
        image: require("../../Assests/Images/taskhome.png"),
    },
];



const Home = () => {
    const [checkedItems, setCheckedItems] = useState({});
    const [isModalVisible, setModalVisible] = useState(false);

    const navigation=useNavigation()

    const modaltasks = [
    {
        id: "1",
        Heading:"Habit",
        title: "Activity that repeats over time it has detailed tracking and statistics.",
        image: require("../../Assests/Images/habit.png"),
        navigation:navigation.navigate(routes.CATEOGEYSELECTION_SCREEN)
    },
    {
        id: "2",
        Heading:"Recurring Task",
        title: "Activity that repeats over time it has detailed tracking and statistics.",
        image: require("../../Assests/Images/recurring.png"),
    },
     {
        id: "3",
        Heading:"Task",
        title: "Single instance activity without tracking over time.",
        image: require("../../Assests/Images/task.png"),
    },
     {
        id: "4",
        Heading:"Goal of the Day",
        title: "A specific target set for oneself to achieve within a single day.",
        image: require("../../Assests/Images/goal.png"),
    },
];

    const toggleCheckbox = (id) => {
        setCheckedItems((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const renderTask = ({ item }) => (
        <TaskCard
            item={item}
            checked={!!checkedItems[item.id]}
            onToggle={() => toggleCheckbox(item.id)}
        />
    );

    const renderNewTask = ({ item }) => (
        <ModalTaskCard
            item={item}
            checked={!!checkedItems[item.id]}
            onToggle={() => toggleCheckbox(item.id)}
        />
    );

    const progress = 65;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Logo width={50} height={50} />
                    <Text style={styles.brandText}>wingsfly</Text>
                </View>
                <View style={styles.iconRow}>
                    <SearchIcon name="search" size={26} />
                    <ANTIcon name="calendar" size={22} />
                    <ANTIcon name="questioncircleo" size={22} />
                </View>
            </View>

            {/* Calendar */}
            <Calender />

            {/* Quote Card */}
            <View style={styles.quoteCard}>
                <Text style={styles.quoteTitle}>Today’s Quote</Text>
                <Text style={styles.quoteText}>
                    “You must do the things, you think you cannot do.”
                </Text>
                <Text style={styles.progressText}>Progress {progress}%</Text>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
            </View>

            {/* Task List */}
            <FlatList
                data={tasks}
                keyExtractor={(item) => item.id}
                renderItem={renderTask}
                contentContainerStyle={{ marginTop: 20 }}
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
    },
    logoRow: { flexDirection: "row", width: "70%" },
    brandText: {
        fontSize: 24,
        fontWeight: "600",
        color: "#000",
        marginTop: 5,
        marginLeft: 10,
    },
    iconRow: {
        flexDirection: "row",
        marginTop: 10,
        width: "30%",
        justifyContent: "space-between",
    },
    quoteCard: {
        width: "90%",
        alignSelf: "center",
        backgroundColor: "#fff",
        elevation: 2,
        marginTop: 20,
        borderRadius: 8,
        paddingBottom: 15,
        paddingTop: 10,
        height: 90,
    },
    quoteTitle: {
        fontSize: 16,
        fontWeight: "bold",
        textAlign: "center",
    },
    quoteText: {
        fontSize: 14,
        fontWeight: "300",
        textAlign: "center",
        marginTop: 5,
    },
    progressText: {
        position: "absolute",
        left: 10,
        bottom: 10,
        fontSize: 12,
        fontWeight: "500",
    },
    progressBarContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        height: 5,
        width: "100%",
        backgroundColor: "#EEE",
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        backgroundColor: colors.PRIMARY,
    },
    fab: {
        position: "absolute",
        right: 25,
        bottom: 40,
        height: 50,
        width: 50,
        backgroundColor: colors.PRIMARY,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
        elevation: 5,
    },
    bottomModal: {
        justifyContent: "flex-end",
        margin: 0,
    },
    modalContent: {
        backgroundColor: "#fff",
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
});

export default Home;

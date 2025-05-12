// Components/ModalTaskCard.js
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import Checkbox from "@react-native-community/checkbox";
import { colors } from "../Helper/Contants";
import RightIcon from 'react-native-vector-icons/MaterialIcons'

const ModalTaskCard = ({ item, checked, onToggle }) => (
    <View style={styles.taskContainer}>
        <Image source={item.image} style={styles.taskImage} />
        <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>Habit</Text>
            <Text style={styles.taskDesc}>
                Activity that repeats over time. It has detailed tracking and statistics.
            </Text>
        </View>

        <RightIcon name="keyboard-arrow-right" size={20}></RightIcon>
        
    </View>
);

const styles = StyleSheet.create({
    taskContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        padding: 10,
       
        marginBottom: 10,
        
    },
    taskImage: { width: 50, height: 50, resizeMode: "contain" },
    taskInfo: { flex: 1, marginLeft: 10 },
    taskTitle: { fontSize: 14, fontWeight: "500" },
    taskDesc: { fontSize: 12, fontWeight: "400" },
    checkbox: { marginLeft: 10 },
});

export default ModalTaskCard;

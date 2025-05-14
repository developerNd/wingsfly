// Components/ModalTaskCard.js
import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import RightIcon from 'react-native-vector-icons/MaterialIcons'

const ModalTaskCard = ({ item, checked, onToggle }) => (
    <TouchableOpacity onPress={()=>item.navigation()} style={styles.taskContainer}>
        <Image source={item.image} style={styles.taskImage} />
        <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{item.Heading}</Text>
            <Text style={styles.taskDesc}>
                {item.title}
            </Text>
        </View>

        <RightIcon name="keyboard-arrow-right" size={20}></RightIcon>

    </TouchableOpacity>
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

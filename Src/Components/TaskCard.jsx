// Components/TaskCard.js
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import Checkbox from "@react-native-community/checkbox";
import StopWatchIcon from "react-native-vector-icons/Entypo";
import { colors } from "../Helper/Contants";

const TaskCard = ({ item, checked, onToggle }) => (
    <View style={styles.taskContainer}>
        <Image source={item.image} style={styles.taskImage} />
        <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <View style={styles.taskMeta}>
                <View style={styles.timeBox}>
                    <StopWatchIcon name="stopwatch" size={10} color="#fff" />
                    <Text style={styles.timeText}>{item.time}</Text>
                </View>
                <View style={styles.tagsBox}>
                    {item.tags.map((tag, index) => (
                        <Text key={index} style={styles.tagText}>
                            {tag}{index < item.tags.length - 1 && <Text> | </Text>}
                        </Text>
                    ))}
                </View>
            </View>
        </View>
        <Checkbox
            value={checked}
            onValueChange={onToggle}
            tintColors={{ true: colors.PRIMARY, false: "#AAA" }}
            style={styles.checkbox}
        />
    </View>
);

const styles = StyleSheet.create({
    taskContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9f9f9",
        borderRadius: 10,
        padding: 10,
        marginHorizontal: 20,
        marginBottom: 10,
        elevation: 1,
    },
    taskImage: { width: 50, height: 50, resizeMode: "contain" },
    taskInfo: { flex: 1, marginLeft: 10 },
    taskTitle: { fontSize: 14, fontWeight: "500" },
    taskMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    timeBox: {
        flexDirection: "row",
        backgroundColor: "#0E4C92",
        borderRadius: 5,
        paddingHorizontal: 6,
        alignItems: "center",
        paddingVertical: 2,
    },
    timeText: { marginLeft: 4, color: "#fff", fontSize: 10 },
    tagsBox: { flexDirection: "row", marginLeft: 10, flexWrap: "wrap" },
    tagText: { fontSize: 10, color: "#333" },
    checkbox: { marginLeft: 10 },
});

export default TaskCard;

import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import RightIcon from 'react-native-vector-icons/MaterialIcons'

const ModalTaskCard = ({ item, checked, onToggle, isLastItem, isGoalOfDay, isFirstItem }) => {
    const getIconSize = () => {
        if (item.id === "2" || item.id === "4") {
            return { width: 22, height: 22 }; 
        }
        return { width: 26, height: 26 };
    };

    return (
        <TouchableOpacity 
            onPress={() => item.navigation()}
            style={[
                styles.taskContainer,
                isFirstItem && styles.firstItem,
                isGoalOfDay && styles.lastItem
            ]}
        >
            <View style={styles.iconWrapper}>
                <Image 
                    source={item.image} 
                    style={[styles.taskImage, getIconSize()]} 
                />
            </View>
            <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{item.Heading}</Text>
                <Text style={styles.taskDesc}>
                    {item.title}
                </Text>
                {!isGoalOfDay && (
                    <View style={styles.bottomBorder} />
                )}
            </View>
            
            <View style={styles.arrowWrapper}>
                <RightIcon name="chevron-right" size={26} color="#151F73" />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    taskContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        padding: 5,
        marginBottom: 10,
    },
    firstItem: {
        marginTop: -7,
    },
    lastItem: {
        marginBottom: 4,
    },
    iconWrapper: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: "#FAFAFA",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 12
    },
    taskImage: {
        resizeMode: "contain"
    },
    taskInfo: {
        flex: 1,
        marginLeft: 10,
        position: 'relative'
    },
    taskTitle: {
        fontSize: 14.5,
        fontFamily: 'OpenSans-Bold',
        color: "#141414",
        marginBottom: 2
    },
    taskDesc: {
        fontSize: 8.5,
        color: "#4C4C4C",
        fontFamily: 'OpenSans-Regular',
        lineHeight: 14,
        marginBottom: 5,
        width: '96%'
    },
    bottomBorder: {
        position: 'absolute',
        bottom: -10,
        left: 0,
        right: -50,
        height: 1,
        backgroundColor: '#EAEAEA',
    },
    arrowWrapper: {
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 10,
        marginRight: 6
    },
    checkbox: {
        marginLeft: 10
    },
});

export default ModalTaskCard;
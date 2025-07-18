import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import Feather from "react-native-vector-icons/Feather";
import { colors } from "../Helper/Contants";

const TaskCard = ({ item, checkboxState, onToggle }) => {

    const getFlagColor = () => {
        if (item.tags && item.tags.some(tag => tag.toLowerCase() === 'important')) {
            return '#151B73';
        }
        return '#AF0000'; 
    };

    const getTimeTextColor = () => {
        const colorMap = {
            "1": "#0E4C92",
            "2": "#800080", 
            "3": "#C1A300",
            "4": "#228B22",
            "5": "#F37A29",
            "6": "#006D5B"
        };
        return colorMap[item.id] || "#2E5BFF";
    };

    const getTimeIconColor = () => {
        const colorMap = {
            "1": "#0E4C92",
            "2": "#800080", 
            "3": "#C1A300",
            "4": "#228B22",
            "5": "#F37A29",
            "6": "#006D5B"
        };
        return colorMap[item.id] || "#1A4BFF";
    };

    const renderCheckbox = () => {
        switch (checkboxState) {
            case 1: 
                return (
                    <Image 
                        source={require('../assets/icons/tick.png')} 
                        style={{width: 20, height: 20}} 
                    />
                );
            case 1:
                return (
                    <View style={styles.staticCircle} />
                );
            case 2: 
                return (
                    <Image 
                        source={require('../assets/icons/time.png')} 
                        style={{width: 20, height: 20}} 
                    />
                );
            case 3: 
                return (
                    <View style={styles.staticCircle} />
                );
            case 4:
                return (
                    <View style={styles.staticCircle}>
                        <Image 
                            source={require('../assets/Images/check.png')} 
                            style={styles.iconInsideCircle} 
                        />
                    </View>
                );
            default:
                return (
                    <View style={styles.staticCircle} />
                );
        }
    };

    return (
        <View style={styles.taskContainer}>
            <Image source={item.image} style={styles.taskImage} />
            <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                
                <View style={styles.taskMeta}>
                    <View style={[styles.timeBox, { backgroundColor: item.timeColor || '#0E4C92' }]}>
                        <Icon name="access-time" size={8} color={getTimeIconColor()} marginRight={2} />
                        <Icon name="hourglass-top" size={8} color={getTimeIconColor()} marginRight={1} />
                        <Text style={[styles.timeText, { color: getTimeTextColor() }]}>{item.time}</Text>
                    </View>
                    
                    {item.progress && (
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressText}>{item.progress}</Text>
                        </View>
                    )}
                    
                    <View style={styles.tagsContainer}>
                        <View style={styles.combinedTagContainer}>
                            {item.tags.map((tag, index) => (
                                <Text key={index} style={styles.tagText}>
                                    {tag}
                                    {index < item.tags.length - 1 && <Text style={styles.separator}> | </Text>}
                                </Text>
                            ))}
                            {item.hasFlag && (
                                <View style={styles.flagContainer}>
                                    <Icon name="flag" size={12} color={getFlagColor()} />
                                </View>
                            )}
                        </View>
                    </View>
                </View>
                <View style={styles.bottomBorder} />
            </View>
            
            <TouchableOpacity style={styles.checkboxContainer} onPress={onToggle}>
                {renderCheckbox()}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    taskContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 5,
        marginBottom: 1,
        paddingBottom: 14,
    },
    taskImage: {
        width: 53,
        height: 53,
        resizeMode: "contain",
        marginRight: 10,
        marginLeft: 7
    },
    taskInfo: {
        flex: 1,
        position: 'relative'
    },
    taskTitle: {
        fontSize: 14,
        fontFamily: "Roboto-SemiBold",
        color: "#434343",
        marginBottom: 6,
        lineHeight: 20,
        width: "100%"
    },
    timeSection: {
        marginBottom: 6,
    },
    timeBox: {
        flexDirection: "row",
        borderRadius: 4,
        paddingHorizontal: 3.5,
        marginRight: 4,
        paddingVertical: 2,
        alignItems: "center",
        alignSelf: "flex-start",
    },
    timeText: {
        marginLeft: 2,
        fontSize: 9,
        fontFamily: "OpenSans-SemiBold",
    },
    taskMeta: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 6
    },
    progressContainer: {
        backgroundColor: '#F6F6F6',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 6,
    },
    progressText: {
        fontSize: 9,
        color: '#6C6C6C',
        fontFamily: "OpenSans-SemiBold",
    },
    tagsContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        flexWrap: "wrap"
    },
    combinedTagContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: '#F6F6F6', 
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1.5,
        marginRight: 6,
    },
    tagText: {
        fontSize: 9,
        color: "#6C6C6C",
        fontFamily: "OpenSans-SemiBold",
    },
    separator: {
        color: "#6C6C6C",
        fontSize: 9,
    },
    flagContainer: {
        marginLeft: 0,
    },
    bottomBorder: {
        position: 'absolute',
        bottom: -12,
        left: 0,
        right: -60,
        height: 0.8,
        backgroundColor: '#DAD8D8',
    },
    checkboxContainer: {
        marginLeft: 10,
        padding: 4,
        marginRight: 4.5,
    },
    staticCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E7E7E7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconInsideCircle: {
        width: 10,
        height: 10,
        resizeMode: 'contain',
    },
});

export default TaskCard;
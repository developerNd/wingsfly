import React, { useEffect, useRef } from "react";
import {
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
    Animated,
    Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");
const BUTTON_WIDTH = width * 0.9 * 0.49;

const SwitchButton = ({ selected, onSelect, tabs }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: selected === tabs[0] ? 0 : 1,
            duration: 450,
            useNativeDriver: false,
        }).start();
    }, [selected]);

    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [6, BUTTON_WIDTH + 6],
    });


    return (
        <View style={styles.container}>
            <View style={styles.switchWrapper}>
                <Animated.View style={[styles.slider, { transform: [{ translateX }] }]} />
                <TouchableOpacity
                    onPress={() => onSelect(tabs[0])}
                    style={styles.button}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.text, selected === tabs[0] && styles.activeText]}>
                        {tabs[0]}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => onSelect(tabs[1])}
                    style={styles.button}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.text, selected === tabs[1] && styles.activeText]}>
                        {tabs[1]}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        marginTop: 20,
    },
    switchWrapper: {
        width: "90%",
        alignSelf: "center",
        backgroundColor: "#E8E8E8",
        height: 48,
        borderRadius: 76,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 6,
        position: "relative",
    },
    slider: {
        position: "absolute",
        width: "49%",
        height: "100%",
        backgroundColor: "#3366FF",
        borderRadius: 20,
        zIndex: 0,
    },
    button: {
        width: "50%",
        height: "100%",
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    text: {
        fontSize: 12,
        fontWeight: "600",
        color: "#000",
    },
    activeText: {
        color: "#fff",
    },
});

export default SwitchButton;

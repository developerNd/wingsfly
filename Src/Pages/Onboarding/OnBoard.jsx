import React from "react";
import {
    ImageBackground,
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
    SafeAreaView,
} from "react-native";
import Continue from '../../Assests/Images/continue.svg';
import { useNavigation } from "@react-navigation/native";
import { routes } from "../../Helper/Contants";

const OnBoard = () => {
    const navigation = useNavigation()
    return (
        <SafeAreaView style={styles.container}>
            <ImageBackground
                style={styles.backgroundImage}
                source={require('../../Assests/Images/preview.png')}
            >
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>
                        Plan your goals easiest way possible.
                    </Text>
                    <Text style={styles.subtitle}>
                        Find interesting methods, designs & create plan utmost detail for your goals.
                    </Text>
                </View>

                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate(routes.TASKSLECTION_SCREEN)}>
                    <Continue width={230} height={100} />
                </TouchableOpacity>
            </ImageBackground>
        </SafeAreaView>
    );
};

export default OnBoard;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
    },
    contentContainer: {
        width: "85%",
        alignSelf: "center",
        marginTop: 80,
    },
    title: {
        fontSize: 24,
        fontWeight: "600",
        color: "#fff",
        width: "95%",
        alignSelf: "center",
    },
    subtitle: {
        fontSize: 16,
        fontWeight: "400",
        color: "#fff",
        width: "95%",
        alignSelf: "center",
        marginTop: 10,
    },
    button: {
        width: 230,
        position: "absolute",
        bottom: 40,
        right: 20,
    },
});

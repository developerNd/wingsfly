import React from "react";
import {
    Image,
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
    ScrollView,
} from "react-native";
import Headers from "../../Components/Headers";
import { colors } from "../../Helper/Contants";

const categories = [
    { id: 1, title: "Work & Career", image: require("../../Assests/Images/Cateogery/cat1.png") },
    { id: 2, title: "Health & Fitness", image: require("../../Assests/Images/Cateogery/cat1.png") },
    { id: 3, title: "Relationships", image: require("../../Assests/Images/Cateogery/cat1.png") },
    { id: 4, title: "Education", image: require("../../Assests/Images/Cateogery/cat1.png") },
    { id: 5, title: "Finance", image: require("../../Assests/Images/Cateogery/cat1.png") },
    { id: 6, title: "Travel", image: require("../../Assests/Images/Cateogery/cat1.png") },
    { id: 7, title: "Personal Growth", image: require("../../Assests/Images/Cateogery/cat1.png") },
    { id: 8, title: "Hobbies", image: require("../../Assests/Images/Cateogery/cat1.png") },
];

const CateogerySelection = () => {
    return (
        <View style={styles.container}>
            <View style={styles.headerWrapper}>
                <Headers title="Select Category" >
                    <Text style={{ fontSize: 16, color: colors.PRIMARY, fontWeight: "500" }}>Next</Text>
                </Headers>
            </View>

            <ScrollView contentContainerStyle={styles.gridWrapper}>
                {categories.map((item) => (
                    <View key={item.id} style={styles.card}>
                        <Image
                            resizeMode="contain"
                            source={item.image}
                            style={styles.image}
                        />
                        <TouchableOpacity style={styles.button}>
                            <View style={styles.buttonContent}>
                                <Text style={styles.buttonText}>{item.title}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

export default CateogerySelection;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    headerWrapper: {
        marginTop: 15,
    },
    gridWrapper: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-around",
        paddingBottom: 20,
    },
    card: {
        width: "48%",
        height: 160,
        marginVertical: 5,
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: 10,
    },
    button: {
        width: "85%",
        height: 30,
        position: "absolute",
        bottom: 10,
        alignSelf: "center",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "gray",
        borderRadius: 5,
    },
    buttonContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    buttonText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#000",
    },
});


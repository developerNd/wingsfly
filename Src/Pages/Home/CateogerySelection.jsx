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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const categories = [
    { id: 1, title: "Work & Career", image: require("../../assets/Images/Cateogery/work.png") },
    { id: 2, title: "Health & Wellness", image: require("../../assets/Images/Cateogery/health.png") },
    { id: 3, title: "Love & Relationship", image: require("../../assets/Images/Cateogery/love.png") },
    { id: 4, title: "Money & Finances", image: require("../../assets/Images/Cateogery/money.png") },
    { id: 5, title: "Spirtuality & Faith", image: require("../../assets/Images/Cateogery/faith.png") },
    { id: 6, title: "Personal & Growth", image: require("../../assets/Images/Cateogery/growth.png") },
    { id: 7, title: "Other Goals", image: require("../../assets/Images/Cateogery/other.png") },
    { id: 8, title: "Create a category", image: require("../../assets/Images/Cateogery/create.png") },
];

const CateogerySelection = () => {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <View style={styles.headerWrapper}>
                <Headers title="Select Category" >
                    <Text style={{ fontSize: 16, color: "#0059FF", marginTop: 4, fontFamily: "OpenSans-Bold", }}>Next</Text>
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
                        
                        <TouchableOpacity style={styles.button}
                        onPress={() => navigation.navigate(routes.EVALUATEPROGRESS_SCREEN)}
                        >
                            <View style={styles.buttonContent}>
                                {item.id === 8 ? (
                                    <View style={styles.createCategoryContent}>
                                        <Text style={styles.buttonText}>{item.title}</Text>
                                        <View style={styles.plusIcon}>
                                            <Icon name="add" size={18} color="#FFFFFF" />
                                        </View>
                                    </View>
                                ) : (
                                    <Text style={styles.buttonText}>{item.title}</Text>
                                )}
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
        marginTop: 20,
        marginBottom: 5
    },
    gridWrapper: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        paddingBottom: 10
    },
    card: {
        width: "48%",
        height: 165,
        marginVertical: 3.2,
        marginHorizontal: -1.2
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: 10,
    },
    button: {
        width: "88%",
        height: 30,
        position: "absolute",
        bottom: 10,
        alignSelf: "center",
        backgroundColor: "#fff",
        borderWidth: 0.3,
        borderColor: "gray",
        borderRadius: 5,
    },
    buttonContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    buttonText: {
        fontSize: 12,
        color: "#141414",
        fontFamily: 'OpenSans-SemiBold',
        fontWeight: "600"
    },
    createCategoryContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    plusIcon: {
        width: 23,
        height: 23,
        borderRadius: 7,
        backgroundColor: colors.PRIMARY,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    plusIconText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#fff",
    },
});
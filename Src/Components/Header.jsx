import React from "react";
import { Image, Text, View, StyleSheet } from "react-native";
import QuestionIcon from 'react-native-vector-icons/AntDesign';
import VerifiedIcon from 'react-native-vector-icons/Octicons';
import StarIcon from 'react-native-vector-icons/AntDesign';

const Header = () => {
    return (
        <View style={styles.container}>
            <Image style={styles.headerImage} resizeMode="contain" source={require('../Assets/Images/headers.png')} />

            <View style={styles.topRow}>
                <Text style={styles.dashboardText}>Staff Dashboard</Text>
                <View style={styles.iconGroup}>
                    <QuestionIcon name="questioncircleo" color="#fff" size={20} />
                    <Image style={styles.userIcon} source={require('../Assets/Images/user.png')} />
                </View>
            </View>

            <View style={styles.profileRow}>
                <View style={styles.profileImageContainer}>
                    <Image style={styles.profileImage} source={require('../Assets/Images/user.png')} />
                    <VerifiedIcon style={styles.verifiedIcon} name="verified" color="#fff" size={14} />
                    <Text style={styles.ratingText}>
                        8.5 <StarIcon name="star" color="#fff" size={10} />
                    </Text>
                </View>

                <View style={styles.profileDetails}>
                    <View>
                        <Text style={styles.nameText}>
                            Mr Sanjeev Ratnani <Image source={require('../Assets/Icons/headerbadge.png')} />
                        </Text>
                        <View style={styles.subDetailsRow}>
                            <Text style={styles.subDetailText}>Position - Server</Text>
                            <Text style={styles.subDetailText}>|</Text>
                            <Text style={styles.subDetailText}>Your ID - #10201</Text>
                        </View>
                    </View>

                    <View style={styles.restaurantDetails}>
                        <Text style={styles.restaurantName}>Sujal Restaurant & Bar</Text>
                        <View style={styles.subDetailsRow2}>
                            <Text style={styles.subDetailText}>Industry : F&B Sector</Text>
                            <Text style={styles.subDetailText}>|</Text>
                            <Text style={styles.subDetailText}>Store ID : #SRB1020</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: "26%",
        width: "100%",
        backgroundColor: "#3366FF",
    },
    headerImage: {
        position: "absolute",
        top: 0,
    },
    topRow: {
        flexDirection: "row",
        width: "90%",
        alignSelf: "center",
        justifyContent: "space-between",
        marginTop: 15,
    },
    dashboardText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#fff",
    },
    iconGroup: {
        flexDirection: "row",
        width: "16%",
        justifyContent: "space-between",
    },
    userIcon: {
        height: 20,
        width: 20,
        borderRadius: 10,
    },
    profileRow: {
        flexDirection: "row",
        width: "90%",
        alignSelf: "center",
        marginTop: 15,
    },
    profileImageContainer: {
        height: 100,
    },
    profileImage: {
        height: 84,
        width: 84,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#fff",
    },
    verifiedIcon: {
        position: "absolute",
        right: -5,
        top: 0,
        backgroundColor: "#3366FF",
        borderRadius: 10,
        padding: 2,
    },
    ratingText: {
        position: "absolute",
        right: 1,
        bottom: 25,
        backgroundColor: "#1CA672",
        borderWidth: 1,
        borderColor: "#00D182",
        padding: 1,
        borderTopLeftRadius: 5,
        borderBottomLeftRadius: 5,
        paddingLeft: 5,
        fontSize: 12,
        fontWeight: "700",
        color: "#fff",
    },
    profileDetails: {
        marginLeft: 12,
        marginTop: -5,
    },
    nameText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },
    subDetailsRow: {
        flexDirection: "row",
        width: "65%",
        justifyContent: "space-between",
        marginTop: 1,
    },
    subDetailsRow2: {
        flexDirection: "row",
        width: "80%",
        justifyContent: "space-between",
        marginTop: 1,
    },
    subDetailText: {
        fontSize: 10,
        fontWeight: "500",
        color: "#fff",
    },
    restaurantDetails: {
        marginTop: 9,
    },
    restaurantName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },
});

export default Header;

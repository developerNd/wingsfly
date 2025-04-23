import React from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Header from "../../Components/Header";
import Title from "../../Components/Title";
import DayfilterSlider from "../../Components/DayFilterSlider";
import LinearGradient from "react-native-linear-gradient";
import SearchIcon from 'react-native-vector-icons/Feather';


const TipHistory = () => {
    return (
        <View style={{ width: "90%", alignSelf: "center", marginTop: 2 }}>
            {[1, 2, 4, 4].map((item, index) => (
                <View key={index} style={styles.tipCard}>
                    <View style={styles.tipContent}>
                        <View style={styles.tipLeft}>
                            <Image
                                style={styles.tipImage}
                                source={require('../../Assets/Icons/kitchen.png')}
                            />
                            <View style={styles.tipInfo}>
                                <Text style={styles.tipPlace}>Sujal Restaurant and Bar</Text>
                                <Text style={styles.tipToken}>#10201</Text>
                            </View>
                        </View>

                        <View style={styles.tipRight}>
                            <Text style={styles.tipDate}>Sunday, 5 Jan 2024</Text>
                            <Text style={styles.tipTime}>12:14pm</Text>
                        </View>
                    </View>
                </View>

            ))}
        </View>
    );
};

const Performance = () => {
    return (
        <View style={{ flex: 1 }}>
            <Header></Header>

            <View style={{ backgroundColor: "#fff", height: "100%", flexGrow: 1, position: "relative", bottom: 20, borderTopEndRadius: 24, borderTopLeftRadius: 24 }}>

                <Title name="PERFORMANCE"></Title>
                <DayfilterSlider></DayfilterSlider>
                <ScrollView>
                    <View style={styles.earningsCard}>
                        <LinearGradient
                            colors={['#661AFF', '#3D0F99']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradient}
                        >
                            <Text style={styles.headingText}>Average Rating</Text>
                            <Text style={styles.amountText}>
                                8.5 <Text style={{ color: "#fff", fontSize: 20 }}>⭐</Text>
                            </Text>


                            <Image
                                style={styles.walletIcon}
                                source={require('../../Assets/Icons/wallet.png')}
                            />
                            <Image
                                style={styles.helpIcon}
                                source={require('../../Assets/Icons/wallethelp.png')}
                            />
                        </LinearGradient>
                    </View>

                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>Performance History</Text>
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Search Token No."
                                placeholderTextColor="#999"
                            />
                            <SearchIcon name="search" size={15} color="#000" />
                        </View>
                    </View>

                    <TipHistory />
                    <View style={{ marginBottom: 200 }}></View>
                </ScrollView>

            </View>



        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        alignSelf: "center",
    },

    // Average Rating Card
    earningsCard: {
        width: "90%",
        height: 130,
        alignSelf: "center",
        marginTop: 20,
        borderRadius: 12,
        overflow: "hidden",
    },
    gradient: {
        flex: 1,
        borderRadius: 10,
        padding: 15,
        justifyContent: "center",
    },
    headingText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#fff",
    },
    amountText: {
        fontSize: 26,
        fontWeight: "700",
        color: "#fff",
        marginTop: 4,
    },
    walletIcon: {
        position: "absolute",
        right: 0,
        bottom: 0,
    },
    helpIcon: {
        position: "absolute",
        top: 0,
        right: 0,
    },

    // Header + Search
    headerContainer: {
        width: "90%",
        alignSelf: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 20,
    },
    title: {
        fontSize: 14,
        fontWeight: "600",
        color: "#000",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 22,
        borderColor: "#D6D7DB",
        height: 30,
        width: 130,
        paddingHorizontal: 10,
        backgroundColor: "#fff",
    },
    input: {
        fontSize: 10,
        fontWeight: "500",
        flex: 1,
        paddingVertical: 0,
        marginRight: 8,
    },

    // Tip History Cards
    tipCard: {
        height: 78,
        borderWidth: 1,
        borderRadius: 12,
        borderColor: "#E6E6E6",
        marginTop: 12,
        justifyContent: "center",
        paddingHorizontal: 10,
    },
    tipContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        flex: 1,
    },
    tipLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    tipImage: {
        height: 28,
        width: 28,
        resizeMode: "contain",
        marginRight: 10,
    },
    tipInfo: {
        justifyContent: "center",
    },
    tipPlace: {
        fontSize: 10,
        fontWeight: "600",
        color: "#954B00",
    },
    tipToken: {
        fontSize: 10,
        fontWeight: "500",
        color: "gray",
        marginVertical: 3,
    },
    tipRight: {
        alignItems: "flex-end",
        justifyContent: "center",
    },
    tipDate: {
        fontSize: 12,
        fontWeight: "600",
        color: "#000",
    },
    tipTime: {
        fontSize: 10,
        fontWeight: "600",
        color: "#000",
    },
});



export default Performance
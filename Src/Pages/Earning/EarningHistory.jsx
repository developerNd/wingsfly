import React from "react";
import { View, Text, Image, StyleSheet, TextInput, ScrollView } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import SearchIcon from 'react-native-vector-icons/Feather';
import DayfilterSlider from "../../Components/DayFilterSlider";

const TipHistory = () => {
    return (
        <View style={{ width: "90%", alignSelf: "center", marginTop: 2 }}>
            {[1, 2].map((item, index) => (
                <View key={index} style={styles.tipCard}>
                    <View style={styles.tipContent}>
                        <View style={styles.tipLeft}>
                            <Image
                                style={styles.tipImage}
                                source={require('../../Assets/Icons/kitchen.png')}
                            />
                            <View style={styles.tipInfo}>
                                <Text style={styles.tipDate}>Sunday, 5 Jan 2024</Text>
                                <Text style={styles.tipTime}>12:14pm</Text>
                                <Text style={styles.tipPlace}>Sujal Restaurant and Bar</Text>
                            </View>
                        </View>
                        <View>
                            <Text style={styles.tipToken}>#10201</Text>
                            <Text style={styles.tipAmount}>₹100</Text>
                            <Text style={styles.tipStatus}>Received</Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );
};

const EarningHistory = () => {
    return (
        <View style={styles.container}>
            <ScrollView>
                <DayfilterSlider></DayfilterSlider>
                
                {/* Earnings Card */}
                <View style={styles.earningsCard}>
                    <LinearGradient
                        colors={['#1BBB7F', '#005333']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradient}
                    >
                        <Text style={styles.headingText}>Todays Total Earning</Text>
                        <Text style={styles.amountText}>₹2,420</Text>

                        <View style={styles.payoutContainer}>
                            <View style={styles.payoutRow}>
                                <Text style={styles.payoutLabel}>Next Payout</Text>
                                <Text style={styles.payoutDate}>16 April 2025</Text>
                            </View>
                        </View>

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

                {/* Tip History Header */}
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Tip History</Text>
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

                <View style={{ marginBottom: 300 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        alignSelf: "center",
    },
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
        marginTop: 8,
    },
    payoutContainer: {
        width: "70%",
        borderWidth: 1,
        borderRadius: 16,
        borderColor: "#fff",
        paddingVertical: 4,
        paddingLeft: 12,
        paddingRight: 4,
        marginTop: 6,
    },
    payoutRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
    payoutLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: "#fff",
    },
    payoutDate: {
        backgroundColor: "#fff",
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 14,
        fontSize: 14,
        fontWeight: "500",
        color: "#027A48",
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
    tipCard: {
        height: 78,
        borderWidth: 1,
        borderRadius: 12,
        borderColor: "#E6E6E6",
        marginTop: 12,
    },
    tipContent: {
        width: "95%",
        alignSelf: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        flex: 1,
        alignItems: "center",
    },
    tipLeft: {
        flexDirection: "row",
    },
    tipImage: {
        marginTop: 10,
        height: 28,
        width: 28,
    },
    tipInfo: {
        marginLeft: 10,
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
        textAlign: "right",
    },
    tipAmount: {
        fontSize: 16,
        fontWeight: "700",
        color: "#000",
        textAlign: "right",
    },
    tipStatus: {
        fontSize: 10,
        fontWeight: "600",
        color: "green",
        marginVertical: 3,
        textAlign: "right",
    },
});

export default EarningHistory;

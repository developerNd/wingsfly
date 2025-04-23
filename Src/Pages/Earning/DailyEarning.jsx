import React from "react";
import { View, Text, Image, StyleSheet, TextInput, ScrollView } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import TimeIcon from 'react-native-vector-icons/Ionicons';
import SearchIcon from 'react-native-vector-icons/Feather';


const TipHistory = () => {
    return (
        <View style={{ width: "90%", alignSelf: "center", marginTop: 2, }}>

            <View style={{ height: 78, borderWidth: 1, borderRadius: 12, borderColor: "#E6E6E6", marginTop: 12 }}>
                <View style={{ width: "95%", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", flex: 1, alignItems: "center" }}>
                    <View style={{ flexDirection: "row" }}>
                        <Image style={{ marginTop: 10, height: 28, width: 28 }} source={require('../../Assets/Icons/kitchen.png')}></Image>
                        <View style={{ marginLeft: 10 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#000" }}>Sunday, 5 Jan 2024</Text>
                            <Text style={{ fontSize: 10, fontWeight: "600", color: "#000" }}>12:14pm</Text>
                            <Text style={{ fontSize: 10, fontWeight: "600", color: "#954B00" }}>Sujal Restaurant and Bar</Text>
                        </View>
                    </View>
                    <View>
                        <Text style={{ fontSize: 10, fontWeight: "500", color: "gray", marginVertical: 3 }}>#10201</Text>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>₹100</Text>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: "green", marginVertical: 3 }}>Received</Text>
                    </View>
                </View>

            </View>

            <View style={{ height: 78, borderWidth: 1, borderRadius: 12, borderColor: "#E6E6E6", marginTop: 12 }}>
                <View style={{ width: "95%", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", flex: 1, alignItems: "center" }}>
                    <View style={{ flexDirection: "row" }}>
                        <Image style={{ marginTop: 10, height: 28, width: 28 }} source={require('../../Assets/Icons/kitchen.png')}></Image>
                        <View style={{ marginLeft: 10 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#000" }}>Sunday, 5 Jan 2024</Text>
                            <Text style={{ fontSize: 10, fontWeight: "600", color: "#000" }}>12:14pm</Text>
                            <Text style={{ fontSize: 10, fontWeight: "600", color: "#954B00" }}>Sujal Restaurant and Bar</Text>
                        </View>
                    </View>
                    <View>
                        <Text style={{ fontSize: 10, fontWeight: "500", color: "gray", marginVertical: 3 }}>#10201</Text>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>₹100</Text>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: "green", marginVertical: 3 }}>Received</Text>
                    </View>
                </View>

            </View>

        </View>
    )
}

const DailyEarning = () => {
    return (

        <View style={styles.container}>
            <ScrollView>
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

                {/* Upcoming Payout Card */}
                <View style={styles.upcomingCard}>
                    <View style={styles.upcomingHeader}>
                        <View style={styles.upcomingHeaderContent}>
                            <View style={styles.row}>
                                <TimeIcon name="time-sharp" size={20} color="#fff" />
                                <Text style={styles.upcomingText}>Upcoming Payout</Text>
                            </View>
                            <Text style={styles.timeText}>In 12H : 22M</Text>
                        </View>
                    </View>

                    <View style={styles.rowContainer}>
                        <Text style={styles.labelText}>Payout Scheduled{"\n"}TodayAt</Text>
                        <Text style={styles.valueText}>12:00AM | 12th Jan 24</Text>
                    </View>

                    <View style={styles.dashedLine} />

                    <View style={styles.rowContainer}>
                        <Text style={styles.labelText}>Platform fee</Text>
                        <Text style={[styles.valueText, styles.negativeValue]}>- ₹10</Text>
                    </View>

                    <View style={styles.dashedLine} />

                    <View style={styles.rowContainer}>
                        <Text style={[styles.labelText, styles.positiveText]}>You are getting</Text>
                        <Text style={[styles.valueText, styles.positiveText]}>₹1,240</Text>
                    </View>
                </View>

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

                <TipHistory></TipHistory>

                <View style={{ marginBottom: 300 }}></View>

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
    upcomingCard: {
        width: "90%",
        borderWidth: 1,
        borderColor: "#3366FF",
        alignSelf: "center",
        marginTop: 20,
        borderRadius: 12,
        paddingBottom: 10
    },
    upcomingHeader: {
        height: 40,
        backgroundColor: "#3366FF",
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    upcomingHeaderContent: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "95%",
        alignSelf: "center",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    upcomingText: {
        marginLeft: 6,
        fontSize: 12,
        fontWeight: "600",
        fontStyle: "italic",
        color: "#fff",
        marginTop: 1,
    },
    timeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#fff",
    },
    rowContainer: {
        width: "90%",
        alignSelf: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 7,
    },
    labelText: {
        width: "40%",
        fontSize: 12,
        fontWeight: "500",
    },
    valueText: {
        fontSize: 12,
        fontWeight: "500",
    },
    dashedLine: {
        width: "100%",
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#E1E4ED",
        marginTop: 7,
    },
    negativeValue: {
        color: "red",
    },
    positiveText: {
        color: "green",
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
});

export default DailyEarning;

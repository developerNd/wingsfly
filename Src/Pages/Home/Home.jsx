import React from "react";
import { Image, ImageBackground, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Header from "../../Components/Header";
import LinearGradient from "react-native-linear-gradient";
import UparrowIcon from 'react-native-vector-icons/Feather';

const Home = () => {

    const PerformanceData = [
        {
            title: "Tip",
            title1: "Collected",
            point: 1500,
            color: "green",
            percentage: "5%",
            month: "last month",
            ICON: <UparrowIcon name="trending-up" color="green" size={20} />,
            Img: <Image source={require('../../Assets/Icons/rupees.png')}></Image>
        },
        {
            title: "Average",
            title1: "Rating",
            point: 8.5,
            color: "red",
            percentage: "5%",
            month: "last month",
            ICON: <UparrowIcon name="trending-down" color="red" size={20} />,
            Img: <Image source={require('../../Assets/Icons/star.png')}></Image>
        },
        {
            title: "Task",
            title1: "Completed",
            point: "10/20",
            color: "green",
            percentage: "10 left",
            month: "to complete",
            Img: <Image source={require('../../Assets/Icons/task.png')}></Image>
        },

    ]
    
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <Header></Header>
                <View style={{ backgroundColor: "#fff", height: "100%", flexGrow: 1, position: "relative", bottom: 20, borderTopEndRadius: 24, borderTopLeftRadius: 24 }}>
                    <View style={{ width: "90%", height: 130, alignSelf: "center", marginTop: 20, borderRadius: 12, overflow: "hidden" }}>
                        <LinearGradient
                            colors={['#1BBB7F', '#005333']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ flex: 1, borderRadius: 10, padding: 15 }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>Todays Total Earning</Text>
                            <Text style={{ fontSize: 26, fontWeight: "700", color: "#fff", marginTop: 8 }}>₹2,420</Text>
                            <View style={{ width: "70%", borderWidth: 1, borderRadius: 16, borderColor: "#fff", paddingTop: 4, paddingBottom: 4, paddingLeft: 12, paddingRight: 4, marginTop: 6 }}>
                                <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between" }}>
                                    <Text style={{ fontSize: 14, fontWeight: "500", color: "#fff" }}>Next Payout</Text>
                                    <Text style={{ backgroundColor: "#fff", paddingTop: 2, paddingBottom: 2, paddingLeft: 8, paddingRight: 8, borderRadius: 14, fontSize: 14, fontWeight: "500", color: "#027A48" }}>16 April 2025</Text>
                                </View>
                            </View>

                            <Image style={{ position: "absolute", right: 0, bottom: 0 }} source={require('../../Assets/Icons/wallet.png')}></Image>
                            <Image style={{ position: "absolute", top: 0, right: 0 }} source={require('../../Assets/Icons/wallethelp.png')}></Image>

                        </LinearGradient>
                    </View>

                    <View style={{ width: "90%", alignSelf: "center", marginTop: 20 }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#000" }}>Today’s Average Performance</Text>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 15 }}>
                            {
                                PerformanceData.map((item, index) => (
                                    <View key={index} style={{ height: 170, width: 100, backgroundColor: "#313233", borderRadius: 10 }}>
                                        <View style={{ width: "80%", alignSelf: "center" }}>
                                            <View style={{ width: "100%", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                                                {item.Img}
                                                <UparrowIcon name="arrow-up-right" color="#A3A6AD" size={20} />
                                            </View>
                                            <Text style={{ fontSize: 14, fontWeight: "500", color: "#fff", marginTop: 5 }}>{item.title} {item.title1}</Text>

                                            <Text style={{ fontSize: 26, fontWeight: "700", color: "#fff", marginTop: 5 }}>{item.point}</Text>
                                            <Text style={{ fontSize: 12, fontWeight: "500", color: item.color, marginTop: 2 }}>{item.ICON && item.ICON} {item.percentage}</Text>
                                            <Text style={{ fontSize: 12, fontWeight: "500", color: "#B7BAC2", marginTop: 2 }}>{item.month}</Text>
                                        </View>

                                    </View>
                                ))
                            }
                        </View>
                    </View>

                    <View style={{ width: "90%", alignSelf: "center" }}>
                        <View style={{ width: "100%", marginTop: 15, flexDirection: "row", justifyContent: "space-between" }}>

                            {/* First Box */}
                            <View style={{ height: 100, width: "48%", borderRadius: 12, overflow: 'hidden' }}>
                                <ImageBackground
                                    style={{ flex: 1 }}
                                    source={require('../../Assets/Images/homebac1.png')}
                                    resizeMode="cover"
                                >
                                    <Image style={{ position: "absolute", right: 0, top: 0 }} source={require('../../Assets/Icons/cup.png')}></Image>
                                    <View style={{ marginLeft: 10 }}>
                                        <Text style={{ marginTop: 10, fontSize: 26, fontWeight: "700" }}>10</Text>
                                        <View style={{ flexDirection: "row" }}>
                                            <Text style={{ width: "70%", fontSize: 14, fontWeight: "500" }}>Total Rewards Earned</Text>
                                            <UparrowIcon name="arrow-up-right" color="#000" size={20} />
                                        </View>
                                    </View>

                                </ImageBackground>
                            </View>

                            {/* Second Box */}
                            <View style={{ height: 100, width: "48%", borderRadius: 12, overflow: 'hidden' }}>
                                <ImageBackground
                                    style={{ flex: 1 }}
                                    source={require('../../Assets/Images/homebac2.png')}
                                    resizeMode="cover"
                                >
                                    <Image style={{ position: "absolute", right: 0, top: 0 }} source={require('../../Assets/Icons/coin.png')}></Image>
                                    <View style={{ marginLeft: 10 }}>
                                        <Text style={{ marginTop: 10, fontSize: 26, fontWeight: "700" }}>56</Text>
                                        <View style={{ flexDirection: "row" }}>
                                            <Text style={{ width: "70%", fontSize: 14, fontWeight: "500" }}>Total Points Earned</Text>
                                            <UparrowIcon name="arrow-up-right" color="#000" size={20} />
                                        </View>
                                    </View>
                                </ImageBackground>
                            </View>

                        </View>
                    </View>

                    <View style={{ marginBottom: 50 }}></View>
                </View>


            </ScrollView>


        </SafeAreaView>
    )
}

export default Home

const styles = StyleSheet.create({
    container: {
        flex: 1
    }
})
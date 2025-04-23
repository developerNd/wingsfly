import React from "react";
import { Image, ScrollView, Text, View } from "react-native";
import * as Progress from 'react-native-progress';

const Acheviements = () => {
    return (
        <ScrollView >
            <View style={{ width: "100%", marginTop: 20 }}>
                <View style={{ width: "90%", alignSelf: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "rgba(62, 62, 62, 1)" }}>Ongoing Tasks</Text>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                        <View style={{ height: 140, width: "46%", borderWidth: 1, borderColor: "rgba(222, 222, 222, 1)", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                            <Image style={{ height: 45, width: 45 }} source={require('../../Assets/Icons/awards/awards1.png')}></Image>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(62, 62, 62, 1)", marginBottom: 10 }}>Task Heading</Text>
                            <Progress.Bar progress={0.3} width={100} color="rgba(242, 203, 120, 1)" />
                            <View style={{ flexDirection: "row", marginTop: 10 }}>
                                <Image source={require('../../Assets/Icons/awards/coin.png')}></Image>
                                <Text style={{ fontSize: 12, fontWeight: "700", marginLeft: 5 }}>70/100</Text>
                            </View>
                        </View>
                        <View style={{ height: 140, width: "46%", borderWidth: 1, borderColor: "rgba(222, 222, 222, 1)", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                            <Image style={{ height: 45, width: 45 }} source={require('../../Assets/Icons/awards/awards2.png')}></Image>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(62, 62, 62, 1)", marginBottom: 10 }}>Task Heading</Text>
                            <Progress.Bar progress={0.3} width={100} color="rgba(242, 203, 120, 1)" />
                            <View style={{ flexDirection: "row", marginTop: 10 }}>
                                <Image source={require('../../Assets/Icons/awards/coin.png')}></Image>
                                <Text style={{ fontSize: 12, fontWeight: "700", marginLeft: 5 }}>70/100</Text>
                            </View>
                        </View>


                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                        <View style={{ height: 140, width: "46%", borderWidth: 1, borderColor: "rgba(222, 222, 222, 1)", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                            <Image style={{ height: 45, width: 45 }} source={require('../../Assets/Icons/awards/awards3.png')}></Image>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(62, 62, 62, 1)", marginBottom: 10 }}>Task Heading</Text>
                            <Progress.Bar progress={0.3} width={100} color="rgba(242, 203, 120, 1)" />
                            <View style={{ flexDirection: "row", marginTop: 10 }}>
                                <Image source={require('../../Assets/Icons/awards/coin.png')}></Image>
                                <Text style={{ fontSize: 12, fontWeight: "700", marginLeft: 5 }}>70/100</Text>
                            </View>
                        </View>
                        <View style={{ height: 140, width: "46%", borderWidth: 1, borderColor: "rgba(222, 222, 222, 1)", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                            <Image style={{ height: 45, width: 45 }} source={require('../../Assets/Icons/awards/awards4.png')}></Image>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(62, 62, 62, 1)", marginBottom: 10 }}>Task Heading</Text>
                            <Progress.Bar progress={0.3} width={100} color="rgba(242, 203, 120, 1)" />
                            <View style={{ flexDirection: "row", marginTop: 10 }}>
                                <Image source={require('../../Assets/Icons/awards/coin.png')}></Image>
                                <Text style={{ fontSize: 12, fontWeight: "700", marginLeft: 5 }}>70/100</Text>
                            </View>
                        </View>


                    </View>
                </View>
            </View>
            <View style={{ marginBottom: 200 }}></View>
        </ScrollView>

    )
}

export default Acheviements
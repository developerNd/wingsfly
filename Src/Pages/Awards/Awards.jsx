import React, { useState } from "react";
import { Image, ImageBackground, Text, View } from "react-native";
import Header from "../../Components/Header";
import SwitchButton from "../../Components/SwitchButton";
import Title from "../../Components/Title";
import Task from "./Task";
import UparrowIcon from 'react-native-vector-icons/Feather';
import Acheviements from "./Acheviements";

const Awards = () => {
    const [selectedTab, setSelectedTab] = useState("Task");
    return (
        <View style={{ flex: 1 }}>
            <Header></Header>
            <View style={{ backgroundColor: "#fff", height: "100%", flexGrow: 1, position: "relative", bottom: 20, borderTopEndRadius: 24, borderTopLeftRadius: 24 }}>
                <Title name="AWARDS"></Title>
                <View style={{ width: "90%", alignSelf: "center" }}>
                    <View style={{ width: "100%", marginTop: 15, flexDirection: "row", justifyContent: "space-between" }}>
                        {/* First Box */}
                        <View style={{ height: 100, width: "48%", borderRadius: 12, overflow: 'hidden' }}>
                            <ImageBackground
                                style={{ flex: 1 }}
                                source={require('../../Assets/Images/homebac2.png')}
                                resizeMode="cover"
                            >
                                <Image style={{ position: "absolute", right: 0, top: 0 }} source={require('../../Assets/Icons/coin.png')}></Image>
                                <View style={{ marginLeft: 15 }}>
                                    <Text style={{ marginTop: 10, fontSize: 26, fontWeight: "700" }}>#10</Text>
                                    <View style={{ flexDirection: "row" }}>
                                        <Text style={{ width: "50%", fontSize: 14, fontWeight: "500" }}>Earned Points</Text>
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
                                <View style={{ marginLeft: 15 }}>
                                    <Text style={{ marginTop: 10, fontSize: 26, fontWeight: "700" }}>#56</Text>
                                    <View style={{ flexDirection: "row" }}>
                                        <Text style={{ width: "50%", fontSize: 14, fontWeight: "500" }}>Total Points</Text>

                                    </View>
                                </View>
                            </ImageBackground>
                        </View>

                    </View>
                </View>
                <SwitchButton selected={selectedTab} onSelect={setSelectedTab} tabs={["Task", "Achievements"]} />


                {selectedTab === "Task" ? (
                    <Task></Task>
                ) : (

                    <Acheviements></Acheviements>
                )}
            </View>
        </View>
    )
}

export default Awards
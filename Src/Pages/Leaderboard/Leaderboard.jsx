import React, { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import Header from "../../Components/Header";
import SwitchButton from "../../Components/SwitchButton";

import Title from "../../Components/Title";

import FilterIcon from 'react-native-vector-icons/Ionicons'
import Infield from "./InField";
import InStore from "./InStore";

const Leaderboard = () => {
    const [selectedTab, setSelectedTab] = useState("In Your Store");
    return (
        <View style={{ flex: 1 }}>
            <Header></Header>

            <View style={{ backgroundColor: "#fff", height: "100%", flexGrow: 1, position: "relative", bottom: 20, borderTopEndRadius: 24, borderTopLeftRadius: 24 }}>
                <Title name="LEADERBOARD"></Title>
                <SwitchButton selected={selectedTab} onSelect={setSelectedTab} tabs={["In Your Store", "In Your Field"]} />

                <View style={{ width: "85%", marginTop: 20, alignSelf: "center" }}>
                    <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        {/* Filter icon button */}
                        <View style={{ borderWidth: 1, borderColor: "#D5D7DA", height: 28, width: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" }}>
                            <FilterIcon name="filter-outline" size={18} />
                        </View>

                        {/* Filter tabs */}
                        <View style={{ flexDirection: "row", gap: 8,marginRight:28 }}>
                            {["Today’s Top", "Weekly Top", "Monthly Top"].map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: "#D5D7DA",
                                        paddingHorizontal: 10,
                                        height: 28,
                                        borderRadius: 8,
                                        justifyContent: "center"
                                    }}
                                >
                                    <Text style={{ fontSize: 10, fontWeight: "600", color: "#000" }}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {selectedTab === "In Your Store" ? (
                     <InStore></InStore>
                ) : (
                  
                   <Infield></Infield>
                )}
            </View>
        </View>
    )
}

export default Leaderboard

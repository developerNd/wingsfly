import React, { useState } from "react";
import { Image, Text, View } from "react-native";
import Header from "../../Components/Header";
import SwitchButton from "../../Components/SwitchButton";
import LinearGradient from "react-native-linear-gradient";
import DailyEarning from "./DailyEarning";
import EarningHistory from "./EarningHistory";
import Title from "../../Components/Title";

const Earning = () => {
    const [selectedTab, setSelectedTab] = useState("Daily Overview");
    return (
        <View style={{ flex: 1 }}>
            <Header></Header>

            <View style={{ backgroundColor: "#fff", height: "100%", flexGrow: 1, position: "relative", bottom: 20, borderTopEndRadius: 24, borderTopLeftRadius: 24 }}>
                <Title name="EARNING"></Title>
                <SwitchButton selected={selectedTab} onSelect={setSelectedTab} tabs={["Daily Overview", "Earnings History"]} />
                {selectedTab === "Daily Overview" ? (
                    <DailyEarning></DailyEarning>
                ) : (
                    <EarningHistory></EarningHistory>
                )}
            </View>
        </View>
    )
}

export default Earning
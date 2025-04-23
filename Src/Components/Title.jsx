import { Text } from "@react-navigation/elements";
import React from "react";
import { View } from "react-native";
import LinearGradient from "react-native-linear-gradient";



const Title = ({ name }) => {
    return (
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 20 }}>
            <LinearGradient
                colors={["#3366FF00", "#3366FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 2, width: 80, borderRadius: 3 }}
            />

            <Text style={{ fontSize: 14, fontWeight: "700", color: "#3366FF", marginHorizontal: 8 }}>{name}</Text>

            <LinearGradient
                colors={["#3366FF", "#3366FF00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 2, width: 80, borderRadius: 3 }}
            />
        </View>
    )
}

export default Title
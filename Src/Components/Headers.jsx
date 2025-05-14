import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import BackIcon from 'react-native-vector-icons/Ionicons'


const Headers = ({ title = "Set Your Goal", children }) => {
    return (
        <View style={{ width: "90%", alignSelf: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <TouchableOpacity style={{ marginTop: 2 }}>
                <BackIcon name="chevron-back-outline" size={22}></BackIcon>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "600", width: "70%", textAlign: "center" }}>{title}</Text>
            {children ? children : <View></View>}
        </View>
    )
}

export default Headers
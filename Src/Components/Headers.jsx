import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import BackIcon from 'react-native-vector-icons/Ionicons'


const Headers = (title, Children) => {
    return (
        <View style={{ width: "90%", alignSelf: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <TouchableOpacity style={{ marginTop: 2 }}>
                <BackIcon name="chevron-back-outline" size={22}></BackIcon>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>Set Your First Goal</Text>
            <View>

            </View>
            {Children}
        </View>
    )
}

export default Headers
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import BackIcon from 'react-native-vector-icons/Ionicons'

const Headers = ({ title = "Set Your Goal", children }) => {
    return (
        <View style={{ width: "90%", alignSelf: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <TouchableOpacity style={{ marginTop: 2 }}>
                <BackIcon name="chevron-back-outline" size={25} color="#3B3B3B"></BackIcon>
            </TouchableOpacity>
            <Text style={{ 
                fontSize: 15, 
                fontFamily: 'OpenSans-Bold', 
                textAlign: "center", 
                color: "#3B3B3B",
                lineHeight: 20,
                flex: 1,
                marginHorizontal: 10,
                marginTop: 4
            }}>
                {title}
            </Text>
            {children ? children : <View></View>}
        </View>
    )
}

export default Headers
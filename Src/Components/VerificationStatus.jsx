import React from "react";
import { Image, Text, View } from "react-native";

const VerificationStatus = ({ children }) => {
    return (
        <View style={{ flex: 1, backgroundColor: "#3366FF" }}>
            <Image style={{ position: "absolute", top: 0 }} resizeMode="contain" source={require('../Assets/Images/headers.png')}></Image>
            <Image style={{ position: "absolute", bottom: 0 }} resizeMode="contain" source={require('../Assets/Images/footer.png')}></Image>
            {children}
        </View>
    )
}

export default VerificationStatus
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import VerificationStatus from "../../../Components/VerificationStatus";
import CommonButton from "../../../Components/Button/CommonButton";
import { useAuth } from "../../../Context/AuthContect";

const CompleteVerification = () => {
    let { login, setIslogin } = useAuth()
    return (
        <View style={{ flex: 1 }}>
            <VerificationStatus>
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }} >
                    <Image source={require('../../../Assets/Icons/success.png')}></Image>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#fff", marginTop: 20 }}>Verification Completed </Text>
                    <Text style={{ textAlign: "center", fontSize: 12, fontWeight: "500", color: "#FFFFFF", width: "80%", alignSelf: "center", marginTop: 5 }}>Congratulations! You have been successfully authenticated!</Text>
                    <CommonButton
                        textstyle={styles.buttonText}
                        outerstyle={styles.button}
                        btnname="Continue"
                        onClick={() => setIslogin(true)}
                    />
                </View>
            </VerificationStatus>
        </View>
    )
}

export default CompleteVerification


const styles = StyleSheet.create({

    button: {
        position: "absolute", bottom: 25,
        height: 48,
        width: "90%",
        backgroundColor: "#5A8BFF",
        alignSelf: "center",
        borderRadius: 10,
        marginTop: 20,
        elevation: 2
    },
    buttonText: {
        fontSize: 14,
        color: "#fff",
        fontWeight: "600",
    },
});

import React, { useEffect, useState } from "react";
import { Image, ImageBackground, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { OtpInput } from "react-native-otp-entry";
import CommonButton from "../../../Components/Button/CommonButton";
import BackIcon from 'react-native-vector-icons/AntDesign';
import { Route } from "../../../Helper/Contants/Route";
import { useNavigation } from "@react-navigation/native";
import { OtpVerifyApi, ResendOTPApi } from "../../../Services/Auth";
import ToastUtil from "../../../Helper/Toast";
import { useAuth } from "../../../Context/AuthContect";
import AsyncStorage from "@react-native-async-storage/async-storage";


const Verification = ({ route }) => {
    const [timer, setTimer] = useState(150);
    const [isResendEnabled, setIsResendEnabled] = useState(false);
    const navigation = useNavigation()
    const [loading, setLoading] = useState(false)
    const [otp, setOtp] = useState('')
    const { phonenumber } = route.params
    const [haserror, setHaserror] = useState(false)
    

    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else {
            setIsResendEnabled(true);
            clearInterval(interval);
        }

        return () => clearInterval(interval);
    }, [timer]);

    const formatTime = (seconds) => {
        const min = String(Math.floor(seconds / 60)).padStart(2, '0');
        const sec = String(seconds % 60).padStart(2, '0');
        return `${min}:${sec}`;
    };

    const handleResend = async () => {
        if (!isResendEnabled) {
            ToastUtil.info("Information!", "Timer still running, Please wait")
            return
        }
        try {
            let response = await ResendOTPApi(phonenumber);
            if (response.status === 200) {

                ToastUtil.success("Success!", "Otp Send Successfully")
                setTimer(150);
                setIsResendEnabled(false);
            } else {
                ToastUtil.error("Error!", response.message)

            }
        } catch (error) {

        }

    };

    const VerifyOtp = async () => {
        if (!otp) {
            ToastUtil.error("Error!", "Please Fill Otp")
            return
        }
        setLoading(true)
        try {
            let response = await OtpVerifyApi({
                "phone": phonenumber,
                "otp": otp
            });
            if (response.status === 200) {
                await AsyncStorage.setItem('token', response.data.token)
                ToastUtil.success("Success!", "Verified Successfully")
                navigation.reset({
                    index: 0,
                    routes: [{ name: Route.CONFORM_SCREEN }],
                });

            } else {
                ToastUtil.error("Error!", response.message)
                setHaserror(true)

            }
        } catch (error) {
            setLoading(false)
            setHaserror(true)
        } finally {
            setLoading(false)
        }

    }
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topSection}>
                <ImageBackground
                    style={styles.image}
                    source={require('../../../Assets/Images/Loginbg.png')}
                >
                    <View style={{ width: "90%", alignSelf: "center", marginTop: 20 }}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <View style={{ borderWidth: 1, justifyContent: "center", alignItems: "center", borderColor: "#FFFFFF24", borderRadius: 5, width: 25, height: 25 }}>
                                <BackIcon name="arrowleft" size={17} color="#fff" />
                            </View>
                        </TouchableOpacity>

                        <Image style={{ marginTop: 25 }} source={require('../../../Assets/Images/whitelogo.png')}></Image>
                        <Text style={{ color: "#EEEEEE", fontSize: 32, fontWeight: "600", marginTop: 20 }}>OTP Verification</Text>
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "400", width: "80%", marginTop: 5 }}>Enter the verification code we just sent to your
                            number +91 {phonenumber}.</Text>

                    </View>

                </ImageBackground>
            </View>
            <View style={styles.bottomSection}>
                <View style={{ width: "90%", alignSelf: "center", marginTop: 30 }}>
                    <Text style={{ fontSize: 12, fontWeight: "500", color: "#6C7278" }}>Enter OTP</Text>
                    <View style={{ marginTop: 10 }}>
                        <OtpInput
                            numberOfDigits={6}
                            focusColor="#3366FF"
                            autoFocus={false}
                            hideStick={false}
                            blurOnFilled={true}
                            disabled={false}
                            type="numeric"
                            secureTextEntry={false}
                            focusStickBlinkingDuration={500}
                            onTextChange={(text) => {
                                setOtp(text);
                                if (haserror) setHaserror(false);
                            }}
                            onFilled={(text) => setOtp(text)}

                            textInputProps={{
                                accessibilityLabel: 'One-Time Password',
                            }}
                            theme={{
                                filledPinCodeContainerStyle: {
                                    borderRadius: 8,
                                    height: 50,
                                    width: 45,
                                    borderColor: haserror ? "red" : '#3366FF',
                                },
                                focusedPinCodeContainerStyle: {
                                    borderColor: '#3366FF',
                                    borderRadius: 8,
                                    height: 50,
                                    width: 45,
                                },
                                pinCodeContainerStyle: {
                                    borderRadius: 8,
                                    height: 50,
                                    width: 45,
                                    borderColor: '#E6E6E6',
                                    backgroundColor: "#FAFAFA"
                                },
                                pinCodeTextStyle: {
                                    color: haserror ? "red" : "#3366FF",
                                    fontSize: 20
                                }
                            }}
                        />
                    </View>


                    <CommonButton
                        textstyle={styles.buttonText}
                        outerstyle={styles.button}
                        btnname="Verify"
                        loading={loading}
                        onClick={() => VerifyOtp()}
                    />

                    {
                        !isResendEnabled && <Text style={{ textAlign: "center", fontSize: 16, fontWeight: "500", color: "#3366FF", marginTop: 30 }}>{formatTime(timer)}</Text>
                    }
                    <View
                        style={{
                            flexDirection: "row",
                            alignSelf: "center",
                            marginTop: 20,
                        }}
                    >
                        <Text
                            style={{ fontSize: 12, fontWeight: "500", color: "#6C7278" }}
                        >
                            Didn’t receive OTP?
                        </Text>
                        <TouchableOpacity onPress={handleResend} >
                            <Text
                                style={{
                                    marginLeft: 6,
                                    fontSize: 12,
                                    fontWeight: "600",
                                    color: "#3366FF",
                                }}
                            >
                                Resend Now
                            </Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </SafeAreaView>
    );
};

export default Verification;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    topSection: {
        height: "35%",
        width: "100%",
    },
    image: {
        height: "100%",
        width: "100%",
        resizeMode: "cover",
    },
    bottomSection: {
        height: "65%",
        backgroundColor: "#fff",
        borderTopStartRadius: 24,
        borderTopEndRadius: 24,
        marginTop: -30,
        flexGrow: 1,
    },
    button: {
        height: 48,
        width: "100%",
        backgroundColor: "#3366FF",
        alignSelf: "center",
        borderRadius: 10,
        marginTop: 20,
    },
    buttonText: {
        fontSize: 14,
        color: "#fff",
        fontWeight: "600",
    },
});

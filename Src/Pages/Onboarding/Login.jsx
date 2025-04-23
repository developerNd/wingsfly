import React, { useState } from 'react';
import {
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import CommonButton from '../../Components/Button/CommonButton';
import { useNavigation } from '@react-navigation/native';
import { Route } from '../../Helper/Contants/Route';
import { LoginApi } from '../../Services/Auth';
import ToastUtil from '../../Helper/Toast';

const Login = () => {
    const navigation = useNavigation();
    const [phonenumer, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false)

    const HandleLogin = async () => {
        if (!phonenumer) {
            ToastUtil.error('Error!', 'Phone number is required.');
            return
        }
        if (phonenumer.length !== 10) {
            ToastUtil.error('Error!', 'Phone number must be 10 digit.');
            return
        }
        setLoading(true)
        try {
            let response = await LoginApi({
                phone: phonenumer,
                role: 'staff',
            });
            if (response.status === 200) {
                console.log(response)
                ToastUtil.success("Success!", `Otp Send Successfully ${response.data}`)
                navigation.navigate(Route.OTPVERIFICATION_SCREEN, {
                    phonenumber: phonenumer
                });
            } else {
                ToastUtil.error("Error!", response.message)

            }
        } catch (error) {
        } finally {
            setLoading(false)

        }

    };

    return (
        <SafeAreaView style={Styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1 }}
                        keyboardShouldPersistTaps="handled">
                        <View style={{ flex: 1 }}>
                            <Image
                                style={Styles.logo}
                                source={require('../../Assets/Images/Logobac.png')}
                            />

                            <View style={Styles.bottomSection}>
                                <Text style={Styles.title}>Save Smart, Earn Rewards</Text>

                                <View style={Styles.lineContainer}>
                                    <View style={Styles.leftLine} />
                                    <Text style={Styles.lineText}>Login or Sign up</Text>
                                    <View style={Styles.rightLine} />
                                </View>

                                <View style={Styles.inputContainer}>
                                    <Text style={Styles.label}>Phone Number</Text>

                                    <View style={Styles.phoneRow}>
                                        <View style={Styles.flagBox}>
                                            <Image source={require('../../Assets/Icons/flag.png')} />
                                        </View>

                                        <View style={Styles.phoneInputWrapper}>
                                            <View style={Styles.codeWrapper}>
                                                <Text style={Styles.fixedCode}>+91</Text>
                                            </View>
                                            <TextInput
                                                style={Styles.input}
                                                keyboardType="number-pad"
                                                maxLength={10}
                                                placeholder="Enter phone number"
                                                value={phonenumer}
                                                onChangeText={text => setPhoneNumber(text)}
                                            />
                                        </View>
                                    </View>

                                    <CommonButton
                                        textstyle={Styles.buttonText}
                                        outerstyle={[Styles.button]}
                                        btnname="Send OTP"
                                        loading={loading}
                                        onClick={() => HandleLogin()}
                                    />
                                </View>

                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignSelf: 'center',
                                        marginTop: 20,
                                    }}>
                                    <Text
                                        style={{ fontSize: 12, fontWeight: '500', color: '#6C7278' }}>
                                        Don’t have an account?
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate(Route.SIGNUP_SCREEN)}>
                                        <Text
                                            style={{
                                                marginLeft: 6,
                                                fontSize: 12,
                                                fontWeight: '600',
                                                color: '#3366FF',
                                            }}>
                                            Sign Up
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={Styles.footer}>
                                <Text style={Styles.footerText}>
                                    By continuing you accept our{' '}
                                    <Text
                                        style={Styles.linkText}
                                        onPress={() => console.log('Terms of Service clicked')}>
                                        Terms of Service
                                    </Text>
                                    . Also learn how we process your data in our{' '}
                                    <Text
                                        style={Styles.linkText}
                                        onPress={() => console.log('Privacy Policy clicked')}>
                                        Privacy Policy
                                    </Text>{' '}
                                    and{' '}
                                    <Text
                                        style={Styles.linkText}
                                        onPress={() => console.log('Cookies Policy clicked')}>
                                        Cookies Policy
                                    </Text>
                                    .
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default Login;

const Styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    logo: {
        width: '100%',
        resizeMode: 'cover',
        borderBottomRightRadius: 25,
        borderBottomLeftRadius: 25,
    },
    bottomSection: {
        width: '90%',
        alignSelf: 'center',
    },
    title: {
        textAlign: 'center',
        marginTop: 30,
        fontWeight: '700',
        fontSize: 22,
    },
    lineContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 30,
    },
    leftLine: {
        width: '30%',
        height: 20,
        borderColor: '#E6E6E6',
        borderStartWidth: 1,
        borderTopWidth: 1,
        borderTopStartRadius: 20,
    },
    rightLine: {
        width: '30%',
        height: 20,
        borderColor: '#E6E6E6',
        borderEndWidth: 1,
        borderTopWidth: 1,
        borderTopEndRadius: 20,
    },
    lineText: {
        width: '40%',
        textAlign: 'center',
        marginTop: -18,
        fontSize: 12,
        color: '#999999',
        fontWeight: '500',
    },
    inputContainer: {
        width: '100%',
        alignSelf: 'center',
        marginTop: 30,
    },
    label: {
        fontSize: 12,
        color: '#6C7278',
        fontWeight: '500',
        marginBottom: 5,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    flagBox: {
        height: 46,
        width: 50,
        borderWidth: 1,
        borderRadius: 10,
        borderColor: '#EDF1F3',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    phoneInputWrapper: {
        width: '80%',
        flexDirection: 'row',
        borderWidth: 1,
        height: 46,
        borderColor: '#EDF1F3',
        borderRadius: 10,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    codeWrapper: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fixedCode: {
        fontSize: 14,
        color: '#000',
    },
    input: {
        flex: 1,
        height: '100%',
        paddingLeft: 1,
        fontSize: 14,
        color: '#000',
        fontWeight: '400',
    },
    button: {
        height: 48,
        width: '100%',
        backgroundColor: '#3366FF',
        alignSelf: 'center',
        borderRadius: 10,
        marginTop: 20,
    },
    buttonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    footer: {
        width: '90%',
        alignSelf: 'center',
        marginTop: 45,
    },
    footerText: {
        fontSize: 10,
        color: '#6C7278',
        lineHeight: 18,
        textAlign: 'center',
    },
    linkText: {
        color: '#3366FF',
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
});

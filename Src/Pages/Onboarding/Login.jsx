import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TextInput,
    SafeAreaView,
    TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CustomButton from '../../Components/CustomButton';
import { colors, routes } from '../../Helper/Contants';
import Logo from '../../Assests/Images/brand.svg';
import { useNavigation } from '@react-navigation/native';

const Login = () => {
    const [username, setUserName] = useState('');
    const [password, setPassword] = useState('');

    const navigation = useNavigation()

    return (
        <LinearGradient
            colors={['#94BCEB', '#D9DDDF', '#94BCEB']}
            start={{ x: 2, y: 0.01 }}
            end={{ x: 0.1, y: 1.3 }}
            style={styles.container}
        >
            <SafeAreaView style={styles.container}>
                <Logo width={100} height={100} style={styles.logo} />
                <View style={styles.innerContainer}>
                    <Text style={styles.signText}>Sign in to your Account</Text>
                    <Text style={styles.signsmallText}>
                        Enter your email and password to log in
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            value={username}
                            onChangeText={text => setUserName(text)}
                            placeholder="Enter Your Username"
                            style={styles.inputbox}
                        />
                        <TextInput
                            value={password}
                            onChangeText={text => setPassword(text)}
                            placeholder="Enter Your Password"
                            secureTextEntry
                            style={styles.inputbox}
                        />
                    </View>

                    <CustomButton
                        buttonStyle={styles.loginButton}
                        TextStyle={styles.loginButtonText}
                        text="Login"
                        onClick={() => navigation.navigate(routes.GENDERSELECTION_SCREEN)}
                    />

                    <View style={styles.separator}>
                        <Text style={styles.line}></Text>
                        <Text style={styles.orText}>OR</Text>
                        <Text style={styles.line}></Text>
                    </View>

                    <TouchableOpacity onPress={() => navigation.navigate(routes.SIGNUP_SCREEN)} style={styles.signupContainer}>
                        <Text style={styles.signupText}>
                            New user? <Text style={styles.signupLink}>Sign up</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

export default Login;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    logo: {
        height: 100,
        width: 100,
        alignSelf: 'center',
        marginTop: 20,
    },
    innerContainer: {
        width: '80%',
        alignSelf: 'center',
        marginTop: 15,
    },
    signText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
        letterSpacing: 1,
    },
    signsmallText: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: '500',
        color: 'gray',
    },
    inputContainer: {
        marginTop: 20,
    },
    inputbox: {
        width: '100%',
        height: 50,
        backgroundColor: '#fff',
        marginTop: 25,
        borderRadius: 8,
        paddingLeft: 15,
    },
    loginButton: {
        height: 50,
        backgroundColor: colors.PRIMARY,
        marginTop: 30,
        borderRadius: 10,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '500',
        letterSpacing: 1,
    },
    separator: {
        flexDirection: 'row',
        marginTop: 40,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    line: {
        width: '40%',
        height: 1,
        backgroundColor: 'gray',
    },
    orText: {
        textAlign: 'center',
        fontSize: 14,
        color: '#000',
    },
    signupContainer: {
        marginTop: 25,
        alignSelf: 'center',
    },
    signupText: {
        fontSize: 14,
        color: '#000',
    },
    signupLink: {
        fontWeight: 'bold',
        color: colors.PRIMARY,
    },
});

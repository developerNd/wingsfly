import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    SafeAreaView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CustomButton from '../../Components/CustomButton';
import { colors, routes } from '../../Helper/Contants';
import Logo from '../../assets/Images/brand.svg';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../supabase';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        setLoading(false);

        if (error) {
            Alert.alert('Login Failed', error.message);
        } else {
            console.log('Login successful');
        }
    };

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
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter Your Email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={styles.inputbox}
                            editable={!loading}
                        />
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter Your Password"
                            secureTextEntry
                            style={styles.inputbox}
                            editable={!loading}
                        />
                    </View>

                    <CustomButton
                        buttonStyle={[styles.loginButton, loading && styles.disabledButton]}
                        TextStyle={styles.loginButtonText}
                        text={loading ? "Logging in..." : "Login"}
                        onClick={handleLogin}
                        disabled={loading}
                    />

                    <View style={styles.separator}>
                        <Text style={styles.line}></Text>
                        <Text style={styles.orText}>OR</Text>
                        <Text style={styles.line}></Text>
                    </View>

                    <TouchableOpacity 
                        onPress={() => navigation.navigate(routes.SIGNUP_SCREEN)} 
                        style={styles.signupContainer}
                        disabled={loading}
                    >
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
        color: colors.Shadow,
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
        backgroundColor: colors.Primary,
        marginTop: 30,
        borderRadius: 10,
    },
    disabledButton: {
        backgroundColor: '#ccc',
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
        color: colors.Shadow,
    },
    signupContainer: {
        marginTop: 25,
        alignSelf: 'center',
    },
    signupText: {
        fontSize: 14,
        color: colors.Shadow,
    },
    signupLink: {
        fontWeight: 'bold',
        color: colors.Primary,
    },
});
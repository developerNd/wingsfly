import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import CustomButton from '../../Components/CustomButton';
import { colors, routes } from '../../Helper/Contants';
import Logo from '../../assets/Images/brand.svg';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../supabase';
import { HP, WP, FS } from '../../utils/dimentions';

// Storage keys for remember me functionality
const STORAGE_KEYS = {
    REMEMBER_ME: 'remember_me',
    SAVED_EMAIL: 'saved_email',
    SAVED_PASSWORD: 'saved_password',
};

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const navigation = useNavigation();

    // Load saved credentials when component mounts
    useEffect(() => {
        loadSavedCredentials();
    }, []);

    const loadSavedCredentials = async () => {
        try {
            const savedRememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
            
            if (savedRememberMe === 'true') {
                const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_EMAIL);
                const savedPassword = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_PASSWORD);
                
                if (savedEmail) setEmail(savedEmail);
                if (savedPassword) setPassword(savedPassword);
                setRememberMe(true);
            }
        } catch (error) {
            console.error('Error loading saved credentials:', error);
        }
    };

    const saveCredentials = async (emailToSave, passwordToSave) => {
        try {
            if (rememberMe) {
                await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
                await AsyncStorage.setItem(STORAGE_KEYS.SAVED_EMAIL, emailToSave);
                await AsyncStorage.setItem(STORAGE_KEYS.SAVED_PASSWORD, passwordToSave);
            } else {
                // Clear saved credentials if remember me is unchecked
                await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
                await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_EMAIL);
                await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_PASSWORD);
            }
        } catch (error) {
            console.error('Error saving credentials:', error);
        }
    };

    const clearSavedCredentials = async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
            await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_EMAIL);
            await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_PASSWORD);
        } catch (error) {
            console.error('Error clearing credentials:', error);
        }
    };

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
            // Save credentials if login is successful
            await saveCredentials(email, password);
            console.log('Login successful');
        }
    };

    const handleRememberMeToggle = async () => {
        const newRememberMeState = !rememberMe;
        setRememberMe(newRememberMeState);
        
        // If unchecking remember me, clear saved credentials immediately
        if (!newRememberMeState) {
            await clearSavedCredentials();
        }
    };

    return (
        <LinearGradient
            colors={['#94BCEB', '#D9DDDF', '#94BCEB']}
            start={{ x: 2, y: 0.01 }}
            end={{ x: 0.1, y: 1.3 }}
            style={styles.container}
        >
            <StatusBar 
                backgroundColor="#b4cfee" 
                barStyle="dark-content"
                translucent={false}
            />
            <SafeAreaView style={styles.container}>
                <Logo width={WP(28)} height={WP(28)} style={styles.logo} />
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

                    {/* Remember Me Checkbox */}
                    <TouchableOpacity 
                        style={styles.rememberMeContainer} 
                        onPress={handleRememberMeToggle}
                        disabled={loading}
                    >
                        <View style={[styles.checkbox, rememberMe && styles.checkedCheckbox]}>
                            {rememberMe && (
                                <MaterialIcons 
                                    name="check" 
                                    size={FS(1.6)} 
                                    color={colors.White} 
                                />
                            )}
                        </View>
                        <Text style={styles.rememberMeText}>Remember Me</Text>
                    </TouchableOpacity>

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
        height: WP(25),
        width: WP(25),
        alignSelf: 'center',
        marginTop: HP(2.5),
    },
    innerContainer: {
        width: '80%',
        alignSelf: 'center',
        marginTop: HP(2),
    },
    signText: {
        fontSize: FS(4.3),
        fontWeight: 'bold',
        color: colors.Shadow,
        letterSpacing: 1,
    },
    signsmallText: {
        marginTop: HP(1.2),
        fontSize: FS(1.9),
        fontWeight: '500',
        color: 'gray',
    },
    inputContainer: {
        marginTop: HP(3),
    },
    inputbox: {
        width: '100%',
        height: HP(6.6),
        backgroundColor: colors.White,
        marginTop: HP(3.1),
        borderRadius: WP(2),
        paddingLeft: WP(4),
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: HP(2.5),
        marginLeft: WP(1),
    },
    checkbox: {
        width: WP(4.5),
        height: WP(4.5),
        borderWidth: 2,
        borderColor: colors.Primary,
        borderRadius: WP(1),
        marginRight: WP(2.5),
        backgroundColor: colors.White,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkedCheckbox: {
        backgroundColor: colors.Primary,
        borderColor: colors.Primary,
    },
    rememberMeText: {
        fontSize: FS(1.8),
        color: colors.Shadow,
        fontWeight: '500',
    },
    loginButton: {
        height: HP(6.6),
        backgroundColor: colors.Primary,
        marginTop: HP(3.8),
        borderRadius: WP(2.5),
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    loginButtonText: {
        color: colors.White,
        fontSize: FS(2.4),
        fontWeight: '500',
        letterSpacing: 1,
    },
    separator: {
        flexDirection: 'row',
        marginTop: HP(5),
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    line: {
        width: WP(33),
        height: HP(0.15),
        backgroundColor: 'gray',
    },
    orText: {
        textAlign: 'center',
        fontSize: FS(1.6),
        color: colors.Shadow,
    },
    signupContainer: {
        marginTop: HP(3.1),
        alignSelf: 'center',
    },
    signupText: {
        fontSize: FS(1.8),
        color: colors.Shadow,
    },
    signupLink: {
        fontWeight: 'bold',
        color: colors.Primary,
    },
});
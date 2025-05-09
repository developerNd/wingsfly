import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, routes } from '../../Helper/Contants';
import CustomButton from '../../Components/CustomButton';
import { useNavigation } from '@react-navigation/native';

const GenderSelection = ({ onContinue }) => {
    const [selectedGender, setSelectedGender] = useState('');
    const [loading, setLoading] = useState(false);
    const scaleFemale = new Animated.Value(1);
    const scaleMale = new Animated.Value(1);

    const navigation = useNavigation()

    const handlePress = (gender) => {
        if (gender === 'Female') {
            Animated.spring(scaleFemale, {
                toValue: 1.1,
                friction: 5,
                useNativeDriver: true,
            }).start();
            setSelectedGender('Female');
        } else if (gender === 'Male') {
            Animated.spring(scaleMale, {
                toValue: 1.1,
                friction: 5,
                useNativeDriver: true,
            }).start();
            setSelectedGender('Male');
        }
    };

    const resetScale = () => {
        Animated.spring(scaleFemale, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
        }).start();
        Animated.spring(scaleMale, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    const handleContinue = async () => {
        navigation.navigate(routes.ONBOARD_SCREEN)
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : null}
        >
            <View style={styles.innerContainer}>
                <Text style={styles.title}>Select your gender</Text>
                <View style={styles.options}>
                    <TouchableOpacity
                        onPress={() => handlePress('Female')}
                        onPressOut={resetScale}
                        style={styles.option}
                    >
                        <Animated.View
                            style={[
                                styles.box,
                                { transform: [{ scale: scaleFemale }] },
                                selectedGender === 'Female' && styles.selectedBox,
                            ]}
                        >
                            <Image
                                source={require('../../Assests/Images/female.png')}
                                style={styles.image}
                            />
                        </Animated.View>
                        <Text style={[styles.label, selectedGender === 'Female' && styles.selectedLabel]}>
                            Female
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handlePress('Male')}
                        onPressOut={resetScale}
                        style={styles.option}
                    >
                        <Animated.View
                            style={[
                                styles.box,
                                { transform: [{ scale: scaleMale }] },
                                selectedGender === 'Male' && styles.selectedBox,
                            ]}
                        >
                            <Image
                                source={require('../../Assests/Images/male.png')}
                                style={styles.image}
                            />
                        </Animated.View>
                        <Text style={[styles.label, selectedGender === 'Male' && styles.selectedLabel]}>
                            Male
                        </Text>
                    </TouchableOpacity>
                </View>

                {selectedGender && (
                    <CustomButton
                        buttonStyle={styles.continueButton}
                        TextStyle={styles.continueButtonText}
                        text="Continue"
                        loading={loading}
                        onClick={handleContinue}
                    />
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: '#F5F5F5',
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 40,
        color: colors.PRIMARY,
    },
    options: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginBottom: 30,
    },
    option: {
        alignItems: 'center',
        marginHorizontal: 10,
    },
    box: {
        height: 120,
        width: 120,
        borderRadius: 12,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        elevation: 5,
    },
    selectedBox: {
        borderColor: colors.PRIMARY,
        borderWidth: 3,
    },
    image: {
        height: 60,
        width: 60,
        resizeMode: 'contain',
    },
    label: {
        marginTop: 8,
        fontSize: 16,
        color: '#000',
    },
    selectedLabel: {
        fontWeight: 'bold',
        color: colors.PRIMARY,
    },
    continueButton: {
        width: '80%',
        height: 50,
        backgroundColor: colors.PRIMARY,
        marginTop: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '500',
    },
});

export default GenderSelection;

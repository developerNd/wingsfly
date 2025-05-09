import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

const CustomButton = ({ buttonStyle, TextStyle, text, loading, onClick }) => {
    return (
        <TouchableOpacity disabled={loading} style={buttonStyle} onPress={onClick}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                {loading ? (
                    <ActivityIndicator size={26} color="#fff"></ActivityIndicator>
                ) : (
                    <Text style={TextStyle}>{text}</Text>
                )}
            </View>

        </TouchableOpacity>
    );
};

export default CustomButton;

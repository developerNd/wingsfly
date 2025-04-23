import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import ArrowIcon from 'react-native-vector-icons/AntDesign';

const CommonButton = ({ textstyle, outerstyle, loading = false, btnname, arrow = true,onClick }) => {
    return (
        <TouchableOpacity disabled={loading} style={outerstyle} onPress={onClick}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <View style={{ flexDirection: 'row', justifyContent: "center", alignItems: "center" }}>
                    {
                        loading
                            ? <ActivityIndicator size={22} color="#fff" />
                            : <>
                                <Text style={textstyle}>{btnname}</Text>
                                {
                                    arrow && <ArrowIcon name="arrowright" size={17} color="#fff" style={{ marginLeft: 5 }} />
                                }

                            </>
                    }
                </View>
            </View>

        </TouchableOpacity>
    );
};

export default CommonButton;

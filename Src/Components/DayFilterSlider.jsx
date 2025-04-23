import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import FilterIcon from 'react-native-vector-icons/Ionicons'
import ArrowIcon from 'react-native-vector-icons/SimpleLineIcons'

const DayfilterSlider = () => {
    const filteroption = ["Today", "Week", "Month", "Year", "Lifetime"]
    return (
        <View style={{ width: "100%", marginTop: 20 }}>
            <View style={{ width: "90%", alignSelf: "center", flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ borderWidth: 1, borderColor: "#D5D7DA", height: 28, borderRadius: 8, padding: 3 }}>
                    <FilterIcon name="filter-outline" size={20}></FilterIcon>
                </View>
                {
                    filteroption.map((item, index) => (
                        <TouchableOpacity style={{ borderWidth: 1, borderColor: "#D5D7DA", height: 28, paddingTop: 5, paddingBottom: 6, paddingLeft: 10, paddingRight: 10, borderRadius: 8 }}>
                            <Text style={{ fontSize: 10, fontWeight: "600", color: "#000" }}>{item}</Text>
                        </TouchableOpacity>
                    ))
                }

            </View>
            <View style={{ flexDirection: "row", width: "90%", alignSelf: "center", justifyContent: "space-between", marginTop: 18 }}>
                <TouchableOpacity>
                    <ArrowIcon name="arrow-left" size={10} color="#fff" style={{ backgroundColor: "#000", padding: 5, borderRadius: 50 }}></ArrowIcon>
                </TouchableOpacity>

                <Text>Wednesday, 8 Jan 2024</Text>
                <TouchableOpacity>
                    <ArrowIcon name="arrow-right" size={10} color="#fff" style={{ backgroundColor: "#000", padding: 5, borderRadius: 50 }}></ArrowIcon>
                </TouchableOpacity>

            </View>
        </View>
    )
}

export default DayfilterSlider
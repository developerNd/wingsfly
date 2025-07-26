import React from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { colors, Icons } from '../../Helper/Contants';
import Headers from '../../Components/Headers';
import { useNavigation } from '@react-navigation/native';

const TaskCard = () => {
    const navigation = useNavigation()
    return (
        <SafeAreaView style={styles.container}>
            <View style={{ marginTop: 20 }}>
                <Headers></Headers>
            </View>
            <ScrollView>
                <View style={{ marginTop: 30, width: "95%", alignSelf: "center" }}>
                    <ImageBackground
                        style={styles.image}
                        source={Icons.Task1}
                        imageStyle={{ borderRadius: 12 }}
                    >
                        <TouchableOpacity style={styles.button} onClick={() => navigation.navigate(routes.HOME_SCREEN)} >
                            <TouchableOpacity style={{ width: "95%", height: 65, backgroundColor: "#fff", position: "absolute", bottom: 10, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: "600", textAlign: "center", marginTop: 5 }}>Set Long-Term Goal</Text>
                                <Text style={{ textAlign: "center", fontSize: 12, fontWeight: "400", width: "80%", alignSelf: "center", marginTop: 10 }}>Define your target, identity milestones, and create an action plan</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </ImageBackground>

                    <ImageBackground
                        style={styles.image}
                        source={Icons.Task3}
                        imageStyle={{ borderRadius: 12 }}
                    >
                        <TouchableOpacity style={styles.button}>
                            <TouchableOpacity style={{ width: "95%", height: 65, backgroundColor: "#fff", position: "absolute", bottom: 10, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: "600", textAlign: "center", marginTop: 5 }}>Set Recurring Goal</Text>
                                <Text style={{ textAlign: "center", fontSize: 12, fontWeight: "400", width: "80%", alignSelf: "center", marginTop: 15 }}>Create a routine and set schedule</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </ImageBackground>

                    <ImageBackground
                        style={styles.image}
                        source={Icons.Task2}
                        imageStyle={{ borderRadius: 12 }}
                    >
                        <TouchableOpacity style={styles.button}>
                            <TouchableOpacity style={{ width: "95%", height: 65, backgroundColor: "#fff", position: "absolute", bottom: 10, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: "600", textAlign: "center", marginTop: 5 }}>Plan Your Day</Text>
                                <Text style={{ textAlign: "center", fontSize: 12, fontWeight: "400", width: "80%", alignSelf: "center", marginTop: 15 }}>Create Today’s To Do List</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </ImageBackground>

                    <View style={{ width: "90%", alignSelf: "center", marginTop: 35 }}>
                        <TouchableOpacity style={styles.button}>
                            <TouchableOpacity style={{ width: "95%", height: 65, backgroundColor: "#fff", position: "absolute", bottom: 10, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: "600", textAlign: "center", marginTop: 5 }}>Custom Goals</Text>
                                <Text style={{ textAlign: "center", fontSize: 12, fontWeight: "400", width: "80%", alignSelf: "center", marginTop: 10 }}>Set personalized targets tailored to your needs</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ marginBottom: 100 }}></View>
            </ScrollView>



        </SafeAreaView>
    );
};

export default TaskCard;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff"
    },
    image: {
        height: 185,
        justifyContent: 'flex-end',
        padding: 16,
    },
    button: {
        backgroundColor: colors.PRIMARY,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.9,
        marginTop: 20,
        position:"relative",
        top:10
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
    },
    title: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: '500',
        alignSelf: 'center',
    },
});

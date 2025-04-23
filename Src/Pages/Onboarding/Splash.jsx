import { useNavigation } from "@react-navigation/native";
import React, { useEffect } from "react";
import { Image, View } from "react-native";
import { Route } from "../../Helper/Contants/Route";

const Splash = () => {
    const navigation = useNavigation();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigation.reset({
                index: 0,
                routes: [{ name: Route.LOGIN_SCREEN }],
            });
        }, 2000);

        return () => clearTimeout(timer);
    }, [navigation]);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Image source={require('../../Assets/Images/mainlogo.png')} />
        </View>
    );
};

export default Splash;

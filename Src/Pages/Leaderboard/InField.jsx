import React from "react";
import { View, Text, StyleSheet, Image, ScrollView, Platform } from "react-native";
import { BlurView } from "@react-native-community/blur";

const LeaderboardItem = ({ rank, userName, storeName, points, imageUrl, isYou }) => {
    return (
        <View style={[styles.itemContainer, isYou && styles.highlightedItem]}>
            <Text style={[styles.rankText,{ color: isYou ? "#FF8533" : "#000" }]}>{rank}</Text>
            <View style={styles.profileContainer}>
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.profileImage}

                />
                <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: isYou ? "#FF8533" : "#000" }]}>{userName}{isYou && " You"}</Text>
                </View>
                <View style={styles.userInfo}>
                    <Text style={[styles.storeName, { color: isYou ? "#FF8533" : "#000" }]}>{storeName}</Text>
                </View>
            </View>
            <Text style={styles.pointsText}>{points} pts</Text>
        </View>
    );
};

const Infield = () => {
    const leaderboardData = [
        { id: 1, rank: 1, userName: "", storeName: "Sujal Restaurant...", points: 30, imageUrl: "https://randomuser.me/api/portraits/men/32.jpg", isYou: true },
        { id: 2, rank: 2, userName: "Juanita Veum", storeName: "Sujal Restaurant...", points: 30, imageUrl: "https://randomuser.me/api/portraits/women/44.jpg", isYou: false },
        { id: 3, rank: 3, userName: "Marsha Fisher", storeName: "Sujal Restaurant...", points: 30, imageUrl: "https://randomuser.me/api/portraits/women/55.jpg", isYou: false },
        { id: 4, rank: 4, userName: "Tamara Bartell", storeName: "Sujal Restaurant...", points: 30, imageUrl: "https://randomuser.me/api/portraits/women/68.jpg", isYou: false },
        { id: 5, rank: 5, userName: "Ricardo Veum", storeName: "Sujal Restaurant...", points: 30, imageUrl: "https://randomuser.me/api/portraits/men/41.jpg", isYou: false },
        { id: 6, rank: 6, userName: "Gary Sanford", storeName: "Sujal Restaurant...", points: 30, imageUrl: "https://randomuser.me/api/portraits/men/52.jpg", isYou: false },
        { id: 7, rank: 7, userName: "Becky Bartell", storeName: "Sujal Restaurant...", points: 30, imageUrl: "https://randomuser.me/api/portraits/women/33.jpg", isYou: false },
    ];

    return (
        <View style={styles.container}>
            {Platform.OS === "ios" && (
                <BlurView
                    style={styles.blur}
                    blurType="light"
                    blurAmount={10}
                    reducedTransparencyFallbackColor="#F5F7FB"
                />
            )}
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Leaderboard</Text>
                </View>

                <View style={styles.columnLabels}>
                    <Text style={styles.rankLabel}>RANK</Text>
                    <Text style={styles.userNameLabel}>USER NAME</Text>
                    <Text style={styles.storeLabel}>STORE NAME</Text>
                    <Text style={styles.pointsLabel}>POINTS</Text>
                </View>

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {leaderboardData.map((item) => (
                        <LeaderboardItem
                            key={item.id}
                            rank={item.rank}
                            userName={item.userName}
                            storeName={item.storeName}
                            points={item.points}
                            imageUrl={item.imageUrl}
                            isYou={item.isYou}
                        />
                    ))}
                    <View style={{ marginBottom: 250 }}></View>
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: 500,
        backgroundColor: Platform.OS === "ios" ? "transparent" : "#F5F7FB",
        borderTopLeftRadius: 25, borderTopRightRadius: 25,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        marginTop: 20
    },
    blur: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        width: "90%",
        alignSelf: "center",
        height: "100%",
        marginTop: 20
    },
    header: {
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FF8533",
    },
    columnLabels: {
        flexDirection: "row",
        paddingVertical: 8,
        borderBottomColor: "#E4E9F2",
    },
    rankLabel: {
        flex: 1,
        fontSize: 10,
        color: "#8F9BB3",
        fontWeight: "500",
    },
    userNameLabel: {
        flex: 4,
        fontSize: 10,
        color: "#8F9BB3",
        fontWeight: "500",
        paddingLeft: 30,
    },
    storeLabel: {
        flex: 4,
        fontSize: 10,
        color: "#8F9BB3",
        fontWeight: "500",
    },
    pointsLabel: {
        flex: 2,
        fontSize: 10,
        color: "#8F9BB3",
        fontWeight: "500",
        textAlign: "right",
    },
    scrollView: {
        flex: 1,
    },
    itemContainer: {
        flexDirection: "row",
        alignItems: "center",
        height: 46,
        paddingHorizontal: 12
    },
    highlightedItem: {
        backgroundColor: 'rgb(250, 251, 248)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#FFD4B8"
    },
    rankText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "700",
        color: "#2E3A59",
    },
    profileContainer: {
        flex: 8,
        flexDirection: "row",
        alignItems: "center",
    },
    profileImage: {
        width: 36,
        height: 36,
        borderRadius: 18, // Make the image circular
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 10,
        fontWeight: "500",
        color: "#2E3A59",
    },
    storeName: {
        fontSize: 10,
        color: "#4F4F4F",
        fontWeight: "600"
    },
    pointsText: {
        flex: 2,
        fontSize: 14,
        fontWeight: "600",
        color: "#2E3A59",
        textAlign: "right",
    },
});

export default Infield;
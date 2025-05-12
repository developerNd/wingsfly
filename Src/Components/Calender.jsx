import React, { useState, useEffect } from "react";
import { FlatList, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../Helper/Contants";

const Calender = () => {
  const [days, setDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    const totalDays = new Date(year, month + 1, 0).getDate();

    const dates = [];
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const weekday = date.toLocaleDateString("en-US", { weekday: "short" }); // "Mon"
      dates.push({
        day,
        weekday,
        fullDate: date.toDateString(),
      });
    }
    setDays(dates);
  }, []);

  const handleSelect = (dateStr) => {
    setSelectedDate(dateStr);
  };

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={days}
        keyExtractor={(item) => item.fullDate}
        renderItem={({ item }) => {
          const isSelected = selectedDate === item.fullDate;
          return (
            <TouchableOpacity onPress={() => handleSelect(item.fullDate)}>
              <View style={[styles.card, isSelected && styles.selectedCard]}>
                <View style={styles.dayContainer}>
                  <Text style={[styles.dayText, isSelected && styles.selectedText]}>
                    {item.weekday}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dateContainer,
                    isSelected && styles.selectedDateContainer,
                  ]}
                >
                  <Text
                    style={[styles.dateText, isSelected && styles.selectedText]}
                  >
                    {item.day}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ gap: 10 }}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "90%",
    alignSelf: "center",
    marginTop: 20,
  },
  card: {
    width: 55,
    height: 65,
    backgroundColor: "#F4F4F4",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCard: {
    backgroundColor: "#CDE7FF",
  },
  dayContainer: {
    width: "100%",
    height: "40%",
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  dateContainer: {
    width: "100%",
    height: "60%",
    backgroundColor: "#E9E9E9",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedDateContainer: {
    backgroundColor: colors.PRIMARY
  },
  dateText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  selectedText: {
    color: "#fff",
  },
});

export default Calender;

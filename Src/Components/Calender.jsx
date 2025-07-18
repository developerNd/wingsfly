import React, { useState, useEffect } from "react";
import { FlatList, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../Helper/Contants";

const Calender = () => {
  const [days, setDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const now = new Date();
    const dates = [];

    // Generate past 30 days
    for (let i = 30; i >= 1; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
      dates.push({
        day: date.getDate(),
        weekday,
        fullDate: date.toDateString(),
        isPast: true,
        isToday: false,
      });
    }

    // Add today
    const today = new Date(now);
    const todayWeekday = today.toLocaleDateString("en-US", { weekday: "short" });
    dates.push({
      day: today.getDate(),
      weekday: todayWeekday,
      fullDate: today.toDateString(),
      isPast: false,
      isToday: true,
    });

    // Generate next 30 days
    for (let i = 1; i <= 30; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
      dates.push({
        day: date.getDate(),
        weekday,
        fullDate: date.toDateString(),
        isPast: false,
        isToday: false,
      });
    }

    setDays(dates);
    
    // Auto-select today's date
    setSelectedDate(today.toDateString());
  }, []);

  const handleSelect = (dateStr) => {
    setSelectedDate(dateStr);
  };

  if (days.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={days}
        keyExtractor={(item, index) => `${item.fullDate}-${index}`}
        renderItem={({ item }) => {
          const isSelected = selectedDate === item.fullDate;
          const isToday = item.isToday;
          
          return (
            <TouchableOpacity onPress={() => handleSelect(item.fullDate)}>
              <View style={[
                styles.card, 
                (isSelected || isToday) && styles.selectedCard
              ]}>
                <View style={styles.dayContainer}>
                  <Text style={[
                    styles.dayText, 
                    (isSelected || isToday) && styles.selectedText
                  ]}>
                    {item.weekday}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dateContainer,
                    (isSelected || isToday) && styles.selectedDateContainer
                  ]}
                >
                  <Text
                    style={[
                      styles.dateText, 
                      (isSelected || isToday) && styles.selectedText
                    ]}
                  >
                    {item.day}
                  </Text>
                </View>
                
                {(isSelected || isToday) && (
                  <View style={styles.bottomIndicator} />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingHorizontal: 5 }}
        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={30}
        getItemLayout={(data, index) => ({
          length: 55,
          offset: 55 * index,
          index,
        })}
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignSelf: "center",
    marginTop: 20,
    minHeight: 56,
  },
  card: {
    width: 40,
    height: 51,
    backgroundColor: "#F4F4F4",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    overflow: 'hidden',
    position: 'relative',
  },
  selectedCard: {
    backgroundColor: "#2C3399",
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
    fontSize: 10,
    fontFamily: "OpenSans-Regular",
    color: "#636363",
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
    fontSize: 13,
    fontFamily: "OpenSans-Regular",
    color: "#636363",
  },
  selectedText: {
    color: "#FFFFFF",
  },
  bottomIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
});

export default Calender;
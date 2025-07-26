import React, {useState, useEffect} from 'react';
import {FlatList, Text, View, StyleSheet, TouchableOpacity} from 'react-native';
import {colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

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
      const weekday = date.toLocaleDateString('en-US', {weekday: 'short'});
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
    const todayWeekday = today.toLocaleDateString('en-US', {weekday: 'short'});
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
      const weekday = date.toLocaleDateString('en-US', {weekday: 'short'});
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

  const handleSelect = dateStr => {
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
        renderItem={({item}) => {
          const isSelected = selectedDate === item.fullDate;
          const isToday = item.isToday;

          return (
            <TouchableOpacity onPress={() => handleSelect(item.fullDate)}>
              <View
                style={[
                  styles.card,
                  (isSelected || isToday) && styles.selectedCard,
                ]}>
                <View style={styles.dayContainer}>
                  <Text
                    style={[
                      styles.dayText,
                      (isSelected || isToday) && styles.selectedText,
                    ]}>
                    {item.weekday}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dateContainer,
                    (isSelected || isToday) && styles.selectedDateContainer,
                  ]}>
                  <Text
                    style={[
                      styles.dateText,
                      (isSelected || isToday) && styles.selectedText,
                    ]}>
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
        contentContainerStyle={{paddingHorizontal: WP(1.3)}}
        ItemSeparatorComponent={() => <View style={{width: WP(2.7)}} />}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={25.65}
        getItemLayout={(data, index) => ({
          length: WP(14.7),
          offset: WP(14.7) * index,
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
    width: '100%',
    alignSelf: 'center',
    marginTop: HP(2.5),
    minHeight: HP(7.0),
  },
  card: {
    width: WP(11.3),
    height: HP(6.8),
    backgroundColor: '#F4F4F4',
    borderRadius: WP(4.2),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  selectedCard: {
    backgroundColor: '#2C3399',
  },
  dayContainer: {
    width: '100%',
    height: '40%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: WP(3.7),
    borderTopRightRadius: WP(3.7),
  },
  dayText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#636363',
  },
  dateContainer: {
    width: '100%',
    height: '60%',
    backgroundColor: '#E9E9E9',
    borderRadius: WP(3.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDateContainer: {
    backgroundColor: colors.Primary,
  },
  dateText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-Regular',
    color: '#636363',
  },
  selectedText: {
    color: colors.White,
  },
  bottomIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: WP(-2.1),
    width: WP(4.3),
    height: HP(0.25),
    backgroundColor: colors.White,
    borderRadius: WP(0.3),
  },
});

export default Calender;

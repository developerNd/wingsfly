import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import {HP, WP, FS} from '../utils/dimentions';
import {colors} from '../Helper/Contants';

const {width: screenWidth} = Dimensions.get('window');

const DatePickerModal = ({
  visible,
  onClose,
  onDateSelect,
  initialDate = new Date(),
  title = 'Select Date',
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    if (visible) {
      setSelectedDate(initialDate);
      setCurrentMonth(initialDate.getMonth());
      setCurrentYear(initialDate.getFullYear());
    }
  }, [visible, initialDate]);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  // Create timezone-independent date for date-only scenarios
  const createLocalDate = (year, month, day) => {
    // Create date at noon to avoid timezone issues
    const date = new Date(year, month, day, 12, 0, 0, 0);
    return date;
  };

  // Format date for display - avoiding timezone conversion
  const formatDate = date => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();

    return `${dayName}, ${monthName} ${day}`;
  };

  const navigateMonth = direction => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const handleDatePress = day => {
    // Create timezone-independent date
    const newDate = createLocalDate(currentYear, currentMonth, day);
    setSelectedDate(newDate);
  };

  const handleOK = () => {
    onDateSelect(selectedDate);
    onClose();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.dayCell}>
          <Text style={styles.dayText}></Text>
        </View>,
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth &&
        selectedDate.getFullYear() === currentYear;

      days.push(
        <TouchableOpacity
          key={day}
          style={styles.dayCell}
          onPress={() => handleDatePress(day)}
          activeOpacity={0.7}>
          <View
            style={[
              styles.dayTextContainer,
              isSelected && styles.selectedDayContainer,
            ]}>
            <Text
              style={[styles.dayText, isSelected && styles.selectedDayText]}>
              {day}
            </Text>
          </View>
        </TouchableOpacity>,
      );
    }

    return days;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <StatusBar
          backgroundColor={colors.ModelBackground}
          barStyle="dark-content"
        />
        <View style={styles.modalContainer}>
          {/* Header with selected date */}
          <View style={styles.header}>
            <View style={styles.yearContainer}>
              <Text style={styles.yearText}>{currentYear}</Text>
            </View>
            <Text style={styles.selectedDateText}>
              {formatDate(selectedDate)}
            </Text>
          </View>

          {/* Calendar content */}
          <View style={styles.calendarContainer}>
            {/* Month navigation */}
            <View style={styles.monthHeader}>
              <TouchableOpacity
                onPress={() => navigateMonth('prev')}
                style={styles.navButton}
                activeOpacity={0.7}>
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>

              <Text style={styles.monthText}>
                {months[currentMonth]} {currentYear}
              </Text>

              <TouchableOpacity
                onPress={() => navigateMonth('next')}
                style={styles.navButton}
                activeOpacity={0.7}>
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Week days header */}
            <View style={styles.weekDaysHeader}>
              {weekDays.map((day, index) => (
                <View key={index} style={styles.weekDayCell}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calendarGrid}>{renderCalendar()}</View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelButton}
              activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOK}
              style={styles.okButton}
              activeOpacity={0.7}>
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.ModelBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2),
    width: screenWidth * 0.85,
    maxHeight: HP(70),
    overflow: 'hidden',
    elevation: 10,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.5),
    },
    shadowOpacity: 0.25,
    shadowRadius: WP(1),
  },
  header: {
    backgroundColor: colors.Primary,
    paddingHorizontal: WP(6),
    paddingVertical: HP(2),
  },
  yearContainer: {
    marginBottom: HP(0.5),
  },
  yearText: {
    fontSize: FS(1.5),
    color: '#CECECE',
    fontFamily: 'OpenSans-SemiBold',
  },
  selectedDateText: {
    fontSize: FS(2.8),
    color: colors.White,
    fontFamily: 'OpenSans-SemiBold',
  },
  calendarContainer: {
    backgroundColor: colors.White,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.5),
  },
  navButton: {
    padding: WP(2),
    minWidth: WP(10),
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: FS(2.5),
    color: '#848A95',
    fontFamily: 'OpenSans-Bold',
  },
  monthText: {
    fontSize: FS(1.7),
    color: '#0F2552',
    fontFamily: 'OpenSans-SemiBold',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    paddingVertical: HP(1),
    paddingHorizontal: WP(4),
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayText: {
    fontSize: FS(1.4),
    color: '#353638',
    fontFamily: 'OpenSans-SemiBold',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: HP(1),
    paddingHorizontal: WP(4),
    width: '100%',
  },
  dayCell: {
    width: (screenWidth * 0.85 - WP(8)) / 7,
    height: HP(4.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: HP(0.35),
  },
  dayTextContainer: {
    width: WP(6.5),
    height: WP(6.5),
    borderRadius: WP(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayContainer: {
    backgroundColor: colors.Primary,
    width: WP(6.5),
    height: WP(6.5),
    borderRadius: WP(4),
  },
  dayText: {
    fontSize: FS(1.4),
    color: '#0F2552',
    fontFamily: 'OpenSans-Bold',
  },
  selectedDayText: {
    color: '#FDFDFD',
    fontFamily: 'OpenSans-Bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.7),
  },
  cancelButton: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(1),
    marginRight: WP(8),
  },
  cancelButtonText: {
    fontSize: FS(1.6),
    color: colors.Black,
    fontFamily: 'OpenSans-SemiBold',
  },
  okButton: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(1),
  },
  okButtonText: {
    fontSize: FS(1.6),
    color: colors.Primary,
    fontFamily: 'OpenSans-SemiBold',
  },
});

export default DatePickerModal;

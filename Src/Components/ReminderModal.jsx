import React, {useState} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import {HP, WP, FS} from '../utils/dimentions';
import {colors, Icons} from '../Helper/Contants';

const ReminderModal = ({visible, onClose, onSave, initialData = null}) => {
  const [reminderTime, setReminderTime] = useState(
    initialData?.time || '12:00',
  );
  const [selectedType, setSelectedType] = useState(
    initialData?.type || 'notification',
  );
  const [scheduleType, setScheduleType] = useState(
    initialData?.scheduleType || 'always',
  );
  const [daysBefore, setDaysBefore] = useState(initialData?.daysBefore || '2');
  const [hoursBefore, setHoursBefore] = useState(
    initialData?.hoursBefore || '',
  );
  const [showScheduleOptions, setShowScheduleOptions] = useState(false);

  const reminderTypes = [
    {
      id: 'dont_remind',
      label: "Don't remind",
      icon: Icons.Notificationoff,
    },
    {
      id: 'notification',
      label: 'Notification',
      icon: Icons.Notification,
    },
    {
      id: 'alarm',
      label: 'Alarm',
      icon: Icons.Alarm,
    },
  ];

  // Filter schedule options based on current selection
  const getScheduleOptions = () => {
    const allOptions = [
      {id: 'always', label: 'Always enabled'},
      {id: 'specific_days', label: 'Specific days of the week'},
      {id: 'days_before', label: 'Days before'},
    ];

    if (scheduleType === 'specific_days') {
      return allOptions.filter(option => option.id !== 'days_before');
    }

    return allOptions;
  };

  const handleSave = () => {
    const reminderData = {
      time: reminderTime,
      type: selectedType,
      scheduleType,
      daysBefore: scheduleType === 'days_before' ? daysBefore : null,
      hoursBefore: scheduleType === 'days_before' ? hoursBefore : null,
      enabled: selectedType !== 'dont_remind',
    };
    onSave(reminderData);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const renderInitialView = () => (
    <ScrollView
      style={styles.scrollContainer}
      showsVerticalScrollIndicator={false}>
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reminder</Text>
          <View style={styles.headerBottomLine} />
        </View>

        <View style={styles.iconContainer}>
          <View style={styles.bellIconBackground}>
            <Image
              source={Icons.Bell}
              style={styles.bellIcon}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.textWithLine}>
          <Text style={styles.noReminderText}>
            No reminder for this activity
          </Text>
          <View style={styles.textBottomLine} />
        </View>

        <TouchableOpacity
          style={styles.newReminderButton}
          onPress={() => setShowScheduleOptions(true)}>
          <Image
            source={Icons.RoundPlus}
            style={styles.plusIcon}
            resizeMode="contain"
          />
          <Text style={styles.newReminderText}>NEW REMINDER</Text>
        </TouchableOpacity>
        <View style={styles.newReminderBottomLine} />

        <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
          <Text style={styles.closeButtonText}>CLOSE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderScheduleOptions = () => (
    <ScrollView
      style={styles.scrollContainer}
      showsVerticalScrollIndicator={false}>
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle1}>New reminder</Text>
        </View>

        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{reminderTime}</Text>
          <Text style={styles.timeSubText}>New reminder</Text>
        </View>

        <View style={styles.typeContainer}>
          <Text style={styles.sectionTitle}>New reminder</Text>
          <View style={styles.typeButtons}>
            {reminderTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeButton,
                  selectedType === type.id && styles.selectedTypeButton,
                ]}
                onPress={() => setSelectedType(type.id)}>
                <Image
                  source={type.icon}
                  style={styles.typeIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.typeLabel,
                    selectedType === type.id && styles.selectedTypeLabel,
                  ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {selectedType !== 'dont_remind' && (
          <View style={styles.scheduleContainer}>
            <Text style={styles.sectionTitle1}>Reminder Schedule</Text>
            {getScheduleOptions().map(option => (
              <TouchableOpacity
                key={option.id}
                style={styles.scheduleOption}
                onPress={() => setScheduleType(option.id)}>
                <View
                  style={[
                    styles.radioButton,
                    scheduleType === option.id && styles.selectedRadioButton,
                  ]}></View>
                <Text style={styles.scheduleOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}

            {scheduleType === 'days_before' && (
              <View style={styles.daysBeforeContainer}>
                <View style={styles.inputRowWrapper}>
                  <View style={styles.inputRow}>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.daysInput}
                        value={daysBefore}
                        onChangeText={setDaysBefore}
                        keyboardType="numeric"
                      />
                      <View style={styles.inputBottomLine} />
                    </View>
                    <Text style={styles.inputLabel}>Days Before</Text>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.hoursInput}
                        value={hoursBefore}
                        onChangeText={setHoursBefore}
                        placeholder=""
                        placeholderTextColor="#999"
                      />
                      <View style={styles.inputBottomLine} />
                    </View>
                    <Text style={styles.inputLabel}>Hour Before</Text>
                  </View>
                </View>

                <Text style={styles.helperText}>
                  The reminder will be activated daily until the activity date.
                </Text>
              </View>
            )}

            {scheduleType === 'specific_days' && (
              <View style={styles.specificDaysContainer}>
                <Text style={styles.helperText1}>
                  The reminder will only be activated if the activity {'\n'} is
                  also scheduled for the day.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.textBottomLine1} />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={handleSave}>
            <Text style={styles.confirmButtonText}>CONFIRM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {!showScheduleOptions ? renderInitialView() : renderScheduleOptions()}
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
    width: WP(83.5),
    maxHeight: HP(85),
  },
  scrollContainer: {
    maxHeight: HP(80),
  },
  modalContent: {
    padding: WP(4),
    paddingBottom: WP(2),
  },
  header: {
    alignItems: 'center',
    marginBottom: HP(2.5),
  },
  headerTitle: {
    fontSize: FS(1.9),
    fontFamily: 'OpenSans-SemiBold',
    color: '#595959',
    marginBottom: HP(1.4),
  },
  headerTitle1: {
    fontSize: FS(1.68),
    fontFamily: 'OpenSans-SemiBold',
    color: '#595959',
    marginBottom: HP(1.4),
  },
  headerBottomLine: {
    width: WP(100),
    height: 1,
    backgroundColor: '#EAEAEA',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: HP(2.5),
  },
  bellIconBackground: {
    width: WP(18),
    height: WP(18),
    borderRadius: WP(9),
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    width: WP(10),
    height: WP(10),
  },
  textWithLine: {
    alignItems: 'center',
    marginBottom: HP(1),
  },
  noReminderText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#595959',
    textAlign: 'center',
    marginBottom: HP(1.2),
  },
  textBottomLine: {
    width: WP(100),
    height: 1,
    backgroundColor: '#EAEAEA',
  },
  newReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(0.7),
    marginBottom: HP(0.5),
  },
  newReminderBottomLine: {
    width: WP(100),
    height: 1,
    backgroundColor: '#EAEAEA',
    alignSelf: 'center',
    marginBottom: HP(0.5),
  },
  plusIcon: {
    width: WP(4),
    height: WP(4),
    marginRight: WP(2.5),
  },
  newReminderText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#595959',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: HP(1.5),
  },
  closeButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#595959',
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: HP(3),
  },
  timeText: {
    fontSize: FS(2.7),
    fontFamily: 'OpenSans-Bold',
    color: '#5F5F5F',
    marginTop: HP(-1.2),
  },
  timeSubText: {
    fontSize: FS(1.47),
    fontFamily: 'OpenSans-Regular',
    color: '#868686',
    marginTop: HP(0.5),
  },
  sectionTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#595959',
    marginBottom: HP(1.5),
    marginLeft: WP(1.7),
  },
  sectionTitle1: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#595959',
    marginBottom: HP(1),
  },
  typeContainer: {
    marginBottom: HP(2),
  },
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: HP(1.2),
    paddingHorizontal: WP(2),
    marginHorizontal: WP(1),
    borderRadius: WP(2),
    backgroundColor: '#F5F5F5',
  },
  selectedTypeButton: {
    backgroundColor: '#E6F0FF',
  },
  typeIcon: {
    width: WP(4.2),
    height: WP(4.2),
    marginBottom: HP(0.5),
  },
  typeLabel: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: '#585858',
    textAlign: 'center',
  },
  selectedTypeLabel: {
    color: '#585858',
    fontFamily: 'OpenSans-SemiBold',
  },
  scheduleContainer: {
    marginBottom: HP(1),
    marginLeft: WP(2),
  },
  scheduleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: HP(0.9),
  },
  radioButton: {
    width: WP(4),
    height: WP(4),
    borderRadius: WP(2),
    borderWidth: 2,
    borderColor: '#878787',
    marginRight: WP(2.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadioButton: {
    borderColor: colors.Primary,
    borderWidth: 3,
  },

  scheduleOptionText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666565',
  },
  daysBeforeContainer: {
    marginTop: HP(2),
    paddingLeft: WP(8),
    marginBottom: HP(2),
  },
  inputRowWrapper: {
    backgroundColor: '#F6F6F6',
    width: WP(38.5),
    height: HP(10),
    borderRadius: WP(2.5),
    padding: WP(3),
    marginBottom: HP(1),
    justifyContent: 'center',
    alignSelf: 'center',
    marginRight: WP(10),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1),
  },
  inputContainer: {
    marginRight: WP(3),
    minWidth: WP(12),
  },
  daysInput: {
    textAlign: 'center',
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#333333',
    minWidth: WP(8),
    paddingVertical: HP(0.5),
  },
  hoursInput: {
    textAlign: 'center',
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#333333',
    minWidth: WP(8),
    paddingVertical: HP(0.3),
  },
  inputBottomLine: {
    height: 1.5,
    backgroundColor: '#868686',
    width: WP(10),
    marginTop: HP(-1),
    marginLeft: WP(1),
  },
  inputLabel: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#868686',
    marginTop: HP(1),
  },
  helperText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: '#B1B1B1',
    lineHeight: FS(2),
    marginTop: HP(1.8),
    textAlign: 'center',
    justifyContent: 'center',
    marginLeft: WP(-9),
    marginBottom: HP(-1),
  },
  helperText1: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: '#B1B1B1',
    lineHeight: FS(2),
    marginTop: HP(2.8),
    textAlign: 'center',
    justifyContent: 'center',
    marginLeft: WP(-9),
    marginBottom: HP(3.8),
  },
  specificDaysContainer: {
    marginTop: HP(2),
    paddingLeft: WP(8),
    marginBottom: HP(2),
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: HP(1),
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: HP(1.5),
    marginRight: WP(2),
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: HP(1.5),
    marginLeft: WP(2),
  },
  cancelButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#2D2D2D',
  },
  confirmButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#2D2D2D',
  },
  textBottomLine1: {
    width: WP(100),
    height: 1,
    backgroundColor: '#F2F2F2',
    marginLeft: WP(-5),
  },
});

export default ReminderModal;

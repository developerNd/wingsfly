import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
  FlatList,
  Image,
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Schedule = ({ 
  visible, 
  selectedApp, 
  loadingSchedules, 
  onClose, 
  onAppUpdate, 
  InstalledApps, 
  ScheduleType, 
  WeekDay,
  allInstalledApps = []
}) => {
  // Modal state variables
  const [timerType, setTimerType] = useState('lock');
  const [startHour, setStartHour] = useState(8);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(9);
  const [endMinute, setEndMinute] = useState(0);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [lockTimeSlots, setLockTimeSlots] = useState([]);
  const [unlockTimeSlots, setUnlockTimeSlots] = useState([]);
  const [savingSchedules, setSavingSchedules] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  
  // App selection state variables
  const [selectedAppsForLocking, setSelectedAppsForLocking] = useState([]);
  const [excludeFromPomodoro, setExcludeFromPomodoro] = useState(false);

  // Default day names fallback
  const defaultDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    if (visible && selectedApp) {
      // Reset states when modal opens
      setLockTimeSlots([]);
      setUnlockTimeSlots([]);
      setStartHour(8);
      setStartMinute(0);
      setEndHour(9);
      setEndMinute(0);
      setSelectedDays([]);
      
      // Load app selection preferences
      setSelectedAppsForLocking(selectedApp.selectedAppsForLocking || []);
      setExcludeFromPomodoro(selectedApp.excludeFromPomodoro || false);
      
      // Load existing schedules if available
      if (selectedApp.schedules) {
        const lockSchedule = selectedApp.schedules.find((s) => s.type === ScheduleType.LOCK);
        const unlockSchedule = selectedApp.schedules.find((s) => s.type === ScheduleType.UNLOCK);
        
        if (lockSchedule) {
          const lockSlots = lockSchedule.timeRanges.map((range) => ({
            id: Date.now().toString() + Math.random().toString(),
            startTime: formatTimeForStorage(range.startHour, range.startMinute),
            endTime: formatTimeForStorage(range.endHour, range.endMinute),
            days: range.days || [],
            isEnabled: true
          }));
          setLockTimeSlots(lockSlots);
        }
        
        if (unlockSchedule) {
          const unlockSlots = unlockSchedule.timeRanges.map((range) => ({
            id: Date.now().toString() + Math.random().toString(),
            startTime: formatTimeForStorage(range.startHour, range.startMinute),
            endTime: formatTimeForStorage(range.endHour, range.endMinute),
            days: range.days || [],
            isEnabled: true
          }));
          setUnlockTimeSlots(unlockSlots);
        }
      }
    }
  }, [visible, selectedApp]);

  // Format time for storage (HH:MM format)
  const formatTimeForStorage = (hour, minute) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // Format time display (12hr format)
  const formatTimeDisplay = (hour, minute) => {
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    return `${hours}:${minutesStr} ${ampm}`;
  };

  // Get day name helper with fallback
  const getDayName = (day) => {
    try {
      if (typeof day === 'string') {
        return day;
      }
      
      if (typeof day === 'number' && day >= 0 && day <= 6) {
        return defaultDayNames[day];
      }
      
      if (WeekDay && typeof WeekDay === 'object') {
        const dayName = WeekDay[day];
        if (dayName !== undefined) {
          return dayName;
        }
      }
      
      return `Day ${day}`;
    } catch (error) {
      console.warn('Error getting day name:', error);
      return typeof day === 'number' && day >= 0 && day <= 6 ? defaultDayNames[day] : `Day ${day}`;
    }
  };

  // Get available days
  const getAvailableDays = () => {
    try {
      return [0, 1, 2, 3, 4, 5, 6];
    } catch (error) {
      console.warn('Error getting available days:', error);
      return [0, 1, 2, 3, 4, 5, 6];
    }
  };

  // Handle exclude from Pomodoro toggle
  const handleExcludeFromPomodoroToggle = (value) => {
    setExcludeFromPomodoro(value);
  };

  // Day selector component
  const DaySelector = () => {
    const availableDays = getAvailableDays();
    
    const toggleDay = (day) => {
      setSelectedDays(prev => {
        const newDays = prev.includes(day) 
          ? prev.filter(d => d !== day)
          : [...prev, day];
        return newDays;
      });
    };

    const toggleEveryday = () => {
      if (selectedDays.length === availableDays.length) {
        setSelectedDays([]);
      } else {
        setSelectedDays([...availableDays]);
      }
    };

    return (
      <View style={styles.daySelector}>
        <TouchableOpacity
          style={[
            styles.dayButton,
            selectedDays.length === availableDays.length && styles.dayButtonSelected
          ]}
          onPress={toggleEveryday}
        >
          <Text style={[
            styles.dayButtonText,
            selectedDays.length === availableDays.length && styles.dayButtonTextSelected
          ]}>
            Everyday
          </Text>
        </TouchableOpacity>
        {availableDays.map((day) => {
          const dayName = getDayName(day);
          const shortName = dayName && typeof dayName === 'string' ? dayName.slice(0, 3) : `D${day}`;
          
          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                selectedDays.includes(day) && styles.dayButtonSelected
              ]}
              onPress={() => toggleDay(day)}
            >
              <Text style={[
                styles.dayButtonText,
                selectedDays.includes(day) && styles.dayButtonTextSelected
              ]}>
                {shortName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Add time slot
  const addTimeSlot = () => {
    if (!selectedDays || selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    const newSlot = {
      id: Date.now().toString() + Math.random().toString(),
      startTime: formatTimeForStorage(startHour, startMinute),
      endTime: formatTimeForStorage(endHour, endMinute),
      days: [...selectedDays],
      isEnabled: true
    };
    
    if (timerType === 'lock') {
      setLockTimeSlots(prev => [...prev, newSlot]);
    } else {
      setUnlockTimeSlots(prev => [...prev, newSlot]);
    }
    
    // Reset selected days after adding
    setSelectedDays([]);
  };

  // Remove time slot
  const removeTimeSlot = (id) => {
    if (timerType === 'lock') {
      setLockTimeSlots(lockTimeSlots.filter(slot => slot.id !== id));
    } else {
      setUnlockTimeSlots(unlockTimeSlots.filter(slot => slot.id !== id));
    }
  };

  // Format days display for time slots
  const formatDaysDisplay = (days) => {
    if (!days || days.length === 0) {
      return 'No days selected';
    }
    
    try {
      return days.map(day => {
        const dayName = getDayName(day);
        return dayName && typeof dayName === 'string' ? dayName.slice(0, 3) : `D${day}`;
      }).join(', ');
    } catch (error) {
      console.warn('Error formatting days display:', error);
      return days.join(', ');
    }
  };

  // Save schedules
  const saveSchedules = async () => {
    if (!selectedApp) return;
    
    try {
      setSavingSchedules(true);
      
      // Create updated app with new schedules
      const updatedApp = {
        ...selectedApp,
        schedules: selectedApp.schedules || [],
        selectedAppsForLocking: selectedAppsForLocking,
        excludeFromPomodoro: excludeFromPomodoro
      };
      
      // Build schedules from time slots
      const schedules = [];
      
      if (lockTimeSlots.length > 0) {
        const lockSchedule = {
          id: Date.now().toString(),
          type: ScheduleType.LOCK,
          timeRanges: lockTimeSlots.map(slot => ({
            startHour: parseInt(slot.startTime.split(':')[0]),
            startMinute: parseInt(slot.startTime.split(':')[1]),
            endHour: parseInt(slot.endTime.split(':')[0]),
            endMinute: parseInt(slot.endTime.split(':')[1]),
            days: slot.days
          })),
          enabled: true,
          selectedApps: selectedAppsForLocking,
          excludeFromPomodoro: excludeFromPomodoro
        };
        schedules.push(lockSchedule);
      }
      
      if (unlockTimeSlots.length > 0) {
        const unlockSchedule = {
          id: Date.now().toString() + '1',
          type: ScheduleType.UNLOCK,
          timeRanges: unlockTimeSlots.map(slot => ({
            startHour: parseInt(slot.startTime.split(':')[0]),
            startMinute: parseInt(slot.startTime.split(':')[1]),
            endHour: parseInt(slot.endTime.split(':')[0]),
            endMinute: parseInt(slot.endTime.split(':')[1]),
            days: slot.days
          })),
          enabled: true,
          selectedApps: selectedAppsForLocking,
          excludeFromPomodoro: excludeFromPomodoro
        };
        schedules.push(unlockSchedule);
      }
      
      // Update app schedules
      updatedApp.schedules = schedules;
      updatedApp.schedulesEnabled = schedules.length > 0;
      updatedApp.isLocked = schedules.length > 0;
      
      // Update the app using the callback
      onAppUpdate(updatedApp);
      
      // Save to native module
      await InstalledApps.setAppPomodoroExclusion(updatedApp.packageName, excludeFromPomodoro);
      await InstalledApps.setAppSchedule(updatedApp.packageName, updatedApp.schedules);
      
      // Show success message
      setSuccessMessage(
        excludeFromPomodoro 
          ? 'Schedules saved! This app will not be blocked during Pomodoro sessions.'
          : 'Schedules saved successfully!'
      );
      setShowSuccessModal(true);
      
      // Close schedule modal
      onClose();
      
      // Auto-hide success modal after 3 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving schedules:', error);
      Alert.alert('Error', 'Failed to save schedules');
    } finally {
      setSavingSchedules(false);
    }
  };

  return (
    <>
      {/* Schedule Modal */}
      <Modal
        transparent={true}
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Set Time Restrictions</Text>
                {selectedApp && (
                  <Text style={styles.modalSubtitle}>{selectedApp.name}</Text>
                )}
              </View>

              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[
                    styles.tabButton, 
                    timerType === 'lock' && styles.activeTabButton
                  ]}
                  onPress={() => setTimerType('lock')}
                >
                  <Text style={[
                    styles.tabButtonText,
                    timerType === 'lock' && styles.activeTabButtonText
                  ]}>Lock Time</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.tabButton, 
                    timerType === 'unlock' && styles.activeTabButton
                  ]}
                  onPress={() => setTimerType('unlock')}
                >
                  <Text style={[
                    styles.tabButtonText,
                    timerType === 'unlock' && styles.activeTabButtonText
                  ]}>Unlock Time</Text>
                </TouchableOpacity>
              </View>

              {loadingSchedules ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={styles.modalLoadingText}>Loading schedules...</Text>
                </View>
              ) : (
                <ScrollView style={styles.timeSlotsContainer}>
                  {/* Exclude from Pomodoro Section */}
                  <View style={styles.pomodoroExcludeSection}>
                    <View style={styles.pomodoroExcludeInfo}>
                      <Text style={styles.pomodoroExcludeLabel}>Exclude from Pomodoro</Text>
                      <Text style={styles.pomodoroExcludeDescription}>
                        Don't block this app during Pomodoro focus sessions
                      </Text>
                    </View>
                    <Switch
                      value={excludeFromPomodoro}
                      onValueChange={handleExcludeFromPomodoroToggle}
                      trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                      thumbColor={excludeFromPomodoro ? '#2E7D32' : '#FFFFFF'}
                    />
                  </View>

                  {selectedAppsForLocking.length > 0 && (
                    <View style={styles.selectedAppsPreview}>
                      <Text style={styles.selectedAppsTitle}>Selected Apps:</Text>
                      <Text style={styles.selectedAppsText}>
                        {selectedAppsForLocking.length} apps selected for this schedule
                      </Text>
                    </View>
                  )}
                  
                  <DaySelector />
                  
                  <View style={styles.timePickerContainerMain}>
                    <View style={styles.timePickerRow}>
                      <TouchableOpacity 
                        style={styles.timeDisplay} 
                        onPress={() => setShowStartTimePicker(true)}
                      >
                        <Text style={styles.timeText}>
                          {formatTimeDisplay(startHour, startMinute)}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.timeSeperator}>to</Text>
                      <TouchableOpacity 
                        style={styles.timeDisplay} 
                        onPress={() => setShowEndTimePicker(true)}
                      >
                        <Text style={styles.timeText}>
                          {formatTimeDisplay(endHour, endMinute)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {showStartTimePicker && (
                      <DateTimePicker
                        value={(() => {
                          const date = new Date();
                          date.setHours(startHour);
                          date.setMinutes(startMinute);
                          return date;
                        })()}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowStartTimePicker(false);
                          if (selectedDate) {
                            setStartHour(selectedDate.getHours());
                            setStartMinute(selectedDate.getMinutes());
                          }
                        }}
                      />
                    )}

                    {showEndTimePicker && (
                      <DateTimePicker
                        value={(() => {
                          const date = new Date();
                          date.setHours(endHour);
                          date.setMinutes(endMinute);
                          return date;
                        })()}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowEndTimePicker(false);
                          if (selectedDate) {
                            setEndHour(selectedDate.getHours());
                            setEndMinute(selectedDate.getMinutes());
                          }
                        }}
                      />
                    )}

                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={addTimeSlot}
                    >
                      <Text style={styles.addButtonText}>Add Time Slot</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Time slots list */}
                  <View style={styles.timeSlotsList}>
                    {(timerType === 'lock' ? lockTimeSlots : unlockTimeSlots).length > 0 ? (
                      (timerType === 'lock' ? lockTimeSlots : unlockTimeSlots).map(slot => (
                        <View key={slot.id} style={styles.timeSlotItem}>
                          <View style={styles.timeSlotContent}>
                            <Text style={styles.timeSlotText}>
                              {formatTimeDisplay(
                                parseInt(slot.startTime.split(':')[0]),
                                parseInt(slot.startTime.split(':')[1])
                              )} to {formatTimeDisplay(
                                parseInt(slot.endTime.split(':')[0]),
                                parseInt(slot.endTime.split(':')[1])
                              )}
                            </Text>
                            <Text style={styles.daysText}>
                              {formatDaysDisplay(slot.days)}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => removeTimeSlot(slot.id)}
                          >
                            <Text style={styles.deleteButtonText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noTimeSlotsText}>
                        No time slots added. Add one above.
                      </Text>
                    )}
                  </View>
                </ScrollView>
              )}

              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.saveButton,
                    savingSchedules && { opacity: 0.7 }
                  ]}
                  onPress={saveSchedules}
                  disabled={savingSchedules}
                >
                  {savingSchedules ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Success Modal */}
      <Modal
        transparent={true}
        visible={showSuccessModal}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSuccessModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.successModalContainer}>
              <View style={styles.successIconContainer}>
                <Icon name="check-circle" size={48} color="#2E7D32" />
              </View>
              <Text style={styles.successTitle}>Success!</Text>
              <Text style={styles.successMessage}>{successMessage}</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#2E7D32',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabButtonText: {
    color: 'white',
  },
  pomodoroExcludeSection: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 5,
  },
  pomodoroExcludeInfo: {
    flex: 1,
    marginRight: 16,
  },
  pomodoroExcludeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  pomodoroExcludeDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  selectedAppsPreview: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  selectedAppsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  selectedAppsText: {
    fontSize: 12,
    color: '#2E7D32',
  },
  timePickerContainerMain: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeDisplay: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  timeSeperator: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 8,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#2E7D32',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalLoadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  timeSlotsContainer: {
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  timeSlotsList: {
    marginTop: 10,
  },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  timeSlotText: {
    color: '#333',
    fontSize: 16,
  },
  deleteButton: {
    padding: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    borderRadius: 16,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noTimeSlotsText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  successModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 16,
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2E7D32',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 4,
  },
  dayButtonSelected: {
    backgroundColor: '#2E7D32',
  },
  dayButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  dayButtonTextSelected: {
    color: 'white',
  },
  timeSlotContent: {
    flex: 1,
  },
  daysText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});

export default Schedule;
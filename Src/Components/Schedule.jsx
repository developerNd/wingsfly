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

  // Update states
  const [editingTimeSlot, setEditingTimeSlot] = useState(null);

  // Default day names fallback
  const defaultDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // NEW: Function to find existing schedules from other apps
  const findExistingSchedules = () => {
    if (!allInstalledApps || allInstalledApps.length === 0) return [];

    const existingSchedules = [];

    try {
      allInstalledApps.forEach(app => {
        // Skip current app
        if (!app || !selectedApp || app.packageName === selectedApp.packageName) return;

        // Check if app has schedules
        if (app.schedules && Array.isArray(app.schedules) && app.schedules.length > 0) {
          app.schedules.forEach(schedule => {
            if (schedule && schedule.timeRanges && Array.isArray(schedule.timeRanges) && schedule.timeRanges.length > 0) {
              schedule.timeRanges.forEach(range => {
                if (!range || !range.days || !Array.isArray(range.days)) return;
                
                try {
                  const daysCopy = [...range.days];
                  const scheduleKey = `${range.startHour}:${range.startMinute}-${range.endHour}:${range.endMinute}-${daysCopy.sort((a, b) => a - b).join(',')}`;
                  
                  // Check if this exact schedule already exists in suggestions
                  const existingIndex = existingSchedules.findIndex(s => s && s.key === scheduleKey);
                  
                  if (existingIndex === -1) {
                    existingSchedules.push({
                      key: scheduleKey,
                      startHour: range.startHour,
                      startMinute: range.startMinute,
                      endHour: range.endHour,
                      endMinute: range.endMinute,
                      days: daysCopy,
                      type: schedule.type,
                      appNames: [app.name],
                      count: 1
                    });
                  } else {
                    // Add app name to existing schedule and increment count
                    if (existingSchedules[existingIndex] && 
                        existingSchedules[existingIndex].appNames && 
                        !existingSchedules[existingIndex].appNames.includes(app.name)) {
                      existingSchedules[existingIndex].appNames.push(app.name);
                      existingSchedules[existingIndex].count++;
                    }
                  }
                } catch (err) {
                  console.warn('Error processing schedule range:', err);
                }
              });
            }
          });
        }
      });

      // Sort by count (most used schedules first)
      return existingSchedules.sort((a, b) => (b?.count || 0) - (a?.count || 0));
    } catch (error) {
      console.error('Error in findExistingSchedules:', error);
      return [];
    }
  };

  useEffect(() => {
    if (visible && selectedApp) {
      // Reset states when modal opens
      setLockTimeSlots([]);
      setUnlockTimeSlots([]);
      setEditingTimeSlot(null);
      setSelectedAppsForLocking(selectedApp.selectedAppsForLocking || []);
      setExcludeFromPomodoro(selectedApp.excludeFromPomodoro || false);
      
      // Load existing schedules if available
      let hasLoadedExistingSchedule = false;
      
      if (selectedApp.schedules && Array.isArray(selectedApp.schedules)) {
        const lockSchedule = selectedApp.schedules.find((s) => s && s.type === ScheduleType.LOCK);
        const unlockSchedule = selectedApp.schedules.find((s) => s && s.type === ScheduleType.UNLOCK);
        
        if (lockSchedule && lockSchedule.timeRanges && Array.isArray(lockSchedule.timeRanges)) {
          const lockSlots = lockSchedule.timeRanges.map((range, index) => ({
            id: `lock_${Date.now()}_${index}`,
            startTime: formatTimeForStorage(range.startHour, range.startMinute),
            endTime: formatTimeForStorage(range.endHour, range.endMinute),
            days: range.days || [],
            isEnabled: true,
            type: 'lock'
          }));
          setLockTimeSlots(lockSlots);
          hasLoadedExistingSchedule = true;
        }
        
        if (unlockSchedule && unlockSchedule.timeRanges && Array.isArray(unlockSchedule.timeRanges)) {
          const unlockSlots = unlockSchedule.timeRanges.map((range, index) => ({
            id: `unlock_${Date.now()}_${index}`,
            startTime: formatTimeForStorage(range.startHour, range.startMinute),
            endTime: formatTimeForStorage(range.endHour, range.endMinute),
            days: range.days || [],
            isEnabled: true,
            type: 'unlock'
          }));
          setUnlockTimeSlots(unlockSlots);
          hasLoadedExistingSchedule = true;
        }
      }
      
      // NEW: If no existing schedules, try to pre-fill from other apps' schedules
      if (!hasLoadedExistingSchedule) {
        try {
          const suggestions = findExistingSchedules();
          if (suggestions && suggestions.length > 0) {
            // Pre-fill with the most popular schedule (don't add it automatically)
            const topSuggestion = suggestions[0];
            setStartHour(topSuggestion.startHour);
            setStartMinute(topSuggestion.startMinute);
            setEndHour(topSuggestion.endHour);
            setEndMinute(topSuggestion.endMinute);
            setSelectedDays(Array.isArray(topSuggestion.days) ? [...topSuggestion.days] : []);
            setTimerType(topSuggestion.type);
          } else {
            // No suggestions, use default values
            setStartHour(8);
            setStartMinute(0);
            setEndHour(9);
            setEndMinute(0);
            setSelectedDays([]);
            setTimerType('lock');
          }
        } catch (error) {
          console.error('Error loading suggestions:', error);
          // Fallback to defaults
          setStartHour(8);
          setStartMinute(0);
          setEndHour(9);
          setEndMinute(0);
          setSelectedDays([]);
          setTimerType('lock');
        }
      } else {
        // Has existing schedules, reset to defaults
        setStartHour(8);
        setStartMinute(0);
        setEndHour(9);
        setEndMinute(0);
        setSelectedDays([]);
        setTimerType('lock');
      }
    }
  }, [visible, selectedApp, allInstalledApps]);

  // NEW: Function to apply suggested schedule
  const applySuggestedSchedule = (suggestion) => {
    try {
      if (!suggestion) return;
      
      // Set the timer type first
      setTimerType(suggestion.type);
      
      // Create the new time slot directly with safe copies of data
      const newSlot = {
        id: Date.now().toString() + Math.random().toString(),
        startTime: formatTimeForStorage(suggestion.startHour, suggestion.startMinute),
        endTime: formatTimeForStorage(suggestion.endHour, suggestion.endMinute),
        days: Array.isArray(suggestion.days) ? [...suggestion.days] : [],
        isEnabled: true,
        type: suggestion.type
      };
      
      // Add to appropriate list
      if (suggestion.type === 'lock') {
        setLockTimeSlots(prev => [...prev, newSlot]);
      } else {
        setUnlockTimeSlots(prev => [...prev, newSlot]);
      }
      
      // Also update the input fields so user can see what was added
      setStartHour(suggestion.startHour);
      setStartMinute(suggestion.startMinute);
      setEndHour(suggestion.endHour);
      setEndMinute(suggestion.endMinute);
      setSelectedDays([]);
      
      const appNamesText = Array.isArray(suggestion.appNames) ? suggestion.appNames.join(', ') : 'other apps';
      
      Alert.alert(
        'Schedule Added',
        `Time slot from ${appNamesText} has been added successfully!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error applying suggested schedule:', error);
      Alert.alert('Error', 'Failed to apply suggested schedule. Please try manually.');
    }
  };

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

  // Start editing a time slot
  const startEditTimeSlot = (slot) => {
    const startTimeParts = slot.startTime.split(':');
    const endTimeParts = slot.endTime.split(':');
    
    setStartHour(parseInt(startTimeParts[0]));
    setStartMinute(parseInt(startTimeParts[1]));
    setEndHour(parseInt(endTimeParts[0]));
    setEndMinute(parseInt(endTimeParts[1]));
    setSelectedDays([...slot.days]);
    setTimerType(slot.type);
    setEditingTimeSlot(slot);
  };

  // Delete a time slot
  const deleteTimeSlot = (slotToDelete) => {
    Alert.alert(
      'Delete Time Slot',
      `Are you sure you want to delete this ${slotToDelete.type} time slot?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            if (slotToDelete.type === 'lock') {
              setLockTimeSlots(prev => prev.filter(slot => slot.id !== slotToDelete.id));
            } else {
              setUnlockTimeSlots(prev => prev.filter(slot => slot.id !== slotToDelete.id));
            }
            
            if (editingTimeSlot && editingTimeSlot.id === slotToDelete.id) {
              cancelEdit();
            }
          }
        }
      ]
    );
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingTimeSlot(null);
    setSelectedDays([]);
    setStartHour(8);
    setStartMinute(0);
    setEndHour(9);
    setEndMinute(0);
  };

  // Add or update time slot
  const addTimeSlot = () => {
    if (!selectedDays || selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    const newSlot = {
      id: editingTimeSlot ? editingTimeSlot.id : Date.now().toString() + Math.random().toString(),
      startTime: formatTimeForStorage(startHour, startMinute),
      endTime: formatTimeForStorage(endHour, endMinute),
      days: [...selectedDays],
      isEnabled: true,
      type: timerType
    };
    
    if (editingTimeSlot) {
      if (timerType === 'lock') {
        setLockTimeSlots(prev => prev.map(slot => 
          slot.id === editingTimeSlot.id ? newSlot : slot
        ));
      } else {
        setUnlockTimeSlots(prev => prev.map(slot => 
          slot.id === editingTimeSlot.id ? newSlot : slot
        ));
      }
      setEditingTimeSlot(null);
    } else {
      if (timerType === 'lock') {
        setLockTimeSlots(prev => [...prev, newSlot]);
      } else {
        setUnlockTimeSlots(prev => [...prev, newSlot]);
      }
    }
    
    setSelectedDays([]);
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
      
      const updatedApp = {
        ...selectedApp,
        schedules: selectedApp.schedules || [],
        selectedAppsForLocking: selectedAppsForLocking,
        excludeFromPomodoro: excludeFromPomodoro
      };
      
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
      
      updatedApp.schedules = schedules;
      updatedApp.schedulesEnabled = schedules.length > 0;
      updatedApp.isLocked = schedules.length > 0;
      
      onAppUpdate(updatedApp);
      
      await InstalledApps.setAppPomodoroExclusion(updatedApp.packageName, excludeFromPomodoro);
      await InstalledApps.setAppSchedule(updatedApp.packageName, updatedApp.schedules);
      
      setSuccessMessage(
        excludeFromPomodoro 
          ? 'Schedules saved! This app will not be blocked during Pomodoro sessions.'
          : 'Schedules saved successfully!'
      );
      setShowSuccessModal(true);
      
      onClose();
      
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

  // NEW: Render suggested schedules
  const renderSuggestedSchedules = () => {
    return null; // Removed UI, logic handled in useEffect
  };

  return (
    <>
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

                    <View style={styles.addButtonContainer}>
                      <TouchableOpacity
                        style={[styles.addButton, editingTimeSlot && styles.updateButton]}
                        onPress={addTimeSlot}
                      >
                        <Text style={styles.addButtonText}>
                          {editingTimeSlot ? 'Update Time Slot' : 'Add Time Slot'}
                        </Text>
                      </TouchableOpacity>
                      
                      {editingTimeSlot && (
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={cancelEdit}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.timeSlotsList}>
                    {(timerType === 'lock' ? lockTimeSlots : unlockTimeSlots).length > 0 ? (
                      (timerType === 'lock' ? lockTimeSlots : unlockTimeSlots).map(slot => (
                        <View key={slot.id} style={[
                          styles.timeSlotItem,
                          editingTimeSlot?.id === slot.id && styles.editingTimeSlot
                        ]}>
                          <TouchableOpacity 
                            style={styles.timeSlotContent}
                            onPress={() => startEditTimeSlot(slot)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.timeSlotInfo}>
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
                            
                            <View style={styles.timeSlotActions}>
                              <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => startEditTimeSlot(slot)}
                              >
                                <Icon name="edit" size={18} color="#2E7D32" />
                              </TouchableOpacity>
                              
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => deleteTimeSlot(slot)}
                              >
                                <Icon name="delete" size={18} color="#F44336" />
                              </TouchableOpacity>
                            </View>
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
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
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
  addButtonContainer: {
    marginTop: 16,
    gap: 8,
  },
  addButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: '#FF9800',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 16,
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
  cancelModalButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelModalButtonText: {
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
  timeSlotsList: {
    marginTop: 10,
  },
  timeSlotItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  editingTimeSlot: {
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  timeSlotContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  timeSlotInfo: {
    flex: 1,
  },
  timeSlotText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  daysText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  timeSlotActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
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
});

export default Schedule;
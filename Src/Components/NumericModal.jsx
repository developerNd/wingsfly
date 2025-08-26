import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import Modal from 'react-native-modal';
import {colors, Icons} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';
import {taskCompletionsService} from '../services/api/taskCompletionsService';
import {useAuth} from '../contexts/AuthContext';
import {getCompletionDateString} from '../utils/dateUtils';

const NumericInputModal = ({
  isVisible,
  onClose,
  onSave,
  taskTitle,
  taskData,
  selectedDate, // Add selectedDate prop from Home component
}) => {
  const [currentValue, setCurrentValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const {user} = useAuth();

  // Get target value and current value from task data
  const targetValue = taskData?.numericGoal || 0;
  const numericUnit = taskData?.numericUnit || '';

  // FIXED: Load completion data for the selected date when modal opens
  useEffect(() => {
    const loadCompletionData = async () => {
      if (isVisible && taskData && user && selectedDate && !hasLoadedData) {
        setIsLoading(true);
        setHasLoadedData(false);

        try {
          // FIXED: Use consistent date conversion
          const completionDate = getCompletionDateString(selectedDate);
          console.log(
            'Loading numeric completion for date:',
            completionDate,
            'from selectedDate:',
            selectedDate,
            'Task ID:',
            taskData.id,
          );

          const completion = await taskCompletionsService.getTaskCompletion(
            taskData.id,
            user.id,
            completionDate,
          );

          console.log('Loaded numeric completion:', completion);

          if (
            completion &&
            completion.numeric_value !== null &&
            completion.numeric_value !== undefined
          ) {
            // Load the saved numeric value
            console.log('Setting current value to:', completion.numeric_value);
            setCurrentValue(completion.numeric_value);
          } else {
            // Use 0 as default if no completion data exists
            console.log('No completion found, setting to 0');
            setCurrentValue(0);
          }

          setHasLoadedData(true);
        } catch (error) {
          console.error('Error loading numeric completion data:', error);
          // Fallback to 0
          setCurrentValue(0);
          setHasLoadedData(true);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadCompletionData();
  }, [isVisible, taskData?.id, user?.id, selectedDate]); // More specific dependencies

  // Reset state when modal closes
  useEffect(() => {
    if (!isVisible) {
      setHasLoadedData(false);
      setIsLoading(false);
    }
  }, [isVisible]);

  // FIXED: Improved date formatting for display
  const getCurrentDate = () => {
    try {
      if (selectedDate) {
        const date =
          typeof selectedDate === 'string'
            ? new Date(selectedDate)
            : selectedDate;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
      }

      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = String(today.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error formatting date for display:', error);
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = String(today.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    }
  };

  const incrementValue = () => {
    setCurrentValue(prev => prev + 1);
  };

  const decrementValue = () => {
    setCurrentValue(prev => Math.max(0, prev - 1));
  };

  const handleCancel = () => {
    // Don't reset the value on cancel, keep the loaded completion data
    onClose();
  };

  // Function to check if task is completed based on condition
  const isTaskCompleted = value => {
    // Zero always means not complete regardless of condition
    if (value === 0) {
      return false;
    }

    const condition = taskData?.numericCondition?.toLowerCase();
    const target = targetValue;

    switch (condition) {
      case 'any value':
      case 'any':
        return value > 0;
      case 'less than':
      case 'lessthan':
        return value < target;
      case 'exactly':
      case 'exact':
        return value === target;
      case 'at least':
      case 'atleast':
        return value >= target;
      default:
        return value > 0;
    }
  };

  const handleOK = async () => {
    const isCompleted = isTaskCompleted(currentValue);

    try {
      // FIXED: Use consistent date conversion
      const completionDate = getCompletionDateString(selectedDate);
      console.log(
        'Saving numeric completion for date:',
        completionDate,
        'from selectedDate:',
        selectedDate,
      );

      // Save to database
      await taskCompletionsService.upsertNumericCompletion(
        taskData.id,
        user.id,
        completionDate,
        currentValue,
        numericUnit,
        isCompleted,
      );

      console.log('Saved numeric completion:', {
        value: currentValue,
        isCompleted,
        date: completionDate,
      });

      // Call parent callback
      onSave(currentValue, isCompleted);
    } catch (error) {
      console.error('Error saving numeric completion:', error);
    }

    onClose();
  };

  // Show completion status
  const taskCompleted = isTaskCompleted(currentValue);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={handleCancel}
      onBackButtonPress={handleCancel}
      style={styles.modal}
      useNativeDriver>
      <View style={styles.modalContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>Numeric</Text>
            </View>
            <View style={styles.dateContainer}>
              <Text style={styles.headerDate}>{getCurrentDate()}</Text>
            </View>
          </View>
          <View style={styles.habitIcon}>
            <Image
              source={taskData?.image || Icons.Habit || Icons.Taskhome}
              style={styles.iconImage}
            />
          </View>
        </View>

        {/* Loading or Counter Section */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <View style={styles.counterContainer}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={decrementValue}>
              <Text style={styles.counterButtonText}>−</Text>
            </TouchableOpacity>

            <View style={styles.counterDivider} />

            <View style={styles.counterValueContainer}>
              <Text style={styles.counterValue}>{currentValue}</Text>
              {numericUnit && (
                <Text style={styles.unitText}>{numericUnit}</Text>
              )}
            </View>

            <View style={styles.counterDivider} />

            <TouchableOpacity
              style={styles.counterButton}
              onPress={incrementValue}>
              <Text style={styles.counterButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress Section */}
        <View style={styles.progressContainer}>
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Today</Text>
            <Text style={styles.progressValue}>
              {currentValue} / {targetValue}
              {numericUnit && ` ${numericUnit}`}
            </Text>
          </View>
        </View>

        {/* Action Buttons with borders */}
        <View style={styles.actionButtonsContainer}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>

            <View style={styles.verticalDivider} />

            <TouchableOpacity
              style={styles.okButton}
              onPress={handleOK}
              disabled={isLoading}>
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  modalContent: {
    backgroundColor: colors.White,
    borderRadius: WP(5),
    width: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(4),
    marginBottom: HP(1),
    borderBottomWidth: 0.7,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    alignItems: 'flex-start',
  },
  titleContainer: {
    marginBottom: HP(0.5),
  },
  headerTitle: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
  },
  dateContainer: {
    backgroundColor: '#E4E6FF',
    borderRadius: WP(1.5),
    paddingHorizontal: WP(1.2),
    marginLeft: WP(-0.3),
  },
  headerDate: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
  habitIcon: {
    backgroundColor: colors.Primary,
    borderRadius: WP(2),
    padding: WP(2),
  },
  iconImage: {
    width: WP(6),
    height: WP(6),
    tintColor: colors.White,
    resizeMode: 'contain',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: HP(3),
  },
  loadingText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HP(1),
    backgroundColor: '#F6F6F6',
    borderRadius: WP(3),
    marginHorizontal: WP(5),
    marginTop: HP(1.5),
    paddingHorizontal: WP(1.5),
  },
  counterButton: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterDivider: {
    width: 0.7,
    backgroundColor: '#E0E0E0',
    height: '100%',
  },
  counterButtonText: {
    fontSize: FS(3.5),
    fontFamily: 'Opensans-SemiBold',
    color: '#666666',
  },
  counterValueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(1),
  },
  counterValue: {
    fontSize: FS(3.3),
    fontFamily: 'Roboto-Bold',
    color: '#333333',
    textAlign: 'center',
  },
  unitText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(0.2),
  },
  progressContainer: {
    paddingHorizontal: WP(5),
    marginBottom: HP(1.5),
  },
  progressSection: {
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: WP(2),
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(4),
  },
  progressLabel: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#999999',
    marginBottom: HP(0.3),
  },
  progressValue: {
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-Regular',
    color: '#333333',
  },
  actionButtonsContainer: {
    borderTopWidth: 0.7,
    borderTopColor: '#E0E0E0',
  },
  actionButtons: {
    flexDirection: 'row',
    minHeight: HP(6),
  },
  cancelButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: HP(1.6),
  },
  cancelButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    letterSpacing: 0.5,
  },
  verticalDivider: {
    width: 0.7,
    backgroundColor: '#E0E0E0',
  },
  okButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: HP(1.6),
  },
  okButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    letterSpacing: 0.5,
  },
});

export default NumericInputModal;

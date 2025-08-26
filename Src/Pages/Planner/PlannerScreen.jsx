import React, {useState, useEffect, useCallback} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import DatePickerModal from '../../Components/DatePickerModal';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {plannerService} from '../../services/api/plannerService'; 
import {useAuth} from '../../contexts/AuthContext'; // Import the auth context

const PlannerScreen = () => {
  const navigation = useNavigation();
  const {user} = useAuth(); // Get user from auth context

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  
  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // Task states
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  // Load tasks when component mounts
  useEffect(() => {
    if (user) {
      loadTasks();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Reload tasks when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadTasks();
      }
    }, [user])
  );

  // Load tasks from Supabase
  const loadTasks = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to view your tasks.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await plannerService.getPlannerTasks(user.id); // Use user.id instead of null
      
      // Transform the data to match your existing task format
      const transformedTasks = data.map(task => ({
        id: task.id,
        title: task.task_name,
        dueDate: plannerService.calculateDueDateText(task.target_date),
        isCompleted: false, // You can add completion status to database if needed
        targetDate: task.target_date,
        createdAt: task.created_at,
      }));

      setTasks(transformedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh tasks
  const onRefresh = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to refresh tasks.');
      return;
    }
    
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  // Toggle task completion (local state only since database doesn't have completion field)
  const toggleTaskCompletion = (taskId) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? {...task, isCompleted: !task.isCompleted} : task
      )
    );
  };

  const handleNewTask = () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to create tasks.');
      return;
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setGoalName('');
    setTargetDate('');
    setSelectedDate(null);
  };

  // Create new task in Supabase
  const handleCreateTask = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to create tasks.');
      return;
    }

    if (goalName.trim() && targetDate.trim() && selectedDate) {
      try {
        setCreatingTask(true);
        
        // Format date for database (YYYY-MM-DD)
        const formattedDate = plannerService.formatDateForDB(selectedDate);
        
        // Create task data with user ID
        const taskData = {
          taskName: goalName.trim(),
          targetDate: formattedDate,
          userId: user.id, // Use user.id from auth context
        };

        // Create task in Supabase
        const newTask = await plannerService.createPlannerTask(taskData);
        
        // Transform and add to local state
        const transformedTask = {
          id: newTask.id,
          title: newTask.task_name,
          dueDate: plannerService.calculateDueDateText(newTask.target_date),
          isCompleted: false,
          targetDate: newTask.target_date,
          createdAt: newTask.created_at,
        };

        setTasks(prevTasks => [...prevTasks, transformedTask]);
        
        console.log('New task created:', transformedTask);
        handleCloseModal();
        
        // Show success message
        Alert.alert('Success', 'Task created successfully!');
        
      } catch (error) {
        console.error('Error creating task:', error);
        Alert.alert('Error', 'Failed to create task. Please try again.');
      } finally {
        setCreatingTask(false);
      }
    } else {
      Alert.alert('Validation Error', 'Please fill all fields');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!user) {
      Alert.alert('Error', 'Please log in to delete tasks.');
      return;
    }

    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await plannerService.deletePlannerTask(taskId);
              setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
              Alert.alert('Success', 'Task deleted successfully!');
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    // Format the date as needed (you can customize this format)
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    setTargetDate(formattedDate);
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleTaskPress = (task) => {
    // Navigate to MindMapScreen with the selected task data
    navigation.navigate('MindMapScreen', {
      taskTitle: task.title,
      taskId: task.id,
      dueDate: task.dueDate,
    });
  };

  const renderTaskItem = ({item}) => (
    <TouchableOpacity 
      style={styles.taskItem}
      onPress={() => handleTaskPress(item)}
      onLongPress={() => handleDeleteTask(item.id)} // Long press to delete
    >
      <TouchableOpacity 
        style={styles.checkboxContainer}
        onPress={(e) => {
          e.stopPropagation(); // Prevent task press when clicking checkbox
          toggleTaskCompletion(item.id);
        }}
      >
        <View style={[
          styles.checkbox,
          item.isCompleted && styles.checkboxCompleted
        ]}>
          {item.isCompleted && (
            <MaterialIcons 
              name="check" 
              size={WP(4)} 
              color={colors.White} 
            />
          )}
        </View>
      </TouchableOpacity>
      
      <View style={styles.taskContent}>
        <Text style={[
          styles.taskTitle,
          item.isCompleted && styles.taskTitleCompleted
        ]}>
          {item.title}
        </Text>
        <Text style={styles.taskDueDate}>
          {item.dueDate}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <MaterialIcons name="lock" size={WP(20)} color="#E0E0E0" />
        <Text style={styles.emptyStateText}>Please log in</Text>
        <Text style={styles.emptyStateSubtext}>
          You need to be logged in to create and manage tasks
        </Text>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <ActivityIndicator size="large" color={colors.Primary} />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <TouchableOpacity style={styles.searchButton}>
            <MaterialIcons 
              name="search" 
              size={WP(6)} 
              color="#666666" 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Task List */}
      <View style={styles.taskListBackground}>
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.Primary]}
            />
          }
        >
          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons 
                name="assignment" 
                size={WP(20)} 
                color="#E0E0E0" 
              />
              <Text style={styles.emptyStateText}>No tasks yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the "New Task" button to create your first task
              </Text>
            </View>
          ) : (
            <FlatList
              data={tasks}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.taskList}
            />
          )}
        </ScrollView>
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleNewTask}
        activeOpacity={0.8}
      >
        <MaterialIcons 
          name="add" 
          size={WP(6)} 
          color={colors.White} 
        />
        <Text style={styles.fabText}>New Task</Text>
      </TouchableOpacity>

      {/* Create Task Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Task</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <MaterialIcons name="close" size={WP(6)} color="#666666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {/* Goal Name Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={goalName}
                  onChangeText={setGoalName}
                  placeholder="Task Name"
                  placeholderTextColor="#999999"
                  maxLength={100}
                />
              </View>

              {/* Target Date Input */}
              <TouchableOpacity 
                style={styles.inputContainer}
                onPress={openDatePicker}
              >
                <View style={styles.dateInputContainer}>
                  <Text style={[
                    styles.dateText,
                    !targetDate && styles.placeholderText
                  ]}>
                    {targetDate || 'Select target date'}
                  </Text>
                  <Image source={Icons.Calendar} style={styles.iconImage} />
                </View>
              </TouchableOpacity>

              {/* Modal Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={handleCloseModal}
                  disabled={creatingTask}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.createButton,
                    (!goalName.trim() || !targetDate.trim() || creatingTask) && styles.disabledButton
                  ]} 
                  onPress={handleCreateTask}
                  disabled={!goalName.trim() || !targetDate.trim() || creatingTask}
                >
                  {creatingTask ? (
                    <ActivityIndicator size="small" color={colors.White} />
                  ) : (
                    <Text style={styles.createButtonText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onDateSelect={handleDateSelect}
        initialDate={selectedDate || new Date()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(2),
  },
  headerContainer: {
    backgroundColor: colors.White,
    paddingTop: HP(3),
    paddingBottom: HP(2),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(4.533),
    position: 'relative',
  },
  headerTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    textAlign: 'center',
    flex: 1,
  },
  iconImage: {
    width: WP(5.5),
    height: WP(5.5),
    tintColor: '#4F4F4F',
    resizeMode: 'contain',
  },
  searchButton: {
    position: 'absolute',
    right: WP(4.533),
    padding: WP(2),
  },
  taskListBackground: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(2.5),
    paddingTop: HP(2),
  },
  taskList: {
    paddingBottom: HP(10),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(10),
  },
  emptyStateText: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
    marginTop: HP(2),
  },
  emptyStateSubtext: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#999999',
    textAlign: 'center',
    marginTop: HP(1),
    paddingHorizontal: WP(10),
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: WP(3),
    paddingHorizontal: WP(5),
    paddingVertical: HP(1.5),
    marginBottom: HP(1.2),
    backgroundColor: colors.White,
  },
  checkboxContainer: {
    marginRight: WP(4),
  },
  checkbox: {
    width: WP(5.5),
    height: WP(5.5),
    borderRadius: WP(1),
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: colors.White,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: colors.Primary,
    borderColor: colors.Primary,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#333333',
    marginBottom: HP(0.5),
  },
  taskTitleCompleted: {
    color: '#999999',
  },
  taskDueDate: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: colors.Primary,
  },
  fab: {
    position: 'absolute',
    bottom: HP(3),
    right: WP(4.533),
    backgroundColor: colors.Primary,
    borderRadius: WP(2),
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.Primary,
    shadowOffset: {
      width: 0,
      height: HP(0.5),
    },
    shadowOpacity: 0.3,
    shadowRadius: WP(3),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    width: WP(85),
    maxHeight: HP(60),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: WP(5),
    paddingVertical: HP(2),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
  },
  modalContent: {
    padding: WP(5),
  },
  inputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: HP(2.3),
    elevation: 2,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.125),
    },
    shadowOpacity: 0.05,
    shadowRadius: WP(1),
  },
  textInput: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    paddingVertical: HP(1.3),
    paddingHorizontal: WP(3.5),
    minHeight: HP(5.5),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: HP(2),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: HP(1.5),
    borderRadius: WP(2),
    marginRight: WP(2.5),
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
  },
  createButton: {
    flex: 1,
    backgroundColor: colors.Primary,
    paddingVertical: HP(1.5),
    borderRadius: WP(2),
    marginLeft: WP(2.5),
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: HP(1.6),
    paddingHorizontal: WP(3.5),
    minHeight: HP(5.5),
  },
  dateText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Regular',
    color: colors.Black,
    flex: 1,
  },
  placeholderText: {
    color: '#999999',
    fontFamily: "OpenSans-SemiBold"
  },
  fabText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
    marginLeft: WP(3),
    marginRight: WP(1)
  },
});

export default PlannerScreen;
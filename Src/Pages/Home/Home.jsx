import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  Pressable,
  StatusBar,
  Image,
} from 'react-native';
import Logo from '../../assets/Images/brand.svg';
import PlusIcon from 'react-native-vector-icons/AntDesign';
import Calender from '../../Components/Calender';
import {colors, Icons} from '../../Helper/Contants';
import Modal from 'react-native-modal';
import TaskCard from '../../Components/TaskCard';
import ModalTaskCard from '../../Components/ModalTaskCard';
import NumericInputModal from '../../Components/NumericModal';
import AppreciationModal from '../../Components/AppreciationModal';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {HP, WP, FS} from '../../utils/dimentions';

const tasks = [
  {
    id: '1',
    title: 'Schedule a meeting with Harshit Sir',
    time: '09:00 AM',
    timeColor: '#E4EBF3',
    tags: ['Habit', 'Must'],
    image: Icons.Taskhome,
    hasFlag: true,
    type: 'yesno',
  },
  {
    id: '2',
    title: '2.5 Hours Simran and Meditation',
    time: '09:00 AM',
    timeColor: '#F1E3F1',
    tags: ['Habit', 'Must'],
    image: Icons.Yogo,
    hasFlag: true,
    type: 'timer',
  },
  {
    id: '3',
    title: 'Save 200 Rupees Daily',
    time: '12:00 PM',
    timeColor: '#F8F5E3',
    tags: ['Habit', 'Must'],
    image: Icons.Cash,
    hasFlag: true,
    type: 'checklist',
  },
  {
    id: '4',
    title: 'Walk 10k Step Daily',
    time: '07:00 AM',
    timeColor: '#E7F2E7',
    progress: '12/31',
    tags: ['Habit', 'Important'],
    image: Icons.Walk,
    hasFlag: true,
    type: 'numeric',
  },
  {
    id: '5',
    title: 'Buy Sunflower for Mumma',
    time: '11:00 AM',
    timeColor: '#FEF0E7',
    progress: '0/1',
    tags: ['Task', 'Important'],
    image: Icons.Task5,
    hasFlag: true,
    type: 'yesno',
  },
  {
    id: '6',
    title: 'Make Mandala and Colour Daily',
    time: '09:30 PM',
    timeColor: '#E3EFED',
    progress: '12/30',
    tags: ['Task', 'Important'],
    image: Icons.Task6,
    hasFlag: true,
    type: 'timer',
  },
];

const Home = () => {
  const [checkboxStates, setCheckboxStates] = useState({});
  const [isModalVisible, setModalVisible] = useState(false);
  const [isNumericModalVisible, setNumericModalVisible] = useState(false);
  const [isAppreciationVisible, setAppreciationVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [completedTask, setCompletedTask] = useState(null);
  const [taskStreak, setTaskStreak] = useState(1);

  const navigation = useNavigation();

  useFocusEffect(
    React.useCallback(() => {
      setModalVisible(false);
      setNumericModalVisible(false);
    }, []),
  );

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const route = navigation.getState()?.routes?.find(r => r.name === 'Home');
      if (route?.params?.completedTaskId) {
        markTaskCompleted(route.params.completedTaskId);
        navigation.setParams({completedTaskId: undefined});
      }
    });

    return unsubscribe;
  }, [navigation]);

  const modaltasks = [
    {
      id: '1',
      Heading: 'Habit',
      title:
        'Activity that repeats over time it has detailed tracking and statistics.',
      image: Icons.Habit,
      navigation: () => {
        setModalVisible(false);
        navigation.navigate('CategorySelection', {type: 'Habit'});
      },
    },
    {
      id: '2',
      Heading: 'Recurring Task',
      title:
        'Activity that repeats over time it has detailed tracking and statistics.',
      image: Icons.Recurring,
      navigation: () => {
        setModalVisible(false);
        navigation.navigate('CategorySelection', {type: 'Recurring'});
      },
    },
    {
      id: '3',
      Heading: 'Task',
      title: 'Single instance activity without tracking over time.',
      image: Icons.Task,
      navigation: () => {
        setModalVisible(false);
        navigation.navigate('CategorySelection', {type: 'Task'});
      },
    },
    {
      id: '4',
      Heading: 'Goal of the Day',
      title:
        'A specific target set for oneself to achieve within a single day.',
      image: Icons.Goal,
      navigation: () => {
        setModalVisible(false);
        navigation.navigate('CategorySelection', {type: 'Goal'});
      },
    },
  ];

  const calculateTaskStreak = taskId => {
    const streakMap = {
      1: 3,
      2: 15,
      3: 7,
      4: 22,
      5: 1,
      6: 8,
    };
    return streakMap[taskId] || 1;
  };

  const isNewBestStreak = (taskId, currentStreak) => {
    return currentStreak > 10;
  };

  const showAppreciationModal = task => {
    const currentStreak = calculateTaskStreak(task.id);
    setCompletedTask(task);
    setTaskStreak(currentStreak);
    setAppreciationVisible(true);
  };

  const toggleCheckbox = id => {
    const task = tasks.find(task => task.id === id);

    if (task && task.type === 'numeric') {
      setSelectedTask(task);
      setNumericModalVisible(true);
      return;
    }

    if (task && task.type === 'timer') {
      navigation.navigate('PomodoroTimerScreen', {
        task: task,
      });
      return;
    }

    setCheckboxStates(prev => {
      const currentState = prev[id] || 1;
      const nextState = currentState === 1 ? 2 : 1;

      if (nextState === 2 && task) {
        setTimeout(() => showAppreciationModal(task), 300);
      }

      return {
        ...prev,
        [id]: nextState,
      };
    });
  };

  const markTaskCompleted = taskId => {
    const task = tasks.find(t => t.id === taskId);

    setCheckboxStates(prev => ({
      ...prev,
      [taskId]: 2,
    }));

    if (task) {
      setTimeout(() => showAppreciationModal(task), 300);
    }
  };

  const handleNumericSave = value => {
    if (selectedTask) {
      console.log(`Task ${selectedTask.id} updated with value: ${value}`);

      if (value > 0) {
        setCheckboxStates(prev => ({
          ...prev,
          [selectedTask.id]: 2,
        }));

        setTimeout(() => showAppreciationModal(selectedTask), 300);
      } else {
        setCheckboxStates(prev => ({
          ...prev,
          [selectedTask.id]: 1,
        }));
      }
    }
    setSelectedTask(null);
  };

  const renderTask = ({item, index}) => (
    <View style={index === tasks.length - 1 ? styles.lastTaskCard : null}>
      <TaskCard
        item={item}
        checkboxState={checkboxStates[item.id] || 1}
        onToggle={() => toggleCheckbox(item.id)}
        onTaskCompleted={markTaskCompleted}
      />
    </View>
  );

  const renderNewTask = ({item, index}) => (
    <ModalTaskCard
      item={item}
      checked={!!checkboxStates[item.id]}
      onToggle={() => toggleCheckbox(item.id)}
      isFirstItem={index === 0}
      isGoalOfDay={item.Heading === 'Goal of the Day'}
    />
  );

  const progress = 65;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Logo width={WP(7.8)} height={WP(7.8)} />
          <Text style={styles.brandText}>WingsFly</Text>
        </View>
        <View style={styles.iconRow}>
          <Icon name="search" size={WP(5.3)} color="#4F4F4F" />
          <Image source={Icons.Calendar} style={styles.iconImage} />
          <Icon name="help-outline" size={WP(5.3)} color="#4F4F4F" />
        </View>
      </View>

      <Calender />

      <View style={styles.quoteCard}>
        <Text style={styles.quoteTitle}>Today's Quote</Text>
        <Text style={styles.quoteText}>
          "You must do the things, you think you cannot do."
        </Text>
        <Text style={styles.progressText}>Progress {progress}%</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, {width: `${progress}%`}]} />
          <View style={[styles.progressThumb, {left: `${progress}%`}]} />
        </View>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={renderTask}
        contentContainerStyle={{marginTop: HP(2.5)}}
        showsVerticalScrollIndicator={false}
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <PlusIcon name="plus" size={WP(6.4)} color={colors.White} />
      </Pressable>

      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setModalVisible(false)}
        onBackButtonPress={() => setModalVisible(false)}
        style={styles.bottomModal}
        swipeDirection="down"
        onSwipeComplete={() => setModalVisible(false)}
        useNativeDriver>
        <View style={styles.modalContent}>
          <FlatList
            data={modaltasks}
            keyExtractor={item => item.id}
            renderItem={renderNewTask}
            contentContainerStyle={{marginTop: HP(2.5)}}
          />
        </View>
      </Modal>

      <NumericInputModal
        isVisible={isNumericModalVisible}
        onClose={() => {
          setNumericModalVisible(false);
          setSelectedTask(null);
        }}
        onSave={handleNumericSave}
        taskTitle={selectedTask?.title}
      />

      <AppreciationModal
        isVisible={isAppreciationVisible}
        onClose={() => {
          setAppreciationVisible(false);
          setCompletedTask(null);
        }}
        taskTitle={completedTask?.title || ''}
        streakCount={taskStreak}
        isNewBestStreak={
          completedTask ? isNewBestStreak(completedTask.id, taskStreak) : false
        }
        nextAwardDays={7}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.White},
  header: {
    width: '90%',
    alignSelf: 'center',
    marginTop: HP(2.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: HP(0.75),
  },
  logoRow: {flexDirection: 'row', width: '73%'},
  brandText: {
    fontSize: FS(2.6),
    fontFamily: 'Anton-Regular',
    color: '#363636',
    marginLeft: WP(1.9),
    marginTop: HP(-0.7),
  },
  iconRow: {
    flexDirection: 'row',
    width: '30%',
    gap: WP(3.2),
    marginTop: HP(0.6),
  },
  iconImage: {
    width: WP(5.5),
    height: WP(5.5),
    tintColor: '#4F4F4F',
    resizeMode: 'contain',
  },
  quoteCard: {
    width: '92%',
    alignSelf: 'center',
    backgroundColor: colors.White,
    elevation: 7,
    marginTop: HP(1.9),
    borderRadius: WP(2.1),
    paddingBottom: HP(1.9),
    marginBottom: HP(-0.9),
    paddingTop: HP(1.0),
    height: HP(13.5),
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: HP(0.5)},
    shadowOpacity: 0.3,
    shadowRadius: WP(1.6),
  },
  quoteTitle: {
    fontSize: FS(1.8),
    fontFamily: 'Roboto-Bold',
    textAlign: 'center',
    marginBottom: HP(1.35),
    color: '#3B3B3B',
    marginTop: HP(0.3),
  },
  quoteText: {
    fontSize: FS(1.65),
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
    color: '#5B5B5B',
    marginBottom: HP(1.0),
  },
  progressText: {
    position: 'absolute',
    left: WP(2.9),
    bottom: HP(1.6),
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.PRIMARY,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: HP(0.6),
    width: '100%',
    backgroundColor: '#DBDBDB',
    borderBottomLeftRadius: WP(2.1),
    borderBottomRightRadius: WP(2.1),
    overflow: 'visible',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.Primary,
    borderBottomLeftRadius: WP(2.1),
    borderBottomRightRadius: WP(2.1),
  },
  progressThumb: {
    position: 'absolute',
    top: HP(-0.75),
    width: WP(4.8),
    height: WP(4.8),
    backgroundColor: colors.Primary,
    borderRadius: WP(2.4),
    marginLeft: WP(-2.4),
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.2,
    shadowRadius: WP(1.1),
    elevation: 3,
  },
  lastTaskCard: {
    marginBottom: HP(7.5),
  },
  fab: {
    position: 'absolute',
    right: WP(4.0),
    bottom: HP(0.8),
    height: WP(12.5),
    width: WP(12.5),
    backgroundColor: colors.Primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: WP(2.7),
    elevation: 5,
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: colors.White,
    borderTopLeftRadius: WP(10.7),
    borderTopRightRadius: WP(10.7),
  },
});

export default Home;

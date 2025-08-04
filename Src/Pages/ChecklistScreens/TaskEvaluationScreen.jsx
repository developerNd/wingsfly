import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {useNavigation, useRoute} from '@react-navigation/native';
import ItemInput from '../../Components/ItemInput';

const TaskEvaluationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {taskData, taskId} = route.params;

  const slideAnim = useRef(new Animated.Value(HP(100))).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // state for ItemInput modal
  const [showItemInput, setShowItemInput] = useState(false);

  const [checklistItems, setChecklistItems] = useState([
    {id: 1, text: 'Get at 3 AM', completed: true},
    {id: 2, text: '20 sit ups', completed: true},
    {id: 3, text: '20 Pushups', completed: true},
    {id: 4, text: '20 Anulom Vilom', completed: true},
    {id: 5, text: '7 Kapalbhati', completed: true},
    {id: 6, text: 'Naam jaap 1/2 to 1 Hour', completed: false},
    {id: 7, text: 'Touch the feet of the Mother Earth', completed: true},
    {id: 8, text: 'Remember the name of 5 Yogi', completed: true},
    {
      id: 9,
      text: 'Take 1 litre of warm water with Tumeri, naeem & Gooseberry',
      completed: true,
    },
  ]);

  // Animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateOut = callback => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: HP(100),
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  const toggleChecklistItem = id => {
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === id ? {...item, completed: !item.completed} : item,
      ),
    );
  };

  const handleComplete = () => {
    const completedCount = checklistItems.filter(item => item.completed).length;
    const totalCount = checklistItems.length;

    if (completedCount === totalCount) {
      animateOut(() => {
        navigation.goBack();
      });
    } else {
      setShowItemInput(true);
    }
  };

  // Function to handle adding new item
  const handleAddItem = itemText => {
    if (itemText.trim()) {
      const newId = Math.max(...checklistItems.map(item => item.id)) + 1;
      const newItem = {
        id: newId,
        text: itemText.trim(),
        completed: false,
      };
      setChecklistItems(prev => [...prev, newItem]);
    }
  };

  const handleOverlayPress = () => {
    animateOut(() => {
      navigation.goBack();
    });
  };

  const handleModalPress = () => {
    // Prevent modal from closing when touching inside the modal
  };

  // Function to handle filter icon press
  const handleFilterIconPress = () => {
    animateOut(() => {
      navigation.navigate('FilterScreen', {
        taskData: taskData,
        taskId: taskId,
        checklistItems: checklistItems,
      });
    });
  };

  // Function to handle sort icon press
  const handleSortIconPress = () => {
    animateOut(() => {
      navigation.navigate('SortingScreen', {
        taskData: taskData,
        taskId: taskId,
        checklistItems: checklistItems,
      });
    });
  };

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;

  const renderChecklistItem = ({item, index}) => (
    <TouchableOpacity
      style={[
        styles.checklistItem,
        index === checklistItems.length - 1 && styles.lastChecklistItem,
      ]}
      onPress={() => toggleChecklistItem(item.id)}
      activeOpacity={0.7}>
      <View style={styles.itemLeft}>
        <Text style={styles.numberText}>
          {(index + 1).toString().padStart(2, '0')}.
        </Text>
        <Text
          style={[
            styles.checklistText,
            item.completed && styles.completedText,
          ]}>
          {item.text}
        </Text>
      </View>
      <View style={styles.checkboxContainer}>
        {item.completed ? (
          <View style={styles.checkedBox}>
            <Icon name="check" size={WP(3.2)} color="#00754B" />
          </View>
        ) : (
          <View style={styles.uncheckedBox} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <TouchableWithoutFeedback onPress={handleOverlayPress}>
      <View style={styles.container}>
        <StatusBar backgroundColor="#47474773" barStyle="light-content" />

        <Animated.View style={[styles.overlay, {opacity: overlayOpacity}]} />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <TouchableWithoutFeedback onPress={handleModalPress}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>PMj Morning Routine</Text>
                    <View style={styles.dateBackground}>
                      <Text style={styles.headerDate}>3/12/25</Text>
                    </View>
                  </View>
                  <View style={styles.headerRight}>
                    <Image
                      source={taskData?.image || Icons.Yogo}
                      style={styles.headerIcon}
                    />
                  </View>
                </View>
              </View>

              {/* Checklist */}
              <FlatList
                data={checklistItems}
                keyExtractor={item => item.id.toString()}
                renderItem={renderChecklistItem}
                style={styles.checklistContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.checklistContent}
              />

              {/* Bottom Actions */}
              <View style={styles.bottomActions}>
                <View style={styles.actionsBackground}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.6}
                    onPress={handleFilterIconPress}>
                    <Image source={Icons.Filter} style={styles.actionIcon} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.6}
                    onPress={handleSortIconPress}>
                    <Image source={Icons.Sort} style={styles.actionIcon} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.6}>
                    <Image source={Icons.Eye} style={styles.actionIcon} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Floating Action Button */}
              <TouchableOpacity
                style={[
                  styles.fab,
                  completedCount === totalCount && styles.fabActive,
                ]}
                onPress={handleComplete}
                activeOpacity={0.8}>
                <Icon
                  name={completedCount === totalCount ? 'check' : 'add'}
                  size={WP(7)}
                  color={colors.White}
                />
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* ItemInput Modal */}
        <ItemInput
          visible={showItemInput}
          onClose={() => setShowItemInput(false)}
          onSave={handleAddItem}
          initialNote=""
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#47474773',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HP(73.5),
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: WP(7),
    borderTopRightRadius: WP(7),
    elevation: 10,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  header: {
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(4),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: WP(1.8),
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerRight: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  dateBackground: {
    backgroundColor: '#E4E6FF',
    paddingHorizontal: WP(2.5),
    paddingVertical: HP(0.2),
    borderRadius: WP(1),
    borderWidth: 1,
    borderColor: '#E4E6FF',
    marginTop: HP(0.15),
    alignSelf: 'flex-start',
  },
  headerDate: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
  headerTitle: {
    fontSize: FS(2.35),
    fontFamily: 'Inter-SemiBold',
    color: colors.Black,
  },
  headerIcon: {
    width: WP(13),
    height: WP(13),
    resizeMode: 'contain',
    marginRight: WP(-1.7),
  },
  checklistContainer: {
    flex: 1,
  },
  checklistContent: {
    paddingTop: HP(1),
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(3),
    paddingVertical: HP(1.15),
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  lastChecklistItem: {
    borderBottomWidth: 0,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  numberText: {
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-SemiBold',
    color: '#4D4D4D',
    marginTop: HP(0.2),
    marginLeft: WP(1.3),
  },
  checklistText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#4D4D4D',
    flex: 1,
    marginLeft: WP(1.5),
    lineHeight: HP(2.3),
  },
  completedText: {
    color: '#4D4D4D',
  },
  checkboxContainer: {
    padding: WP(1),
  },
  checkedBox: {
    width: WP(5.3),
    height: WP(5.3),
    backgroundColor: '#BCE1D3',
    borderRadius: WP(2.65),
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckedBox: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.65),
    backgroundColor: '#E5E5E5',
  },
  bottomActions: {
    paddingHorizontal: WP(5),
    paddingVertical: HP(2.2),
    backgroundColor: 'white',
    alignItems: 'flex-start',
  },
  actionsBackground: {
    flexDirection: 'row',
    backgroundColor: '#F4F5FF',
    borderRadius: WP(2),
    padding: WP(1),
  },
  actionButton: {
    padding: WP(1),
    borderRadius: WP(2),
  },
  actionIcon: {
    width: WP(5),
    height: WP(5),
    resizeMode: 'contain',
  },
  fab: {
    position: 'absolute',
    right: WP(4),
    bottom: HP(1.3),
    width: WP(12.5),
    height: WP(12.5),
    backgroundColor: colors.Primary,
    borderRadius: WP(3),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabActive: {
    backgroundColor: colors.Primary,
    elevation: 4,
    shadowColor: colors.Primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
});

export default TaskEvaluationScreen;

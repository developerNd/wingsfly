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
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import ItemInput from '../../Components/ItemInput';
import SuccessConditionModal from '../../Components/SuccessModal';
import {taskService} from '../../services/api/taskService';
import AppreciationModal from '../../Components/AppreciationModal';

const TaskEvaluationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {taskData, taskId} = route.params;

  const slideAnim = useRef(new Animated.Value(HP(100))).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // state for ItemInput modal
  const [showItemInput, setShowItemInput] = useState(false);

  // state for filter mode toggle
  const [isFilterMode, setIsFilterMode] = useState(false);

  // state for success condition modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // state for filter toggle
  const [showAllItems, setShowAllItems] = useState(false);

  const [checklistItems, setChecklistItems] = useState([]);

  const [isAppreciationVisible, setAppreciationVisible] = useState(false);

  // Load checklist items from task data
  useEffect(() => {
    if (taskData && taskData.checklistItems) {
      setChecklistItems(taskData.checklistItems);
    } else {
      setChecklistItems([]);
    }
  }, [taskData]);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (taskData && taskData.checklistItems) {
        setChecklistItems(taskData.checklistItems);
      }
    }, [taskData]),
  );

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

  const toggleChecklistItem = async id => {
    const updatedItems = checklistItems.map(item =>
      item.id === id ? {...item, completed: !item.completed} : item,
    );

    setChecklistItems(updatedItems);

    // Save to database
    try {
      await taskService.updateChecklistTask(taskId, updatedItems);
    } catch (error) {
      console.error('Error updating checklist:', error);
      // Revert on error
      setChecklistItems(checklistItems);
    }
  };

  // Delete an item (used in filter mode)
  const deleteChecklistItem = async id => {
    const updatedItems = checklistItems.filter(item => item.id !== id);
    setChecklistItems(updatedItems);

    // Save to database
    try {
      await taskService.updateChecklistTask(taskId, updatedItems);
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      // Revert on error
      setChecklistItems(checklistItems);
    }
  };

  const handleComplete = async () => {
    const completedCount = checklistItems.filter(item => item.completed).length;
    const totalCount = checklistItems.length;

    if (completedCount === totalCount && totalCount > 0) {
      try {
        await taskService.updateChecklistTask(taskId, checklistItems);

        // Show appreciation modal first
        setAppreciationVisible(true);
      } catch (error) {
        console.error('Error saving final completion state:', error);
        animateOut(() => {
          navigation.goBack();
        });
      }
    } else {
      setShowItemInput(true);
    }
  };

  // Function to handle adding new item
  const handleAddItem = async itemText => {
    if (itemText.trim()) {
      const newId =
        checklistItems.length > 0
          ? Math.max(...checklistItems.map(item => item.id)) + 1
          : 1;
      const newItem = {
        id: newId,
        text: itemText.trim(),
        completed: false,
      };
      const updatedItems = [...checklistItems, newItem];
      setChecklistItems(updatedItems);

      // Save to database
      try {
        await taskService.updateChecklistTask(taskId, updatedItems);
      } catch (error) {
        console.error('Error adding checklist item:', error);
        // Revert on error
        setChecklistItems(checklistItems);
      }
    }
  };

  const handleOverlayPress = () => {
    // If in filter mode, exit filter mode
    if (isFilterMode) {
      setIsFilterMode(false);
      setShowAllItems(false);
      return;
    }

    animateOut(() => {
      navigation.goBack();
    });
  };

  const handleModalPress = () => {
    // Prevent modal from closing when touching inside the modal
  };

  // Toggle filter mode
  const handleFilterToggle = () => {
    setIsFilterMode(!isFilterMode);
    setShowAllItems(false);
  };

  const handleAppreciationClose = () => {
    setAppreciationVisible(false);
    // Navigate back after closing appreciation modal
    animateOut(() => {
      navigation.goBack();
    });
  };

  // Handle filter button click (in filter mode)
  const handleFilterPress = () => {
    setShowAllItems(!showAllItems);
  };

  const handleAllItems = () => {
    setShowSuccessModal(true);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
  };

  const handleSuccessConditionConfirm = result => {
    console.log('Success condition result:', result);
    setShowSuccessModal(false);
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

  // Normal checklist item render
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

  const renderFilterItem = ({item, index}) => (
    <View style={styles.filterItem}>
      <View style={styles.itemLeft}>
        <Text style={styles.numberText}>{index + 1}.</Text>
        <Text style={styles.filterText}>{item.text}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteChecklistItem(item.id)}
        activeOpacity={0.7}>
        <Image source={Icons.Delete} style={styles.deleteIcon} />
      </TouchableOpacity>
    </View>
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
                    <Text style={styles.headerTitle}>
                      {taskData?.title || 'Checklist Task'}
                    </Text>
                    <View style={styles.dateBackground}>
                      <Text style={styles.headerDate}>
                        {new Date().toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.headerRight}>
                    {isFilterMode ? (
                      <View style={styles.clockContainer}>
                        <Image source={Icons.Moment} style={styles.clockIcon} />
                      </View>
                    ) : (
                      <Image
                        source={taskData?.image || Icons.Yogo}
                        style={styles.headerIcon}
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* Checklist */}
              <FlatList
                data={checklistItems}
                keyExtractor={item => item.id.toString()}
                renderItem={
                  isFilterMode ? renderFilterItem : renderChecklistItem
                }
                style={styles.checklistContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.checklistContent}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No checklist items yet</Text>
                    <Text style={styles.emptySubText}>
                      Tap the + button to add items
                    </Text>
                  </View>
                )}
              />

              {/* Bottom Actions */}
              <View style={styles.bottomActions}>
                {isFilterMode ? (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.filterButton}
                      activeOpacity={0.6}
                      onPress={handleFilterPress}>
                      <Image source={Icons.Filter} style={styles.actionIcon} />
                    </TouchableOpacity>

                    {showAllItems && (
                      <TouchableOpacity
                        style={styles.allItemsContainer}
                        onPress={handleAllItems}
                        activeOpacity={0.7}>
                        <View style={styles.allItemsContent}>
                          <Image
                            source={Icons.CheckTick}
                            style={styles.allItemsIcon}
                          />
                          <View style={styles.rightLine} />
                          <Text style={styles.allItemText}>All Items</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  // Normal mode actions
                  <View style={styles.actionsBackground}>
                    <TouchableOpacity
                      style={styles.actionIconButton}
                      activeOpacity={0.6}
                      onPress={handleFilterToggle}>
                      <Image source={Icons.Filter} style={styles.actionIcon} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionIconButton}
                      activeOpacity={0.6}
                      onPress={handleSortIconPress}>
                      <Image source={Icons.Sort} style={styles.actionIcon} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionIconButton}
                      activeOpacity={0.6}>
                      <Image source={Icons.Eye} style={styles.actionIcon} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Floating Action Button */}
              <TouchableOpacity
                style={[
                  styles.fab,
                  completedCount === totalCount && styles.fabActive,
                ]}
                onPress={
                  isFilterMode ? () => setIsFilterMode(false) : handleComplete
                }
                activeOpacity={0.8}>
                <Icon
                  name={
                    isFilterMode
                      ? 'check'
                      : completedCount === totalCount
                      ? 'check'
                      : 'add'
                  }
                  size={WP(6.5)}
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

        {/* Success Condition Modal */}
        <SuccessConditionModal
          visible={showSuccessModal}
          onClose={handleSuccessModalClose}
          onConfirm={handleSuccessConditionConfirm}
        />

        <AppreciationModal
          isVisible={isAppreciationVisible}
          onClose={handleAppreciationClose}
          taskTitle={taskData?.title || 'Checklist Task'}
          streakCount={taskData?.streakCount || 1}
          isNewBestStreak={false}
          nextAwardDays={7}
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
  clockContainer: {
    width: WP(10),
    height: WP(10),
    borderRadius: WP(5),
    backgroundColor: colors.Primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: HP(-0.2),
    marginRight: WP(1.3),
  },
  clockIcon: {
    width: WP(5),
    height: WP(5),
    resizeMode: 'contain',
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
  // Filter mode styles
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(2.8),
    paddingVertical: HP(0.8),
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: colors.White,
  },
  filterText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#4D4D4D',
    flex: 1,
    marginLeft: WP(1.5),
  },
  deleteButton: {
    padding: WP(2),
  },
  deleteIcon: {
    width: WP(5.3),
    height: WP(5.3),
    resizeMode: 'contain',
  },
  bottomActions: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(2.2),
    backgroundColor: 'white',
  },
  actionsBackground: {
    flexDirection: 'row',
    backgroundColor: '#F4F5FF',
    borderRadius: WP(2),
    padding: WP(1),
    alignSelf: 'flex-start',
  },
  actionIconButton: {
    padding: WP(1),
    borderRadius: WP(2),
  },
  actionIcon: {
    width: WP(5),
    height: WP(5),
    resizeMode: 'contain',
  },
  // Filter mode bottom actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: '#EBEDFF',
    borderRadius: WP(2),
    padding: WP(1.5),
    paddingHorizontal: WP(2),
    elevation: 2,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  allItemsContainer: {
    backgroundColor: '#EBEDFF',
    borderRadius: WP(2),
    paddingHorizontal: WP(2.5),
    paddingVertical: WP(1.7),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginLeft: WP(2),
  },
  allItemsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allItemsIcon: {
    width: WP(5),
    height: WP(5),
    resizeMode: 'contain',
    marginLeft: WP(0.5),
  },
  rightLine: {
    width: 1,
    height: WP(8.2),
    backgroundColor: '#E5E5E5',
    marginLeft: WP(1),
    marginRight: WP(2),
    marginTop: HP(-2),
    marginBottom: WP(-4),
  },
  allItemText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(5),
    paddingVertical: HP(10),
  },
  emptyText: {
    fontSize: FS(2.2),
    fontFamily: 'Roboto-Bold',
    color: '#3B3B3B',
    marginBottom: HP(1),
  },
  emptySubText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#5B5B5B',
    textAlign: 'center',
  },
});

export default TaskEvaluationScreen;

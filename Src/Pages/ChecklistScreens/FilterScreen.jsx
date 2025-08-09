import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  SafeAreaView,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {useNavigation, useRoute} from '@react-navigation/native';
import SuccessConditionModal from '../../Components/SuccessModal';
import { taskService } from '../../services/api/taskService';

const FilterScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {taskData, taskId} = route.params || {};

  // Animation values
  const slideAnim = useRef(new Animated.Value(HP(100))).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // state for success condition modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isEyeScreenVisible, setIsEyeScreenVisible] = useState(true);

  // state for filter toggle
  const [showAllItems, setShowAllItems] = useState(false);

  const [screenItems, setScreenItems] = useState([]);

  // Load checklist items from route params
  useEffect(() => {
    if (route.params?.checklistItems) {
      setScreenItems(route.params.checklistItems);
    }
  }, [route.params]);

  // Animation on mount
  useEffect(() => {
    if (isEyeScreenVisible) {
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
    }
  }, [isEyeScreenVisible]);

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

  const toggleScreenItem = id => {
    setScreenItems(prev =>
      prev.map(item =>
        item.id === id ? {...item, completed: !item.completed} : item,
      ),
    );
  };

  const deleteScreenItem = async (id) => {
    const updatedItems = screenItems.filter(item => item.id !== id);
    setScreenItems(updatedItems);
    
    // Save to database if taskId exists
    if (taskId) {
      try {
        await taskService.updateChecklistTask(taskId, updatedItems);
      } catch (error) {
        console.error('Error deleting checklist item:', error);
        // Revert on error
        setScreenItems(screenItems);
      }
    }
  };

  const handleComplete = () => {
    animateOut(() => {
      // Navigate back with updated checklist items
      navigation.navigate('TaskEvaluation', {
        taskData: { ...taskData, checklistItems: screenItems },
        taskId: taskId,
      });
    });
  };

  const handleOverlayPress = () => {
    animateOut(() => {
      navigation.goBack();
    });
  };

  const handleModalPress = () => {};

  // Handle filter button click
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

  const completedCount = screenItems.filter(item => item.completed).length;
  const totalCount = screenItems.length;

  const renderScreenItem = ({item, index}) => (
    <View style={styles.screenItem}>
      <View style={styles.itemLeft}>
        <Text style={styles.numberText}>{index + 1}.</Text>
        <Text style={styles.screenText}>{item.text}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteScreenItem(item.id)}
        activeOpacity={0.7}>
        <Image source={Icons.Delete} style={styles.deleteIcon} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      {/* FilterScreen Modal */}
      {isEyeScreenVisible && (
        <TouchableWithoutFeedback onPress={handleOverlayPress}>
          <View style={styles.container}>
            <StatusBar backgroundColor="#47474773" barStyle="dark-content" />

            <Animated.View
              style={[styles.overlay, {opacity: overlayOpacity}]}
            />

            {/* Animated Modal Card Container */}
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
                          <Text style={styles.headerDate}>{new Date().toLocaleDateString()}</Text>
                        </View>
                      </View>
                      <View style={styles.headerRight}>
                        <View style={styles.clockContainer}>
                          <Image
                            source={Icons.Moment}
                            style={styles.clockIcon}
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Screen Items List */}
                  <FlatList
                    data={screenItems}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderScreenItem}
                    style={styles.screenListContainer}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.screenListContent}
                  />

                  {/* Bottom Actions */}
                  <View style={styles.bottomActions}>
                    <View style={styles.actionsRow}>
                      {/* Filter Button with toggle functionality */}
                      <TouchableOpacity
                        style={styles.filterButton}
                        activeOpacity={0.6}
                        onPress={handleFilterPress}>
                        <Image
                          source={Icons.Filter}
                          style={styles.actionIcon}
                        />
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
                  </View>

                  {/* Floating Action Button */}
                  <TouchableOpacity
                    style={styles.fab}
                    onPress={handleComplete}
                    activeOpacity={0.8}>
                    <Icon name="add" size={WP(6.5)} color={colors.White} />
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      )}

      <SuccessConditionModal
        visible={showSuccessModal}
        onClose={handleSuccessModalClose}
        onConfirm={handleSuccessConditionConfirm}
      />
    </>
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
    height: HP(73.4),
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.White,
    borderTopLeftRadius: WP(7),
    borderTopRightRadius: WP(7),
    elevation: 10,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  header: {
    paddingVertical: HP(2),
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
    paddingHorizontal: WP(1.5),
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
    fontSize: FS(2),
    fontFamily: 'Inter-SemiBold',
    color: colors.Black,
  },
  screenListContainer: {
    flex: 1,
  },
  screenListContent: {
    paddingBottom: HP(2),
  },
  screenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(2.8),
    paddingVertical: HP(0.8),
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: colors.White,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  numberText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#4D4D4D',
    marginTop: HP(0.1),
    marginLeft: WP(3),
  },
  screenText: {
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
    paddingVertical: HP(2),
    backgroundColor: 'white',
  },
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
  actionIcon: {
    width: WP(5),
    height: WP(5),
    resizeMode: 'contain',
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
    right: WP(4.5),
    bottom: HP(1.7),
    width: WP(10),
    height: WP(10),
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
});

export default FilterScreen;

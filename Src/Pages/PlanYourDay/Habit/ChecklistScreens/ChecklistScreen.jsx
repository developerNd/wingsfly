import React, {useState} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useRoute} from '@react-navigation/native';
import Headers from '../../../../Components/Headers';
import {colors, Icons} from '../../../../Helper/Contants';
import {HP, WP, FS} from '../../../../utils/dimentions';
import CustomToast from '../../../../Components/CustomToast';

const ChecklistScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Get previous screen data
  const selectedCategory = route.params?.selectedCategory;
  const evaluationType = route.params?.evaluationType;

  const [habit, setHabit] = useState('');
  const [description, setDescription] = useState('');
  const [habitFocused, setHabitFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const [selectedSuccessCondition, setSelectedSuccessCondition] =
    useState('Custom');
  const [customItems, setCustomItems] = useState('1');

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  const [checklistItems, setChecklistItems] = useState([
    {id: 1, text: 'Intraday', completed: false},
    {id: 2, text: 'Swing Trading', completed: false},
    {id: 3, text: 'Long term', completed: false},
    {id: 4, text: 'Short term', completed: false},
  ]);

  const isHabitLabelActive = habitFocused || habit.length > 0;
  const isDescriptionLabelActive = descriptionFocused || description.length > 0;

  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const handleDeleteItem = id => {
    setChecklistItems(checklistItems.filter(item => item.id !== id));
  };

  const handleAddItem = () => {
    if (checklistItems.length < 10) {
      const newItem = {
        id: Date.now(),
        text: `New item ${checklistItems.length + 1}`,
        completed: false,
      };
      setChecklistItems([...checklistItems, newItem]);
    }
  };

  const handleSuccessConditionChange = condition => {
    setSelectedSuccessCondition(condition);
  };

  const handleCustomItemsChange = text => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setCustomItems(numericValue);
  };

  const handleHabitChange = text => {
    setHabit(text);

    if (toastVisible) {
      hideToast();
    }
  };

  const handleHabitBlur = () => {
    setHabitFocused(false);
  };

  const handleNextPress = () => {
    if (!habit.trim()) {
      showToast('Enter a name');
      return;
    }

    // Validation for minimum checklist items
    if (checklistItems.length === 0) {
      showToast('Minimum 1 checklist item required');
      return;
    }

    const navigationData = {
      selectedCategory,
      evaluationType,
      habit: habit.trim(),
      description,
      checklistItems,
      selectedSuccessCondition,
      customItems,
      type: 'Habit', // Add task type
    };

    // Navigate to FrequencyScreen
    navigation.navigate('FrequencyScreen', navigationData);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
      <View style={styles.headerWrapper}>
        <Headers title="Define Your Task">
          <TouchableOpacity onPress={handleNextPress}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isHabitLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}>
            Habit
          </Text>
          <TextInput
            style={styles.textInput}
            value={habit}
            onChangeText={handleHabitChange}
            onFocus={() => setHabitFocused(true)}
            onBlur={handleHabitBlur}
            placeholder={isHabitLabelActive ? '' : ''}
            placeholderTextColor="transparent"
          />
        </View>

        <Text style={styles.exampleText}>e.g..Morning routine.</Text>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Checklist</Text>

          {checklistItems.map((item, index) => (
            <View key={item.id} style={styles.checklistItem}>
              <Text style={styles.checklistNumber}>{index + 1}.</Text>
              <Text style={styles.checklistText}>{item.text}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteItem(item.id)}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Image
                  source={Icons.Trash}
                  style={styles.deleteIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addItemButton}
            onPress={handleAddItem}>
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Success Condition</Text>

          <View style={styles.successConditionContainer}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => handleSuccessConditionChange('All Items')}>
              <View
                style={[
                  styles.radioCircle,
                  selectedSuccessCondition === 'All Items' &&
                    styles.radioCircleSelected,
                ]}>
                {selectedSuccessCondition === 'All Items' && (
                  <View style={styles.radioCircleInner} />
                )}
              </View>
              <Text style={styles.radioText}>All Items</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => handleSuccessConditionChange('Custom')}>
              <View
                style={[
                  styles.radioCircle,
                  selectedSuccessCondition === 'Custom' &&
                    styles.radioCircleSelected,
                ]}>
                {selectedSuccessCondition === 'Custom' && (
                  <View style={styles.radioCircleInner} />
                )}
              </View>
              <Text style={styles.radioText}>Custom</Text>
            </TouchableOpacity>

            {selectedSuccessCondition === 'Custom' && (
              <View style={styles.customInputContainer}>
                <View style={styles.customInputWrapper}>
                  <TextInput
                    style={styles.customInput}
                    value={customItems}
                    onChangeText={handleCustomItemsChange}
                    placeholder=""
                    placeholderTextColor="transparent"
                    keyboardType="numeric"
                    maxLength={2}
                    selectTextOnFocus={true}
                    scrollEnabled={false}
                  />
                  <View style={styles.customInputBottomLine} />
                </View>
                <Text style={styles.itemsText}>Items (S)</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isDescriptionLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}>
            Description (optional)
          </Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            onFocus={() => setDescriptionFocused(true)}
            onBlur={() => setDescriptionFocused(false)}
            placeholder={isDescriptionLabelActive ? '' : ''}
            placeholderTextColor="transparent"
            multiline={true}
          />
        </View>

        <View style={styles.progressIndicator}>
          <View style={styles.progressDotCompleted}>
            <MaterialIcons name="check" size={WP(3.2)} color={colors.White} />
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressDotActive}>
            <View style={styles.progressDotActiveInner}>
              <Text style={styles.progressDotTextActive}>2</Text>
            </View>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressDotInactive}>
            <Text style={styles.progressDotTextInactive}>3</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressDotInactive}>
            <Text style={styles.progressDotTextInactive}>4</Text>
          </View>
        </View>
      </ScrollView>

      {/* Custom Toast */}
      <CustomToast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={3000}
        onHide={hideToast}
        position="bottom"
        showIcon={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  headerWrapper: {
    marginTop: HP(2.2),
    paddingBottom: HP(0.625),
  },
  nextText: {
    fontSize: FS(1.8),
    color: '#1A73E8',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(4.5),
    paddingTop: HP(2.7),
  },
  inputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(1.8),
    padding: WP(2.133),
    marginBottom: HP(1.7),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minHeight: HP(4.375),
  },
  inputLabel: {
    fontSize: FS(1.625),
    color: '#666666',
    fontFamily: 'OpenSans-Bold',
    position: 'absolute',
    backgroundColor: colors.White,
    paddingHorizontal: WP(1.4),
    zIndex: 1,
  },
  inputLabelActive: {
    top: HP(-1.25),
    left: WP(2.7),
    fontSize: FS(1.7),
    color: '#666666',
    fontFamily: 'OpenSans-Bold',
  },
  inputLabelInactive: {
    top: HP(1.75),
    left: WP(3.2),
    fontSize: FS(1.9),
    color: '#575656',
    fontFamily: 'OpenSans-Bold',
  },
  textInput: {
    fontSize: FS(2.0),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(2.133),
    minHeight: HP(2.5),
  },
  exampleText: {
    fontSize: FS(1.85),
    fontFamily: 'OpenSans-SemiBold',
    color: '#A3A3A3',
    marginBottom: HP(1.5),
    marginTop: HP(0.8),
    lineHeight: HP(2.25),
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: HP(2.5),
  },
  successConditionContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(1.8),
    padding: WP(3.2),
    marginBottom: HP(1.1),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    marginBottom: HP(1.2),
    marginLeft: WP(0.3),
  },
  checklistItem: {
    backgroundColor: colors.White,
    borderRadius: WP(2.2),
    padding: WP(3.2),
    marginBottom: HP(2),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: HP(6),
  },
  checklistNumber: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    marginRight: WP(2),
    marginLeft: WP(2.3),
  },
  checklistText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    flex: 1,
  },
  deleteButton: {
    padding: WP(2),
    borderRadius: WP(1),
    backgroundColor: 'transparent',
    minWidth: WP(8),
    minHeight: WP(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemButton: {
    alignItems: 'center',
  },
  addItemText: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    marginBottom: HP(0.2),
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1.5),
    marginLeft: WP(2),
    marginTop: HP(1.2),
  },
  radioCircle: {
    width: WP(5),
    height: WP(5),
    borderRadius: WP(2.5),
    borderWidth: 1,
    borderColor: '#625F5F',
    marginRight: WP(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.Primary,
  },
  radioCircleInner: {
    width: WP(3.5),
    height: WP(3.5),
    borderRadius: WP(1.75),
    backgroundColor: colors.Primary,
  },
  radioText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
  },
  customInputContainer: {
    backgroundColor: '#E9E9E9',
    borderRadius: WP(1.8),
    padding: WP(3.2),
    marginTop: HP(0.6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: HP(5.5),
    width: WP(79),
    marginLeft: WP(2),
    marginBottom: HP(1),
  },
  customInputWrapper: {
    alignItems: 'center',
  },
  customInput: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#575656',
    textAlign: 'center',
    width: WP(7),
    height: HP(4),
    backgroundColor: 'transparent',
    marginRight: WP(3),
    paddingHorizontal: 0,
    paddingVertical: HP(0.5),
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  customInputBottomLine: {
    width: WP(6),
    height: HP(0.125),
    backgroundColor: '#565656',
    marginTop: HP(-0.8),
    marginRight: WP(2.5),
    marginBottom: HP(1),
  },
  itemsText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#565656',
  },
  descriptionInput: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Regular',
    color: '#575656',
    minHeight: HP(10.5),
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(2.667),
    textAlignVertical: 'top',
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(2.7),
    marginBottom: HP(2),
  },
  progressDotCompleted: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.65),
    backgroundColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: WP(0.5),
    borderColor: colors.Primary,
  },
  progressDotActive: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.6),
    backgroundColor: colors.White,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: WP(0.68),
    borderColor: colors.Primary,
  },
  progressDotActiveInner: {
    width: WP(3.6),
    height: WP(3.6),
    borderRadius: WP(1.85),
    backgroundColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotTextActive: {
    color: colors.White,
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Bold',
  },
  progressDotInactive: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.65),
    backgroundColor: 'transparent',
    borderWidth: WP(0.5),
    borderColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotTextInactive: {
    color: colors.Primary,
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Bold',
  },
  deleteIcon: {
    width: WP(4),
    height: WP(4.5),
    tintColor: '#625F5F',
  },
  progressLine: {
    width: WP(5.3),
    height: HP(0.16),
    marginLeft: WP(0.5),
    marginRight: WP(0.5),
    backgroundColor: colors.Primary,
  },
});

export default ChecklistScreen;

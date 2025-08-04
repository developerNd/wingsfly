import React, {useState} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import Headers from '../../Components/Headers';
import SortingModal from '../../Components/SortingModal';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';

const SortingOptionsScreen = () => {
  const navigation = useNavigation();

  const [expandedSections, setExpandedSections] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [currentModalData, setCurrentModalData] = useState({});

  // different options for each section
  const sortingOptionsData = {
    todoList1: [
      'By Priority',
      'By Time',
      'Alphabetical',
      'By Category',
      'Task First',
      'Habit First',
    ],
    todoList2: ['By Priority', 'By Time', 'Alphabetical', 'By Category'],
    recurringTasks1: ['By Priority', 'By Time', 'Alphabetical', 'By Category'],
    recurringTasks2: ['By Priority', 'Alphabetical', 'Creation Date'],
  };

  const sortingOptions = [
    {
      id: 'todoList1',
      title: 'To-do List order criteria',
      modalTitle: 'To-do List Order Criteria',
      icon: Icons.TickCircle,
      options: sortingOptionsData.todoList1,
    },
    {
      id: 'todoList2',
      title: 'To-do List order criteria',
      modalTitle: '“Habits” Section Orders criteria',
      icon: Icons.Cup,
      options: sortingOptionsData.todoList2,
    },
    {
      id: 'recurringTasks1',
      title: 'Recurring Tasks Section order criteria',
      modalTitle: '‘Recurring Task’ Section Order Criteria',
      icon: Icons.Recurring,
      options: sortingOptionsData.recurringTasks1,
    },
    {
      id: 'recurringTasks2',
      title: 'Recurring Tasks Section order criteria',
      modalTitle: 'Checklist Sorting Criteria',
      icon: Icons.Check,
      options: sortingOptionsData.recurringTasks2,
    },
  ];

  const toggleSection = sectionId => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const openModal = (sectionId, modalTitle, options, priority) => {
    setCurrentModalData({
      sectionId,
      title: modalTitle,
      options,
      priority,
    });
    setModalVisible(true);
  };

  const selectOption = option => {
    const key = `${currentModalData.sectionId}_${currentModalData.priority}`;
    setSelectedOptions(prev => ({
      ...prev,
      [key]: option,
    }));
  };

  const handleNextPress = () => {
    console.log('Selected options:', selectedOptions);
    navigation.goBack();
  };

  const hasAnyExpanded = Object.values(expandedSections).some(
    expanded => expanded,
  );

  // Fixed renderIcon function with consistent sizing but special case for cup
  const renderIcon = (iconSource, optionId) => {
    const iconStyle = optionId === 'todoList2' ? styles.cupIcon : styles.icon;
    return <Image source={iconSource} style={iconStyle} />;
  };

  const renderSortingOption = option => {
    const isExpanded = expandedSections[option.id];
    const firstSelectedValue = selectedOptions[`${option.id}_first`];
    const secondSelectedValue = selectedOptions[`${option.id}_second`];

    return (
      <View key={option.id} style={styles.sortingOptionContainer}>
        <TouchableOpacity
          style={styles.sortingOptionHeader}
          onPress={() => toggleSection(option.id)}>
          <View style={styles.leftSection}>
            <View style={styles.iconContainer}>
              {renderIcon(option.icon, option.id)}
            </View>
            <Text style={styles.sortingOptionTitle}>{option.title}</Text>
          </View>

          <MaterialIcons
            name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={WP(6)}
            color={colors.Black}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.optionsContainer}>
            {/* First Option */}
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() =>
                openModal(option.id, option.modalTitle, option.options, 'first')
              }>
              <MaterialIcons
                name="keyboard-arrow-right"
                size={WP(4.5)}
                color="#626262"
              />

              <View style={styles.optionContent}>
                <Text style={styles.optionText}>First</Text>
                <Text style={styles.optionSubText}>
                  {firstSelectedValue || 'Select Option'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Second Option */}
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() =>
                openModal(
                  option.id,
                  option.modalTitle,
                  option.options,
                  'second',
                )
              }>
              <MaterialIcons
                name="keyboard-arrow-right"
                size={WP(4.5)}
                color="#626262"
              />

              <View style={styles.optionContent}>
                <Text style={styles.optionText}>Second</Text>
                <Text style={styles.optionSubText}>
                  {secondSelectedValue || 'Select Option'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Sorting Options">
          {hasAnyExpanded && (
            <TouchableOpacity onPress={handleNextPress}>
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          )}
        </Headers>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sortingOptions.map(renderSortingOption)}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Sorting Modal */}
      <SortingModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={currentModalData.title}
        options={currentModalData.options || []}
        selectedOption={
          selectedOptions[
            `${currentModalData.sectionId}_${currentModalData.priority}`
          ]
        }
        onSelectOption={selectOption}
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
    marginTop: HP(2.5),
    paddingBottom: HP(1.8),
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  nextText: {
    fontSize: FS(1.8),
    color: '#1A73E8',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingTop: HP(1),
  },
  sortingOptionContainer: {
    marginBottom: HP(1.5),
  },
  sortingOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(2.8),
    paddingVertical: HP(0.9),
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: WP(8),
    height: WP(8),
    marginRight: WP(1.7),
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: WP(4.9),
    height: WP(4.9),
    resizeMode: 'contain',
    tintColor: colors.Black,
  },
  cupIcon: {
    width: WP(6.2),
    height: WP(6.2),
    resizeMode: 'contain',
    tintColor: colors.Black,
  },
  sortingOptionTitle: {
    fontSize: FS(1.735),
    fontFamily: 'OpenSans-SemiBold',
    color: '#393939',
    flex: 1,
    textAlign: 'left',
  },
  optionsContainer: {
    paddingTop: HP(1),
    paddingBottom: HP(1.4),
    backgroundColor: '#F1F1F1',
    marginLeft: WP(0.7),
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.2),
    backgroundColor: 'transparent',
  },
  optionContent: {
    marginLeft: WP(2),
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#626262',
  },
  optionSubText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#626262',
    marginRight: WP(0.7),
  },
  bottomSpacing: {
    height: HP(5),
  },
});

export default SortingOptionsScreen;

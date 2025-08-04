import React, {useState} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Headers from '../../Components/Headers';
import {HP, WP, FS} from '../../utils/dimentions';
import {colors, Icons} from '../../Helper/Contants';

const AddGoalScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Get category data from navigation params
  const selectedCategoryData = route.params?.selectedCategory;
  const selectedGender = route.params?.selectedGender;

  // Goal form states
  const [goalText, setGoalText] = useState('');
  const [selectedCategory] = useState(
    selectedCategoryData?.title || 'Work & Career',
  );

  const [goalFocused, setGoalFocused] = useState(false);

  const handleNextPress = () => {
    const goalData = {
      goalText,
      selectedCategory,
      categoryId: selectedCategoryData?.id,
      selectedGender,
    };

    console.log('Goal data:', goalData);
    navigation.navigate('SetGoalScreen', goalData);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <Headers title="Add Long Term Goal">
          <TouchableOpacity onPress={handleNextPress}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Category Display */}
        <View style={styles.categoryContainer}>
          <View style={styles.categoryRow}>
            <View style={styles.categoryLeft}>
              <View style={styles.categoryIconContainer}>
                <Image
                  source={selectedCategoryData?.image || Icons.Men1}
                  style={styles.categoryDisplayIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.categoryDisplayText}>{selectedCategory}</Text>
            </View>
          </View>
        </View>

        {/* Goal Input */}
        <View style={styles.goalInputContainer}>
          <View style={styles.inputRowContainer}>
            <TextInput
              style={styles.goalInput}
              value={goalText}
              onChangeText={setGoalText}
              onFocus={() => setGoalFocused(true)}
              onBlur={() => setGoalFocused(false)}
              placeholder="Enter Your Long Term Goal"
              placeholderTextColor="#575656"
              multiline={false}
            />
            <TouchableOpacity style={styles.plusButton}>
              <Image
                source={Icons.Plus}
                style={styles.plusIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(4),
    paddingTop: HP(0.7),
  },
  categoryContainer: {
    padding: WP(2.133),
    marginBottom: HP(2),
    minHeight: HP(6.6),
    justifyContent: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: WP(0.8),
    marginLeft: WP(-1.5),
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: WP(12),
    height: WP(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(4),
  },
  categoryDisplayIcon: {
    width: WP(13.5),
    height: WP(13.5),
    borderColor: '#868686',
    borderWidth: 1,
    borderRadius: WP(8),
  },
  categoryDisplayText: {
    fontSize: FS(2.05),
    fontFamily: 'OpenSans-Bold',
    color: '#242424',
  },
  goalInputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    padding: WP(2.133),
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
    minHeight: HP(6.4),
  },
  inputRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalInput: {
    flex: 1,
    fontSize: FS(1.25),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    paddingVertical: HP(0.25),
    paddingHorizontal: WP(1.8),
  },
  plusButton: {
    padding: WP(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    width: WP(3.3),
    height: WP(3.3),
    tintColor: '#575656',
  },
});

export default AddGoalScreen;

import React, {useState, useEffect, useMemo} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Headers from '../../../Components/Headers';
import DatePickerModal from '../../../Components/DatePickerModal';
import {colors, Icons} from '../../../Helper/Contants';
import {HP, WP, FS} from '../../../utils/dimentions';
import {challengeService} from '../../../services/api/challengeService';
import {useAuth} from '../../../contexts/AuthContext';

const ChallengeScreen = () => {
  const [challengeName, setChallengeName] = useState('');
  const [challengeWhy, setChallengeWhy] = useState('');
  const [numberOfDays, setNumberOfDays] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Focus states for input labels
  const [challengeNameFocused, setChallengeNameFocused] = useState(false);
  const [challengeWhyFocused, setChallengeWhyFocused] = useState(false);

  const navigation = useNavigation();
  const {user} = useAuth();

  // Calculate end date automatically based on start date and number of days
  const endDate = useMemo(() => {
    if (!numberOfDays || isNaN(parseInt(numberOfDays))) {
      return null;
    }
    const days = parseInt(numberOfDays);
    if (days <= 0) return null;

    const end = new Date(startDate);
    end.setDate(end.getDate() + days - 1); // Subtract 1 because start date is day 1
    return end;
  }, [startDate, numberOfDays]);

  // Format date for display
  const formatDate = date => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Validate form inputs
  const isFormValid = () => {
    if (!challengeName.trim()) return false;
    if (!challengeWhy.trim()) return false;
    if (
      !numberOfDays ||
      isNaN(parseInt(numberOfDays)) ||
      parseInt(numberOfDays) <= 0
    )
      return false;
    if (!user) return false;
    return true;
  };

  // Handle date selection
  const handleDateSelect = date => {
    setStartDate(date);
    setDatePickerVisible(false);
  };

  // Handle number of days input
  const handleDaysInput = text => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    setNumberOfDays(numericText);
  };

  // Handle challenge creation
  const handleCreateChallenge = async () => {
    if (!isFormValid()) {
      Alert.alert('Validation Error', 'Please fill in all fields correctly.');
      return;
    }

    const days = parseInt(numberOfDays);
    if (days > 365) {
      Alert.alert(
        'Invalid Duration',
        'Challenge duration cannot exceed 365 days.',
      );
      return;
    }

    setLoading(true);

    try {
      const challengeData = {
        userId: user.id,
        name: challengeName.trim(),
        why: challengeWhy.trim(),
        numberOfDays: days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      console.log('Creating challenge:', challengeData);

      // Create challenge using the service
      const newChallenge = await challengeService.createChallenge(
        challengeData,
      );

      console.log('Challenge created successfully:', newChallenge);

      Alert.alert(
        'Challenge Created!',
        `Your ${days}-day challenge "${challengeName}" is ready to begin!`,
        [
          {
            text: 'View Challenges',
            onPress: () => {
              // Navigate to challenges list if you have that screen
              navigation.navigate('Home', {challengeCreated: true});
            },
          },
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ],
      );

      // Reset form
      setChallengeName('');
      setChallengeWhy('');
      setNumberOfDays('');
      setStartDate(new Date());
    } catch (error) {
      console.error('Error creating challenge:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create challenge. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      Alert.alert(
        'Authentication Required',
        'Please log in to create challenges.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    }
  }, [user, navigation]);

  // Label active states
  const isChallengeNameLabelActive =
    challengeNameFocused || challengeName.length > 0;
  const isChallengeWhyLabelActive =
    challengeWhyFocused || challengeWhy.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      {/* Header using Headers component */}
      <View style={styles.headerWrapper}>
        <Headers title="Create Challenge">
          <TouchableOpacity
            onPress={handleCreateChallenge}
            disabled={!isFormValid() || loading}>
            <Text
              style={[
                styles.createText,
                (!isFormValid() || loading) && styles.createTextDisabled,
              ]}>
              {loading ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Challenge Name Section */}
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isChallengeNameLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}>
            Challenge Name
          </Text>
          <TextInput
            style={styles.textInput}
            value={challengeName}
            onChangeText={setChallengeName}
            onFocus={() => setChallengeNameFocused(true)}
            onBlur={() => setChallengeNameFocused(false)}
            placeholder=""
            placeholderTextColor="#575656"
            maxLength={70}
          />
        </View>

        {/* Why Section */}
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isChallengeWhyLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}>
            Why This Challenge?
          </Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={challengeWhy}
            onChangeText={setChallengeWhy}
            onFocus={() => setChallengeWhyFocused(true)}
            onBlur={() => setChallengeWhyFocused(false)}
            placeholder=""
            placeholderTextColor="#575656"
            maxLength={200}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Duration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Challenge Duration</Text>
          <View style={styles.durationContainer}>
            <View style={styles.daysInputContainer}>
              <TextInput
                style={styles.daysInput}
                placeholder="30"
                value={numberOfDays}
                onChangeText={handleDaysInput}
                keyboardType="numeric"
                maxLength={3}
                placeholderTextColor="#929292"
              />
              <Text style={styles.daysLabel}>days</Text>
            </View>
          </View>
        </View>

        {/* Start Date Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Date</Text>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setDatePickerVisible(true)}>
            <Image source={Icons.Calendar} style={styles.iconImage} />
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>{formatDate(startDate)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* End Date Display */}
        {endDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>End Date</Text>
            <View style={styles.dateSelector}>
              <Image source={Icons.Calendar} style={styles.iconImage} />
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onDateSelect={handleDateSelect}
        initialDate={startDate}
        title="Select Start Date"
        minimumDate={new Date()} // Prevent selecting past dates
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  headerWrapper: {
    marginTop: HP(2.5),
    paddingBottom: HP(0.625),
  },
  createText: {
    fontSize: FS(1.8),
    color: colors.Primary,
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  createTextDisabled: {
    color: '#A5A5A5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: WP(4.533),
    paddingBottom: HP(2),
    paddingTop: HP(2.8),
  },
  section: {
    marginBottom: HP(2.3),
  },
  sectionTitle: {
    fontSize: FS(1.625),
    color: '#666666',
    fontFamily: 'OpenSans-Bold',
    marginBottom: HP(1),
  },
  inputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    padding: WP(2.133),
    marginBottom: HP(2.3),
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
    paddingHorizontal: WP(1.7),
    zIndex: 1,
  },
  inputLabelActive: {
    top: HP(-1.25),
    left: WP(2.7),
    fontSize: FS(1.5),
    color: '#666666',
    fontFamily: 'OpenSans-Bold',
  },
  inputLabelInactive: {
    top: HP(1.5),
    left: WP(3.2),
    fontSize: FS(1.7),
    color: '#575656',
    fontFamily: 'OpenSans-Bold',
  },
  textInput: {
    fontSize: FS(2.0),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    paddingVertical: HP(-0.25),
    paddingHorizontal: WP(2.133),
  },
  textArea: {
    minHeight: HP(8),
    maxHeight: HP(15),
    textAlignVertical: 'top',
    paddingTop: HP(1),
  },
  durationContainer: {
    alignItems: 'flex-start',
  },
  daysInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.White,
    elevation: 3,
    borderRadius: WP(2.133),
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingRight: WP(4),
    minHeight: HP(4.375),
  },
  daysInput: {
    padding: WP(4),
    fontSize: FS(2.0),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    minWidth: WP(20),
    textAlign: 'center',
  },
  daysLabel: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#929292',
    marginLeft: WP(2),
  },
  dateSelector: {
    backgroundColor: colors.White,
    elevation: 3,
    borderRadius: WP(2.133),
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: WP(4),
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: HP(4.375),
  },
  dateContainer: {
    backgroundColor: '#EFEFEF',
    paddingHorizontal: WP(5),
    paddingVertical: HP(1),
    borderRadius: WP(1.5),
    marginLeft: WP(3),
  },
  dateText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#5F5F5F',
  },
  iconImage: {
    width: WP(6),
    height: WP(6),
    tintColor: '#4F4F4F',
    resizeMode: 'contain',
    marginBottom: HP(0.4),
  },
});

export default ChallengeScreen;

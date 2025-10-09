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
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Headers from '../../../Components/Headers';
import DatePickerModal from '../../../Components/DatePickerModal';
import {colors, Icons} from '../../../Helper/Contants';
import {HP, WP, FS} from '../../../utils/dimentions';
import {challengeService} from '../../../services/api/challengeService';
import {useAuth} from '../../../contexts/AuthContext';

const EditChallengeScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {user} = useAuth();
  
  const {challengeId} = route.params;

  const [challengeName, setChallengeName] = useState('');
  const [challengeWhy, setChallengeWhy] = useState('');
  const [numberOfDays, setNumberOfDays] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Focus states for input labels
  const [challengeNameFocused, setChallengeNameFocused] = useState(false);
  const [challengeWhyFocused, setChallengeWhyFocused] = useState(false);

  // Date picker config
  const [datePickerConfig, setDatePickerConfig] = useState({
    visible: false,
    initialDate: new Date(),
    title: '',
    minimumDate: null,
    maximumDate: null,
  });

  // Calculate end date automatically
  const endDate = useMemo(() => {
    if (!numberOfDays || isNaN(parseInt(numberOfDays))) {
      return null;
    }
    const days = parseInt(numberOfDays);
    if (days <= 0) return null;

    const end = new Date(startDate);
    end.setDate(end.getDate() + days - 1);
    return end;
  }, [startDate, numberOfDays]);

  // Load challenge data
  useEffect(() => {
    loadChallengeData();
  }, [challengeId]);

  const loadChallengeData = async () => {
    try {
      setLoading(true);
      const challenge = await challengeService.getChallengeById(challengeId);
      
      setChallengeName(challenge.name);
      setChallengeWhy(challenge.why || '');
      setNumberOfDays(challenge.number_of_days.toString());
      setHoursPerDay(challenge.hours_per_day.toString());
      setStartDate(new Date(challenge.start_date));
    } catch (error) {
      console.error('Error loading challenge:', error);
      Alert.alert('Error', 'Failed to load challenge data.', [
        {text: 'OK', onPress: () => navigation.goBack()}
      ]);
    } finally {
      setLoading(false);
    }
  };

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

  // Validate form
  const isFormValid = () => {
    if (!challengeName.trim()) return false;
    if (!challengeWhy.trim()) return false;
    if (!numberOfDays || isNaN(parseInt(numberOfDays)) || parseInt(numberOfDays) <= 0) return false;
    if (!hoursPerDay || isNaN(parseFloat(hoursPerDay)) || parseFloat(hoursPerDay) <= 0 || parseFloat(hoursPerDay) > 24) return false;
    return true;
  };

  // Handle date selection
  const handleDateSelect = date => {
    setStartDate(date);
    setDatePickerConfig(prev => ({ ...prev, visible: false }));
  };

  // Show date picker
  const showChallengeDatePicker = () => {
    setDatePickerConfig({
      visible: true,
      initialDate: startDate,
      title: 'Select Start Date',
      minimumDate: new Date(),
      maximumDate: null,
    });
  };

  // Handle number of days input
  const handleDaysInput = text => {
    const numericText = text.replace(/[^0-9]/g, '');
    setNumberOfDays(numericText);
  };

  // Handle hours per day input
  const handleHoursInput = text => {
    const cleanedText = text.replace(/[^0-9.]/g, '');
    const parts = cleanedText.split('.');
    if (parts.length > 2) return;
    
    if (parts[1] && parts[1].length > 1) {
      setHoursPerDay(parts[0] + '.' + parts[1].substring(0, 1));
      return;
    }
    
    setHoursPerDay(cleanedText);
  };

  // Handle update challenge
  const handleUpdateChallenge = async () => {
    if (!isFormValid()) {
      Alert.alert('Validation Error', 'Please fill in all fields correctly.');
      return;
    }

    const days = parseInt(numberOfDays);
    if (days > 365) {
      Alert.alert('Invalid Duration', 'Challenge duration cannot exceed 365 days.');
      return;
    }

    const hours = parseFloat(hoursPerDay);
    if (hours > 24) {
      Alert.alert('Invalid Hours', 'Hours per day cannot exceed 24.');
      return;
    }

    setSaving(true);

    try {
      const challengeData = {
        name: challengeName.trim(),
        why: challengeWhy.trim(),
        numberOfDays: days,
        hoursPerDay: hours,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      await challengeService.updateChallenge(challengeId, challengeData);

      Alert.alert(
        'Challenge Updated!',
        'Your challenge has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      console.error('Error updating challenge:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to update challenge. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Label active states
  const isChallengeNameLabelActive = challengeNameFocused || challengeName.length > 0;
  const isChallengeWhyLabelActive = challengeWhyFocused || challengeWhy.length > 0;

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Edit Challenge" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Primary} />
          <Text style={styles.loadingText}>Loading challenge...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <Headers title="Edit Challenge">
          <TouchableOpacity
            onPress={handleUpdateChallenge}
            disabled={!isFormValid() || saving}
          >
            <Text
              style={[
                styles.saveText,
                (!isFormValid() || saving) && styles.saveTextDisabled,
              ]}
            >
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Challenge Name Section */}
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isChallengeNameLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}
          >
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
            ]}
          >
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

        {/* Hours Per Day Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hours Per Day</Text>
          <View style={styles.durationContainer}>
            <View style={styles.daysInputContainer}>
              <TextInput
                style={styles.daysInput}
                placeholder="2.5"
                value={hoursPerDay}
                onChangeText={handleHoursInput}
                keyboardType="decimal-pad"
                maxLength={4}
                placeholderTextColor="#929292"
              />
              <Text style={styles.daysLabel}>hours/day</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            How many hours per day will you dedicate to this challenge?
          </Text>
        </View>

        {/* Start Date Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Date</Text>
          <TouchableOpacity style={styles.dateSelector} onPress={showChallengeDatePicker}>
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

        <View style={styles.noteContainer}>
          <MaterialIcons name="info-outline" size={20} color="#666666" />
          <Text style={styles.noteText}>
            Note: Tasks associated with this challenge need to be edited separately.
          </Text>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerConfig.visible}
        onClose={() => setDatePickerConfig(prev => ({ ...prev, visible: false }))}
        onDateSelect={handleDateSelect}
        initialDate={datePickerConfig.initialDate}
        title={datePickerConfig.title}
        minimumDate={datePickerConfig.minimumDate}
        maximumDate={datePickerConfig.maximumDate}
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
  saveText: {
    fontSize: FS(1.8),
    color: colors.Primary,
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  saveTextDisabled: {
    color: '#A5A5A5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FS(1.6),
    color: '#666666',
    fontFamily: 'OpenSans-Regular',
    marginTop: HP(2),
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
  helperText: {
    fontSize: FS(1.3),
    color: '#888888',
    fontFamily: 'OpenSans-Regular',
    marginTop: HP(0.8),
    lineHeight: HP(2),
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
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: WP(4),
    borderRadius: WP(2),
    borderLeftWidth: 3,
    borderLeftColor: colors.Primary,
    marginTop: HP(1),
  },
  noteText: {
    fontSize: FS(1.4),
    color: '#666666',
    fontFamily: 'OpenSans-Regular',
    marginLeft: WP(2),
    flex: 1,
    lineHeight: FS(2),
  },
});

export default EditChallengeScreen;
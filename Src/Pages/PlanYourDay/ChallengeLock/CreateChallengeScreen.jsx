import React, {useState, useMemo} from 'react';
import {
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  Platform,
  NativeModules,
  KeyboardAvoidingView,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DocumentPicker from 'react-native-document-picker';
import {launchImageLibrary} from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import Headers from '../../../Components/Headers';
import BlockTimeModalOld from '../../../Components/BlockTimeold';
import CustomToast from '../../../Components/CustomToast';
import DatePickerModal from '../../../Components/DatePickerModal';
import {HP, WP, FS} from '../../../utils/dimentions';
import {colors, Icons} from '../../../Helper/Contants';
import {useAuth} from '../../../contexts/AuthContext';
import {lockChallengeService} from '../../../services/api/lockChallengeService';

const {ChallengeNativeScheduler} = NativeModules;

const CreateLockChallengeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();
  const {selectedCategory} = route.params;

  // Form states
  const [challengeName, setChallengeName] = useState('');
  const [videoType, setVideoType] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [timeSlot1, setTimeSlot1] = useState(null);
  const [timeSlot2, setTimeSlot2] = useState(null);
  const [numberOfDays, setNumberOfDays] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState('');
  const [startDate, setStartDate] = useState(new Date());

  // UI states
  const [nameFocused, setNameFocused] = useState(false);
  const [youtubeFocused, setYoutubeFocused] = useState(false);
  const [showTimeSlot1Modal, setShowTimeSlot1Modal] = useState(false);
  const [showTimeSlot2Modal, setShowTimeSlot2Modal] = useState(false);
  const [datePickerConfig, setDatePickerConfig] = useState({
    visible: false,
    initialDate: new Date(),
    title: '',
    minimumDate: null,
    maximumDate: null,
  });
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const [isCreating, setIsCreating] = useState(false);

  const isNameLabelActive = nameFocused || challengeName.length > 0;
  const isYoutubeLabelActive = youtubeFocused || youtubeLink.length > 0;

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

  // Format date helper
  const formatDate = date => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const getCategoryIcon = categoryName => {
    if (!categoryName) return Icons.Work;
    const categoryImageMap = {
      'Work & Career': Icons.Work,
      'Health & Wellness': Icons.Health,
      'Love & Relationship': Icons.Love,
      'Money & Finances': Icons.Money,
      'Spirituality & Faith': Icons.Faith,
      'Personal & Growth': Icons.Growth,
      'Other Goals': Icons.Other,
    };
    return categoryImageMap[categoryName] || Icons.Work;
  };

  // Video selection handlers
  const handleVideoSelect = async () => {
    Alert.alert(
      'Select Video Source',
      'Choose where to select your video from',
      [
        {
          text: 'Upload Video',
          onPress: () => showUploadOptions(),
        },
        {
          text: 'YouTube Link',
          onPress: () => {
            setVideoType('youtube');
            setVideoUri(null);
            setVideoFileName('');
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  };

  const showUploadOptions = () => {
    Alert.alert('Upload Video', 'Choose upload source', [
      {
        text: 'Gallery',
        onPress: selectFromGallery,
      },
      {
        text: 'Files',
        onPress: selectFromFiles,
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const selectFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'video',
        quality: 1,
        videoQuality: 'high',
      });

      if (result.didCancel) {
        console.log('User cancelled video picker');
        return;
      }

      if (result.errorCode) {
        showToast('Error selecting video: ' + result.errorMessage);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const video = result.assets[0];

        if (video.duration && video.duration > 3600) {
          showToast('Video is too long. Please select a video under 1 hour.');
          return;
        }

        setVideoType('upload');
        setVideoUri(video.uri);
        setVideoFileName(video.fileName || 'Selected Video');
        setYoutubeLink('');
        showToast('Video selected successfully!', 'success');
      }
    } catch (error) {
      console.error('Error picking video from gallery:', error);
      showToast('Error selecting video');
    }
  };

  const selectFromFiles = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
      });

      if (result && result.length > 0) {
        const video = result[0];

        if (video.size && video.size > 500 * 1024 * 1024) {
          showToast('Video file is too large. Maximum size is 500MB.');
          return;
        }

        setVideoType('upload');
        setVideoUri(video.uri);
        setVideoFileName(video.name);
        setYoutubeLink('');
        showToast('Video selected successfully!', 'success');
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('User cancelled document picker');
      } else {
        console.error('Error picking video:', error);
        showToast('Error selecting video');
      }
    }
  };

  const handleYoutubeLinkChange = text => {
    setYoutubeLink(text);
    if (text.trim()) {
      setVideoType('youtube');
      setVideoUri(null);
      setVideoFileName('');
    }
  };

  const clearVideoSelection = () => {
    setVideoType(null);
    setVideoUri(null);
    setVideoFileName('');
    setYoutubeLink('');
  };

  // Date picker handlers
  const showStartDatePicker = () => {
    setDatePickerConfig({
      visible: true,
      initialDate: startDate,
      title: 'Select Start Date',
      minimumDate: new Date(),
      maximumDate: null,
    });
  };

  const handleDateSelect = date => {
    setStartDate(date);
    setDatePickerConfig(prev => ({...prev, visible: false}));
  };

  // Input handlers
  const handleTimeSlot1Save = timeData => {
    setTimeSlot1(timeData);
    if (toastVisible) hideToast();
  };

  const handleTimeSlot2Save = timeData => {
    setTimeSlot2(timeData);
    if (toastVisible) hideToast();
  };

  const handleDaysInput = text => {
    const numericText = text.replace(/[^0-9]/g, '');
    setNumberOfDays(numericText);
  };

  const handleHoursInput = text => {
    const cleanedText = text.replace(/[^0-9.]/g, '');
    const parts = cleanedText.split('.');
    if (parts.length > 2) {
      return;
    }
    if (parts[1] && parts[1].length > 1) {
      setHoursPerDay(parts[0] + '.' + parts[1].substring(0, 1));
      return;
    }
    setHoursPerDay(cleanedText);
  };

  // Validation
  const isFormValid = () => {
    if (!challengeName.trim()) return false;
    if (!videoType) return false;
    if (videoType === 'youtube' && !youtubeLink.trim()) return false;
    if (
      videoType === 'youtube' &&
      !lockChallengeService.isValidYouTubeUrl(youtubeLink)
    )
      return false;
    if (videoType === 'upload' && !videoUri) return false;
    if (!timeSlot1) return false;
    if (!timeSlot2) return false;
    if (
      !numberOfDays ||
      isNaN(parseInt(numberOfDays)) ||
      parseInt(numberOfDays) <= 0
    )
      return false;
    if (
      !hoursPerDay ||
      isNaN(parseFloat(hoursPerDay)) ||
      parseFloat(hoursPerDay) <= 0 ||
      parseFloat(hoursPerDay) > 24
    )
      return false;
    return true;
  };

  const validateTimeSlotOrder = (slot1, slot2) => {
    const convertTo24Hour = timeStr => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;

      if (period === 'PM' && hours !== 12) {
        hour24 = hours + 12;
      } else if (period === 'AM' && hours === 12) {
        hour24 = 0;
      }

      return hour24 * 60 + (minutes || 0);
    };

    const slot1Start = convertTo24Hour(slot1.startTime);
    const slot2Start = convertTo24Hour(slot2.startTime);

    return slot2Start > slot1Start;
  };

  // Create challenge
  const handleCreateChallenge = async () => {
    if (toastVisible) {
      hideToast();
    }

    // Validation
    if (!isFormValid()) {
      showToast('Please fill in all required fields correctly');
      return;
    }

    const isTimeSlot2Later = validateTimeSlotOrder(timeSlot1, timeSlot2);
    if (!isTimeSlot2Later) {
      showToast('Second time slot must be later than the first time slot');
      return;
    }

    const days = parseInt(numberOfDays);
    if (days > 365) {
      showToast('Challenge duration cannot exceed 365 days');
      return;
    }

    setIsCreating(true);

    try {
      let localVideoPath = null;
      let finalYoutubeLink = null;

      if (videoType === 'upload') {
        showToast('Preparing video...', 'info');
        localVideoPath = await copyVideoToAppStorage(videoUri, videoFileName);
        console.log('✅ Video stored locally at:', localVideoPath);
      } else if (videoType === 'youtube') {
        finalYoutubeLink = youtubeLink.trim();
      }

      const challengeData = {
        name: challengeName.trim(),
        category: selectedCategory.title,
        localVideoPath: localVideoPath,
        videoFileName: videoType === 'upload' ? videoFileName : null,
        youtubeLink: finalYoutubeLink,
        timeSlot1: timeSlot1,
        timeSlot2: timeSlot2,
        durationDays: days,
        hoursPerDay: parseFloat(hoursPerDay),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'pending',
        userId: user?.id,
      };

      showToast('Creating challenge...', 'info');
      const createdChallenge = await lockChallengeService.createLockChallenge(
        challengeData,
      );
      console.log('✅ Challenge created in database:', createdChallenge);

      try {
        if (Platform.OS === 'android' && ChallengeNativeScheduler) {
          await ChallengeNativeScheduler.scheduleChallenge({
            id: createdChallenge.id,
            name: createdChallenge.name,
            category: createdChallenge.category,
            local_video_path: localVideoPath,
            youtube_link: finalYoutubeLink,
            time_slot_1: timeSlot1,
            time_slot_2: timeSlot2,
          });
          console.log('✅ Native challenge scheduled');
        }
      } catch (scheduleError) {
        console.error('⚠️ Error scheduling native challenge:', scheduleError);
      }

      setIsCreating(false);

      // Show success toast
      showToast('Task created successfully!', 'success');

      // Navigate after a short delay to allow toast to be visible
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{name: 'BottomTab', params: {challengeCreated: true}}],
        });
      }, 1500);
    } catch (error) {
      setIsCreating(false);
      console.error('Error creating challenge:', error);
      showToast('Failed to create challenge. Please try again.');
    }
  };

  const copyVideoToAppStorage = async (sourceUri, fileName) => {
    try {
      const destDir = `${RNFS.DocumentDirectoryPath}/challenges`;

      const dirExists = await RNFS.exists(destDir);
      if (!dirExists) {
        await RNFS.mkdir(destDir);
      }

      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop();
      const destPath = `${destDir}/challenge_${timestamp}.${fileExtension}`;

      await RNFS.copyFile(sourceUri, destPath);

      console.log('✅ Video copied to local storage:', destPath);
      return destPath;
    } catch (error) {
      console.error('Error copying video to local storage:', error);
      throw error;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Create Lock Challenge">
          <TouchableOpacity
            onPress={handleCreateChallenge}
            disabled={!isFormValid() || isCreating}>
            <Text
              style={[
                styles.createText,
                (!isFormValid() || isCreating) && styles.createTextDisabled,
              ]}>
              {isCreating ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Challenge Name Input */}
        <View style={styles.nameInputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isNameLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}>
            Challenge Name
          </Text>
          <TextInput
            style={styles.nameInput}
            value={challengeName}
            onChangeText={setChallengeName}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            placeholder=""
            placeholderTextColor="#625F5F"
            maxLength={70}
            editable={!isCreating}
          />
        </View>

        {/* Category Display */}
        <View style={styles.optionContainer}>
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Category}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Category</Text>
              </View>
            </View>
            <View style={styles.categoryRight}>
              <Text style={styles.categoryText}>{selectedCategory?.title}</Text>
              <Image
                source={getCategoryIcon(selectedCategory?.title)}
                style={styles.categoryIcon}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* Video Selection */}
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={handleVideoSelect}
            disabled={isCreating}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Camera}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>
                  {videoType === 'youtube' ? 'YouTube Link' : 'Challenge Video'}
                </Text>
                {videoFileName && (
                  <Text style={styles.optionSubtitle} numberOfLines={1}>
                    {videoFileName}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.optionRight}>
              {videoType && (
                <TouchableOpacity
                  onPress={clearVideoSelection}
                  style={styles.clearButton}
                  disabled={isCreating}>
                  <MaterialIcons name="close" size={WP(5)} color="#FF6B6B" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleVideoSelect}
                style={styles.plusButton}
                disabled={isCreating}>
                <Image
                  source={Icons.Plus}
                  style={styles.plusIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* YouTube Link Input */}
        {videoType === 'youtube' && (
          <View style={styles.nameInputContainer}>
            <TextInput
              style={styles.nameInput}
              value={youtubeLink}
              onChangeText={handleYoutubeLinkChange}
              onFocus={() => setYoutubeFocused(true)}
              onBlur={() => setYoutubeFocused(false)}
              placeholderTextColor="#625F5F"
              placeholder="Enter YouTube URL"
              keyboardType="url"
              autoCapitalize="none"
              editable={!isCreating}
            />
          </View>
        )}

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
                editable={!isCreating}
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
                editable={!isCreating}
              />
              <Text style={styles.daysLabel}>hours/day</Text>
            </View>
          </View>
        </View>

        {/* Start Date Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Date</Text>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={showStartDatePicker}
            disabled={isCreating}>
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

        {/* Time Slot 1 */}
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() => setShowTimeSlot1Modal(true)}
            disabled={isCreating}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Alarm}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Time Slot 1 (Primary)</Text>
                {timeSlot1 && (
                  <Text style={styles.optionSubtitle}>
                    {timeSlot1.startTime} - {timeSlot1.endTime}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.optionRight}>
              <TouchableOpacity
                onPress={() => setShowTimeSlot1Modal(true)}
                style={styles.plusButton}
                disabled={isCreating}>
                <Image
                  source={Icons.Plus}
                  style={styles.plusIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Time Slot 2 */}
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() => setShowTimeSlot2Modal(true)}
            disabled={isCreating}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Alarm}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Time Slot 2 (Backup)</Text>
                {timeSlot2 && (
                  <Text style={styles.optionSubtitle}>
                    {timeSlot2.startTime} - {timeSlot2.endTime}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.optionRight}>
              <TouchableOpacity
                onPress={() => setShowTimeSlot2Modal(true)}
                style={styles.plusButton}
                disabled={isCreating}>
                <Image
                  source={Icons.Plus}
                  style={styles.plusIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modals */}
      <BlockTimeModalOld
        visible={showTimeSlot1Modal}
        onClose={() => setShowTimeSlot1Modal(false)}
        onSave={handleTimeSlot1Save}
        initialBlockTimeData={timeSlot1}
      />

      <BlockTimeModalOld
        visible={showTimeSlot2Modal}
        onClose={() => setShowTimeSlot2Modal(false)}
        onSave={handleTimeSlot2Save}
        initialBlockTimeData={timeSlot2}
      />

      <DatePickerModal
        visible={datePickerConfig.visible}
        onClose={() => setDatePickerConfig(prev => ({...prev, visible: false}))}
        onDateSelect={handleDateSelect}
        initialDate={datePickerConfig.initialDate}
        title={datePickerConfig.title}
        minimumDate={datePickerConfig.minimumDate}
        maximumDate={datePickerConfig.maximumDate}
      />

      <CustomToast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={3000}
        onHide={hideToast}
        position="bottom"
        showIcon={true}
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
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  createTextDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(3.5),
    paddingTop: HP(2),
  },
  nameInputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    padding: WP(2.133),
    marginBottom: HP(0.9),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    height: HP(6.4),
    position: 'relative',
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
    left: WP(2),
    fontSize: FS(1.5),
    color: '#625F5F',
    fontFamily: 'OpenSans-Bold',
  },
  inputLabelInactive: {
    top: HP(1.7),
    left: WP(2.5),
    fontSize: FS(1.7),
    color: '#625F5F',
    fontFamily: 'OpenSans-SemiBold',
  },
  nameInput: {
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-SemiBold',
    color: '#625F5F',
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(2.133),
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
  optionContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    padding: WP(2.133),
    marginBottom: HP(0.9),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minHeight: HP(6.6),
    justifyContent: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(1),
    marginLeft: WP(-0.5),
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionRight: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  categoryRight: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexDirection: 'row',
    position: 'absolute',
    right: WP(-0.5),
  },
  optionIcon: {
    width: WP(4.8),
    height: WP(4.8),
    marginRight: WP(2),
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    paddingVertical: HP(0.75),
  },
  optionSubtitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(-0.4),
  },
  categoryText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    marginRight: WP(2),
  },
  categoryIcon: {
    width: WP(12),
    height: WP(12),
  },
  plusButton: {
    padding: WP(0.5),
  },
  plusIcon: {
    width: WP(3.7),
    height: WP(3.7),
    tintColor: '#646464',
  },
  clearButton: {
    padding: WP(0.5),
    marginRight: WP(2),
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
    shadowColor: '#000',
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
    color: '#625F5F',
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
    shadowColor: '#000',
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
  bottomSpacer: {
    height: HP(3),
  },
});

export default CreateLockChallengeScreen;

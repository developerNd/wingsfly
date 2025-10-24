import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import {launchImageLibrary} from 'react-native-image-picker';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import CustomToast from '../../Components/CustomToast';
import {NativeModules} from 'react-native';

const {DateReminderModule} = NativeModules;

const DateReminderSettingsScreen = ({navigation}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [autoClose, setAutoClose] = useState(false);
  const [morningTime, setMorningTime] = useState(new Date());
  const [eveningTime, setEveningTime] = useState(new Date());
  const [showMorningPicker, setShowMorningPicker] = useState(false);
  const [showEveningPicker, setShowEveningPicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [morningImageUri, setMorningImageUri] = useState(null);
  const [eveningImageUri, setEveningImageUri] = useState(null);

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await DateReminderModule.getSettings();
      setIsEnabled(settings.enabled);
      setAutoClose(settings.autoClose || false);

      // Parse time strings to Date objects
      const [morningHour, morningMinute] = settings.morningTime.split(':');
      const morning = new Date();
      morning.setHours(parseInt(morningHour));
      morning.setMinutes(parseInt(morningMinute));
      setMorningTime(morning);

      const [eveningHour, eveningMinute] = settings.eveningTime.split(':');
      const evening = new Date();
      evening.setHours(parseInt(eveningHour));
      evening.setMinutes(parseInt(eveningMinute));
      setEveningTime(evening);

      // Load images if exist
      if (settings.morningImageUri && settings.morningImageUri !== '') {
        setMorningImageUri(settings.morningImageUri);
      }
      if (settings.eveningImageUri && settings.eveningImageUri !== '') {
        setEveningImageUri(settings.eveningImageUri);
      }

      setHasChanges(false);
    } catch (error) {
      console.log('Error loading settings:', error);
      // Set defaults
      const morning = new Date();
      morning.setHours(7, 0, 0);
      setMorningTime(morning);

      const evening = new Date();
      evening.setHours(19, 0, 0);
      setEveningTime(evening);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const formatTime = date => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const handleToggle = value => {
    setIsEnabled(value);
    setHasChanges(true);
  };

  const handleAutoCloseToggle = value => {
    setAutoClose(value);
    setHasChanges(true);
  };

  const handleMorningTimeConfirm = date => {
    setMorningTime(date);
    setShowMorningPicker(false);
    setHasChanges(true);
  };

  const handleEveningTimeConfirm = date => {
    setEveningTime(date);
    setShowEveningPicker(false);
    setHasChanges(true);
  };

  const handleImagePick = (type) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        showToast('Failed to pick image', 'error');
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        if (type === 'morning') {
          setMorningImageUri(asset.uri);
        } else {
          setEveningImageUri(asset.uri);
        }
        setHasChanges(true);
      }
    });
  };

  const handleRemoveImage = (type) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (type === 'morning') {
              setMorningImageUri(null);
            } else {
              setEveningImageUri(null);
            }
            setHasChanges(true);
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (isEnabled) {
        const morningTimeStr = `${morningTime.getHours()}:${morningTime.getMinutes()}`;
        const eveningTimeStr = `${eveningTime.getHours()}:${eveningTime.getMinutes()}`;

        await DateReminderModule.scheduleReminders(
          morningTimeStr,
          eveningTimeStr,
          morningImageUri || '',
          eveningImageUri || '',
          autoClose
        );
        showToast('Date reminders saved and scheduled', 'success');
      } else {
        await DateReminderModule.cancelReminders();
        showToast('Date reminders disabled', 'success');
      }

      setHasChanges(false);
    } catch (error) {
      console.error('Error saving reminders:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderImageUpload = (type, imageUri, label) => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{label}</Text>
        <View style={styles.imageContainer}>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{uri: imageUri}}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <View style={styles.imageActions}>
                <TouchableOpacity
                  onPress={() => handleImagePick(type)}
                  style={styles.changeImageButton}>
                  <Text style={styles.changeImageText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRemoveImage(type)}
                  style={styles.removeImageButton}>
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handleImagePick(type)}
              activeOpacity={0.7}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>Upload Image</Text>
              <Text style={styles.uploadSubtext}>
                Add a personal image for {type} reminder
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Date Reminder" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Date Reminder">
          {hasChanges && (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={styles.saveButton}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.Primary} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          )}
        </Headers>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        {/* Enable/Disable Section */}
        <View style={styles.section}>
          <View style={styles.enableContainer}>
            <View style={styles.enableTextContainer}>
              <Text style={styles.enableTitle}>Enable Date Reminders</Text>
              <Text style={styles.enableSubtitle}>
                Show date twice daily at scheduled times
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={handleToggle}
              trackColor={{false: '#D1D1D6', true: colors.Primary}}
              thumbColor={colors.White}
              ios_backgroundColor="#D1D1D6"
            />
          </View>
        </View>

        {/* Auto-Close Toggle - VISIBLE WHEN ENABLED */}
        {isEnabled && (
          <View style={styles.section}>
            <View style={styles.enableContainer}>
              <View style={styles.enableTextContainer}>
                <Text style={styles.enableTitle}>Auto Close After 30 Seconds</Text>
                <Text style={styles.enableSubtitle}>
                  Automatically dismiss or keep until you close
                </Text>
              </View>
              <Switch
                value={autoClose}
                onValueChange={handleAutoCloseToggle}
                trackColor={{false: '#D1D1D6', true: colors.Primary}}
                thumbColor={colors.White}
                ios_backgroundColor="#D1D1D6"
              />
            </View>
          </View>
        )}

        {/* Time Settings (only show when enabled) */}
        {isEnabled && (
          <>
            {/* Morning Time */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>FIRST REMINDER</Text>
              <TouchableOpacity
                style={styles.timeContainer}
                onPress={() => setShowMorningPicker(true)}
                activeOpacity={0.7}>
                <View>
                  <Text style={styles.timeLabel}>Morning Time</Text>
                  <Text style={styles.timeValue}>{formatTime(morningTime)}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Morning Image Upload */}
            {renderImageUpload('morning', morningImageUri, 'MORNING IMAGE (OPTIONAL)')}

            {/* Evening Time */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SECOND REMINDER</Text>
              <TouchableOpacity
                style={styles.timeContainer}
                onPress={() => setShowEveningPicker(true)}
                activeOpacity={0.7}>
                <View>
                  <Text style={styles.timeLabel}>Evening Time</Text>
                  <Text style={styles.timeValue}>{formatTime(eveningTime)}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Evening Image Upload */}
            {renderImageUpload('evening', eveningImageUri, 'EVENING IMAGE (OPTIONAL)')}

            {/* Save Button at Bottom */}
            {hasChanges && (
              <TouchableOpacity
                style={styles.bottomSaveButton}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.8}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.White} />
                ) : (
                  <Text style={styles.bottomSaveButtonText}>
                    Save & Schedule Reminders
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        {!isEnabled && (
          <View style={styles.disabledInfo}>
            <Text style={styles.disabledText}>
              Enable date reminders to schedule daily notifications
            </Text>
          </View>
        )}

        <View style={{height: HP(4)}} />
      </ScrollView>

      {/* Morning Time Picker */}
      <DatePicker
        modal
        open={showMorningPicker}
        date={morningTime}
        mode="time"
        onConfirm={handleMorningTimeConfirm}
        onCancel={() => setShowMorningPicker(false)}
        title="Select Morning Time"
      />

      {/* Evening Time Picker */}
      <DatePicker
        modal
        open={showEveningPicker}
        date={eveningTime}
        mode="time"
        onConfirm={handleEveningTimeConfirm}
        onCancel={() => setShowEveningPicker(false)}
        title="Select Evening Time"
      />

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
    paddingBottom: HP(0.25),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    minWidth: WP(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: WP(4),
  },
  section: {
    marginTop: HP(2.5),
  },
  sectionTitle: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Bold',
    color: colors.Shadow,
    marginBottom: HP(1),
    marginLeft: WP(2),
    letterSpacing: 1,
  },
  enableContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  enableTextContainer: {
    flex: 1,
    marginRight: WP(3),
  },
  enableTitle: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginBottom: HP(0.5),
  },
  enableSubtitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    lineHeight: FS(2),
  },
  imageContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  uploadButton: {
    padding: WP(6),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: WP(3),
    margin: 1,
  },
  uploadIcon: {
    fontSize: FS(4),
    marginBottom: HP(1),
  },
  uploadText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    marginBottom: HP(0.5),
  },
  uploadSubtext: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#999999',
    textAlign: 'center',
  },
  imagePreviewContainer: {
    padding: WP(3),
  },
  imagePreview: {
    width: '100%',
    height: HP(20),
    borderRadius: WP(2),
  },
  imageActions: {
    flexDirection: 'row',
    marginTop: HP(1.5),
    gap: WP(2),
  },
  changeImageButton: {
    flex: 1,
    backgroundColor: colors.Primary,
    padding: HP(1.5),
    borderRadius: WP(2),
    alignItems: 'center',
  },
  changeImageText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  removeImageButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    padding: HP(1.5),
    borderRadius: WP(2),
    alignItems: 'center',
  },
  removeImageText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  timeContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  timeLabel: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Medium',
    color: '#666666',
    marginBottom: HP(0.5),
  },
  timeValue: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
  },
  arrow: {
    fontSize: FS(3),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    opacity: 0.4,
  },
  infoSection: {
    marginTop: HP(3),
    backgroundColor: '#F0F8FF',
    borderRadius: WP(3),
    padding: WP(4),
    borderLeftWidth: 4,
    borderLeftColor: colors.Primary,
  },
  infoTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginBottom: HP(1),
  },
  infoText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#555555',
    lineHeight: FS(2.2),
  },
  bottomSaveButton: {
    backgroundColor: colors.Primary,
    borderRadius: WP(3),
    padding: HP(2),
    marginTop: HP(3),
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.Primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bottomSaveButtonText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  disabledInfo: {
    marginTop: HP(3),
    padding: WP(4),
    alignItems: 'center',
  },
  disabledText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Regular',
    color: '#999999',
    textAlign: 'center',
  },
});

export default DateReminderSettingsScreen;
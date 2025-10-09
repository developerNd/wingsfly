import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import intentionStorageService from '../../services/Intention/intentionStorageService';

const IntentionSettingsScreen = ({navigation}) => {
  const [intentionText, setIntentionText] = useState('');
  const [audioFilePath, setAudioFilePath] = useState(null);
  const [audioFileName, setAudioFileName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useAudio, setUseAudio] = useState(false);

  useEffect(() => {
    loadIntention();
  }, []);

  const loadIntention = async () => {
    try {
      const data = await intentionStorageService.getIntentionData();
      if (data) {
        if (data.audioFilePath) {
          setAudioFilePath(data.audioFilePath);
          setAudioFileName(data.audioFileName || 'Audio file');
          setUseAudio(true);
        } else if (data.text) {
          setIntentionText(data.text);
          setUseAudio(false);
        }
      }
    } catch (error) {
      console.error('Error loading intention:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAudio = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
        copyTo: 'documentDirectory',
      });

      if (result && result[0]) {
        const file = result[0];
        console.log('Selected audio file:', file);

        let filePath = file.fileCopyUri;
        
        if (!filePath) {
          Alert.alert('Error', 'Could not access the audio file');
          return;
        }

        // Create permanent storage directory
        const audioDir = `${RNFS.DocumentDirectoryPath}/intention_audio`;
        await RNFS.mkdir(audioDir);

        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const permanentFileName = `intention_${timestamp}.${extension}`;
        const permanentPath = `${audioDir}/${permanentFileName}`;

        // Copy file to permanent location
        await RNFS.copyFile(filePath, permanentPath);

        console.log('Audio file saved to:', permanentPath);

        setAudioFilePath(permanentPath);
        setAudioFileName(file.name);
        setUseAudio(true);
        setIntentionText(''); // Clear text when switching to audio

        Alert.alert('Success', 'Audio file uploaded successfully');
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('User cancelled file picker');
      } else {
        console.error('Error picking audio file:', error);
        Alert.alert('Error', 'Failed to upload audio file');
      }
    }
  };

  const handleSave = async () => {
    if (useAudio) {
      if (!audioFilePath) {
        Alert.alert('Error', 'Please upload an audio file');
        return;
      }
    } else {
      if (!intentionText.trim()) {
        Alert.alert('Error', 'Please enter your intention command');
        return;
      }
    }

    setSaving(true);
    try {
      const result = await intentionStorageService.saveIntentionData({
        text: useAudio ? '' : intentionText.trim(),
        audioFilePath: useAudio ? audioFilePath : null,
        audioFileName: useAudio ? audioFileName : null,
      });

      if (result.success) {
        Alert.alert('Success', 'Intention saved successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to save intention');
      }
    } catch (error) {
      console.error('Error saving intention:', error);
      Alert.alert('Error', 'Failed to save intention');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
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
        <Headers title="Intention Command" navigation={navigation}>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#0059FF" size="small" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </Headers>
      </View>

      <View style={styles.content}>
        {/* Option selector: Text or Audio Upload */}
        <View style={styles.optionSelector}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              !useAudio && styles.optionButtonActive
            ]}
            onPress={() => {
              setUseAudio(false);
              setAudioFilePath(null);
              setAudioFileName(null);
            }}
            activeOpacity={0.7}>
            <Text style={[
              styles.optionButtonText,
              !useAudio && styles.optionButtonTextActive
            ]}>Text</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.optionButton,
              useAudio && styles.optionButtonActive
            ]}
            onPress={() => {
              setUseAudio(true);
              setIntentionText('');
            }}
            activeOpacity={0.7}>
            <Text style={[
              styles.optionButtonText,
              useAudio && styles.optionButtonTextActive
            ]}>Upload Audio</Text>
          </TouchableOpacity>
        </View>

        {/* Show text input OR audio file info */}
        {!useAudio ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={intentionText}
              onChangeText={setIntentionText}
              placeholder="Enter your intention command"
              placeholderTextColor="#8A8A8A"
              multiline
              textAlignVertical="top"
            />
          </View>
        ) : (
          <View style={styles.audioSection}>
            {audioFilePath ? (
              <View style={styles.audioFileContainer}>
                <Text style={styles.audioFileName}>
                  🎵 {audioFileName || 'Audio file uploaded'}
                </Text>
                <TouchableOpacity
                  style={styles.changeAudioButton}
                  onPress={handleUploadAudio}
                  activeOpacity={0.7}>
                  <Text style={styles.changeAudioText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleUploadAudio}
                activeOpacity={0.7}>
                <Text style={styles.uploadButtonText}>📁 Upload Audio File</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerWrapper: {
    marginTop: HP(2.5),
    paddingBottom: HP(0.6),
  },
  saveText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(3.5),
    paddingTop: HP(2),
  },
  optionSelector: {
    flexDirection: 'row',
    marginBottom: HP(2),
    backgroundColor: colors.Primary + '10',
    borderRadius: WP(2),
    padding: WP(0.5),
  },
  optionButton: {
    flex: 1,
    paddingVertical: HP(1.2),
    alignItems: 'center',
    borderRadius: WP(1.5),
  },
  optionButtonActive: {
    backgroundColor: colors.Primary,
  },
  optionButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Shadow,
  },
  optionButtonTextActive: {
    color: colors.White,
  },
  inputContainer: {
    marginTop: HP(1),
  },
  textInput: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    paddingHorizontal: WP(3.5),
    paddingVertical: HP(1.8),
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-SemiBold',
    color: '#625F5F',
    minHeight: HP(20),
    textAlignVertical: 'top',
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
  audioSection: {
    marginTop: HP(1),
  },
  uploadButton: {
    backgroundColor: colors.Primary,
    borderRadius: WP(2.133),
    paddingVertical: HP(2),
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.Primary,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.3,
    shadowRadius: WP(2.133),
  },
  uploadButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  audioFileContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: WP(2.133),
    paddingHorizontal: WP(3.5),
    paddingVertical: HP(1.8),
    borderWidth: 1,
    borderColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioFileName: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Medium',
    color: '#2E7D32',
    flex: 1,
  },
  changeAudioButton: {
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.8),
    backgroundColor: colors.Primary,
    borderRadius: WP(1.5),
  },
  changeAudioText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
});

export default IntentionSettingsScreen;
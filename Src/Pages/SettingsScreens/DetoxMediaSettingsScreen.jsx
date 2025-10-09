import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import detoxMediaStorageService from '../../services/DigitalDetox/detoxMediaStorageService';

const DetoxMediaSettingsScreen = ({navigation}) => {
  const [mediaType, setMediaType] = useState('video'); // 'video' or 'audio'
  const [mediaFilePath, setMediaFilePath] = useState(null);
  const [mediaFileName, setMediaFileName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      const data = await detoxMediaStorageService.getDetoxMedia();
      if (data) {
        setMediaType(data.type);
        setMediaFilePath(data.filePath);
        setMediaFileName(data.fileName);
      }
    } catch (error) {
      console.error('Error loading detox media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadMedia = async () => {
    try {
      const pickerType = mediaType === 'video' 
        ? [DocumentPicker.types.video]
        : [DocumentPicker.types.audio];

      const result = await DocumentPicker.pick({
        type: pickerType,
        copyTo: 'documentDirectory',
      });

      if (result && result[0]) {
        const file = result[0];
        console.log('Selected media file:', file);

        let filePath = file.fileCopyUri;
        
        if (!filePath) {
          Alert.alert('Error', 'Could not access the file');
          return;
        }

        // Validate file size (max 50MB for video, 10MB for audio)
        const maxSize = mediaType === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          Alert.alert(
            'File Too Large',
            `Please select a ${mediaType} file smaller than ${mediaType === 'video' ? '50MB' : '10MB'}`
          );
          return;
        }

        // Create permanent storage directory
        const mediaDir = `${RNFS.DocumentDirectoryPath}/detox_media`;
        await RNFS.mkdir(mediaDir);

        // Delete old media file if exists
        if (mediaFilePath) {
          try {
            const exists = await RNFS.exists(mediaFilePath);
            if (exists) {
              await RNFS.unlink(mediaFilePath);
            }
          } catch (e) {
            console.log('Error deleting old file:', e);
          }
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const permanentFileName = `detox_${mediaType}_${timestamp}.${extension}`;
        const permanentPath = `${mediaDir}/${permanentFileName}`;

        // Copy file to permanent location
        await RNFS.copyFile(filePath, permanentPath);

        console.log('Media file saved to:', permanentPath);

        setMediaFilePath(permanentPath);
        setMediaFileName(file.name);

        Alert.alert('Success', `${mediaType === 'video' ? 'Video' : 'Audio'} file uploaded successfully`);
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('User cancelled file picker');
      } else {
        console.error('Error picking media file:', error);
        Alert.alert('Error', 'Failed to upload file');
      }
    }
  };

  const handleSave = async () => {
    if (!mediaFilePath) {
      Alert.alert('Error', `Please upload a ${mediaType} file`);
      return;
    }

    setSaving(true);
    try {
      const result = await detoxMediaStorageService.saveDetoxMedia({
        type: mediaType,
        filePath: mediaFilePath,
        fileName: mediaFileName,
      });

      if (result.success) {
        Alert.alert('Success', 'Detox media saved successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to save detox media');
      }
    } catch (error) {
      console.error('Error saving detox media:', error);
      Alert.alert('Error', 'Failed to save detox media');
    } finally {
      setSaving(false);
    }
  };

  const handleClearMedia = () => {
    Alert.alert(
      'Clear Media',
      'Are you sure you want to remove the current media file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await detoxMediaStorageService.clearDetoxMedia();
              setMediaFilePath(null);
              setMediaFileName(null);
              Alert.alert('Success', 'Media cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear media');
            }
          },
        },
      ]
    );
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
        <Headers title="Detox Media" navigation={navigation}>
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
        <Text style={styles.description}>
          Choose a video or audio file to play during your digital detox session
        </Text>

        {/* Media Type Selector */}
        <View style={styles.optionSelector}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              mediaType === 'video' && styles.optionButtonActive
            ]}
            onPress={() => {
              setMediaType('video');
              setMediaFilePath(null);
              setMediaFileName(null);
            }}
            activeOpacity={0.7}>
            <Text style={[
              styles.optionButtonText,
              mediaType === 'video' && styles.optionButtonTextActive
            ]}>🎥 Video</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.optionButton,
              mediaType === 'audio' && styles.optionButtonActive
            ]}
            onPress={() => {
              setMediaType('audio');
              setMediaFilePath(null);
              setMediaFileName(null);
            }}
            activeOpacity={0.7}>
            <Text style={[
              styles.optionButtonText,
              mediaType === 'audio' && styles.optionButtonTextActive
            ]}>🎵 Audio</Text>
          </TouchableOpacity>
        </View>

        {/* Upload Section */}
        <View style={styles.uploadSection}>
          {mediaFilePath ? (
            <View style={styles.mediaFileContainer}>
              <View style={styles.fileInfo}>
                <Text style={styles.fileIcon}>
                  {mediaType === 'video' ? '🎥' : '🎵'}
                </Text>
                <View style={styles.fileDetails}>
                  <Text style={styles.fileType}>
                    {mediaType === 'video' ? 'Video' : 'Audio'} file
                  </Text>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {mediaFileName || 'Media file uploaded'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={handleUploadMedia}
                  activeOpacity={0.7}>
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearMedia}
                  activeOpacity={0.7}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUploadMedia}
              activeOpacity={0.7}>
              <Text style={styles.uploadIcon}>
                {mediaType === 'video' ? '🎥' : '🎵'}
              </Text>
              <Text style={styles.uploadButtonText}>
                Upload {mediaType === 'video' ? 'Video' : 'Audio'} File
              </Text>
              <Text style={styles.uploadHint}>
                {mediaType === 'video' ? 'Max 50MB' : 'Max 10MB'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            This {mediaType} will play during your digital detox session to help you stay focused and relaxed.
          </Text>
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
    paddingHorizontal: WP(4),
    paddingTop: HP(2),
  },
  description: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Regular',
    color: '#666',
    marginBottom: HP(2),
    lineHeight: FS(2.2),
  },
  optionSelector: {
    flexDirection: 'row',
    marginBottom: HP(3),
    backgroundColor: colors.Primary + '10',
    borderRadius: WP(2),
    padding: WP(0.5),
  },
  optionButton: {
    flex: 1,
    paddingVertical: HP(1.5),
    alignItems: 'center',
    borderRadius: WP(1.5),
  },
  optionButtonActive: {
    backgroundColor: colors.Primary,
  },
  optionButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Shadow,
  },
  optionButtonTextActive: {
    color: colors.White,
  },
  uploadSection: {
    marginTop: HP(1),
  },
  uploadButton: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    paddingVertical: HP(5),
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.1,
    shadowRadius: WP(2),
    borderWidth: 2,
    borderColor: colors.Primary,
    borderStyle: 'dashed',
  },
  uploadIcon: {
    fontSize: FS(5),
    marginBottom: HP(1),
  },
  uploadButtonText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    marginBottom: HP(0.5),
  },
  uploadHint: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#999',
  },
  mediaFileContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(4),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.1,
    shadowRadius: WP(2),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(2),
  },
  fileIcon: {
    fontSize: FS(4),
    marginRight: WP(3),
  },
  fileDetails: {
    flex: 1,
  },
  fileType: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Medium',
    color: '#999',
    marginBottom: HP(0.3),
  },
  fileName: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: WP(2),
  },
  changeButton: {
    flex: 1,
    paddingVertical: HP(1.2),
    backgroundColor: colors.Primary,
    borderRadius: WP(2),
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  clearButton: {
    flex: 1,
    paddingVertical: HP(1.2),
    backgroundColor: '#FF5252',
    borderRadius: WP(2),
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: WP(2),
    padding: WP(3),
    marginTop: HP(3),
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoIcon: {
    fontSize: FS(2),
    marginRight: WP(2),
  },
  infoText: {
    flex: 1,
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#1976D2',
    lineHeight: FS(2),
  },
});

export default DetoxMediaSettingsScreen;
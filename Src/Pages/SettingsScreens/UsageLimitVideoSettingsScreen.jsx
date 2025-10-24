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
import usageLimitVideoService from '../../services/usageLimitVideoService';

const UsageLimitVideoSettingsScreen = ({navigation}) => {
  const [videoFilePath, setVideoFilePath] = useState(null);
  const [videoFileName, setVideoFileName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVideoSettings();
  }, []);

  const loadVideoSettings = async () => {
    try {
      const data = await usageLimitVideoService.getVideoData();
      if (data && data.videoFilePath) {
        setVideoFilePath(data.videoFilePath);
        setVideoFileName(data.videoFileName || 'Video file');
      }
    } catch (error) {
      console.error('Error loading video settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVideo = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
        copyTo: 'documentDirectory',
      });

      if (result && result[0]) {
        const file = result[0];
        console.log('Selected video file:', file);

        let filePath = file.fileCopyUri;
        
        if (!filePath) {
          Alert.alert('Error', 'Could not access the video file');
          return;
        }

        // Create permanent storage directory
        const videoDir = `${RNFS.DocumentDirectoryPath}/usage_limit_video`;
        await RNFS.mkdir(videoDir);

        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const permanentFileName = `usage_limit_video_${timestamp}.${extension}`;
        const permanentPath = `${videoDir}/${permanentFileName}`;

        // Copy file to permanent location
        await RNFS.copyFile(filePath, permanentPath);

        console.log('Video file saved to:', permanentPath);

        setVideoFilePath(permanentPath);
        setVideoFileName(file.name);

        Alert.alert('Success', 'Video file uploaded successfully');
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('User cancelled file picker');
      } else {
        console.error('Error picking video file:', error);
        Alert.alert('Error', 'Failed to upload video file');
      }
    }
  };

  const handleSave = async () => {
    if (!videoFilePath) {
      Alert.alert('Error', 'Please upload a video file');
      return;
    }

    setSaving(true);
    try {
      const result = await usageLimitVideoService.saveVideoData({
        videoFilePath: videoFilePath,
        videoFileName: videoFileName,
        youtubeLink: '',
      });

      if (result.success) {
        Alert.alert('Success', 'Usage limit video saved successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to save video settings');
      }
    } catch (error) {
      console.error('Error saving video settings:', error);
      Alert.alert('Error', 'Failed to save video settings');
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
        <Headers title="Usage Limit Video" navigation={navigation}>
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
          This video will be shown when an app reaches its daily usage limit
        </Text>

        <View style={styles.videoSection}>
          {videoFilePath ? (
            <View style={styles.videoFileContainer}>
              <Text style={styles.videoFileName}>
                🎬 {videoFileName || 'Video file uploaded'}
              </Text>
              <TouchableOpacity
                style={styles.changeVideoButton}
                onPress={handleUploadVideo}
                activeOpacity={0.7}>
                <Text style={styles.changeVideoText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUploadVideo}
              activeOpacity={0.7}>
              <Text style={styles.uploadButtonText}>📁 Upload Video File</Text>
            </TouchableOpacity>
          )}
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
    paddingHorizontal: WP(3.5),
    paddingTop: HP(2),
  },
  description: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Regular',
    color: '#625F5F',
    marginBottom: HP(2),
    textAlign: 'center',
  },
  videoSection: {
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
  videoFileContainer: {
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
  videoFileName: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Medium',
    color: '#2E7D32',
    flex: 1,
  },
  changeVideoButton: {
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.8),
    backgroundColor: colors.Primary,
    borderRadius: WP(1.5),
  },
  changeVideoText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
});

export default UsageLimitVideoSettingsScreen;
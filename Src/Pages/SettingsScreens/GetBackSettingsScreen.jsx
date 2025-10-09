import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import Icon from 'react-native-vector-icons/MaterialIcons';
import getBackMediaStorageService from '../../services/GetBack/getBackMediaStorageService';

const GetBackSettingsScreen = ({navigation}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [confirmationVideo, setConfirmationVideo] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      setLoading(true);
      
      // Load media with error handling for each
      let media = {files: []};
      let confirmation = null;

      try {
        media = await getBackMediaStorageService.getGetBackMedia();
      } catch (error) {
        console.log('No existing media files found');
      }

      try {
        confirmation = await getBackMediaStorageService.getConfirmationVideo();
        
        // Verify confirmation video file still exists
        if (confirmation && confirmation.filePath) {
          const exists = await RNFS.exists(confirmation.filePath);
          if (!exists) {
            console.log('Confirmation video file no longer exists, clearing...');
            confirmation = null;
            // Clear from storage to prevent future warnings
            await getBackMediaStorageService.clearConfirmationVideo();
          }
        }
      } catch (error) {
        console.log('No confirmation video found');
      }

      // Verify all media files still exist
      const validMediaFiles = [];
      if (media && media.files && Array.isArray(media.files)) {
        for (const file of media.files) {
          if (file.filePath) {
            const exists = await RNFS.exists(file.filePath);
            if (exists) {
              validMediaFiles.push(file);
            } else {
              console.log(`Media file no longer exists: ${file.fileName}`);
            }
          }
        }
      }
      
      setMediaFiles(validMediaFiles);
      setConfirmationVideo(confirmation);
      
      // Save cleaned up data if files were removed
      if (validMediaFiles.length !== (media.files || []).length) {
        await getBackMediaStorageService.saveGetBackMedia(validMediaFiles);
      }
      
    } catch (error) {
      console.error('Error loading Get Back media:', error);
      // Initialize with empty state on error
      setMediaFiles([]);
      setConfirmationVideo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadConfirmationVideo = async () => {
    try {
      setUploading(true);

      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
        copyTo: 'documentDirectory',
      });

      if (result && result[0]) {
        const file = result[0];
        let filePath = file.fileCopyUri;
        
        if (!filePath) {
          Alert.alert('Error', 'Could not access the file');
          return;
        }

        if (file.size > 100 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a video smaller than 100MB');
          return;
        }

        const mediaDir = `${RNFS.DocumentDirectoryPath}/getback_confirmation`;
        const dirExists = await RNFS.exists(mediaDir);
        if (!dirExists) {
          await RNFS.mkdir(mediaDir);
        }

        // Delete old confirmation video if exists
        if (confirmationVideo && confirmationVideo.filePath) {
          try {
            const oldExists = await RNFS.exists(confirmationVideo.filePath);
            if (oldExists) {
              await RNFS.unlink(confirmationVideo.filePath);
            }
          } catch (e) {
            console.log('Could not delete old confirmation video:', e);
          }
        }

        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const permanentFileName = `confirmation_${timestamp}.${extension}`;
        const permanentPath = `${mediaDir}/${permanentFileName}`;

        await RNFS.copyFile(filePath, permanentPath);

        const newConfirmation = {
          filePath: permanentPath,
          fileName: file.name,
        };

        setConfirmationVideo(newConfirmation);
        setHasChanges(true);
        Alert.alert('Success', 'Confirmation video uploaded');
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Error picking confirmation video:', error);
        Alert.alert('Error', 'Failed to upload video');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUploadMedia = async (type) => {
    try {
      setUploading(true);
      
      const pickerType = type === 'video' 
        ? [DocumentPicker.types.video]
        : [DocumentPicker.types.audio];

      const result = await DocumentPicker.pick({
        type: pickerType,
        copyTo: 'documentDirectory',
      });

      if (result && result[0]) {
        const file = result[0];
        let filePath = file.fileCopyUri;
        
        if (!filePath) {
          Alert.alert('Error', 'Could not access the file');
          return;
        }

        const maxSize = type === 'video' ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
        if (file.size > maxSize) {
          Alert.alert(
            'File Too Large',
            `Please select a ${type} file smaller than ${type === 'video' ? '100MB' : '20MB'}`
          );
          return;
        }

        const mediaDir = `${RNFS.DocumentDirectoryPath}/getback_media`;
        const dirExists = await RNFS.exists(mediaDir);
        if (!dirExists) {
          await RNFS.mkdir(mediaDir);
        }

        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const permanentFileName = `getback_${type}_${timestamp}.${extension}`;
        const permanentPath = `${mediaDir}/${permanentFileName}`;

        await RNFS.copyFile(filePath, permanentPath);

        const mediaFile = {
          id: timestamp.toString(),
          type: type,
          filePath: permanentPath,
          fileName: file.name,
        };

        setMediaFiles([...mediaFiles, mediaFile]);
        setHasChanges(true);
        Alert.alert('Success', `${type === 'video' ? 'Video' : 'Audio'} file added`);
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Error picking media file:', error);
        Alert.alert('Error', 'Failed to upload file');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMedia = async (fileId) => {
    Alert.alert(
      'Remove Media',
      'Are you sure you want to remove this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const fileToRemove = mediaFiles.find(f => f.id === fileId);
            
            // Delete the actual file
            if (fileToRemove && fileToRemove.filePath) {
              try {
                const exists = await RNFS.exists(fileToRemove.filePath);
                if (exists) {
                  await RNFS.unlink(fileToRemove.filePath);
                }
              } catch (e) {
                console.log('Could not delete file:', e);
              }
            }
            
            setMediaFiles(mediaFiles.filter(f => f.id !== fileId));
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const handleClearConfirmation = () => {
    Alert.alert(
      'Clear Confirmation Video',
      'Are you sure you want to remove the confirmation video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // Delete the actual file
            if (confirmationVideo && confirmationVideo.filePath) {
              try {
                const exists = await RNFS.exists(confirmationVideo.filePath);
                if (exists) {
                  await RNFS.unlink(confirmationVideo.filePath);
                }
              } catch (e) {
                console.log('Could not delete confirmation video:', e);
              }
            }
            
            setConfirmationVideo(null);
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (confirmationVideo) {
        await getBackMediaStorageService.saveConfirmationVideo(confirmationVideo);
      } else {
        await getBackMediaStorageService.clearConfirmationVideo();
      }

      await getBackMediaStorageService.saveGetBackMedia(mediaFiles);

      try {
        const mediaFilesJson = JSON.stringify(mediaFiles);
        const GetBackModule = require('react-native').NativeModules.GetBackModule;
        if (GetBackModule && GetBackModule.saveMediaFiles) {
          await GetBackModule.saveMediaFiles(mediaFilesJson);
        }
      } catch (e) {
        console.log('Native module not available or error:', e);
      }

      setHasChanges(false);
      Alert.alert('Success', 'Get Back settings saved successfully');
    } catch (error) {
      console.error('Error saving Get Back settings:', error);
      Alert.alert('Error', 'Failed to save settings');
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

  const videoCount = mediaFiles.filter(f => f.type === 'video').length;
  const audioCount = mediaFiles.filter(f => f.type === 'audio').length;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#F8F9FA" barStyle="dark-content" />

      <View style={styles.headerContainer}>
        <Headers title="Get Back Settings" navigation={navigation}>
          {hasChanges && (
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.Primary} size="small" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          )}
        </Headers>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        
        {/* Confirmation Video Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Confirmation Video</Text>
            <Text style={styles.sectionSubtitle}>Required • Plays before each session</Text>
          </View>

          {confirmationVideo ? (
            <View style={styles.uploadedCard}>
              <View style={styles.uploadedInfo}>
                <View style={styles.videoIconContainer}>
                  <Icon name="videocam" size={WP(7)} color={colors.Primary} />
                </View>
                <View style={styles.uploadedDetails}>
                  <Text style={styles.uploadedName} numberOfLines={1}>
                    {confirmationVideo.fileName}
                  </Text>
                  <Text style={styles.uploadedLabel}>Confirmation video</Text>
                </View>
              </View>
              <View style={styles.uploadedActions}>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={handleUploadConfirmationVideo}
                  disabled={uploading}>
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearConfirmation}
                  disabled={uploading}>
                  <Icon name="close" size={WP(5)} color="#FF5252" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadCard}
              onPress={handleUploadConfirmationVideo}
              disabled={uploading}
              activeOpacity={0.7}>
              {uploading ? (
                <ActivityIndicator color={colors.Primary} />
              ) : (
                <>
                  <Icon name="video-library" size={WP(12)} color={colors.Primary} />
                  <Text style={styles.uploadCardTitle}>Upload Confirmation Video</Text>
                  <Text style={styles.uploadCardHint}>Max 100MB • MP4, MOV, AVI</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Media Collection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Media Collection</Text>
            <Text style={styles.sectionSubtitle}>
              {mediaFiles.length} files • {videoCount} videos • {audioCount} audio
            </Text>
          </View>

          {/* Upload Buttons */}
          <View style={styles.uploadButtonsRow}>
            <TouchableOpacity
              style={[styles.uploadButton, styles.uploadButtonLeft]}
              onPress={() => handleUploadMedia('video')}
              disabled={uploading}
              activeOpacity={0.7}>
              {uploading ? (
                <ActivityIndicator color={colors.Primary} size="small" />
              ) : (
                <>
                  <Icon name="videocam" size={WP(6)} color={colors.Primary} />
                  <Text style={styles.uploadButtonText}>Add Video</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadButton, styles.uploadButtonRight]}
              onPress={() => handleUploadMedia('audio')}
              disabled={uploading}
              activeOpacity={0.7}>
              {uploading ? (
                <ActivityIndicator color={colors.Primary} size="small" />
              ) : (
                <>
                  <Icon name="music-note" size={WP(6)} color={colors.Primary} />
                  <Text style={styles.uploadButtonText}>Add Audio</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Media List */}
          {mediaFiles.length > 0 ? (
            <View style={styles.mediaList}>
              {mediaFiles.map((item, index) => (
                <View key={item.id}>
                  {index > 0 && <View style={styles.mediaDivider} />}
                  <View style={styles.mediaItem}>
                    <View style={styles.mediaItemLeft}>
                      <View style={[
                        styles.mediaIconContainer,
                        item.type === 'video' ? styles.videoIcon : styles.audioIcon
                      ]}>
                        <Icon 
                          name={item.type === 'video' ? 'videocam' : 'music-note'} 
                          size={WP(5)} 
                          color={colors.White} 
                        />
                      </View>
                      <View style={styles.mediaItemDetails}>
                        <Text style={styles.mediaItemType}>
                          {item.type === 'video' ? 'Video' : 'Audio'}
                        </Text>
                        <Text style={styles.mediaItemName} numberOfLines={1}>
                          {item.fileName}
                        </Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.removeIconButton}
                      onPress={() => handleRemoveMedia(item.id)}
                      activeOpacity={0.7}>
                      <Icon name="delete" size={WP(6)} color="#FF5252" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="folder-open" size={WP(15)} color="#BDBDBD" />
              <Text style={styles.emptyStateText}>No media files added yet</Text>
              <Text style={styles.emptyStateHint}>
                Add videos or audio files to play during Get Back
              </Text>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="info-outline" size={WP(6)} color="#1976D2" style={styles.infoBoxIcon} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoText}>• Confirmation video plays before each session</Text>
            <Text style={styles.infoText}>• One random file plays during session</Text>
            <Text style={styles.infoText}>• Save changes before starting</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  headerContainer: {
    backgroundColor: '#F8F9FA',
    paddingTop: HP(2),
  },
  saveText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: WP(4),
    paddingTop: HP(2),
    paddingBottom: HP(2),
  },
  section: {
    marginBottom: HP(3),
  },
  sectionHeader: {
    marginBottom: HP(1.5),
  },
  sectionTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: '#212121',
    marginBottom: HP(0.5),
  },
  sectionSubtitle: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#757575',
  },
  uploadCard: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    padding: WP(8),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    minHeight: HP(20),
  },
  uploadCardTitle: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#424242',
    marginTop: HP(2),
  },
  uploadCardHint: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#9E9E9E',
    marginTop: HP(0.8),
  },
  uploadedCard: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    padding: WP(4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  uploadedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1.5),
  },
  videoIconContainer: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(3),
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: WP(3),
  },
  uploadedDetails: {
    flex: 1,
  },
  uploadedName: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#212121',
    marginBottom: HP(0.3),
  },
  uploadedLabel: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#757575',
  },
  uploadedActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  changeButton: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(1),
    backgroundColor: '#E3F2FD',
    borderRadius: WP(2),
    marginRight: WP(2),
  },
  changeButtonText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
  clearButton: {
    padding: WP(2),
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    marginBottom: HP(2),
  },
  uploadButton: {
    flex: 1,
    backgroundColor: colors.White,
    borderRadius: WP(3),
    paddingVertical: HP(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.Primary,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  uploadButtonLeft: {
    marginRight: WP(2),
  },
  uploadButtonRight: {
    marginLeft: WP(2),
  },
  uploadButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    marginLeft: WP(2),
  },
  mediaList: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: WP(4),
  },
  mediaDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: WP(4),
  },
  mediaItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mediaIconContainer: {
    width: WP(10),
    height: WP(10),
    borderRadius: WP(2.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: WP(3),
  },
  videoIcon: {
    backgroundColor: '#4CAF50',
  },
  audioIcon: {
    backgroundColor: '#FF9800',
  },
  mediaItemDetails: {
    flex: 1,
  },
  mediaItemType: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: '#424242',
    marginBottom: HP(0.3),
  },
  mediaItemName: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#757575',
  },
  removeIconButton: {
    padding: WP(2),
  },
  emptyState: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    padding: WP(8),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: HP(25),
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#9E9E9E',
    marginTop: HP(2),
  },
  emptyStateHint: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#BDBDBD',
    marginTop: HP(0.8),
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: WP(4),
    padding: WP(4),
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  infoBoxIcon: {
    marginRight: WP(3),
    marginTop: HP(0.3),
  },
  infoTextContainer: {
    flex: 1,
  },
  infoText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#1565C0',
    lineHeight: FS(2.2),
    marginBottom: HP(0.5),
  },
  bottomSpacer: {
    height: HP(2),
  },
});

export default GetBackSettingsScreen;
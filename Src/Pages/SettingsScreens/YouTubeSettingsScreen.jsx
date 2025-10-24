import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentPicker from 'react-native-document-picker';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';

const STORAGE_KEY = '@youtube_admin_content';

const YouTubeSettingsScreen = ({navigation}) => {
  const [videos, setVideos] = useState([]);
  const [audios, setAudios] = useState([]);
  const [videoInput, setVideoInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State for new audio being added
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [audioTitle, setAudioTitle] = useState('');
  const [audioThumbnail, setAudioThumbnail] = useState(null);
  const [audioThumbnailUri, setAudioThumbnailUri] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const savedContent = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedContent) {
        const content = JSON.parse(savedContent);
        setVideos(content.videos || []);
        setAudios(content.audios || []);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractVideoId = input => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  const validateYouTubeVideo = async videoId => {
    try {
      if (videoId && videoId.length === 11) {
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const addVideo = async () => {
    if (!videoInput.trim()) {
      Alert.alert('Error', 'Please enter a YouTube video URL or ID');
      return;
    }

    const videoId = extractVideoId(videoInput.trim());

    if (!videoId) {
      Alert.alert(
        'Invalid Input',
        'Please enter a valid YouTube URL or video ID.\n\nExamples:\n• https://youtube.com/watch?v=VIDEO_ID\n• https://youtu.be/VIDEO_ID\n• VIDEO_ID (11 characters)',
      );
      return;
    }

    const isValid = await validateYouTubeVideo(videoId);
    if (!isValid) {
      Alert.alert('Error', 'Invalid YouTube video ID format');
      return;
    }

    if (videos.some(v => v.videoId === videoId)) {
      Alert.alert('Duplicate', 'This video has already been added');
      return;
    }

    const newVideo = {
      id: Date.now().toString(),
      videoId: videoId,
      url: `https://youtube.com/watch?v=${videoId}`,
      addedAt: new Date().toISOString(),
      type: 'video',
    };

    setVideos([...videos, newVideo]);
    setVideoInput('');
    Alert.alert('Success', 'Video added successfully!');
  };

  const removeVideo = id => {
    Alert.alert('Remove Video', 'Are you sure you want to remove this video?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setVideos(videos.filter(v => v.id !== id));
        },
      },
    ]);
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
        allowMultiSelection: false,
        copyTo: 'cachesDirectory',
      });

      if (result && result[0]) {
        const audioFile = result[0];

        const maxSize = 50 * 1024 * 1024; // 50MB
        if (audioFile.size > maxSize) {
          Alert.alert(
            'File Too Large',
            'Please select an audio file smaller than 50MB',
          );
          return;
        }

        const audioUri = audioFile.fileCopyUri || audioFile.uri;

        console.log('📁 Selected audio file:', {
          name: audioFile.name,
          uri: audioUri,
          type: audioFile.type,
          size: audioFile.size,
        });

        // Set selected file and prepare for title/thumbnail input
        setSelectedAudioFile({
          name: audioFile.name,
          uri: audioUri,
          originalUri: audioFile.uri,
          type: audioFile.type || 'audio/mpeg',
          size: audioFile.size,
        });

        // Pre-fill title with filename (without extension)
        setAudioTitle(audioFile.name.replace(/\.[^/.]+$/, ''));
        setAudioThumbnail(null);
        setAudioThumbnailUri('');
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker
      } else {
        console.error('Error picking audio:', err);
        Alert.alert('Error', 'Failed to pick audio file');
      }
    }
  };

  const pickThumbnail = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
        allowMultiSelection: false,
        copyTo: 'cachesDirectory',
      });

      if (result && result[0]) {
        const imageFile = result[0];
        const imageUri = imageFile.fileCopyUri || imageFile.uri;

        console.log('📁 Selected thumbnail:', {
          name: imageFile.name,
          uri: imageUri,
          type: imageFile.type,
        });

        setAudioThumbnail(imageFile);
        setAudioThumbnailUri(imageUri);
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker
      } else {
        console.error('Error picking thumbnail:', err);
        Alert.alert('Error', 'Failed to pick thumbnail image');
      }
    }
  };

  const addAudioToList = () => {
    if (!selectedAudioFile) {
      Alert.alert('Error', 'Please select an audio file first');
      return;
    }

    if (!audioTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the audio');
      return;
    }

    if (!audioThumbnail && !audioThumbnailUri) {
      Alert.alert('Error', 'Please select a thumbnail image for the audio');
      return;
    }

    const newAudio = {
      id: Date.now().toString(),
      name: selectedAudioFile.name,
      title: audioTitle.trim(),
      uri: selectedAudioFile.uri,
      url: selectedAudioFile.uri,
      originalUri: selectedAudioFile.originalUri,
      type: selectedAudioFile.type,
      size: selectedAudioFile.size,
      thumbnail: audioThumbnailUri,
      addedAt: new Date().toISOString(),
    };

    setAudios([...audios, newAudio]);

    // Reset form
    setSelectedAudioFile(null);
    setAudioTitle('');
    setAudioThumbnail(null);
    setAudioThumbnailUri('');

    Alert.alert('Success', 'Audio file added successfully!');
  };

  const cancelAudioAdd = () => {
    setSelectedAudioFile(null);
    setAudioTitle('');
    setAudioThumbnail(null);
    setAudioThumbnailUri('');
  };

  const editAudio = audioId => {
    const audio = audios.find(a => a.id === audioId);
    if (!audio) return;

    // Set as selected for editing
    setSelectedAudioFile({
      name: audio.name,
      uri: audio.uri,
      originalUri: audio.originalUri,
      type: audio.type,
      size: audio.size,
    });
    setAudioTitle(audio.title);
    setAudioThumbnailUri(audio.thumbnail);

    // Remove from list so we can re-add with new details
    setAudios(audios.filter(a => a.id !== audioId));
  };

  const removeAudio = id => {
    Alert.alert(
      'Remove Audio',
      'Are you sure you want to remove this audio file?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setAudios(audios.filter(a => a.id !== id));
          },
        },
      ],
    );
  };

  const saveContent = async () => {
    if (videos.length === 0 && audios.length === 0) {
      Alert.alert(
        'No Content',
        'Please add at least one video or audio file before saving.',
      );
      return;
    }

    try {
      setSaving(true);
      const content = {
        videos,
        audios,
        lastUpdated: new Date().toISOString(),
      };

      console.log('💾 Saving content:', {
        videoCount: videos.length,
        audioCount: audios.length,
        audioSample: audios[0],
      });

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(content));

      Alert.alert('Success', 'Content saved successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error saving content:', error);
      Alert.alert('Error', 'Failed to save content. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const clearAllContent = () => {
    Alert.alert(
      'Clear All Content',
      'Are you sure you want to remove all videos and audio files?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setVideos([]);
            setAudios([]);
          },
        },
      ],
    );
  };

  const formatFileSize = bytes => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Content Management" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Primary || '#FF0000'} />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Content Management" />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        {/* Videos Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="videocam"
              size={WP(6)}
              color={colors.Primary || '#FF0000'}
            />
            <Text style={styles.sectionTitle}>YouTube Videos</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Add YouTube videos by URL or video ID
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="YouTube URL or Video ID"
              placeholderTextColor="#999"
              value={videoInput}
              onChangeText={setVideoInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={addVideo}
              activeOpacity={0.7}>
              <MaterialIcons name="add" size={WP(6)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {videos.length > 0 ? (
            <View style={styles.itemsList}>
              <Text style={styles.listTitle}>
                Added Videos ({videos.length})
              </Text>
              {videos.map(video => (
                <View key={video.id} style={styles.itemCard}>
                  <MaterialIcons
                    name="videocam"
                    size={WP(6)}
                    color={colors.Primary || '#FF0000'}
                    style={styles.itemIcon}
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {video.videoId}
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      youtube.com/watch?v={video.videoId}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeVideo(video.id)}>
                    <MaterialIcons name="delete" size={WP(6)} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="videocam" size={WP(15)} color="#D1D1D1" />
              <Text style={styles.emptyText}>No videos added yet</Text>
            </View>
          )}
        </View>

        {/* Audio Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="audiotrack"
              size={WP(6)}
              color={colors.Primary || '#FF0000'}
            />
            <Text style={styles.sectionTitle}>Audio Files</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Upload audio files from your device (Max 50MB)
          </Text>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickAudio}
            activeOpacity={0.7}>
            <MaterialIcons
              name="upload-file"
              size={WP(6)}
              color={colors.Primary || '#FF0000'}
            />
            <Text style={styles.uploadButtonText}>Select Audio File</Text>
          </TouchableOpacity>

          {/* Audio Details Form - Shows after audio file is selected */}
          {selectedAudioFile && (
            <View style={styles.audioDetailsForm}>
              <View style={styles.formHeader}>
                <MaterialIcons
                  name="music-note"
                  size={WP(5)}
                  color={colors.Primary || '#FF0000'}
                />
                <Text style={styles.formTitle}>Audio Details</Text>
              </View>

              <Text style={styles.selectedFileName}>
                File: {selectedAudioFile.name}
              </Text>

              {/* Title Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter audio title"
                  placeholderTextColor="#999"
                  value={audioTitle}
                  onChangeText={setAudioTitle}
                />
              </View>

              {/* Thumbnail Section */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Thumbnail Image *</Text>

                {audioThumbnailUri ? (
                  <View style={styles.thumbnailPreview}>
                    <Image
                      source={{uri: audioThumbnailUri}}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.changeThumbnailButton}
                      onPress={pickThumbnail}>
                      <MaterialIcons name="edit" size={WP(4)} color="#FFFFFF" />
                      <Text style={styles.changeThumbnailText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.thumbnailUploadButton}
                    onPress={pickThumbnail}
                    activeOpacity={0.7}>
                    <MaterialIcons
                      name="add-photo-alternate"
                      size={WP(8)}
                      color={colors.Primary || '#FF0000'}
                    />
                    <Text style={styles.thumbnailUploadText}>
                      Upload Thumbnail
                    </Text>
                    <Text style={styles.thumbnailUploadHint}>
                      Tap to select an image
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelAudioAdd}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addAudioButton}
                  onPress={addAudioToList}>
                  <MaterialIcons name="check" size={WP(5)} color="#FFFFFF" />
                  <Text style={styles.addAudioButtonText}>Add Audio</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Audio List */}
          {audios.length > 0 ? (
            <View style={styles.itemsList}>
              <Text style={styles.listTitle}>
                Uploaded Audio ({audios.length})
              </Text>
              {audios.map(audio => (
                <View key={audio.id} style={styles.audioItemCard}>
                  {/* Thumbnail Preview */}
                  {audio.thumbnail ? (
                    <Image
                      source={{uri: audio.thumbnail}}
                      style={styles.audioItemThumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.audioItemThumbnailPlaceholder}>
                      <MaterialIcons
                        name="music-note"
                        size={WP(6)}
                        color="#999"
                      />
                    </View>
                  )}

                  {/* Audio Info */}
                  <View style={styles.audioItemInfo}>
                    <Text style={styles.audioItemTitle} numberOfLines={1}>
                      {audio.title || audio.name}
                    </Text>
                    <Text style={styles.audioItemSubtitle}>
                      {formatFileSize(audio.size)}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <TouchableOpacity
                    style={styles.editIconButton}
                    onPress={() => editAudio(audio.id)}>
                    <MaterialIcons
                      name="edit"
                      size={WP(5)}
                      color={colors.Primary || '#FF0000'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeAudio(audio.id)}>
                    <MaterialIcons name="delete" size={WP(6)} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="audiotrack" size={WP(15)} color="#D1D1D1" />
              <Text style={styles.emptyText}>No audio files uploaded yet</Text>
            </View>
          )}
        </View>

        {/* Summary Section */}
        {(videos.length > 0 || audios.length > 0) && (
          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <MaterialIcons
                name="info-outline"
                size={WP(6)}
                color={colors.Primary || '#FF0000'}
              />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Content Summary</Text>
                <Text style={styles.summaryText}>
                  {videos.length} video{videos.length !== 1 ? 's' : ''} •{' '}
                  {audios.length} audio file{audios.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {(videos.length > 0 || audios.length > 0) && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearAllContent}
              activeOpacity={0.7}>
              <MaterialIcons name="clear-all" size={WP(5)} color="#FF3B30" />
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveContent}
            disabled={saving}
            activeOpacity={0.7}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="check" size={WP(5)} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{height: HP(4)}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerWrapper: {
    marginTop: HP(2.2),
    paddingBottom: HP(0.25),
    backgroundColor: colors.White,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: HP(2),
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Medium',
    color: '#606060',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: HP(2),
    paddingHorizontal: WP(4),
    paddingVertical: HP(2.5),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(0.5),
  },
  sectionTitle: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: '#0F0F0F',
    marginLeft: WP(2),
  },
  sectionDescription: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
    marginBottom: HP(2),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(2),
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: WP(3),
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.5),
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  addButton: {
    backgroundColor: colors.Primary || '#FF0000',
    width: WP(12),
    height: WP(12),
    borderRadius: WP(3),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: WP(2),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.Primary || '#FF0000',
    borderRadius: WP(3),
    paddingVertical: HP(2),
    marginBottom: HP(2),
  },
  uploadButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary || '#FF0000',
    marginLeft: WP(2),
  },
  itemsList: {
    marginTop: HP(1),
  },
  listTitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#0F0F0F',
    marginBottom: HP(1.5),
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: WP(3),
    padding: WP(3),
    marginBottom: HP(1.5),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  itemIcon: {
    marginRight: WP(3),
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#0F0F0F',
    marginBottom: HP(0.3),
  },
  itemSubtitle: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
  },
  editButton: {
    padding: WP(2),
    marginLeft: WP(1),
  },
  editIconButton: {
    padding: WP(2),
    marginLeft: WP(1),
  },
  removeButton: {
    padding: WP(2),
    marginLeft: WP(1),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: HP(4),
  },
  emptyText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: '#999',
    marginTop: HP(1.5),
  },
  // Audio Details Form Styles
  audioDetailsForm: {
    backgroundColor: '#F0F8FF',
    borderRadius: WP(3),
    padding: WP(4),
    marginTop: HP(2),
    borderWidth: 2,
    borderColor: colors.Primary || '#FF0000',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1.5),
  },
  formTitle: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-Bold',
    color: '#0F0F0F',
    marginLeft: WP(2),
  },
  selectedFileName: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
    marginBottom: HP(2),
    fontStyle: 'italic',
  },
  formGroup: {
    marginBottom: HP(2),
  },
  formLabel: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#0F0F0F',
    marginBottom: HP(1),
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: WP(2),
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.5),
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  thumbnailUploadButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.Primary || '#FF0000',
    borderRadius: WP(2),
    paddingVertical: HP(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailUploadText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary || '#FF0000',
    marginTop: HP(1),
  },
  thumbnailUploadHint: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Regular',
    color: '#999',
    marginTop: HP(0.5),
  },
  thumbnailPreview: {
    position: 'relative',
    width: '100%',
    height: HP(20),
    borderRadius: WP(2),
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  changeThumbnailButton: {
    position: 'absolute',
    bottom: WP(2),
    right: WP(2),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.8),
    borderRadius: WP(5),
  },
  changeThumbnailText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
    marginLeft: WP(1),
  },
  formActions: {
    flexDirection: 'row',
    marginTop: HP(1),
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: WP(2),
    paddingVertical: HP(1.5),
    marginRight: WP(2),
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  cancelButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#606060',
  },
  addAudioButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.Primary || '#FF0000',
    borderRadius: WP(2),
    paddingVertical: HP(1.5),
    marginLeft: WP(2),
  },
  addAudioButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
    marginLeft: WP(1),
  },
  // Audio Item Card with Thumbnail
  audioItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: WP(3),
    padding: WP(2),
    marginBottom: HP(1.5),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  audioItemThumbnail: {
    width: WP(15),
    height: WP(15),
    borderRadius: WP(2),
    marginRight: WP(3),
  },
  audioItemThumbnailPlaceholder: {
    width: WP(15),
    height: WP(15),
    borderRadius: WP(2),
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(3),
  },
  audioItemInfo: {
    flex: 1,
  },
  audioItemTitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#0F0F0F',
    marginBottom: HP(0.3),
  },
  audioItemSubtitle: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
  },
  summarySection: {
    paddingHorizontal: WP(4),
    marginTop: HP(2),
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: WP(3),
    padding: WP(4),
    borderLeftWidth: 4,
    borderLeftColor: colors.Primary || '#FF0000',
  },
  summaryContent: {
    marginLeft: WP(3),
    flex: 1,
  },
  summaryTitle: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: '#0F0F0F',
    marginBottom: HP(0.3),
  },
  summaryText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
  },
  actionButtons: {
    paddingHorizontal: WP(4),
    marginTop: HP(3),
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: WP(3),
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: HP(1.8),
    marginBottom: HP(1.5),
  },
  clearButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FF3B30',
    marginLeft: WP(2),
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.Primary || '#FF0000',
    borderRadius: WP(3),
    paddingVertical: HP(2),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
    marginLeft: WP(2),
  },
});

export default YouTubeSettingsScreen;

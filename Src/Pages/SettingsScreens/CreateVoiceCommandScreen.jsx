import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import voiceCommandStorageService from '../../services/VoiceCommand/voiceCommandStorageService';
import voiceCommandAlarmManager from '../../services/VoiceCommand/voiceCommandAlarmManager';

// CommandRow component with UPLOAD option or TEXT input
const CommandRow = ({command, index, onUpdateText, onUpdateGap, onDelete, onUploadAudio, isLast}) => {
  const hasAudio = command.audio_file_path && command.audio_file_path.length > 0;
  
  return (
    <View style={styles.commandRow}>
      <View style={styles.commandHeader}>
        <View style={styles.commandHeaderLeft}>
          <View style={styles.commandSequence}>
            <Text style={styles.commandSequenceText}>{index + 1}</Text>
          </View>
          <Text style={styles.commandLabel}>Command {index + 1}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteCommandButton}
          onPress={() => onDelete(command.id)}
          activeOpacity={0.7}>
          <Text style={styles.deleteCommandIcon}>×</Text>
        </TouchableOpacity>
      </View>
      
      {/* Option selector: Text or Audio Upload */}
      <View style={styles.optionSelector}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            !hasAudio && styles.optionButtonActive
          ]}
          onPress={() => {
            if (hasAudio) {
              // Clear audio and switch to text
              onUpdateText(command.id, '');
              // You'll need to add a method to clear audio
            }
          }}
          activeOpacity={0.7}>
          <Text style={[
            styles.optionButtonText,
            !hasAudio && styles.optionButtonTextActive
          ]}>Text</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.optionButton,
            hasAudio && styles.optionButtonActive
          ]}
          onPress={() => onUploadAudio(command.id)}
          activeOpacity={0.7}>
          <Text style={[
            styles.optionButtonText,
            hasAudio && styles.optionButtonTextActive
          ]}>Upload Audio</Text>
        </TouchableOpacity>
      </View>
      
      {/* Show text input OR audio file info */}
      {!hasAudio ? (
        <TextInput
          style={styles.commandInput}
          value={command.text}
          onChangeText={text => onUpdateText(command.id, text)}
          placeholder="Enter voice command text..."
          placeholderTextColor={colors.Shadow + '60'}
          multiline
          textAlignVertical="top"
        />
      ) : (
        <View style={styles.audioFileContainer}>
          <Text style={styles.audioFileName}>
            📁 {command.audio_file_name || 'Audio file uploaded'}
          </Text>
          <TouchableOpacity
            style={styles.changeAudioButton}
            onPress={() => onUploadAudio(command.id)}
            activeOpacity={0.7}>
            <Text style={styles.changeAudioText}>Change</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Gap Time Input - show for all commands except the last one */}
      {!isLast && (
        <View style={styles.gapTimeContainer}>
          <Text style={styles.gapTimeLabel}>Wait time before next command:</Text>
          <View style={styles.gapTimeInputWrapper}>
            <TextInput
              style={styles.gapTimeInput}
              value={command.gap_minutes?.toString() || ''}
              onChangeText={text => onUpdateGap(command.id, text)}
              placeholder="0"
              placeholderTextColor={colors.Shadow + '60'}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.gapTimeUnit}>minutes</Text>
          </View>
          <Text style={styles.gapTimeHint}>
            {command.gap_minutes > 0 
              ? `Next command will play ${command.gap_minutes} minute${command.gap_minutes !== 1 ? 's' : ''} after this one` 
              : 'Next command will play immediately'}
          </Text>
        </View>
      )}
    </View>
  );
};

const CreateVoiceCommandScreen = ({navigation, route}) => {
  const editMode = route.params?.editMode || false;
  const alarmId = route.params?.alarmId;

  const [alarmName, setAlarmName] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [commands, setCommands] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load existing alarm if editing
  useEffect(() => {
    if (editMode && alarmId) {
      loadAlarm();
    }
  }, [editMode, alarmId]);

  const loadAlarm = async () => {
    try {
      const alarm = await voiceCommandStorageService.getAlarmById(alarmId);
      if (alarm) {
        setAlarmName(alarm.name);
        // Ensure commands have gap_minutes field
        const commandsWithGap = alarm.commands.map(cmd => ({
          ...cmd,
          gap_minutes: cmd.gap_minutes !== undefined ? cmd.gap_minutes : 0,
        }));
        setCommands(commandsWithGap);

        // Parse time
        const [hours, minutes] = alarm.start_time.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10));
        date.setMinutes(parseInt(minutes, 10));
        setSelectedTime(date);
      }
    } catch (error) {
      console.error('Error loading alarm:', error);
      Alert.alert('Error', 'Failed to load alarm');
    }
  };

  // Add command
  const addCommand = () => {
    const newCommand = {
      id: `cmd_${Date.now()}`,
      sequence: commands.length + 1,
      text: '',
      gap_minutes: 0,
      audio_file_path: null,
      audio_file_name: null,
    };
    setCommands([...commands, newCommand]);
  };

  // Update command text
  const updateCommandText = (id, text) => {
    setCommands(prevCommands =>
      prevCommands.map(cmd => 
        cmd.id === id 
          ? {...cmd, text, audio_file_path: null, audio_file_name: null} 
          : cmd
      ),
    );
  };

  // Update command gap time in MINUTES
  const updateCommandGap = (id, gapText) => {
    const gapMinutes = parseInt(gapText) || 0;
    const validGap = Math.max(0, Math.min(999, gapMinutes));
    
    setCommands(prevCommands =>
      prevCommands.map(cmd => (cmd.id === id ? {...cmd, gap_minutes: validGap} : cmd)),
    );
  };

  // Upload audio file for command
  const uploadAudioForCommand = async (commandId) => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
        copyTo: 'documentDirectory',
      });

      if (result && result[0]) {
        const file = result[0];
        console.log('Selected audio file:', file);

        // Get the copied file path
        let filePath = file.fileCopyUri;
        
        if (!filePath) {
          Alert.alert('Error', 'Could not access the audio file');
          return;
        }

        // Create permanent storage directory
        const audioDir = `${RNFS.DocumentDirectoryPath}/voice_commands`;
        await RNFS.mkdir(audioDir);

        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const permanentFileName = `cmd_${timestamp}.${extension}`;
        const permanentPath = `${audioDir}/${permanentFileName}`;

        // Copy file to permanent location
        await RNFS.copyFile(filePath, permanentPath);

        console.log('Audio file saved to:', permanentPath);

        // Update command with audio file info
        setCommands(prevCommands =>
          prevCommands.map(cmd =>
            cmd.id === commandId
              ? {
                  ...cmd,
                  audio_file_path: permanentPath,
                  audio_file_name: file.name,
                  text: '', // Clear text when audio is selected
                }
              : cmd,
          ),
        );

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

  // Delete command
  const deleteCommand = id => {
    const filtered = commands.filter(cmd => cmd.id !== id);
    // Resequence
    const resequenced = filtered.map((cmd, index) => ({
      ...cmd,
      sequence: index + 1,
    }));
    setCommands(resequenced);
  };

  // Handle time change
  const onTimeChange = (event, selectedDate) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSelectedTime(selectedDate);
    }
  };

  // Format time for display
  const formatTime = date => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Format time for storage (24h)
  const formatTimeForStorage = date => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Validate form
  const validateForm = () => {
    if (!alarmName.trim()) {
      Alert.alert('Error', 'Please enter an alarm name');
      return false;
    }

    if (commands.length === 0) {
      Alert.alert('Error', 'Please add at least one command');
      return false;
    }

    // Check that each command has EITHER text OR audio file
    const invalidCommands = commands.filter(
      cmd => (!cmd.text || !cmd.text.trim()) && !cmd.audio_file_path
    );
    
    if (invalidCommands.length > 0) {
      Alert.alert('Error', 'Each command must have either text or an audio file');
      return false;
    }

    return true;
  };

  // Save alarm
  const saveAlarm = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const alarmData = {
        name: alarmName.trim(),
        start_time: formatTimeForStorage(selectedTime),
        days: [], // No days - one-time alarm
        is_enabled: true,
        commands: commands,
      };

      let result;
      if (editMode && alarmId) {
        result = await voiceCommandAlarmManager.updateAndRescheduleAlarm(
          alarmId,
          alarmData,
        );
      } else {
        result = await voiceCommandAlarmManager.createAndScheduleAlarm(alarmData);
      }

      if (result.success) {
        Alert.alert(
          'Success',
          `Alarm ${editMode ? 'updated' : 'created'} successfully`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to save alarm');
      }
    } catch (error) {
      console.error('Error saving alarm:', error);
      Alert.alert('Error', 'Failed to save alarm');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers
          title={editMode ? 'Edit Voice Command' : 'Create Voice Command'}
          navigation={navigation}>
          <TouchableOpacity onPress={saveAlarm} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#0059FF" size="small" />
            ) : (
              <Text style={styles.doneText}>
                {editMode ? 'Update' : 'Create'}
              </Text>
            )}
          </TouchableOpacity>
        </Headers>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Alarm Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Alarm Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={alarmName}
              onChangeText={setAlarmName}
              placeholder="e.g., Morning Routine"
              placeholderTextColor={colors.Shadow + '60'}
            />
          </View>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Start Time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}>
            <Text style={styles.timeButtonText}>{formatTime(selectedTime)}</Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={onTimeChange}
            />
          )}
        </View>

        {/* Commands */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Commands</Text>
          <View style={styles.commandsContainer}>
            {commands.length === 0 ? (
              <Text style={styles.emptyCommandsText}>
                No commands added yet. Tap the button below to add your first command.
              </Text>
            ) : (
              commands.map((command, index) => (
                <CommandRow
                  key={command.id}
                  command={command}
                  index={index}
                  onUpdateText={updateCommandText}
                  onUpdateGap={updateCommandGap}
                  onDelete={deleteCommand}
                  onUploadAudio={uploadAudioForCommand}
                  isLast={index === commands.length - 1}
                />
              ))
            )}

            <TouchableOpacity
              style={styles.addCommandButton}
              onPress={addCommand}
              activeOpacity={0.7}>
              <Text style={styles.addCommandButtonText}>+ Add Command</Text>
            </TouchableOpacity>
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
    backgroundColor: colors.White,
  },
  headerWrapper: {
    marginTop: HP(2.2),
    paddingBottom: HP(0.25),
    backgroundColor: colors.White,
    marginBottom: HP(1),
  },
  doneText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.3),
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: WP(5),
    paddingTop: HP(0.8),
    paddingBottom: HP(2),
  },
  section: {
    paddingVertical: HP(0.8),
  },
  sectionLabel: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginBottom: HP(1),
    marginLeft: WP(1.5),
  },
  inputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  textInput: {
    paddingVertical: HP(1.6),
    paddingHorizontal: WP(4),
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Medium',
    color: colors.Black,
    borderRadius: WP(3),
  },
  timeButton: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.8),
    alignItems: 'center',
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  timeButtonText: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
  commandsContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(4),
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  commandRow: {
    marginBottom: HP(2.5),
  },
  commandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: HP(1),
    paddingHorizontal: WP(1),
  },
  commandHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commandSequence: {
    width: WP(7),
    height: WP(7),
    borderRadius: WP(3.5),
    backgroundColor: colors.Primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: WP(2.5),
  },
  commandSequenceText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  commandLabel: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
  },
  deleteCommandButton: {
    width: WP(7),
    height: WP(7),
    borderRadius: WP(3.5),
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteCommandIcon: {
    fontSize: FS(2.5),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
    marginTop: -HP(0.2),
  },
  optionSelector: {
    flexDirection: 'row',
    marginBottom: HP(1),
    backgroundColor: colors.Primary + '10',
    borderRadius: WP(2),
    padding: WP(0.5),
  },
  optionButton: {
    flex: 1,
    paddingVertical: HP(1),
    alignItems: 'center',
    borderRadius: WP(1.5),
  },
  optionButtonActive: {
    backgroundColor: colors.Primary,
  },
  optionButtonText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Shadow,
  },
  optionButtonTextActive: {
    color: colors.White,
  },
  commandInput: {
    backgroundColor: colors.Primary + '08',
    borderRadius: WP(2.5),
    paddingHorizontal: WP(3.5),
    paddingVertical: HP(1.4),
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Medium',
    color: colors.Black,
    minHeight: HP(6.5),
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.Primary + '20',
  },
  audioFileContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: WP(2.5),
    paddingHorizontal: WP(3.5),
    paddingVertical: HP(1.4),
    borderWidth: 1,
    borderColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioFileName: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: '#2E7D32',
    flex: 1,
  },
  changeAudioButton: {
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.6),
    backgroundColor: colors.Primary,
    borderRadius: WP(1.5),
  },
  changeAudioText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  gapTimeContainer: {
    marginTop: HP(1.2),
    paddingHorizontal: WP(1),
  },
  gapTimeLabel: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginBottom: HP(0.6),
  },
  gapTimeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.White,
    borderRadius: WP(2),
    borderWidth: 1,
    borderColor: colors.Primary + '30',
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.8),
  },
  gapTimeInput: {
    flex: 1,
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    padding: 0,
  },
  gapTimeUnit: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
    marginLeft: WP(2),
  },
  gapTimeHint: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow + '80',
    marginTop: HP(0.5),
    fontStyle: 'italic',
  },
  addCommandButton: {
    backgroundColor: colors.Primary,
    borderRadius: WP(3),
    paddingVertical: HP(1.6),
    alignItems: 'center',
    marginTop: HP(0.5),
    shadowColor: colors.Primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addCommandButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  emptyCommandsText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    textAlign: 'center',
    marginVertical: HP(2),
  },
  bottomSpacer: {
    height: HP(3),
  },
})

export default CreateVoiceCommandScreen;
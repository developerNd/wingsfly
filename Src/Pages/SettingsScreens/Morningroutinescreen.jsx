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
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import CustomToast from '../../Components/CustomToast';
import {useAuth} from '../../contexts/AuthContext';
import {nightRoutineService} from '../../services/api/nightRoutineService';
import morningRoutineStorageService from '../../services/MorningRoutine/morningRoutineStorageService';
import morningRoutineAlarmManager from '../../services/MorningRoutine/morningRoutineAlarmManager';

// CommandRow component with TEXT input, DURATION, and GAP TIME
const CommandRow = ({command, index, onUpdateText, onUpdateDuration, onUpdateGap, onDelete, isLast}) => {
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
      
      {/* Voice Command Text Input */}
      <View style={styles.inputSection}>
        <Text style={styles.inputSectionLabel}>Voice Command</Text>
        <TextInput
          style={styles.commandInput}
          value={command.text}
          onChangeText={text => onUpdateText(command.id, text)}
          placeholder="Enter voice command text..."
          placeholderTextColor={colors.Shadow + '60'}
          multiline
          textAlignVertical="top"
        />
      </View>
      
      {/* Duration Input */}
      <View style={styles.durationContainer}>
        <Text style={styles.durationLabel}>Lock Screen Duration:</Text>
        <View style={styles.durationInputWrapper}>
          <TextInput
            style={styles.durationInput}
            value={command.duration?.toString() || ''}
            onChangeText={text => onUpdateDuration(command.id, text)}
            placeholder="0"
            placeholderTextColor={colors.Shadow + '60'}
            keyboardType="numeric"
            maxLength={3}
          />
          <Text style={styles.durationUnit}>minutes</Text>
        </View>
        <Text style={styles.durationHint}>
          {command.duration > 0 
            ? `Lock screen will show for ${command.duration} minute${command.duration !== 1 ? 's' : ''}` 
            : 'Enter how long to display this command'}
        </Text>
      </View>
      
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
              ? `Next command will trigger ${command.gap_minutes} minute${command.gap_minutes !== 1 ? 's' : ''} after this lock closes` 
              : 'Next command will trigger immediately'}
          </Text>
        </View>
      )}
    </View>
  );
};

const MorningRoutineScreen = ({navigation}) => {
  const {user} = useAuth();

  // Wake-up time from night routine (read-only)
  const [wakeUpTime, setWakeUpTime] = useState(null);
  const [wakeUpTimeFormatted, setWakeUpTimeFormatted] = useState('--:--');

  // Morning routine commands
  const [commands, setCommands] = useState([]);
  const [routineName, setRoutineName] = useState('Morning Routine');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Load wake-up time and existing morning routine on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load wake-up time from night routine
      const nightRoutine = await nightRoutineService.getFormattedNightRoutine(user?.id);
      if (nightRoutine && nightRoutine.wakeUpTime) {
        setWakeUpTime(nightRoutine.wakeUpTime);
        setWakeUpTimeFormatted(formatTime(nightRoutine.wakeUpTime));
        console.log('✅ Loaded wake-up time:', formatTime(nightRoutine.wakeUpTime));
      } else {
        console.log('⚠️ No wake-up time found in night routine');
        showToast('Please set your wake-up time in Night Routine first', 'error');
      }

      // Load existing morning routine
      const morningRoutine = await morningRoutineStorageService.getMorningRoutine(user?.id);
      if (morningRoutine) {
        setRoutineName(morningRoutine.name || 'Morning Routine');
        setCommands(morningRoutine.commands || []);
        console.log('✅ Loaded existing morning routine with', morningRoutine.commands?.length || 0, 'commands');
      } else {
        console.log('ℹ️ No existing morning routine found');
      }

    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = date => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  // Add command
  const addCommand = () => {
    const newCommand = {
      id: `cmd_${Date.now()}`,
      sequence: commands.length + 1,
      text: '',
      duration: 2, // Default 2 minutes
      gap_minutes: 5, // Default 5 minutes
    };
    setCommands([...commands, newCommand]);
  };

  // Update command text
  const updateCommandText = (id, text) => {
    setCommands(prevCommands =>
      prevCommands.map(cmd => 
        cmd.id === id ? {...cmd, text} : cmd
      ),
    );
  };

  // Update command duration
  const updateCommandDuration = (id, durationText) => {
    const duration = parseInt(durationText) || 0;
    const validDuration = Math.max(0, Math.min(999, duration));
    
    setCommands(prevCommands =>
      prevCommands.map(cmd => (cmd.id === id ? {...cmd, duration: validDuration} : cmd)),
    );
  };

  // Update command gap time
  const updateCommandGap = (id, gapText) => {
    const gapMinutes = parseInt(gapText) || 0;
    const validGap = Math.max(0, Math.min(999, gapMinutes));
    
    setCommands(prevCommands =>
      prevCommands.map(cmd => (cmd.id === id ? {...cmd, gap_minutes: validGap} : cmd)),
    );
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

  // Validate form
  const validateForm = () => {
    if (!wakeUpTime) {
      Alert.alert('Error', 'Please set your wake-up time in Night Routine first');
      return false;
    }

    if (!routineName.trim()) {
      Alert.alert('Error', 'Please enter a routine name');
      return false;
    }

    if (commands.length === 0) {
      Alert.alert('Error', 'Please add at least one voice command');
      return false;
    }

    // Check that each command has text and duration
    const invalidCommands = commands.filter(
      cmd => !cmd.text?.trim() || !cmd.duration || cmd.duration <= 0
    );
    
    if (invalidCommands.length > 0) {
      Alert.alert('Error', 'Each command must have text and a duration greater than 0');
      return false;
    }

    return true;
  };

  // Save morning routine
  const handleSave = async () => {
    if (!validateForm()) return;

    if (toastVisible) {
      hideToast();
    }

    setIsSaving(true);

    try {
      const routineData = {
        userId: user?.id,
        name: routineName.trim(),
        wakeUpTime: wakeUpTime.toISOString(),
        commands: commands,
        isEnabled: true,
      };

      console.log('=== SAVING MORNING ROUTINE ===');
      console.log('Wake-up Time:', wakeUpTimeFormatted);
      console.log('Commands:', commands.length);

      // Save routine
      await morningRoutineStorageService.saveMorningRoutine(routineData);

      // Schedule alarm for wake-up time
      await morningRoutineAlarmManager.scheduleMorningRoutine(user?.id);

      showToast('Morning routine saved successfully!', 'success');

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);

    } catch (error) {
      console.error('Error saving morning routine:', error);
      showToast('Failed to save morning routine', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Morning Routine" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Primary} />
          <Text style={styles.loadingText}>Loading routine...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Morning Routine" />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialIcons
            name="wb-sunny"
            size={WP(8)}
            color="#FFA726"
          />
          <Text style={styles.infoTitle}>Set Your Morning Routine</Text>
          <Text style={styles.infoDescription}>
            Create voice commands that will play at your wake-up time. Each command has a duration and gap time.
          </Text>
        </View>

        {/* Wake-up Time Display (Read-only) */}
        <View style={styles.wakeUpCard}>
          <View style={styles.wakeUpContent}>
            <View style={styles.wakeUpLeft}>
              <View style={[styles.iconContainer, {backgroundColor: '#FFA726'}]}>
                <MaterialIcons name="alarm" size={WP(6)} color={colors.White} />
              </View>
              <View>
                <Text style={styles.wakeUpLabel}>Wake-up Time</Text>
                <Text style={styles.wakeUpSubtext}>From Night Routine</Text>
              </View>
            </View>
            <Text style={styles.wakeUpTime}>{wakeUpTimeFormatted}</Text>
          </View>
        </View>

        {/* Routine Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Routine Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={routineName}
              onChangeText={setRoutineName}
              placeholder="e.g., Morning Routine"
              placeholderTextColor={colors.Shadow + '60'}
            />
          </View>
        </View>

        {/* Voice Commands */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Voice Commands</Text>
          <View style={styles.commandsContainer}>
            {commands.length === 0 ? (
              <Text style={styles.emptyCommandsText}>
                No commands added yet. Tap the button below to add your first voice command.
              </Text>
            ) : (
              commands.map((command, index) => (
                <CommandRow
                  key={command.id}
                  command={command}
                  index={index}
                  onUpdateText={updateCommandText}
                  onUpdateDuration={updateCommandDuration}
                  onUpdateGap={updateCommandGap}
                  onDelete={deleteCommand}
                  isLast={index === commands.length - 1}
                />
              ))
            )}

            <TouchableOpacity
              style={styles.addCommandButton}
              onPress={addCommand}
              activeOpacity={0.7}>
              <Text style={styles.addCommandButtonText}>+ Add Voice Command</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.White} />
          ) : (
            <>
              <MaterialIcons
                name="check-circle"
                size={WP(5)}
                color={colors.White}
              />
              <Text style={styles.saveButtonText}>Save Morning Routine</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 How It Works</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Voice commands will play at your wake-up time
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Each command shows in full-screen lock for the set duration
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Gap time is the wait before next command triggers
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Lock screen auto-closes after duration
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

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
    backgroundColor: colors.White,
    marginBottom: HP(1),
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: WP(5),
    paddingTop: HP(0.8),
    paddingBottom: HP(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: HP(2),
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
  },
  infoCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: WP(3),
    padding: WP(4),
    marginBottom: HP(2),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  infoTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginTop: HP(1),
    marginBottom: HP(0.5),
  },
  infoDescription: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    textAlign: 'center',
    lineHeight: HP(2.5),
  },
  wakeUpCard: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(4),
    marginBottom: HP(2),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA726',
  },
  wakeUpContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wakeUpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(6),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(3),
  },
  wakeUpLabel: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
  },
  wakeUpSubtext: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    marginTop: HP(0.2),
  },
  wakeUpTime: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: '#FFA726',
  },
  section: {
    marginBottom: HP(2),
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
  inputSection: {
    marginBottom: HP(1.5),
  },
  inputSectionLabel: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginBottom: HP(0.8),
    marginLeft: WP(1),
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
  durationContainer: {
    marginTop: HP(1),
    paddingHorizontal: WP(1),
    marginBottom: HP(1.5),
  },
  durationLabel: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginBottom: HP(0.6),
  },
  durationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: WP(2),
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.8),
  },
  durationInput: {
    flex: 1,
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    padding: 0,
  },
  durationUnit: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: '#2E7D32',
    marginLeft: WP(2),
  },
  durationHint: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow + '80',
    marginTop: HP(0.5),
    fontStyle: 'italic',
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
  saveButton: {
    backgroundColor: colors.Primary,
    borderRadius: WP(3),
    paddingVertical: HP(1.8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HP(3),
    elevation: 3,
    shadowColor: colors.Primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
    marginLeft: WP(2),
  },
  tipsSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: WP(3),
    padding: WP(4),
    borderWidth: 1,
    borderColor: '#90CAF9',
    marginBottom: HP(2),
  },
  tipsTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginBottom: HP(1.5),
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: HP(1),
  },
  tipBullet: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    marginRight: WP(2),
    marginTop: HP(0.2),
  },
  tipText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    flex: 1,
    lineHeight: HP(2.2),
  },
  bottomSpacer: {
    height: HP(3),
  },
});

export default MorningRoutineScreen;
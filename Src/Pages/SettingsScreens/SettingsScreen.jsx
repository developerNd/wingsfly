import React from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {useAuth} from '../../contexts/AuthContext';
import SessionService from '../../services/api/SessionService';

const SettingsScreen = ({navigation}) => {
  const {signOut} = useAuth();

  const handleManageAppsPress = () => {
    navigation.navigate('AppBlockerScreen');
  };

  const handlePomodoroPress = () => {
    navigation.navigate('PomoScreen');
  };

  const handleAppUsagePress = () => {
    navigation.navigate('AppUsageScreen');
  };

  const handleAlarmPress = () => {
    navigation.navigate('AlarmScreen');
  };

  const handleVoiceCommandsPress = () => {
    navigation.navigate('VoiceCommandListScreen');
  };

  const handleIntentionPress = () => {
    navigation.navigate('IntentionSettingsScreen');
  };

  const handleAppreciationPress = () => {
    navigation.navigate('AppreciationSettingsScreen');
  };

  // Digital Detox
  const handleDigitalDetoxPress = () => {
    navigation.navigate('DigitalDetoxScreen');
  };

  const handleDateReminderPress = () => {
    navigation.navigate('DateReminderSettingsScreen');
  };

  // NEW: Get Back
  const handleGetBackPress = () => {
    navigation.navigate('GetBackScreen');
  };

  const handleGetBackMediaSettingsPress = () => {
    navigation.navigate('GetBackSettingsScreen');
  };

  // NEW: YouTube Videos
  const handleYouTubeVideosPress = () => {
    navigation.navigate('YouTubeVideosScreen', {
      lockMode: true, // Enable lock mode
    });
  };

  const handleYouTubePress = () => {
    navigation.navigate('YouTubeIntegrationScreen');
  };

  const handleNightRoutinePress = () => {
    navigation.navigate('NightRoutineScreen');
  };

  const handleMorningRoutinePress = () => {
    navigation.navigate('MorningRoutineScreen');
  };

  const handleMorningVideosScreen = () => {
    navigation.navigate('MorningVideosScreen', {
      lockMode: true, // Enable lock mode
    });
  };

  // NEW: Leaderboard
  const handleLeaderboardPress = () => {
    navigation.navigate('LeaderboardScreen');
  };

  // NEW: Audio Files
  const handleAudioPress = () => {
    navigation.navigate('AudioFilesScreen');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ],
      {cancelable: true},
    );
  };

  const performLogout = async () => {
    try {
      console.log('=== TRACKING LOGOUT SESSION ===');
      const logoutResult = await SessionService.trackLogout();
      if (logoutResult.success) {
        console.log('✅ Logout session tracked successfully');
      } else {
        console.error('❌ Failed to track logout session:', logoutResult.error);
      }

      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const SettingItem = ({
    title,
    onPress,
    showArrow = true,
    isDestructive = false,
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.settingContent}>
        <Text
          style={[
            styles.settingTitle,
            isDestructive && styles.destructiveText,
          ]}>
          {title}
        </Text>
        {showArrow && (
          <Text style={[styles.arrow, isDestructive && styles.destructiveText]}>
            ›
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Settings" />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        {/* Leaderboard Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Competition</Text>
          <View style={styles.sectionContent}>
            <SettingItem title="Leaderboard" onPress={handleLeaderboardPress} />
          </View>
        </View>

        {/* Apps Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apps</Text>
          <View style={styles.sectionContent}>
            <SettingItem title="App Lock" onPress={handleManageAppsPress} />
          </View>
        </View>

        {/* App Usage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Usage</Text>
          <View style={styles.sectionContent}>
            <SettingItem title="App Usage" onPress={handleAppUsagePress} />
          </View>
        </View>

        {/* Productivity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productivity</Text>
          <View style={styles.sectionContent}>
            <SettingItem title="Alarm" onPress={handleAlarmPress} />
          </View>
        </View>

        {/* Sleep & Routine Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep & Routine</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              title="Morning Routine"
              onPress={handleMorningRoutinePress}
            />
            <View style={styles.separator} />
            <SettingItem
              title="Night Routine"
              onPress={handleNightRoutinePress}
            />
          </View>
        </View>

        {/* Wellbeing Section - Digital Detox & Get Back */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wellbeing</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              title="Digital Detox"
              onPress={handleDigitalDetoxPress}
            />
            <View style={styles.separator} />
            <SettingItem title="Get Back" onPress={handleGetBackPress} />
            <View style={styles.separator} />
            <SettingItem
              title="Get Back Media Settings"
              onPress={handleGetBackMediaSettingsPress}
            />
          </View>
        </View>

        {/* Voice Commands Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Commands</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              title="Voice Commands"
              onPress={handleVoiceCommandsPress}
            />
          </View>
        </View>

        {/* Motivation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motivation</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              title="Intention Command"
              onPress={handleIntentionPress}
            />
            <View style={styles.separator} />
            <SettingItem
              title="Appreciation Message"
              onPress={handleAppreciationPress}
            />
          </View>
        </View>

        {/* Daily Reminders Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Reminders</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              title="Date Reminder"
              onPress={handleDateReminderPress}
            />
          </View>
        </View>

        {/* NEW: YouTube Videos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Videos</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              title="Morning Mode"
              onPress={handleMorningVideosScreen}
            />
            <View style={styles.separator} />
            <SettingItem
              title="Night Mode"
              onPress={handleYouTubeVideosPress}
            />

            <View style={styles.separator} />
            <SettingItem title="YouTube" onPress={handleYouTubePress} />
          </View>
        </View>

        {/* NEW: Audio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Media</Text>
          <View style={styles.sectionContent}>
            <SettingItem title="Audio Files" onPress={handleAudioPress} />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              title="Logout"
              onPress={handleLogout}
              showArrow={false}
              isDestructive={true}
            />
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{height: HP(4)}} />
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
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: WP(4),
  },
  section: {
    marginTop: HP(2.5),
  },
  sectionTitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Shadow,
    marginBottom: HP(1),
    marginLeft: WP(2),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    elevation: 2,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingItem: {
    paddingVertical: HP(2),
    paddingHorizontal: WP(4),
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Medium',
    color: colors.Black,
    flex: 1,
  },
  arrow: {
    fontSize: FS(2.4),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    opacity: 0.6,
    marginLeft: WP(2),
  },
  destructiveText: {
    color: colors.Black,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: WP(4),
  },
});

export default SettingsScreen;

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
});

export default SettingsScreen;

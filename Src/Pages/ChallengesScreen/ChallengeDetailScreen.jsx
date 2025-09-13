import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Dimensions,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Headers from '../../Components/Headers';
import TaskSkeleton from '../../Components/TaskSkeleton';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {challengeService} from '../../services/api/challengeService';
import {useAuth} from '../../contexts/AuthContext';
import {ChallengePDFGenerator} from './ChallengePDFGenerator';

const {width: screenWidth} = Dimensions.get('window');

const ChallengeDetailScreen = () => {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completedDays, setCompletedDays] = useState({});
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  const challengeId = route.params?.challengeId;

  // Function to check storage permissions
  const checkStoragePermission = async () => {
    if (Platform.OS !== 'android') {
      return true; // iOS handles permissions differently
    }

    try {
      // For Android 11+ (API 30+), check for MANAGE_EXTERNAL_STORAGE
      if (Platform.Version >= 30) {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
        return granted;
      } else {
        // For older Android versions
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
        return granted;
      }
    } catch (error) {
      console.error('Error checking storage permission:', error);
      return false;
    }
  };

  // Function to request storage permissions
  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      if (Platform.Version >= 30) {
        // Android 11+ - Request MANAGE_EXTERNAL_STORAGE
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission Required',
            message: 'This app needs access to storage to save PDF files.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // Older Android versions
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission Required',
            message: 'This app needs access to storage to save PDF files.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error requesting storage permission:', error);
      return false;
    }
  };

  // Function to open device settings
  const openAppSettings = () => {
    Alert.alert(
      'Permission Required',
      'Storage permission is required to export PDF files. Please enable storage permission in app settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings().catch(error => {
              console.error('Error opening settings:', error);
              Alert.alert(
                'Error',
                'Unable to open settings. Please manually enable storage permission in your device settings.',
              );
            });
          },
        },
      ],
    );
  };

  // Function to show permission denied alert with settings option
  const showPermissionDeniedAlert = () => {
    Alert.alert(
      'Storage Permission Denied',
      'Storage access is required to save PDF files. Would you like to open app settings to grant permission?',
      [
        {
          text: 'Not Now',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: openAppSettings,
        },
      ],
    );
  };

  // Load challenge details and completions
  const loadChallengeDetails = async (showLoading = true) => {
    if (!user || !challengeId) {
      setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);

      const challengeData = await challengeService.getChallengeById(
        challengeId,
      );
      setChallenge(challengeData);

      const completedDaysData = await challengeService.getCompletedDays(
        challengeId,
        user.id,
      );
      setCompletedDays(completedDaysData);

      console.log('Challenge details loaded:', challengeData.name);
      console.log('Challenge data:', challengeData);
      console.log('Completed days:', completedDaysData);
    } catch (error) {
      console.error('Error loading challenge details:', error);
      Alert.alert(
        'Error',
        'Failed to load challenge details. Please try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadChallengeDetails(false);
  }, [user, challengeId]);

  useFocusEffect(
    useCallback(() => {
      loadChallengeDetails();
    }, [user, challengeId]),
  );

  const handleGeneratePDF = async () => {
    if (!challenge) {
      Alert.alert('Error', 'No challenge data available to export.');
      return;
    }

    setPdfGenerating(true);

    try {
      const filePath = await ChallengePDFGenerator.generateChallengePDF(
        challenge,
        completedDays,
      );

      if (filePath) {
        console.log('PDF generated successfully:', filePath);
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };

  // Alternative method to open settings (for older React Native versions)
  const openAppSettingsAlternative = () => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.APPLICATION_DETAILS_SETTINGS', [
        {key: 'package', value: 'com.wingsfly'}, // Replace with your actual package name
      ]).catch(error => {
        console.error('Error opening settings with intent:', error);
        Linking.openSettings();
      });
    } else {
      Linking.openSettings();
    }
  };

  // Format date for display
  const formatDisplayDate = dateObj => {
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle day completion
  const handleCompleteDay = async dayNumber => {
    try {
      setCompletedDays(prev => ({
        ...prev,
        [dayNumber]: {
          completed: true,
          completedDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        },
      }));

      await challengeService.markDayComplete(challengeId, user.id, dayNumber);

      Alert.alert(
        'Congratulations! 🎉',
        `Day ${dayNumber} completed successfully!`,
        [{text: 'Continue', style: 'default'}],
      );
    } catch (error) {
      console.error('Error completing day:', error);

      setCompletedDays(prev => {
        const newState = {...prev};
        delete newState[dayNumber];
        return newState;
      });

      const errorMessage =
        error.message || 'Failed to complete day. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  // Handle undo completion
  const handleUndoCompleteDay = async dayNumber => {
    try {
      setCompletedDays(prev => {
        const newState = {...prev};
        delete newState[dayNumber];
        return newState;
      });

      await challengeService.unmarkDayComplete(challengeId, user.id, dayNumber);

      Alert.alert(
        'Day Unmarked',
        `Day ${dayNumber} has been unmarked as incomplete.`,
        [{text: 'OK', style: 'default'}],
      );
    } catch (error) {
      console.error('Error undoing day completion:', error);

      setCompletedDays(prev => ({
        ...prev,
        [dayNumber]: {
          completed: true,
          completedDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        },
      }));

      Alert.alert('Error', 'Failed to undo completion. Please try again.');
    }
  };

  // Handle challenge deletion
  const handleDeleteChallenge = () => {
    if (!challenge) return;

    Alert.alert(
      'Delete Challenge',
      `Are you sure you want to delete "${challenge.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await challengeService.deleteChallenge(challengeId);
              Alert.alert('Success', 'Challenge deleted successfully!', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              console.error('Error deleting challenge:', error);
              Alert.alert(
                'Error',
                'Failed to delete challenge. Please try again.',
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // Format date
  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle day press
  const handleDayPress = useCallback(
    (dayNumber, currentDate) => {
      console.log('Day pressed:', dayNumber, 'Date:', currentDate);

      if (!challenge) {
        console.log('No challenge data available');
        return;
      }

      const isCompleted = completedDays[dayNumber]?.completed || false;
      const dateString = formatDisplayDate(currentDate);

      console.log('Day', dayNumber, 'isCompleted:', isCompleted);

      if (isCompleted) {
        Alert.alert(
          `Day ${dayNumber} - ${dateString}`,
          `✅ Completed!\n\n"${challenge.name}"\n\nWould you like to undo this completion?`,
          [
            {text: 'Keep Complete', style: 'default'},
            {
              text: 'Undo',
              style: 'destructive',
              onPress: () => handleUndoCompleteDay(dayNumber),
            },
          ],
        );
      } else {
        Alert.alert(
          `Day ${dayNumber} - ${dateString}`,
          `"${challenge.name}"\n\nMark this day as complete?`,
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Complete ✅',
              style: 'default',
              onPress: () => handleCompleteDay(dayNumber),
            },
          ],
        );
      }
    },
    [challenge, completedDays, handleCompleteDay, handleUndoCompleteDay],
  );

  // Generate day cards
  const dayCards = useMemo(() => {
    if (!challenge) {
      console.log('No challenge data available for day cards');
      return [];
    }

    console.log('Generating day cards for challenge:', challenge.name);
    console.log('Number of days:', challenge.number_of_days);
    console.log('Start date:', challenge.start_date);

    const days = [];
    const start = new Date(challenge.start_date);
    console.log('Parsed start date:', start);

    for (let i = 0; i < challenge.number_of_days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dayNumber = i + 1;
      const isCompleted = completedDays[dayNumber]?.completed || false;

      days.push({
        day: dayNumber,
        date: currentDate,
        isCompleted: isCompleted,
      });
    }

    console.log('Generated days array:', days.length, 'items');
    return days;
  }, [challenge, completedDays]);

  // Render day card
  const renderDayCard = useCallback(
    ({item: dayData}) => {
      console.log('Rendering day card:', dayData.day, dayData.isCompleted);

      return (
        <TouchableOpacity
          style={[
            styles.dayCard,
            dayData.isCompleted && styles.dayCardCompleted,
          ]}
          onPress={() => {
            console.log('TouchableOpacity pressed for day:', dayData.day);
            handleDayPress(dayData.day, dayData.date);
          }}
          activeOpacity={0.7}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text
            style={[
              styles.dayText,
              dayData.isCompleted && styles.dayTextCompleted,
            ]}>
            Day {dayData.day}
          </Text>

          {dayData.isCompleted && (
            <Icon
              name="check"
              size={WP(3)}
              color={colors.White}
              style={styles.checkIcon}
            />
          )}
        </TouchableOpacity>
      );
    },
    [handleDayPress],
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Challenge Details" />
        </View>
        <View style={styles.loadingContainer}>
          <FlatList
            data={[1, 2, 3, 4, 5]}
            keyExtractor={(item, index) => `skeleton-${index}`}
            renderItem={() => <TaskSkeleton />}
            contentContainerStyle={styles.skeletonContainer}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Challenge Details" />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Challenge not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const calculateEndDate = (startDate, numberOfDays) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + numberOfDays - 1);
    return end.toISOString();
  };
  const endDate = calculateEndDate(
    challenge.start_date,
    challenge.number_of_days,
  );
  const completedCount = Object.keys(completedDays).filter(
    day => completedDays[day]?.completed,
  ).length;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Challenge Details">
          <TouchableOpacity
            onPress={handleGeneratePDF}
            disabled={pdfGenerating}>
            <Text style={styles.exportText}>
              {pdfGenerating ? 'Exporting...' : 'Export'}
            </Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.challengeCard}>
          {/* Top Row: Start Date - Challenge Name - End Date */}
          <View style={styles.topRow}>
            <Text style={styles.startDate}>
              {formatDate(challenge.start_date)}
            </Text>

            <View style={styles.centerInfo}>
              <Text style={styles.challengeTitle} numberOfLines={3}>
                {challenge.name}
              </Text>
              <Text style={styles.daysCount}>
                {challenge.number_of_days} days
              </Text>
            </View>

            <View style={styles.rightSection}>
              <Text style={styles.endDate}>{formatDate(endDate)}</Text>
            </View>
          </View>

          {/* Days Container */}
          <View style={styles.daysContainer}>
            {dayCards.length > 0 ? (
              <FlatList
                data={dayCards}
                keyExtractor={item => `day-${item.day}-${item.date.getTime()}`}
                renderItem={renderDayCard}
                numColumns={4}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.daysListContainer}
                style={styles.daysList}
                columnWrapperStyle={styles.row}
                bounces={false}
                scrollEnabled={false}
                nestedScrollEnabled={false}
                removeClippedSubviews={false}
                extraData={completedDays}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No days to display</Text>
                <Text style={styles.noDataSubText}>
                  Challenge data may not be loaded yet
                </Text>
              </View>
            )}
          </View>

          {/* Why Section at Bottom */}
          {challenge.why && (
            <View style={styles.whyContainer}>
              <Text style={styles.whyText}>{challenge.why}</Text>
            </View>
          )}
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
    marginTop: HP(2.5),
    paddingBottom: HP(0.25),
  },
  exportText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: WP(4),
  },
  skeletonContainer: {
    paddingTop: HP(2),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(4),
  },
  errorText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FF6B6B',
    marginBottom: HP(2),
  },
  backButton: {
    backgroundColor: colors.Primary,
    paddingHorizontal: WP(6),
    paddingVertical: HP(1.5),
    borderRadius: WP(2),
  },
  backButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  challengeCard: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(4),
    margin: WP(4),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.08,
    shadowRadius: WP(2),
  },

  // Top Row Layout
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: HP(2),
  },
  startDate: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    textAlign: 'left',
    minWidth: WP(15),
  },
  centerInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: WP(2),
  },
  challengeTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: HP(0.5),
  },
  daysCount: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Bold',
    color: '#666666',
    textAlign: 'center',
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: WP(15),
  },
  endDate: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    textAlign: 'right',
  },

  // Days Container - Updated for direct screen display
  daysContainer: {
    backgroundColor: colors.White,
    paddingHorizontal: WP(-5),
    paddingTop: HP(1),
    marginBottom: HP(1),
  },
  daysList: {
    flexGrow: 0,
  },
  daysListContainer: {
    paddingVertical: HP(1),
    paddingHorizontal: WP(-5),
  },
  row: {
    justifyContent: 'space-around',
    marginBottom: HP(1.5),
  },

  // Day Cards - Same styling as modal
  dayCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: WP(2),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: HP(0.1)},
    shadowOpacity: 0.1,
    shadowRadius: WP(1),
    width: WP(18),
    height: HP(5),
    position: 'relative',
    margin: WP(0.8),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'visible',
  },
  dayCardCompleted: {
    backgroundColor: colors.Primary,
    borderColor: colors.Primary,
  },
  dayText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    textAlign: 'center',
  },
  dayTextCompleted: {
    color: colors.White,
  },
  checkIcon: {
    position: 'absolute',
    top: WP(0.5),
    right: WP(0.5),
  },

  // No data container
  noDataContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: HP(5),
  },
  noDataText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
    marginBottom: HP(1),
  },
  noDataSubText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#999999',
    textAlign: 'center',
  },

  // Why Section
  whyContainer: {
    alignItems: 'center',
    paddingTop: HP(1.5),
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  whyText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    textAlign: 'center',
    lineHeight: FS(2),
  },
});

export default ChallengeDetailScreen;

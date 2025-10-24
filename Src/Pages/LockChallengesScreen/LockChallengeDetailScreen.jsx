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
  FlatList,
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
import {lockChallengeService} from '../../services/api/lockChallengeService';
import {useAuth} from '../../contexts/AuthContext';

const LockChallengeDetailScreen = () => {
  const [lockChallenge, setLockChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completedDays, setCompletedDays] = useState({});

  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  const challengeId = route.params?.challengeId;

  // Load lock challenge details and completions
  const loadLockChallengeDetails = async (showLoading = true) => {
    if (!user || !challengeId) {
      setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);

      const challengeData = await lockChallengeService.getLockChallengeById(
        challengeId,
      );
      setLockChallenge(challengeData);

      const completedDaysData = await lockChallengeService.getCompletedDays(
        challengeId,
        user.id,
      );
      setCompletedDays(completedDaysData);

      console.log('Lock Challenge details loaded:', challengeData.name);
      console.log('Lock Challenge data:', challengeData);
      console.log('Completed days:', completedDaysData);
    } catch (error) {
      console.error('Error loading lock challenge details:', error);
      Alert.alert(
        'Error',
        'Failed to load lock challenge details. Please try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLockChallengeDetails(false);
  }, [user, challengeId]);

  useFocusEffect(
    useCallback(() => {
      loadLockChallengeDetails();
    }, [user, challengeId]),
  );

  // Format date for display
  const formatDisplayDate = dateObj => {
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format date
  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get status color
  const getStatusColor = status => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'in_progress':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      case 'missed':
        return '#F44336';
      default:
        return '#999999';
    }
  };

  // Check if a day is expired
  const isDayExpired = dayDate => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dayDate);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Generate day cards based on duration_days
  const dayCards = useMemo(() => {
    if (!lockChallenge || !lockChallenge.duration_days) {
      console.log('No lock challenge data available for day cards');
      return [];
    }

    console.log('Generating day cards for lock challenge:', lockChallenge.name);
    console.log('Duration days:', lockChallenge.duration_days);
    console.log('Start date:', lockChallenge.start_date);

    const days = [];
    const start = lockChallenge.start_date
      ? new Date(lockChallenge.start_date)
      : new Date();
    console.log('Parsed start date:', start);

    for (let i = 0; i < lockChallenge.duration_days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dayNumber = i + 1;
      const isCompleted = completedDays[dayNumber]?.completed || false;
      const isExpired = isDayExpired(currentDate);

      days.push({
        day: dayNumber,
        date: currentDate,
        isCompleted: isCompleted,
        isExpired: isExpired && !isCompleted,
        hoursCompleted: completedDays[dayNumber]?.hoursCompleted || 0,
        videoCompleted: completedDays[dayNumber]?.videoCompleted || false,
      });
    }

    console.log('Generated days array:', days.length, 'items');
    return days;
  }, [lockChallenge, completedDays]);

  // Render day card - View only, no interaction
  const renderDayCard = useCallback(
    ({item: dayData}) => {
      console.log(
        'Rendering day card:',
        dayData.day,
        dayData.isCompleted,
        dayData.isExpired,
      );

      return (
        <View
          style={[
            styles.dayCard,
            dayData.isCompleted && styles.dayCardCompleted,
            dayData.isExpired && styles.dayCardExpired,
          ]}>
          <Text
            style={[
              styles.dayText,
              dayData.isCompleted && styles.dayTextCompleted,
              dayData.isExpired && styles.dayTextExpired,
            ]}>
            Day {dayData.day}
          </Text>

          {dayData.isCompleted && (
            <View style={styles.completionInfo}>
              <Icon
                name="check"
                size={WP(3)}
                color={colors.White}
                style={styles.checkIcon}
              />
            </View>
          )}
        </View>
      );
    },
    [lockChallenge],
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Lock Challenge Details" />
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

  if (!lockChallenge) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Lock Challenge Details" />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Lock Challenge not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const completedCount = Object.keys(completedDays).filter(
    day => completedDays[day]?.completed,
  ).length;

  const totalHoursCompleted = Object.values(completedDays).reduce(
    (sum, day) => sum + (day?.hoursCompleted || 0),
    0,
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Lock Challenge Details" />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.challengeCard}>
          {/* Header Section */}
          <View style={styles.topRow}>
            <Text style={styles.startDate}>
              {formatDate(lockChallenge.start_date)}
            </Text>

            <View style={styles.centerInfo}>
              <Text style={styles.challengeTitle} numberOfLines={3}>
                {lockChallenge.name}
              </Text>
              <Text style={styles.daysCount}>
                {lockChallenge.duration_days} days
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {backgroundColor: getStatusColor(lockChallenge.status)},
                ]}>
                <Text style={styles.statusText}>
                  {lockChallenge.status?.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.rightSection}>
              <Text style={styles.endDate}>
                {formatDate(lockChallenge.end_date)}
              </Text>
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
                  Lock challenge data may not be loaded yet
                </Text>
              </View>
            )}
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
    marginTop: HP(2.5),
    paddingBottom: HP(0.25),
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
    marginBottom: HP(0.5),
  },
  statusBadge: {
    paddingHorizontal: WP(2),
    paddingVertical: HP(0.4),
    borderRadius: WP(1.5),
  },
  statusText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
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

  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: WP(2),
    paddingVertical: HP(1.5),
    marginBottom: HP(2),
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    marginTop: HP(0.5),
  },
  statLabel: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
    marginTop: HP(0.3),
  },
  statDivider: {
    width: 1,
    height: HP(4),
    backgroundColor: '#E0E0E0',
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: WP(3),
    paddingVertical: HP(1),
    borderRadius: WP(2),
    marginBottom: HP(2),
  },
  infoText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#333333',
    marginLeft: WP(2),
  },

  // Days Container
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

  // Day Cards
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
  dayCardExpired: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
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
  dayTextExpired: {
    color: '#D32F2F',
  },
  completionInfo: {
    position: 'absolute',
    top: WP(0.5),
    right: WP(0.5),
    alignItems: 'center',
  },
  checkIcon: {
    position: 'absolute',
    top: WP(0.5),
    right: WP(0.5),
  },
  hoursText: {
    fontSize: FS(1),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
    marginTop: HP(0.8),
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

  // Media Container
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: WP(3),
    paddingVertical: HP(1),
    borderRadius: WP(2),
    marginTop: HP(2),
  },
  mediaText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#333333',
    marginLeft: WP(2),
  },
});

export default LockChallengeDetailScreen;

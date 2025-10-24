import React, {useState, useCallback} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  FlatList,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Headers from '../../Components/Headers';
import TaskSkeleton from '../../Components/TaskSkeleton';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {lockChallengeService} from '../../services/api/lockChallengeService';
import {useAuth} from '../../contexts/AuthContext';

const LockChallengesScreen = () => {
  const [lockChallenges, setLockChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const navigation = useNavigation();
  const {user} = useAuth();

  // Load lock challenges
  const loadLockChallenges = async (showLoading = true) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);
      const allLockChallenges = await lockChallengeService.getLockChallenges(
        user.id,
      );
      setLockChallenges(allLockChallenges);
      console.log('Lock Challenges loaded:', allLockChallenges.length);
    } catch (error) {
      console.error('Error loading lock challenges:', error);
      Alert.alert('Error', 'Failed to load lock challenges. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLockChallenges(false);
  }, [user]);

  // Load lock challenges when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadLockChallenges();
    }, [user]),
  );

  // Handle lock challenge card press - navigate to detail screen
  const handleLockChallengePress = (challengeId, challengeName) => {
    navigation.navigate('LockChallengeDetailScreen', {
      challengeId: challengeId,
      challengeName: challengeName,
    });
  };

  // Format date
  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get status badge color
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

  // Render lock challenge card
  const renderLockChallengeCard = ({item}) => {
    return (
      <TouchableOpacity
        style={styles.challengeCard}
        onPress={() => handleLockChallengePress(item.id, item.name)}
        activeOpacity={0.7}>
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeTitle} numberOfLines={2}>
            {item.name}
          </Text>

          <View
            style={[
              styles.statusBadge,
              {backgroundColor: getStatusColor(item.status)},
            ]}>
            <Text style={styles.statusText}>
              {item.status?.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.challengeInfo}>
          <View style={styles.infoRow}>
            <Image source={Icons.Calendar} style={styles.iconImage} />
            <Text style={styles.infoText}>{item.duration_days} days</Text>
          </View>

          {item.hours_per_day && (
            <View style={styles.infoRow}>
              <Icon name="access-time" size={WP(4.5)} color="#4F4F4F" />
              <Text style={styles.infoText}>{item.hours_per_day} hrs/day</Text>
            </View>
          )}
        </View>

        <View style={styles.challengeDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Start:</Text>
            <Text style={styles.detailText}>{formatDate(item.start_date)}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>End:</Text>
            <Text style={styles.detailText}>{formatDate(item.end_date)}</Text>
          </View>
        </View>

        {item.category && (
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Lock Challenges">
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateLockChallengeScreen')}
            style={styles.addButton}>
            <Icon name="add" size={WP(5)} color={colors.Primary} />
          </TouchableOpacity>
        </Headers>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <FlatList
            data={[1, 2, 3, 4, 5]}
            keyExtractor={(item, index) => `skeleton-${index}`}
            renderItem={() => <TaskSkeleton />}
            contentContainerStyle={styles.skeletonContainer}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}>
          {lockChallenges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Image source={Icons.Goal} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No Lock Challenges Yet</Text>
              <Text style={styles.emptySubtitle}>
                Create your first lock challenge to get started!
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() =>
                  navigation.navigate('CreateLockChallengeScreen')
                }>
                <Text style={styles.createButtonText}>
                  Create Lock Challenge
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={lockChallenges}
              keyExtractor={item => item.id}
              renderItem={renderLockChallengeCard}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </ScrollView>
      )}
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
  addButton: {
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
  listContainer: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(2),
  },
  challengeCard: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(4),
    marginBottom: HP(2),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.08,
    shadowRadius: WP(2),
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: HP(1.5),
  },
  challengeTitle: {
    fontSize: FS(1.9),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    flex: 1,
    marginRight: WP(2),
  },
  statusBadge: {
    paddingHorizontal: WP(2.5),
    paddingVertical: HP(0.5),
    borderRadius: WP(1.5),
  },
  statusText: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  challengeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1.5),
    gap: WP(4),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
    marginLeft: WP(1),
  },
  challengeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: HP(1),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: '#999999',
    marginRight: WP(1),
  },
  detailText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
  },
  categoryContainer: {
    marginTop: HP(0.5),
  },
  categoryText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    textTransform: 'capitalize',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: HP(8),
    paddingHorizontal: WP(8),
  },
  emptyIcon: {
    width: WP(20),
    height: WP(20),
    tintColor: '#CCCCCC',
    marginBottom: HP(2),
  },
  emptyTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    marginBottom: HP(1),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    textAlign: 'center',
    marginBottom: HP(3),
  },
  createButton: {
    backgroundColor: colors.Primary,
    paddingHorizontal: WP(6),
    paddingVertical: HP(1.5),
    borderRadius: WP(2),
  },
  createButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  iconImage: {
    width: WP(4.5),
    height: WP(4.5),
    tintColor: '#4F4F4F',
    resizeMode: 'contain',
  },
});

export default LockChallengesScreen;

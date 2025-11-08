import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Headers from '../../Components/Headers';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {supabase} from '../../../supabase';
import {leaderboardService} from '../../services/leaderboardService';

const LeaderboardScreen = ({navigation}) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchLeaderboard();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    try {
      const {
        data: {user},
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error('Error fetching current user:', error);
        setError('Failed to load user data');
        return;
      }

      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (err) {
      console.error('Error in fetchCurrentUser:', err);
      setError('Failed to load user data');
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await leaderboardService.getGlobalLeaderboard();

      const processedData = data.map(user => ({
        ...user,
        id: user.userId,
        name: user.name,
        points: user.points,
        isCurrentUser: user.userId === currentUserId,
      }));

      setLeaderboardData(processedData);
      console.log(`Leaderboard loaded: ${processedData.length} users`);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
      Alert.alert(
        'Error',
        'Failed to load leaderboard. Please try again later.',
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  const handleUserClick = user => {
    setSelectedUser(user);
    setShowBreakdownModal(true);
  };

  const getInitials = name => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = rank => {
    const colors = [
      '#FFD700',
      '#C0C0C0',
      '#CD7F32',
      '#A8E6CF',
      '#FFB3BA',
      '#BAEAFF',
      '#FFF5BA',
      '#E0BBE4',
      '#FFDAC1',
      '#C7CEEA',
    ];
    return colors[rank - 1] || '#E0E0E0';
  };

  const Avatar = ({name, rank, size = 60}) => {
    const initials = getInitials(name);
    const backgroundColor = getAvatarColor(rank);

    return (
      <View
        style={[
          styles.avatarContainer,
          {width: size, height: size, borderRadius: size / 2},
        ]}>
        <View
          style={[
            styles.avatarInner,
            {
              backgroundColor,
              width: size - 6,
              height: size - 6,
              borderRadius: (size - 6) / 2,
            },
          ]}>
          <Text
            style={[styles.avatarText, {fontSize: size * 0.35, color: '#333'}]}>
            {initials}
          </Text>
        </View>
      </View>
    );
  };

  // Breakdown Modal Component
  const BreakdownModal = () => {
    if (!selectedUser) return null;

    const taskTypes = [
      {key: 'habit', label: 'Habit', image: Icons.Habit, color: '#4CAF50'},
      {
        key: 'recurring',
        label: 'Recurring',
        image: Icons.Recurring,
        color: '#2196F3',
      },
      {
        key: 'task',
        label: 'Task',
        image: Icons.Task,
        color: '#FF9800',
      },
      {
        key: 'planYourDay',
        label: 'Plan Your Day',
        image: Icons.Calendar,
        color: '#9C27B0',
      },
      {
        key: 'lockChallenge',
        label: 'Challenge',
        image: Icons.Task,
        color: '#F44336',
      },
    ];

    return (
      <Modal
        visible={showBreakdownModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBreakdownModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBreakdownModal(false)}>
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedUser.name}</Text>
                <Text style={styles.modalSubtitle}>
                  Rank #{selectedUser.rank} • {selectedUser.points}% Overall
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBreakdownModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Overall Progress Bar */}
            <View style={styles.overallProgressContainer}>
              <Text style={styles.overallProgressLabel}>Overall Progress</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {width: `${selectedUser.points}%`},
                  ]}
                />
              </View>
              <Text style={styles.overallProgressText}>
                {selectedUser.points}%
              </Text>
            </View>

            {/* Task Type Breakdown */}
            <ScrollView style={styles.breakdownList}>
              {taskTypes.map(type => {
                const percentage = selectedUser.breakdown?.[type.key] || 0;
                const count = selectedUser.counts?.[type.key] || 0;

                return (
                  <View key={type.key} style={styles.breakdownItem}>
                    <View style={styles.breakdownHeader}>
                      <View style={styles.breakdownTitleContainer}>
                        {type.image ? (
                          <Image
                            source={type.image}
                            style={styles.taskTypeImage}
                          />
                        ) : (
                          <MaterialCommunityIcons
                            name={type.icon}
                            size={20}
                            color={type.color}
                          />
                        )}
                        <Text style={styles.breakdownLabel}>{type.label}</Text>
                      </View>
                      <Text style={styles.breakdownCount}>({count} tasks)</Text>
                    </View>

                    <View style={styles.breakdownProgressContainer}>
                      <View style={styles.breakdownProgressBar}>
                        <View
                          style={[
                            styles.breakdownProgressFill,
                            {
                              width: `${Math.min(percentage, 100)}%`,
                              backgroundColor: type.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.breakdownPercentage}>
                        {Math.round(percentage)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  const TopThreePodium = () => {
    const topThree = leaderboardData.slice(0, 3);

    if (topThree.length < 3) {
      return (
        <View style={styles.podiumContainer}>
          <Text style={styles.notEnoughDataText}>
            Not enough data for podium
          </Text>
        </View>
      );
    }

    const first = topThree[0];
    const second = topThree[1];
    const third = topThree[2];

    return (
      <View style={styles.podiumContainer}>
        {/* Second Place */}
        <TouchableOpacity
          style={styles.podiumItem}
          onPress={() => handleUserClick(second)}
          activeOpacity={0.7}>
          <Avatar name={second.name} rank={2} size={70} />
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>2</Text>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>
            {second.name.length > 10
              ? second.name.substring(0, 10) + '...'
              : second.name}
          </Text>
          <View style={styles.pointsContainer}>
            <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
            <Text style={styles.podiumPoints}>{second.points}%</Text>
          </View>
        </TouchableOpacity>

        {/* First Place */}
        <TouchableOpacity
          style={[styles.podiumItem, styles.firstPlace]}
          onPress={() => handleUserClick(first)}
          activeOpacity={0.7}>
          <View style={styles.crownContainer}>
            <MaterialCommunityIcons name="crown" size={36} color="#FFD700" />
          </View>
          <Avatar name={first.name} rank={1} size={85} />
          <View style={[styles.rankBadge, styles.firstRankBadge]}>
            <Text style={styles.rankBadgeText}>1</Text>
          </View>
          <Text style={[styles.podiumName, styles.firstName]} numberOfLines={1}>
            {first.name}
          </Text>
          <View style={styles.pointsContainer}>
            <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
            <Text style={[styles.podiumPoints, styles.firstPoints]}>
              {first.points}%
            </Text>
          </View>
        </TouchableOpacity>

        {/* Third Place */}
        <TouchableOpacity
          style={styles.podiumItem}
          onPress={() => handleUserClick(third)}
          activeOpacity={0.7}>
          <Avatar name={third.name} rank={3} size={70} />
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>3</Text>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>
            {third.name.length > 10
              ? third.name.substring(0, 10) + '...'
              : third.name}
          </Text>
          <View style={styles.pointsContainer}>
            <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
            <Text style={styles.podiumPoints}>{third.points}%</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const LeaderboardItem = ({item}) => {
    return (
      <TouchableOpacity
        style={[styles.listItem, item.isCurrentUser && styles.currentUserItem]}
        onPress={() => handleUserClick(item)}
        activeOpacity={0.7}>
        <Text style={styles.rankNumber}>{item.rank}</Text>
        <Avatar name={item.name} rank={item.rank} size={35} />
        <Text
          style={[
            styles.listName,
            item.isCurrentUser && styles.currentUserText,
          ]}>
          {item.name}
        </Text>
        <Text
          style={[
            styles.listPoints,
            item.isCurrentUser && styles.currentUserText,
          ]}>
          {item.points}%
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Leaderboard" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Leaderboard" />
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={60}
            color="#ff6b6b"
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchLeaderboard}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (leaderboardData.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Leaderboard" />
        </View>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          <MaterialCommunityIcons
            name="trophy-outline"
            size={80}
            color="#ccc"
          />
          <Text style={styles.emptyTitle}>No Rankings Yet</Text>
          <Text style={styles.emptyText}>
            Complete your tasks to appear on the leaderboard!
          </Text>
        </ScrollView>
      </View>
    );
  }

  const restOfList = leaderboardData.slice(3);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Leaderboard" />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {leaderboardData.length >= 3 && <TopThreePodium />}

        <View style={styles.listWrapper}>
          <View style={styles.listContainer}>
            {restOfList.length > 0 ? (
              restOfList.map(item => (
                <LeaderboardItem key={item.id} item={item} />
              ))
            ) : (
              <View style={styles.noMoreUsersContainer}>
                <MaterialCommunityIcons
                  name="trophy-variant"
                  size={40}
                  color="#B8C5B0"
                />
                <Text style={styles.noMoreUsersText}>
                  Top 3 champions shown above!
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <BreakdownModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  headerWrapper: {
    paddingBottom: HP(1),
    backgroundColor: colors.White,
    marginTop: HP(2.5),
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: HP(2),
    fontSize: FS(1.6),
    color: '#666',
    fontFamily: 'OpenSans-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(8),
  },
  errorText: {
    marginTop: HP(2),
    fontSize: FS(1.8),
    color: '#ff6b6b',
    textAlign: 'center',
    fontFamily: 'OpenSans-Medium',
  },
  retryButton: {
    marginTop: HP(2),
    paddingHorizontal: WP(6),
    paddingVertical: HP(1.5),
    backgroundColor: colors.Primary,
    borderRadius: WP(2),
  },
  retryButtonText: {
    color: colors.White,
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(8),
  },
  emptyTitle: {
    marginTop: HP(2),
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
  },
  emptyText: {
    marginTop: HP(1),
    fontSize: FS(1.6),
    color: '#666',
    textAlign: 'center',
    fontFamily: 'OpenSans-Regular',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: WP(4),
    paddingTop: HP(2),
    paddingBottom: HP(3),
    backgroundColor: colors.White,
  },
  notEnoughDataText: {
    fontSize: FS(1.6),
    color: '#999',
    fontFamily: 'OpenSans-Regular',
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: WP(1),
  },
  firstPlace: {
    marginBottom: HP(3),
  },
  crownContainer: {
    marginBottom: HP(-0.6),
  },
  avatarContainer: {
    backgroundColor: colors.White,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  avatarInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'OpenSans-Bold',
    color: '#333',
  },
  rankBadge: {
    backgroundColor: '#C8E6C9',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: HP(-1),
    borderWidth: 2,
    borderColor: colors.White,
  },
  firstRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#A5D6A7',
  },
  rankBadgeText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Bold',
    color: '#2E7D32',
  },
  podiumName: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginTop: HP(0.5),
    textAlign: 'center',
  },
  firstName: {
    fontSize: FS(1.6),
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: HP(0.3),
  },
  podiumPoints: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Medium',
    color: '#666',
    marginLeft: WP(0.5),
  },
  firstPoints: {
    fontSize: FS(1.4),
  },
  listWrapper: {
    flex: 1,
    backgroundColor: '#F1F5E8',
    borderTopLeftRadius: WP(11),
    borderTopRightRadius: WP(11),
    paddingTop: HP(3.3),
    paddingBottom: HP(4),
  },
  listContainer: {
    paddingHorizontal: WP(5),
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F9F5',
    paddingVertical: HP(1),
    paddingHorizontal: WP(4),
    borderRadius: WP(3.6),
    marginBottom: HP(1),
  },
  currentUserItem: {
    backgroundColor: '#C8E6C9',
  },
  rankNumber: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    width: WP(8),
  },
  listName: {
    flex: 1,
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Medium',
    color: colors.Black,
    marginLeft: WP(3),
  },
  listPoints: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666',
  },
  currentUserText: {
    color: '#2E7D32',
    fontFamily: 'OpenSans-Bold',
  },
  noMoreUsersContainer: {
    alignItems: 'center',
    paddingVertical: HP(6),
  },
  noMoreUsersText: {
    marginTop: HP(2),
    fontSize: FS(1.5),
    color: '#7A8975',
    fontFamily: 'OpenSans-Medium',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    width: WP(90),
    maxHeight: HP(70),
    padding: WP(5),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: HP(2),
  },
  modalTitle: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
  },
  modalSubtitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666',
    marginTop: HP(0.3),
  },
  overallProgressContainer: {
    marginBottom: HP(2),
    paddingBottom: HP(2),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  overallProgressLabel: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginBottom: HP(1),
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.Primary,
    borderRadius: 4,
  },
  overallProgressText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    textAlign: 'center',
    marginTop: HP(1),
  },
  breakdownList: {
    maxHeight: HP(40),
  },
  breakdownItem: {
    marginBottom: HP(2),
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: HP(0.5),
  },
  breakdownTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginLeft: WP(2),
  },
  breakdownCount: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#999',
  },
  breakdownProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: WP(2),
  },
  breakdownProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownPercentage: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666',
    width: WP(12),
    textAlign: 'right',
  },
  taskTypeImage: {
    width: WP(4),
    height: WP(4),
    resizeMode: 'contain',
  },
});

export default LeaderboardScreen;

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
import TaskOptionsModal from '../../Components/TaskOptionsModal';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {challengeService} from '../../services/api/challengeService';
import {useAuth} from '../../contexts/AuthContext';

const ChallengesScreen = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // State for options modal
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  const navigation = useNavigation();
  const {user} = useAuth();

  // Load challenges
  const loadChallenges = async (showLoading = true) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);
      const allChallenges = await challengeService.getChallenges(user.id);
      setChallenges(allChallenges);
      console.log('Challenges loaded:', allChallenges.length);
    } catch (error) {
      console.error('Error loading challenges:', error);
      Alert.alert('Error', 'Failed to load challenges. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadChallenges(false);
  }, [user]);

  // Load challenges when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadChallenges();
    }, [user]),
  );

  // Handle challenge card press - navigate to detail screen
  const handleChallengePress = (challengeId, challengeName) => {
    navigation.navigate('ChallengeDetailScreen', {
      challengeId: challengeId,
      challengeName: challengeName,
    });
  };

  // Show options modal
  const showOptionsModal = (challenge) => {
    setSelectedChallenge(challenge);
    setOptionsModalVisible(true);
  };

  // Hide options modal
  const hideOptionsModal = () => {
    setOptionsModalVisible(false);
    setSelectedChallenge(null);
  };

  // Handle edit option
  const handleEditChallenge = () => {
    hideOptionsModal();
    navigation.navigate('EditChallengeScreen', {
      challengeId: selectedChallenge.id,
    });
  };

  // Handle delete option - delete immediately without additional confirmation
  const handleDeleteChallenge = async () => {
    hideOptionsModal();
    
    try {
      setLoading(true);
      await challengeService.deleteChallenge(selectedChallenge.id);
      setChallenges(prev => prev.filter(c => c.id !== selectedChallenge.id));
      Alert.alert('Success', 'Challenge deleted successfully.');
    } catch (error) {
      console.error('Error deleting challenge:', error);
      Alert.alert('Error', 'Failed to delete challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Render challenge card
  const renderChallengeCard = ({item}) => {
    return (
      <TouchableOpacity
        style={styles.challengeCard}
        onPress={() => handleChallengePress(item.id, item.name)}
        activeOpacity={0.7}>
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeTitle} numberOfLines={2}>
            {item.name}
          </Text>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={e => {
              e.stopPropagation();
              showOptionsModal(item);
            }}>
            <Icon name="more-vert" size={WP(5)} color="#666666" />
          </TouchableOpacity>
        </View>

        {item.why && (
          <Text style={styles.challengeWhy} numberOfLines={3}>
            {item.why}
          </Text>
        )}

        <View style={styles.challengeDetails}>
          <View style={styles.detailItem}>
            <Image source={Icons.Calendar} style={styles.iconImage} />
            <Text style={styles.detailText}>{item.number_of_days} days</Text>
          </View>

          <View style={styles.detailItem}>
            <Image source={Icons.Calendar} style={styles.iconImage} />
            <Text style={styles.detailText}>{formatDate(item.start_date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="My Challenges">
          <TouchableOpacity
            onPress={() => navigation.navigate('ChallengeScreen')}
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
          {challenges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Image source={Icons.Goal} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No Challenges Yet</Text>
              <Text style={styles.emptySubtitle}>
                Create your first challenge to get started!
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('ChallengeScreen')}>
                <Text style={styles.createButtonText}>Create Challenge</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={challenges}
              keyExtractor={item => item.id}
              renderItem={renderChallengeCard}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </ScrollView>
      )}

      {/* Task Options Modal */}
      <TaskOptionsModal
        visible={optionsModalVisible}
        taskTitle={selectedChallenge?.name || ''}
        onCancel={hideOptionsModal}
        onEdit={handleEditChallenge}
        onDelete={handleDeleteChallenge}
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
    marginBottom: HP(1),
  },
  challengeTitle: {
    fontSize: FS(1.9),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    flex: 1,
    marginRight: WP(2),
  },
  moreButton: {
    padding: WP(1),
  },
  challengeWhy: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginBottom: HP(1.5),
    lineHeight: FS(2),
  },
  challengeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
    marginLeft: WP(1),
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
    width: WP(5),
    height: WP(5),
    tintColor: '#4F4F4F',
    resizeMode: 'contain',
  },
});

export default ChallengesScreen;
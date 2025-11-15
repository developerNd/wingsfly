import React, {useRef, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import {WP, HP, FS} from '../../utils/dimentions';
import {colors} from '../../Helper/Contants';
import {useRoute} from '@react-navigation/native';
import {supabase} from '../../../supabase';

// Import Appreciation Service
import AppreciationVoiceService from '../../services/Appreciation/appreciationVoiceService';

import YouDidItBackground from '../../assets/Images/Achievement-screen/you-did-it-bttn.svg';
import TaskStatsBackground from '../../assets/Images/Achievement-screen/stats-background.svg';
import BlueLineSvg from '../../assets/Images/Achievement-screen/blue-line.svg';

const AchievementScreen = ({
  userName = 'Champion',
  onClose,
}) => {
  const route = useRoute();
  const lottieRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userDisplayName, setUserDisplayName] = useState(userName);
  const [voicePlayed, setVoicePlayed] = useState(false);

  const {
    taskData,
    sessionStructure,
    totalPomodoros = 10,
    completedPomodoros = 10,
    totalBreaks = 0,
    completedBreaks = 0,
    totalShortBreaks = 0,
    totalLongBreaks = 0,
    completedShortBreaks = 0,
    completedLongBreaks = 0,
    selectedDate,
    totalCompletedTime = 0,
    completionDate,
    timerData,
    userProfile,
  } = route.params || {};

  // Fetch user profile from Supabase
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          return;
        }
        
        if (!user) {
          return;
        }
        
        setCurrentUser(user);
        
        const extractedName = user.user_metadata?.username ||
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split('@')[0] : userName);
        
        setUserDisplayName(extractedName);
        
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Play appreciation voice when screen loads
  useEffect(() => {
    const playAppreciationMessage = async () => {
      if (!voicePlayed) {
        // Add a small delay for better user experience
        setTimeout(async () => {
          try {
            console.log('🎵 Playing appreciation message...');
            
            // Fetch and play appreciation message directly from database
            const success = await AppreciationVoiceService.playAppreciationMessage();
            
            if (success) {
              console.log('✅ Appreciation message played successfully');
              setVoicePlayed(true);
            } else {
              console.log('⚠️ Failed to play appreciation message or no settings configured');
            }
          } catch (error) {
            console.error('❌ Error playing appreciation message:', error);
          }
        }, 1000); // 1 second delay after screen appears
      }
    };

    playAppreciationMessage();

    // Cleanup on unmount
    return () => {
      AppreciationVoiceService.stopAudio();
    };
  }, [voicePlayed]);

  const getDynamicUserName = () => {
    if (userDisplayName !== userName) {
      return userDisplayName;
    }
    
    if (userProfile) {
      const extractedName = userProfile.username ||
        userProfile.display_name ||
        userProfile.user_metadata?.display_name ||
        userProfile.user_metadata?.username ||
        (userProfile.email ? userProfile.email.split('@')[0] : userName);
      
      return extractedName;
    }
    
    if (taskData && taskData.userProfile) {
      const extractedName = taskData.userProfile.username ||
        taskData.userProfile.display_name ||
        taskData.userProfile.user_metadata?.display_name ||
        taskData.userProfile.user_metadata?.username ||
        (taskData.userProfile.email ? taskData.userProfile.email.split('@')[0] : userName);
      
      return extractedName;
    }
    
    return userName;
  };

  const dynamicUserName = getDynamicUserName();

  const calculateProgress = () => {
    const totalSessions = totalPomodoros + totalBreaks;
    const completedSessions = completedPomodoros + completedBreaks;

    if (totalSessions === 0) return 100;
    return Math.round((completedSessions / totalSessions) * 100);
  };

  const formatTime = totalSeconds => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}H ${minutes}Min`;
    }
    return `${minutes}Min`;
  };

  const getTaskStats = () => {
    const totalTasks = totalPomodoros;
    const completedTasks = completedPomodoros;
    const incompleteTasks = Math.max(0, totalTasks - completedTasks);
    const completeTasks = completedTasks;

    console.log('Achievement Screen Stats:', {
      totalTasks,
      completedTasks,
      incompleteTasks,
      completeTasks,
      totalBreaks,
      completedBreaks,
      completedLongBreaks,
      totalCompletedTime,
      progress: calculateProgress(),
    });

    return {
      totalTasks,
      incompleteTasks,
      completeTasks,
    };
  };

  const progress = calculateProgress();
  const timeSpent = formatTime(totalCompletedTime);
  const taskStats = getTaskStats();

  useEffect(() => {
    let timeoutId = null;
    let pauseTimeoutId = null;

    if (lottieRef.current) {
      timeoutId = setTimeout(() => {
        try {
          if (!lottieRef.current) {
            console.log('Lottie ref is null, skipping animation control');
            return;
          }

          const animationProgress = progress / 100;
          console.log(
            'Animation Progress:',
            animationProgress,
            'Progress:',
            progress + '%',
          );

          if (typeof lottieRef.current.progress !== 'undefined') {
            lottieRef.current.progress = animationProgress;
          }

          if (
            lottieRef.current.goToAndStop &&
            typeof lottieRef.current.goToAndStop === 'function'
          ) {
            const totalFrames = lottieRef.current.getDuration
              ? Math.floor(lottieRef.current.getDuration() * 60)
              : 100;
            const targetFrame = Math.floor(animationProgress * totalFrames);
            lottieRef.current.goToAndStop(targetFrame, true);
          }

          if (
            lottieRef.current.play &&
            typeof lottieRef.current.play === 'function' &&
            lottieRef.current.pause &&
            typeof lottieRef.current.pause === 'function'
          ) {
            lottieRef.current.play();

            pauseTimeoutId = setTimeout(() => {
              if (
                lottieRef.current &&
                lottieRef.current.pause &&
                typeof lottieRef.current.pause === 'function'
              ) {
                lottieRef.current.pause();
              } else {
                console.log(
                  'Lottie ref became null before pause could be called',
                );
              }
            }, animationProgress * 7000);
          }
        } catch (error) {
          console.error('Error controlling Lottie animation:', error);

          if (lottieRef.current && progress === 100 && lottieRef.current.play) {
            try {
              lottieRef.current.play();
            } catch (fallbackError) {
              console.error('Fallback animation play failed:', fallbackError);
            }
          }
        }
      }, 200);

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (pauseTimeoutId) {
          clearTimeout(pauseTimeoutId);
        }
      };
    }
  }, [progress]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#000829" barStyle="light-content" />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.userName}>{dynamicUserName}</Text>
        </View>

        <View style={styles.achievementButton}>
          <YouDidItBackground
            width={WP(50)}
            height={HP(8.5)}
            style={styles.youDidItImage}
            preserveAspectRatio="none"
          />
          <View style={styles.buttonOverlay}>
            <Text style={styles.buttonText}>You Did It!</Text>
          </View>
        </View>

        <View style={styles.motivationContainer}>
          <View style={styles.motivationTextLine}>
            <Text style={styles.motivationText}>You are </Text>
            <Text style={styles.unstoppableText}>unstoppable</Text>
            <Text style={styles.motivationText}> - keep going</Text>
          </View>
          <View style={styles.motivationTextLine}>
            <Text style={styles.journeyText}>Your Journey is </Text>
            <Text style={styles.inspiringText}>inspiring!</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <LottieView
            ref={lottieRef}
            source={require('../../assets/animations/apprectince-clock3.json')}
            style={styles.lottieClockAnimation}
            autoPlay={false}
            loop={false}
            speed={1}
            resizeMode="contain"
            onAnimationFinish={() => {
              console.log('Lottie animation finished');
            }}
            onError={error => {
              console.error('Lottie animation error:', error);
            }}
          />

          <View style={styles.centerContent}>
            <Text style={styles.percentageText}>{progress}%</Text>
            <Text style={styles.timeText}>{timeSpent}</Text>

            <View style={styles.taskInfo}>
              <View style={styles.taskCountContainer}>
                <Text style={styles.taskCount1}>{taskStats.completeTasks}</Text>
                <BlueLineSvg
                  width={WP(0.7)}
                  height={WP(6)}
                  style={styles.blueLineIndicator}
                  preserveAspectRatio="none"
                />
                <Text style={styles.taskCount}>{taskStats.totalTasks}</Text>
              </View>
              <Text style={styles.taskLabel}>Task</Text>
            </View>
          </View>
        </View>

        <View style={styles.taskStatsContainer}>
          <TaskStatsBackground
            width={WP(95)}
            height={HP(14.5)}
            style={styles.taskStatsImage}
            preserveAspectRatio="none"
          />
          <View style={styles.taskStatsOverlay}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Task</Text>
              <Text style={styles.statNumber}>{taskStats.totalTasks}</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Incomplete Task</Text>
              <Text style={styles.statNumber}>{taskStats.incompleteTasks}</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Complete Task</Text>
              <Text style={styles.statNumber}>{taskStats.completeTasks}</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000829',
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(5),
    alignItems: 'center',
  },
  header: {
    marginTop: HP(2.5),
    marginBottom: HP(1),
  },
  userName: {
    fontSize: FS(3.8),
    fontFamily: 'Europa-Grotesk-SH-Bold',
    color: colors.White,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: '#1DFF48',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 20,
    elevation: 10,
  },
  achievementButton: {
    marginBottom: HP(2.5),
    position: 'relative',
    width: WP(50),
    height: HP(8.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  youDidItImage: {
    position: 'absolute',
    top: 0,
    left: 3,
  },
  buttonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  buttonText: {
    fontSize: FS(3.5),
    fontFamily: 'Europa-Grotesk-SH-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  motivationContainer: {
    marginBottom: HP(6),
    alignItems: 'center',
  },
  motivationTextLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: HP(-0.5),
  },
  motivationText: {
    fontSize: FS(2.5),
    fontFamily: 'Europa-Grotesk-SH-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: FS(2.5) * 1.2,
    textShadowColor: '#D6D6D6',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
    elevation: 5,
  },
  unstoppableText: {
    fontSize: FS(2.5),
    color: '#1CA8E8',
    fontFamily: 'XB YasBdIt',
    lineHeight: FS(2.5) * 1.2,
    textShadowColor: '#1CA8E8',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 15,
    elevation: 8,
  },
  journeyText: {
    fontSize: FS(2.5),
    fontFamily: 'Europa-Grotesk-SH-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: FS(2.5) * 1.2,
    textShadowColor: '#D6D6D6',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
    elevation: 5,
  },
  inspiringText: {
    fontSize: FS(2.5),
    color: '#1CA8E8',
    fontFamily: 'XB YasBdIt',
    lineHeight: FS(2.5) * 1.2,
    textShadowColor: '#1CA8E8',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 15,
    elevation: 8,
  },
  progressContainer: {
    marginVertical: HP(1),
    position: 'relative',
    width: WP(98),
    height: WP(93),
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieClockAnimation: {
    position: 'absolute',
    width: WP(98),
    height: WP(93),
    top: 0,
    left: 0,
    zIndex: 1,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: '55%',
    left: '47%',
    transform: [{translateX: -WP(11)}, {translateY: -WP(14)}],
    zIndex: 10,
  },
  percentageText: {
    fontSize: FS(5.5),
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  timeText: {
    fontSize: FS(1.8),
    fontFamily: 'Orbitron-Bold',
    color: '#999999',
    marginBottom: HP(4),
  },
  taskInfo: {
    alignItems: 'center',
  },
  taskCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskCount: {
    fontSize: FS(4),
    fontFamily: 'Poppins-SemiBold',
    color: '#15CAFF',
    marginLeft: WP(2.2),
  },
  taskCount1: {
    fontSize: FS(4),
    fontFamily: 'Poppins-SemiBold',
    color: '#15CAFF',
    marginHorizontal: WP(2),
    marginLeft: WP(-0.8),
  },
  blueLineIndicator: {
    marginHorizontal: WP(-0.6),
    marginTop: HP(-1),
    zIndex: 11,
  },
  taskLabel: {
    fontSize: FS(1.6),
    fontFamily: 'Orbitron-Bold',
    color: '#FBB03B',
    textTransform: 'uppercase',
    marginTop: HP(-2),
  },
  taskStatsContainer: {
    marginTop: HP(2.5),
    position: 'relative',
    width: WP(95),
    height: HP(14.5),
    alignSelf: 'center',
    marginLeft: WP(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskStatsImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  taskStatsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: WP(2),
    zIndex: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    marginRight: WP(4),
  },
  statLabel: {
    fontSize: FS(1.2),
    fontFamily: 'Europa-Grotesk-SH-Bold',
    color: '#999999',
    textAlign: 'center',
    marginBottom: HP(1),
  },
  statNumber: {
    fontSize: FS(4),
    fontFamily: 'Europa-Grotesk-SH-Bold',
    color: '#FFFFFF',
  },
});

export default AchievementScreen;
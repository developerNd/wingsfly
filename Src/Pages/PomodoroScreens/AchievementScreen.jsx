import React from 'react';
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
import {WP, HP, FS} from '../../utils/dimentions';
import {colors} from '../../Helper/Contants';
import {useRoute} from '@react-navigation/native';

import YouDidItBackground from '../../assets/Images/Achievement-screen/you-did-it-bttn.svg';
import TaskStatsBackground from '../../assets/Images/Achievement-screen/stats-background.svg';

// Individual SVG components for the progress circle
import OuterCircleSvg from '../../assets/Images/Achievement-screen/big-circle.svg';
import InnerCircleSvg from '../../assets/Images/Achievement-screen/inner-circle.svg';
import TopCurveSvg from '../../assets/Images/Achievement-screen/curve-line-left.svg';
import BottomCurveSvg from '../../assets/Images/Achievement-screen/curve-line-right.svg';
import CenterGrayLineSvg from '../../assets/Images/Achievement-screen/grey-line.svg';
import LeftGreenLineSvg from '../../assets/Images/Achievement-screen/green-curve.svg';
import GreenCircleSvg from '../../assets/Images/Achievement-screen/green-dot.svg';
import WalkingManIconSvg from '../../assets/Images/Achievement-screen/man-walk.svg';
import SittingManIconSvg from '../../assets/Images/Achievement-screen/man-sitting-icon.svg';
import ClockLineSvg from '../../assets/Images/Achievement-screen/thin-curve-line.svg';
import ClockLineSvg2 from '../../assets/Images/Achievement-screen/clock-line.svg';
import BlueLineSvg from '../../assets/Images/Achievement-screen/blue-line.svg';

const AchievementScreen = ({
  // Default props for fallback - keeping original prop structure
  userName = 'Harshit',
  onClose,
}) => {
  const route = useRoute();

  // FIXED: Enhanced data extraction from route params with proper fallbacks
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
  } = route.params || {};

  // FIXED: Calculate progress percentage based on total sessions (focus + breaks)
  const calculateProgress = () => {
    const totalSessions = totalPomodoros + totalBreaks;
    const completedSessions = completedPomodoros + completedBreaks;

    if (totalSessions === 0) return 100;
    return Math.round((completedSessions / totalSessions) * 100);
  };

  // FIXED: Format time display with proper conversion
  const formatTime = totalSeconds => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}H ${minutes}Min`;
    }
    return `${minutes}Min`;
  };

  // FIXED: Calculate comprehensive stats for original UI
  const getTaskStats = () => {
    // Calculate total expected tasks (focus sessions)
    const totalTasks = totalPomodoros;
    const completedTasks = completedPomodoros;

    // For incomplete tasks, we show remaining focus sessions
    const incompleteTasks = Math.max(0, totalTasks - completedTasks);

    // For complete tasks, we show what was actually completed
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#000829" barStyle="light-content" />

      <View style={styles.content}>
        {/* Header with user name */}
        <View style={styles.header}>
          <Text style={styles.userName}>{userName}</Text>
        </View>

        {/* You Did It Button with Background Image */}
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

        {/* Motivational Text */}
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

        {/* Center Progress with Individual SVG Components */}
        <View style={styles.progressContainer}>
          {/* Outer Circle SVG */}
          <OuterCircleSvg
            width={WP(85)}
            height={WP(85)}
            style={styles.outerCircle}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Inner Circle SVG */}
          <InnerCircleSvg
            width={WP(40)}
            height={WP(40)}
            style={styles.innerCircle}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Top Curve SVG */}
          <TopCurveSvg
            width={WP(53)}
            height={WP(54)}
            style={styles.topCurve}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Bottom Curve SVG */}
          <BottomCurveSvg
            width={WP(48)}
            height={WP(49)}
            style={styles.bottomCurve}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Center Gray Line SVG */}
          <CenterGrayLineSvg
            width={WP(3.7)}
            height={HP(0.6)}
            style={styles.centerGrayLine}
            preserveAspectRatio="none"
          />

          {/* Left Green Line SVG */}
          <LeftGreenLineSvg
            width={WP(19)}
            height={WP(24)}
            style={styles.leftGreenLine}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Green Circle SVG */}
          <GreenCircleSvg
            width={WP(9)}
            height={WP(10)}
            style={styles.greenCircle}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Walking Man Icon */}
          <WalkingManIconSvg
            width={WP(6.5)}
            height={WP(6.5)}
            style={styles.walkingManIcon}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Sitting Man Icon */}
          <SittingManIconSvg
            width={WP(7)}
            height={WP(7)}
            style={styles.sittingManIcon}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Original Clock Line SVG */}
          <ClockLineSvg
            width={WP(53)}
            height={HP(52)}
            style={styles.clockLine}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* NEW: Clock Line SVG - Sharp indicator at progress position */}
          <ClockLineSvg2
            width={WP(18)}
            height={WP(19.2)}
            style={styles.clockLineIndicator}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Center Content (Text) */}
          <View style={styles.centerContent}>
            <Text style={styles.percentageText}>{progress}%</Text>
            <Text style={styles.timeText}>{timeSpent}</Text>

            <View style={styles.taskInfo}>
              <View style={styles.taskCountContainer}>
                <Text style={styles.taskCount1}>{taskStats.completeTasks}</Text>
                {/* NEW: Blue Line SVG - Between the task count numbers */}
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

        {/* FIXED: Task Statistics with Enhanced Break Information */}
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

  // You Did It Button Styles
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
    textShadowColor: '#1CA8E8', // Same as text color for glow effect
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 15, // Slightly larger radius for more glow
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

  // Individual SVG Component Styles
  progressContainer: {
    marginVertical: HP(2),
    position: 'relative',
    width: WP(85),
    height: WP(85),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Outer Circle - Base layer
  outerCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },

  // Inner Circle - Inside the outer circle
  innerCircle: {
    position: 'absolute',
    top: WP(24.5),
    left: WP(24.5),
    zIndex: 2,
  },

  // Top Curve - Upper arc
  topCurve: {
    position: 'absolute',
    top: WP(37),
    left: WP(-7),
    zIndex: 3,
  },

  // Bottom Curve - Lower arc
  bottomCurve: {
    position: 'absolute',
    top: WP(41.2),
    left: WP(45),
    zIndex: 3,
  },

  // Center Gray Line - Between curves
  centerGrayLine: {
    position: 'absolute',
    top: HP(42.3),
    left: WP(43.5),
    transform: [{translateY: -HP(0.25)}],
    zIndex: 4,
  },

  // Left Green Line - Progress indicator
  leftGreenLine: {
    position: 'absolute',
    top: WP(40),
    left: WP(-8.4),
    zIndex: 5,
  },

  // Green Circle - On the green line end
  greenCircle: {
    position: 'absolute',
    top: WP(55),
    left: WP(-1),
    zIndex: 6,
  },

  // Walking Man Icon - Left side of curve
  walkingManIcon: {
    position: 'absolute',
    top: WP(35.7),
    left: WP(-3.2),
    zIndex: 6,
  },

  // Sitting Man Icon - Right side of curve
  sittingManIcon: {
    position: 'absolute',
    top: WP(36),
    right: WP(-6),
    zIndex: 6,
  },

  // Original Clock Line - Sharp indicator
  clockLine: {
    position: 'absolute',
    top: WP(-6),
    left: WP(-2.8),
    zIndex: 7,
  },

  // NEW: Clock Line Indicator - Sharp indicator at progress position (top area)
  clockLineIndicator: {
    position: 'absolute',
    top: WP(14.6), // Position at the top where progress would be
    left: WP(14.6), // Center horizontally
    zIndex: 8,
  },

  // Center Content - Text overlay
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: '56%',
    left: '48.5%',
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
    marginBottom: HP(6),
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

  // NEW: Blue Line Indicator - Between the task count numbers (10|10)
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

  // Task Stats Styles - KEEPING ORIGINAL LAYOUT
  taskStatsContainer: {
    marginTop: HP(5),
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

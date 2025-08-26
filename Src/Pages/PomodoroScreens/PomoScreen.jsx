import React, {useState} from 'react';
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

import TimerBackgroundSvg from '../../assets/Images/Pomodoro-screen/green-clock.svg';

// Task Section SVGs
import TotalTaskBackgroundSvg from '../../assets/Images/Pomodoro-screen/grey-bttn.svg';
import CompletedTaskBackgroundSvg from '../../assets/Images/Pomodoro-screen/grey-bttn.svg';

// Button SVGs
import SkipButtonSvg from '../../assets/Images/Pomodoro-screen/dark-grey-bttn.svg';
import EndButtonSvg from '../../assets/Images/Pomodoro-screen/dark-grey-bttn.svg';
import PlayButtonSvg from '../../assets/Images/Pomodoro-screen/dark-grey-bttn.svg';

// Tab Bar SVGs
import TabBarBackgroundSvg from '../../assets/Images/Pomodoro-screen/bottom-bg-section.svg';
// Tab Icons - Normal State
import Tab1NormalSvg from '../../assets/Images/Pomodoro-screen/home-bttn-normal.svg';
import Tab2NormalSvg from '../../assets/Images/Pomodoro-screen/chart-bttn-normal.svg';
import Tab3NormalSvg from '../../assets/Images/Pomodoro-screen/clock-bttn-normal.svg';
import Tab4NormalSvg from '../../assets/Images/Pomodoro-screen/setting-bttn-normal.svg';
import Tab5NormalSvg from '../../assets/Images/Pomodoro-screen/play-bttn-normal.svg';
// Tab Icons - Pressed State
import Tab1PressedSvg from '../../assets/Images/Pomodoro-screen/home-bttn-pressed.svg';
import Tab2PressedSvg from '../../assets/Images/Pomodoro-screen/chart-bttn-press.svg';
import Tab3PressedSvg from '../../assets/Images/Pomodoro-screen/clock-bttn-press.svg';
import Tab4PressedSvg from '../../assets/Images/Pomodoro-screen/setting-bttn-press.svg';
import Tab5PressedSvg from '../../assets/Images/Pomodoro-screen/play-bttn-press.svg';

const PomoScreen = ({
  timerMinutes = 30,
  totalTasks = 30,
  completedTasks = 5,
  onSkip,
  onEnd,
  onPlay,
  onTabPress,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabPress = tabIndex => {
    setActiveTab(tabIndex);
    onTabPress && onTabPress(tabIndex);
  };

  const TabIcon = ({index, NormalComponent, PressedComponent}) => {
    const IconComponent =
      activeTab === index ? PressedComponent : NormalComponent;
    return (
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handleTabPress(index)}
        activeOpacity={0.7}>
        <IconComponent
          width={WP(12)}
          height={WP(12)}
          style={styles.tabIcon}
          preserveAspectRatio="xMidYMid meet"
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#000000" barStyle="light-content" />

      <View style={styles.content}>
        {/* Top Timer Section with Green Glow Above */}
        <View style={styles.timerSection}>
          {/* Green Glow Above Timer */}
          <Image
            source={require('../../assets/Images/Pomodoro-screen/green-glow.png')}
            style={styles.greenGlowAbove}
            resizeMode="contain"
          />

          <View style={styles.timerContainer}>
            <TimerBackgroundSvg
              width={WP(70)}
              height={HP(32)}
              style={styles.timerBackground}
              preserveAspectRatio="none"
            />
            <View style={styles.timerOverlay}>
              <Text style={styles.timerText}>{timerMinutes}</Text>
              <Text style={styles.timerLabel}>min</Text>
            </View>
          </View>
        </View>

        {/* Task Section with Pomodoro Title in between */}
        <View style={styles.taskSection}>
          {/* Total Task */}
          <View style={styles.taskCard}>
            <TotalTaskBackgroundSvg
              width={WP(17)}
              height={HP(8.5)}
              style={styles.taskBackground}
              preserveAspectRatio="none"
            />
            <View style={styles.taskOverlay}>
              <Text style={styles.taskNumber}>{totalTasks}</Text>
            </View>
            <Text style={styles.taskLabel}>Total Task</Text>
          </View>

          {/* Pomodoro Title in Center */}
          <View style={styles.titleSection}>
            <Text style={styles.pomodoroTitle}>Pomodoro</Text>
          </View>

          {/* Completed Task */}
          <View style={styles.taskCard}>
            <CompletedTaskBackgroundSvg
              width={WP(17)}
              height={HP(8.5)}
              style={styles.taskBackground}
              preserveAspectRatio="none"
            />
            <View style={styles.taskOverlay}>
              <Text style={styles.taskNumber}>
                {completedTasks}/{totalTasks}
              </Text>
            </View>
            <Text style={styles.taskLabel}>Completed Task</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.button}
            onPress={onSkip}
            activeOpacity={0.8}>
            <SkipButtonSvg
              width={WP(18)}
              height={HP(9)}
              style={styles.buttonBackground}
              preserveAspectRatio="none"
            />
            <View style={styles.buttonOverlay}>
              <Text style={styles.buttonText}>Skip</Text>
            </View>
          </TouchableOpacity>

          {/* Play Button in Center */}
          <TouchableOpacity
            style={styles.playButton}
            onPress={onPlay}
            activeOpacity={0.8}>
            <PlayButtonSvg
              width={WP(25)}
              height={HP(12)}
              style={styles.buttonBackground}
              preserveAspectRatio="none"
            />
            <View style={styles.buttonOverlay}>
              <Text style={styles.playButtonText}>▶</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={onEnd}
            activeOpacity={0.8}>
            <EndButtonSvg
              width={WP(18)}
              height={HP(9)}
              style={styles.buttonBackground}
              preserveAspectRatio="none"
            />
            <View style={styles.buttonOverlay}>
              <Text style={styles.buttonText}>End</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Flower Area - Now with Lottie Animation */}
        <View style={styles.flowerArea}>
          <LottieView
            source={require('../../assets/animations/flower-video-30sec-v1.json')}
            style={styles.flowerAnimation}
            autoPlay
            loop
            speed={1}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Tab Bar with spacing */}
      <View style={styles.tabBarContainer}>
        <TabBarBackgroundSvg
          width={WP(100)}
          height={HP(12)}
          style={styles.tabBarBackground}
          preserveAspectRatio="none"
        />
        <View style={styles.tabBarOverlay}>
          <TabIcon
            index={0}
            NormalComponent={Tab1NormalSvg}
            PressedComponent={Tab1PressedSvg}
          />
          <TabIcon
            index={1}
            NormalComponent={Tab2NormalSvg}
            PressedComponent={Tab2PressedSvg}
          />
          <TabIcon
            index={2}
            NormalComponent={Tab3NormalSvg}
            PressedComponent={Tab3PressedSvg}
          />
          <TabIcon
            index={3}
            NormalComponent={Tab4NormalSvg}
            PressedComponent={Tab4PressedSvg}
          />
          <TabIcon
            index={4}
            NormalComponent={Tab5NormalSvg}
            PressedComponent={Tab5PressedSvg}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.Black,
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(3),
  },
  timerSection: {
    alignItems: 'center',
    marginTop: HP(1),
    marginBottom: HP(2),
  },
  greenGlowAbove: {
    width: WP(125),
    height: WP(110),
    position: 'absolute',
    top: HP(-10),
    zIndex: 0,
    opacity: 0.8,
  },
  timerContainer: {
    position: 'relative',
    width: WP(70),
    height: HP(32),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  timerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timerText: {
    fontSize: FS(7),
    fontFamily: 'Poppins-SemiBold',
    color: colors.White,
    textAlign: 'center',
  },
  timerLabel: {
    fontSize: FS(3.7),
    fontFamily: 'Europa-Grotesk-SH-Bold',
    color: colors.White,
    textAlign: 'center',
    marginTop: HP(-4.5),
  },
  taskSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: HP(2.5),
    paddingHorizontal: WP(4),
  },
  taskCard: {
    position: 'relative',
    width: WP(17),
    height: HP(8.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  taskOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: HP(2.5),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  taskNumber: {
    fontSize: FS(1.8),
    fontFamily: 'Poppins-SemiBold',
    color: colors.Black,
    textAlign: 'center',
    marginTop: WP(6),
  },
  taskLabel: {
    fontSize: FS(1.2),
    fontFamily: 'Poppins-SemiBold',
    color: '#B8FEFD',
    textAlign: 'center',
    position: 'absolute',
    bottom: HP(-2),
    marginLeft: WP(-4),
  },
  titleSection: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: WP(5),
  },
  pomodoroTitle: {
    fontSize: FS(3.7),
    fontFamily: 'Poppins-SemiBold',
    color: colors.White,
    textAlign: 'center',
  },
  buttonSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: HP(3),
    paddingHorizontal: WP(10),
  },
  button: {
    position: 'relative',
    width: WP(18),
    height: HP(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    position: 'relative',
    width: WP(25),
    height: HP(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
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
    fontSize: FS(2),
    fontFamily: 'Poppins-SemiBold',
    color: colors.White,
    textAlign: 'center',
  },
  playButtonText: {
    fontSize: FS(7),
    fontFamily: 'Europa-Grotesk-SH-Bold',
    color: colors.White,
    textAlign: 'center',
    marginLeft: WP(1.5),
  },
  flowerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: HP(2),
    marginBottom: HP(15.5),
  },
  flowerAnimation: {
    width: WP(90),
    height: WP(80),
    zIndex: 2,
  },
  tabBarContainer: {
    position: 'relative',
    width: WP(100),
    height: HP(12),
    alignSelf: 'center',
    marginTop: HP(2),
  },
  tabBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tabBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: WP(-1),
    paddingTop: HP(1),
    zIndex: 1,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});

export default PomoScreen;

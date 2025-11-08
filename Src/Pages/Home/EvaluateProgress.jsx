import React from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import Headers from '../../Components/Headers';
import {colors, Icons} from '../../Helper/Contants';
import {useNavigation, useRoute} from '@react-navigation/native';
import {HP, WP, FS} from '../../utils/dimentions';

const EvaluateProgress = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // FIXED: Extract fromNightMode from route params
  const {selectedCategory, type, fromNightMode} = route.params || {};

  const getProgressSteps = () => {
    if (type === 'Habit') {
      return 4;
    } else if (type === 'Recurring') {
      return 2;
    } else if (type === 'Task') {
      return 2;
    } else if (type === 'Plan') {
      return 2;
    }
    return 4;
  };

  // Function to render progress dots dynamically
  const renderProgressDots = () => {
    const totalSteps = getProgressSteps();
    const dots = [];

    for (let i = 1; i <= totalSteps; i++) {
      const isActive = i === 1;

      dots.push(
        <React.Fragment key={i}>
          <View
            style={
              isActive ? styles.progressDotActive : styles.progressDotInactive
            }>
            {isActive ? (
              <View style={styles.progressDotActiveInner}>
                <Text style={styles.progressDotTextActive}>{i}</Text>
              </View>
            ) : (
              <Text style={styles.progressDotTextInactive}>{i}</Text>
            )}
          </View>
          {i < totalSteps && <View style={styles.progressLine} />}
        </React.Fragment>,
      );
    }

    return dots;
  };

  const handleOptionPress = optionType => {
    // Base navigation data
    const navigationData = {
      selectedCategory,
      evaluationType: optionType,
      type,
    };

    // Only pass fromNightMode flag for Plan type
    if (type === 'Plan') {
      navigationData.fromNightMode = fromNightMode;
    }

    // Navigation flow based on type
    if (type === 'Habit') {
      switch (optionType) {
        case 'yesNo':
          navigation.navigate('YesorNoScreen', navigationData);
          break;
        case 'timer':
          navigation.navigate('TimerScreen', navigationData);
          break;
        case 'timerTracker':
          navigation.navigate('FrequencyScreen', navigationData);
          break;
        case 'checklist':
          navigation.navigate('ChecklistScreen', navigationData);
          break;
        case 'numeric':
          navigation.navigate('NumericScreen', navigationData);
          break;
        default:
          console.log('Unknown option type for Habit:', optionType);
      }
    } else if (type === 'Recurring') {
      switch (optionType) {
        case 'yesNo':
          navigation.navigate('RecurringYesorNoScreen', navigationData);
          break;
        case 'timer':
          navigation.navigate('RecurringTimerScreen', navigationData);
          break;
        case 'timerTracker':
          navigation.navigate('FrequencyScreen', navigationData);
          break;
        case 'checklist':
          navigation.navigate('RecurringChecklistScreen', navigationData);
          break;
        case 'numeric':
          navigation.navigate('RecurringNumericScreen', navigationData);
          break;
        default:
          console.log('Unknown option type for Recurring:', optionType);
      }
    } else if (type === 'Task') {
      switch (optionType) {
        case 'yesNo':
          navigation.navigate('TaskScreen', navigationData);
          break;
        case 'timer':
          navigation.navigate('TaskScreen', navigationData);
          break;
        case 'timerTracker':
          navigation.navigate('TimerTrackerScreen', navigationData);
          break;
        case 'checklist':
          navigation.navigate('TaskChecklistScreen', navigationData);
          break;
        case 'numeric':
          navigation.navigate('TaskScreen', navigationData);
          break;
        default:
          console.log('Unknown option type for Task:', optionType);
      }
    } else if (type === 'Plan') {
      // Special navigation for Plan Your Day task type
      switch (optionType) {
        case 'yesNo':
          navigation.navigate('PlanScreen', navigationData);
          break;
        case 'timer':
          navigation.navigate('PlanScreen', navigationData);
          break;
        case 'timerTracker':
          navigation.navigate('PlanTimerTrackerScreen', navigationData);
          break;
        case 'checklist':
          navigation.navigate('PlanChecklistScreen', navigationData);
          break;
        case 'numeric':
          // For Plan type, skip numeric option or handle differently
          console.log('Numeric option not available for Plan type');
          break;
        default:
          console.log('Unknown option type for Plan:', optionType);
      }
    } else {
      console.log('Unknown type:', type);
    }
  };

  // Function to render evaluation options based on type
  const renderEvaluationOptions = () => {
    const commonOptions = [
      {
        key: 'yesNo',
        title: 'Yes or No',
        description: 'Record whether you succeed with the activity or not',
        renderHeader: () => (
          <View style={styles.cardHeader}>
            <Text style={styles.withText}>With</Text>
            <Image source={Icons.Arrow} style={styles.arrowImage} />
            <Text style={styles.optionTitle}>Yes</Text>
            <Image source={Icons.Ring} style={styles.radioButtonImage} />
            <Text style={styles.orText}>or</Text>
            <Text style={styles.optionTitle}>No</Text>
            <Image source={Icons.Ring} style={styles.radioButtonImage} />
          </View>
        ),
      },
      {
        key: 'timer',
        title: 'Timer',
        description: 'Establish a value as a daily goal or limit for the habit',
        renderHeader: () => (
          <View style={styles.cardHeader}>
            <Text style={styles.withText}>With</Text>
            <Image source={Icons.Arrow} style={styles.arrowImage} />
            <Text style={styles.optionTitle}>Focus Session</Text>
            <Image source={Icons.Timer} style={styles.iconStyle} />
          </View>
        ),
      },
      {
        key: 'timerTracker',
        title: 'Timer Tracker',
        description: 'Track time-based activities with frequency settings',
        renderHeader: () => (
          <View style={styles.cardHeader}>
            <Text style={styles.withText}>With</Text>
            <Image source={Icons.Arrow} style={styles.arrowImage} />
            <Text style={styles.optionTitle}>Time Tracker</Text>
            <Image source={Icons.Timer} style={styles.iconStyle} />
          </View>
        ),
      },
      {
        key: 'checklist',
        title: 'Checklist',
        description: 'Evaluate your activity based on a set of sub-items',
        renderHeader: () => (
          <View style={styles.cardHeader}>
            <Text style={styles.withText}>With</Text>
            <Image source={Icons.Arrow} style={styles.arrowImage} />
            <Text style={styles.optionTitle}>Checklist</Text>
            <Image source={Icons.Check} style={styles.iconStyle} />
          </View>
        ),
      },
    ];

    // Only show numeric option if type is NOT 'Plan'
    if (type !== 'Plan') {
      commonOptions.push({
        key: 'numeric',
        title: 'Numeric Value',
        description:
          'Establish a time value as a daily goal or limit for the habit',
        renderHeader: () => (
          <View style={styles.cardHeader}>
            <Text style={styles.withText}>With</Text>
            <Image source={Icons.Arrow} style={styles.arrowImage} />
            <Text style={styles.optionTitle}>a Numeric Value</Text>
            <Image source={Icons.Numeric} style={styles.iconStyle} />
          </View>
        ),
      });
    }

    return commonOptions.map(option => (
      <React.Fragment key={option.key}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => handleOptionPress(option.key)}>
          {option.renderHeader()}
        </TouchableOpacity>
        <Text style={styles.cardDescription}>{option.description}</Text>
      </React.Fragment>
    ));
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
      <View style={styles.headerWrapper}>
        <Headers title="How do you want to evaluate your progress?">
          <Text style={styles.nextText}>Next</Text>
        </Headers>
      </View>

      <View style={styles.content}>{renderEvaluationOptions()}</View>

      {/* Dynamic Progress Indicator */}
      <View style={styles.progressIndicator}>{renderProgressDots()}</View>
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
  nextText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(4),
    paddingTop: HP(2.7),
  },
  optionCard: {
    backgroundColor: colors.White,
    borderRadius: WP(2),
    padding: WP(2),
    paddingVertical: HP(1.1),
    marginBottom: HP(1.8),
    elevation: 5,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.125),
    },
    shadowOpacity: 0.1,
    shadowRadius: WP(0.5),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(0.75),
  },
  withText: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Shadow,
    marginRight: WP(2.5),
    marginTop: HP(0.8),
    marginLeft: WP(4),
  },
  arrowImage: {
    width: WP(4.5),
    height: HP(1.5),
    marginRight: WP(2.5),
    marginTop: HP(0.8),
    resizeMode: 'contain',
  },
  optionTitle: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginRight: WP(2),
    marginTop: HP(0.8),
  },
  radioButtonImage: {
    width: WP(3),
    height: WP(3),
    marginRight: WP(2),
    marginTop: HP(1.05),
    resizeMode: 'contain',
  },
  orText: {
    fontSize: FS(2.1),
    color: colors.Black,
    fontFamily: 'OpenSans-SemiBold',
    marginRight: WP(2),
    marginTop: HP(0.8),
  },
  iconStyle: {
    width: WP(3),
    height: WP(3),
    marginLeft: WP(0.25),
    resizeMode: 'contain',
    marginTop: HP(1.1),
  },
  cardDescription: {
    fontSize: FS(1.6),
    color: colors.Black,
    fontFamily: 'OpenSans-Regular',
    marginHorizontal: WP(1.25),
    marginBottom: HP(2.3),
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(2.7),
  },
  progressDotActive: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.6),
    backgroundColor: colors.White,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: WP(0.68),
    borderColor: colors.Primary,
  },
  progressDotActiveInner: {
    width: WP(3.6),
    height: WP(3.6),
    borderRadius: WP(1.85),
    backgroundColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotTextActive: {
    color: colors.White,
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Bold',
  },
  progressDotInactive: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.65),
    backgroundColor: 'transparent',
    borderWidth: WP(0.5),
    borderColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotTextInactive: {
    color: colors.Primary,
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Bold',
  },
  progressLine: {
    width: WP(5.3),
    height: HP(0.16),
    marginLeft: WP(0.5),
    marginRight: WP(0.5),
    backgroundColor: colors.Primary,
  },
});

export default EvaluateProgress;

import React, {useState, useEffect, useCallback} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  Alert,
  Image,
  Animated,
  FlatList,
} from 'react-native';
import {
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import LinearGradientRN from 'react-native-linear-gradient';
import {HP, WP, FS} from '../../utils/dimentions';
import {taskCompletionsService} from '../../services/api/taskCompletionsService';
import {taskService} from '../../services/api/taskService';
import {planYourDayService} from '../../services/api/planYourDayService';
import {challengeService} from '../../services/api/challengeService';
import {useAuth} from '../../contexts/AuthContext';
import {shouldTaskAppearOnDate} from '../../utils/taskDateHelper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DatePickerModal from '../../Components/DatePickerModal';
import TaskSkeleton from '../../Components/TaskSkeleton';
import {colors, Icons} from '../../Helper/Contants';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const theme = {
  primary: colors.Primary || '#00D4FF',
  secondary: '#00C896',
  tertiary: '#FF6B6B',
  background: colors.White || '#FFFFFF',
  cardBackground: colors.White || '#FFFFFF',
  text: '#3B3B3B',
  textSecondary: '#5B5B5B',
  border: '#DBDBDB',
  shadow: colors.Shadow || '#000000',
  progressBackground: '#DBDBDB',
};

// Enhanced Circular Progress Component
const EnhancedCircularProgress = ({percentage, size = 100, strokeWidth = 6, color = theme.primary, value, label}) => {
  const [animatedValue] = useState(new Animated.Value(0));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    const valueAnimation = new Animated.Value(0);
    Animated.timing(valueAnimation, {
      toValue: value,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    const listener = valueAnimation.addListener(({value: animatedVal}) => {
      setDisplayValue(Math.round(animatedVal));
    });

    return () => {
      valueAnimation.removeListener(listener);
    };
  }, [percentage, value]);

  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.enhancedCircularContainer, {width: size, height: size}]}>
      <Svg width={size} height={size} style={{transform: [{rotate: '-90deg'}]}}>
        <Defs>
          <LinearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.7" />
          </LinearGradient>
        </Defs>
        
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.progressBackground}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#gradient-${color.replace('#', '')})`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      
      <View style={styles.enhancedCircularContent}>
        <Text style={[styles.enhancedCircularValue, {color}]}>{displayValue}</Text>
        <Text style={styles.enhancedCircularLabel}>{label}</Text>
      </View>
    </View>
  );
};

// Mini Chart Bar Component
const MiniChartBar = ({percentage, color, label}) => {
  const [animatedHeight] = useState(new Animated.Value(0));
  const bars = Array.from({length: 15}, (_, i) => i);

  useEffect(() => {
    Animated.stagger(50, 
      bars.map((_, index) => {
        const shouldAnimate = (index / 15) * 100 < percentage;
        return Animated.timing(animatedHeight, {
          toValue: shouldAnimate ? 1 : 0.3,
          duration: 800,
          delay: index * 30,
          useNativeDriver: false,
        });
      })
    ).start();
  }, [percentage]);

  return (
    <View style={styles.miniChartContainer}>
      <Text style={[styles.miniChartPercentage, {color}]}>{percentage}%</Text>
      
      <View style={styles.miniChartBars}>
        {bars.map((_, index) => {
          const shouldFill = (index / 15) * 100 < percentage;
          const heights = [25, 35, 20, 45, 30, 50, 25, 40, 35, 28, 42, 38, 32, 48, 26];
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.miniChartBar,
                {
                  height: heights[index],
                  backgroundColor: shouldFill ? color : theme.progressBackground,
                  opacity: animatedHeight,
                }
              ]}
            />
          );
        })}
      </View>
      
      <Text style={styles.miniChartLabel}>{label}</Text>
    </View>
  );
};

// Enhanced Stat Card Component
const EnhancedStatCard = ({title, value, percentage, color = theme.primary}) => (
  <View style={styles.enhancedStatCard}>
    <EnhancedCircularProgress
      percentage={percentage || 0}
      value={value}
      label={title}
      color={color}
      size={90}
      strokeWidth={5}
    />
  </View>
);

const TaskAnalyticsScreen = () => {
  const navigation = useNavigation();
  const {user} = useAuth();

  const [analyticsType, setAnalyticsType] = useState('tasks');

  const [analyticsData, setAnalyticsData] = useState({
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    totalAvailableTasks: 0,
    completionRate: 0,
    inProgressRate: 0,
    pendingRate: 0,
    currentStreak: 0,
    longestStreak: 0,
    dailyGoalsRate: 0,
    weeklyTargetsRate: 0,
  });

  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [isStartDatePickerVisible, setIsStartDatePickerVisible] = useState(false);
  const [isEndDatePickerVisible, setIsEndDatePickerVisible] = useState(false);

  const getDateRange = (timeframe) => {
    const now = new Date();
    let startDate, endDate;

    switch (timeframe) {
      case '3days':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 2);
        endDate = now;
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 29);
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        endDate = now;
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = customStartDate;
          endDate = customEndDate;
        } else {
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 6);
          endDate = now;
        }
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        endDate = now;
    }

    return {startDate, endDate};
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getDatesBetween = (startDate, endDate) => {
    const dates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(formatDate(new Date(currentDate)));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const hasProgress = (completion) => {
    if (!completion) return false;
    if (completion.is_completed === true) return false;
    
    // Check for checklist progress
    if (completion.checklist_completed_count && completion.checklist_completed_count > 0) {
      return true;
    }
    
    // Check for numeric progress
    if (completion.numeric_value && completion.numeric_value > 0) {
      return true;
    }
    
    // FIXED: Check for timer progress - handle both direct timer_value and nested structure
    // Direct timer_value (for simple timer tasks)
    if (completion.timer_value !== null && completion.timer_value !== undefined && completion.timer_value > 0) {
      return true;
    }
    
    // ADDED: Check nested timer_value structure (for timer tracker/pomodoro tasks)
    if (completion.timer_value && typeof completion.timer_value === 'object') {
      // Check if there's any completed time in the nested structure
      if (completion.timer_value.totalSeconds > 0 || 
          completion.timer_value.currentTime > 0 ||
          completion.timer_value.completedPomodoros > 0 ||
          completion.timer_value.completedBreaks > 0) {
        return true;
      }
    }
    
    return false;
  };

  const calculateStreaks = (completions, items, dateRange, type = 'tasks') => {
    const completionsByDate = {};
    completions.forEach(completion => {
      const date = completion.completion_date;
      if (!completionsByDate[date]) {
        completionsByDate[date] = [];
      }
      completionsByDate[date].push(completion);
    });

    const dailyCompletions = [];
    
    dateRange.forEach(date => {
      const dayCompletions = completionsByDate[date] || [];
      const dateObj = new Date(date + 'T00:00:00.000Z');
      const dateString = dateObj.toDateString();
      
      let itemsForDay = [];
      
      if (type === 'tasks') {
        itemsForDay = items.filter(task => {
          const formattedTask = {
            id: task.id,
            title: task.title,
            taskType: task.task_type,
            frequencyType: task.frequency_type,
            startDate: task.start_date,
            endDate: task.end_date,
            isEndDateEnabled: task.is_end_date_enabled,
            created_at: task.created_at,
            selectedWeekdays: task.selected_weekdays,
            selectedMonthDates: task.selected_month_dates,
            selectedYearDates: task.selected_year_dates,
            periodDays: task.period_days,
            periodType: task.period_type,
            isFlexible: task.is_flexible,
            isMonthFlexible: task.is_month_flexible,
            isYearFlexible: task.is_year_flexible,
            useDayOfWeek: task.use_day_of_week,
            isRepeatFlexible: task.is_repeat_flexible,
            isRepeatAlternateDays: task.is_repeat_alternate_days,
            everyDays: task.every_days,
            activityDays: task.activity_days,
            restDays: task.rest_days,
          };
          return shouldTaskAppearOnDate(formattedTask, dateString);
        });
      } else if (type === 'plans') {
        itemsForDay = items.filter(plan => {
          const planStartDate = new Date(plan.start_date).toISOString().split('T')[0];
          const planEndDate = plan.end_date ? new Date(plan.end_date).toISOString().split('T')[0] : planStartDate;
          return date >= planStartDate && date <= planEndDate;
        });
      } else if (type === 'challenges') {
        itemsForDay = items.filter(challenge => {
          const challengeStartDate = new Date(challenge.start_date).toISOString().split('T')[0];
          const challengeEndDate = new Date(challenge.end_date).toISOString().split('T')[0];
          return date >= challengeStartDate && date <= challengeEndDate;
        });
      }
      
      let completedCount = 0;
      let totalItemsForDay = itemsForDay.length;
      
      itemsForDay.forEach(item => {
        const completion = dayCompletions.find(c => c.task_id === item.id);
        if (completion && completion.is_completed === true) {
          completedCount++;
        }
      });
      
      const completionRate = totalItemsForDay > 0 ? completedCount / totalItemsForDay : 0;
      const isFullyCompleted = totalItemsForDay > 0 && completedCount === totalItemsForDay;
      
      dailyCompletions.push({
        date,
        completedCount,
        totalItemsForDay,
        completionRate,
        isFullyCompleted,
      });
    });

    let currentStreak = 0;
    for (let i = dailyCompletions.length - 1; i >= 0; i--) {
      if (dailyCompletions[i].isFullyCompleted) {
        currentStreak++;
      } else {
        break;
      }
    }

    let longestStreak = 0;
    let tempStreak = 0;
    
    dailyCompletions.forEach(day => {
      if (day.isFullyCompleted) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    return { currentStreak, longestStreak };
  };

  const processTaskAnalytics = (completions, tasks, dateRange) => {
    let totalAvailableTaskSlots = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let pendingTasks = 0;

    const completionMap = {};
    completions.forEach(completion => {
      const key = `${completion.task_id}-${completion.completion_date}`;
      completionMap[key] = completion;
    });

    dateRange.forEach(date => {
      const dateObj = new Date(date + 'T00:00:00.000Z');
      const dateString = dateObj.toDateString();
      
      const activeTasks = tasks.filter(task => {
        const formattedTask = {
          id: task.id,
          title: task.title,
          taskType: task.task_type,
          frequencyType: task.frequency_type,
          startDate: task.start_date,
          endDate: task.end_date,
          isEndDateEnabled: task.is_end_date_enabled,
          created_at: task.created_at,
          selectedWeekdays: task.selected_weekdays,
          selectedMonthDates: task.selected_month_dates,
          selectedYearDates: task.selected_year_dates,
          periodDays: task.period_days,
          periodType: task.period_type,
          isFlexible: task.is_flexible,
          isMonthFlexible: task.is_month_flexible,
          isYearFlexible: task.is_year_flexible,
          useDayOfWeek: task.use_day_of_week,
          isRepeatFlexible: task.is_repeat_flexible,
          isRepeatAlternateDays: task.is_repeat_alternate_days,
          everyDays: task.every_days,
          activityDays: task.activity_days,
          restDays: task.rest_days,
        };
        return shouldTaskAppearOnDate(formattedTask, dateString);
      });
      
      activeTasks.forEach(task => {
        totalAvailableTaskSlots++;
        const completionKey = `${task.id}-${date}`;
        const completion = completionMap[completionKey];
        
        if (completion) {
          if (completion.is_completed === true) {
            completedTasks++;
          } else if (hasProgress(completion)) {
            inProgressTasks++;
          } else {
            pendingTasks++;
          }
        } else {
          pendingTasks++;
        }
      });
    });

    const completionRate = totalAvailableTaskSlots > 0 ? Math.round((completedTasks / totalAvailableTaskSlots) * 100) : 0;
    const inProgressRate = totalAvailableTaskSlots > 0 ? Math.round((inProgressTasks / totalAvailableTaskSlots) * 100) : 0;
    const pendingRate = totalAvailableTaskSlots > 0 ? Math.round((pendingTasks / totalAvailableTaskSlots) * 100) : 0;

    const streakData = calculateStreaks(completions, tasks, dateRange, 'tasks');
    
    const daysDiff = dateRange.length;
    const avgCompletionsPerDay = completedTasks / daysDiff;
    const avgTasksPerDay = totalAvailableTaskSlots / daysDiff;
    const dailyGoalsRate = avgTasksPerDay > 0 ? Math.min(100, Math.round((avgCompletionsPerDay / avgTasksPerDay) * 100)) : 0;
    const weeklyTargetsRate = completionRate;

    return {
      completedTasks,
      inProgressTasks,
      pendingTasks,
      totalAvailableTasks: totalAvailableTaskSlots,
      completionRate,
      inProgressRate,
      pendingRate,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      dailyGoalsRate,
      weeklyTargetsRate,
    };
  };

  const processPlanYourDayAnalytics = (completions, plans, dateRange) => {
    const planIds = plans.map(plan => plan.id);
    const planCompletions = completions.filter(c => planIds.includes(c.task_id));

    let totalAvailablePlanSlots = 0;
    let completedPlans = 0;
    let inProgressPlans = 0;
    let pendingPlans = 0;

    const completionMap = {};
    planCompletions.forEach(completion => {
      const key = `${completion.task_id}-${completion.completion_date}`;
      completionMap[key] = completion;
    });

    dateRange.forEach(date => {
      const activePlans = plans.filter(plan => {
        const planStartDate = new Date(plan.start_date).toISOString().split('T')[0];
        const planEndDate = plan.end_date ? new Date(plan.end_date).toISOString().split('T')[0] : planStartDate;
        return date >= planStartDate && date <= planEndDate;
      });
      
      activePlans.forEach(plan => {
        totalAvailablePlanSlots++;
        const completionKey = `${plan.id}-${date}`;
        const completion = completionMap[completionKey];
        
        if (completion) {
          if (completion.is_completed === true) {
            completedPlans++;
          } else if (hasProgress(completion)) {
            inProgressPlans++;
          } else {
            pendingPlans++;
          }
        } else {
          pendingPlans++;
        }
      });
    });

    const completionRate = totalAvailablePlanSlots > 0 ? Math.round((completedPlans / totalAvailablePlanSlots) * 100) : 0;
    const inProgressRate = totalAvailablePlanSlots > 0 ? Math.round((inProgressPlans / totalAvailablePlanSlots) * 100) : 0;
    const pendingRate = totalAvailablePlanSlots > 0 ? Math.round((pendingPlans / totalAvailablePlanSlots) * 100) : 0;

    const streakData = calculateStreaks(planCompletions, plans, dateRange, 'plans');
    
    const daysDiff = dateRange.length;
    const avgCompletionsPerDay = completedPlans / daysDiff;
    const avgPlansPerDay = totalAvailablePlanSlots / daysDiff;
    const dailyGoalsRate = avgPlansPerDay > 0 ? Math.min(100, Math.round((avgCompletionsPerDay / avgPlansPerDay) * 100)) : 0;
    const weeklyTargetsRate = completionRate;

    return {
      completedTasks: completedPlans,
      inProgressTasks: inProgressPlans,
      pendingTasks: pendingPlans,
      totalAvailableTasks: totalAvailablePlanSlots,
      completionRate,
      inProgressRate,
      pendingRate,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      dailyGoalsRate,
      weeklyTargetsRate,
    };
  };

  const processChallengeAnalytics = async (challenges, dateRange) => {
    let totalChallenges = 0;
    let completedChallenges = 0;
    let inProgressChallenges = 0;
    let pendingChallenges = 0;

    for (const challenge of challenges) {
      const challengeStartDate = new Date(challenge.start_date).toISOString().split('T')[0];
      const challengeEndDate = new Date(challenge.end_date).toISOString().split('T')[0];
      
      const isInDateRange = dateRange.some(date => date >= challengeStartDate && date <= challengeEndDate);
      
      if (!isInDateRange) continue;

      totalChallenges++;

      const completedDays = await challengeService.getCompletedDays(challenge.id, user.id);
      const completedDaysCount = Object.keys(completedDays).length;
      const totalDays = challenge.number_of_days;

      if (completedDaysCount === 0) {
        pendingChallenges++;
      } else if (completedDaysCount >= totalDays) {
        completedChallenges++;
      } else {
        inProgressChallenges++;
      }
    }

    const completionRate = totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0;
    const inProgressRate = totalChallenges > 0 ? Math.round((inProgressChallenges / totalChallenges) * 100) : 0;
    const pendingRate = totalChallenges > 0 ? Math.round((pendingChallenges / totalChallenges) * 100) : 0;

    const streakData = await calculateChallengeStreaks(challenges, dateRange);

    const dailyGoalsRate = completionRate;
    const weeklyTargetsRate = completionRate;

    return {
      completedTasks: completedChallenges,
      inProgressTasks: inProgressChallenges,
      pendingTasks: pendingChallenges,
      totalAvailableTasks: totalChallenges,
      completionRate,
      inProgressRate,
      pendingRate,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      dailyGoalsRate,
      weeklyTargetsRate,
    };
  };

  const calculateChallengeStreaks = async (challenges, dateRange) => {
    const dailyCompletions = [];

    for (const date of dateRange) {
      const activeChallenges = challenges.filter(challenge => {
        const challengeStartDate = new Date(challenge.start_date).toISOString().split('T')[0];
        const challengeEndDate = new Date(challenge.end_date).toISOString().split('T')[0];
        return date >= challengeStartDate && date <= challengeEndDate;
      });

      if (activeChallenges.length === 0) {
        dailyCompletions.push({ date, isFullyCompleted: false });
        continue;
      }

      let allChallengesCompleted = true;

      for (const challenge of activeChallenges) {
        const completedDays = await challengeService.getCompletedDays(challenge.id, user.id);
        
        const challengeStart = new Date(challenge.start_date);
        const currentDate = new Date(date);
        const daysDiff = Math.floor((currentDate - challengeStart) / (1000 * 60 * 60 * 24)) + 1;

        if (daysDiff > 0 && daysDiff <= challenge.number_of_days) {
          if (!completedDays[daysDiff]) {
            allChallengesCompleted = false;
            break;
          }
        }
      }

      dailyCompletions.push({
        date,
        isFullyCompleted: allChallengesCompleted && activeChallenges.length > 0,
      });
    }

    let currentStreak = 0;
    for (let i = dailyCompletions.length - 1; i >= 0; i--) {
      if (dailyCompletions[i].isFullyCompleted) {
        currentStreak++;
      } else {
        break;
      }
    }

    let longestStreak = 0;
    let tempStreak = 0;
    dailyCompletions.forEach(day => {
      if (day.isFullyCompleted) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    return { currentStreak, longestStreak };
  };

  const fetchAnalyticsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const {startDate, endDate} = getDateRange(selectedTimeframe);
      const dateRange = getDatesBetween(startDate, endDate);

      if (analyticsType === 'tasks') {
        const [completions, userTasks] = await Promise.all([
          taskCompletionsService.getTaskCompletionsForDateRange(
            user.id,
            formatDate(startDate),
            formatDate(endDate)
          ),
          taskService.getTasks(user.id)
        ]);

        const analytics = processTaskAnalytics(completions, userTasks, dateRange);
        setAnalyticsData(analytics);
      } else if (analyticsType === 'plans') {
        const [completions, plans] = await Promise.all([
          taskCompletionsService.getTaskCompletionsForDateRange(
            user.id,
            formatDate(startDate),
            formatDate(endDate)
          ),
          planYourDayService.getPlanYourDayEntries(user.id)
        ]);

        const analytics = processPlanYourDayAnalytics(completions, plans, dateRange);
        setAnalyticsData(analytics);
      } else if (analyticsType === 'challenges') {
        const challenges = await challengeService.getChallenges(user.id);
        const analytics = await processChallengeAnalytics(challenges, dateRange);
        setAnalyticsData(analytics);
      }

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  }, [selectedTimeframe, customStartDate, customEndDate, analyticsType]);

  useFocusEffect(
    useCallback(() => {
      fetchAnalyticsData();
    }, [selectedTimeframe, customStartDate, customEndDate, analyticsType])
  );

  const handleStartDateSelect = (date) => {
    setCustomStartDate(date);
    if (customEndDate && date > customEndDate) {
      setCustomEndDate(null);
    }
  };

  const handleEndDateSelect = (date) => {
    setCustomEndDate(date);
  };

  const handleTimeframeSelect = (timeframe) => {
    if (timeframe !== 'custom') {
      setCustomStartDate(null);
      setCustomEndDate(null);
    }
    setSelectedTimeframe(timeframe);
  };

  const formatDisplayDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAnalyticsTitle = () => {
    switch (analyticsType) {
      case 'tasks':
        return 'Task Analytics';
      case 'plans':
        return 'Plan Your Day Analytics';
      case 'challenges':
        return 'Challenge Analytics';
      default:
        return 'Analytics';
    }
  };

  const getAnalyticsSubtitle = () => {
    switch (analyticsType) {
      case 'tasks':
        return 'Track your task completion insights';
      case 'plans':
        return 'Monitor your daily planning performance';
      case 'challenges':
        return 'View your challenge progress overview';
      default:
        return 'Track your productivity insights';
    }
  };

  const renderAnalyticsTypeSelector = () => (
    <View style={styles.analyticsTypeContainer}>
      <TouchableOpacity
        style={[
          styles.analyticsTypeButton,
          analyticsType === 'tasks' && styles.analyticsTypeButtonActive,
        ]}
        onPress={() => setAnalyticsType('tasks')}
      >
        <MaterialIcons 
          name="check-circle" 
          size={WP(5)} 
          color={analyticsType === 'tasks' ? theme.background : theme.textSecondary} 
        />
        <Text
          style={[
            styles.analyticsTypeText,
            analyticsType === 'tasks' && styles.analyticsTypeTextActive,
          ]}
        >
          Tasks
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.analyticsTypeButton,
          analyticsType === 'plans' && styles.analyticsTypeButtonActive,
        ]}
        onPress={() => setAnalyticsType('plans')}
      >
        <MaterialIcons 
          name="event-note" 
          size={WP(5)} 
          color={analyticsType === 'plans' ? theme.background : theme.textSecondary} 
        />
        <Text
          style={[
            styles.analyticsTypeText,
            analyticsType === 'plans' && styles.analyticsTypeTextActive,
          ]}
        >
          Plans
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.analyticsTypeButton,
          analyticsType === 'challenges' && styles.analyticsTypeButtonActive,
        ]}
        onPress={() => setAnalyticsType('challenges')}
      >
        <MaterialIcons 
          name="emoji-events" 
          size={WP(5)} 
          color={analyticsType === 'challenges' ? theme.background : theme.textSecondary} 
        />
        <Text
          style={[
            styles.analyticsTypeText,
            analyticsType === 'challenges' && styles.analyticsTypeTextActive,
          ]}
        >
          Challenges
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTimeframeSelector = () => (
    <View style={styles.timeframeContainer}>
      {['3days', 'week', 'month', 'year', 'custom'].map((timeframe) => (
        <TouchableOpacity
          key={timeframe}
          style={[
            styles.timeframeButton,
            selectedTimeframe === timeframe && styles.timeframeButtonActive,
          ]}
          onPress={() => handleTimeframeSelect(timeframe)}
        >
          <Text
            style={[
              styles.timeframeText,
              selectedTimeframe === timeframe && styles.timeframeTextActive,
            ]}
          >
            {timeframe === '3days' 
              ? '3 Days' 
              : timeframe === 'custom'
              ? 'Custom'
              : timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCustomDateSelector = () => {
    if (selectedTimeframe !== 'custom') return null;

    return (
      <View style={styles.customDateContainer}>
        <Text style={styles.customDateTitle}>Select Date Range</Text>
        
        <View style={styles.dateSelectorsRow}>
          <TouchableOpacity
            style={[
              styles.dateSelector,
              !customStartDate && styles.dateSelectorEmpty
            ]}
            onPress={() => setIsStartDatePickerVisible(true)}
          >
            <Image source={Icons.Calendar} style={styles.iconImage} />
            <Text style={[
              styles.dateSelectorText,
              !customStartDate && styles.dateSelectorTextEmpty
            ]}>
              {customStartDate ? formatDisplayDate(customStartDate) : 'Start Date'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dateRangeSeparator}>
            <MaterialIcons name="arrow-forward" size={WP(4)} color={theme.textSecondary} />
          </View>

          <TouchableOpacity
            style={[
              styles.dateSelector,
              !customEndDate && styles.dateSelectorEmpty
            ]}
            onPress={() => setIsEndDatePickerVisible(true)}
          >
            <Image source={Icons.Calendar} style={styles.iconImage} />
            <Text style={[
              styles.dateSelectorText,
              !customEndDate && styles.dateSelectorTextEmpty
            ]}>
              {customEndDate ? formatDisplayDate(customEndDate) : 'End Date'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={theme.background} barStyle="dark-content" />

        <View style={styles.headerWrapper}>
          <Text style={styles.headerTitle}>{getAnalyticsTitle()}</Text>
          <Text style={styles.headerSubtitle}>{getAnalyticsSubtitle()}</Text>
        </View>

        <View style={styles.content}>
          {renderAnalyticsTypeSelector()}
          {renderTimeframeSelector()}
          {renderCustomDateSelector()}

          <FlatList
            data={[1, 2, 3, 4, 5, 6, 7, 8]}
            keyExtractor={(item, index) => `skeleton-${index}`}
            renderItem={() => <TaskSkeleton />}
            contentContainerStyle={{marginTop: HP(0.7)}}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={theme.background} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Text style={styles.headerTitle}>{getAnalyticsTitle()}</Text>
        <Text style={styles.headerSubtitle}>{getAnalyticsSubtitle()}</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {renderAnalyticsTypeSelector()}
        {renderTimeframeSelector()}
        {renderCustomDateSelector()}

        <View style={styles.circularMetricsGrid}>
          <EnhancedStatCard
            title="Completed"
            value={analyticsData.completedTasks}
            percentage={analyticsData.completionRate}
            color={theme.secondary}
          />
          <EnhancedStatCard
            title="In Progress"
            value={analyticsData.inProgressTasks}
            percentage={analyticsData.inProgressRate}
            color={theme.primary}
          />
          <EnhancedStatCard
            title="Pending"
            value={analyticsData.pendingTasks}
            percentage={analyticsData.pendingRate}
            color={theme.tertiary}
          />
        </View>

        <View style={styles.miniChartsGrid}>
          <View style={styles.miniChartCard}>
            <MiniChartBar
              percentage={analyticsData.completionRate}
              color={theme.secondary}
              label="Overall Completion Rate"
            />
          </View>
          
          <View style={styles.miniChartCard}>
            <MiniChartBar
              percentage={analyticsData.dailyGoalsRate}
              color={theme.primary}
              label="Daily Goals Achievement"
            />
          </View>
          
          <View style={styles.miniChartCard}>
            <MiniChartBar
              percentage={analyticsData.weeklyTargetsRate}
              color={theme.tertiary}
              label="Performance Overview"
            />
          </View>
        </View>

        <View style={styles.streakContainer}>
          <View style={styles.streakCard}>
            <MaterialIcons name="local-fire-department" size={WP(8)} color={theme.primary} />
            <Text style={styles.streakValue}>{analyticsData.currentStreak}</Text>
            <Text style={styles.streakLabel}>Current Streak Days</Text>
          </View>
          
          <View style={styles.streakCard}>
            <MaterialIcons name="emoji-events" size={WP(8)} color={theme.secondary} />
            <Text style={styles.streakValue}>{analyticsData.longestStreak}</Text>
            <Text style={styles.streakLabel}>Best Streak Days</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <DatePickerModal
        visible={isStartDatePickerVisible}
        onClose={() => setIsStartDatePickerVisible(false)}
        onDateSelect={handleStartDateSelect}
        initialDate={customStartDate || new Date()}
        title="Select Start Date"
        maxDate={customEndDate || new Date()}
      />

      <DatePickerModal
        visible={isEndDatePickerVisible}
        onClose={() => setIsEndDatePickerVisible(false)}
        onDateSelect={handleEndDateSelect}
        initialDate={customEndDate || new Date()}
        title="Select End Date"
        minDate={customStartDate || undefined}
        maxDate={new Date()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  headerWrapper: {
    paddingTop: HP(3),
    paddingBottom: HP(2),
    paddingHorizontal: WP(4),
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  headerTitle: {
    fontSize: FS(2.5),
    fontFamily: 'OpenSans-Bold',
    color: theme.text,
    marginBottom: HP(0.5),
  },
  headerSubtitle: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: theme.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(4),
    backgroundColor: theme.background,
  },
  analyticsTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: WP(3),
    padding: WP(1),
    marginBottom: HP(2),
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.1,
    shadowRadius: WP(1),
  },
  analyticsTypeButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: HP(1.2),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: WP(2),
    gap: WP(1.5),
  },
  analyticsTypeButtonActive: {
    backgroundColor: theme.primary,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.2,
    shadowRadius: WP(1),
  },
  analyticsTypeText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: theme.textSecondary,
  },
  analyticsTypeTextActive: {
    color: theme.background,
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: WP(3),
    padding: WP(1),
    marginVertical: HP(2),
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.1,
    shadowRadius: WP(1),
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: HP(1.2),
    alignItems: 'center',
    borderRadius: WP(2),
  },
  timeframeButtonActive: {
    backgroundColor: theme.primary,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.2,
    shadowRadius: WP(1),
  },
  timeframeText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: theme.textSecondary,
  },
  timeframeTextActive: {
    color: theme.background,
  },
  circularMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: HP(3),
  },
  enhancedStatCard: {
    width: '31%',
    backgroundColor: theme.cardBackground,
    borderRadius: WP(4),
    padding: WP(3),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: HP(15),
    maxHeight: HP(17),
    elevation: 3,
    shadowColor: theme.shadow,
    shadowOffset: {width: 0, height: HP(0.5)},
    shadowOpacity: 0.1,
    shadowRadius: WP(1.5),
  },
  enhancedCircularContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enhancedCircularContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  enhancedCircularValue: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    marginBottom: HP(0.2),
  },
  enhancedCircularLabel: {
    fontSize: FS(0.8),
    fontFamily: 'OpenSans-Medium',
    color: theme.textSecondary,
    textAlign: 'center',
    paddingHorizontal: WP(1),
    lineHeight: FS(0.9),
  },
  miniChartsGrid: {
    marginBottom: HP(3),
  },
  miniChartCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: WP(4),
    padding: WP(4),
    marginBottom: HP(2),
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 3,
    shadowColor: theme.shadow,
    shadowOffset: {width: 0, height: HP(0.5)},
    shadowOpacity: 0.1,
    shadowRadius: WP(1.5),
  },
  miniChartContainer: {
    alignItems: 'center',
  },
  iconImage: {
    width: WP(5.5),
    height: WP(5.5),
    tintColor: '#4F4F4F',
    resizeMode: 'contain',
  },
  miniChartPercentage: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    marginBottom: HP(1.5),
  },
  miniChartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: HP(6),
    marginBottom: HP(1.5),
  },
  miniChartBar: {
    width: WP(2),
    borderRadius: WP(0.5),
    marginHorizontal: WP(0.2),
    minHeight: HP(1),
  },
  miniChartLabel: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Medium',
    color: theme.textSecondary,
    textAlign: 'center',
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: HP(3),
  },
  streakCard: {
    width: '48%',
    backgroundColor: theme.cardBackground,
    borderRadius: WP(4),
    padding: WP(4),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 3,
    shadowColor: theme.shadow,
    shadowOffset: {width: 0, height: HP(0.5)},
    shadowOpacity: 0.1,
    shadowRadius: WP(1.5),
  },
  streakValue: {
    fontSize: FS(2.8),
    fontFamily: 'OpenSans-Bold',
    color: theme.text,
    marginVertical: HP(1),
  },
  streakLabel: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Medium',
    color: theme.textSecondary,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: HP(3),
  },
  customDateContainer: {
    backgroundColor: theme.cardBackground,
    borderRadius: WP(4),
    padding: WP(4),
    marginHorizontal: WP(0),
    marginBottom: HP(3),
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.1,
    shadowRadius: WP(1),
  },
  customDateTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: theme.text,
    textAlign: 'center',
    marginBottom: HP(2),
  },
  dateSelectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: WP(3),
    padding: WP(3),
    borderWidth: 1,
    borderColor: theme.border,
  },
  dateSelectorEmpty: {
    backgroundColor: '#FAFBFC',
    borderStyle: 'dashed',
  },
  dateSelectorText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: theme.text,
    marginLeft: WP(2),
    flex: 1,
  },
  dateSelectorTextEmpty: {
    color: theme.textSecondary,
    fontFamily: 'OpenSans-SemiBold',
  },
  dateRangeSeparator: {
    marginHorizontal: WP(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TaskAnalyticsScreen;
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
import {HP, WP, FS} from '../../../utils/dimentions';
import {taskCompletionsService} from '../../../services/api/taskCompletionsService';
import {taskService} from '../../../services/api/taskService';
import {useAuth} from '../../../contexts/AuthContext';
import {shouldTaskAppearOnDate} from '../../../utils/taskDateHelper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DatePickerModal from '../../../Components/DatePickerModal';
import TaskSkeleton from '../../../Components/TaskSkeleton';
import {colors, Icons} from '../../../Helper/Contants';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

// Updated theme to match Home screen
const theme = {
  primary: colors.Primary || '#00D4FF', // Using app's primary color
  secondary: '#00C896', // Complementary green
  tertiary: '#FF6B6B', // Accent red
  background: colors.White || '#FFFFFF',
  cardBackground: colors.White || '#FFFFFF',
  text: '#3B3B3B', // Matching Home screen text color
  textSecondary: '#5B5B5B', // Matching Home screen secondary text
  border: '#DBDBDB', // Light border color
  shadow: colors.Shadow || '#000000',
  progressBackground: '#DBDBDB', // Matching progress bar background
};

// Enhanced Circular Progress Component with light theme
const EnhancedCircularProgress = ({percentage, size = 100, strokeWidth = 6, color = theme.primary, value, label}) => {
  const [animatedValue] = useState(new Animated.Value(0));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Animate the progress circle
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    // Animate the display value separately to match the actual value
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

// Mini Chart Bar Component with light theme
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

// Enhanced Stat Card Component with light theme
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
  
  // Custom date range states
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
        // Use custom date range if both dates are selected
        if (customStartDate && customEndDate) {
          startDate = customStartDate;
          endDate = customEndDate;
        } else {
          // Default to last 7 days if custom dates not set
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

  // Get all dates in the selected range
  const getDatesBetween = (startDate, endDate) => {
    const dates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(formatDate(new Date(currentDate)));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // Determine if a task completion shows progress
  const hasProgress = (completion) => {
    if (!completion) return false;
    
    if (completion.is_completed === true) return false;
    
    return (
      (completion.checklist_completed_count && completion.checklist_completed_count > 0) ||
      (completion.numeric_value && completion.numeric_value > 0) ||
      (completion.timer_value && completion.timer_value > 0)
    );
  };

  // Streak calculation function
  const calculateStreaks = (completions, tasks, dateRange) => {
    console.log('=== CALCULATING STREAKS ===');
    console.log('Date range:', dateRange);
    console.log('Total completions:', completions.length);
    console.log('Total tasks:', tasks.length);

    // Group completions by date
    const completionsByDate = {};
    completions.forEach(completion => {
      const date = completion.completion_date;
      if (!completionsByDate[date]) {
        completionsByDate[date] = [];
      }
      completionsByDate[date].push(completion);
    });

    console.log('Completions by date:', Object.keys(completionsByDate));

    // Calculate daily completion rates for each date in range
    const dailyCompletions = [];
    
    dateRange.forEach(date => {
      console.log(`\n--- Analyzing ${date} for streaks ---`);
      
      const dayCompletions = completionsByDate[date] || [];
      console.log(`Completions found for ${date}:`, dayCompletions.length);
      
      const dateObj = new Date(date + 'T00:00:00.000Z');
      const dateString = dateObj.toDateString();
      
      const tasksForDay = tasks.filter(task => {
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
      
      console.log(`Tasks active for ${date}:`, tasksForDay.length);
      if (tasksForDay.length > 0) {
        console.log('Active task titles:', tasksForDay.map(t => t.title));
      }
      
      let completedCount = 0;
      let totalTasksForDay = tasksForDay.length;
      
      tasksForDay.forEach(task => {
        const completion = dayCompletions.find(c => c.task_id === task.id);
        console.log(`Task "${task.title}" (${task.id}):`, completion ? `completed: ${completion.is_completed}` : 'no completion record');
        
        if (completion && completion.is_completed === true) {
          completedCount++;
          console.log(`  -> COMPLETED (${completedCount}/${totalTasksForDay})`);
        }
      });
      
      const completionRate = totalTasksForDay > 0 ? completedCount / totalTasksForDay : 0;
      const isFullyCompleted = totalTasksForDay > 0 && completedCount === totalTasksForDay;
      
      console.log(`${date} summary:`);
      console.log(`  - Completed: ${completedCount}/${totalTasksForDay}`);
      console.log(`  - Completion rate: ${(completionRate * 100).toFixed(1)}%`);
      console.log(`  - Fully completed day: ${isFullyCompleted}`);
      
      dailyCompletions.push({
        date,
        completedCount,
        totalTasksForDay,
        completionRate,
        isFullyCompleted,
      });
    });

    console.log('\n=== DAILY COMPLETION SUMMARY ===');
    dailyCompletions.forEach(day => {
      console.log(`${day.date}: ${day.completedCount}/${day.totalTasksForDay} tasks (${day.isFullyCompleted ? 'STREAK DAY' : 'not complete'})`);
    });

    // Calculate current streak (from most recent date backwards)
    let currentStreak = 0;
    console.log('\n=== CALCULATING CURRENT STREAK ===');
    for (let i = dailyCompletions.length - 1; i >= 0; i--) {
      const day = dailyCompletions[i];
      console.log(`Checking ${day.date}: ${day.isFullyCompleted ? 'COMPLETE' : 'INCOMPLETE'}`);
      
      if (day.isFullyCompleted) {
        currentStreak++;
        console.log(`  -> Current streak: ${currentStreak}`);
      } else {
        console.log(`  -> Streak broken at ${day.date}`);
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    
    console.log('\n=== CALCULATING LONGEST STREAK ===');
    dailyCompletions.forEach(day => {
      if (day.isFullyCompleted) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
        console.log(`${day.date}: extending streak to ${tempStreak} (longest so far: ${longestStreak})`);
      } else {
        if (tempStreak > 0) {
          console.log(`${day.date}: streak reset from ${tempStreak} to 0`);
        }
        tempStreak = 0;
      }
    });

    console.log('\n=== STREAK RESULTS ===');
    console.log(`Current streak: ${currentStreak} days`);
    console.log(`Longest streak: ${longestStreak} days`);
    console.log('========================');

    return { currentStreak, longestStreak };
  };

  const fetchAnalyticsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const {startDate, endDate} = getDateRange(selectedTimeframe);
      const dateRange = getDatesBetween(startDate, endDate);

      const [completions, userTasks] = await Promise.all([
        taskCompletionsService.getTaskCompletionsForDateRange(
          user.id,
          formatDate(startDate),
          formatDate(endDate)
        ),
        taskService.getTasks(user.id)
      ]);

      const analytics = processAnalyticsData(completions, userTasks, dateRange);
      setAnalyticsData(analytics);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (completions, tasks, dateRange) => {
    console.log('=== PROCESSING ANALYTICS ===');
    console.log('Completions received:', completions.length);
    console.log('Tasks received:', tasks.length);
    console.log('Date range:', dateRange);

    let totalAvailableTaskSlots = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let pendingTasks = 0;

    const completionMap = {};
    completions.forEach(completion => {
      const key = `${completion.task_id}-${completion.completion_date}`;
      completionMap[key] = completion;
      console.log(`Mapped completion: ${key} -> completed: ${completion.is_completed}`);
    });

    console.log('Completion map keys:', Object.keys(completionMap));

    dateRange.forEach(date => {
      console.log(`\n--- Processing date: ${date} ---`);
      
      const dateObj = new Date(date + 'T00:00:00.000Z');
      const dateString = dateObj.toDateString();
      console.log(`Date converted: ${date} -> ${dateString}`);
      
      const activeTasks = tasks.filter(task => {
        console.log(`\nDebugging task "${task.title}" (using raw DB fields):`);
        
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
        
        console.log(`  - taskType: ${formattedTask.taskType}`);
        console.log(`  - frequencyType: ${formattedTask.frequencyType}`);
        console.log(`  - startDate: ${formattedTask.startDate}`);
        console.log(`  - created_at: ${formattedTask.created_at}`);
        console.log(`  - endDate: ${formattedTask.endDate}`);
        console.log(`  - isEndDateEnabled: ${formattedTask.isEndDateEnabled}`);
        
        const shouldAppear = shouldTaskAppearOnDate(formattedTask, dateString);
        console.log(`  -> Should appear on ${dateString}: ${shouldAppear}`);
        return shouldAppear;
      });
      
      console.log(`Active tasks for ${date}:`, activeTasks.length);
      
      activeTasks.forEach(task => {
        totalAvailableTaskSlots++;
        const completionKey = `${task.id}-${date}`;
        const completion = completionMap[completionKey];
        
        console.log(`Checking task ${task.id} (${task.title}) for ${date}:`);
        console.log(`  - Completion key: ${completionKey}`);
        console.log(`  - Has completion: ${!!completion}`);
        
        if (completion) {
          console.log(`  - is_completed: ${completion.is_completed}`);
          console.log(`  - checklist_completed_count: ${completion.checklist_completed_count}`);
          console.log(`  - numeric_value: ${completion.numeric_value}`);
          console.log(`  - timer_value: ${completion.timer_value}`);
          
          if (completion.is_completed === true) {
            completedTasks++;
            console.log(`  -> COMPLETED`);
          } else if (hasProgress(completion)) {
            inProgressTasks++;
            console.log(`  -> IN PROGRESS`);
          } else {
            pendingTasks++;
            console.log(`  -> PENDING (has completion but no progress)`);
          }
        } else {
          pendingTasks++;
          console.log(`  -> PENDING (no completion record)`);
        }
      });
    });

    const completionRate = totalAvailableTaskSlots > 0 ? Math.round((completedTasks / totalAvailableTaskSlots) * 100) : 0;
    const inProgressRate = totalAvailableTaskSlots > 0 ? Math.round((inProgressTasks / totalAvailableTaskSlots) * 100) : 0;
    const pendingRate = totalAvailableTaskSlots > 0 ? Math.round((pendingTasks / totalAvailableTaskSlots) * 100) : 0;

    const streakData = calculateStreaks(completions, tasks, dateRange);
    
    const daysDiff = dateRange.length;
    const avgCompletionsPerDay = completedTasks / daysDiff;
    const avgTasksPerDay = totalAvailableTaskSlots / daysDiff;
    const dailyGoalsRate = avgTasksPerDay > 0 ? Math.min(100, Math.round((avgCompletionsPerDay / avgTasksPerDay) * 100)) : 0;
    
    const weeklyTargetsRate = completionRate;

    const result = {
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

    console.log('=== FINAL ANALYTICS RESULT ===');
    console.log('Total available task slots:', totalAvailableTaskSlots);
    console.log('Completed tasks:', completedTasks);
    console.log('In progress tasks:', inProgressTasks);
    console.log('Pending tasks:', pendingTasks);
    console.log('Completion rate:', completionRate + '%');
    console.log('In progress rate:', inProgressRate + '%');
    console.log('Pending rate:', pendingRate + '%');
    console.log('Current streak:', streakData.currentStreak);
    console.log('Longest streak:', streakData.longestStreak);
    console.log('================================');

    return result;
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  }, [selectedTimeframe, customStartDate, customEndDate]);

  useFocusEffect(
    useCallback(() => {
      fetchAnalyticsData();
    }, [selectedTimeframe, customStartDate, customEndDate])
  );

  // Handle custom date selection
  const handleStartDateSelect = (date) => {
    setCustomStartDate(date);
    // If end date is earlier than start date, reset it
    if (customEndDate && date > customEndDate) {
      setCustomEndDate(null);
    }
  };

  const handleEndDateSelect = (date) => {
    setCustomEndDate(date);
  };

  // Reset custom dates when switching away from custom timeframe
  const handleTimeframeSelect = (timeframe) => {
    if (timeframe !== 'custom') {
      setCustomStartDate(null);
      setCustomEndDate(null);
    }
    setSelectedTimeframe(timeframe);
  };

  // Format date for display
  const formatDisplayDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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

        {/* Header */}
        <View style={styles.headerWrapper}>
          <Text style={styles.headerTitle}>Task Analytics</Text>
          <Text style={styles.headerSubtitle}>Track your productivity insights</Text>
        </View>

        <View style={styles.content}>
          {/* Timeframe Selector */}
          {renderTimeframeSelector()}

          {/* Custom Date Selector */}
          {renderCustomDateSelector()}

          {/* TaskSkeleton Loading */}
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

      {/* Header */}
      <View style={styles.headerWrapper}>
        <Text style={styles.headerTitle}>Task Analytics</Text>
        <Text style={styles.headerSubtitle}>Track your productivity insights</Text>
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
        {/* Timeframe Selector */}
        {renderTimeframeSelector()}

        {/* Custom Date Selector */}
        {renderCustomDateSelector()}

        {/* Main Circular Progress Metrics */}
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

        {/* Mini Bar Charts */}
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

        {/* Streaks Section */}
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

      {/* Date Picker Modals */}
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
  // Custom date selector styles
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
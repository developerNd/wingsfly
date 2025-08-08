import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  NativeModules,
  Switch,
  Image,
} from 'react-native';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';

const AppUsageScreen = () => {
  const [usageStats, setUsageStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [showSystemApps, setShowSystemApps] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState('daily'); // daily, weekly

  const {AppUsageModule} = NativeModules;

  useEffect(() => {
    checkPermissionAndLoadData();
  }, []);

  useEffect(() => {
    if (hasPermission) {
      loadUsageData();
    }
  }, [currentPeriod, showSystemApps]);

  const checkPermissionAndLoadData = async () => {
    try {
      if (Platform.OS !== 'android') {
        setError('This feature is only available on Android devices.');
        setLoading(false);
        return;
      }

      if (!AppUsageModule) {
        setError('AppUsageModule not found. Please rebuild the app.');
        setLoading(false);
        return;
      }

      // Check if we have usage stats permission
      const permissionGranted = await AppUsageModule.checkUsageStatsPermission();
      setHasPermission(permissionGranted);
      
      if (permissionGranted) {
        await loadUsageData();
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error checking permission:', err);
      setError(`Failed to check permission: ${err.message}`);
      setLoading(false);
    }
  };

  const removeDuplicateApps = (apps) => {
    const uniqueApps = [];
    const seen = new Set();
    
    apps.forEach(app => {
      if (!seen.has(app.packageName)) {
        seen.add(app.packageName);
        uniqueApps.push(app);
      }
    });
    
    return uniqueApps;
  };

  const loadUsageData = async () => {
    try {
      setLoading(true);
      setError(null);

      let stats;
      if (currentPeriod === 'daily') {
        stats = await AppUsageModule.getDailyUsageStats();
      } else {
        stats = await AppUsageModule.getWeeklyUsageStats();
      }

      // Filter out system apps if needed
      let filteredStats = stats;
      if (!showSystemApps) {
        filteredStats = stats.filter(app => !app.isSystemApp);
      }

      // Only show apps with meaningful usage time (more than 10 seconds)
      filteredStats = filteredStats.filter(app => app.totalTimeInForeground > 10000);

      // Remove duplicate apps to prevent key conflicts
      filteredStats = removeDuplicateApps(filteredStats);

      setUsageStats(filteredStats);
    } catch (err) {
      console.error('Error loading usage data:', err);
      setError(`Failed to load usage data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      await AppUsageModule.requestUsageStatsPermission();
      
      // Show instructions to user
      Alert.alert(
        'Permission Required',
        'Please enable "Usage access" for WingsFly in the settings that just opened. Then return to the app.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Check permission again after user returns
              setTimeout(() => {
                checkPermissionAndLoadData();
              }, 1000);
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert('Error', `Failed to open settings: ${err.message}`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsageData();
    setRefreshing(false);
  };

  const togglePeriod = () => {
    setCurrentPeriod(prev => prev === 'daily' ? 'weekly' : 'daily');
  };

  const handleAppPress = async (app) => {
    try {
      const events = await AppUsageModule.getAppUsageEvents(app.packageName);
      
      Alert.alert(
        app.appName,
        `Package: ${app.packageName}\n` +
        `Usage Time: ${app.formattedDuration}\n` +
        `Last Used: ${app.formattedLastUsed}\n` +
        `Events Today: ${events.length}`,
        [
          {text: 'OK', style: 'default'},
          {
            text: 'View Events',
            style: 'default',
            onPress: () => showAppEvents(app, events),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', `Failed to get app events: ${err.message}`);
    }
  };

  const showAppEvents = (app, events) => {
    if (events.length === 0) {
      Alert.alert('No Events', `No usage events found for ${app.appName} today.`);
      return;
    }

    const eventSummary = events.slice(0, 5).map((event, index) => 
      `${index + 1}. ${event.eventType} at ${event.formattedTime}`
    ).join('\n');

    Alert.alert(
      `${app.appName} Events`,
      `Recent events (showing ${Math.min(5, events.length)} of ${events.length}):\n\n${eventSummary}`,
      [{text: 'OK'}]
    );
  };

  const getUsageColor = (timeInMs) => {
    const hours = timeInMs / (1000 * 60 * 60);
    if (hours > 3) return '#FF6B6B'; // Red for heavy usage
    if (hours > 1) return '#FFB74D'; // Orange for moderate usage
    return '#81C784'; // Green for light usage
  };

  // Generate consistent colors for app names (fallback)
  const getAppColor = (appName) => {
    const appColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
      '#FF8A80', '#80CBC4', '#81C784', '#FFB74D',
      '#F06292', '#BA68C8', '#64B5F6', '#4DB6AC'
    ];
    
    let hash = 0;
    for (let i = 0; i < appName.length; i++) {
      hash = appName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return appColors[Math.abs(hash) % appColors.length];
  };

  const AppIcon = ({item, index}) => {
    const [imageLoadError, setImageLoadError] = useState(false);

    if (item.iconBase64 && !imageLoadError) {
      return (
        <Image 
          source={{uri: `data:image/png;base64,${item.iconBase64}`}}
          style={styles.appIconImage}
          onError={() => {
            console.warn(`Failed to load icon for ${item.appName}`);
            setImageLoadError(true);
          }}
          resizeMode="cover"
        />
      );
    }

    // Fallback to rank number with colored background
    return (
      <View style={[styles.rankContainer, {backgroundColor: getAppColor(item.appName) + '20'}]}>
        <Text style={[styles.rankText, {color: getAppColor(item.appName)}]}>
          {index + 1}
        </Text>
      </View>
    );
  };

  const renderUsageItem = ({item, index}) => {
    return (
      <TouchableOpacity
        style={styles.usageItem}
        onPress={() => handleAppPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <AppIcon item={item} index={index} />
        </View>
        
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>
            {item.appName}
          </Text>
          <Text style={styles.packageName} numberOfLines={1}>
            {item.packageName}
          </Text>
          {item.isSystemApp && (
            <Text style={styles.systemLabel}>System App</Text>
          )}
        </View>
        
        <View style={styles.usageInfo}>
          <Text style={[styles.usageTime, {color: getUsageColor(item.totalTimeInForeground)}]}>
            {item.formattedDuration}
          </Text>
          <Text style={styles.lastUsed} numberOfLines={1}>
            {item.formattedLastUsed}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="App Usage Monitor" />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.Primary} />
          <Text style={styles.loadingText}>Loading usage data...</Text>
        </View>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="App Usage Monitor" />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.permissionTitle}>Permission Required</Text>
          <Text style={styles.permissionText}>
            To monitor app usage, this app needs access to usage statistics.
            This permission allows tracking which apps you use and for how long.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <Text style={styles.permissionNote}>
            Note: You'll be redirected to Settings where you need to enable
            "Usage access" for WingsFly.
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="App Usage Monitor" />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={checkPermissionAndLoadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
      
      <View style={styles.headerWrapper}>
        <Headers title="App Usage Monitor">
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* Period Toggle */}
        <View style={styles.periodToggle}>
          <TouchableOpacity 
            style={[styles.periodButton, currentPeriod === 'daily' && styles.activePeriodButton]}
            onPress={() => setCurrentPeriod('daily')}
          >
            <Text style={[styles.periodButtonText, currentPeriod === 'daily' && styles.activePeriodText]}>
              Daily
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.periodButton, currentPeriod === 'weekly' && styles.activePeriodButton]}
            onPress={() => setCurrentPeriod('weekly')}
          >
            <Text style={[styles.periodButtonText, currentPeriod === 'weekly' && styles.activePeriodText]}>
              Weekly
            </Text>
          </TouchableOpacity>
        </View>

        {/* System Apps Toggle */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Show System Apps</Text>
          <Switch
            value={showSystemApps}
            onValueChange={setShowSystemApps}
            trackColor={{false: colors.Shadow + '30', true: colors.Primary + '50'}}
            thumbColor={showSystemApps ? colors.Primary : colors.White}
          />
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {currentPeriod === 'daily' ? 'Today' : 'This Week'}: {usageStats.length} apps used
        </Text>
        {usageStats.length > 0 && (
          <Text style={styles.summarySubText}>
            Top app: {usageStats[0].appName} ({usageStats[0].formattedDuration})
          </Text>
        )}
      </View>

      {/* Usage List */}
      {usageStats.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            No app usage data found for the selected period.
          </Text>
          <Text style={styles.emptySubText}>
            Try using some apps and then refresh this screen.
          </Text>
        </View>
      ) : (
        <FlatList
          data={usageStats}
          renderItem={renderUsageItem}
          keyExtractor={(item, index) => `${item.packageName}_${index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.Primary]}
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={8}
          initialNumToRender={10}
        />
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
    marginTop: HP(2.2),
    paddingBottom: HP(0.25),
  },
  refreshText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
  controlsContainer: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(1),
    backgroundColor: colors.White,
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.Shadow + '10',
    borderRadius: WP(2),
    padding: WP(1),
    marginBottom: HP(1),
  },
  periodButton: {
    flex: 1,
    paddingVertical: HP(1),
    alignItems: 'center',
    borderRadius: WP(1.5),
  },
  activePeriodButton: {
    backgroundColor: colors.Primary,
  },
  periodButtonText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
  },
  activePeriodText: {
    color: colors.White,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: WP(4),
  },
  toggleLabel: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: colors.Black,
  },
  summaryContainer: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.5),
    backgroundColor: colors.Primary + '05',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.Shadow + '20',
  },
  summaryText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    marginBottom: HP(0.3),
  },
  summarySubText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
  },
  listContainer: {
    paddingHorizontal: WP(4),
    paddingTop: HP(1),
    paddingBottom: HP(2),
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(2),
    minHeight: HP(7),
  },
  iconContainer: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(2),
    marginRight: WP(3),
    overflow: 'hidden',
  },
  appIconImage: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(2),
  },
  rankContainer: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(2),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.Primary + '15',
  },
  rankText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
  },
  appInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  appName: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Medium',
    color: colors.Black,
    marginBottom: HP(0.2),
  },
  packageName: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    opacity: 0.7,
    marginBottom: HP(0.2),
  },
  systemLabel: {
    fontSize: FS(0.9),
    fontFamily: 'OpenSans-Regular',
    color: colors.Primary,
    backgroundColor: colors.Primary + '15',
    paddingHorizontal: WP(1.5),
    paddingVertical: HP(0.1),
    borderRadius: WP(0.8),
    alignSelf: 'flex-start',
  },
  usageInfo: {
    alignItems: 'flex-end',
    minWidth: WP(20),
  },
  usageTime: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    marginBottom: HP(0.2),
  },
  lastUsed: {
    fontSize: FS(1.0),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    opacity: 0.7,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(4),
  },
  loadingText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    marginTop: HP(2),
  },
  permissionTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginBottom: HP(2),
    textAlign: 'center',
  },
  permissionText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    textAlign: 'center',
    lineHeight: FS(2),
    marginBottom: HP(3),
    paddingHorizontal: WP(2),
  },
  permissionButton: {
    backgroundColor: colors.Primary,
    paddingHorizontal: WP(8),
    paddingVertical: HP(2),
    borderRadius: WP(3),
    marginBottom: HP(2),
  },
  permissionButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
  },
  permissionNote: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    textAlign: 'center',
    opacity: 0.8,
    paddingHorizontal: WP(4),
  },
  errorText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    textAlign: 'center',
    marginBottom: HP(3),
    lineHeight: FS(2.2),
  },
  retryButton: {
    backgroundColor: colors.Primary,
    paddingHorizontal: WP(6),
    paddingVertical: HP(1.5),
    borderRadius: WP(2),
  },
  retryButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
  },
  emptyText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Medium',
    color: colors.Black,
    textAlign: 'center',
    marginBottom: HP(1),
  },
  emptySubText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default AppUsageScreen;
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

const RunningAppsScreen = () => {
  const [runningApps, setRunningApps] = useState([]);
  const [foregroundApp, setForegroundApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [showSystemApps, setShowSystemApps] = useState(false);
  const [viewMode, setViewMode] = useState('simple'); 

  const {RunningAppsModule} = NativeModules;

  useEffect(() => {
    checkPermissionAndLoadData();
  }, []);

  useEffect(() => {
    if (hasPermission) {
      loadRunningApps();
    }
  }, [showSystemApps, viewMode]);

  const checkPermissionAndLoadData = async () => {
    try {
      if (Platform.OS !== 'android') {
        setError('This feature is only available on Android devices.');
        setLoading(false);
        return;
      }

      if (!RunningAppsModule) {
        setError('RunningAppsModule not found. Please rebuild the app.');
        setLoading(false);
        return;
      }

      // Check if we have usage stats permission
      const permissionGranted = await RunningAppsModule.checkUsageStatsPermission();
      setHasPermission(permissionGranted);
      
      if (permissionGranted) {
        await loadRunningApps();
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error checking permission:', err);
      setError(`Failed to check permission: ${err.message}`);
      setLoading(false);
    }
  };

  const loadRunningApps = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load running apps and foreground app in parallel
      const [apps, foreground] = await Promise.all([
        viewMode === 'detailed' 
          ? RunningAppsModule.getDetailedRunningApps()
          : RunningAppsModule.getRunningApps(),
        RunningAppsModule.getForegroundApp().catch(() => null)
      ]);

      // Filter and deduplicate running apps
      let filteredApps = apps || [];
      
      if (viewMode === 'simple') {
        // Filter out system apps if needed
        if (!showSystemApps) {
          filteredApps = filteredApps.filter(app => !app.isSystemApp);
        }
        
        // Remove duplicates based on packageName
        const uniqueApps = [];
        const seenPackages = new Set();
        
        filteredApps.forEach((app, index) => {
          if (app && app.packageName && !seenPackages.has(app.packageName)) {
            seenPackages.add(app.packageName);
            // Add a unique identifier for React keys
            uniqueApps.push({
              ...app,
              uniqueId: `${app.packageName}-${Date.now()}-${index}`
            });
          }
        });
        
        filteredApps = uniqueApps;
      } else {
        // For detailed view, ensure each process has unique identifiers
        filteredApps = filteredApps.map((process, index) => ({
          ...process,
          uniqueId: `${process.processName || 'unknown'}-${process.pid || index}-${Date.now()}-${index}`
        }));
      }

      setRunningApps(filteredApps);
      setForegroundApp(foreground);

    } catch (err) {
      console.error('Error loading running apps:', err);
      setError(`Failed to load running apps: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      await RunningAppsModule.requestUsageStatsPermission();
      
      Alert.alert(
        'Permission Required',
        'Please enable "Usage access" for WingsFly in the settings that just opened. Then return to the app.',
        [
          {
            text: 'OK',
            onPress: () => {
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
    await loadRunningApps();
    setRefreshing(false);
  };

  const handleAppPress = (app) => {
    if (viewMode === 'detailed') {
      // Show process details
      const packages = app.packages || [];
      const packageNames = packages.map(p => p.appName || p.packageName).join(', ');
      
      Alert.alert(
        'Process Details',
        `Process: ${app.processName}\n` +
        `PID: ${app.pid}\n` +
        `UID: ${app.uid}\n` +
        `Importance: ${app.importance}\n` +
        `Packages: ${packageNames}`,
        [{text: 'OK'}]
      );
    } else {
      // Show app details
      Alert.alert(
        app.appName,
        `Package: ${app.packageName}\n` +
        `Recently Active: ${app.isRecentlyActive ? 'Yes' : 'No'}\n` +
        `Running Process: ${app.isRunningProcess ? 'Yes' : 'No'}\n` +
        `System App: ${app.isSystemApp ? 'Yes' : 'No'}`,
        [{text: 'OK'}]
      );
    }
  };

  const getStatusColor = (app) => {
    if (viewMode === 'detailed') {
      switch (app.importance) {
        case 'FOREGROUND': return '#4CAF50';
        case 'VISIBLE': return '#8BC34A';
        case 'FOREGROUND_SERVICE': return '#FF9800';
        case 'SERVICE': return '#FFC107';
        case 'BACKGROUND': return '#9E9E9E';
        default: return '#757575';
      }
    } else {
      if (app.isRecentlyActive && app.isRunningProcess) return '#4CAF50';
      if (app.isRecentlyActive) return '#8BC34A';
      if (app.isRunningProcess) return '#FF9800';
      return '#9E9E9E';
    }
  };

  const getStatusText = (app) => {
    if (viewMode === 'detailed') {
      return app.importance || 'UNKNOWN';
    } else {
      if (app.isRecentlyActive && app.isRunningProcess) return 'Active & Running';
      if (app.isRecentlyActive) return 'Recently Active';
      if (app.isRunningProcess) return 'Running Process';
      return 'Background';
    }
  };

  const AppIcon = ({item, index}) => {
    const [imageLoadError, setImageLoadError] = useState(false);

    if (item.iconBase64 && !imageLoadError) {
      return (
        <Image 
          source={{uri: `data:image/png;base64,${item.iconBase64}`}}
          style={styles.appIconImage}
          onError={() => {
            console.warn(`Failed to load icon for ${item.appName || item.processName}`);
            setImageLoadError(true);
          }}
          resizeMode="cover"
        />
      );
    }

    // Fallback to colored circle with first letter
    const name = item.appName || item.processName || 'App';
    const firstLetter = name.charAt(0).toUpperCase();
    const backgroundColor = getStatusColor(item);

    return (
      <View style={[styles.iconFallback, {backgroundColor: backgroundColor + '30'}]}>
        <Text style={[styles.iconText, {color: backgroundColor}]}>
          {firstLetter}
        </Text>
      </View>
    );
  };

  const renderSimpleApp = ({item, index}) => {
    const isForeground = foregroundApp && foregroundApp.packageName === item.packageName;
    
    return (
      <TouchableOpacity
        style={[styles.appItem, isForeground && styles.foregroundApp]}
        onPress={() => handleAppPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <AppIcon item={item} index={index} />
          {isForeground && (
            <View style={styles.foregroundBadge}>
              <Text style={styles.foregroundBadgeText}>•</Text>
            </View>
          )}
        </View>
        
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>
            {item.appName}
          </Text>
          <Text style={styles.packageName} numberOfLines={1}>
            {item.packageName}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, {backgroundColor: getStatusColor(item)}]} />
            <Text style={styles.statusText}>
              {getStatusText(item)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailedProcess = ({item, index}) => {
    const packages = item.packages || [];
    const hasMultiplePackages = packages.length > 1;
    
    return (
      <TouchableOpacity
        style={styles.processItem}
        onPress={() => handleAppPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.processHeader}>
          <View style={styles.processInfo}>
            <Text style={styles.processName} numberOfLines={1}>
              {item.processName}
            </Text>
            <Text style={styles.processDetails}>
              PID: {item.pid} • UID: {item.uid}
            </Text>
          </View>
          
          <View style={styles.importanceContainer}>
            <View style={[styles.importanceDot, {backgroundColor: getStatusColor(item)}]} />
            <Text style={[styles.importanceText, {color: getStatusColor(item)}]}>
              {item.importance}
            </Text>
          </View>
        </View>

        {packages.length > 0 && (
          <View style={styles.packagesContainer}>
            <Text style={styles.packagesLabel}>
              {hasMultiplePackages ? `${packages.length} packages:` : 'Package:'}
            </Text>
            {packages.slice(0, 3).map((pkg, idx) => (
              <View key={`${item.uniqueId}-pkg-${idx}-${pkg.packageName || idx}`} style={styles.packageItem}>
                <AppIcon item={pkg} index={idx} />
                <Text style={styles.packageNameSmall} numberOfLines={1}>
                  {pkg.appName || pkg.packageName}
                </Text>
              </View>
            ))}
            {packages.length > 3 && (
              <Text style={styles.morePackages}>
                +{packages.length - 3} more
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderItem = ({item, index}) => {
    return viewMode === 'detailed' 
      ? renderDetailedProcess({item, index})
      : renderSimpleApp({item, index});
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Running Apps" />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.Primary} />
          <Text style={styles.loadingText}>Loading running apps...</Text>
        </View>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Running Apps" />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.permissionTitle}>Permission Required</Text>
          <Text style={styles.permissionText}>
            To view running apps, this app needs access to usage statistics.
            This helps identify which apps are currently active or running.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Running Apps" />
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
        <Headers title="Running Apps">
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Foreground App Banner */}
      {foregroundApp && viewMode === 'simple' && (
        <View style={styles.foregroundBanner}>
          <View style={styles.foregroundInfo}>
            <AppIcon item={foregroundApp} index={0} />
            <View style={styles.foregroundText}>
              <Text style={styles.foregroundTitle}>Current Foreground App</Text>
              <Text style={styles.foregroundAppName}>{foregroundApp.appName}</Text>
            </View>
          </View>
          <View style={styles.liveDot} />
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* View Mode Toggle */}
        <View style={styles.viewModeToggle}>
          <TouchableOpacity 
            style={[styles.modeButton, viewMode === 'simple' && styles.activeModeButton]}
            onPress={() => setViewMode('simple')}
          >
            <Text style={[styles.modeButtonText, viewMode === 'simple' && styles.activeModeText]}>
              Apps
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeButton, viewMode === 'detailed' && styles.activeModeButton]}
            onPress={() => setViewMode('detailed')}
          >
            <Text style={[styles.modeButtonText, viewMode === 'detailed' && styles.activeModeText]}>
              Processes
            </Text>
          </TouchableOpacity>
        </View>

        {/* System Apps Toggle (only for simple view) */}
        {viewMode === 'simple' && (
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Show System Apps</Text>
            <Switch
              value={showSystemApps}
              onValueChange={setShowSystemApps}
              trackColor={{false: colors.Shadow + '30', true: colors.Primary + '50'}}
              thumbColor={showSystemApps ? colors.Primary : colors.White}
            />
          </View>
        )}
      </View>

      {/* Stats Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {viewMode === 'detailed' 
            ? `${runningApps.length} running processes`
            : `${runningApps.length} running apps`
          }
        </Text>
        {viewMode === 'simple' && foregroundApp && (
          <Text style={styles.summarySubText}>
            Foreground: {foregroundApp.appName}
          </Text>
        )}
      </View>

      {/* Running Apps List */}
      {runningApps.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            No running apps detected.
          </Text>
          <Text style={styles.emptySubText}>
            Try refreshing or check if permissions are properly granted.
          </Text>
        </View>
      ) : (
        <FlatList
          data={runningApps}
          renderItem={renderItem}
          keyExtractor={(item, index) => {
            // Use the uniqueId we added in loadRunningApps
            if (item.uniqueId) {
              return item.uniqueId;
            }
            
            // Fallback key generation
            if (viewMode === 'detailed') {
              return `process-${item.processName || 'unknown'}-${item.pid || index}-${index}`;
            } else {
              return `app-${item.packageName || 'unknown'}-${index}`;
            }
          }}
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
          maxToRenderPerBatch={20}
          windowSize={10}
          initialNumToRender={15}
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
  foregroundBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.5),
    backgroundColor: colors.Primary + '10',
    borderBottomWidth: 1,
    borderBottomColor: colors.Primary + '20',
  },
  foregroundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foregroundText: {
    marginLeft: WP(3),
  },
  foregroundTitle: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Medium',
    color: colors.Primary,
  },
  foregroundAppName: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
  },
  liveDot: {
    width: WP(2),
    height: WP(2),
    borderRadius: WP(1),
    backgroundColor: '#4CAF50',
  },
  controlsContainer: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(1),
    backgroundColor: colors.White,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.Shadow + '10',
    borderRadius: WP(2),
    padding: WP(1),
    marginBottom: HP(1),
  },
  modeButton: {
    flex: 1,
    paddingVertical: HP(1),
    alignItems: 'center',
    borderRadius: WP(1.5),
  },
  activeModeButton: {
    backgroundColor: colors.Primary,
  },
  modeButtonText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
  },
  activeModeText: {
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
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(2),
    minHeight: HP(7),
    borderRadius: WP(1),
    marginVertical: HP(0.25),
  },
  foregroundApp: {
    backgroundColor: colors.Primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: colors.Primary,
  },
  iconContainer: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(2),
    marginRight: WP(3),
    position: 'relative',
    overflow: 'hidden',
  },
  appIconImage: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(2),
  },
  iconFallback: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
  },
  foregroundBadge: {
    position: 'absolute',
    top: -WP(1),
    right: -WP(1),
    width: WP(4),
    height: WP(4),
    borderRadius: WP(2),
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foregroundBadgeText: {
    color: colors.White,
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
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
    marginBottom: HP(0.3),
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: WP(1.5),
    height: WP(1.5),
    borderRadius: WP(0.75),
    marginRight: WP(1.5),
  },
  statusText: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
  },
  processItem: {
    backgroundColor: colors.White,
    borderRadius: WP(2),
    padding: WP(3),
    marginVertical: HP(0.5),
    borderWidth: 1,
    borderColor: colors.Shadow + '20',
  },
  processHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: HP(1),
  },
  processInfo: {
    flex: 1,
  },
  processName: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginBottom: HP(0.2),
  },
  processDetails: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
  },
  importanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.White,
    paddingHorizontal: WP(2),
    paddingVertical: HP(0.5),
    borderRadius: WP(1),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  importanceDot: {
    width: WP(2),
    height: WP(2),
    borderRadius: WP(1),
    marginRight: WP(1.5),
  },
  importanceText: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-SemiBold',
  },
  packagesContainer: {
    marginTop: HP(1),
    paddingTop: HP(1),
    borderTopWidth: 1,
    borderTopColor: colors.Shadow + '15',
  },
  packagesLabel: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
    marginBottom: HP(0.5),
  },
  packageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: HP(0.5),
  },
  packageNameSmall: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: colors.Black,
    marginLeft: WP(2),
    flex: 1,
  },
  morePackages: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Regular',
    color: colors.Primary,
    fontStyle: 'italic',
    marginTop: HP(0.5),
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

export default RunningAppsScreen;
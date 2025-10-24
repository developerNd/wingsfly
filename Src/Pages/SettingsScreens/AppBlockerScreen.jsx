import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  NativeModules,
  Alert,
  AppState,
  ActivityIndicator,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppItem from '../../Components/AppItem';
import Schedule from '../../Components/Schedule';
import PermissionModal from '../../Components/PermissionModal';
import UsageLimitModal from '../../Components/UsageLimitModal';
import {appBlockerService} from '../../services/api/appBlockerService';
import {useAuth} from '../../contexts/AuthContext';

// Global cache for apps data
let appsCache = null;
const CACHE_EXPIRATION = 5 * 60 * 1000;

export const ScheduleType = {
  LOCK: 'lock',
  UNLOCK: 'unlock',
};

export const WeekDay = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const DISTRACTIVE_APPS = [
  'com.facebook.katana',
  'com.instagram.android',
  'com.zhiliaoapp.musically',
  'com.twitter.android',
  'com.snapchat.android',
  'com.whatsapp',
  'org.telegram.messenger',
  'com.discord',
  'com.netflix.mediaclient',
  'com.amazon.avod.thirdpartyclient',
  'com.google.android.youtube',
  'com.spotify.music',
  'com.reddit.frontpage',
  'com.amazon.mShop.android.shopping',
  'com.android.chrome',
  'com.pinterest',
  'com.tinder',
  'com.ubercab',
  'com.king.candycrushsaga',
  'com.supercell.clashofclans',
  'com.mojang.minecraftpe',
  'com.playrix.homescapes',
  'jp.konami.pesam',
  'com.ea.gp.fifamobile',
  'com.gameloft.android.ANMP.GloftA9HM',
];

const InstalledApps = (() => {
  try {
    if (!NativeModules.InstalledApps) {
      return {
        getInstalledApps: () => Promise.resolve([]),
        lockApp: () => Promise.resolve(false),
        unlockApp: () => Promise.resolve(false),
        setAppSchedule: () => Promise.resolve(true),
        getAppSchedule: () => Promise.resolve([]),
        shouldAppBeLocked: () => Promise.resolve(false),
        setAllSchedulesEnabled: () => Promise.resolve(true),
        setAppPomodoroExclusion: () => Promise.resolve('Success'),
        getAppPomodoroExclusion: () => Promise.resolve(false),
        getPomodoroExcludedApps: () => Promise.resolve([]),
        setAppUsageLimit: () => Promise.resolve(true),
        getAppUsageLimit: () => Promise.resolve(0),
        removeAppUsageLimit: () => Promise.resolve(true),
        getAppUsageToday: () => Promise.resolve(0),
        getRealTimeUsageToday: () => Promise.resolve(0),
        getAllAppsUsageToday: () => Promise.resolve({}),
        resetAppUsageToday: () => Promise.resolve(true),
        isAppLimitReached: () => Promise.resolve(false),
        reevaluateAppBlockingStatus: () => Promise.resolve(false),
        startLockService: () => Promise.resolve(true),
        checkPermissions: () => Promise.resolve({overlay: false, usage: false}),
        openOverlaySettings: () => Promise.resolve(true),
        openUsageSettings: () => Promise.resolve(true),
      };
    }
    return NativeModules.InstalledApps;
  } catch (error) {
    console.error('Error initializing InstalledApps module:', error);
    return {
      getInstalledApps: () => Promise.resolve([]),
      lockApp: () => Promise.resolve(false),
      unlockApp: () => Promise.resolve(false),
      setAppSchedule: () => Promise.resolve(true),
      getAppSchedule: () => Promise.resolve([]),
      shouldAppBeLocked: () => Promise.resolve(false),
      setAllSchedulesEnabled: () => Promise.resolve(true),
      setAppPomodoroExclusion: () => Promise.resolve('Success'),
      getAppPomodoroExclusion: () => Promise.resolve(false),
      getPomodoroExcludedApps: () => Promise.resolve([]),
      setAppUsageLimit: () => Promise.resolve(true),
      getAppUsageLimit: () => Promise.resolve(0),
      removeAppUsageLimit: () => Promise.resolve(true),
      getAppUsageToday: () => Promise.resolve(0),
      getRealTimeUsageToday: () => Promise.resolve(0),
      getAllAppsUsageToday: () => Promise.resolve({}),
      resetAppUsageToday: () => Promise.resolve(true),
      isAppLimitReached: () => Promise.resolve(false),
      reevaluateAppBlockingStatus: () => Promise.resolve(false),
      startLockService: () => Promise.resolve(true),
      checkPermissions: () => Promise.resolve({overlay: false, usage: false}),
      openOverlaySettings: () => Promise.resolve(true),
      openUsageSettings: () => Promise.resolve(true),
    };
  }
})();

// Try to get AppUsageModule for usage stats
const AppUsageModule = (() => {
  try {
    return NativeModules.AppUsageModule || null;
  } catch (error) {
    console.warn('AppUsageModule not available:', error);
    return null;
  }
})();

const LoadingAnimation = () => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const pulseSequence = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
    ]);

    const rotateSequence = Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
      easing: Easing.linear,
    });

    Animated.loop(Animated.parallel([pulseSequence, rotateSequence])).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loadingContainer}>
      <Animated.View
        style={[
          styles.loadingCircle,
          {
            transform: [{scale: pulseAnim}, {rotate: spin}],
          },
        ]}>
        <View style={styles.loadingInnerCircle}>
          <Icon name="lock-clock" size={40} color="#2E7D32" />
        </View>
      </Animated.View>
      <Text style={styles.loadingTitle}>Loading Apps</Text>
      <Text style={styles.loadingSubtitle}>
        Please wait while we fetch your installed applications
      </Text>
    </View>
  );
};

const AppBlockerScreen = () => {
  const {user} = useAuth();

  const [apps, setApps] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMoreApps, setHasMoreApps] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissions, setPermissions] = useState({
    overlay: false,
    usage: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const PAGE_SIZE = 15;
  const allSortedAppsRef = React.useRef([]);
  const isMounted = useRef(true);

  // Modal states
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false);
  const [selectedAppForLimit, setSelectedAppForLimit] = useState(null);
  const [loadingUsageData, setLoadingUsageData] = useState(false);

  // Supabase sync states
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    checkAndRequestPermissions();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkAndRequestPermissions();
        if (user?.id) {
          silentSyncWithSupabase();
        }
      }
    });

    return () => {
      isMounted.current = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (user?.id && apps.length > 0) {
      silentLoadAppDataFromSupabase();
    }
  }, [user?.id, apps.length]);

  useEffect(() => {
    if (!permissions.usage || apps.length === 0) return;

    const refreshUsageData = async () => {
      try {
        const allUsageData = await InstalledApps.getAllAppsUsageToday();
        let hasChanges = false;
        const updatedApps = apps.map(app => {
          const currentUsage = allUsageData[app.packageName] || 0;
          if (currentUsage !== app.usageToday) {
            hasChanges = true;
            return {...app, usageToday: currentUsage};
          }
          return app;
        });

        if (hasChanges) {
          setApps(updatedApps);
          const updatedSortedApps = allSortedAppsRef.current.map(app => {
            const updated = updatedApps.find(u => u.packageName === app.packageName);
            return updated || app;
          });
          allSortedAppsRef.current = sortAppsByUsage(updatedSortedApps);

          if (appsCache) {
            appsCache = {...appsCache, apps: updatedApps, sortedApps: allSortedAppsRef.current};
          }
        }
      } catch (error) {
        console.error('Error refreshing usage data:', error);
      }
    };

    const intervalId = setInterval(refreshUsageData, 30000);
    return () => clearInterval(intervalId);
  }, [apps, permissions.usage]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredApps(apps);
    } else {
      const filtered = allSortedAppsRef.current.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredApps(filtered);
    }
  }, [searchQuery, apps]);

  // Sort apps: Distractive apps by usage first, then normal apps by usage
  const sortAppsByUsage = (appsList) => {
    const distractiveApps = [];
    const normalApps = [];

    // Separate distractive and normal apps
    appsList.forEach(app => {
      if (app.isDistractive) {
        distractiveApps.push(app);
      } else {
        normalApps.push(app);
      }
    });

    // Sort distractive apps by usage (highest first)
    distractiveApps.sort((a, b) => {
      const usageA = a.usageToday || 0;
      const usageB = b.usageToday || 0;
      if (usageB !== usageA) return usageB - usageA;
      return a.name.localeCompare(b.name);
    });

    // Sort normal apps by usage (highest first)
    normalApps.sort((a, b) => {
      const usageA = a.usageToday || 0;
      const usageB = b.usageToday || 0;
      if (usageB !== usageA) return usageB - usageA;
      return a.name.localeCompare(b.name);
    });

    // Return distractive apps first, then normal apps
    return [...distractiveApps, ...normalApps];
  };

  // Handle long press with proper delete options
  const handleAppLongPress = (app) => {
    console.log('Long press detected for:', app.name);
    
    const hasSchedules = app.schedules && app.schedules.length > 0;
    const hasUsageLimit = app.usageLimit > 0;
    
    if (hasSchedules && hasUsageLimit) {
      Alert.alert(
        'Delete Options',
        `What would you like to delete for ${app.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete Schedules', 
            onPress: () => handleDeleteSchedules(app),
            style: 'destructive'
          },
          { 
            text: 'Delete Usage Limit', 
            onPress: () => handleDeleteUsageLimit(app),
            style: 'destructive'
          },
        ]
      );
    } else if (hasSchedules) {
      Alert.alert(
        'Delete Schedules',
        `Are you sure you want to delete all schedules for ${app.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            onPress: () => handleDeleteSchedules(app),
            style: 'destructive'
          }
        ]
      );
    } else if (hasUsageLimit) {
      Alert.alert(
        'Delete Usage Limit',
        `Are you sure you want to delete the usage limit for ${app.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            onPress: () => handleDeleteUsageLimit(app),
            style: 'destructive'
          }
        ]
      );
    } else {
      Alert.alert(
        'Nothing to Delete',
        `${app.name} has no schedules or usage limits to delete.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDeleteSchedules = async (app) => {
    try {
      setLoading(true);
      
      if (user?.id) {
        try {
          await appBlockerService.deleteAllAppSchedules(user.id, app.packageName);
          console.log('Schedules deleted from Supabase successfully');
        } catch (error) {
          console.error('Error deleting schedules from Supabase:', error);
        }
      }
      
      const updatedApp = {
        ...app,
        schedules: [],
        schedulesEnabled: false,
        isLocked: false,
        isActuallyLocked: false,
      };
      
      await handleAppUpdate(updatedApp);
      await InstalledApps.setAppSchedule(app.packageName, []);
      
      Alert.alert('Success', `Schedules deleted for ${app.name}`);
      
    } catch (error) {
      console.error('Error deleting schedules:', error);
      Alert.alert('Error', 'Failed to delete schedules. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUsageLimit = async (app) => {
    try {
      setLoading(true);
      
      if (user?.id) {
        try {
          await appBlockerService.removeAppUsageLimit(user.id, app.packageName);
          console.log('Usage limit deleted from Supabase successfully');
        } catch (error) {
          console.error('Error deleting usage limit from Supabase:', error);
        }
      }
      
      const shouldBeLocked = await InstalledApps.reevaluateAppBlockingStatus(app.packageName);
      
      const updatedApp = {
        ...app,
        usageLimit: 0,
        isLimitReached: false,
        isActuallyLocked: shouldBeLocked,
      };
      
      await handleAppUpdate(updatedApp);
      await InstalledApps.removeAppUsageLimit(app.packageName);
      
      Alert.alert('Success', `Usage limit deleted for ${app.name}`);
      
    } catch (error) {
      console.error('Error deleting usage limit:', error);
      Alert.alert('Error', 'Failed to delete usage limit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const silentLoadAppDataFromSupabase = async () => {
    if (!user?.id || syncing) return;

    try {
      setSyncing(true);
      const [usageLimits, schedules] = await Promise.all([
        appBlockerService.getUserUsageLimits(user.id),
        appBlockerService.getUserSchedules(user.id),
      ]);

      if (apps.length > 0) {
        applySupabaseDataToApps(usageLimits, schedules);
      }
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
    } finally {
      setSyncing(false);
    }
  };

  const applySupabaseDataToApps = (usageLimits, schedules) => {
    const updatedApps = apps.map(app => {
      const appLimit = usageLimits.find(limit => limit.package_name === app.packageName);
      const appSchedules = schedules.filter(schedule => schedule.package_name === app.packageName);
      const convertedSchedules = convertSupabaseSchedulesToAppFormat(appSchedules);

      return {
        ...app,
        usageLimit: appLimit ? appLimit.limit_minutes : app.usageLimit || 0,
        schedules: convertedSchedules.length > 0 ? convertedSchedules : app.schedules,
        schedulesEnabled: convertedSchedules.length > 0 || app.schedulesEnabled,
        isLocked: convertedSchedules.length > 0 || app.isLocked,
      };
    });

    setApps(updatedApps);
    
    const updatedSortedApps = allSortedAppsRef.current.map(app => {
      const updated = updatedApps.find(u => u.packageName === app.packageName);
      return updated || app;
    });
    allSortedAppsRef.current = sortAppsByUsage(updatedSortedApps);

    if (appsCache) {
      appsCache = {...appsCache, apps: updatedApps, sortedApps: allSortedAppsRef.current};
    }
  };

  const convertSupabaseSchedulesToAppFormat = (supabaseSchedules) => {
    const schedulesByType = supabaseSchedules.reduce((acc, schedule) => {
      if (!acc[schedule.schedule_type]) {
        acc[schedule.schedule_type] = [];
      }
      acc[schedule.schedule_type].push(schedule);
      return acc;
    }, {});

    const convertedSchedules = [];

    if (schedulesByType.lock) {
      const timeRanges = schedulesByType.lock.map(schedule => ({
        startHour: parseInt(schedule.start_time.split(':')[0]),
        startMinute: parseInt(schedule.start_time.split(':')[1]),
        endHour: parseInt(schedule.end_time.split(':')[0]),
        endMinute: parseInt(schedule.end_time.split(':')[1]),
        days: schedule.days,
      }));

      convertedSchedules.push({
        id: 'lock',
        type: 'lock',
        timeRanges,
        enabled: true,
      });
    }

    if (schedulesByType.unlock) {
      const timeRanges = schedulesByType.unlock.map(schedule => ({
        startHour: parseInt(schedule.start_time.split(':')[0]),
        startMinute: parseInt(schedule.start_time.split(':')[1]),
        endHour: parseInt(schedule.end_time.split(':')[0]),
        endMinute: parseInt(schedule.end_time.split(':')[1]),
        days: schedule.days,
      }));

      convertedSchedules.push({
        id: 'unlock',
        type: 'unlock',
        timeRanges,
        enabled: true,
      });
    }

    return convertedSchedules;
  };

  const silentSyncWithSupabase = async () => {
    if (!user?.id || syncing) return;

    try {
      setSyncing(true);
      await silentLoadAppDataFromSupabase();
    } catch (error) {
      console.error('Silent sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleUsageLimitUpdate = async updatedApp => {
    try {
      await handleAppUpdate(updatedApp);

      if (user?.id) {
        try {
          if (updatedApp.usageLimit > 0) {
            await appBlockerService.setAppUsageLimit(
              user.id,
              updatedApp.packageName,
              updatedApp.name,
              updatedApp.usageLimit
            );
          } else {
            await appBlockerService.removeAppUsageLimit(
              user.id,
              updatedApp.packageName
            );
          }
        } catch (syncError) {
          console.error('Failed to sync usage limit (silent):', syncError);
        }
      }
    } catch (error) {
      console.error('Error in handleUsageLimitUpdate:', error);
    }
  };

  const handleAppUpdate = async updatedApp => {
    try {
      const shouldBeLocked = await InstalledApps.reevaluateAppBlockingStatus(
        updatedApp.packageName,
      );

      const finalUpdatedApp = {
        ...updatedApp,
        isActuallyLocked: shouldBeLocked,
      };

      const updatedApps = apps.map(a =>
        a.packageName === finalUpdatedApp.packageName ? finalUpdatedApp : a,
      );
      setApps(updatedApps);

      const updatedSortedApps = allSortedAppsRef.current.map(a =>
        a.packageName === finalUpdatedApp.packageName ? finalUpdatedApp : a,
      );
      allSortedAppsRef.current = sortAppsByUsage(updatedSortedApps);

      if (appsCache) {
        appsCache = {
          ...appsCache,
          apps: updatedApps,
          sortedApps: allSortedAppsRef.current,
        };
      }

      if (user?.id && updatedApp.schedules) {
        silentSyncSchedulesToSupabase(updatedApp);
      }

    } catch (error) {
      console.error('Error in handleAppUpdate:', error);
    }
  };

  const silentSyncSchedulesToSupabase = async (app) => {
    if (!user?.id) return;

    try {
      await appBlockerService.setAppSchedules(
        user.id,
        app.packageName,
        app.name,
        app.schedules
      );
    } catch (error) {
      console.error('Failed to sync schedules (silent):', error);
    }
  };

  const checkAndRequestPermissions = async () => {
    try {
      const currentPermissions = await InstalledApps.checkPermissions();
      setPermissions(currentPermissions);

      if (!currentPermissions.overlay || !currentPermissions.usage) {
        setShowPermissionModal(true);
      } else {
        setShowPermissionModal(false);
        await startAppLockService();
        appsCache = null;
        await loadInitialApps();
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const handlePermissionRequest = async permissionType => {
    try {
      if (permissionType === 'overlay') {
        await InstalledApps.openOverlaySettings();
      } else {
        await InstalledApps.openUsageSettings();
      }

      setTimeout(async () => {
        const currentPermissions = await InstalledApps.checkPermissions();
        setPermissions(currentPermissions);

        if (currentPermissions.overlay && currentPermissions.usage) {
          setShowPermissionModal(false);
          await startAppLockService();
          appsCache = null;
          loadInitialApps();
        }
      }, 1000);
    } catch (error) {
      console.error(`Error opening ${permissionType} settings:`, error);
      Alert.alert('Error', 'Failed to open settings. Please try again.');
    }
  };

  const loadUsageDataForAllApps = async appsList => {
    try {
      const permissions = await InstalledApps.checkPermissions();
      if (!permissions.usage) {
        return appsList.map(app => ({
          ...app,
          usageLimit: 0,
          usageToday: 0,
          isLimitReached: false,
        }));
      }

      // Try to get detailed usage stats from AppUsageModule if available
      let detailedUsageMap = {};
      if (AppUsageModule) {
        try {
          const dailyStats = await AppUsageModule.getDailyUsageStats();
          if (dailyStats && Array.isArray(dailyStats)) {
            detailedUsageMap = dailyStats.reduce((acc, stat) => {
              if (stat.totalTimeInForeground > 10000) { // More than 10 seconds
                acc[stat.packageName] = stat.totalTimeInForeground;
              }
              return acc;
            }, {});
            console.log(`Loaded detailed usage for ${Object.keys(detailedUsageMap).length} apps`);
          }
        } catch (err) {
          console.warn('Could not load detailed usage stats:', err);
        }
      }

      const allUsageData = await InstalledApps.getAllAppsUsageToday();

      const usageLimitPromises = appsList.map(async app => {
        try {
          const [usageLimit, isLimitReached] = await Promise.all([
            InstalledApps.getAppUsageLimit(app.packageName),
            InstalledApps.isAppLimitReached(app.packageName),
          ]);

          // Prefer detailed usage from AppUsageModule, fallback to InstalledApps
          const usageToday = detailedUsageMap[app.packageName] || allUsageData[app.packageName] || 0;

          return {
            ...app,
            usageLimit: usageLimit || 0,
            usageToday: usageToday,
            isLimitReached: isLimitReached || false,
          };
        } catch (error) {
          return {
            ...app,
            usageLimit: 0,
            usageToday: 0,
            isLimitReached: false,
          };
        }
      });

      return await Promise.all(usageLimitPromises);
    } catch (error) {
      console.error('Error loading usage data for all apps:', error);
      return appsList.map(app => ({
        ...app,
        usageLimit: 0,
        usageToday: 0,
        isLimitReached: false,
      }));
    }
  };

  const startAppLockService = async () => {
    try {
      await InstalledApps.startLockService();
    } catch (error) {
      console.error('Error starting services:', error);
    }
  };

  const loadInitialApps = async () => {
    try {
      setLoading(true);

      const now = Date.now();

      if (
        appsCache &&
        appsCache.timestamp &&
        now - appsCache.timestamp < CACHE_EXPIRATION
      ) {
        setApps(appsCache.apps);
        setFilteredApps(appsCache.apps);
        allSortedAppsRef.current = appsCache.sortedApps;
        setHasMoreApps(appsCache.sortedApps.length > appsCache.apps.length);
        setLoading(false);
        return;
      }

      const allApps = await InstalledApps.getInstalledApps();

      if (!allApps || allApps.length === 0) {
        setHasMoreApps(false);
        setLoading(false);
        return;
      }

      const filteredApps = allApps.filter(app => {
        return (
          !app.packageName.includes('com.awesomeproject') &&
          !app.packageName.includes('com.applock') &&
          !app.packageName.includes('com.digitalwellbeing') &&
          !app.packageName.includes('com.wingsfly')
        );
      });

      const taggedApps = filteredApps.map(app => ({
        ...app,
        isDistractive: DISTRACTIVE_APPS.includes(app.packageName),
        icon: app.icon ? `data:image/png;base64,${app.icon}` : null,
      }));

      const appsWithSchedulesPromises = taggedApps.map(async app => {
        try {
          const schedules = await InstalledApps.getAppSchedule(app.packageName);

          if (schedules && schedules.length > 0) {
            const anyScheduleEnabled = schedules.some(
              schedule => schedule.enabled,
            );
            const shouldBeLocked = await InstalledApps.shouldAppBeLocked(
              app.packageName,
            );

            return {
              ...app,
              schedules,
              schedulesEnabled: anyScheduleEnabled,
              isLocked: anyScheduleEnabled,
              isActuallyLocked: shouldBeLocked,
            };
          } else {
            return app;
          }
        } catch (error) {
          console.error(`Error loading schedules for ${app.name}:`, error);
          return app;
        }
      });

      const appsWithSchedules = await Promise.all(appsWithSchedulesPromises);
      const appsWithUsageData = await loadUsageDataForAllApps(appsWithSchedules);

      // Sort apps: Distractive apps by usage first, then normal apps by usage
      const sortedApps = sortAppsByUsage(appsWithUsageData);

      const firstPageApps = sortedApps.slice(0, PAGE_SIZE);

      appsCache = {
        apps: firstPageApps,
        sortedApps: sortedApps,
        timestamp: now,
      };

      setApps(firstPageApps);
      setFilteredApps(firstPageApps);
      allSortedAppsRef.current = sortedApps;
      setHasMoreApps(sortedApps.length > PAGE_SIZE);
    } catch (error) {
      console.error('Error loading initial apps:', error);
      Alert.alert('Error', 'Failed to load apps');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const loadNextBatch = async currentPage => {
    if (!hasMoreApps || loadingMore) return;

    try {
      setLoadingMore(true);

      await new Promise(resolve => setTimeout(resolve, 300));

      const startIndex = currentPage * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;

      const appsForPage = allSortedAppsRef.current.slice(startIndex, endIndex);

      setHasMoreApps(endIndex < allSortedAppsRef.current.length);

      const existingPackageNames = new Set(apps.map(app => app.packageName));

      const newApps = appsForPage.filter(
        app => !existingPackageNames.has(app.packageName),
      );

      setApps(prevApps => [...prevApps, ...newApps]);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Error loading next batch of apps:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMoreApps) {
      loadNextBatch(page);
    }
  };

  const refreshApps = () => {
    appsCache = null;
    loadInitialApps();
  };

  const openTimerModal = async app => {
    try {
      setLoadingSchedules(true);

      let appWithSchedules = app;

      if (!app.schedules) {
        const appSchedules = await InstalledApps.getAppSchedule(app.packageName);
        appWithSchedules = {
          ...app,
          schedules: appSchedules,
        };
      }

      try {
        const isExcluded = await InstalledApps.getAppPomodoroExclusion(app.packageName);
        appWithSchedules = {
          ...appWithSchedules,
          excludeFromPomodoro: isExcluded,
        };
      } catch (error) {
        console.warn('Failed to load Pomodoro exclusion status:', error);
        appWithSchedules = {
          ...appWithSchedules,
          excludeFromPomodoro: false,
        };
      }

      const updatedApps = apps.map(a =>
        a.packageName === app.packageName ? appWithSchedules : a,
      );
      setApps(updatedApps);

      const updatedSortedApps = allSortedAppsRef.current.map(a =>
        a.packageName === app.packageName ? appWithSchedules : a,
      );
      allSortedAppsRef.current = updatedSortedApps;

      if (appsCache) {
        appsCache = {
          ...appsCache,
          apps: updatedApps,
          sortedApps: updatedSortedApps,
        };
      }

      setSelectedApp(appWithSchedules);
      setShowTimerModal(true);
    } catch (error) {
      console.error('Error loading app data for schedule modal:', error);
      Alert.alert('Error', 'Failed to load app data');
      setSelectedApp({
        ...app,
        excludeFromPomodoro: false,
      });
      setShowTimerModal(true);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const openUsageLimitModal = async app => {
    try {
      setLoadingUsageData(true);

      let appWithUsageData = app;

      try {
        const [usageLimit, usageToday, isLimitReached] = await Promise.all([
          InstalledApps.getAppUsageLimit(app.packageName),
          InstalledApps.getRealTimeUsageToday
            ? InstalledApps.getRealTimeUsageToday(app.packageName)
            : InstalledApps.getAppUsageToday(app.packageName),
          InstalledApps.isAppLimitReached(app.packageName),
        ]);

        appWithUsageData = {
          ...app,
          usageLimit: usageLimit || 0,
          usageToday: usageToday || 0,
          isLimitReached: isLimitReached || false,
        };
      } catch (error) {
        console.warn('Failed to load fresh usage data:', error);
        appWithUsageData = {
          ...app,
          usageLimit: app.usageLimit || 0,
          usageToday: app.usageToday || 0,
          isLimitReached: app.isLimitReached || false,
        };
      }

      const updatedApps = apps.map(a =>
        a.packageName === app.packageName ? appWithUsageData : a,
      );
      setApps(updatedApps);

      const updatedSortedApps = allSortedAppsRef.current.map(a =>
        a.packageName === app.packageName ? appWithUsageData : a,
      );
      allSortedAppsRef.current = updatedSortedApps;

      if (appsCache) {
        appsCache = {
          ...appsCache,
          apps: updatedApps,
          sortedApps: updatedSortedApps,
        };
      }

      setSelectedAppForLimit(appWithUsageData);
      setShowUsageLimitModal(true);
    } catch (error) {
      console.error('Error loading usage data for limit modal:', error);
      Alert.alert('Error', 'Failed to load usage data');
      setSelectedAppForLimit({
        ...app,
        usageLimit: 0,
        usageToday: 0,
        isLimitReached: false,
      });
      setShowUsageLimitModal(true);
    } finally {
      setLoadingUsageData(false);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#2196F3" />
        <Text style={styles.loadingMoreText}>Loading more apps...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search apps..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshApps}
          disabled={loading}>
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <LoadingAnimation />
      ) : (
        <>
          <Text style={styles.sectionHeader}>
            Distractive apps shown first, sorted by usage time
          </Text>
          <FlatList
            data={filteredApps}
            renderItem={({item}) => (
              <AppItem
                app={item}
                onSchedulePress={() => openTimerModal(item)}
                onUsageLimitPress={() => openUsageLimitModal(item)}
                onLongPress={handleAppLongPress}
                loading={loading}
              />
            )}
            keyExtractor={item => item.packageName}
            contentContainerStyle={styles.listContainer}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
          />
        </>
      )}

      <Schedule
        visible={showTimerModal}
        selectedApp={selectedApp}
        loadingSchedules={loadingSchedules}
        onClose={() => {
          setShowTimerModal(false);
          setSelectedApp(null);
        }}
        onAppUpdate={handleAppUpdate}
        InstalledApps={InstalledApps}
        ScheduleType={ScheduleType}
        WeekDay={WeekDay}
        allInstalledApps={allSortedAppsRef.current}
      />

      <UsageLimitModal
        visible={showUsageLimitModal}
        selectedApp={selectedAppForLimit}
        loadingUsageData={loadingUsageData}
        onClose={() => {
          setShowUsageLimitModal(false);
          setSelectedAppForLimit(null);
        }}
        onAppUpdate={handleUsageLimitUpdate}
        InstalledApps={InstalledApps}
      />

      <PermissionModal
        visible={showPermissionModal}
        permissions={permissions}
        onClose={() => setShowPermissionModal(false)}
        onPermissionRequest={handlePermissionRequest}
        onRefreshPermissions={checkAndRequestPermissions}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    paddingRight: 40,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
  },
  clearButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  refreshButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2E7D32',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingInnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
});

export default AppBlockerScreen;
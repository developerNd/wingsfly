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

// Global cache for apps data
let appsCache = null;

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Schedule types
export const ScheduleType = {
  LOCK: 'lock', // App is locked DURING these times
  UNLOCK: 'unlock', // App is locked EXCEPT during these times
};

// Add days enum
export const WeekDay = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

// List of common distractive app package names
const DISTRACTIVE_APPS = [
  'com.facebook.katana', // Facebook
  'com.instagram.android', // Instagram
  'com.zhiliaoapp.musically', // TikTok
  'com.twitter.android', // Twitter
  'com.snapchat.android', // Snapchat
  'com.whatsapp', // WhatsApp
  'org.telegram.messenger', // Telegram
  'com.discord', // Discord
  'com.netflix.mediaclient', // Netflix
  'com.amazon.avod.thirdpartyclient', // Prime Video
  'com.google.android.youtube', // YouTube
  'com.spotify.music', // Spotify
  'com.reddit.frontpage', // Reddit
  'com.amazon.mShop.android.shopping', // Amazon Shopping
  'com.android.chrome', // Chrome Browser
  'com.pinterest', // Pinterest
  'com.tinder', // Tinder
  'com.ubercab', // Uber
  'com.king.candycrushsaga', // Candy Crush
  'com.supercell.clashofclans', // Clash of Clans
  'com.mojang.minecraftpe', // Minecraft
  'com.playrix.homescapes', // Homescapes
  'jp.konami.pesam', // eFootball
  'com.ea.gp.fifamobile', // FIFA Mobile
  'com.gameloft.android.ANMP.GloftA9HM', // Asphalt 9
];

// Create a safe InstalledApps module with enhanced usage limit methods
const InstalledApps = (() => {
  try {
    console.log('Available NativeModules:', Object.keys(NativeModules));
    console.log('InstalledApps exists?', !!NativeModules.InstalledApps);

    if (!NativeModules.InstalledApps) {
      console.error('ERROR: InstalledApps native module is not available!');
      // Return a stub module to prevent crashes
      return {
        getInstalledApps: () => {
          console.log('Using stub getInstalledApps');
          return Promise.resolve([]);
        },
        lockApp: packageName => {
          console.log('Using stub lockApp for', packageName);
          return Promise.resolve(false);
        },
        unlockApp: packageName => {
          console.log('Using stub unlockApp for', packageName);
          return Promise.resolve(false);
        },
        setAppSchedule: (packageName, schedules) => {
          console.log(
            'Using stub setAppSchedule for',
            packageName,
            'with schedules:',
            schedules,
          );
          return Promise.resolve(true);
        },
        getAppSchedule: packageName => {
          console.log('Using stub getAppSchedule for', packageName);
          return Promise.resolve([]);
        },
        shouldAppBeLocked: packageName => {
          console.log('Using stub shouldAppBeLocked for', packageName);
          return Promise.resolve(false);
        },
        setAllSchedulesEnabled: (packageName, enabled) => {
          console.log(
            'Using stub setAllSchedulesEnabled for',
            packageName,
            'with enabled:',
            enabled,
          );
          return Promise.resolve(true);
        },
        // Pomodoro exclusion methods
        setAppPomodoroExclusion: (packageName, excluded) => {
          console.log(
            'Using stub setAppPomodoroExclusion for',
            packageName,
            'excluded:',
            excluded,
          );
          return Promise.resolve('Success');
        },
        getAppPomodoroExclusion: packageName => {
          console.log('Using stub getAppPomodoroExclusion for', packageName);
          return Promise.resolve(false);
        },
        getPomodoroExcludedApps: () => {
          console.log('Using stub getPomodoroExcludedApps');
          return Promise.resolve([]);
        },
        // NEW USAGE LIMIT METHODS
        setAppUsageLimit: (packageName, limitMinutes) => {
          console.log(
            'Using stub setAppUsageLimit for',
            packageName,
            'limit:',
            limitMinutes,
          );
          return Promise.resolve(true);
        },
        getAppUsageLimit: packageName => {
          console.log('Using stub getAppUsageLimit for', packageName);
          return Promise.resolve(0); // 0 means no limit
        },
        removeAppUsageLimit: packageName => {
          console.log('Using stub removeAppUsageLimit for', packageName);
          return Promise.resolve(true);
        },
        getAppUsageToday: packageName => {
          console.log('Using stub getAppUsageToday for', packageName);
          return Promise.resolve(0); // Minutes used today
        },
        getRealTimeUsageToday: packageName => {
          console.log('Using stub getRealTimeUsageToday for', packageName);
          return Promise.resolve(0);
        },
        getAllAppsUsageToday: () => {
          console.log('Using stub getAllAppsUsageToday');
          return Promise.resolve({});
        },
        resetAppUsageToday: packageName => {
          console.log('Using stub resetAppUsageToday for', packageName);
          return Promise.resolve(true);
        },
        isAppLimitReached: packageName => {
          console.log('Using stub isAppLimitReached for', packageName);
          return Promise.resolve(false);
        },
        // NEW: Add the reevaluateAppBlockingStatus method to stub
        reevaluateAppBlockingStatus: packageName => {
          console.log(
            'Using stub reevaluateAppBlockingStatus for',
            packageName,
          );
          return Promise.resolve(false);
        },
        startLockService: () => {
          console.log('Using stub startLockService');
          return Promise.resolve(true);
        },
        checkPermissions: () => {
          console.log('Using stub checkPermissions');
          return Promise.resolve({overlay: false, usage: false});
        },
        openOverlaySettings: () => {
          console.log('Using stub openOverlaySettings');
          return Promise.resolve(true);
        },
        openUsageSettings: () => {
          console.log('Using stub openUsageSettings');
          return Promise.resolve(true);
        },
      };
    }

    return NativeModules.InstalledApps;
  } catch (error) {
    console.error('Error initializing InstalledApps module:', error);
    // Return the same stub module with usage limit methods
    return {
      getInstalledApps: () => Promise.resolve([]),
      lockApp: () => Promise.resolve(false),
      unlockApp: () => Promise.resolve(false),
      setAppSchedule: (packageName, schedules) => {
        console.log(
          'Using stub setAppSchedule for',
          packageName,
          'with schedules:',
          schedules,
        );
        return Promise.resolve(true);
      },
      getAppSchedule: packageName => {
        console.log('Using stub getAppSchedule for', packageName);
        return Promise.resolve([]);
      },
      shouldAppBeLocked: packageName => {
        console.log('Using stub shouldAppBeLocked for', packageName);
        return Promise.resolve(false);
      },
      setAllSchedulesEnabled: (packageName, enabled) => {
        console.log(
          'Using stub setAllSchedulesEnabled for',
          packageName,
          'with enabled:',
          enabled,
        );
        return Promise.resolve(true);
      },
      setAppPomodoroExclusion: (packageName, excluded) => {
        console.log(
          'Using stub setAppPomodoroExclusion for',
          packageName,
          'excluded:',
          excluded,
        );
        return Promise.resolve('Success');
      },
      getAppPomodoroExclusion: packageName => {
        console.log('Using stub getAppPomodoroExclusion for', packageName);
        return Promise.resolve(false);
      },
      getPomodoroExcludedApps: () => {
        console.log('Using stub getPomodoroExcludedApps');
        return Promise.resolve([]);
      },
      // Usage limit methods
      setAppUsageLimit: (packageName, limitMinutes) => {
        console.log(
          'Using stub setAppUsageLimit for',
          packageName,
          'limit:',
          limitMinutes,
        );
        return Promise.resolve(true);
      },
      getAppUsageLimit: packageName => {
        console.log('Using stub getAppUsageLimit for', packageName);
        return Promise.resolve(0);
      },
      removeAppUsageLimit: packageName => {
        console.log('Using stub removeAppUsageLimit for', packageName);
        return Promise.resolve(true);
      },
      getAppUsageToday: packageName => {
        console.log('Using stub getAppUsageToday for', packageName);
        return Promise.resolve(0);
      },
      getRealTimeUsageToday: packageName => {
        console.log('Using stub getRealTimeUsageToday for', packageName);
        return Promise.resolve(0);
      },
      getAllAppsUsageToday: () => {
        console.log('Using stub getAllAppsUsageToday');
        return Promise.resolve({});
      },
      resetAppUsageToday: packageName => {
        console.log('Using stub resetAppUsageToday for', packageName);
        return Promise.resolve(true);
      },
      isAppLimitReached: packageName => {
        console.log('Using stub isAppLimitReached for', packageName);
        return Promise.resolve(false);
      },
      // NEW: Add the reevaluateAppBlockingStatus method to error stub
      reevaluateAppBlockingStatus: packageName => {
        console.log('Using stub reevaluateAppBlockingStatus for', packageName);
        return Promise.resolve(false);
      },
      startLockService: () => Promise.resolve(true),
      checkPermissions: () => Promise.resolve({overlay: false, usage: false}),
      openOverlaySettings: () => Promise.resolve(true),
      openUsageSettings: () => Promise.resolve(true),
    };
  }
})();

const LoadingAnimation = () => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Create a pulse animation
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

    // Create a rotation animation
    const rotateSequence = Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
      easing: Easing.linear,
    });

    // Run animations in parallel and loop them
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
  const PAGE_SIZE = 15; // Number of apps to load at once
  const allSortedAppsRef = React.useRef([]);
  const isMounted = useRef(true);

  // Timer modal states
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // NEW: Usage limit modal states
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false);
  const [selectedAppForLimit, setSelectedAppForLimit] = useState(null);
  const [loadingUsageData, setLoadingUsageData] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    checkAndRequestPermissions();

    // Listen for app state changes to recheck permissions when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkAndRequestPermissions();
      }
    });

    console.log('InstalledApps module initialized:', InstalledApps !== null);

    return () => {
      isMounted.current = false;
      subscription.remove();
    };
  }, []);

  // Add periodic usage data refresh
  useEffect(() => {
    if (!permissions.usage || apps.length === 0) return;

    const refreshUsageData = async () => {
      try {
        console.log('Refreshing usage data for all displayed apps');

        // Get fresh usage data
        const allUsageData = await InstalledApps.getAllAppsUsageToday();

        let hasChanges = false;
        const updatedApps = apps.map(app => {
          const currentUsage = allUsageData[app.packageName] || 0;

          if (currentUsage !== app.usageToday) {
            console.log(
              `Usage updated for ${app.name}: ${app.usageToday} -> ${currentUsage} minutes`,
            );
            hasChanges = true;
            return {
              ...app,
              usageToday: currentUsage,
            };
          }
          return app;
        });

        if (hasChanges) {
          console.log('Usage data changes detected, updating UI');
          setApps(updatedApps);

          // Update sorted apps ref
          const updatedSortedApps = allSortedAppsRef.current.map(app => {
            const updated = updatedApps.find(
              u => u.packageName === app.packageName,
            );
            return updated || app;
          });
          allSortedAppsRef.current = updatedSortedApps;

          // Update cache
          if (appsCache) {
            appsCache = {
              ...appsCache,
              apps: updatedApps,
              sortedApps: updatedSortedApps,
            };
          }
        }
      } catch (error) {
        console.error('Error refreshing usage data:', error);
      }
    };

    const intervalId = setInterval(refreshUsageData, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, [apps, permissions.usage]);

  // Filter apps when search query or apps list changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // When no search query, just use the apps as is (already sorted)
      setFilteredApps(apps);
    } else {
      // When searching, filter by name from the full sorted list
      const filtered = allSortedAppsRef.current.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredApps(filtered);
    }
  }, [searchQuery, apps]);

  // IMPROVED: Enhanced updateAppLockStatuses with better error handling
  const updateAppLockStatuses = async () => {
    console.log(
      'Updating all app lock statuses with usage and schedule checks',
    );
    if (apps.length === 0) return;

    try {
      const updatedApps = [...apps];
      let hasChanges = false;

      // Process apps in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < updatedApps.length; i += batchSize) {
        const batch = updatedApps.slice(i, i + batchSize);

        const batchPromises = batch.map(async (app, index) => {
          const globalIndex = i + index;

          try {
            // Force re-evaluation of blocking status
            const shouldBeLocked =
              await InstalledApps.reevaluateAppBlockingStatus(app.packageName);

            // Get fresh usage data if the app has a usage limit
            let usageToday = app.usageToday;
            let isLimitReached = app.isLimitReached;

            if (app.usageLimit > 0) {
              [usageToday, isLimitReached] = await Promise.all([
                InstalledApps.getRealTimeUsageToday
                  ? InstalledApps.getRealTimeUsageToday(app.packageName)
                  : InstalledApps.getAppUsageToday(app.packageName),
                InstalledApps.isAppLimitReached(app.packageName),
              ]);
            }

            // Check if anything changed
            if (
              app.isActuallyLocked !== shouldBeLocked ||
              app.usageToday !== usageToday ||
              app.isLimitReached !== isLimitReached
            ) {
              console.log(`Status changes for ${app.name}:`, {
                lockStatus: `${app.isActuallyLocked} -> ${shouldBeLocked}`,
                usageToday: `${app.usageToday} -> ${usageToday}`,
                limitReached: `${app.isLimitReached} -> ${isLimitReached}`,
              });

              updatedApps[globalIndex] = {
                ...app,
                isActuallyLocked: shouldBeLocked,
                usageToday: usageToday,
                isLimitReached: isLimitReached,
              };
              hasChanges = true;
            }
          } catch (error) {
            console.error(`Error updating status for ${app.name}:`, error);
          }
        });

        await Promise.all(batchPromises);

        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < updatedApps.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (hasChanges) {
        console.log('App status changes detected, updating UI');
        setApps(updatedApps);

        // Update sorted apps ref
        const updatedSortedApps = [...allSortedAppsRef.current];
        for (const app of updatedApps) {
          const index = updatedSortedApps.findIndex(
            a => a.packageName === app.packageName,
          );
          if (index !== -1) {
            updatedSortedApps[index] = app;
          }
        }
        allSortedAppsRef.current = updatedSortedApps;

        // Update cache
        if (appsCache) {
          appsCache = {
            ...appsCache,
            apps: updatedApps,
            sortedApps: updatedSortedApps,
          };
        }
      } else {
        console.log('No app status changes detected');
      }
    } catch (error) {
      console.error('Error in updateAppLockStatuses:', error);
    }
  };

  // Enhanced handleAppUpdate with blocking status re-evaluation
  const handleAppUpdate = async updatedApp => {
    console.log('Handling app update for:', updatedApp.name);

    try {
      // Force re-evaluation of blocking status to ensure consistency
      const shouldBeLocked = await InstalledApps.reevaluateAppBlockingStatus(
        updatedApp.packageName,
      );

      // Create the final updated app with correct blocking status
      const finalUpdatedApp = {
        ...updatedApp,
        isActuallyLocked: shouldBeLocked,
      };

      console.log('Final app state after update:', {
        name: finalUpdatedApp.name,
        usageLimit: finalUpdatedApp.usageLimit,
        usageToday: finalUpdatedApp.usageToday,
        isLimitReached: finalUpdatedApp.isLimitReached,
        isActuallyLocked: finalUpdatedApp.isActuallyLocked,
        schedulesEnabled: finalUpdatedApp.schedulesEnabled,
      });

      // Update the apps array
      const updatedApps = apps.map(a =>
        a.packageName === finalUpdatedApp.packageName ? finalUpdatedApp : a,
      );
      setApps(updatedApps);

      // Update the sorted apps ref
      const updatedSortedApps = allSortedAppsRef.current.map(a =>
        a.packageName === finalUpdatedApp.packageName ? finalUpdatedApp : a,
      );
      allSortedAppsRef.current = updatedSortedApps;

      // Update the cache
      if (appsCache) {
        appsCache = {
          ...appsCache,
          apps: updatedApps,
          sortedApps: updatedSortedApps,
        };
      }
    } catch (error) {
      console.error('Error in handleAppUpdate:', error);
      // Fallback to basic update if re-evaluation fails
      const updatedApps = apps.map(a =>
        a.packageName === updatedApp.packageName ? updatedApp : a,
      );
      setApps(updatedApps);

      const updatedSortedApps = allSortedAppsRef.current.map(a =>
        a.packageName === updatedApp.packageName ? updatedApp : a,
      );
      allSortedAppsRef.current = updatedSortedApps;

      if (appsCache) {
        appsCache = {
          ...appsCache,
          apps: updatedApps,
          sortedApps: updatedSortedApps,
        };
      }
    }
  };

  // Enhanced handleUsageLimitUpdate with immediate status refresh
  const handleUsageLimitUpdate = async updatedApp => {
    console.log('Handling usage limit update for:', updatedApp.name);

    try {
      // Always re-evaluate blocking status when usage limits change
      const shouldBeLocked = await InstalledApps.reevaluateAppBlockingStatus(
        updatedApp.packageName,
      );

      // Get fresh usage data
      const [currentUsage, isLimitReached] = await Promise.all([
        InstalledApps.getAppUsageToday(updatedApp.packageName),
        InstalledApps.isAppLimitReached(updatedApp.packageName),
      ]);

      // Create comprehensive updated app state
      const completeUpdatedApp = {
        ...updatedApp,
        usageToday: currentUsage || updatedApp.usageToday,
        isLimitReached: isLimitReached || false,
        isActuallyLocked: shouldBeLocked,
      };

      console.log('Complete app state after usage limit update:', {
        name: completeUpdatedApp.name,
        limit: completeUpdatedApp.usageLimit,
        usage: completeUpdatedApp.usageToday,
        limitReached: completeUpdatedApp.isLimitReached,
        actuallyLocked: completeUpdatedApp.isActuallyLocked,
      });

      // Use the main handleAppUpdate to ensure consistency
      await handleAppUpdate(completeUpdatedApp);
    } catch (error) {
      console.error('Error in handleUsageLimitUpdate:', error);
      // Fallback to basic update
      await handleAppUpdate(updatedApp);
    }
  };

  const checkAndRequestPermissions = async () => {
    try {
      console.log('Checking permissions...');
      const currentPermissions = await InstalledApps.checkPermissions();
      console.log('Current permissions:', currentPermissions);
      setPermissions(currentPermissions);

      if (!currentPermissions.overlay || !currentPermissions.usage) {
        console.log('Some permissions are missing, showing modal');
        setShowPermissionModal(true);
      } else {
        console.log('All permissions granted, starting service');
        // Explicitly close the permission modal
        setShowPermissionModal(false);
        await startAppLockService();

        // Clear the apps cache to force a fresh reload
        appsCache = null;
        console.log('Cache cleared, loading fresh data');

        await loadInitialApps();
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const handlePermissionRequest = async permissionType => {
    try {
      if (permissionType === 'overlay') {
        // For Android, this will open the specific app's overlay permission page
        await InstalledApps.openOverlaySettings();
      } else {
        // For Android, this will open the specific app's usage access permission page
        await InstalledApps.openUsageSettings();
      }

      // Add a small delay before rechecking permissions
      setTimeout(async () => {
        const currentPermissions = await InstalledApps.checkPermissions();
        setPermissions(currentPermissions);

        // If all permissions are granted, close the modal and start the service
        if (currentPermissions.overlay && currentPermissions.usage) {
          setShowPermissionModal(false);
          await startAppLockService();
          // Clear cache and force load apps
          appsCache = null;
          loadInitialApps();
        }
      }, 1000);
    } catch (error) {
      console.error(`Error opening ${permissionType} settings:`, error);
      Alert.alert(
        'Error',
        'Failed to open settings. Please try again or manually grant permissions in Settings.',
        [{text: 'OK'}],
      );
    }
  };

  const loadUsageDataForAllApps = async appsList => {
    try {
      console.log('Loading usage data for all apps...');

      // First check if we have usage stats permission
      const permissions = await InstalledApps.checkPermissions();
      if (!permissions.usage) {
        console.warn(
          'Usage stats permission not granted, returning apps without usage data',
        );
        return appsList.map(app => ({
          ...app,
          usageLimit: 0,
          usageToday: 0,
          isLimitReached: false,
        }));
      }

      // Use the system-based getAllAppsUsageToday instead of stored data
      const allUsageData = await InstalledApps.getAllAppsUsageToday();
      console.log('System usage data retrieved:', allUsageData);

      // Get all usage limits for loaded apps
      const usageLimitPromises = appsList.map(async app => {
        try {
          const [usageLimit, isLimitReached] = await Promise.all([
            InstalledApps.getAppUsageLimit(app.packageName),
            InstalledApps.isAppLimitReached(app.packageName),
          ]);

          // Use system usage data instead of stored data
          const usageToday = allUsageData[app.packageName] || 0;

          console.log(
            `Usage data for ${app.name}: ${usageToday}min (limit: ${usageLimit}min)`,
          );

          return {
            ...app,
            usageLimit: usageLimit || 0,
            usageToday: usageToday,
            isLimitReached: isLimitReached || false,
          };
        } catch (error) {
          console.error(`Error loading usage data for ${app.name}:`, error);
          return {
            ...app,
            usageLimit: 0,
            usageToday: 0,
            isLimitReached: false,
          };
        }
      });

      const appsWithUsageData = await Promise.all(usageLimitPromises);
      console.log('Usage data loaded for all apps');
      return appsWithUsageData;
    } catch (error) {
      console.error('Error loading usage data for all apps:', error);
      // Return apps without usage data
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
      console.log('Starting both app lock services...');
      await InstalledApps.startLockService(); // This now starts both services
      console.log('Both services started successfully');
    } catch (error) {
      console.error('Error starting services:', error);
    }
  };

  const loadInitialApps = async () => {
    try {
      setLoading(true);
      console.log('Starting loadInitialApps function');

      const now = Date.now();

      // Check cache validity
      if (
        appsCache &&
        appsCache.timestamp &&
        now - appsCache.timestamp < CACHE_EXPIRATION
      ) {
        console.log('Using cached apps data');
        setApps(appsCache.apps);
        setFilteredApps(appsCache.apps);
        allSortedAppsRef.current = appsCache.sortedApps;
        setHasMoreApps(appsCache.sortedApps.length > appsCache.apps.length);
        setLoading(false);
        return;
      }

      console.log('Calling InstalledApps.getInstalledApps()');
      const allApps = await InstalledApps.getInstalledApps();

      if (!allApps || allApps.length === 0) {
        setHasMoreApps(false);
        setLoading(false);
        return;
      }

      // Filter out the app itself
      const filteredApps = allApps.filter(app => {
        return (
          !app.packageName.includes('com.awesomeproject') &&
          !app.packageName.includes('com.applock') &&
          !app.packageName.includes('com.digitalwellbeing') &&
          !app.packageName.includes('com.wingsfly')
        ); // Add your app package name
      });

      // Mark distractive apps
      const taggedApps = filteredApps.map(app => ({
        ...app,
        isDistractive: DISTRACTIVE_APPS.includes(app.packageName),
        // Fix the icon URI format
        icon: app.icon ? `data:image/png;base64,${app.icon}` : null,
      }));

      // Load schedules and usage data efficiently
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

      // Load usage data for all apps efficiently
      const appsWithUsageData = await loadUsageDataForAllApps(
        appsWithSchedules,
      );

      // Sort apps
      const sortedApps = appsWithUsageData.sort((a, b) => {
        if (a.isDistractive && !b.isDistractive) return -1;
        if (!a.isDistractive && b.isDistractive) return 1;
        return a.name.localeCompare(b.name);
      });

      // Get first page and cache
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
      console.log(`Loading more apps, page ${currentPage}`);

      // Add a small delay to ensure the loading indicator is visible
      await new Promise(resolve => setTimeout(resolve, 300));

      // Calculate start and end indices for the page
      const startIndex = currentPage * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;

      // Get apps for the current page from our pre-sorted list
      const appsForPage = allSortedAppsRef.current.slice(startIndex, endIndex);

      // Check if there are more apps to load
      setHasMoreApps(endIndex < allSortedAppsRef.current.length);

      // Create a Set with package names to ensure uniqueness
      const existingPackageNames = new Set(apps.map(app => app.packageName));

      // Filter out apps that already exist in the current list
      const newApps = appsForPage.filter(
        app => !existingPackageNames.has(app.packageName),
      );

      // Update apps state with the new batch
      setApps(prevApps => [...prevApps, ...newApps]);

      // Increment page for next load
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

  const toggleSchedules = async app => {
    try {
      // Only proceed if the app has schedules
      if (!app.schedules || app.schedules.length === 0) {
        console.log(`App ${app.name} has no schedules to toggle`);
        // Maybe show an alert to add schedules first
        Alert.alert(
          'No Schedules',
          "This app doesn't have any schedules. Add schedules first using the calendar button.",
          [{text: 'OK'}],
        );
        return;
      }

      console.log(`Toggling schedules for app: ${app.name}`);

      // Update the toggle in UI - flip the schedulesEnabled status
      const newSchedulesEnabled = !(app.schedulesEnabled ?? true); // Default to true if undefined
      const updatedApp = {
        ...app,
        schedulesEnabled: newSchedulesEnabled,
        isLocked: newSchedulesEnabled, // Keep isLocked for backwards compatibility
      };

      // Create updated apps array
      const updatedApps = apps.map(a =>
        a.packageName === app.packageName ? updatedApp : a,
      );

      setApps(updatedApps);

      // Also update the app in allSortedAppsRef
      const updatedSortedApps = allSortedAppsRef.current.map(a =>
        a.packageName === app.packageName ? updatedApp : a,
      );

      allSortedAppsRef.current = updatedSortedApps;

      // Update the cache
      if (appsCache) {
        appsCache = {
          ...appsCache,
          apps: updatedApps,
          sortedApps: updatedSortedApps,
        };
      }

      // Enable or disable all schedules in one call
      console.log(
        `Setting all schedules for ${app.packageName} to enabled=${newSchedulesEnabled}`,
      );
      await InstalledApps.setAllSchedulesEnabled(
        app.packageName,
        newSchedulesEnabled,
      );

      // After toggling, check if app should be locked based on schedule to update UI accordingly
      const shouldBeLocked = await InstalledApps.shouldAppBeLocked(
        app.packageName,
      );

      // Update UI to reflect current state
      const appWithUpdatedState = {
        ...updatedApp,
        isActuallyLocked: shouldBeLocked,
      };

      // Update again with the current lock state
      const finalApps = apps.map(a =>
        a.packageName === app.packageName ? appWithUpdatedState : a,
      );

      setApps(finalApps);

      const finalSortedApps = allSortedAppsRef.current.map(a =>
        a.packageName === app.packageName ? appWithUpdatedState : a,
      );

      allSortedAppsRef.current = finalSortedApps;

      // Update cache again
      if (appsCache) {
        appsCache = {
          ...appsCache,
          apps: finalApps,
          sortedApps: finalSortedApps,
        };
      }
    } catch (error) {
      console.error('Error toggling app schedules:', error);
      Alert.alert('Error', 'Failed to toggle app schedules');
    } finally {
      console.log('Toggle schedules operation completed');
    }
  };

  // Add function to force refresh apps data
  const refreshApps = () => {
    // Clear the cache
    appsCache = null;
    // Load apps again
    loadInitialApps();
  };

  // Updated openTimerModal function with Pomodoro exclusion loading
  const openTimerModal = async app => {
    try {
      setLoadingSchedules(true);

      console.log('Opening timer modal for app:', app.name);
      console.log('Current app schedules:', app.schedules);

      // Load both schedules and Pomodoro exclusion status
      let appWithSchedules = app;

      // If the app doesn't have schedules already, load them from native module
      if (!app.schedules) {
        console.log(`Loading schedules for ${app.packageName}`);
        const appSchedules = await InstalledApps.getAppSchedule(
          app.packageName,
        );
        console.log('Loaded schedules from native module:', appSchedules);

        appWithSchedules = {
          ...app,
          schedules: appSchedules,
        };
      }

      // Load Pomodoro exclusion status
      console.log(`Loading Pomodoro exclusion status for ${app.packageName}`);
      try {
        const isExcluded = await InstalledApps.getAppPomodoroExclusion(
          app.packageName,
        );
        console.log(`Pomodoro exclusion status for ${app.name}:`, isExcluded);

        appWithSchedules = {
          ...appWithSchedules,
          excludeFromPomodoro: isExcluded,
        };
      } catch (error) {
        console.warn('Failed to load Pomodoro exclusion status:', error);
        // Default to false if we can't load the status
        appWithSchedules = {
          ...appWithSchedules,
          excludeFromPomodoro: false,
        };
      }

      // Update the app in our lists with the loaded data
      const updatedApps = apps.map(a =>
        a.packageName === app.packageName ? appWithSchedules : a,
      );
      setApps(updatedApps);

      const updatedSortedApps = allSortedAppsRef.current.map(a =>
        a.packageName === app.packageName ? appWithSchedules : a,
      );
      allSortedAppsRef.current = updatedSortedApps;

      // Update cache
      if (appsCache) {
        appsCache = {
          ...appsCache,
          apps: updatedApps,
          sortedApps: updatedSortedApps,
        };
      }

      // Use the app with complete data
      setSelectedApp(appWithSchedules);
      setShowTimerModal(true);
    } catch (error) {
      console.error('Error loading app data for schedule modal:', error);
      Alert.alert('Error', 'Failed to load app data');
      // Still show the modal, but with default values
      setSelectedApp({
        ...app,
        excludeFromPomodoro: false,
      });
      setShowTimerModal(true);
    } finally {
      setLoadingSchedules(false);
    }
  };

  // NEW: Function to open usage limit modal
  const openUsageLimitModal = async app => {
    try {
      setLoadingUsageData(true);

      console.log('Opening usage limit modal for app:', app.name);

      // Load usage data if not already loaded
      let appWithUsageData = app;

      try {
        const [usageLimit, usageToday, isLimitReached] = await Promise.all([
          InstalledApps.getAppUsageLimit(app.packageName),
          // Try to use real-time method if available, fallback to regular method
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

        console.log(`Fresh usage data for ${app.name}:`, {
          limit: usageLimit,
          today: usageToday,
          limitReached: isLimitReached,
        });
      } catch (error) {
        console.warn('Failed to load fresh usage data:', error);
        appWithUsageData = {
          ...app,
          usageLimit: app.usageLimit || 0,
          usageToday: app.usageToday || 0,
          isLimitReached: app.isLimitReached || false,
        };
      }

      // Update the app in our lists with the loaded data
      const updatedApps = apps.map(a =>
        a.packageName === app.packageName ? appWithUsageData : a,
      );
      setApps(updatedApps);

      const updatedSortedApps = allSortedAppsRef.current.map(a =>
        a.packageName === app.packageName ? appWithUsageData : a,
      );
      allSortedAppsRef.current = updatedSortedApps;

      // Update cache
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

  // Add a function to check the current lock status and update it periodically
  useEffect(() => {
    // Update lock statuses initially
    updateAppLockStatuses();

    // Set up an interval to check lock statuses every minute
    const intervalId = setInterval(() => {
      updateAppLockStatuses();
    }, 60 * 1000); // Check every minute

    return () => clearInterval(intervalId);
  }, [apps]);

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
            Distractive apps are highlighted and shown first
          </Text>
          <FlatList
            data={filteredApps}
            renderItem={({item}) => (
              <AppItem
                app={item}
                onSchedulePress={() => openTimerModal(item)}
                onUsageLimitPress={() => openUsageLimitModal(item)} // NEW: Usage limit button
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

      {/* Schedule Modal */}
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

      {/* NEW: Usage Limit Modal */}
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

      {/* Permission Modal */}
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
    marginLeft: 12,
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

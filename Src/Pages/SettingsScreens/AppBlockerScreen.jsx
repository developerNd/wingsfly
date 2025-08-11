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

// Global cache for apps data
let appsCache = null;

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Schedule types
export const ScheduleType = {
  LOCK: 'lock',    // App is locked DURING these times
  UNLOCK: 'unlock' // App is locked EXCEPT during these times
};

// Add days enum
export const WeekDay = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
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

// Create a safe InstalledApps module with Pomodoro exclusion methods
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
        lockApp: (packageName) => {
          console.log('Using stub lockApp for', packageName);
          return Promise.resolve(false);
        },
        unlockApp: (packageName) => {
          console.log('Using stub unlockApp for', packageName);
          return Promise.resolve(false);
        },
        setAppSchedule: (packageName, schedules) => {
          console.log('Using stub setAppSchedule for', packageName, 'with schedules:', schedules);
          return Promise.resolve(true);
        },
        getAppSchedule: (packageName) => {
          console.log('Using stub getAppSchedule for', packageName);
          return Promise.resolve([]);
        },
        shouldAppBeLocked: (packageName) => {
          console.log('Using stub shouldAppBeLocked for', packageName);
          return Promise.resolve(false);
        },
        setAllSchedulesEnabled: (packageName, enabled) => {
          console.log('Using stub setAllSchedulesEnabled for', packageName, 'with enabled:', enabled);
          return Promise.resolve(true);
        },
        // NEW METHODS FOR POMODORO EXCLUSION
        setAppPomodoroExclusion: (packageName, excluded) => {
          console.log('Using stub setAppPomodoroExclusion for', packageName, 'excluded:', excluded);
          return Promise.resolve('Success');
        },
        getAppPomodoroExclusion: (packageName) => {
          console.log('Using stub getAppPomodoroExclusion for', packageName);
          return Promise.resolve(false);
        },
        getPomodoroExcludedApps: () => {
          console.log('Using stub getPomodoroExcludedApps');
          return Promise.resolve([]);
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
        }
      };
    }
    
    return NativeModules.InstalledApps;
  } catch (error) {
    console.error('Error initializing InstalledApps module:', error);
    // Return the same stub module with Pomodoro exclusion methods
    return {
      getInstalledApps: () => Promise.resolve([]),
      lockApp: () => Promise.resolve(false),
      unlockApp: () => Promise.resolve(false),
      setAppSchedule: (packageName, schedules) => {
        console.log('Using stub setAppSchedule for', packageName, 'with schedules:', schedules);
        return Promise.resolve(true);
      },
      getAppSchedule: (packageName) => {
        console.log('Using stub getAppSchedule for', packageName);
        return Promise.resolve([]);
      },
      shouldAppBeLocked: (packageName) => {
        console.log('Using stub shouldAppBeLocked for', packageName);
        return Promise.resolve(false);
      },
      setAllSchedulesEnabled: (packageName, enabled) => {
        console.log('Using stub setAllSchedulesEnabled for', packageName, 'with enabled:', enabled);
        return Promise.resolve(true);
      },
      setAppPomodoroExclusion: (packageName, excluded) => {
        console.log('Using stub setAppPomodoroExclusion for', packageName, 'excluded:', excluded);
        return Promise.resolve('Success');
      },
      getAppPomodoroExclusion: (packageName) => {
        console.log('Using stub getAppPomodoroExclusion for', packageName);
        return Promise.resolve(false);
      },
      getPomodoroExcludedApps: () => {
        console.log('Using stub getPomodoroExcludedApps');
        return Promise.resolve([]);
      },
      startLockService: () => Promise.resolve(true),
      checkPermissions: () => Promise.resolve({overlay: false, usage: false}),
      openOverlaySettings: () => Promise.resolve(true),
      openUsageSettings: () => Promise.resolve(true)
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
    Animated.loop(
      Animated.parallel([
        pulseSequence,
        rotateSequence,
      ])
    ).start();
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
            transform: [
              { scale: pulseAnim },
              { rotate: spin },
            ],
          },
        ]}
      >
        <View style={styles.loadingInnerCircle}>
          <Icon name="lock-clock" size={40} color="#2E7D32" />
        </View>
      </Animated.View>
      <Text style={styles.loadingTitle}>Loading Apps</Text>
      <Text style={styles.loadingSubtitle}>Please wait while we fetch your installed applications</Text>
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

  // Filter apps when search query or apps list changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // When no search query, just use the apps as is (already sorted)
      setFilteredApps(apps);
    } else {
      // When searching, filter by name from the full sorted list
      const filtered = allSortedAppsRef.current
        .filter(app => app.name.toLowerCase().includes(searchQuery.toLowerCase()));
      setFilteredApps(filtered);
    }
  }, [searchQuery, apps]);

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

  const handlePermissionRequest = async (permissionType) => {
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
        [{ text: 'OK' }]
      );
    }
  };

  const startAppLockService = async () => {
    try {
      await InstalledApps.startLockService();
    } catch (error) {
      console.error('Error starting lock service:', error);
    }
  };

  const loadInitialApps = async () => {
    try {
      setLoading(true);
      console.log('Starting loadInitialApps function');
      
      // Check if we have valid cached data
      const now = Date.now();
      if (appsCache && (now - appsCache.timestamp < CACHE_EXPIRATION)) {
        console.log('Using cached apps data');
        
        // Use the cached data
        setPage(1);
        setApps(appsCache.apps);
        setFilteredApps(appsCache.apps);
        allSortedAppsRef.current = appsCache.sortedApps;
        setHasMoreApps(appsCache.sortedApps.length > appsCache.apps.length);
        
        setLoading(false);
        
        // Update lock statuses for apps with schedules
        updateAppLockStatuses();
        return;
      }
      
      console.log('Cache expired or not available, loading apps from scratch');
      setPage(0);
      setApps([]);
      setFilteredApps([]);
      
      // Load all apps at once to properly sort distractive apps to the top
      console.log('Calling InstalledApps.getInstalledApps()');
      try {
        const allApps = await InstalledApps.getInstalledApps();
        console.log('Got installed apps:', allApps ? allApps.length : 'none');
        
        if (!isMounted.current) {
          console.log('Component unmounted, stopping loading process');
          return;
        }
        
        if (!allApps || allApps.length === 0) {
          console.log('No apps returned from native module');
          setHasMoreApps(false);
          setLoading(false);
          return;
        }
        
        // Filter out the app itself by checking for common app package name patterns
        const filteredApps = allApps.filter((app) => {
          // Skip apps with package names that match common patterns for this app
          return !app.packageName.includes('com.awesomeproject') && 
                 !app.packageName.includes('com.applock') &&
                 !app.packageName.includes('com.digitalwellbeing');
        });
        
        console.log('Filtered apps count:', filteredApps.length);
        
        // Mark distractive apps
        console.log('Marking distractive apps');
        const taggedApps = filteredApps.map((app) => ({
          ...app,
          isDistractive: DISTRACTIVE_APPS.includes(app.packageName)
        }));
        
        // Load schedules for all apps (not just locked apps)
        console.log('Loading schedules for apps');
        const appsWithSchedulesPromises = taggedApps.map(async (app) => {
          try {
            // Get app schedules
            const schedules = await InstalledApps.getAppSchedule(app.packageName);
            if (schedules && schedules.length > 0) {
              // Check if schedules are enabled (if any schedule is enabled)
              const anyScheduleEnabled = schedules.some((schedule) => schedule.enabled);
              
              // Check if app should be locked right now based on schedule
              const shouldBeLocked = await InstalledApps.shouldAppBeLocked(app.packageName);
              return {
                ...app,
                schedules,
                schedulesEnabled: anyScheduleEnabled,
                isLocked: anyScheduleEnabled, // Keep isLocked for backwards compatibility
                isActuallyLocked: shouldBeLocked
              };
            }
          } catch (error) {
            console.error(`Error loading schedules for ${app.name}:`, error);
          }
          return app;
        });
        
        console.log('Awaiting all schedule loading promises');
        const appsWithSchedules = await Promise.all(appsWithSchedulesPromises);
        
        // Pre-sort all apps to ensure distractive apps are first
        console.log('Sorting apps');
        const sortedApps = appsWithSchedules.sort((a, b) => {
          // First sort by distractive status (distractive first)
          if (a.isDistractive && !b.isDistractive) return -1;
          if (!a.isDistractive && b.isDistractive) return 1;
          // Then alphabetically by name
          return a.name.localeCompare(b.name);
        });
        
        // Get the first page
        const firstPageApps = sortedApps.slice(0, PAGE_SIZE);
        console.log('First page loaded with', firstPageApps.length, 'apps');
        
        // Cache the data
        appsCache = {
          apps: firstPageApps,
          sortedApps: sortedApps,
          timestamp: now
        };
        
        setApps(firstPageApps);
        setFilteredApps(firstPageApps);
        
        // Store the full sorted list in a ref for pagination
        allSortedAppsRef.current = sortedApps;
        
        // Set hasMoreApps flag
        setHasMoreApps(sortedApps.length > PAGE_SIZE);
        console.log('Apps loading complete, hasMoreApps:', sortedApps.length > PAGE_SIZE);
      } catch (error) {
        console.error('Error in getInstalledApps:', error);
      }
    } catch (error) {
      console.error('Error loading initial apps:', error);
      Alert.alert('Error', 'Failed to load apps');
    } finally {
      if (isMounted.current) {
        setLoading(false);
        console.log('Loading state set to false');
      }
    }
  };

  const loadNextBatch = async (currentPage) => {
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
      const newApps = appsForPage.filter(app => !existingPackageNames.has(app.packageName));
      
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

  const toggleSchedules = async (app) => {
    try {
      // Only proceed if the app has schedules
      if (!app.schedules || app.schedules.length === 0) {
        console.log(`App ${app.name} has no schedules to toggle`);
        // Maybe show an alert to add schedules first
        Alert.alert(
          "No Schedules",
          "This app doesn't have any schedules. Add schedules first using the calendar button.",
          [{ text: "OK" }]
        );
        return;
      }

      console.log(`Toggling schedules for app: ${app.name}`);
      
      // Update the toggle in UI - flip the schedulesEnabled status
      const newSchedulesEnabled = !(app.schedulesEnabled ?? true); // Default to true if undefined
      const updatedApp = {
        ...app, 
        schedulesEnabled: newSchedulesEnabled,
        isLocked: newSchedulesEnabled // Keep isLocked for backwards compatibility
      };
      
      // Create updated apps array
      const updatedApps = apps.map(a => 
        a.packageName === app.packageName ? updatedApp : a
      );
      
      setApps(updatedApps);
      
      // Also update the app in allSortedAppsRef
      const updatedSortedApps = allSortedAppsRef.current.map(a => 
        a.packageName === app.packageName ? updatedApp : a
      );
      
      allSortedAppsRef.current = updatedSortedApps;
      
      // Update the cache
      if (appsCache) {
        appsCache = {
          ...appsCache,
          apps: updatedApps,
          sortedApps: updatedSortedApps
        };
      }

      // Enable or disable all schedules in one call
      console.log(`Setting all schedules for ${app.packageName} to enabled=${newSchedulesEnabled}`);
      await InstalledApps.setAllSchedulesEnabled(app.packageName, newSchedulesEnabled);
      
      // After toggling, check if app should be locked based on schedule to update UI accordingly
      const shouldBeLocked = await InstalledApps.shouldAppBeLocked(app.packageName);
      
      // Update UI to reflect current state
      const appWithUpdatedState = {...updatedApp, isActuallyLocked: shouldBeLocked};
      
      // Update again with the current lock state
      const finalApps = apps.map(a => 
        a.packageName === app.packageName ? appWithUpdatedState : a
      );
      
      setApps(finalApps);
      
      const finalSortedApps = allSortedAppsRef.current.map(a => 
        a.packageName === app.packageName ? appWithUpdatedState : a
      );
      
      allSortedAppsRef.current = finalSortedApps;
      
      // Update cache again
      if (appsCache) {
        appsCache = {
          ...appsCache,
          apps: finalApps,
          sortedApps: finalSortedApps
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
  const openTimerModal = async (app) => {
    try {
      setLoadingSchedules(true);
      
      console.log('Opening timer modal for app:', app.name);
      console.log('Current app schedules:', app.schedules);
      
      // Load both schedules and Pomodoro exclusion status
      let appWithSchedules = app;
      
      // If the app doesn't have schedules already, load them from native module
      if (!app.schedules) {
        console.log(`Loading schedules for ${app.packageName}`);
        const appSchedules = await InstalledApps.getAppSchedule(app.packageName);
        console.log('Loaded schedules from native module:', appSchedules);
        
        appWithSchedules = {
          ...app,
          schedules: appSchedules
        };
      }
      
      // Load Pomodoro exclusion status
      console.log(`Loading Pomodoro exclusion status for ${app.packageName}`);
      try {
        const isExcluded = await InstalledApps.getAppPomodoroExclusion(app.packageName);
        console.log(`Pomodoro exclusion status for ${app.name}:`, isExcluded);
        
        appWithSchedules = {
          ...appWithSchedules,
          excludeFromPomodoro: isExcluded
        };
      } catch (error) {
        console.warn('Failed to load Pomodoro exclusion status:', error);
        // Default to false if we can't load the status
        appWithSchedules = {
          ...appWithSchedules,
          excludeFromPomodoro: false
        };
      }
      
      // Update the app in our lists with the loaded data
      const updatedApps = apps.map(a => 
        a.packageName === app.packageName ? appWithSchedules : a
      );
      setApps(updatedApps);
      
      const updatedSortedApps = allSortedAppsRef.current.map(a => 
        a.packageName === app.packageName ? appWithSchedules : a
      );
      allSortedAppsRef.current = updatedSortedApps;
      
      // Update cache
      if (appsCache) {
        appsCache = {
          ...appsCache,
          apps: updatedApps,
          sortedApps: updatedSortedApps
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
        excludeFromPomodoro: false
      });
      setShowTimerModal(true);
    } finally {
      setLoadingSchedules(false);
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
  
  // Function to update app lock statuses based on schedules
  const updateAppLockStatuses = async () => {
    console.log("Updating app lock statuses based on schedules");
    if (apps.length === 0) return;
    
    const updatedApps = [...apps];
    let hasChanges = false;
    
    for (let i = 0; i < updatedApps.length; i++) {
      const app = updatedApps[i];
      // Only check apps with schedules that are enabled
      if (app.schedules && app.schedules.length > 0 && (app.schedulesEnabled ?? app.isLocked)) {
        try {
          console.log(`Checking lock status for ${app.name} with schedules`);
          const shouldBeLocked = await InstalledApps.shouldAppBeLocked(app.packageName);
          
          if (app.isActuallyLocked !== shouldBeLocked) {
            console.log(`Updating lock status for ${app.name}: ${app.isActuallyLocked} -> ${shouldBeLocked}`);
            updatedApps[i] = { ...app, isActuallyLocked: shouldBeLocked };
            hasChanges = true;
          }
        } catch (error) {
          console.error(`Error checking lock status for ${app.name}:`, error);
        }
      }
    }
    
    if (hasChanges) {
      console.log("Lock status changes detected, updating UI");
      setApps(updatedApps);
      
      // Update sorted apps ref
      const updatedSortedApps = [...allSortedAppsRef.current];
      for (const app of updatedApps) {
        const index = updatedSortedApps.findIndex(a => a.packageName === app.packageName);
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
          sortedApps: updatedSortedApps
        };
      }
    } else {
      console.log("No lock status changes detected");
    }
  };

  const handleAppUpdate = (updatedApp) => {
    const updatedApps = apps.map(a => 
      a.packageName === updatedApp.packageName ? updatedApp : a
    );
    setApps(updatedApps);
    
    const updatedSortedApps = allSortedAppsRef.current.map(a => 
      a.packageName === updatedApp.packageName ? updatedApp : a
    );
    allSortedAppsRef.current = updatedSortedApps;
    
    // Update the cache
    if (appsCache) {
      appsCache = {
        ...appsCache,
        apps: updatedApps,
        sortedApps: updatedSortedApps
      };
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
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={refreshApps}
          disabled={loading}
        >
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

      {/* Updated Schedule component with allInstalledApps prop */}
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
        allInstalledApps={allSortedAppsRef.current} // Pass all installed apps
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
    shadowOffset: { width: 0, height: 1 },
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
    shadowOffset: { width: 0, height: 4 },
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
    shadowOffset: { width: 0, height: 2 },
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
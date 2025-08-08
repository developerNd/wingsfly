import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  NativeModules,
  Dimensions,
  Alert,
  Switch,
  Modal,
  AppState,
  ActivityIndicator,
  TextInput,
  ScrollView,
  TouchableWithoutFeedback,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Global cache for apps data
let appsCache: {
  apps: AppInfo[];
  sortedApps: AppInfo[];
  timestamp: number;
} | null = null;

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Time format for display
const TIME_FORMAT = 'hh:mm A';

// Schedule types
enum ScheduleType {
  LOCK = 'lock',    // App is locked DURING these times
  UNLOCK = 'unlock' // App is locked EXCEPT during these times
}

// Add days enum
enum WeekDay {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6
}

// Time range interface
interface TimeRange {
  startHour: number;   // 0-23
  startMinute: number; // 0-59
  endHour: number;     // 0-23
  endMinute: number;   // 0-59
  days: WeekDay[];     // Days this time range applies to
}

// Schedule interface
interface Schedule {
  id: string;
  type: ScheduleType;
  timeRanges: TimeRange[];
  enabled: boolean;
}

interface AppInfo {
  name: string;
  packageName: string;
  icon: string;
  isSystemApp: boolean;
  isLocked?: boolean; // Keep for backward compatibility
  isDistractive?: boolean;
  schedules?: Schedule[];
  schedulesEnabled?: boolean; // New property to track if schedules are enabled
  isActuallyLocked?: boolean;
}

interface Permissions {
  overlay: boolean;
  usage: boolean;
}

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

// Create a safe InstalledApps module
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
        lockApp: (packageName: string) => {
          console.log('Using stub lockApp for', packageName);
          return Promise.resolve(false);
        },
        unlockApp: (packageName: string) => {
          console.log('Using stub unlockApp for', packageName);
          return Promise.resolve(false);
        },
        setAppSchedule: (packageName: string, schedules: Schedule[]) => {
          console.log('Using stub setAppSchedule for', packageName, 'with schedules:', schedules);
          return Promise.resolve(true);
        },
        getAppSchedule: (packageName: string) => {
          console.log('Using stub getAppSchedule for', packageName);
          return Promise.resolve([]);
        },
        shouldAppBeLocked: (packageName: string) => {
          console.log('Using stub shouldAppBeLocked for', packageName);
          return Promise.resolve(false);
        },
        setAllSchedulesEnabled: (packageName: string, enabled: boolean) => {
          console.log('Using stub setAllSchedulesEnabled for', packageName, 'with enabled:', enabled);
          return Promise.resolve(true);
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
    // Return a stub module to prevent crashes
    return {
      getInstalledApps: () => Promise.resolve([]),
      lockApp: () => Promise.resolve(false),
      unlockApp: () => Promise.resolve(false),
      setAppSchedule: (packageName: string, schedules: Schedule[]) => {
        console.log('Using stub setAppSchedule for', packageName, 'with schedules:', schedules);
        return Promise.resolve(true);
      },
      getAppSchedule: (packageName: string) => {
        console.log('Using stub getAppSchedule for', packageName);
        return Promise.resolve([]);
      },
      shouldAppBeLocked: (packageName: string) => {
        console.log('Using stub shouldAppBeLocked for', packageName);
        return Promise.resolve(false);
      },
      setAllSchedulesEnabled: (packageName: string, enabled: boolean) => {
        console.log('Using stub setAllSchedulesEnabled for', packageName, 'with enabled:', enabled);
        return Promise.resolve(true);
      },
      startLockService: () => Promise.resolve(true),
      checkPermissions: () => Promise.resolve({overlay: false, usage: false}),
      openOverlaySettings: () => Promise.resolve(true),
      openUsageSettings: () => Promise.resolve(true)
    };
  }
})();

const AppBlockerScreen = () => {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [filteredApps, setFilteredApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMoreApps, setHasMoreApps] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>({
    overlay: false,
    usage: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const PAGE_SIZE = 15; // Number of apps to load at once
  const allSortedAppsRef = React.useRef<AppInfo[]>([]);
  const isMounted = useRef(true);
  
  // Keep original state variables
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [savingSchedules, setSavingSchedules] = useState(false);
  
  // New state variables for the timer modal
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerType, setTimerType] = useState('lock');
  const [startHour, setStartHour] = useState(8);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(9);
  const [endMinute, setEndMinute] = useState(0);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [lockTimeSlots, setLockTimeSlots] = useState<Array<{
    id: string, 
    startTime: string, 
    endTime: string, 
    days: WeekDay[],
    isEnabled: boolean
  }>>([]);
  const [unlockTimeSlots, setUnlockTimeSlots] = useState<Array<{
    id: string, 
    startTime: string, 
    endTime: string,
    days: WeekDay[],
    isEnabled: boolean
  }>>([]);

  // Add new state for active tab
  const [activeTab, setActiveTab] = useState<ScheduleType>(ScheduleType.LOCK);
  const [currentTimeRanges, setCurrentTimeRanges] = useState<TimeRange[]>([]);
  const [startTime, setStartTime] = useState<{hour: number, minute: number}>({hour: 8, minute: 0});
  const [endTime, setEndTime] = useState<{hour: number, minute: number}>({hour: 9, minute: 0});

  // Add new state for success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Add state for selected days
  const [selectedDays, setSelectedDays] = useState<WeekDay[]>([]);

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

  const handlePermissionRequest = async (permissionType: 'overlay' | 'usage') => {
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
        const filteredApps = allApps.filter((app: AppInfo) => {
          // Skip apps with package names that match common patterns for this app
          return !app.packageName.includes('com.awesomeproject') && 
                 !app.packageName.includes('com.applock') &&
                 !app.packageName.includes('com.digitalwellbeing');
        });
        
        console.log('Filtered apps count:', filteredApps.length);
        
        // Mark distractive apps
        console.log('Marking distractive apps');
        const taggedApps = filteredApps.map((app: AppInfo) => ({
          ...app,
          isDistractive: DISTRACTIVE_APPS.includes(app.packageName)
        }));
        
        // Load schedules for all apps (not just locked apps)
        console.log('Loading schedules for apps');
        const appsWithSchedulesPromises = taggedApps.map(async (app: AppInfo) => {
          try {
            // Get app schedules
            const schedules = await InstalledApps.getAppSchedule(app.packageName);
            if (schedules && schedules.length > 0) {
              // Check if schedules are enabled (if any schedule is enabled)
              const anyScheduleEnabled = schedules.some((schedule: Schedule) => schedule.enabled);
              
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
        const sortedApps = appsWithSchedules.sort((a: AppInfo, b: AppInfo) => {
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

  const loadNextBatch = async (currentPage: number) => {
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

  const toggleSchedules = async (app: AppInfo) => {
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

  // Format time for the new modal (HH:MM format)
  const formatTimeForStorage = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // Format time display for the new modal (12hr format)
  const formatTimeDisplay = (hour: number, minute: number): string => {
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    return `${hours}:${minutesStr} ${ampm}`;
  };

  // Add this helper function
  const getDayName = (day: WeekDay): string => {
    return WeekDay[day];
  };

  // Update the addTimeSlot function
  const addTimeSlot = (slot: {
    id: string, 
    startTime: string, 
    endTime: string, 
    days: WeekDay[],
    isEnabled: boolean
  }) => {
    if (!selectedDays || selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    const newSlot = {
      ...slot,
      id: Date.now().toString(),
      days: [...selectedDays] // Ensure we create a new array with the selected days
    };
    
    if (timerType === 'lock') {
      setLockTimeSlots([...lockTimeSlots, newSlot]);
    } else {
      setUnlockTimeSlots([...unlockTimeSlots, newSlot]);
    }
    
    // Reset selected days after adding
    setSelectedDays([]);
  };

  // Remove a time slot
  const removeTimeSlot = (id: string) => {
    if (timerType === 'lock') {
      setLockTimeSlots(lockTimeSlots.filter(slot => slot.id !== id));
    } else {
      setUnlockTimeSlots(unlockTimeSlots.filter(slot => slot.id !== id));
    }
  };

  // Replace openScheduleModal with openTimerModal
  const openTimerModal = async (app: AppInfo) => {
    try {
      setLoadingSchedules(true);
      setLockTimeSlots([]);
      setUnlockTimeSlots([]);
      setStartHour(8);
      setStartMinute(0);
      setEndHour(9);
      setEndMinute(0);
      
      console.log('Opening timer modal for app:', app.name);
      console.log('Current app schedules:', app.schedules);
      
      // If the app doesn't have schedules already, load them from native module
      if (!app.schedules) {
        console.log(`Loading schedules for ${app.packageName}`);
        const appSchedules = await InstalledApps.getAppSchedule(app.packageName);
        console.log('Loaded schedules from native module:', appSchedules);
        
        // Create a new app object with the schedules
        const appWithSchedules = {
          ...app,
          schedules: appSchedules
        };
        
        // Update the app in our lists
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
        
        // Use the app with schedules
        setSelectedApp(appWithSchedules);
        
        // Convert schedules to time slots
        if (appWithSchedules.schedules) {
          const lockSchedule = appWithSchedules.schedules.find((s: Schedule) => s.type === ScheduleType.LOCK);
          const unlockSchedule = appWithSchedules.schedules.find((s: Schedule) => s.type === ScheduleType.UNLOCK);
          
          console.log('Found lock schedule:', lockSchedule);
          console.log('Found unlock schedule:', unlockSchedule);
          
          if (lockSchedule) {
            const lockSlots = lockSchedule.timeRanges.map((range: TimeRange) => {
              console.log('Processing lock time range:', range);
              return {
                id: Date.now().toString() + Math.random().toString(),
                startTime: formatTimeForStorage(range.startHour, range.startMinute),
                endTime: formatTimeForStorage(range.endHour, range.endMinute),
                days: range.days || [],
                isEnabled: true
              };
            });
            console.log('Created lock slots:', lockSlots);
            setLockTimeSlots(lockSlots);
          }
          
          if (unlockSchedule) {
            const unlockSlots = unlockSchedule.timeRanges.map((range: TimeRange) => {
              console.log('Processing unlock time range:', range);
              return {
                id: Date.now().toString() + Math.random().toString(),
                startTime: formatTimeForStorage(range.startHour, range.startMinute),
                endTime: formatTimeForStorage(range.endHour, range.endMinute),
                days: range.days || [],
                isEnabled: true
              };
            });
            console.log('Created unlock slots:', unlockSlots);
            setUnlockTimeSlots(unlockSlots);
          }
        }
      } else {
        console.log('Using existing schedules for app:', app.name);
        setSelectedApp(app);
        
        // Convert schedules to time slots
        if (app.schedules) {
          const lockSchedule = app.schedules.find((s: Schedule) => s.type === ScheduleType.LOCK);
          const unlockSchedule = app.schedules.find((s: Schedule) => s.type === ScheduleType.UNLOCK);
          
          console.log('Found lock schedule:', lockSchedule);
          console.log('Found unlock schedule:', unlockSchedule);
          
          if (lockSchedule) {
            const lockSlots = lockSchedule.timeRanges.map((range: TimeRange) => {
              console.log('Processing lock time range:', range);
              return {
                id: Date.now().toString() + Math.random().toString(),
                startTime: formatTimeForStorage(range.startHour, range.startMinute),
                endTime: formatTimeForStorage(range.endHour, range.endMinute),
                days: range.days || [],
                isEnabled: true
              };
            });
            console.log('Created lock slots:', lockSlots);
            setLockTimeSlots(lockSlots);
          }
          
          if (unlockSchedule) {
            const unlockSlots = unlockSchedule.timeRanges.map((range: TimeRange) => {
              console.log('Processing unlock time range:', range);
              return {
                id: Date.now().toString() + Math.random().toString(),
                startTime: formatTimeForStorage(range.startHour, range.startMinute),
                endTime: formatTimeForStorage(range.endHour, range.endMinute),
                days: range.days || [],
                isEnabled: true
              };
            });
            console.log('Created unlock slots:', unlockSlots);
            setUnlockTimeSlots(unlockSlots);
          }
        }
      }
      
      setShowTimerModal(true);
    } catch (error) {
      console.error('Error loading app schedules:', error);
      Alert.alert('Error', 'Failed to load app schedules');
      // Still show the modal, but without schedules
      setSelectedApp(app);
      setShowTimerModal(true);
    } finally {
      setLoadingSchedules(false);
    }
  };

  // Update saveSchedules function
  const saveSchedules = async () => {
    if (!selectedApp) return;
    
    try {
      setSavingSchedules(true);
      
      // Create updated app with new schedules
      const updatedApp = {
        ...selectedApp,
        schedules: selectedApp.schedules || []
      };
      
      // Build schedules from time slots
      const schedules: Schedule[] = [];
      
      if (lockTimeSlots.length > 0) {
        const lockSchedule: Schedule = {
          id: Date.now().toString(),
          type: ScheduleType.LOCK,
          timeRanges: lockTimeSlots.map(slot => ({
            startHour: parseInt(slot.startTime.split(':')[0]),
            startMinute: parseInt(slot.startTime.split(':')[1]),
            endHour: parseInt(slot.endTime.split(':')[0]),
            endMinute: parseInt(slot.endTime.split(':')[1]),
            days: slot.days
          })),
          enabled: true
        };
        schedules.push(lockSchedule);
      }
      
      if (unlockTimeSlots.length > 0) {
        const unlockSchedule: Schedule = {
          id: Date.now().toString() + '1',
          type: ScheduleType.UNLOCK,
          timeRanges: unlockTimeSlots.map(slot => ({
            startHour: parseInt(slot.startTime.split(':')[0]),
            startMinute: parseInt(slot.startTime.split(':')[1]),
            endHour: parseInt(slot.endTime.split(':')[0]),
            endMinute: parseInt(slot.endTime.split(':')[1]),
            days: slot.days
          })),
          enabled: true
        };
        schedules.push(unlockSchedule);
      }
      
      // Update app schedules
      updatedApp.schedules = schedules;
      
      // Initialize schedulesEnabled property
      updatedApp.schedulesEnabled = schedules.length > 0;
      updatedApp.isLocked = schedules.length > 0; // For backward compatibility
      
      // Update the app in our lists
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
      
      // Send schedules to native module
      console.log('Saving schedules to native module:', updatedApp.schedules);
      await InstalledApps.setAppSchedule(updatedApp.packageName, updatedApp.schedules);
      
      // Show success message
      setSuccessMessage('Schedules saved successfully!');
      setShowSuccessModal(true);
      
      // Close timer modal
      setSelectedApp(null);
      setShowTimerModal(false);
      
      // Auto-hide success modal after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving schedules:', error);
      Alert.alert('Error', 'Failed to save schedules');
    } finally {
      setSavingSchedules(false);
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

  const renderAppItem = ({item}: {item: AppInfo}) => {
    // Determine if app is actually locked right now based on schedule
    const isActuallyLocked = item.isActuallyLocked !== undefined ? item.isActuallyLocked : item.isLocked;
    
    // Determine if app has schedules
    const hasSchedules = item.schedules && item.schedules.length > 0;
    
    // Apps are always considered enabled when they have schedules
    const schedulesEnabled = hasSchedules;
    
    // Determine if app is currently affected by a schedule that's active right now
    const hasActiveSchedule = hasSchedules && isActuallyLocked !== undefined;
    
    return (
      <TouchableOpacity 
        style={[
          styles.appItem,
          item.isDistractive && styles.distractiveAppItem,
          hasActiveSchedule && styles.scheduledAppItem
        ]}
        onPress={() => !loading && openTimerModal(item)}
      >
        <Image
          source={{uri: `data:image/png;base64,${item.icon}`}}
          style={styles.appIcon}
        />
        <View style={styles.appInfoContainer}>
          <View style={styles.appNameContainer}>
            <Text style={styles.appName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isDistractive && (
              <View style={styles.distractiveTag}>
                <Text style={styles.distractiveTagText}>Distractive</Text>
              </View>
            )}
            {hasSchedules && (
              <View style={[styles.scheduleTag]}>
                <Text style={styles.scheduleTagText}>
                  {isActuallyLocked ? 'Locked by schedule' : 'Unlocked by schedule'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.actionButtons}>
            {hasSchedules ? (
              <Icon name="schedule" size={24} color="#2E7D32" />
            ) : (
              <View style={[styles.noSchedulesIndicator]}>
                <Icon name="schedule" size={20} color="#757575" style={{ opacity: 0.5 }} />
                <Text style={styles.noSchedulesText}>No Schedules</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
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

  // Format time for display (24hr to 12hr with AM/PM)
  const formatTime = (hour: number, minute: number): string => {
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    return `${hours}:${minutesStr} ${ampm}`;
  };

  // Format time range for display
  const formatTimeRange = (timeRange: TimeRange): string => {
    const start = formatTime(timeRange.startHour, timeRange.startMinute);
    const end = formatTime(timeRange.endHour, timeRange.endMinute);
    return `${start} - ${end}`;
  };

  // Check if a time is within a time range
  const isTimeInRange = (timeRange: TimeRange, hour: number, minute: number): boolean => {
    // Convert all to minutes for easier comparison
    const currentTime = hour * 60 + minute;
    const startTime = timeRange.startHour * 60 + timeRange.startMinute;
    const endTime = timeRange.endHour * 60 + timeRange.endMinute;
    
    // Handle ranges that cross midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  };

  // Check if app should be locked right now based on schedules
  const shouldAppBeLocked = (app: AppInfo): boolean => {
    if (!app.schedules || app.schedules.length === 0) {
      return !!app.isLocked; // Use the manual lock state if no schedules
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Get enabled schedules
    const enabledSchedules = app.schedules.filter(schedule => schedule.enabled);
    if (enabledSchedules.length === 0) {
      return !!app.isLocked; // Use the manual lock state if no enabled schedules
    }
    
    let shouldLock = false; // Default: not locked
    
    // First check LOCK schedules
    const lockSchedules = enabledSchedules.filter(s => s.type === ScheduleType.LOCK);
    
    // If any LOCK schedule is active right now, app should be locked
    for (const schedule of lockSchedules) {
      for (const timeRange of schedule.timeRanges) {
        if (isTimeInRange(timeRange, currentHour, currentMinute)) {
          shouldLock = true;
          break;
        }
      }
      if (shouldLock) break;
    }
    
    // Then check UNLOCK schedules if no LOCK schedule is active
    if (!shouldLock) {
      const unlockSchedules = enabledSchedules.filter(s => s.type === ScheduleType.UNLOCK);
      
      // For UNLOCK schedules, we lock EXCEPT during these times
      if (unlockSchedules.length > 0) {
        shouldLock = true; // Default for UNLOCK type: locked
        
        // Check if we're in any unlock time range
        for (const schedule of unlockSchedules) {
          for (const timeRange of schedule.timeRanges) {
            if (isTimeInRange(timeRange, currentHour, currentMinute)) {
              shouldLock = false; // We're in an unlock period
              break;
            }
          }
          if (!shouldLock) break;
        }
      }
    }
    
    return shouldLock;
  };

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

  // Add day selection component
  const DaySelector = () => {
    const toggleDay = (day: WeekDay) => {
      setSelectedDays(prev => 
        prev.includes(day) 
          ? prev.filter(d => d !== day)
          : [...prev, day]
      );
    };

    const toggleEveryday = () => {
      if (selectedDays.length === 7) {
        // If all days are selected, clear the selection
        setSelectedDays([]);
      } else {
        // Select all days
        setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      }
    };

    return (
      <View style={styles.daySelector}>
        <TouchableOpacity
          style={[
            styles.dayButton,
            selectedDays.length === 7 && styles.dayButtonSelected
          ]}
          onPress={toggleEveryday}
        >
          <Text style={[
            styles.dayButtonText,
            selectedDays.length === 7 && styles.dayButtonTextSelected
          ]}>
            Everyday
          </Text>
        </TouchableOpacity>
        {Object.values(WeekDay)
          .filter(day => typeof day === 'number')
          .map((day: number) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                selectedDays.includes(day) && styles.dayButtonSelected
              ]}
              onPress={() => toggleDay(day as WeekDay)}
            >
              <Text style={[
                styles.dayButtonText,
                selectedDays.includes(day) && styles.dayButtonTextSelected
              ]}>
                {getDayName(day as WeekDay).slice(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
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
            renderItem={renderAppItem}
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

      {/* Timer Modal for setting time restrictions */}
      <Modal
        transparent={true}
        visible={showTimerModal}
        animationType="slide"
        onRequestClose={() => {
          setShowTimerModal(false);
          setSelectedApp(null);
        }}
      >
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Set Time Restrictions</Text>
                {selectedApp && (
                  <Text style={styles.modalSubtitle}>{selectedApp.name}</Text>
                )}
              </View>

              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[
                    styles.tabButton, 
                    timerType === 'lock' && styles.activeTabButton
                  ]}
                  onPress={() => setTimerType('lock')}
                >
                  <Text style={[
                    styles.tabButtonText,
                    timerType === 'lock' && styles.activeTabButtonText
                  ]}>Lock Time</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.tabButton, 
                    timerType === 'unlock' && styles.activeTabButton
                  ]}
                  onPress={() => setTimerType('unlock')}
                >
                  <Text style={[
                    styles.tabButtonText,
                    timerType === 'unlock' && styles.activeTabButtonText
                  ]}>Unlock Time</Text>
                </TouchableOpacity>
              </View>

              {loadingSchedules ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={styles.modalLoadingText}>Loading schedules...</Text>
                </View>
              ) : (
                <ScrollView style={styles.timeSlotsContainer}>
                  <DaySelector />
                  
                  <View style={styles.timePickerContainerMain}>
                    <View style={styles.timePickerRow}>
                      <TouchableOpacity 
                        style={styles.timeDisplay} 
                        onPress={() => setShowStartTimePicker(true)}
                      >
                        <Text style={styles.timeText}>
                          {formatTimeDisplay(startHour, startMinute)}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.timeSeperator}>to</Text>
                      <TouchableOpacity 
                        style={styles.timeDisplay} 
                        onPress={() => setShowEndTimePicker(true)}
                      >
                        <Text style={styles.timeText}>
                          {formatTimeDisplay(endHour, endMinute)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {showStartTimePicker && (
                      <DateTimePicker
                        value={(() => {
                          const date = new Date();
                          date.setHours(startHour);
                          date.setMinutes(startMinute);
                          return date;
                        })()}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowStartTimePicker(false);
                          if (selectedDate) {
                            setStartHour(selectedDate.getHours());
                            setStartMinute(selectedDate.getMinutes());
                          }
                        }}
                      />
                    )}

                    {showEndTimePicker && (
                      <DateTimePicker
                        value={(() => {
                          const date = new Date();
                          date.setHours(endHour);
                          date.setMinutes(endMinute);
                          return date;
                        })()}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowEndTimePicker(false);
                          if (selectedDate) {
                            setEndHour(selectedDate.getHours());
                            setEndMinute(selectedDate.getMinutes());
                          }
                        }}
                      />
                    )}

                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => addTimeSlot({ 
                        id: '', 
                        startTime: formatTimeForStorage(startHour, startMinute), 
                        endTime: formatTimeForStorage(endHour, endMinute), 
                        days: selectedDays,
                        isEnabled: true 
                      })}
                    >
                      <Text style={styles.addButtonText}>Add Time Slot</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Time slots list */}
                  <View style={styles.timeSlotsList}>
                    {(timerType === 'lock' ? lockTimeSlots : unlockTimeSlots).length > 0 ? (
                      (timerType === 'lock' ? lockTimeSlots : unlockTimeSlots).map(slot => (
                        <View key={slot.id} style={styles.timeSlotItem}>
                          <View style={styles.timeSlotContent}>
                            <Text style={styles.timeSlotText}>
                              {formatTimeDisplay(
                                parseInt(slot.startTime.split(':')[0]),
                                parseInt(slot.startTime.split(':')[1])
                              )} to {formatTimeDisplay(
                                parseInt(slot.endTime.split(':')[0]),
                                parseInt(slot.endTime.split(':')[1])
                              )}
                            </Text>
                            <Text style={styles.daysText}>
                              {slot.days && slot.days.length > 0 
                                ? slot.days.map(day => getDayName(day).slice(0, 3)).join(', ')
                                : 'No days selected'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => removeTimeSlot(slot.id)}
                          >
                            <Text style={styles.deleteButtonText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noTimeSlotsText}>
                        No time slots added. Add one above.
                      </Text>
                    )}
                  </View>
                </ScrollView>
              )}

              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowTimerModal(false);
                    setSelectedApp(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.saveButton,
                    savingSchedules && { opacity: 0.7 }
                  ]}
                  onPress={saveSchedules}
                  disabled={savingSchedules}
                >
                  {savingSchedules ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Permission Modal */}
      <Modal
        transparent={true}
        visible={showPermissionModal}
        animationType="slide"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Permissions Required</Text>
                <Text style={styles.modalSubtitle}>
                  This app needs the following permissions to function properly:
                </Text>
              </View>
              
              <View style={styles.permissionList}>
                <View style={styles.permissionItem}>
                  <View style={styles.permissionInfo}>
                    <Text style={styles.permissionTitle}>Display Over Other Apps</Text>
                    <Text style={styles.permissionDescription}>
                      Required to show lock screens when an app is restricted
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.permissionButton,
                      permissions.overlay ? styles.permissionGranted : styles.permissionNeeded
                    ]}
                    onPress={() => handlePermissionRequest('overlay')}
                  >
                    <Text style={styles.permissionButtonText}>
                      {permissions.overlay ? "Granted" : "Grant"}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.permissionItem}>
                  <View style={styles.permissionInfo}>
                    <Text style={styles.permissionTitle}>Usage Access</Text>
                    <Text style={styles.permissionDescription}>
                      Required to detect when restricted apps are launched
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.permissionButton,
                      permissions.usage ? styles.permissionGranted : styles.permissionNeeded
                    ]}
                    onPress={() => handlePermissionRequest('usage')}
                  >
                    <Text style={styles.permissionButtonText}>
                      {permissions.usage ? "Granted" : "Grant"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.refreshPermissionsButton]}
                  onPress={checkAndRequestPermissions}
                >
                  <Text style={styles.saveButtonText}>Refresh Permissions</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Success Modal */}
      <Modal
        transparent={true}
        visible={showSuccessModal}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSuccessModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.successModalContainer}>
              <View style={styles.successIconContainer}>
                <Icon name="check-circle" size={48} color="#2E7D32" />
              </View>
              <Text style={styles.successTitle}>Success!</Text>
              <Text style={styles.successMessage}>{successMessage}</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 16,
  },
  appInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appNameContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  appName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  lockSwitch: {
    marginLeft: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  sectionHeader: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  distractiveAppItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  distractiveTag: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  distractiveTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scheduledAppItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  scheduleTag: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  scheduleTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledScheduleTag: {
    backgroundColor: '#757575',
  },
  noSchedulesIndicator: {
    backgroundColor: '#f5f5f5',
    padding: 6,
    borderRadius: 6,
    marginLeft: 12,
  },
  noSchedulesText: {
    color: '#757575',
    fontSize: 12,
    fontWeight: '500',
  },
  scheduleButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  scheduleButtonText: {
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#2E7D32',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabButtonText: {
    color: 'white',
  },
  timePickerContainerMain: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeDisplay: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  timeSeperator: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 8,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#2E7D32',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalLoadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  permissionList: {
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666',
  },
  permissionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  permissionGranted: {
    backgroundColor: '#2E7D32',
  },
  permissionNeeded: {
    backgroundColor: '#FF5722',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  refreshPermissionsButton: {
    backgroundColor: '#2E7D32',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSlotsContainer: {
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  timeSlotsList: {
    marginTop: 10,
  },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  timeSlotText: {
    color: '#333',
    fontSize: 16,
  },
  deleteButton: {
    padding: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    borderRadius: 16,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noTimeSlotsText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
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
  successModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 16,
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2E7D32',
    backgroundColor: '#f5f5f5',
    // backgroundColor: '#f5f5f5',
    marginHorizontal: 4,
  },
  dayButtonSelected: {
    backgroundColor: '#2E7D32',
  },
  dayButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  dayButtonTextSelected: {
    color: 'white',
  },
  timeSlotContent: {
    flex: 1,
  },
  daysText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});

export default AppBlockerScreen; 
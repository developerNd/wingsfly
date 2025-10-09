import React, {createContext, useContext, useEffect, useState} from 'react';
import {supabase} from '../../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

// Storage key for password reset state
const PASSWORD_RESET_KEY = 'password_reset_in_progress';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [isPasswordResetInProgress, setIsPasswordResetInProgress] = useState(false);

  useEffect(() => {
    // Check if password reset is in progress on app start
    checkPasswordResetStatus();

    supabase.auth.getSession().then(({data: {session}}) => {
      setUser(session?.user ?? null);
      if (session?.user && !isPasswordResetInProgress) {
        checkProfileSetup(session.user);
      }
      setLoading(false);
    });

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, 'Reset in progress:', isPasswordResetInProgress);
      
      // Check if password reset is in progress
      const resetInProgress = await AsyncStorage.getItem(PASSWORD_RESET_KEY) === 'true';
      
      if (resetInProgress && event === 'SIGNED_IN') {
        console.log('Password reset in progress - user signed in but staying on reset flow');
        // Set user but don't trigger navigation to main app
        setUser(session?.user ?? null);
        // Don't call checkProfileSetup during password reset
        setLoading(false);
        return;
      }

      // Normal auth flow
      setUser(session?.user ?? null);

      if (session?.user && !resetInProgress) {
        checkProfileSetup(session.user);
      } else if (!session?.user) {
        setNeedsProfileSetup(false);
        // Clear password reset status if user signs out
        await clearPasswordResetStatus();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkPasswordResetStatus = async () => {
    try {
      const resetStatus = await AsyncStorage.getItem(PASSWORD_RESET_KEY);
      setIsPasswordResetInProgress(resetStatus === 'true');
    } catch (error) {
      console.error('Error checking password reset status:', error);
    }
  };

  const checkProfileSetup = user => {
    const profileComplete = user?.user_metadata?.profile_setup_complete;
    const hasGender = user?.user_metadata?.gender;

    const needsSetup = !profileComplete || !hasGender;
    setNeedsProfileSetup(needsSetup);
  };

  const completeProfileSetup = async gender => {
    if (!user) return;

    try {
      const {data, error} = await supabase.auth.updateUser({
        data: {
          gender: gender,
          profile_setup_complete: true,
        },
      });

      if (error) {
        console.error('Error updating user profile:', error.message);
        throw error;
      } else {
        const updatedUser = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            gender: gender,
            profile_setup_complete: true,
          },
        };

        setUser(updatedUser);
        setNeedsProfileSetup(false);
      }
    } catch (error) {
      console.error('Error completing profile setup:', error);
      throw error;
    }
  };

  // Helper function to get selected gender with fallback
  const getSelectedGender = () => {
    return user?.user_metadata?.gender || 'Male';
  };

  // Helper function to update user gender
  const updateUserGender = async (gender) => {
    if (!user) return;

    try {
      const {data, error} = await supabase.auth.updateUser({
        data: {
          gender: gender,
        },
      });

      if (error) {
        console.error('Error updating user gender:', error.message);
        throw error;
      } else {
        const updatedUser = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            gender: gender,
          },
        };
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating gender:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const {error} = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
    // Clear password reset status on sign out
    await clearPasswordResetStatus();
  };

  // Password Reset Management Functions
  const startPasswordReset = async () => {
    try {
      await AsyncStorage.setItem(PASSWORD_RESET_KEY, 'true');
      setIsPasswordResetInProgress(true);
      console.log('Password reset started - auth navigation disabled');
    } catch (error) {
      console.error('Error starting password reset:', error);
    }
  };

  const completePasswordReset = async () => {
    try {
      await AsyncStorage.removeItem(PASSWORD_RESET_KEY);
      setIsPasswordResetInProgress(false);
      console.log('Password reset completed - auth navigation enabled');
    } catch (error) {
      console.error('Error completing password reset:', error);
    }
  };

  const clearPasswordResetStatus = async () => {
    try {
      await AsyncStorage.removeItem(PASSWORD_RESET_KEY);
      setIsPasswordResetInProgress(false);
    } catch (error) {
      console.error('Error clearing password reset status:', error);
    }
  };

  const value = {
    user,
    loading,
    needsProfileSetup,
    completeProfileSetup,
    getSelectedGender,
    updateUserGender,
    signOut,
    // Password reset functions
    isPasswordResetInProgress,
    startPasswordReset,
    completePasswordReset,
    clearPasswordResetStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
import React, {createContext, useContext, useEffect, useState} from 'react';
import {supabase} from '../../supabase';

const AuthContext = createContext({});

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

  useEffect(() => {
    supabase.auth.getSession().then(({data: {session}}) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfileSetup(session.user);
      }
      setLoading(false);
    });

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        checkProfileSetup(session.user);
      } else {
        setNeedsProfileSetup(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const signOut = async () => {
    const {error} = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
  };

  const value = {
    user,
    loading,
    needsProfileSetup,
    completeProfileSetup,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

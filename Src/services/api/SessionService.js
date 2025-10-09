import { supabase } from '../../../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SessionService = {
  // Track user login - create new session record
  async trackLogin(userId) {
    try {
      console.log('Tracking login for user:', userId);
      
      // Get current time and convert to Indian time
      const now = new Date();
      // IST is UTC+5:30, so add 5.5 hours (19800000 milliseconds)
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const indianTimeString = istTime.toISOString();
      console.log('Login time (IST):', indianTimeString);
      
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          login_time: indianTimeString
        })
        .select()
        .single();

      if (error) {
        console.error('Error tracking login:', error);
        return { success: false, error };
      }

      // Store session ID in AsyncStorage for logout tracking
      await AsyncStorage.setItem('current_session_id', data.id);
      console.log('Login tracked successfully:', data);
      
      return { success: true, sessionId: data.id };
    } catch (error) {
      console.error('Login tracking error:', error);
      return { success: false, error };
    }
  },

  // Track user logout - update existing session record
  async trackLogout() {
    try {
      const sessionId = await AsyncStorage.getItem('current_session_id');
      
      if (!sessionId) {
        console.log('No active session found to track logout');
        return { success: false, error: 'No active session' };
      }

      console.log('Tracking logout for session:', sessionId);

      // First, check if the session exists
      const { data: existingSession, error: checkError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (checkError || !existingSession) {
        console.log('Session not found in database, clearing stored session ID');
        await AsyncStorage.removeItem('current_session_id');
        return { success: false, error: 'Session not found in database' };
      }

      // Get current time and convert to Indian time
      const now = new Date();
      // IST is UTC+5:30, so add 5.5 hours (19800000 milliseconds)
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const indianTimeString = istTime.toISOString();
      console.log('Logout time (IST):', indianTimeString);

      const { data, error } = await supabase
        .from('user_sessions')
        .update({
          logout_time: indianTimeString
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error tracking logout:', error);
        return { success: false, error };
      }

      // Clear session ID from AsyncStorage
      await AsyncStorage.removeItem('current_session_id');
      console.log('Logout tracked successfully:', data);
      
      return { success: true, data };
    } catch (error) {
      console.error('Logout tracking error:', error);
      // Clean up stored session ID even if logout tracking fails
      try {
        await AsyncStorage.removeItem('current_session_id');
      } catch (cleanupError) {
        console.error('Error cleaning up session ID:', cleanupError);
      }
      return { success: false, error };
    }
  },

  // Get user's session history
  async getUserSessions(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('login_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user sessions:', error);
        return { success: false, error };
      }

      return { success: true, sessions: data };
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return { success: false, error };
    }
  },

  // Get today's sessions for a user (accounting for IST storage)
  async getTodaySessions(userId) {
    try {
      // Get start and end of today in IST
      const now = new Date();
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      
      // Start of day in IST
      const startOfDay = new Date(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
      const startOfDayIST = new Date(startOfDay.getTime() + (5.5 * 60 * 60 * 1000));
      
      // End of day in IST  
      const endOfDay = new Date(istTime.getFullYear(), istTime.getMonth(), istTime.getDate() + 1);
      const endOfDayIST = new Date(endOfDay.getTime() + (5.5 * 60 * 60 * 1000));

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('login_time', startOfDayIST.toISOString())
        .lt('login_time', endOfDayIST.toISOString())
        .order('login_time', { ascending: false });

      if (error) {
        console.error('Error fetching today sessions:', error);
        return { success: false, error };
      }

      return { success: true, sessions: data };
    } catch (error) {
      console.error('Error getting today sessions:', error);
      return { success: false, error };
    }
  },

  // Format time for display (since we're already storing IST, just parse and format)
  formatTimeForDisplay(istTimeString) {
    try {
      const date = new Date(istTimeString);
      // Subtract the IST offset since we added it when storing
      const actualIST = new Date(date.getTime() - (5.5 * 60 * 60 * 1000));
      return actualIST.toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return istTimeString;
    }
  }
};

export default SessionService;
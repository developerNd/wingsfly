import {supabase} from '../../../supabase';

export const alarmService = {
  // Create a new alarm
  async createAlarm(alarmData) {
    try {
      const {data, error} = await supabase
        .from('alarms')
        .insert([
          {
            user_id: alarmData.userId,
            label: alarmData.label,
            time: alarmData.time,
            days: alarmData.days || [],
            is_enabled: alarmData.isEnabled !== undefined ? alarmData.isEnabled : true,
            // Custom tone fields
            tone_type: alarmData.toneType || 'default',
            custom_tone_uri: alarmData.customToneUri || null,
            custom_tone_name: alarmData.customToneName || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error('Error creating alarm:', error);
        throw error;
      }

      // Map database fields to client format
      const alarm = data[0];
      return {
        ...alarm,
        toneType: alarm.tone_type,
        customToneUri: alarm.custom_tone_uri,
        customToneName: alarm.custom_tone_name,
      };
    } catch (error) {
      console.error('Error in createAlarm:', error);
      throw error;
    }
  },

  // Get all alarms for a user
  async getAlarms(userId) {
    try {
      const {data, error} = await supabase
        .from('alarms')
        .select('*')
        .eq('user_id', userId)
        .order('time', {ascending: true});

      if (error) {
        console.error('Error fetching alarms:', error);
        throw error;
      }

      // Map database fields to client format
      return data.map(alarm => ({
        ...alarm,
        toneType: alarm.tone_type || 'default',
        customToneUri: alarm.custom_tone_uri,
        customToneName: alarm.custom_tone_name,
      }));
    } catch (error) {
      console.error('Error in getAlarms:', error);
      throw error;
    }
  },

  // Get enabled alarms for a user
  async getEnabledAlarms(userId) {
    try {
      const {data, error} = await supabase
        .from('alarms')
        .select('*')
        .eq('user_id', userId)
        .eq('is_enabled', true)
        .order('time', {ascending: true});

      if (error) {
        console.error('Error fetching enabled alarms:', error);
        throw error;
      }

      // Map database fields to client format
      return data.map(alarm => ({
        ...alarm,
        toneType: alarm.tone_type || 'default',
        customToneUri: alarm.custom_tone_uri,
        customToneName: alarm.custom_tone_name,
      }));
    } catch (error) {
      console.error('Error in getEnabledAlarms:', error);
      throw error;
    }
  },

  // Get single alarm by ID
  async getAlarmById(alarmId) {
    try {
      const {data, error} = await supabase
        .from('alarms')
        .select('*')
        .eq('id', alarmId)
        .single();

      if (error) {
        console.error('Error fetching alarm by ID:', error);
        throw error;
      }

      // Map database fields to client format
      return {
        ...data,
        toneType: data.tone_type || 'default',
        customToneUri: data.custom_tone_uri,
        customToneName: data.custom_tone_name,
      };
    } catch (error) {
      console.error('Error in getAlarmById:', error);
      throw error;
    }
  },

  // Update alarm
  async updateAlarm(alarmId, alarmData) {
    try {
      const updateData = {};
      
      // Only include fields that are provided
      if (alarmData.label !== undefined) updateData.label = alarmData.label;
      if (alarmData.time !== undefined) updateData.time = alarmData.time;
      if (alarmData.days !== undefined) updateData.days = alarmData.days;
      if (alarmData.isEnabled !== undefined) updateData.is_enabled = alarmData.isEnabled;
      
      // Custom tone fields
      if (alarmData.toneType !== undefined) updateData.tone_type = alarmData.toneType;
      if (alarmData.customToneUri !== undefined) updateData.custom_tone_uri = alarmData.customToneUri;
      if (alarmData.customToneName !== undefined) updateData.custom_tone_name = alarmData.customToneName;

      const {data, error} = await supabase
        .from('alarms')
        .update(updateData)
        .eq('id', alarmId)
        .select();

      if (error) {
        console.error('Error updating alarm:', error);
        throw error;
      }

      // Map database fields to client format
      const alarm = data[0];
      return {
        ...alarm,
        toneType: alarm.tone_type || 'default',
        customToneUri: alarm.custom_tone_uri,
        customToneName: alarm.custom_tone_name,
      };
    } catch (error) {
      console.error('Error in updateAlarm:', error);
      throw error;
    }
  },

  // Toggle alarm enabled/disabled status
  async toggleAlarm(alarmId, isEnabled) {
    try {
      const {data, error} = await supabase
        .from('alarms')
        .update({
          is_enabled: isEnabled,
        })
        .eq('id', alarmId)
        .select();

      if (error) {
        console.error('Error toggling alarm:', error);
        throw error;
      }

      // Map database fields to client format
      const alarm = data[0];
      return {
        ...alarm,
        toneType: alarm.tone_type || 'default',
        customToneUri: alarm.custom_tone_uri,
        customToneName: alarm.custom_tone_name,
      };
    } catch (error) {
      console.error('Error in toggleAlarm:', error);
      throw error;
    }
  },

  // Delete an alarm
  async deleteAlarm(alarmId) {
    try {
      const {error} = await supabase
        .from('alarms')
        .delete()
        .eq('id', alarmId);

      if (error) {
        console.error('Error deleting alarm:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAlarm:', error);
      throw error;
    }
  },

  // Get alarms that should ring today
  async getAlarmsForToday(userId) {
    try {
      const today = new Date();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayName = dayNames[today.getDay()];

      const {data, error} = await supabase
        .from('alarms')
        .select('*')
        .eq('user_id', userId)
        .eq('is_enabled', true);

      if (error) {
        console.error('Error fetching alarms for today:', error);
        throw error;
      }

      // Filter alarms that should ring today
      const todayAlarms = data.filter(alarm => {
        // If no days selected, it's a one-time alarm for any day
        if (!alarm.days || alarm.days.length === 0) {
          return true;
        }
        // Check if today is in the selected days
        return alarm.days.includes(todayName);
      });

      // Map database fields to client format and sort
      return todayAlarms
        .map(alarm => ({
          ...alarm,
          toneType: alarm.tone_type || 'default',
          customToneUri: alarm.custom_tone_uri,
          customToneName: alarm.custom_tone_name,
        }))
        .sort((a, b) => a.time.localeCompare(b.time));
    } catch (error) {
      console.error('Error in getAlarmsForToday:', error);
      throw error;
    }
  },

  // Get next upcoming alarm
  async getNextAlarm(userId) {
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayName = dayNames[now.getDay()];

      const {data, error} = await supabase
        .from('alarms')
        .select('*')
        .eq('user_id', userId)
        .eq('is_enabled', true)
        .order('time', {ascending: true});

      if (error) {
        console.error('Error fetching next alarm:', error);
        throw error;
      }

      // Find next alarm today that hasn't passed
      const todayAlarms = data.filter(alarm => {
        if (!alarm.days || alarm.days.length === 0) return true;
        return alarm.days.includes(todayName);
      });

      const nextTodayAlarm = todayAlarms.find(alarm => alarm.time > currentTime);
      
      if (nextTodayAlarm) {
        return {
          ...nextTodayAlarm,
          toneType: nextTodayAlarm.tone_type || 'default',
          customToneUri: nextTodayAlarm.custom_tone_uri,
          customToneName: nextTodayAlarm.custom_tone_name,
        };
      }

      // If no more alarms today, find next alarm for upcoming days
      for (let i = 1; i <= 7; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(checkDate.getDate() + i);
        const checkDayName = dayNames[checkDate.getDay()];

        const dayAlarms = data.filter(alarm => {
          if (!alarm.days || alarm.days.length === 0) return true;
          return alarm.days.includes(checkDayName);
        });

        if (dayAlarms.length > 0) {
          const alarm = dayAlarms[0];
          return {
            ...alarm,
            toneType: alarm.tone_type || 'default',
            customToneUri: alarm.custom_tone_uri,
            customToneName: alarm.custom_tone_name,
          };
        }
      }

      return null; // No upcoming alarms found
    } catch (error) {
      console.error('Error in getNextAlarm:', error);
      throw error;
    }
  },

  // Get alarm statistics including tone usage
  async getAlarmStatistics(userId) {
    try {
      const {data, error} = await supabase
        .from('alarms')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching alarm statistics:', error);
        throw error;
      }

      const totalAlarms = data.length;
      const enabledAlarms = data.filter(alarm => alarm.is_enabled).length;
      const disabledAlarms = totalAlarms - enabledAlarms;

      // Count tone types
      const customToneCount = data.filter(alarm => alarm.tone_type === 'custom').length;
      const defaultToneCount = totalAlarms - customToneCount;

      // Count alarms by day
      const alarmsByDay = {
        'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0,
        'Thu': 0, 'Fri': 0, 'Sat': 0
      };

      data.forEach(alarm => {
        if (alarm.days && alarm.days.length > 0) {
          alarm.days.forEach(day => {
            if (alarmsByDay.hasOwnProperty(day)) {
              alarmsByDay[day]++;
            }
          });
        } else {
          // One-time alarms count for all days
          Object.keys(alarmsByDay).forEach(day => {
            alarmsByDay[day]++;
          });
        }
      });

      // Find most common alarm times
      const timeFrequency = {};
      data.forEach(alarm => {
        const hour = alarm.time.split(':')[0];
        timeFrequency[hour] = (timeFrequency[hour] || 0) + 1;
      });

      const mostCommonHour = Object.keys(timeFrequency).reduce((a, b) => 
        timeFrequency[a] > timeFrequency[b] ? a : b, '0'
      );

      // Get custom tone names for reference
      const customToneNames = data
        .filter(alarm => alarm.tone_type === 'custom' && alarm.custom_tone_name)
        .map(alarm => alarm.custom_tone_name);

      return {
        totalAlarms,
        enabledAlarms,
        disabledAlarms,
        alarmsByDay,
        mostCommonHour: parseInt(mostCommonHour),
        averageAlarmsPerDay: totalAlarms > 0 ? (totalAlarms / 7).toFixed(1) : 0,
        // Custom tone statistics
        customToneCount,
        defaultToneCount,
        customTonePercentage: totalAlarms > 0 ? ((customToneCount / totalAlarms) * 100).toFixed(1) : 0,
        uniqueCustomTones: [...new Set(customToneNames)].length,
        customToneNames: [...new Set(customToneNames)],
      };
    } catch (error) {
      console.error('Error in getAlarmStatistics:', error);
      throw error;
    }
  },

  // Get alarms by tone type
  async getAlarmsByToneType(userId, toneType = 'custom') {
    try {
      const {data, error} = await supabase
        .from('alarms')
        .select('*')
        .eq('user_id', userId)
        .eq('tone_type', toneType)
        .order('time', {ascending: true});

      if (error) {
        console.error('Error fetching alarms by tone type:', error);
        throw error;
      }

      // Map database fields to client format
      return data.map(alarm => ({
        ...alarm,
        toneType: alarm.tone_type || 'default',
        customToneUri: alarm.custom_tone_uri,
        customToneName: alarm.custom_tone_name,
      }));
    } catch (error) {
      console.error('Error in getAlarmsByToneType:', error);
      throw error;
    }
  },

  // Update custom tone for an alarm
  async updateAlarmTone(alarmId, toneType, customToneUri = null, customToneName = null) {
    try {
      const updateData = {
        tone_type: toneType,
        custom_tone_uri: toneType === 'custom' ? customToneUri : null,
        custom_tone_name: toneType === 'custom' ? customToneName : null,
      };

      const {data, error} = await supabase
        .from('alarms')
        .update(updateData)
        .eq('id', alarmId)
        .select();

      if (error) {
        console.error('Error updating alarm tone:', error);
        throw error;
      }

      // Map database fields to client format
      const alarm = data[0];
      return {
        ...alarm,
        toneType: alarm.tone_type || 'default',
        customToneUri: alarm.custom_tone_uri,
        customToneName: alarm.custom_tone_name,
      };
    } catch (error) {
      console.error('Error in updateAlarmTone:', error);
      throw error;
    }
  },

  // Bulk operations
  async enableAllAlarms(userId) {
    try {
      const {data, error} = await supabase
        .from('alarms')
        .update({is_enabled: true})
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Error enabling all alarms:', error);
        throw error;
      }

      // Map database fields to client format
      return data.map(alarm => ({
        ...alarm,
        toneType: alarm.tone_type || 'default',
        customToneUri: alarm.custom_tone_uri,
        customToneName: alarm.custom_tone_name,
      }));
    } catch (error) {
      console.error('Error in enableAllAlarms:', error);
      throw error;
    }
  },

  async disableAllAlarms(userId) {
    try {
      const {data, error} = await supabase
        .from('alarms')
        .update({is_enabled: false})
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Error disabling all alarms:', error);
        throw error;
      }

      // Map database fields to client format
      return data.map(alarm => ({
        ...alarm,
        toneType: alarm.tone_type || 'default',
        customToneUri: alarm.custom_tone_uri,
        customToneName: alarm.custom_tone_name,
      }));
    } catch (error) {
      console.error('Error in disableAllAlarms:', error);
      throw error;
    }
  },

  async deleteAllAlarms(userId) {
    try {
      const {error} = await supabase
        .from('alarms')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting all alarms:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAllAlarms:', error);
      throw error;
    }
  },

  // Reset all custom tones to default (useful for cleanup)
  async resetAllTonesToDefault(userId) {
    try {
      const {data, error} = await supabase
        .from('alarms')
        .update({
          tone_type: 'default',
          custom_tone_uri: null,
          custom_tone_name: null,
        })
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Error resetting tones to default:', error);
        throw error;
      }

      // Map database fields to client format
      return data.map(alarm => ({
        ...alarm,
        toneType: 'default',
        customToneUri: null,
        customToneName: null,
      }));
    } catch (error) {
      console.error('Error in resetAllTonesToDefault:', error);
      throw error;
    }
  },

  // Helper function to format alarm time for display
  formatAlarmTime(time, use24Hour = true) {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const minute = parseInt(minutes);

    if (use24Hour) {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    } else {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    }
  },

  // Helper function to get time until next alarm
  getTimeUntilAlarm(alarmTime) {
    const now = new Date();
    const [hours, minutes] = alarmTime.split(':');
    
    const alarmDate = new Date();
    alarmDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // If alarm time has passed today, set it for tomorrow
    if (alarmDate <= now) {
      alarmDate.setDate(alarmDate.getDate() + 1);
    }

    const timeDiff = alarmDate.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (hoursUntil === 0 && minutesUntil === 0) {
      return "Alarm will ring in less than 1 minute";
    } else if (hoursUntil === 0) {
      return `Alarm will ring in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
    } else if (minutesUntil === 0) {
      return `Alarm will ring in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`;
    } else {
      return `Alarm will ring in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''} ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
    }
  },

  // Helper function to get tone display name
  getToneDisplayName(alarm) {
    if (!alarm) return 'Default';
    
    if (alarm.toneType === 'custom' && alarm.customToneName) {
      return alarm.customToneName;
    }
    
    return 'Default Alarm';
  },

  // Helper function to validate custom tone data
  validateCustomToneData(toneType, customToneUri, customToneName) {
    if (toneType === 'custom') {
      if (!customToneUri || typeof customToneUri !== 'string') {
        throw new Error('Custom tone URI is required for custom tone type');
      }
      
      if (!customToneName || typeof customToneName !== 'string') {
        console.warn('Custom tone name not provided, using default name');
      }
      
      return {
        isValid: true,
        toneType: 'custom',
        customToneUri,
        customToneName: customToneName || 'Custom Tone'
      };
    }
    
    return {
      isValid: true,
      toneType: 'default',
      customToneUri: null,
      customToneName: null
    };
  },
};
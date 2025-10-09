import {supabase} from '../../../supabase';

export const appBlockerService = {
  // Usage Limits Functions (simplified - no is_enabled column)
  
  // Create or update usage limit for an app
  async setAppUsageLimit(userId, packageName, appName, limitMinutes) {
    try {
      // First try to find existing limit
      const {data: existingLimit, error: findError} = await supabase
        .from('app_usage_limits')
        .select('id')
        .eq('user_id', userId)
        .eq('package_name', packageName)
        .single();

      let data, error;

      if (existingLimit && !findError) {
        // Update existing limit
        const updateResult = await supabase
          .from('app_usage_limits')
          .update({
            app_name: appName,
            limit_minutes: limitMinutes,
          })
          .eq('id', existingLimit.id)
          .select();
        
        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Create new limit
        const insertResult = await supabase
          .from('app_usage_limits')
          .insert([
            {
              user_id: userId,
              package_name: packageName,
              app_name: appName,
              limit_minutes: limitMinutes,
            },
          ])
          .select();
        
        data = insertResult.data;
        error = insertResult.error;
      }

      if (error) {
        console.error('Error setting usage limit:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in setAppUsageLimit:', error);
      throw error;
    }
  },

  // Get usage limit for a specific app
  async getAppUsageLimit(userId, packageName) {
    try {
      const {data, error} = await supabase
        .from('app_usage_limits')
        .select('*')
        .eq('user_id', userId)
        .eq('package_name', packageName)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error getting usage limit:', error);
        throw error;
      }

      return data ? data.limit_minutes : 0;
    } catch (error) {
      console.error('Error in getAppUsageLimit:', error);
      return 0;
    }
  },

  // Get usage limit record with ID for a specific app
  async getAppUsageLimitRecord(userId, packageName) {
    try {
      const {data, error} = await supabase
        .from('app_usage_limits')
        .select('*')
        .eq('user_id', userId)
        .eq('package_name', packageName)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting usage limit record:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getAppUsageLimitRecord:', error);
      return null;
    }
  },

  // Get all usage limits for a user
  async getUserUsageLimits(userId) {
    try {
      const {data, error} = await supabase
        .from('app_usage_limits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error getting user usage limits:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserUsageLimits:', error);
      throw error;
    }
  },

  // Remove usage limit for an app (delete record)
  async removeAppUsageLimit(userId, packageName) {
    try {
      const {error} = await supabase
        .from('app_usage_limits')
        .delete()
        .eq('user_id', userId)
        .eq('package_name', packageName);

      if (error) {
        console.error('Error removing usage limit:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in removeAppUsageLimit:', error);
      throw error;
    }
  },

  // Schedule Functions (with pomo_enabled column and proper UUID updates)
  
  // Add schedule for an app
  async addAppSchedule(userId, scheduleData) {
    try {
      const {data, error} = await supabase
        .from('app_schedules')
        .insert([
          {
            user_id: userId,
            package_name: scheduleData.packageName,
            app_name: scheduleData.appName,
            schedule_type: scheduleData.scheduleType, // 'lock' or 'unlock'
            start_time: scheduleData.startTime, // '09:00'
            end_time: scheduleData.endTime, // '17:30'
            days: scheduleData.days, // [1,2,3,4,5]
            pomo_enabled: scheduleData.pomoEnabled || false,
          },
        ])
        .select();

      if (error) {
        console.error('Error adding schedule:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in addAppSchedule:', error);
      throw error;
    }
  },

  // Get schedules for a specific app
  async getAppSchedules(userId, packageName) {
    try {
      const {data, error} = await supabase
        .from('app_schedules')
        .select('*')
        .eq('user_id', userId)
        .eq('package_name', packageName)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error getting app schedules:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAppSchedules:', error);
      throw error;
    }
  },

  // Get all schedules for a user
  async getUserSchedules(userId) {
    try {
      const {data, error} = await supabase
        .from('app_schedules')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error getting user schedules:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserSchedules:', error);
      throw error;
    }
  },

  // Update specific schedule by UUID
  async updateAppSchedule(scheduleId, scheduleData) {
    try {
      const {data, error} = await supabase
        .from('app_schedules')
        .update({
          schedule_type: scheduleData.scheduleType,
          start_time: scheduleData.startTime,
          end_time: scheduleData.endTime,
          days: scheduleData.days,
          pomo_enabled: scheduleData.pomoEnabled || false,
        })
        .eq('id', scheduleId)
        .select();

      if (error) {
        console.error('Error updating schedule:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateAppSchedule:', error);
      throw error;
    }
  },

  // Delete specific schedule by UUID
  async deleteAppSchedule(scheduleId) {
    try {
      const {error} = await supabase
        .from('app_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) {
        console.error('Error deleting schedule:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAppSchedule:', error);
      throw error;
    }
  },

  // Delete all schedules for a specific app
  async deleteAllAppSchedules(userId, packageName) {
    try {
      const {error} = await supabase
        .from('app_schedules')
        .delete()
        .eq('user_id', userId)
        .eq('package_name', packageName);

      if (error) {
        console.error('Error deleting all app schedules:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAllAppSchedules:', error);
      throw error;
    }
  },

  // Set multiple schedules for an app (replaces existing ones) - FIXED VERSION
  async setAppSchedules(userId, packageName, appName, schedules) {
    try {
      // First, delete all existing schedules for this app
      await this.deleteAllAppSchedules(userId, packageName);

      // Then add new schedules
      if (schedules && schedules.length > 0) {
        const schedulesToInsert = [];

        schedules.forEach(schedule => {
          // Each schedule can have multiple time ranges
          schedule.timeRanges.forEach(timeRange => {
            schedulesToInsert.push({
              user_id: userId,
              package_name: packageName,
              app_name: appName,
              schedule_type: schedule.type,
              start_time: `${timeRange.startHour.toString().padStart(2, '0')}:${timeRange.startMinute.toString().padStart(2, '0')}`,
              end_time: `${timeRange.endHour.toString().padStart(2, '0')}:${timeRange.endMinute.toString().padStart(2, '0')}`,
              days: timeRange.days,
              pomo_enabled: schedule.excludeFromPomodoro || false,
            });
          });
        });

        if (schedulesToInsert.length > 0) {
          const {data, error} = await supabase
            .from('app_schedules')
            .insert(schedulesToInsert)
            .select();

          if (error) {
            console.error('Error setting schedules:', error);
            throw error;
          }

          return data;
        }
      }

      return [];
    } catch (error) {
      console.error('Error in setAppSchedules:', error);
      throw error;
    }
  },

  // Get single schedule by UUID
  async getScheduleById(scheduleId) {
    try {
      const {data, error} = await supabase
        .from('app_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (error) {
        console.error('Error getting schedule by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getScheduleById:', error);
      throw error;
    }
  },

  // Update Pomodoro setting for specific schedule
  async updateSchedulePomodoro(scheduleId, pomoEnabled) {
    try {
      const {data, error} = await supabase
        .from('app_schedules')
        .update({pomo_enabled: pomoEnabled})
        .eq('id', scheduleId)
        .select();

      if (error) {
        console.error('Error updating schedule Pomodoro setting:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateSchedulePomodoro:', error);
      throw error;
    }
  },

  // Utility Functions
  
  // Check if app should be blocked based on current time and schedules
  async shouldAppBeBlocked(userId, packageName) {
    try {
      const schedules = await this.getAppSchedules(userId, packageName);
      const usageLimit = await this.getAppUsageLimit(userId, packageName);
      
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Check usage limit first (would need integration with usage tracking)
      if (usageLimit > 0) {
        // This would require integration with your usage tracking system
      }

      // Check schedules
      for (const schedule of schedules) {
        if (schedule.days.includes(currentDay)) {
          const isInTimeRange = currentTime >= schedule.start_time && currentTime <= schedule.end_time;
          
          if (schedule.schedule_type === 'lock' && isInTimeRange) {
            return true; // Should be blocked
          } else if (schedule.schedule_type === 'unlock' && !isInTimeRange) {
            return true; // Should be blocked (outside unlock window)
          }
        }
      }

      return false; // Not blocked
    } catch (error) {
      console.error('Error in shouldAppBeBlocked:', error);
      return false;
    }
  },

  // Get blocking summary for all user apps
  async getUserBlockingSummary(userId) {
    try {
      const [usageLimits, schedules] = await Promise.all([
        this.getUserUsageLimits(userId),
        this.getUserSchedules(userId),
      ]);

      // Group schedules by package name
      const schedulesByApp = schedules.reduce((acc, schedule) => {
        if (!acc[schedule.package_name]) {
          acc[schedule.package_name] = [];
        }
        acc[schedule.package_name].push(schedule);
        return acc;
      }, {});

      // Group usage limits by package name
      const limitsByApp = usageLimits.reduce((acc, limit) => {
        acc[limit.package_name] = limit;
        return acc;
      }, {});

      // Get unique apps
      const allApps = new Set([
        ...usageLimits.map(l => l.package_name),
        ...schedules.map(s => s.package_name),
      ]);

      const summary = Array.from(allApps).map(packageName => {
        const appSchedules = schedulesByApp[packageName] || [];
        const appLimit = limitsByApp[packageName];
        
        return {
          packageName,
          appName: appLimit?.app_name || appSchedules[0]?.app_name || packageName,
          hasUsageLimit: !!appLimit,
          usageLimitMinutes: appLimit?.limit_minutes || 0,
          hasSchedules: appSchedules.length > 0,
          schedules: appSchedules,
          schedulesCount: appSchedules.length,
        };
      });

      return summary;
    } catch (error) {
      console.error('Error in getUserBlockingSummary:', error);
      throw error;
    }
  },

  // Statistics
  async getBlockingStatistics(userId) {
    try {
      const [usageLimits, schedules] = await Promise.all([
        this.getUserUsageLimits(userId),
        this.getUserSchedules(userId),
      ]);

      const totalAppsWithLimits = usageLimits.length;
      const totalAppsWithSchedules = new Set(schedules.map(s => s.package_name)).size;
      const totalSchedules = schedules.length;
      
      const schedulesByType = schedules.reduce((acc, schedule) => {
        acc[schedule.schedule_type] = (acc[schedule.schedule_type] || 0) + 1;
        return acc;
      }, {});

      const averageLimitMinutes = totalAppsWithLimits > 0 
        ? Math.round(usageLimits.reduce((sum, limit) => sum + limit.limit_minutes, 0) / totalAppsWithLimits)
        : 0;

      const pomoEnabledSchedules = schedules.filter(s => s.pomo_enabled).length;

      return {
        totalAppsWithLimits,
        totalAppsWithSchedules,
        totalSchedules,
        lockSchedules: schedulesByType.lock || 0,
        unlockSchedules: schedulesByType.unlock || 0,
        pomoEnabledSchedules,
        averageLimitMinutes,
        totalUniqueApps: new Set([
          ...usageLimits.map(l => l.package_name),
          ...schedules.map(s => s.package_name),
        ]).size,
      };
    } catch (error) {
      console.error('Error in getBlockingStatistics:', error);
      throw error;
    }
  },
};
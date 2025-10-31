import {supabase} from '../../../supabase';

export const youtubeContentService = {
  // Track video/short view
  async trackContentView(userId, contentData) {
    try {
      const {data, error} = await supabase
        .from('youtube_content_interactions')
        .insert([
          {
            user_id: userId,
            video_id: contentData.videoId,
            content_type: contentData.contentType, // 'video' or 'short'
            title: contentData.title,
            channel_name: contentData.channelName,
            category: contentData.category,
            time_spent: contentData.timeSpent || 0,
            is_positive_content: contentData.isPositiveContent !== false,
          },
        ])
        .select();

      if (error) {
        console.error('Error tracking content view:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in trackContentView:', error);
      throw error;
    }
  },

  // Update time spent on content
  async updateTimeSpent(userId, videoId, additionalTime) {
    try {
      // Get the most recent interaction for this video
      const {data: existingInteraction, error: fetchError} = await supabase
        .from('youtube_content_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .order('created_at', {ascending: false})
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching interaction:', fetchError);
        throw fetchError;
      }

      if (existingInteraction) {
        // Update existing record
        const {data, error} = await supabase
          .from('youtube_content_interactions')
          .update({
            time_spent: existingInteraction.time_spent + additionalTime,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingInteraction.id)
          .select();

        if (error) {
          console.error('Error updating time spent:', error);
          throw error;
        }

        return data[0];
      }

      return null;
    } catch (error) {
      console.error('Error in updateTimeSpent:', error);
      throw error;
    }
  },

  // Get user's content preferences (categories they watch most)
  async getUserPreferences(userId, limit = 10) {
    try {
      const {data, error} = await supabase
        .from('youtube_content_interactions')
        .select('category, video_id')
        .eq('user_id', userId)
        .not('category', 'is', null)
        .order('created_at', {ascending: false})
        .limit(100); // Get last 100 interactions

      if (error) {
        console.error('Error getting user preferences:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Count category frequency
      const categoryCount = data.reduce((acc, item) => {
        if (item.category) {
          acc[item.category] = (acc[item.category] || 0) + 1;
        }
        return acc;
      }, {});

      // Sort by frequency and return top categories
      const sortedCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([category, count]) => ({category, count}));

      return sortedCategories;
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return [];
    }
  },

  // Get user's watch history
  async getUserWatchHistory(userId, limit = 20) {
    try {
      const {data, error} = await supabase
        .from('youtube_content_interactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false})
        .limit(limit);

      if (error) {
        console.error('Error getting watch history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserWatchHistory:', error);
      return [];
    }
  },

  // Get most watched categories
  async getMostWatchedCategories(userId, limit = 5) {
    try {
      const {data, error} = await supabase
        .from('youtube_content_interactions')
        .select('category, time_spent')
        .eq('user_id', userId)
        .not('category', 'is', null)
        .order('created_at', {ascending: false})
        .limit(100);

      if (error) {
        console.error('Error getting most watched categories:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Calculate total time per category
      const categoryTime = data.reduce((acc, item) => {
        if (item.category) {
          acc[item.category] = (acc[item.category] || 0) + item.time_spent;
        }
        return acc;
      }, {});

      // Sort by time spent
      const sortedCategories = Object.entries(categoryTime)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([category, timeSpent]) => ({category, timeSpent}));

      return sortedCategories;
    } catch (error) {
      console.error('Error in getMostWatchedCategories:', error);
      return [];
    }
  },

  // Get recommended content based on user preferences
  async getRecommendedCategories(userId) {
    try {
      const preferences = await this.getMostWatchedCategories(userId, 3);
      
      if (preferences.length === 0) {
        // Return default positive categories if no preferences yet
        return ['motivational', 'meditation', 'wellness'];
      }

      return preferences.map(pref => pref.category);
    } catch (error) {
      console.error('Error in getRecommendedCategories:', error);
      return ['motivational', 'meditation', 'wellness'];
    }
  },

  // Delete old interactions (cleanup)
  async deleteOldInteractions(userId, daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const {error} = await supabase
        .from('youtube_content_interactions')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error deleting old interactions:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteOldInteractions:', error);
      throw error;
    }
  },

  // Get statistics
  async getUserStatistics(userId) {
    try {
      const {data, error} = await supabase
        .from('youtube_content_interactions')
        .select('content_type, time_spent, category')
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting statistics:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          totalVideos: 0,
          totalShorts: 0,
          totalTimeSpent: 0,
          topCategories: [],
        };
      }

      const totalVideos = data.filter(d => d.content_type === 'video').length;
      const totalShorts = data.filter(d => d.content_type === 'short').length;
      const totalTimeSpent = data.reduce((sum, d) => sum + (d.time_spent || 0), 0);

      // Get top 5 categories
      const categoryCount = data.reduce((acc, item) => {
        if (item.category) {
          acc[item.category] = (acc[item.category] || 0) + 1;
        }
        return acc;
      }, {});

      const topCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({category, count}));

      return {
        totalVideos,
        totalShorts,
        totalTimeSpent,
        topCategories,
      };
    } catch (error) {
      console.error('Error in getUserStatistics:', error);
      return {
        totalVideos: 0,
        totalShorts: 0,
        totalTimeSpent: 0,
        topCategories: [],
      };
    }
  },
};
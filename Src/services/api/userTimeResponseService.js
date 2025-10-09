import {supabase} from '../../../supabase';

export const userTimeResponseService = {
  // Create a new user time response
  async createUserTimeResponse(userId, response) {
    try {
      const {data, error} = await supabase
        .from('user_time_responses')
        .insert([
          {
            user_id: userId,
            response: response,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error('Error creating user time response:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in createUserTimeResponse:', error);
      throw error;
    }
  },

  // Get all responses for a user
  async getUserTimeResponses(userId) {
    try {
      const {data, error} = await supabase
        .from('user_time_responses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error fetching user time responses:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserTimeResponses:', error);
      throw error;
    }
  },

  // Get the most recent response for a user
  async getLatestUserTimeResponse(userId) {
    try {
      const {data, error} = await supabase
        .from('user_time_responses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false})
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error fetching latest user time response:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getLatestUserTimeResponse:', error);
      throw error;
    }
  },

  // Update a user time response
  async updateUserTimeResponse(responseId, newResponse) {
    try {
      const {data, error} = await supabase
        .from('user_time_responses')
        .update({
          response: newResponse,
        })
        .eq('id', responseId)
        .select();

      if (error) {
        console.error('Error updating user time response:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateUserTimeResponse:', error);
      throw error;
    }
  },

  // Delete a user time response
  async deleteUserTimeResponse(responseId) {
    try {
      const {error} = await supabase
        .from('user_time_responses')
        .delete()
        .eq('id', responseId);

      if (error) {
        console.error('Error deleting user time response:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteUserTimeResponse:', error);
      throw error;
    }
  },

  // Get response count for a user
  async getUserResponseCount(userId) {
    try {
      const {count, error} = await supabase
        .from('user_time_responses')
        .select('*', {count: 'exact', head: true})
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting user response count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUserResponseCount:', error);
      throw error;
    }
  },
};
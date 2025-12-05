import {supabase} from '../../../supabase';

export const notesService = {
  // Get user's notes (only one note per user in this case)
  async getUserNotes(userId) {
    try {
      const {data, error} = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', {ascending: false})
        .limit(1)
        .single();

      if (error) {
        // If no notes found, return null instead of throwing error
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching notes:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserNotes:', error);
      throw error;
    }
  },

  // Create new notes
  async createNotes(userId, content) {
    try {
      const {data, error} = await supabase
        .from('notes')
        .insert([
          {
            user_id: userId,
            content: content || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating notes:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createNotes:', error);
      throw error;
    }
  },

  // Update existing notes
  async updateNotes(noteId, content) {
    try {
      const {data, error} = await supabase
        .from('notes')
        .update({
          content: content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select()
        .single();

      if (error) {
        console.error('Error updating notes:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateNotes:', error);
      throw error;
    }
  },

  // Save or update notes (smart save)
  async saveNotes(userId, content, noteId = null) {
    try {
      if (noteId) {
        // Update existing notes
        return await this.updateNotes(noteId, content);
      } else {
        // Check if user already has notes
        const existingNotes = await this.getUserNotes(userId);
        
        if (existingNotes) {
          // Update existing notes
          return await this.updateNotes(existingNotes.id, content);
        } else {
          // Create new notes
          return await this.createNotes(userId, content);
        }
      }
    } catch (error) {
      console.error('Error in saveNotes:', error);
      throw error;
    }
  },

  // Delete notes
  async deleteNotes(noteId) {
    try {
      const {error} = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        console.error('Error deleting notes:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteNotes:', error);
      throw error;
    }
  },

  // Clear notes content (set to empty string)
  async clearNotes(noteId) {
    try {
      const {data, error} = await supabase
        .from('notes')
        .update({
          content: '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select()
        .single();

      if (error) {
        console.error('Error clearing notes:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in clearNotes:', error);
      throw error;
    }
  },

  // Get notes statistics
  async getNotesStats(userId) {
    try {
      const notes = await this.getUserNotes(userId);

      if (!notes || !notes.content) {
        return {
          wordCount: 0,
          characterCount: 0,
          lineCount: 0,
          lastUpdated: null,
        };
      }

      const content = notes.content;
      const words = content.trim().split(/\s+/).filter(word => word.length > 0);
      const lines = content.split('\n').filter(line => line.trim().length > 0);

      return {
        wordCount: words.length,
        characterCount: content.length,
        lineCount: lines.length,
        lastUpdated: notes.updated_at,
      };
    } catch (error) {
      console.error('Error in getNotesStats:', error);
      throw error;
    }
  },

  // Format last updated time
  formatLastUpdated(timestamp) {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  },
};
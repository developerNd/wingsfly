// services/api/morningRoutineService.js
import {supabase} from '../../../supabase';

class MorningRoutineService {
  /**
   * Fetch all active voice commands from database
   * Commands are ordered by sequence_order
   * IMPORTANT: Database stores lock_duration and gap_time in SECONDS
   */
  async getVoiceCommands() {
    try {
      console.log('📥 Fetching morning routine voice commands from database...');

      const {data, error} = await supabase
        .from('morning_routine_voice_commands')
        .select('*')
        .order('sequence_order', {ascending: true});

      if (error) {
        console.error('❌ Error fetching voice commands:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ No voice commands found in database');
        return [];
      }

      console.log(`✅ Fetched ${data.length} voice commands from database`);

      // Log each command for debugging
      data.forEach((cmd, index) => {
        console.log(`Command ${index + 1}:`);
        console.log(`  - Text: ${cmd.command_text}`);
        console.log(`  - Lock Duration: ${cmd.lock_duration} seconds (${this.formatSeconds(cmd.lock_duration)})`);
        console.log(`  - Gap Time: ${cmd.gap_time} seconds (${this.formatSeconds(cmd.gap_time)})`);
      });

      // Transform database format to app format
      const transformedCommands = data.map((cmd, index) => ({
        id: cmd.id,
        sequence: index + 1,
        text: cmd.command_text,
        
        // ✅ KEEP IN SECONDS for native Android
        lock_duration_seconds: cmd.lock_duration,
        gap_time_seconds: cmd.gap_time,
        
        // Also include display values
        lock_duration_display: this.formatSeconds(cmd.lock_duration),
        gap_time_display: this.formatSeconds(cmd.gap_time),
      }));

      return transformedCommands;
    } catch (error) {
      console.error('❌ Error in getVoiceCommands:', error);
      throw error;
    }
  }

  /**
   * Get formatted voice commands for native Android
   * Returns commands with durations in SECONDS (as stored in database)
   */
  async getFormattedCommandsForNative() {
    try {
      const commands = await this.getVoiceCommands();

      if (commands.length === 0) {
        console.log('⚠️ No commands available for native module');
        return null;
      }

      console.log('📤 Formatted commands for native Android:');
      commands.forEach((cmd, index) => {
        console.log(`  ${index + 1}. "${cmd.text}"`);
        console.log(`     Lock: ${cmd.lock_duration_seconds}s, Gap: ${cmd.gap_time_seconds}s`);
      });

      return commands;
    } catch (error) {
      console.error('❌ Error formatting commands for native:', error);
      throw error;
    }
  }

  /**
   * Check if morning routine is enabled
   * (Enabled if there are commands in the database)
   */
  async isRoutineEnabled() {
    try {
      const commands = await this.getVoiceCommands();
      const isEnabled = commands.length > 0;

      console.log(`🔍 Morning routine enabled: ${isEnabled}`);
      return isEnabled;
    } catch (error) {
      console.error('❌ Error checking routine status:', error);
      return false;
    }
  }

  /**
   * Get total routine duration (sum of all durations + gaps)
   * Returns duration in seconds
   */
  async getTotalRoutineDuration() {
    try {
      const {data, error} = await supabase
        .from('morning_routine_voice_commands')
        .select('lock_duration, gap_time')
        .order('sequence_order', {ascending: true});

      if (error || !data || data.length === 0) {
        return 0;
      }

      let totalSeconds = 0;

      data.forEach((cmd, index) => {
        // Add lock duration
        totalSeconds += cmd.lock_duration;

        // Add gap time (except for last command)
        if (index < data.length - 1) {
          totalSeconds += cmd.gap_time;
        }
      });

      console.log(`⏱️ Total routine duration: ${totalSeconds} seconds (${this.formatSeconds(totalSeconds)})`);
      return totalSeconds;
    } catch (error) {
      console.error('❌ Error calculating routine duration:', error);
      return 0;
    }
  }

  /**
   * Get routine summary for display
   */
  async getRoutineSummary() {
    try {
      const commands = await this.getVoiceCommands();
      const totalDurationSeconds = await this.getTotalRoutineDuration();
      const isEnabled = commands.length > 0;

      return {
        commandCount: commands.length,
        totalDurationSeconds: totalDurationSeconds,
        totalDurationFormatted: this.formatSeconds(totalDurationSeconds),
        isEnabled: isEnabled,
        commands: commands,
      };
    } catch (error) {
      console.error('❌ Error getting routine summary:', error);
      return {
        commandCount: 0,
        totalDurationSeconds: 0,
        totalDurationFormatted: '0s',
        isEnabled: false,
        commands: [],
      };
    }
  }

  /**
   * Format seconds to human-readable string
   * Examples:
   *   120 seconds → "2m"
   *   90 seconds → "1m 30s"
   *   45 seconds → "45s"
   */
  formatSeconds(totalSeconds) {
    if (totalSeconds <= 0) {
      return '0s';
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0 && seconds > 0) {
      return `${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Convert seconds to minutes (for backward compatibility with old code)
   */
  secondsToMinutes(seconds) {
    return Math.floor(seconds / 60);
  }

  /**
   * Convert minutes to seconds
   */
  minutesToSeconds(minutes) {
    return minutes * 60;
  }
}

export const morningRoutineService = new MorningRoutineService();
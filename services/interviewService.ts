import { supabase } from './supabase';

export const interviewService = {
  /**
   * Checks if the interview feature is globally enabled.
   */
  async isFeatureEnabled(): Promise<boolean> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'interview_enabled')
      .single();

    if (error) {
      console.warn("Error fetching interview settings:", error);
      return false; // Default to blocked if error
    }

    return data?.value === true;
  },

  /**
   * Checks if the user is eligible for an interview (max 1 per month).
   */
  async checkUserEligibility(userId: string): Promise<{ canInterview: boolean; nextDate?: Date }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const { count, error } = await supabase
      .from('interview_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth);

    if (error) {
      console.error("Error checking eligibility:", error);
      return { canInterview: false };
    }

    const hasInterviewed = (count || 0) > 0;

    if (hasInterviewed) {
      // Available next month
      const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { canInterview: false, nextDate };
    }

    return { canInterview: true };
  },

  /**
   * Logs the start of an interview.
   */
  async logInterviewStart(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('interview_logs')
      .insert({ user_id: userId });

    if (error) {
      console.error("Error logging interview:", error);
      return false;
    }
    return true;
  },

  /**
   * ADMIN: Updates the global feature status.
   */
  async setFeatureEnabled(enabled: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'interview_enabled',
        value: enabled,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error updating feature status:", error);
      return false;
    }
    return true;
  },

  /**
   * Fetches the configured widget HTML/JS code.
   */
  async getWidgetCode(): Promise<string> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'interview_widget_code')
      .single();

    if (error || !data) {
      // Fallback to default if missing
      console.warn("Error fetching widget code, using default:", error);
      return '<elevenlabs-convai agent-id="agent_2501ked73ws9fvk9x8dx34tj456r"></elevenlabs-convai><script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>';
    }

    return data.value;
  },

  /**
   * ADMIN: Updates the widget HTML/JS code.
   */
  async setWidgetCode(code: string): Promise<boolean> {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'interview_widget_code',
        value: code,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error updating widget code:", error);
      return false;
    }
    return true;
  },

  /**
   * ADMIN: Deletes the last interview log for a user (Reset attempt).
   */
  async deleteLastInterviewLog(userId: string): Promise<boolean> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    // Delete ALL logs for the current month ensuring user is unblocked
    const { data: deleted, error: deleteError } = await supabase
      .from('interview_logs')
      .delete()
      .eq('user_id', userId)
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)
      .select();

    if (deleteError) {
      console.error("Error deleting interview logs:", deleteError);
      return false;
    }

    if (!deleted || deleted.length === 0) {
      console.warn("Reset operation completed but found 0 logs to delete. Check RLS policies if logs exist.");
    }

    return true;
  }
};

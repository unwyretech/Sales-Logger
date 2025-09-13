import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          color?: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaign_teams: {
        Row: {
          id: string;
          campaign_id: string | null;
          name: string;
          color: string;
          manager_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          name: string;
          color?: string;
          manager_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          name?: string;
          color?: string;
          manager_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          name: string;
          email: string;
          team_id: string | null;
          campaign_team_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          team_id?: string | null;
          campaign_team_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          team_id?: string | null;
          campaign_team_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      call_data: {
        Row: {
          id: string;
          agent_id: string;
          date: string;
          hour: number;
          calls_made: number;
          total_call_time: number;
          sales_made: number;
          campaign_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          date: string;
          hour: number;
          calls_made?: number;
          total_call_time?: number;
          sales_made?: number;
          campaign_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          date?: string;
          hour?: number;
          calls_made?: number;
          total_call_time?: number;
          sales_made?: number;
          campaign_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          full_name: string | null;
          role: string;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email: string;
          full_name?: string | null;
          role?: string;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string;
          full_name?: string | null;
          role?: string;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_permissions: {
        Row: {
          id: string;
          user_id: string | null;
          campaign_id: string | null;
          can_view: boolean;
          can_edit: boolean;
          can_delete: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          campaign_id?: string | null;
          can_view?: boolean;
          can_edit?: boolean;
          can_delete?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          campaign_id?: string | null;
          can_view?: boolean;
          can_edit?: boolean;
          can_delete?: boolean;
          created_at?: string;
        };
      };
      agent_notes: {
        Row: {
          id: string;
          agent_id: string | null;
          note: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id?: string | null;
          note: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string | null;
          note?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
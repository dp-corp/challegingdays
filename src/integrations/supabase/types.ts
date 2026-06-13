export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string;
          description: string | null;
          earned_at: string;
          id: string;
          title: string;
          user_id: string;
        };
        Insert: {
          code: string;
          description?: string | null;
          earned_at?: string;
          id?: string;
          title: string;
          user_id: string;
        };
        Update: {
          code?: string;
          description?: string | null;
          earned_at?: string;
          id?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      finance_entries: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          entry_date: string;
          id: string;
          kind: string;
          note: string | null;
          payment_method: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          category?: string;
          created_at?: string;
          entry_date?: string;
          id?: string;
          kind: string;
          note?: string | null;
          payment_method?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          entry_date?: string;
          id?: string;
          kind?: string;
          note?: string | null;
          payment_method?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      foundation: {
        Row: {
          dream_outcome: string | null;
          one_word: string | null;
          success_headline: string | null;
          updated_at: string;
          user_id: string;
          why_matters: string | null;
        };
        Insert: {
          dream_outcome?: string | null;
          one_word?: string | null;
          success_headline?: string | null;
          updated_at?: string;
          user_id: string;
          why_matters?: string | null;
        };
        Update: {
          dream_outcome?: string | null;
          one_word?: string | null;
          success_headline?: string | null;
          updated_at?: string;
          user_id?: string;
          why_matters?: string | null;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          milestones: Json;
          notes: string | null;
          progress: number;
          start_date: string;
          target_date: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          milestones?: Json;
          notes?: string | null;
          progress?: number;
          start_date?: string;
          target_date?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          milestones?: Json;
          notes?: string | null;
          progress?: number;
          start_date?: string;
          target_date?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      habit_logs: {
        Row: {
          completed: boolean;
          created_at: string;
          habit_id: string;
          id: string;
          log_date: string;
          user_id: string;
        };
        Insert: {
          completed?: boolean;
          created_at?: string;
          habit_id: string;
          id?: string;
          log_date?: string;
          user_id: string;
        };
        Update: {
          completed?: boolean;
          created_at?: string;
          habit_id?: string;
          id?: string;
          log_date?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey";
            columns: ["habit_id"];
            isOneToOne: false;
            referencedRelation: "habits";
            referencedColumns: ["id"];
          },
        ];
      };
      habits: {
        Row: {
          active: boolean;
          category: string;
          created_at: string;
          id: string;
          name: string;
          project_id: string | null;
          sort_order: number;
          target_per_day: number;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          category?: string;
          created_at?: string;
          id?: string;
          name: string;
          project_id?: string | null;
          sort_order?: number;
          target_per_day?: number;
          user_id: string;
        };
        Update: {
          active?: boolean;
          category?: string;
          created_at?: string;
          id?: string;
          name?: string;
          project_id?: string | null;
          sort_order?: number;
          target_per_day?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "habits_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          challenge_start_date: string;
          created_at: string;
          display_name: string | null;
          id: string;
          opening_balance: number;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          challenge_start_date?: string;
          created_at?: string;
          display_name?: string | null;
          id: string;
          opening_balance?: number;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          challenge_start_date?: string;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          opening_balance?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_invites: {
        Row: {
          created_at: string;
          created_by: string;
          expires_at: string | null;
          id: string;
          project_id: string;
          token: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          expires_at?: string | null;
          id?: string;
          project_id: string;
          token: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          expires_at?: string | null;
          id?: string;
          project_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          created_at: string;
          id: string;
          project_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          project_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          project_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string;
          deadline: string | null;
          description: string | null;
          id: string;
          is_recurring: boolean;
          name: string;
          notes: string | null;
          priority: string;
          progress: number;
          shared_completion: boolean;
          status: string;
          target_days: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          deadline?: string | null;
          description?: string | null;
          id?: string;
          is_recurring?: boolean;
          name: string;
          notes?: string | null;
          priority?: string;
          progress?: number;
          shared_completion?: boolean;
          status?: string;
          target_days?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          deadline?: string | null;
          description?: string | null;
          id?: string;
          is_recurring?: boolean;
          name?: string;
          notes?: string | null;
          priority?: string;
          progress?: number;
          shared_completion?: boolean;
          status?: string;
          target_days?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      reflections: {
        Row: {
          ai_summary: string | null;
          biggest_win: string | null;
          challenge: string | null;
          created_at: string;
          gratitude: string | null;
          id: string;
          reflection_date: string;
          tomorrow_focus: string | null;
          user_id: string;
        };
        Insert: {
          ai_summary?: string | null;
          biggest_win?: string | null;
          challenge?: string | null;
          created_at?: string;
          gratitude?: string | null;
          id?: string;
          reflection_date?: string;
          tomorrow_focus?: string | null;
          user_id: string;
        };
        Update: {
          ai_summary?: string | null;
          biggest_win?: string | null;
          challenge?: string | null;
          created_at?: string;
          gratitude?: string | null;
          id?: string;
          reflection_date?: string;
          tomorrow_focus?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      scores: {
        Row: {
          created_at: string;
          daily_score: number;
          goals_score: number;
          habits_score: number;
          health_score: number;
          id: string;
          learning_score: number;
          projects_score: number;
          score_date: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          daily_score?: number;
          goals_score?: number;
          habits_score?: number;
          health_score?: number;
          id?: string;
          learning_score?: number;
          projects_score?: number;
          score_date?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          daily_score?: number;
          goals_score?: number;
          habits_score?: number;
          health_score?: number;
          id?: string;
          learning_score?: number;
          projects_score?: number;
          score_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          priority: string;
          project_id: string | null;
          sort_order: number;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          priority?: string;
          project_id?: string | null;
          sort_order?: number;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          priority?: string;
          project_id?: string | null;
          sort_order?: number;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_reviews: {
        Row: {
          career_accomplishments: string | null;
          challenges: string | null;
          created_at: string;
          energy_level: number | null;
          exercise_days: number | null;
          id: string;
          important_connections: string | null;
          income_earned: number | null;
          lessons: string | null;
          next_week_priorities: string | null;
          savings_added: number | null;
          user_id: string;
          week_start: string;
          weight: number | null;
          wins: string | null;
        };
        Insert: {
          career_accomplishments?: string | null;
          challenges?: string | null;
          created_at?: string;
          energy_level?: number | null;
          exercise_days?: number | null;
          id?: string;
          important_connections?: string | null;
          income_earned?: number | null;
          lessons?: string | null;
          next_week_priorities?: string | null;
          savings_added?: number | null;
          user_id: string;
          week_start: string;
          weight?: number | null;
          wins?: string | null;
        };
        Update: {
          career_accomplishments?: string | null;
          challenges?: string | null;
          created_at?: string;
          energy_level?: number | null;
          exercise_days?: number | null;
          id?: string;
          important_connections?: string | null;
          income_earned?: number | null;
          lessons?: string | null;
          next_week_priorities?: string | null;
          savings_added?: number | null;
          user_id?: string;
          week_start?: string;
          weight?: number | null;
          wins?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_project_member: {
        Args: { _project_id: string; _user_id: string };
        Returns: boolean;
      };
      is_project_owner: {
        Args: { _project_id: string; _user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      challenge_participants: {
        Row: {
          challenge_id: string
          completed_at: string | null
          id: string
          joined_at: string
          local_user_name: string | null
          progress: number
          user_id: string | null
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          id?: string
          joined_at?: string
          local_user_name?: string | null
          progress?: number
          user_id?: string | null
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          id?: string
          joined_at?: string
          local_user_name?: string | null
          progress?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          target_unit: string
          target_value: number
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          target_unit?: string
          target_value?: number
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          target_unit?: string
          target_value?: number
          type?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty: string
          equipment: string
          id: string
          is_compound: boolean
          is_custom: boolean
          muscle_group: string
          name: string
          secondary_muscles: string[] | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          equipment?: string
          id?: string
          is_compound?: boolean
          is_custom?: boolean
          muscle_group: string
          name: string
          secondary_muscles?: string[] | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          equipment?: string
          id?: string
          is_compound?: boolean
          is_custom?: boolean
          muscle_group?: string
          name?: string
          secondary_muscles?: string[] | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          id: string
          level: number
          streak: number
          total_volume: number
          total_workouts: number
          updated_at: string
          user_id: string | null
          username: string
          xp: number
        }
        Insert: {
          id?: string
          level?: number
          streak?: number
          total_volume?: number
          total_workouts?: number
          updated_at?: string
          user_id?: string | null
          username?: string
          xp?: number
        }
        Update: {
          id?: string
          level?: number
          streak?: number
          total_volume?: number
          total_workouts?: number
          updated_at?: string
          user_id?: string | null
          username?: string
          xp?: number
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          age: number
          body_fat: number | null
          created_at: string
          days_per_week: number
          experience: string
          gender: string
          goal: string
          height: number
          id: string
          local_id: string | null
          name: string
          onboarding_complete: boolean
          preferred_split: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          age?: number
          body_fat?: number | null
          created_at?: string
          days_per_week?: number
          experience?: string
          gender?: string
          goal?: string
          height?: number
          id?: string
          local_id?: string | null
          name?: string
          onboarding_complete?: boolean
          preferred_split?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          age?: number
          body_fat?: number | null
          created_at?: string
          days_per_week?: number
          experience?: string
          gender?: string
          goal?: string
          height?: number
          id?: string
          local_id?: string | null
          name?: string
          onboarding_complete?: boolean
          preferred_split?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string
          id: string
          local_id: string | null
          logged_at: string
          user_id: string | null
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          local_id?: string | null
          logged_at?: string
          user_id?: string | null
          weight: number
        }
        Update: {
          created_at?: string
          id?: string
          local_id?: string | null
          logged_at?: string
          user_id?: string | null
          weight?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

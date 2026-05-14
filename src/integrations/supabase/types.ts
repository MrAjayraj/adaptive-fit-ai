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
      achievements: {
        Row: {
          category: string | null
          description: string | null
          id: string
          name: string
          requirement: Json | null
          slug: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          name: string
          requirement?: Json | null
          slug: string
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          name?: string
          requirement?: Json | null
          slug?: string
        }
        Relationships: []
      }
      activity_feed: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          metadata: Json | null
          title: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          title?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_mood_logs: {
        Row: {
          energy_level: number | null
          id: string
          log_date: string
          logged_at: string | null
          mood_score: number
          mood_tags: string[] | null
          note: string | null
          sleep_quality: number | null
          soreness_level: number | null
          stress_level: number | null
          user_id: string | null
        }
        Insert: {
          energy_level?: number | null
          id?: string
          log_date: string
          logged_at?: string | null
          mood_score: number
          mood_tags?: string[] | null
          note?: string | null
          sleep_quality?: number | null
          soreness_level?: number | null
          stress_level?: number | null
          user_id?: string | null
        }
        Update: {
          energy_level?: number | null
          id?: string
          log_date?: string
          logged_at?: string | null
          mood_score?: number
          mood_tags?: string[] | null
          note?: string | null
          sleep_quality?: number | null
          soreness_level?: number | null
          stress_level?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_scores: {
        Row: {
          id: string
          mood: number | null
          mood_score_pct: number | null
          score_date: string
          streak_bonus: number | null
          task_completion_pct: number | null
          total_score: number
          trackers_completed: number | null
          trackers_total: number | null
          user_id: string | null
          workout_bonus: number | null
          workout_completed: boolean | null
          workout_name: string | null
        }
        Insert: {
          id?: string
          mood?: number | null
          mood_score_pct?: number | null
          score_date: string
          streak_bonus?: number | null
          task_completion_pct?: number | null
          total_score: number
          trackers_completed?: number | null
          trackers_total?: number | null
          user_id?: string | null
          workout_bonus?: number | null
          workout_completed?: boolean | null
          workout_name?: string | null
        }
        Update: {
          id?: string
          mood?: number | null
          mood_score_pct?: number | null
          score_date?: string
          streak_bonus?: number | null
          task_completion_pct?: number | null
          total_score?: number
          trackers_completed?: number | null
          trackers_total?: number | null
          user_id?: string | null
          workout_bonus?: number | null
          workout_completed?: boolean | null
          workout_name?: string | null
        }
        Relationships: []
      }
      daily_steps: {
        Row: {
          step_count: number | null
          step_date: string
          user_id: string
        }
        Insert: {
          step_count?: number | null
          step_date?: string
          user_id: string
        }
        Update: {
          step_count?: number | null
          step_date?: string
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          deleted_for_everyone: boolean
          deleted_for_receiver: boolean
          deleted_for_sender: boolean
          id: string
          is_read: boolean
          receiver_id: string
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_for_everyone?: boolean
          deleted_for_receiver?: boolean
          deleted_for_sender?: boolean
          id?: string
          is_read?: boolean
          receiver_id: string
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_for_everyone?: boolean
          deleted_for_receiver?: boolean
          deleted_for_sender?: boolean
          id?: string
          is_read?: boolean
          receiver_id?: string
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notification_log: {
        Row: {
          channel_id: string
          channel_type: string
          id: string
          recipient_id: string
          sent_at: string
        }
        Insert: {
          channel_id: string
          channel_type: string
          id?: string
          recipient_id: string
          sent_at?: string
        }
        Update: {
          channel_id?: string
          channel_type?: string
          id?: string
          recipient_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          body_part: string
          created_at: string | null
          created_by: string | null
          equipment: string
          exercise_category: string | null
          exercise_id: string | null
          exercise_type: string | null
          gif_url: string | null
          id: string
          image_url: string | null
          instructions: string[] | null
          is_custom: boolean | null
          name: string
          primary_muscle: string | null
          secondary_muscles: string[] | null
          target_muscle: string
        }
        Insert: {
          body_part: string
          created_at?: string | null
          created_by?: string | null
          equipment: string
          exercise_category?: string | null
          exercise_id?: string | null
          exercise_type?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          instructions?: string[] | null
          is_custom?: boolean | null
          name: string
          primary_muscle?: string | null
          secondary_muscles?: string[] | null
          target_muscle: string
        }
        Update: {
          body_part?: string
          created_at?: string | null
          created_by?: string | null
          equipment?: string
          exercise_category?: string | null
          exercise_id?: string | null
          exercise_type?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          instructions?: string[] | null
          is_custom?: boolean | null
          name?: string
          primary_muscle?: string | null
          secondary_muscles?: string[] | null
          target_muscle?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string | null
          id: string
          requester_id: string
          status: string | null
        }
        Insert: {
          addressee_id: string
          created_at?: string | null
          id?: string
          requester_id: string
          status?: string | null
        }
        Update: {
          addressee_id?: string
          created_at?: string | null
          id?: string
          requester_id?: string
          status?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          created_at: string
          group_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          invite_code: string | null
          is_public: boolean | null
          max_members: number | null
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean | null
          max_members?: number | null
          name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean | null
          max_members?: number | null
          name?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          digest_mode: boolean
          email_dm_notify: boolean
          email_group_notify: boolean
          quiet_from: number | null
          quiet_to: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          digest_mode?: boolean
          email_dm_notify?: boolean
          email_group_notify?: boolean
          quiet_from?: number | null
          quiet_to?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          digest_mode?: boolean
          email_dm_notify?: boolean
          email_group_notify?: boolean
          quiet_from?: number | null
          quiet_to?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          ref_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          ref_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          ref_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      old_personal_records: {
        Row: {
          exercise: string
          id: string
          notes: string | null
          set_at: string
          unit: string
          user_id: string
          value: number
          workout_id: string | null
        }
        Insert: {
          exercise: string
          id?: string
          notes?: string | null
          set_at?: string
          unit?: string
          user_id: string
          value: number
          workout_id?: string | null
        }
        Update: {
          exercise?: string
          id?: string
          notes?: string | null
          set_at?: string
          unit?: string
          user_id?: string
          value?: number
          workout_id?: string | null
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string | null
          exercise_id: string | null
          id: string
          record_type: string | null
          user_id: string | null
          value: number | null
          workout_session_id: string | null
        }
        Insert: {
          achieved_at?: string | null
          exercise_id?: string | null
          id?: string
          record_type?: string | null
          user_id?: string | null
          value?: number | null
          workout_session_id?: string | null
        }
        Update: {
          achieved_at?: string | null
          exercise_id?: string | null
          id?: string
          record_type?: string | null
          user_id?: string | null
          value?: number | null
          workout_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string | null
          exercises: Json
          folder: string | null
          id: string
          is_public: boolean | null
          last_performed_at: string | null
          name: string
          notes: string | null
          times_performed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exercises?: Json
          folder?: string | null
          id?: string
          is_public?: boolean | null
          last_performed_at?: string | null
          name: string
          notes?: string | null
          times_performed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          exercises?: Json
          folder?: string | null
          id?: string
          is_public?: boolean | null
          last_performed_at?: string | null
          name?: string
          notes?: string | null
          times_performed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seasonal_challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          id: string
          progress: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "seasonal_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_challenges: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          season: string
          started_at: string | null
          target: number
          title: string
          unit: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          season: string
          started_at?: string | null
          target?: number
          title: string
          unit?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          season?: string
          started_at?: string | null
          target?: number
          title?: string
          unit?: string
        }
        Relationships: []
      }
      session_logs: {
        Row: {
          id: string
          intensity: string | null
          notes: string | null
          reps: number
          session_id: string
          sets: number | null
          technique_id: string
          training_type: string | null
          user_id: string
        }
        Insert: {
          id?: string
          intensity?: string | null
          notes?: string | null
          reps: number
          session_id: string
          sets?: number | null
          technique_id: string
          training_type?: string | null
          user_id: string
        }
        Update: {
          id?: string
          intensity?: string | null
          notes?: string | null
          reps?: number
          session_id?: string
          sets?: number | null
          technique_id?: string
          training_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_routines: {
        Row: {
          clone_count: number | null
          created_at: string | null
          exercise_count: number | null
          friend_id: string | null
          id: string
          message: string | null
          routine_exercises: Json | null
          routine_id: string | null
          routine_name: string
          share_type: string | null
          shared_by: string
          sharer_avatar: string | null
          sharer_name: string | null
        }
        Insert: {
          clone_count?: number | null
          created_at?: string | null
          exercise_count?: number | null
          friend_id?: string | null
          id?: string
          message?: string | null
          routine_exercises?: Json | null
          routine_id?: string | null
          routine_name: string
          share_type?: string | null
          shared_by: string
          sharer_avatar?: string | null
          sharer_name?: string | null
        }
        Update: {
          clone_count?: number | null
          created_at?: string | null
          exercise_count?: number | null
          friend_id?: string | null
          id?: string
          message?: string | null
          routine_exercises?: Json | null
          routine_id?: string | null
          routine_name?: string
          share_type?: string | null
          shared_by?: string
          sharer_avatar?: string | null
          sharer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_routines_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_workout_cards: {
        Row: {
          card_data: Json | null
          created_at: string | null
          id: string
          share_token: string | null
          user_id: string
          view_count: number | null
          workout_id: string | null
        }
        Insert: {
          card_data?: Json | null
          created_at?: string | null
          id?: string
          share_token?: string | null
          user_id: string
          view_count?: number | null
          workout_id?: string | null
        }
        Update: {
          card_data?: Json | null
          created_at?: string | null
          id?: string
          share_token?: string | null
          user_id?: string
          view_count?: number | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_workout_cards_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          icon_name: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          icon_name: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          icon_name?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      technique_categories: {
        Row: {
          display_order: number
          id: string
          name: string
          sport_id: string
        }
        Insert: {
          display_order?: number
          id?: string
          name: string
          sport_id: string
        }
        Update: {
          display_order?: number
          id?: string
          name?: string
          sport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technique_categories_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      technique_progress: {
        Row: {
          id: string
          last_logged_at: string | null
          mastery_level: number | null
          technique_id: string
          total_reps: number | null
          user_id: string
        }
        Insert: {
          id?: string
          last_logged_at?: string | null
          mastery_level?: number | null
          technique_id: string
          total_reps?: number | null
          user_id: string
        }
        Update: {
          id?: string
          last_logged_at?: string | null
          mastery_level?: number | null
          technique_id?: string
          total_reps?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technique_progress_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      techniques: {
        Row: {
          category_id: string
          coaching_points: string[] | null
          common_mistakes: string[] | null
          created_at: string | null
          description: string | null
          difficulty: number
          id: string
          mastery_thresholds: Json | null
          name: string
          slug: string
          unlock_requirements: Json | null
        }
        Insert: {
          category_id: string
          coaching_points?: string[] | null
          common_mistakes?: string[] | null
          created_at?: string | null
          description?: string | null
          difficulty?: number
          id?: string
          mastery_thresholds?: Json | null
          name: string
          slug: string
          unlock_requirements?: Json | null
        }
        Update: {
          category_id?: string
          coaching_points?: string[] | null
          common_mistakes?: string[] | null
          created_at?: string | null
          description?: string | null
          difficulty?: number
          id?: string
          mastery_thresholds?: Json | null
          name?: string
          slug?: string
          unlock_requirements?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "techniques_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "technique_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_completions: {
        Row: {
          completed_at: string | null
          completion_date: string
          current_value: number | null
          id: string
          is_completed: boolean | null
          tracker_id: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_date: string
          current_value?: number | null
          id?: string
          is_completed?: boolean | null
          tracker_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_date?: string
          current_value?: number | null
          id?: string
          is_completed?: boolean | null
          tracker_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracker_completions_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "tracker_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_items: {
        Row: {
          category: string
          color: string
          created_at: string | null
          icon: string
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          recurrence_days: number[] | null
          recurrence_type: string | null
          sort_order: number | null
          target_value: number
          title: string
          tracker_type: string
          unit: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          color: string
          created_at?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          recurrence_days?: number[] | null
          recurrence_type?: string | null
          sort_order?: number | null
          target_value: number
          title: string
          tracker_type: string
          unit?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          recurrence_days?: number[] | null
          recurrence_type?: string | null
          sort_order?: number | null
          target_value?: number
          title?: string
          tracker_type?: string
          unit?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          notes: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_slug: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_slug: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_slug?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_slug_fkey"
            columns: ["achievement_slug"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["slug"]
          },
        ]
      }
      user_fighter_profiles: {
        Row: {
          experience_level: string | null
          id: string
          onboarding_complete: boolean | null
          primary_sport_slug: string | null
          stance: string | null
          streak_current: number | null
          streak_last_logged_date: string | null
          streak_longest: number | null
          streak_shield_last_used_at: string | null
          streak_shields_available: number | null
          user_id: string
        }
        Insert: {
          experience_level?: string | null
          id?: string
          onboarding_complete?: boolean | null
          primary_sport_slug?: string | null
          stance?: string | null
          streak_current?: number | null
          streak_last_logged_date?: string | null
          streak_longest?: number | null
          streak_shield_last_used_at?: string | null
          streak_shields_available?: number | null
          user_id: string
        }
        Update: {
          experience_level?: string | null
          id?: string
          onboarding_complete?: boolean | null
          primary_sport_slug?: string | null
          stance?: string | null
          streak_current?: number | null
          streak_last_logged_date?: string | null
          streak_longest?: number | null
          streak_shield_last_used_at?: string | null
          streak_shields_available?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_gamification: {
        Row: {
          achievements: Json | null
          completed_mission_ids: string[] | null
          current_streak: number | null
          last_workout_date: string | null
          level: number | null
          longest_streak: number | null
          prs: Json | null
          streak_freeze_used: boolean | null
          total_steps: number | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          achievements?: Json | null
          completed_mission_ids?: string[] | null
          current_streak?: number | null
          last_workout_date?: string | null
          level?: number | null
          longest_streak?: number | null
          prs?: Json | null
          streak_freeze_used?: boolean | null
          total_steps?: number | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          achievements?: Json | null
          completed_mission_ids?: string[] | null
          current_streak?: number | null
          last_workout_date?: string | null
          level?: number | null
          longest_streak?: number | null
          prs?: Json | null
          streak_freeze_used?: boolean | null
          total_steps?: number | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          avatar_url: string | null
          bio: string | null
          body_fat: number | null
          created_at: string | null
          days_per_week: number | null
          experience: string | null
          gender: string | null
          goal: string | null
          goal_weight_kg: number | null
          height: number | null
          id: string
          name: string | null
          onboarding_complete: boolean | null
          preferred_split: string | null
          updated_at: string | null
          user_id: string
          username: string | null
          weight: number | null
          workout_days: number[] | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          body_fat?: number | null
          created_at?: string | null
          days_per_week?: number | null
          experience?: string | null
          gender?: string | null
          goal?: string | null
          goal_weight_kg?: number | null
          height?: number | null
          id?: string
          name?: string | null
          onboarding_complete?: boolean | null
          preferred_split?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          weight?: number | null
          workout_days?: number[] | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          body_fat?: number | null
          created_at?: string | null
          days_per_week?: number | null
          experience?: string | null
          gender?: string | null
          goal?: string | null
          goal_weight_kg?: number | null
          height?: number | null
          id?: string
          name?: string | null
          onboarding_complete?: boolean | null
          preferred_split?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          weight?: number | null
          workout_days?: number[] | null
        }
        Relationships: []
      }
      user_ranks: {
        Row: {
          division: number | null
          rp: number | null
          season_id: string
          tier: string | null
          user_id: string
        }
        Insert: {
          division?: number | null
          rp?: number | null
          season_id: string
          tier?: string | null
          user_id: string
        }
        Update: {
          division?: number | null
          rp?: number | null
          season_id?: string
          tier?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string | null
          id: string
          logged_at: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          logged_at?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string | null
          id?: string
          logged_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      workout_programs: {
        Row: {
          created_at: string | null
          created_by: string | null
          days_per_week: number | null
          description: string | null
          difficulty: string | null
          duration_weeks: number | null
          goal: string | null
          id: string
          image_url: string | null
          is_system: boolean | null
          name: string
          routines: Json
          split_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          days_per_week?: number | null
          description?: string | null
          difficulty?: string | null
          duration_weeks?: number | null
          goal?: string | null
          id?: string
          image_url?: string | null
          is_system?: boolean | null
          name: string
          routines?: Json
          split_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          days_per_week?: number | null
          description?: string | null
          difficulty?: string | null
          duration_weeks?: number | null
          goal?: string | null
          id?: string
          image_url?: string | null
          is_system?: boolean | null
          name?: string
          routines?: Json
          split_type?: string | null
        }
        Relationships: []
      }
      workout_sets: {
        Row: {
          exercise_id: string | null
          id: string
          is_warmup: boolean | null
          logged_at: string | null
          reps: number | null
          set_number: number | null
          user_id: string | null
          weight_kg: number | null
          workout_session_id: string | null
        }
        Insert: {
          exercise_id?: string | null
          id?: string
          is_warmup?: boolean | null
          logged_at?: string | null
          reps?: number | null
          set_number?: number | null
          user_id?: string | null
          weight_kg?: number | null
          workout_session_id?: string | null
        }
        Update: {
          exercise_id?: string | null
          id?: string
          is_warmup?: boolean | null
          logged_at?: string | null
          reps?: number | null
          set_number?: number | null
          user_id?: string | null
          weight_kg?: number | null
          workout_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          calories_burned: number | null
          completed: boolean
          created_at: string | null
          date: string
          duration: number | null
          ended_at: string | null
          exercises: Json | null
          id: string
          intensity: string | null
          name: string
          notes: string | null
          pr_count: number | null
          program_id: string | null
          rating: number | null
          routine_id: string | null
          split_type: string | null
          started_at: string | null
          status: string | null
          total_reps: number | null
          total_sets: number | null
          total_volume_kg: number | null
          updated_at: string | null
          user_id: string
          workout_type: string | null
        }
        Insert: {
          calories_burned?: number | null
          completed?: boolean
          created_at?: string | null
          date: string
          duration?: number | null
          ended_at?: string | null
          exercises?: Json | null
          id?: string
          intensity?: string | null
          name: string
          notes?: string | null
          pr_count?: number | null
          program_id?: string | null
          rating?: number | null
          routine_id?: string | null
          split_type?: string | null
          started_at?: string | null
          status?: string | null
          total_reps?: number | null
          total_sets?: number | null
          total_volume_kg?: number | null
          updated_at?: string | null
          user_id: string
          workout_type?: string | null
        }
        Update: {
          calories_burned?: number | null
          completed?: boolean
          created_at?: string | null
          date?: string
          duration?: number | null
          ended_at?: string | null
          exercises?: Json | null
          id?: string
          intensity?: string | null
          name?: string
          notes?: string | null
          pr_count?: number | null
          program_id?: string | null
          rating?: number | null
          routine_id?: string | null
          split_type?: string | null
          started_at?: string | null
          status?: string | null
          total_reps?: number | null
          total_sets?: number | null
          total_volume_kg?: number | null
          updated_at?: string | null
          user_id?: string
          workout_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      exercise_progress_view: {
        Row: {
          estimated_1rm: number | null
          exercise_id: string | null
          exercise_name: string | null
          max_weight: number | null
          primary_muscle: string | null
          session_count: number | null
          total_volume: number | null
          user_id: string | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      muscle_volume_daily_view: {
        Row: {
          day_start: string | null
          frequency: number | null
          last_trained_at: string | null
          muscle_group: string | null
          user_id: string | null
          volume: number | null
        }
        Relationships: []
      }
      muscle_volume_view: {
        Row: {
          frequency: number | null
          muscle: string | null
          user_id: string | null
          volume: number | null
          week_start: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bulk_insert_exercises: { Args: { payload: Json }; Returns: undefined }
      notify_user: {
        Args: {
          p_actor_id: string
          p_message: string
          p_ref_id: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      was_email_sent_recently: {
        Args: {
          p_channel_id: string
          p_minutes?: number
          p_recipient_id: string
        }
        Returns: boolean
      }
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

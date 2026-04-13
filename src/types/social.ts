// src/types/social.ts

export interface UserProfileSummary {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  goal: string | null;
  level?: number;
  rank_tier?: string;
  rank_division?: number;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
  // Joined profile of the other user
  friend_profile?: UserProfileSummary;
}

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  activity_type:
    | 'workout_completed'
    | 'pr_set'
    | 'rank_up'
    | 'achievement_unlocked'
    | 'streak_milestone'
    | 'challenge_joined';
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
  // Joined
  user_profile?: UserProfileSummary;
  reactions?: ActivityReaction[];
  reaction_count?: number;
  user_has_reacted?: boolean;
}

export interface ActivityReaction {
  id: string;
  activity_id: string;
  user_id: string;
  reaction_type: 'kudos' | 'fire' | 'clap';
  created_at: string;
}

export type ReactionType = 'kudos' | 'fire' | 'clap';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  invite_code: string;
  is_public: boolean;
  max_members: number;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  profile?: UserProfileSummary;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_profile?: UserProfileSummary;
}

export interface SharedWorkoutCard {
  id: string;
  user_id: string;
  workout_id: string | null;
  card_data: {
    name: string;
    duration_min: number;
    total_volume: number;
    exercises: Array<{ name: string; sets: number; best_weight: number }>;
    pr_count: number;
    rank_tier: string;
    rank_division: number;
    user_name: string;
    date: string;
  };
  share_token: string;
  view_count: number;
  created_at: string;
}

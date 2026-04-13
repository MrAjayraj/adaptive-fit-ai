// src/hooks/useActivityFeed.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { ActivityFeedItem, ReactionType } from '@/types/social';
import type { Workout } from '@/types/fitness';

const PAGE_SIZE = 20;

interface UseActivityFeedReturn {
  feed: ActivityFeedItem[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  postWorkoutActivity: (workout: Workout) => Promise<void>;
  toggleReaction: (activityId: string, reactionType: ReactionType) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as never) as any;

export function useActivityFeed(): UseActivityFeedReturn {
  const { user } = useAuth();
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(0);

  const fetchPage = useCallback(async (page: number): Promise<ActivityFeedItem[]> => {
    if (!user) return [];

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: rows, error: fetchError } = await db('activity_feed')
      .select(
        '*, user_profile:user_profiles(user_id,name,username,avatar_url,rank_tier,rank_division,level), reactions:activity_reactions(*)'
      )
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (fetchError) {
      console.error('[useActivityFeed] fetch error:', fetchError);
      // Surface a user-readable error
      if (fetchError.code === '42P01') {
        throw new Error('Social tables are not set up yet. Please run the database migration in Supabase.');
      }
      throw new Error(fetchError.message);
    }

    return ((rows ?? []) as Record<string, unknown>[]).map((row) => {
      const reactions = (row.reactions as ActivityFeedItem['reactions']) ?? [];
      const userReaction = reactions?.find((r) => r.user_id === user.id);
      return {
        id: row.id as string,
        user_id: row.user_id as string,
        activity_type: row.activity_type as ActivityFeedItem['activity_type'],
        title: row.title as string,
        description: (row.description as string | null) ?? null,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
        is_public: row.is_public as boolean,
        created_at: row.created_at as string,
        user_profile: row.user_profile as ActivityFeedItem['user_profile'],
        reactions,
        reaction_count: reactions?.length ?? 0,
        user_has_reacted: !!userReaction,
      };
    });
  }, [user]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    pageRef.current = 0;
    try {
      const items = await fetchPage(0);
      setFeed(items);
      setHasMore(items.length === PAGE_SIZE);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load feed';
      setError(msg);
      setFeed([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    setIsLoading(true);
    try {
      const nextPage = pageRef.current + 1;
      const items = await fetchPage(nextPage);
      if (items.length > 0) {
        pageRef.current = nextPage;
        setFeed((prev) => [...prev, ...items]);
      }
      setHasMore(items.length === PAGE_SIZE);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load more';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, fetchPage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('activity-feed-realtime')
      .on('postgres_changes' as never, { event: 'INSERT', schema: 'public', table: 'activity_feed' }, () => {
        load();
      })
      .on('postgres_changes' as never, { event: '*', schema: 'public', table: 'activity_reactions' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const postWorkoutActivity = useCallback(async (workout: Workout) => {
    if (!user) return;

    const totalVolume = workout.exercises.reduce(
      (acc, ex) => acc + ex.sets.reduce((s, set) => s + (set.completed ? set.weight * set.reps : 0), 0),
      0
    );

    const { error: insertError } = await db('activity_feed').insert({
      user_id: user.id,
      activity_type: 'workout_completed',
      title: `Completed ${workout.name}`,
      description: `${workout.exercises.length} exercises · ${Math.round(workout.duration ?? 0)} min · ${Math.round(totalVolume)} kg total volume`,
      metadata: {
        workout_id: workout.id,
        exercise_count: workout.exercises.length,
        duration_min: workout.duration ?? 0,
        total_volume: totalVolume,
      },
      is_public: true,
    });

    if (insertError) console.error('[useActivityFeed] postWorkoutActivity error:', insertError);
    else await load();
  }, [user, load]);

  const toggleReaction = useCallback(async (activityId: string, reactionType: ReactionType) => {
    if (!user) return;

    const { data: existing } = await db('activity_reactions')
      .select('id,reaction_type')
      .eq('activity_id', activityId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing && existing.reaction_type === reactionType) {
      await db('activity_reactions').delete().eq('id', existing.id);
    } else {
      if (existing) {
        await db('activity_reactions').delete().eq('id', existing.id);
      }
      await db('activity_reactions').insert({
        activity_id: activityId,
        user_id: user.id,
        reaction_type: reactionType,
      });
    }

    await load();
  }, [user, load]);

  return { feed, isLoading, hasMore, error, loadMore, postWorkoutActivity, toggleReaction };
}

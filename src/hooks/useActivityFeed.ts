// src/hooks/useActivityFeed.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { ActivityFeedItem, ReactionType } from '@/types/social';
import type { Workout } from '@/types/fitness';
import { fetchFeedPage, postActivity, toggleReaction as svcToggleReaction } from '@/services/socialService';

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

export function useActivityFeed(): UseActivityFeedReturn {
  const { user } = useAuth();
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(0);
  const loadRef = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    pageRef.current = 0;
    try {
      const items = await fetchFeedPage(user.id, 0);
      setFeed(items);
      setHasMore(items.length === PAGE_SIZE);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load feed';
      console.error('[useActivityFeed] load error:', msg);
      setError(msg);
      setFeed([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || !user) return;
    setIsLoading(true);
    try {
      const nextPage = pageRef.current + 1;
      const items = await fetchFeedPage(user.id, nextPage);
      if (items.length > 0) {
        pageRef.current = nextPage;
        setFeed((prev) => [...prev, ...items]);
      }
      setHasMore(items.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, user]);

  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { load(); }, [load]);

  // Realtime subscription for new feed items
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`activity-feed:${user.id}`)
      .on('postgres_changes' as never, { event: 'INSERT', schema: 'public', table: 'activity_feed' }, () => {
        loadRef.current?.();
      })
      .on('postgres_changes' as never, { event: '*', schema: 'public', table: 'activity_reactions' }, () => {
        loadRef.current?.();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const postWorkoutActivity = useCallback(async (workout: Workout) => {
    if (!user) return;
    const totalVolume = workout.exercises.reduce(
      (acc, ex) => acc + ex.sets.reduce((s, set) => s + (set.completed ? set.weight * set.reps : 0), 0),
      0
    );
    await postActivity(
      user.id,
      'workout_completed',
      `Completed ${workout.name}`,
      `${workout.exercises.length} exercises · ${Math.round(workout.duration ?? 0)} min · ${Math.round(totalVolume)} kg total volume`,
      {
        workout_id: workout.id,
        exercise_count: workout.exercises.length,
        duration_min: workout.duration ?? 0,
        total_volume: totalVolume,
      }
    );
    await load();
  }, [user, load]);

  const toggleReaction = useCallback(async (activityId: string, reactionType: ReactionType) => {
    if (!user) return;
    await svcToggleReaction(user.id, activityId, reactionType);
    await load();
  }, [user, load]);

  return { feed, isLoading, hasMore, error, loadMore, postWorkoutActivity, toggleReaction };
}

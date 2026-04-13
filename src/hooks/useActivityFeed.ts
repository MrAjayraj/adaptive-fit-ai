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
  const loadRef = useRef<(() => Promise<void>) | null>(null);

  const fetchPage = useCallback(async (page: number): Promise<ActivityFeedItem[]> => {
    if (!user) return [];

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // ── STEP 1: fetch activity_feed rows + reactions (no user_profiles join) ──
    const { data: rows, error: fetchError } = await db('activity_feed')
      .select('*, reactions:activity_reactions(*)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (fetchError) {
      console.error('[useActivityFeed] fetch error:', fetchError);
      throw new Error(`[${fetchError.code ?? 'ERR'}] ${fetchError.message}`);
    }

    const rawRows = (rows ?? []) as Array<Record<string, unknown>>;

    // ── STEP 2: collect unique poster user_ids ─────────────────────────────
    const posterIds = [...new Set(rawRows.map((r) => r.user_id as string))];

    // ── STEP 3: bulk-fetch profiles in one query ───────────────────────────
    let profileMap = new Map<string, ActivityFeedItem['user_profile']>();
    if (posterIds.length > 0) {
      const { data: profiles, error: profileErr } = await db('user_profiles')
        .select('user_id,name,username,avatar_url,rank_tier,rank_division,level')
        .in('user_id', posterIds);

      if (profileErr) {
        console.error('[useActivityFeed] profile fetch error:', profileErr);
        // Non-fatal — feed still renders without avatars
      } else {
        for (const p of (profiles ?? []) as Array<ActivityFeedItem['user_profile']>) {
          if (p) profileMap.set((p as { user_id: string }).user_id, p);
        }
      }
    }

    // ── STEP 4: merge ──────────────────────────────────────────────────────
    return rawRows.map((row) => {
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
        user_profile: profileMap.get(row.user_id as string),
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

  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const channelName = `activity-feed:${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes' as never, { event: 'INSERT', schema: 'public', table: 'activity_feed' }, () => {
        loadRef.current?.();
      })
      .on('postgres_changes' as never, { event: '*', schema: 'public', table: 'activity_reactions' }, () => {
        loadRef.current?.();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (existing) await db('activity_reactions').delete().eq('id', existing.id);
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

// src/components/social/ActivityFeedView.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import type { ActivityFeedItem, ReactionType } from '@/types/social';
import { Dumbbell, Flame, Trophy, Star, TrendingUp, Zap, Heart, Users, AlertCircle } from 'lucide-react';

const REACTION_CONFIG: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'kudos', emoji: '👏', label: 'Kudos' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'clap', emoji: '👐', label: 'Clap' },
];

const ACTIVITY_ICONS: Record<ActivityFeedItem['activity_type'], React.ReactNode> = {
  workout_completed: <Dumbbell size={16} />,
  pr_set: <TrendingUp size={16} />,
  rank_up: <Star size={16} />,
  achievement_unlocked: <Trophy size={16} />,
  streak_milestone: <Flame size={16} />,
  challenge_joined: <Zap size={16} />,
};

const ACTIVITY_COLORS: Record<ActivityFeedItem['activity_type'], string> = {
  workout_completed: '#00E676',
  pr_set: '#F59E0B',
  rank_up: '#A78BFA',
  achievement_unlocked: '#FB923C',
  streak_milestone: '#EF4444',
  challenge_joined: '#38BDF8',
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function Avatar({ src, name }: { src: string | null | undefined; name: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-[#1E2330] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#00E676]">
      {initials}
    </div>
  );
}

function FeedCard({
  item,
  index,
  onReact,
}: {
  item: ActivityFeedItem;
  index: number;
  onReact: (id: string, type: ReactionType) => void;
}) {
  const color = ACTIVITY_COLORS[item.activity_type] ?? '#00E676';
  const icon = ACTIVITY_ICONS[item.activity_type];
  const profile = item.user_profile;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.05, 0.35) }}
      className="bg-surface-1 border border-border rounded-[20px] p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar src={profile?.avatar_url} name={profile?.name ?? 'User'} />
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <span className="text-black">{icon}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-text-1 truncate">{profile?.name ?? 'Unknown'}</p>
          <p className="text-[11px] text-text-3">{timeAgo(item.created_at)}</p>
        </div>
      </div>

      {/* Content */}
      <div>
        <p className="text-[14px] font-medium text-text-1">{item.title}</p>
        {item.description && (
          <p className="text-[13px] text-text-2 mt-0.5 leading-relaxed">{item.description}</p>
        )}
      </div>

      {/* Reactions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
        {REACTION_CONFIG.map(({ type, emoji, label }) => {
          const count = item.reactions?.filter((r) => r.reaction_type === type).length ?? 0;
          const active = item.reactions?.some(
            (r) => r.reaction_type === type && item.user_has_reacted
          );
          return (
            <button
              key={type}
              onClick={() => onReact(item.id, type)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] text-[13px] transition-colors ${
                active
                  ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
                  : 'bg-surface-2 text-text-2 border border-transparent hover:border-border hover:text-text-1'
              }`}
            >
              <span className="text-[14px]">{emoji}</span>
              <span>{label}</span>
              {count > 0 && (
                <span className={`text-[11px] font-bold ${active ? 'text-primary' : 'text-text-3'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function ActivityFeedView() {
  const { feed, isLoading, hasMore, error, loadMore, toggleReaction } = useActivityFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleReact = useCallback(
    (activityId: string, type: ReactionType) => {
      toggleReaction(activityId, type).catch(console.error);
    },
    [toggleReaction]
  );

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  if (isLoading && feed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-[13px] text-text-3">Loading feed…</p>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="py-12 px-4 flex flex-col items-center gap-4 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <div>
          <p className="text-[17px] font-semibold text-text-1">Social Feed Unavailable</p>
          <p className="text-[13px] text-text-2 mt-1 leading-relaxed max-w-xs">{error}</p>
        </div>
        {error.includes('migration') && (
          <div className="bg-surface-1 border border-border rounded-[16px] p-4 text-left text-[12px] text-text-2 max-w-sm w-full">
            <p className="font-semibold text-text-1 mb-2">📋 Action Required</p>
            <p>Go to your <span className="text-primary font-semibold">Supabase Dashboard → SQL Editor</span> and run the migration file:</p>
            <code className="block mt-2 bg-surface-2 rounded px-2 py-1 text-[11px] text-primary break-all">
              supabase/migrations/20260413000000_workouts_integrity_social.sql
            </code>
          </div>
        )}
      </motion.div>
    );
  }

  if (feed.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="py-16 flex flex-col items-center gap-4 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Users size={28} className="text-primary" />
        </div>
        <div>
          <p className="text-[17px] font-semibold text-text-1">Nothing here yet</p>
          <p className="text-[14px] text-text-2 mt-1">Follow friends to see their activity</p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-text-3">
          <Heart size={13} className="text-primary" />
          <span>Complete a workout to share your progress</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {feed.map((item, index) => (
        <FeedCard key={item.id} item={item} index={index} onReact={handleReact} />
      ))}

      <div ref={sentinelRef} />

      {isLoading && feed.length > 0 && (
        <div className="py-4 flex justify-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!hasMore && feed.length > 0 && (
        <p className="text-[12px] text-text-3 text-center py-4">You're all caught up</p>
      )}
    </div>
  );
}

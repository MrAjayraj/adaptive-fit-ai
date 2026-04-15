// src/components/social/ActivityFeedView.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import type { ActivityFeedItem, ReactionType } from '@/types/social';
import {
  Dumbbell, Flame, Trophy, Star, TrendingUp, Zap,
  Heart, Users, AlertCircle, Sparkles,
} from 'lucide-react';

// ─── Config ─────────────────────────────────────────────────────────────────

const REACTION_CONFIG: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'kudos', emoji: '👏', label: 'Kudos' },
  { type: 'fire',  emoji: '🔥', label: 'Fire' },
  { type: 'clap',  emoji: '⚡', label: 'Hype' },
];

const ACTIVITY_META: Record<
  ActivityFeedItem['activity_type'],
  { icon: React.ReactNode; color: string; glow: string; label: string }
> = {
  workout_completed: {
    icon: <Dumbbell size={13} />,
    color: '#00E676',
    glow: 'rgba(0,230,118,0.3)',
    label: 'Workout',
  },
  pr_set: {
    icon: <TrendingUp size={13} />,
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.3)',
    label: 'New PR',
  },
  rank_up: {
    icon: <Star size={13} />,
    color: '#A78BFA',
    glow: 'rgba(167,139,250,0.3)',
    label: 'Ranked Up',
  },
  achievement_unlocked: {
    icon: <Trophy size={13} />,
    color: '#FB923C',
    glow: 'rgba(251,146,60,0.3)',
    label: 'Achievement',
  },
  streak_milestone: {
    icon: <Flame size={13} />,
    color: '#EF4444',
    glow: 'rgba(239,68,68,0.3)',
    label: 'Streak',
  },
  challenge_joined: {
    icon: <Zap size={13} />,
    color: '#38BDF8',
    glow: 'rgba(56,189,248,0.3)',
    label: 'Challenge',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function stringToGradient(name: string): string {
  const gradients = [
    'linear-gradient(135deg, #00E676, #1DE9B6)',
    'linear-gradient(135deg, #F59E0B, #F97316)',
    'linear-gradient(135deg, #A78BFA, #EC4899)',
    'linear-gradient(135deg, #38BDF8, #6366F1)',
    'linear-gradient(135deg, #EF4444, #F97316)',
    'linear-gradient(135deg, #34D399, #06B6D4)',
  ];
  const idx = name.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Avatar({ src, name, size = 'md' }: { src?: string | null; name: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-11 h-11 text-sm';
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${dim} rounded-full object-cover flex-shrink-0 ring-2 ring-white/5`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-black`}
      style={{ background: stringToGradient(name) }}
    >
      {initials}
    </div>
  );
}

function ActivityBadge({ type }: { type: ActivityFeedItem['activity_type'] }) {
  const meta = ACTIVITY_META[type];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{
        background: `${meta.color}18`,
        color: meta.color,
        border: `1px solid ${meta.color}30`,
      }}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

function ReactionButton({
  emoji,
  label,
  count,
  active,
  onClick,
}: {
  emoji: string;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-200 ${
        active
          ? 'text-white border border-white/20'
          : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10 hover:text-white/70'
      }`}
      style={active ? { background: 'linear-gradient(135deg,rgba(245,197,24,0.25),rgba(245,197,24,0.1))', borderColor: 'rgba(245,197,24,0.3)' } : {}}
    >
      <span className="text-[14px] leading-none">{emoji}</span>
      <span>{label}</span>
      {count > 0 && (
        <span className={`text-[11px] font-extrabold tabular-nums ${active ? 'text-[#F5C518]' : 'text-white/30'}`}>
          {count}
        </span>
      )}
    </motion.button>
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
  const meta = ACTIVITY_META[item.activity_type] ?? ACTIVITY_META.workout_completed;
  const profile = item.user_profile;
  const name = profile?.name ?? 'Unknown';

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.06, 0.4) }}
      className="relative overflow-hidden rounded-[22px] border border-white/8"
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Subtle glow accent top-left */}
      <div
        className="absolute -top-6 -left-6 w-24 h-24 rounded-full blur-[40px] pointer-events-none opacity-40"
        style={{ background: meta.glow }}
      />

      <div className="relative z-10 p-4 space-y-3.5">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <Avatar src={profile?.avatar_url} name={name} />
            {/* Activity dot */}
            <div
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#111113] flex items-center justify-center"
              style={{ background: meta.color }}
            >
              <span className="text-black" style={{ fontSize: 8 }}>{meta.icon}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[14px] font-bold text-white leading-tight">{name}</p>
              <ActivityBadge type={item.activity_type} />
            </div>
            <p className="text-[11px] text-white/35 mt-0.5">{timeAgo(item.created_at)}</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-0.5">
          <p className="text-[14px] font-semibold text-white/90 leading-snug">{item.title}</p>
          {item.description && (
            <p className="text-[13px] text-white/50 leading-relaxed">{item.description}</p>
          )}
        </div>

        {/* Separator */}
        <div className="h-px bg-white/6" />

        {/* Reactions */}
        <div className="flex items-center gap-2 flex-wrap">
          {REACTION_CONFIG.map(({ type, emoji, label }) => {
            const count = item.reactions?.filter((r) => r.reaction_type === type).length ?? 0;
            const active = !!item.user_has_reacted && item.reactions?.some(
              (r) => r.reaction_type === type && item.user_has_reacted
            );
            return (
              <ReactionButton
                key={type}
                emoji={emoji}
                label={label}
                count={count}
                active={!!active}
                onClick={() => onReact(item.id, type)}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-[22px] border border-white/6 p-4 space-y-3 animate-pulse"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-white/10 rounded-full w-28" />
              <div className="h-2.5 bg-white/6 rounded-full w-16" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-3 bg-white/8 rounded-full w-3/4" />
            <div className="h-2.5 bg-white/5 rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ActivityFeedView() {
  const { feed, isLoading, hasMore, error, loadMore, toggleReaction } = useActivityFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleReact = useCallback(
    (activityId: string, type: ReactionType) => {
      toggleReaction(activityId, type).catch(console.error);
    },
    [toggleReaction]
  );

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
    return <FeedSkeleton />;
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-12 px-4 flex flex-col items-center gap-4 text-center"
      >
        <div className="w-16 h-16 rounded-[20px] bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <div>
          <p className="text-[17px] font-bold text-white">Feed Unavailable</p>
          <p className="text-[13px] text-white/40 mt-1 leading-relaxed max-w-xs">{error}</p>
        </div>
      </motion.div>
    );
  }

  if (feed.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-16 flex flex-col items-center gap-5 text-center"
      >
        <div
          className="w-20 h-20 rounded-[24px] flex items-center justify-center border border-white/10"
          style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.15), rgba(245,197,24,0.05))' }}
        >
          <Users size={32} className="text-[#F5C518]" />
        </div>
        <div>
          <p className="text-[18px] font-bold text-white">No activity yet</p>
          <p className="text-[13px] text-white/40 mt-1.5 max-w-[240px] leading-relaxed">
            Complete a workout or add friends to see their updates here.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-white/30">
          <Sparkles size={12} />
          <span>Your activity will appear here too</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {feed.map((item, index) => (
          <FeedCard key={item.id} item={item} index={index} onReact={handleReact} />
        ))}
      </AnimatePresence>

      <div ref={sentinelRef} />

      {isLoading && feed.length > 0 && (
        <div className="py-4 flex justify-center">
          <div className="w-5 h-5 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin" />
        </div>
      )}

      {!hasMore && feed.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-5">
          <div className="h-px w-12 bg-white/10" />
          <p className="text-[11px] text-white/30 font-medium">You're all caught up</p>
          <div className="h-px w-12 bg-white/10" />
        </div>
      )}
    </div>
  );
}

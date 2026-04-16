// src/components/social/ActivityFeedView.tsx — Premium Feed redesign
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import type { ActivityFeedItem, ReactionType } from '@/types/social';
import {
  Dumbbell, Flame, Trophy, Star, TrendingUp, Zap,
  Users, AlertCircle, Sparkles, Send, Plus, SmilePlus,
  ArrowUp, Award,
} from 'lucide-react';

// ─── Gold token ──────────────────────────────────────────────────────────────
const GOLD = '#D4A843';
const GOLD_LIGHT = '#F5D78E';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function gradient(name: string): string {
  const g = [
    'linear-gradient(135deg,#D4A843,#F5D78E)',
    'linear-gradient(135deg,#A78BFA,#EC4899)',
    'linear-gradient(135deg,#38BDF8,#6366F1)',
    'linear-gradient(135deg,#34D399,#06B6D4)',
    'linear-gradient(135deg,#F97316,#EF4444)',
    'linear-gradient(135deg,#00E676,#1DE9B6)',
  ];
  return g[name.charCodeAt(0) % g.length];
}

// ─── Shared Avatar ────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  const initials = name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const style = { width: size, height: size, flexShrink: 0 as const, fontSize: size * 0.33 };
  if (src) {
    return <img src={src} alt={name} className="rounded-full object-cover flex-shrink-0 ring-2 ring-white/8" style={style} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-extrabold text-black"
      style={{ ...style, background: gradient(name) }}
    >
      {initials}
    </div>
  );
}

// ─── Reaction button ──────────────────────────────────────────────────────────
function ReactionBtn({ emoji, count, active, onClick }: {
  emoji: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 1.3 }}
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
      style={
        active
          ? { background: `${GOLD}20`, border: `1px solid ${GOLD}40`, color: GOLD_LIGHT }
          : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }
      }
    >
      <span className="text-base leading-none">{emoji}</span>
      {count > 0 && (
        <span className="tabular-nums text-[11px]" style={{ color: active ? GOLD : undefined }}>
          {count}
        </span>
      )}
    </motion.button>
  );
}

// ─── Workout Card ─────────────────────────────────────────────────────────────
function WorkoutCard({ item, onReact }: { item: ActivityFeedItem; onReact: (t: ReactionType) => void }) {
  const p = item.user_profile;
  const name = p?.name ?? 'Unknown';
  const meta = item.metadata as Record<string, unknown>;
  const exercises = (meta.exercises as string[] | undefined) ?? [];
  const duration = meta.duration as number | undefined;
  const volume = meta.volume as number | undefined;
  const prs = meta.pr_count as number | undefined;

  const reactions = [
    { type: 'kudos' as ReactionType, emoji: '💪' },
    { type: 'fire'  as ReactionType, emoji: '🔥' },
    { type: 'clap'  as ReactionType, emoji: '👏' },
  ];

  return (
    <div
      className="rounded-[20px] border overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.018) 100%)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="relative">
          <Avatar src={p?.avatar_url} name={name} size={38} />
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0D0D10] bg-[#00E676] flex items-center justify-center">
            <Dumbbell size={8} className="text-black" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="text-[14px] font-bold text-white truncate">{name}</p>
            {p?.username && <p className="text-[11px] text-white/35 truncate">@{p.username}</p>}
          </div>
          <p className="text-[11px] text-white/30">{timeAgo(item.created_at)} ago</p>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pb-3">
        <p className="text-[16px] font-bold text-white">{item.title}</p>
        {item.description && <p className="text-[13px] text-white/50 mt-0.5 leading-relaxed">{item.description}</p>}
      </div>

      {/* Stats pills */}
      {(duration || volume || prs) && (
        <div className="flex gap-2 px-4 pb-3 flex-wrap">
          {duration != null && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,230,118,0.12)', color: '#00E676' }}>
              ⏱ {duration}m
            </span>
          )}
          {volume != null && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(56,189,248,0.12)', color: '#38BDF8' }}>
              🏋️ {volume.toLocaleString()} kg
            </span>
          )}
          {prs != null && prs > 0 && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${GOLD}18`, color: GOLD_LIGHT }}>
              🏆 {prs} PR{prs > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Exercise chips */}
      {exercises.length > 0 && (
        <div className="flex gap-1.5 px-4 pb-3 flex-wrap">
          {exercises.slice(0, 5).map((ex: string) => (
            <span
              key={ex}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              {ex}
            </span>
          ))}
          {exercises.length > 5 && (
            <span className="text-[11px] text-white/25">+{exercises.length - 5} more</span>
          )}
        </div>
      )}

      {/* Reactions */}
      <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {reactions.map(({ type, emoji }) => {
          const count = item.reactions?.filter((r) => r.reaction_type === type).length ?? 0;
          const active = !!item.user_has_reacted && item.reactions?.some(r => r.reaction_type === type && item.user_has_reacted);
          return <ReactionBtn key={type} emoji={emoji} count={count} active={!!active} onClick={() => onReact(type)} />;
        })}
      </div>
    </div>
  );
}

// ─── PR Card ──────────────────────────────────────────────────────────────────
function PRCard({ item, onReact }: { item: ActivityFeedItem; onReact: (t: ReactionType) => void }) {
  const p = item.user_profile;
  const name = p?.name ?? 'Unknown';
  const meta = item.metadata as Record<string, unknown>;
  const exercise = meta.exercise as string | undefined;
  const weight = meta.weight as number | undefined;
  const reps = meta.reps as number | undefined;

  return (
    <div
      className="rounded-[20px] border overflow-hidden"
      style={{
        background: `linear-gradient(145deg, ${GOLD}10 0%, rgba(13,13,16,0.98) 55%)`,
        borderColor: `${GOLD}30`,
        boxShadow: `0 0 32px ${GOLD}08`,
      }}
    >
      {/* Sparkle header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: `${GOLD}20` }}
          >
            <Trophy size={16} style={{ color: GOLD }} />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: GOLD }}>
            New PR!
          </span>
        </div>
        <span className="text-[11px] text-white/30">{timeAgo(item.created_at)} ago</span>
      </div>

      <div className="flex items-center gap-3 px-4 pb-3">
        <Avatar src={p?.avatar_url} name={name} size={36} />
        <div>
          <p className="text-[14px] font-bold text-white">{name}</p>
          {p?.username && <p className="text-[11px] text-white/35">@{p.username}</p>}
        </div>
      </div>

      {/* PR detail */}
      {exercise && (
        <div className="mx-4 mb-3 px-4 py-3 rounded-[14px]" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}20` }}>
          <p className="text-[13px] font-semibold text-white/60">{exercise}</p>
          {weight != null && reps != null && (
            <p className="text-[20px] font-black mt-1" style={{ color: GOLD_LIGHT }}>
              {weight}kg × {reps}
            </p>
          )}
        </div>
      )}

      {/* Reactions */}
      <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: `${GOLD}20` }}>
        {[{ type: 'kudos' as ReactionType, emoji: '💪' }, { type: 'fire' as ReactionType, emoji: '🔥' }, { type: 'clap' as ReactionType, emoji: '👏' }].map(({ type, emoji }) => {
          const count = item.reactions?.filter(r => r.reaction_type === type).length ?? 0;
          const active = !!item.user_has_reacted && item.reactions?.some(r => r.reaction_type === type && item.user_has_reacted);
          return <ReactionBtn key={type} emoji={emoji} count={count} active={!!active} onClick={() => onReact(type)} />;
        })}
      </div>
    </div>
  );
}

// ─── Rank Up Card ─────────────────────────────────────────────────────────────
function RankUpCard({ item, onReact }: { item: ActivityFeedItem; onReact: (t: ReactionType) => void }) {
  const p = item.user_profile;
  const name = p?.name ?? 'Unknown';
  const meta = item.metadata as Record<string, unknown>;
  const fromTier = meta.from_tier as string | undefined;
  const toTier = meta.to_tier as string | undefined;

  return (
    <div
      className="rounded-[20px] border overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(167,139,250,0.12) 0%, rgba(13,13,16,0.98) 55%)',
        borderColor: 'rgba(167,139,250,0.25)',
      }}
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="relative">
          <Avatar src={p?.avatar_url} name={name} size={38} />
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0D0D10] bg-[#A78BFA] flex items-center justify-center">
            <ArrowUp size={8} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-white">{name}</p>
          <p className="text-[11px] text-white/30">{timeAgo(item.created_at)} ago</p>
        </div>
        <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}>
          Ranked Up!
        </span>
      </div>

      <div className="px-4 pb-3">
        <p className="text-[15px] font-bold text-white">{item.title}</p>
        {fromTier && toTier && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[13px] font-bold capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{fromTier}</span>
            <ArrowUp size={14} className="text-[#A78BFA]" />
            <span className="text-[13px] font-bold capitalize" style={{ color: '#A78BFA' }}>{toTier}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: 'rgba(167,139,250,0.15)' }}>
        {[{ type: 'kudos' as ReactionType, emoji: '💪' }, { type: 'fire' as ReactionType, emoji: '🔥' }, { type: 'clap' as ReactionType, emoji: '👏' }].map(({ type, emoji }) => {
          const count = item.reactions?.filter(r => r.reaction_type === type).length ?? 0;
          const active = !!item.user_has_reacted && item.reactions?.some(r => r.reaction_type === type && item.user_has_reacted);
          return <ReactionBtn key={type} emoji={emoji} count={count} active={!!active} onClick={() => onReact(type)} />;
        })}
      </div>
    </div>
  );
}

// ─── Challenge / Live Mission Card ────────────────────────────────────────────
function ChallengCard({ item, onReact }: { item: ActivityFeedItem; onReact: (t: ReactionType) => void }) {
  const p = item.user_profile;
  const name = p?.name ?? 'Unknown';
  const meta = item.metadata as Record<string, unknown>;
  const duration = meta.duration as string | undefined;
  const intensity = meta.intensity as string | undefined;
  const slots = meta.slots_left as number | undefined;

  return (
    <div
      className="rounded-[20px] overflow-hidden border"
      style={{
        background: 'linear-gradient(145deg, rgba(56,189,248,0.12) 0%, rgba(13,13,16,0.97) 60%)',
        borderColor: 'rgba(56,189,248,0.2)',
      }}
    >
      {/* Live badge */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E676]" />
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#00E676]">Live Mission</span>
        </div>
        <span className="text-[11px] text-white/30">{timeAgo(item.created_at)} ago</span>
      </div>

      {/* Mission name */}
      <div className="px-4 pb-2">
        <p className="text-[20px] font-black uppercase tracking-tight text-white leading-tight">{item.title}</p>
        {(duration || intensity || slots != null) && (
          <p className="text-[12px] font-semibold mt-1" style={{ color: 'rgba(56,189,248,0.8)' }}>
            {[duration && `${duration} Min`, intensity, slots != null && `${slots} Slots Left`].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Who joined */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <Avatar src={p?.avatar_url} name={name} size={28} />
          <p className="text-[12px] text-white/50 ml-2">
            <span className="text-white font-semibold">{name}</span> joined
          </p>
        </div>
        <button
          className="px-4 py-1.5 rounded-full text-[13px] font-bold"
          style={{ background: GOLD, color: '#0D0D10' }}
        >
          Join Mission
        </button>
      </div>
    </div>
  );
}

// ─── Achievement Card ─────────────────────────────────────────────────────────
function AchievCard({ item, onReact }: { item: ActivityFeedItem; onReact: (t: ReactionType) => void }) {
  const p = item.user_profile;
  const name = p?.name ?? 'Unknown';

  return (
    <div
      className="rounded-[20px] border overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(251,146,60,0.1) 0%, rgba(13,13,16,0.98) 55%)',
        borderColor: 'rgba(251,146,60,0.2)',
      }}
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="relative">
          <Avatar src={p?.avatar_url} name={name} size={38} />
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0D0D10] bg-[#FB923C] flex items-center justify-center">
            <Award size={8} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-white">{name}</p>
          <p className="text-[11px] text-white/30">{timeAgo(item.created_at)} ago</p>
        </div>
        <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: 'rgba(251,146,60,0.15)', color: '#FB923C' }}>
          Achievement
        </span>
      </div>
      <div className="px-4 pb-3">
        <p className="text-[15px] font-bold text-white">{item.title}</p>
        {item.description && <p className="text-[13px] text-white/45 mt-0.5">{item.description}</p>}
      </div>
      <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: 'rgba(251,146,60,0.12)' }}>
        {[{ type: 'kudos' as ReactionType, emoji: '💪' }, { type: 'fire' as ReactionType, emoji: '🔥' }, { type: 'clap' as ReactionType, emoji: '👏' }].map(({ type, emoji }) => {
          const count = item.reactions?.filter(r => r.reaction_type === type).length ?? 0;
          const active = !!item.user_has_reacted && item.reactions?.some(r => r.reaction_type === type && item.user_has_reacted);
          return <ReactionBtn key={type} emoji={emoji} count={count} active={!!active} onClick={() => onReact(type)} />;
        })}
      </div>
    </div>
  );
}

// ─── Streak Card ──────────────────────────────────────────────────────────────
function StreakCard({ item, onReact }: { item: ActivityFeedItem; onReact: (t: ReactionType) => void }) {
  const p = item.user_profile;
  const name = p?.name ?? 'Unknown';
  const streakDays = (item.metadata as Record<string, unknown>).days as number | undefined;

  return (
    <div
      className="rounded-[20px] border overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(239,68,68,0.1) 0%, rgba(13,13,16,0.98) 55%)',
        borderColor: 'rgba(239,68,68,0.2)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="relative">
          <Avatar src={p?.avatar_url} name={name} size={38} />
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0D0D10] bg-[#EF4444] flex items-center justify-center">
            <Flame size={8} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-white">{name}</p>
          <p className="text-[13px] mt-0.5" style={{ color: '#EF4444' }}>
            🔥 {streakDays ? `${streakDays}-day` : ''} streak milestone!
          </p>
        </div>
        <span className="text-[11px] text-white/30">{timeAgo(item.created_at)}</span>
      </div>
      <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: 'rgba(239,68,68,0.12)' }}>
        {[{ type: 'kudos' as ReactionType, emoji: '💪' }, { type: 'fire' as ReactionType, emoji: '🔥' }, { type: 'clap' as ReactionType, emoji: '👏' }].map(({ type, emoji }) => {
          const count = item.reactions?.filter(r => r.reaction_type === type).length ?? 0;
          const active = !!item.user_has_reacted && item.reactions?.some(r => r.reaction_type === type && item.user_has_reacted);
          return <ReactionBtn key={type} emoji={emoji} count={count} active={!!active} onClick={() => onReact(type)} />;
        })}
      </div>
    </div>
  );
}

// ─── Dispatcher: picks card type by activity_type ─────────────────────────────
function FeedCard({ item, index, onReact }: {
  item: ActivityFeedItem;
  index: number;
  onReact: (id: string, type: ReactionType) => void;
}) {
  const react = useCallback((t: ReactionType) => onReact(item.id, t), [item.id, onReact]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.06, 0.5) }}
    >
      {item.activity_type === 'workout_completed' && <WorkoutCard item={item} onReact={react} />}
      {item.activity_type === 'pr_set'            && <PRCard       item={item} onReact={react} />}
      {item.activity_type === 'rank_up'           && <RankUpCard   item={item} onReact={react} />}
      {item.activity_type === 'challenge_joined'  && <ChallengCard item={item} onReact={react} />}
      {item.activity_type === 'achievement_unlocked' && <AchievCard item={item} onReact={react} />}
      {item.activity_type === 'streak_milestone'  && <StreakCard   item={item} onReact={react} />}
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function FeedSkeleton() {
  return (
    <div className="space-y-3 px-4 pt-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-[20px] border p-4 space-y-3 animate-pulse"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/8 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-white/8 rounded-full w-28" />
              <div className="h-2 bg-white/5 rounded-full w-16" />
            </div>
          </div>
          <div className="h-4 bg-white/6 rounded-full w-3/4" />
          <div className="h-3 bg-white/4 rounded-full w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ─── Message input bar ────────────────────────────────────────────────────────
function PulseInput() {
  const [text, setText] = useState('');
  return (
    <div
      className="flex items-center gap-2 mx-4 mb-3 mt-1 px-3 py-2 rounded-2xl border"
      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <button className="p-1.5 rounded-full" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <Plus size={18} />
      </button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Pulse a message…"
        className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/25 outline-none"
      />
      <button className="p-1.5 rounded-full" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <SmilePlus size={18} />
      </button>
      <button
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
        style={text.trim() ? { background: GOLD, color: '#0D0D10' } : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
      >
        <Send size={15} />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
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
      (entries) => { if (entries[0].isIntersecting && hasMore && !isLoading) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  if (isLoading && feed.length === 0) return <FeedSkeleton />;

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
        className="py-16 flex flex-col items-center gap-5 text-center px-4"
      >
        <div
          className="w-20 h-20 rounded-[24px] flex items-center justify-center border"
          style={{ background: `${GOLD}15`, borderColor: `${GOLD}25` }}
        >
          <Users size={32} style={{ color: GOLD }} />
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
      {/* Message input */}
      <PulseInput />

      {/* Feed cards */}
      <div className="flex flex-col gap-3 px-4">
        <AnimatePresence>
          {feed.map((item, index) => (
            <FeedCard key={item.id} item={item} index={index} onReact={handleReact} />
          ))}
        </AnimatePresence>
      </div>

      <div ref={sentinelRef} />

      {isLoading && feed.length > 0 && (
        <div className="py-4 flex justify-center">
          <div className="w-5 h-5 border-2 border-t-2 rounded-full animate-spin" style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
        </div>
      )}

      {!hasMore && feed.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-5">
          <div className="h-px w-12" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <p className="text-[11px] text-white/30 font-medium">You're all caught up</p>
          <div className="h-px w-12" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
      )}
    </div>
  );
}

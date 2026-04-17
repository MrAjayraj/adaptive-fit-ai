// src/pages/Notifications.tsx
// FitPulse — full-featured Notifications screen
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bell, Heart, MessageCircle, Users,
  Trophy, Zap, Flame, Target, Star, Bot,
  CheckCheck, Dumbbell,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type { FitNotification, NotificationType } from '@/hooks/useNotifications';
import BottomNav from '@/components/layout/BottomNav';

// ── Design tokens (Volt Athletic) ─────────────────────────────────────────────
const YELLOW   = '#F5C518';
const YELLOW_DIM = 'rgba(245,197,24,0.12)';
const SURFACE  = '#1A1A1E';
const SURFACE_HI = '#252529';
const BG       = '#111113';

// ── Filter types ──────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'social' | 'workouts' | 'challenges' | 'ai';

const FILTERS: { id: FilterTab; label: string }[] = [
  { id: 'all',        label: 'All'        },
  { id: 'social',     label: 'Social'     },
  { id: 'workouts',   label: 'Workouts'   },
  { id: 'challenges', label: 'Challenges' },
  { id: 'ai',         label: 'AI Coach'   },
];

const TYPE_TO_FILTER: Record<NotificationType, FilterTab> = {
  like:              'social',
  comment:           'social',
  follow:            'social',
  workout_share:     'social',
  group_message:     'social',
  dm:                'social',
  rank_up:           'workouts',
  streak_milestone:  'workouts',
  achievement:       'workouts',
  challenge:         'challenges',
  ai:                'ai',
  system:            'all',
};

// ── Icon mapper ───────────────────────────────────────────────────────────────
function typeIcon(type: NotificationType) {
  const map: Record<NotificationType, React.ReactNode> = {
    like:             <Heart   size={14} className="text-red-400" />,
    comment:          <MessageCircle size={14} className="text-blue-400" />,
    follow:           <Users   size={14} className="text-purple-400" />,
    rank_up:          <Zap     size={14} style={{ color: YELLOW }} />,
    ai:               <Bot     size={14} className="text-emerald-400" />,
    challenge:        <Target  size={14} className="text-orange-400" />,
    achievement:      <Trophy  size={14} style={{ color: YELLOW }} />,
    workout_share:    <Dumbbell size={14} className="text-sky-400" />,
    streak_milestone: <Flame   size={14} className="text-orange-400" />,
    group_message:    <Users   size={14} className="text-indigo-400" />,
    dm:               <MessageCircle size={14} className="text-emerald-400" />,
    system:           <Bell    size={14} className="text-white/50" />,
  };
  return map[type] ?? <Bell size={14} className="text-white/50" />;
}

function typeBg(type: NotificationType) {
  const map: Record<NotificationType, string> = {
    like:             'rgba(239,68,68,0.12)',
    comment:          'rgba(59,130,246,0.12)',
    follow:           'rgba(168,85,247,0.12)',
    rank_up:          YELLOW_DIM,
    ai:               'rgba(52,211,153,0.12)',
    challenge:        'rgba(249,115,22,0.12)',
    achievement:      YELLOW_DIM,
    workout_share:    'rgba(14,165,233,0.12)',
    streak_milestone: 'rgba(249,115,22,0.12)',
    group_message:    'rgba(99,102,241,0.12)',
    dm:               'rgba(52,211,153,0.12)',
    system:           'rgba(255,255,255,0.06)',
  };
  return map[type] ?? 'rgba(255,255,255,0.06)';
}

// ── Time helper ───────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupLabel(iso: string) {
  const d   = new Date(iso);
  const now = new Date();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString())  return 'TODAY';
  if (d.toDateString() === yest.toDateString()) return 'YESTERDAY';
  return 'EARLIER';
}

// ── Single notification row ────────────────────────────────────────────────────
function NotifRow({ n, onRead }: { n: FitNotification; onRead: (id: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: n.is_read ? 0.55 : 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.22 }}
      onClick={() => !n.is_read && onRead(n.id)}
      className="flex items-start gap-3 px-4 py-3 cursor-pointer rounded-[16px] relative group transition-colors"
      style={{
        background: n.is_read ? 'transparent' : 'rgba(255,255,255,0.025)',
      }}
    >
      {/* Unread accent bar */}
      {!n.is_read && (
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
          style={{ background: YELLOW }}
        />
      )}

      {/* Icon */}
      <div
        className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: typeBg(n.type) }}
      >
        {typeIcon(n.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] leading-[1.4] text-white font-medium">
          {n.message}
        </p>
        <p className="text-[11px] text-white/35 mt-1">{timeAgo(n.created_at)}</p>
      </div>

      {/* Unread dot */}
      {!n.is_read && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
          style={{ background: YELLOW, boxShadow: `0 0 8px ${YELLOW}88` }}
        />
      )}
    </motion.div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function NotifSkeleton() {
  return (
    <div className="space-y-2 px-4 pt-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
          <div className="w-9 h-9 rounded-[12px] bg-white/[0.06] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/[0.06] rounded-full w-3/4" />
            <div className="h-2 bg-white/[0.04] rounded-full w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<FilterTab>('all');

  // Filter by tab
  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((n) => TYPE_TO_FILTER[n.type] === filter || TYPE_TO_FILTER[n.type] === 'all');
  }, [notifications, filter]);

  // Group by day
  const groups = useMemo(() => {
    const map = new Map<string, FitNotification[]>();
    filtered.forEach((n) => {
      const label = groupLabel(n.created_at);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(n);
    });
    // Ordered keys
    const order = ['TODAY', 'YESTERDAY', 'EARLIER'];
    return order
      .filter((k) => map.has(k))
      .map((k) => ({ label: k, items: map.get(k)! }));
  }, [filtered]);

  return (
    <div
      className="min-h-screen pb-[100px] font-sans"
      style={{ background: BG }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 px-4 pt-12 pb-3 flex items-center justify-between"
        style={{
          background: 'rgba(17,17,19,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: SURFACE }}
          >
            <ArrowLeft size={18} className="text-white/70" />
          </button>
          <div>
            <h1 className="text-[18px] font-black text-white uppercase tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-[11px] font-semibold" style={{ color: YELLOW }}>
                {unreadCount} new
              </p>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="flex items-center gap-1.5 text-[12px] font-bold transition-opacity hover:opacity-70"
            style={{ color: YELLOW }}
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* ── Filter chips ─────────────────────────────────────────────────────── */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap flex-shrink-0 transition-all duration-200"
            style={
              filter === f.id
                ? { background: YELLOW, color: BG }
                : { background: SURFACE_HI, color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.07)' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <NotifSkeleton />
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6"
        >
          <div
            className="w-20 h-20 rounded-[24px] flex items-center justify-center"
            style={{ background: YELLOW_DIM, border: `1px solid rgba(245,197,24,0.2)` }}
          >
            <Bell size={32} style={{ color: YELLOW }} />
          </div>
          <div>
            <p className="text-[17px] font-bold text-white">All caught up!</p>
            <p className="text-[13px] text-white/40 mt-1.5 max-w-xs leading-relaxed">
              {filter === 'all'
                ? 'No notifications yet. Complete a workout or connect with friends.'
                : `No ${filter} notifications yet.`}
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4 px-4 pt-1 pb-4">
          <AnimatePresence>
            {groups.map(({ label, items }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1"
              >
                {/* Group label */}
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.15em] px-1 mb-2 mt-4 first:mt-0"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  {label}
                </p>

                {/* Notification rows */}
                <div
                  className="rounded-[20px] overflow-hidden"
                  style={{ background: SURFACE, border: '1px solid rgba(255,255,255,0.055)' }}
                >
                  {items.map((n, i) => (
                    <React.Fragment key={n.id}>
                      <NotifRow n={n} onRead={markRead} />
                      {i < items.length - 1 && (
                        <div
                          className="mx-4"
                          style={{ height: 1, background: 'rgba(255,255,255,0.04)' }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

/**
 * WorkoutHub — /workout-hub
 * Landing page for the Workouts tab.
 *
 * Layout:
 *   Header "Workouts" + calendar icon
 *   Filter chips: ALL | STRENGTH | CARDIO | STRETCHING
 *   MY ROUTINES section (user's saved routines)
 *   QUICK START section (3 preset tiles)
 *   + Create Custom Workout dashed button
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell, Heart, Swords, Plus, Play, Calendar,
  Clock, MoreVertical, Pencil, Copy, Trash2, ChevronRight,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  getUserRoutines, deleteRoutine, duplicateRoutine, startFromRoutine, startEmptyWorkout,
} from '@/services/workoutService';
import type { Routine } from '@/services/workoutService';
import BottomNav from '@/components/layout/BottomNav';

// ── Design tokens ──────────────────────────────────────────────────────────────
const ACCENT       = '#0CFF9C';
const BG           = '#0C1015';
const SURFACE      = '#141A1F';
const SURFACE_UP   = '#1C2429';
const T1           = '#EAEEF2';
const T2           = '#8899AA';
const T3           = '#4A5568';
const GREEN_GLOW   = 'rgba(12,255,156,0.1)';
const GREEN_BORDER = 'rgba(12,255,156,0.18)';

type FilterChip = 'all' | 'strength' | 'cardio' | 'stretching';

const CHIPS: { label: string; value: FilterChip }[] = [
  { label: 'ALL',        value: 'all'       },
  { label: 'STRENGTH',   value: 'strength'  },
  { label: 'CARDIO',     value: 'cardio'    },
  { label: 'STRETCHING', value: 'stretching'},
];

// ── Quick start definitions ───────────────────────────────────────────────────

const QUICK_START = [
  {
    id: 'strength',
    label: 'Strength',
    subtitle: '45–60 min · 320 kcal',
    color: '#F5C518',
    icon: <Dumbbell style={{ width: 22, height: 22, color: '#F5C518' }} />,
    workoutType: 'strength',
  },
  {
    id: 'cardio',
    label: 'Cardio / HIIT',
    subtitle: '20–30 min · 280 kcal',
    color: '#ef4444',
    icon: <Heart style={{ width: 22, height: 22, color: '#ef4444' }} />,
    workoutType: 'cardio',
  },
  {
    id: 'skill',
    label: 'Skill / Boxing',
    subtitle: '30 min · 240 kcal',
    color: ACCENT,
    icon: <Swords style={{ width: 22, height: 22, color: ACCENT }} />,
    workoutType: 'skill',
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeSince(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days}d ago`;
  if (days < 30)  return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function exerciseCount(routine: Routine): number {
  return Array.isArray(routine.exercises) ? routine.exercises.length : 0;
}

// ── Routine card ──────────────────────────────────────────────────────────────

function RoutineCard({
  routine,
  onStart,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  routine: Routine;
  onStart: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      style={{
        background: SURFACE,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 16px',
        marginBottom: 10,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Left: text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T1, marginBottom: 3 }}>
            {routine.name}
          </div>
          <div style={{ fontSize: 12, color: T3 }}>
            {exerciseCount(routine)} exercise{exerciseCount(routine) !== 1 ? 's' : ''}
            {' · '}
            Last: {timeSince(routine.last_performed_at)}
          </div>
        </div>

        {/* Right: Start + menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onStart}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: ACCENT,
              color: '#0C1015',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Play style={{ width: 16, height: 16, fill: '#0C1015' }} />
          </motion.button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{
                width: 30,
                height: 30,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
              }}
            >
              <MoreVertical style={{ width: 16, height: 16, color: T3 }} />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    position: 'absolute',
                    top: 34,
                    right: 0,
                    background: '#1C2429',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    padding: '4px 0',
                    zIndex: 50,
                    minWidth: 140,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}
                >
                  {[
                    { label: 'Edit',      icon: <Pencil style={{ width: 13, height: 13 }} />, action: onEdit      },
                    { label: 'Duplicate', icon: <Copy   style={{ width: 13, height: 13 }} />, action: onDuplicate },
                    { label: 'Delete',    icon: <Trash2 style={{ width: 13, height: 13, color: '#ef4444' }} />, action: onDelete, danger: true },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => { setMenuOpen(false); item.action(); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 14px',
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        color: item.danger ? '#ef4444' : T1,
                        textAlign: 'left',
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Quick start card ──────────────────────────────────────────────────────────

function QuickStartCard({
  item,
  onPress,
}: {
  item: typeof QUICK_START[number];
  onPress: () => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onPress}
      style={{
        background: SURFACE,
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 10,
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: `${item.color}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {item.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T1 }}>{item.label}</div>
        <div style={{ fontSize: 12, color: T3, marginTop: 2 }}>{item.subtitle}</div>
      </div>
      <ChevronRight style={{ width: 16, height: 16, color: T3, flexShrink: 0 }} />
    </motion.div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, marginTop: 4 }}>
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: T3,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {title}
      </span>
      {count !== undefined && count > 0 && (
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: ACCENT,
          background: GREEN_GLOW,
          borderRadius: 20,
          padding: '1px 7px',
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRoutine() {
  return (
    <div style={{ background: SURFACE_UP, borderRadius: 14, height: 70, marginBottom: 10, overflow: 'hidden', position: 'relative' }}>
      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)' }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WorkoutHub() {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [filter, setFilter]       = useState<FilterChip>('all');
  const [routines, setRoutines]   = useState<Routine[]>([]);
  const [loading, setLoading]     = useState(true);
  const [starting, setStarting]   = useState(false);

  // Load routines
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    getUserRoutines(user.id)
      .then(data => { if (!cancelled) setRoutines(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Filter routines
  const filteredRoutines = filter === 'all'
    ? routines
    : routines.filter(r => (r as Routine & { workout_type?: string }).workout_type === filter);

  // ── Handlers ───────────────────────────────────────────────

  async function handleStartRoutine(routine: Routine) {
    if (!user?.id || starting) return;
    setStarting(true);
    const workoutId = await startFromRoutine(user.id, routine.id);
    setStarting(false);
    if (workoutId) navigate('/workout', { state: { workoutId } });
  }

  async function handleQuickStart(workoutType: string) {
    if (!user?.id || starting) return;
    if (workoutType === 'skill') {
      navigate('/create-workout?type=skill');
      return;
    }
    navigate(`/create-workout?type=${workoutType}`);
  }

  async function handleDeleteRoutine(routineId: string) {
    await deleteRoutine(routineId);
    setRoutines(prev => prev.filter(r => r.id !== routineId));
  }

  async function handleDuplicateRoutine(routineId: string) {
    if (!user?.id) return;
    const copy = await duplicateRoutine(routineId, user.id);
    if (copy) setRoutines(prev => [copy, ...prev]);
  }

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: 100 }}>

      {/* ── Header ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(12,16,21,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: 'max(16px, env(safe-area-inset-top)) 16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: T1 }}>Workouts</span>
          <button
            onClick={() => navigate('/progress')}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}
          >
            <Calendar style={{ width: 20, height: 20, color: T2 }} />
          </button>
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px 16px 4px',
        overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {CHIPS.map(chip => {
          const active = filter === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => setFilter(chip.value)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
                border: active ? 'none' : '1px solid rgba(255,255,255,0.06)',
                background: active ? ACCENT : SURFACE_UP,
                color: active ? '#0C1015' : T2,
                transition: 'all 0.15s ease',
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '12px 16px' }}>

        {/* MY ROUTINES */}
        <SectionHeader title="My Routines" count={filteredRoutines.length} />

        {loading ? (
          <>
            <SkeletonRoutine />
            <SkeletonRoutine />
          </>
        ) : filteredRoutines.length === 0 ? (
          <div style={{
            background: SURFACE,
            borderRadius: 14,
            border: '1px dashed rgba(255,255,255,0.08)',
            padding: '24px 16px',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            <Dumbbell style={{ width: 28, height: 28, color: T3, margin: '0 auto 10px' }} />
            <div style={{ fontSize: 14, color: T2, fontWeight: 600 }}>No routines yet</div>
            <div style={{ fontSize: 12, color: T3, marginTop: 4 }}>
              Create a custom workout to save it as a routine
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {filteredRoutines.map(routine => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                onStart={() => handleStartRoutine(routine)}
                onEdit={() => navigate(`/create-workout?routine=${routine.id}&type=${(routine as Routine & { workout_type?: string }).workout_type ?? 'strength'}`)}
                onDuplicate={() => handleDuplicateRoutine(routine.id)}
                onDelete={() => handleDeleteRoutine(routine.id)}
              />
            ))}
          </AnimatePresence>
        )}

        {/* CREATE CUSTOM WORKOUT */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/create-workout?type=strength')}
          style={{
            width: '100%',
            background: 'transparent',
            border: `1px dashed ${GREEN_BORDER}`,
            borderRadius: 14,
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            marginBottom: 28,
          }}
        >
          <Plus style={{ width: 16, height: 16, color: ACCENT }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: ACCENT }}>Create Custom Workout</span>
        </motion.button>

        {/* QUICK START */}
        <SectionHeader title="Quick Start" />
        {QUICK_START.map(item => (
          <QuickStartCard
            key={item.id}
            item={item}
            onPress={() => handleQuickStart(item.workoutType)}
          />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}

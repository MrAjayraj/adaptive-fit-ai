// src/pages/WorkoutTab.tsx
// Main Workouts tab — Hevy-inspired landing page.
// Inline styles only. No Tailwind.

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Clipboard,
  Search,
  MoreHorizontal,
  Play,
  Clock,
  Dumbbell,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getActiveWorkout } from '@/services/workoutService';
import type { ActiveWorkout } from '@/services/workoutService';
import { useRoutines } from '@/hooks/useRoutines';
import BottomNav from '@/components/layout/BottomNav';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG         = '#0C1015';
const SURFACE    = '#141A1F';
const SURFACE_UP = '#1C2429';
const ACCENT     = '#F5C518';
const T1         = '#EAEEF2';
const T2         = '#8899AA';
const T3         = '#4A5568';
const ACCENT_DIM = 'rgba(245,197,24,0.12)';
const BORDER     = 'rgba(255,255,255,0.07)';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatElapsed(startedAt?: string): string {
  if (!startedAt) return '0m';
  const ms = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: SURFACE,
        borderRadius: 14,
        height: 76,
        marginBottom: 10,
        overflow: 'hidden',
        position: 'relative',
        border: `1px solid ${BORDER}`,
      }}
    >
      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
        }}
      />
    </div>
  );
}

// ── Three-dot menu ─────────────────────────────────────────────────────────────

interface MenuProps {
  routineId: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function RoutineMenu({ onEdit, onDuplicate, onDelete, onClose }: MenuProps) {
  const items: { label: string; color: string; action: () => void }[] = [
    { label: 'Edit',      color: T1, action: onEdit      },
    { label: 'Duplicate', color: T1, action: onDuplicate },
    { label: 'Delete',    color: '#F87171', action: onDelete },
  ];

  // Click-outside
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -4 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'absolute',
        right: 0,
        top: 40,
        zIndex: 50,
        background: SURFACE_UP,
        borderRadius: 12,
        border: `1px solid ${BORDER}`,
        minWidth: 140,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={(e) => {
            e.stopPropagation();
            item.action();
            onClose();
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '11px 16px',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            fontSize: 14,
            fontWeight: 500,
            color: item.color,
            cursor: 'pointer',
          }}
        >
          {item.label}
        </button>
      ))}
    </motion.div>
  );
}

// ── Delete confirmation ────────────────────────────────────────────────────────

function DeleteConfirm({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: SURFACE_UP,
          borderRadius: 18,
          border: `1px solid ${BORDER}`,
          padding: '24px 20px',
          width: '100%',
          maxWidth: 320,
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 700, color: T1, marginBottom: 6 }}>
          Delete routine?
        </p>
        <p style={{ fontSize: 13, color: T2, marginBottom: 24, lineHeight: 1.5 }}>
          "{name}" will be permanently deleted.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              color: T2,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              background: '#F87171',
              border: 'none',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Routine card ───────────────────────────────────────────────────────────────

interface RoutineCardProps {
  routine: {
    id: string;
    name: string;
    exercises: unknown[];
    last_performed_at: string | null;
  };
  index: number;
  onStart: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function RoutineCard({ routine, index, onStart, onEdit, onDuplicate, onDelete }: RoutineCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const exerciseCount = Array.isArray(routine.exercises) ? routine.exercises.length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.05, ease: 'easeOut' }}
      style={{
        background: SURFACE,
        borderRadius: 14,
        border: `1px solid ${BORDER}`,
        marginBottom: 10,
        padding: '0 14px',
        height: 76,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'relative',
      }}
    >
      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: T1,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {routine.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T3,
              background: SURFACE_UP,
              borderRadius: 6,
              padding: '2px 7px',
            }}
          >
            {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
          </span>
          <span style={{ fontSize: 11, color: T3 }}>
            Last: {daysAgo(routine.last_performed_at)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Start button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onStart(); }}
          style={{
            height: 36,
            paddingLeft: 14,
            paddingRight: 14,
            borderRadius: 18,
            background: ACCENT,
            border: 'none',
            color: '#0C1015',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            cursor: 'pointer',
          }}
        >
          <Play style={{ width: 12, height: 12, fill: '#0C1015' }} />
          Start
        </motion.button>

        {/* Three-dot */}
        <div style={{ position: 'relative' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: menuOpen ? SURFACE_UP : 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <MoreHorizontal style={{ width: 18, height: 18, color: T2 }} />
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <RoutineMenu
                routineId={routine.id}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function WorkoutTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { routines, loading, remove, duplicate } = useRoutines();

  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [elapsedLabel, setElapsedLabel] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Load active workout on mount
  useEffect(() => {
    if (!user) return;
    getActiveWorkout(user.id).then(setActiveWorkout).catch(() => {});
  }, [user]);

  // Live elapsed timer
  useEffect(() => {
    if (!activeWorkout) return;
    const tick = () => setElapsedLabel(formatElapsed(activeWorkout.started_at));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [activeWorkout]);

  async function handleDelete(routineId: string) {
    await remove(routineId);
    setDeleteTarget(null);
  }

  async function handleDuplicate(routineId: string) {
    await duplicate(routineId);
  }

  return (
    <div
      style={{
        background: BG,
        minHeight: '100dvh',
        paddingBottom: 108,
        overflowX: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(12,16,21,0.94)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          padding: 'max(16px, env(safe-area-inset-top)) 16px 14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 800, color: T1, letterSpacing: '-0.3px' }}>
            Workouts
          </span>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate('/routine/new')}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: SURFACE_UP,
              border: `1px solid ${BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Plus style={{ width: 16, height: 16, color: T1 }} />
          </motion.button>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* ── Active workout banner ── */}
        <AnimatePresence>
          {activeWorkout && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22 }}
              style={{
                background: 'rgba(245,197,24,0.1)',
                border: '1px solid rgba(245,197,24,0.28)',
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 14,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: ACCENT_DIM,
                  border: '1px solid rgba(245,197,24,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Zap style={{ width: 16, height: 16, color: ACCENT, fill: ACCENT }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: ACCENT, margin: 0, letterSpacing: '0.04em' }}>
                  WORKOUT IN PROGRESS
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: T1,
                    margin: '2px 0 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeWorkout.name}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: ACCENT,
                    background: ACCENT_DIM,
                    border: '1px solid rgba(245,197,24,0.2)',
                    borderRadius: 8,
                    padding: '3px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Clock style={{ width: 11, height: 11 }} />
                  {elapsedLabel}
                </span>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => navigate(`/workout/active?id=${activeWorkout.id}`)}
                  style={{
                    height: 34,
                    paddingLeft: 14,
                    paddingRight: 14,
                    borderRadius: 10,
                    background: ACCENT,
                    border: 'none',
                    color: '#0C1015',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Continue →
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Quick start ── */}
        <div style={{ marginTop: activeWorkout ? 0 : 14, marginBottom: 24 }}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/workout/active?mode=empty')}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 14,
              border: '2px dashed rgba(245,197,24,0.3)',
              background: ACCENT_DIM,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              cursor: 'pointer',
            }}
          >
            <Dumbbell style={{ width: 18, height: 18, color: ACCENT }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>
              + Start Empty Workout
            </span>
          </motion.button>
        </div>

        {/* ── Routines section header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: T1 }}>Routines</span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/routine/new')}
            style={{
              height: 30,
              paddingLeft: 14,
              paddingRight: 14,
              borderRadius: 15,
              background: SURFACE_UP,
              border: `1px solid ${BORDER}`,
              color: T2,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
            }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            New
          </motion.button>
        </div>

        {/* ── Quick-action cards ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {/* New Routine */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/routine/new')}
            style={{
              flex: 1,
              height: 76,
              borderRadius: 14,
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <Clipboard style={{ width: 22, height: 22, color: ACCENT }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T2 }}>New Routine</span>
          </motion.button>

          {/* Explore Programs */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/programs')}
            style={{
              flex: 1,
              height: 76,
              borderRadius: 14,
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <Search style={{ width: 22, height: 22, color: ACCENT }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T2 }}>Explore Programs</span>
          </motion.button>
        </div>

        {/* ── Routines list ── */}
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : routines.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 48,
              paddingBottom: 32,
              gap: 12,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: SURFACE_UP,
                border: `1px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Dumbbell style={{ width: 28, height: 28, color: T3 }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: T1, margin: 0 }}>No routines yet</p>
            <p style={{ fontSize: 13, color: T2, margin: 0 }}>
              Create your first routine to get started
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/routine/new')}
              style={{
                marginTop: 6,
                height: 42,
                paddingLeft: 24,
                paddingRight: 24,
                borderRadius: 21,
                background: ACCENT,
                border: 'none',
                color: '#0C1015',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Create Routine
            </motion.button>
          </motion.div>
        ) : (
          <div>
            {routines.map((routine, i) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                index={i}
                onStart={() =>
                  navigate('/workout/active', {
                    state: { routineId: routine.id, routineName: routine.name },
                  })
                }
                onEdit={() =>
                  navigate('/routine/new', { state: { routineId: routine.id } })
                }
                onDuplicate={() => handleDuplicate(routine.id)}
                onDelete={() => setDeleteTarget({ id: routine.id, name: routine.name })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm
            name={deleteTarget.name}
            onConfirm={() => handleDelete(deleteTarget.id)}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

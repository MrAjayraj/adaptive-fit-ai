// src/pages/ActiveWorkout.tsx
// Live workout logger — Hevy-style active workout screen.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X, Plus, Minus, Check, Clock, ChevronLeft, MoreHorizontal,
  Trash2, Dumbbell, Trophy, Zap, Flame, BarChart2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useAuth } from '@/context/AuthContext';
import ExercisePicker from '@/components/workout/ExercisePicker';
import type { WorkoutExerciseEntry, WorkoutSet, Exercise } from '@/services/workoutService';

// ─── Design tokens ────────────────────────────────────────────────────────────

const BG          = '#0C1015';
const SURFACE     = '#141A1F';
const SURFACE_UP  = '#1C2429';
const ACCENT      = '#F5C518';
const ACCENT_GREEN = '#0CFF9C';
const T1          = '#EAEEF2';
const T2          = '#8899AA';
const T3          = '#4A5568';
const ACCENT_DIM  = 'rgba(245,197,24,0.12)';
const BORDER      = 'rgba(255,255,255,0.07)';
const RED         = '#EF4444';

// ─── Inline-style helpers ─────────────────────────────────────────────────────

const flex = (
  direction: 'row' | 'column' = 'row',
  align = 'center',
  justify = 'flex-start',
): React.CSSProperties => ({ display: 'flex', flexDirection: direction, alignItems: align, justifyContent: justify });

// ─── RestTimer component ──────────────────────────────────────────────────────

interface RestTimerProps {
  totalSeconds: number;
  onDone: () => void;
  onSkip: () => void;
}

function RestTimer({ totalSeconds, onDone, onSkip }: RestTimerProps) {
  const [left, setLeft] = useState(totalSeconds);
  const R = 24;
  const circ = 2 * Math.PI * R;
  const progress = (totalSeconds - left) / totalSeconds;
  const strokeColor = left <= 10 ? RED : left <= 20 ? '#F97316' : ACCENT;

  useEffect(() => {
    if (left <= 0) { onDone(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);

  const min = Math.floor(left / 60);
  const sec = left % 60;
  const display = min > 0 ? `${min}:${String(sec).padStart(2, '0')}` : `${sec}s`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      style={{
        ...flex('row', 'center', 'space-between'),
        marginTop: 8,
        padding: '10px 14px',
        background: SURFACE_UP,
        borderRadius: 12,
        border: `1px solid ${ACCENT}30`,
      }}
    >
      <div style={{ ...flex('row', 'center', 'flex-start'), gap: 10 }}>
        <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
          <svg
            width="56" height="56" viewBox="0 0 56 56"
            style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}
          >
            <circle cx="28" cy="28" r={R} fill="none" stroke={BORDER} strokeWidth="3" />
            <circle
              cx="28" cy="28" r={R} fill="none"
              stroke={strokeColor} strokeWidth="3"
              strokeDasharray={circ}
              strokeDashoffset={circ - circ * progress}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
            />
          </svg>
          <span style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 700, color: strokeColor,
          }}>
            {display}
          </span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T1 }}>Rest</div>
          <div style={{ fontSize: 11, color: T2 }}>Recovery time</div>
        </div>
      </div>
      <button
        onClick={onSkip}
        style={{
          padding: '6px 14px', background: SURFACE, border: `1px solid ${BORDER}`,
          borderRadius: 8, fontSize: 12, fontWeight: 600, color: T2, cursor: 'pointer',
        }}
      >
        Skip
      </button>
    </motion.div>
  );
}

// ─── SetRow component ─────────────────────────────────────────────────────────

interface SetRowProps {
  set: WorkoutSet;
  setIndex: number;
  exerciseIndex: number;
  exerciseType: string;
  prevHint: string;
  onToggleComplete: () => void;
  onUpdateSet: (data: Partial<WorkoutSet>) => void;
  showRestTimer: boolean;
  restSeconds: number;
  onRestDone: () => void;
  isRestActive: boolean;
}

function SetRow({
  set, setIndex, exerciseType, prevHint,
  onToggleComplete, onUpdateSet,
  showRestTimer, restSeconds, onRestDone, isRestActive,
}: SetRowProps) {
  const completed = set.is_completed;

  const rowBg = completed ? 'rgba(12,255,156,0.06)' : 'transparent';

  const inputStyle: React.CSSProperties = {
    background: SURFACE_UP,
    border: `1px solid ${BORDER}`,
    borderRadius: 7,
    width: 52,
    height: 36,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 700,
    color: T1,
    outline: 'none',
    padding: '0 4px',
  };

  const isWeightReps = exerciseType === 'weight_reps' || exerciseType === 'weighted_bodyweight';
  const isDuration = exerciseType === 'duration' || exerciseType === 'duration_weight';
  const isDistance = exerciseType === 'distance_duration' || exerciseType === 'weight_distance';
  const isBodyweight = exerciseType === 'bodyweight_reps' || exerciseType === 'assisted_bodyweight';

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          ...flex('row', 'center', 'space-between'),
          minHeight: 48,
          padding: '4px 8px',
          borderRadius: 8,
          background: rowBg,
          transition: 'background 0.3s',
          gap: 6,
        }}
      >
        {/* Set number */}
        <span style={{ fontSize: 13, color: T3, width: 22, textAlign: 'center', flexShrink: 0 }}>
          {set.set_number}
        </span>

        {/* Prev hint */}
        <span style={{ fontSize: 11, color: T3, width: 56, textAlign: 'center', flexShrink: 0 }}>
          {prevHint}
        </span>

        {/* Weight input (weight_reps, duration_weight, weighted_bodyweight) */}
        {(isWeightReps || isDuration && exerciseType === 'duration_weight') && (
          <input
            type="number"
            inputMode="decimal"
            value={set.weight_kg ?? 0}
            onChange={e => onUpdateSet({ weight_kg: parseFloat(e.target.value) || 0 })}
            style={inputStyle}
            min={0}
            step={0.5}
          />
        )}

        {/* Reps input */}
        {(isWeightReps || isBodyweight) && (
          <input
            type="number"
            inputMode="numeric"
            value={set.reps ?? 0}
            onChange={e => onUpdateSet({ reps: parseInt(e.target.value, 10) || 0 })}
            style={inputStyle}
            min={0}
          />
        )}

        {/* Duration input (seconds) */}
        {(isDuration || isDistance) && (
          <input
            type="number"
            inputMode="numeric"
            value={set.duration_sec ?? 0}
            onChange={e => onUpdateSet({ duration_sec: parseInt(e.target.value, 10) || 0 })}
            style={{ ...inputStyle, width: 60 }}
            min={0}
            placeholder="sec"
          />
        )}

        {/* Distance input */}
        {isDistance && (
          <input
            type="number"
            inputMode="decimal"
            value={set.distance_km ?? 0}
            onChange={e => onUpdateSet({ distance_km: parseFloat(e.target.value) || 0 })}
            style={inputStyle}
            min={0}
            step={0.1}
            placeholder="km"
          />
        )}

        {/* Checkmark button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onToggleComplete}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: 'none',
            background: completed ? ACCENT_GREEN : SURFACE_UP,
            color: completed ? '#fff' : T3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}
        >
          <Check size={14} strokeWidth={3} />
        </motion.button>
      </motion.div>

      {/* Rest timer — shown after completing this set */}
      <AnimatePresence>
        {isRestActive && showRestTimer && (
          <RestTimer
            key={`rest-${setIndex}`}
            totalSeconds={restSeconds}
            onDone={onRestDone}
            onSkip={onRestDone}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── ExerciseBlock component ──────────────────────────────────────────────────

interface ExerciseBlockProps {
  entry: WorkoutExerciseEntry;
  exerciseIndex: number;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onRemove: () => void;
  onClearSets: () => void;
  onAddSet: () => void;
  onUpdateSet: (setIndex: number, data: Partial<WorkoutSet>) => void;
  onToggleComplete: (setIndex: number) => void;
  activeRestTimer: { exerciseIndex: number; setIndex: number; seconds: number } | null;
  onRestDone: () => void;
}

function ExerciseBlock({
  entry, exerciseIndex,
  menuOpen, onMenuToggle, onMenuClose,
  onRemove, onClearSets, onAddSet,
  onUpdateSet, onToggleComplete,
  activeRestTimer, onRestDone,
}: ExerciseBlockProps) {
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [restOn, setRestOn] = useState(entry.rest_timer_seconds > 0);
  const [restDuration, setRestDuration] = useState(entry.rest_timer_seconds || 90);

  const restOptions = [60, 90, 120, 180, 240];

  // Derive column headers
  const type = entry.exercise_type;
  const isWeightReps  = type === 'weight_reps' || type === 'weighted_bodyweight' || type === 'duration_weight';
  const isBodyweight  = type === 'bodyweight_reps' || type === 'assisted_bodyweight';
  const isDuration    = type === 'duration' || type === 'duration_weight';
  const isDistance    = type === 'distance_duration' || type === 'weight_distance';

  const completedSets = entry.sets.filter(s => s.is_completed).length;
  const allDone = entry.sets.length > 0 && completedSets === entry.sets.length;

  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: 16,
      overflow: 'visible',
      marginBottom: 12,
    }}>
      {/* Exercise header */}
      <div style={{
        ...flex('row', 'center', 'space-between'),
        padding: '14px 14px 10px',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: allDone ? ACCENT_GREEN : ACCENT,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {entry.name}
          </div>
          <div style={{ fontSize: 11, color: T3, marginTop: 2 }}>
            {entry.body_part} · {entry.target_muscle}
          </div>
        </div>

        {/* 3-dot menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={onMenuToggle}
            style={{
              background: 'transparent',
              border: 'none',
              color: T2,
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <MoreHorizontal size={18} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 50,
                  background: SURFACE_UP,
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  minWidth: 160,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => { onClearSets(); onMenuClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '11px 14px',
                    background: 'transparent', border: 'none',
                    color: T2, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <Minus size={14} />
                  Clear Sets
                </button>
                <div style={{ height: 1, background: BORDER }} />
                <button
                  onClick={() => { onRemove(); onMenuClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '11px 14px',
                    background: 'transparent', border: 'none',
                    color: RED, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <Trash2 size={14} />
                  Remove Exercise
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div style={{ padding: '10px 14px' }}>
        {/* Notes */}
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes..."
          rows={1}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: `1px solid ${BORDER}`,
            outline: 'none',
            color: T2,
            fontSize: 12,
            resize: 'none',
            padding: '4px 0 8px',
            marginBottom: 10,
            fontFamily: 'inherit',
          }}
        />

        {/* Rest timer toggle row */}
        <div style={{ ...flex('row', 'center', 'space-between'), marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: T2 }}>Rest Timer</span>
          <div style={{ ...flex('row', 'center', 'flex-end'), gap: 8 }}>
            {restOn && restOptions.map(sec => (
              <button
                key={sec}
                onClick={() => setRestDuration(sec)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: `1px solid ${restDuration === sec ? ACCENT : BORDER}`,
                  background: restDuration === sec ? ACCENT_DIM : 'transparent',
                  color: restDuration === sec ? ACCENT : T3,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {sec >= 60 ? `${sec / 60}m` : `${sec}s`}{sec % 60 !== 0 ? `${sec % 60}s` : ''}
              </button>
            ))}
            {/* Toggle pill */}
            <button
              onClick={() => setRestOn(v => !v)}
              style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                border: 'none',
                background: restOn ? ACCENT : SURFACE_UP,
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: 2,
                left: restOn ? 20 : 2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>

        {/* Set table header */}
        <div style={{
          ...flex('row', 'center', 'space-between'),
          padding: '4px 8px',
          marginBottom: 4,
        }}>
          <span style={{ fontSize: 11, color: T3, width: 22, textAlign: 'center' }}>SET</span>
          <span style={{ fontSize: 11, color: T3, width: 56, textAlign: 'center' }}>PREV</span>
          {(isWeightReps) && <span style={{ fontSize: 11, color: T3, width: 52, textAlign: 'center' }}>KG</span>}
          {(isWeightReps || isBodyweight) && <span style={{ fontSize: 11, color: T3, width: 52, textAlign: 'center' }}>REPS</span>}
          {isBodyweight && !isWeightReps && <span style={{ fontSize: 11, color: T3, width: 52, textAlign: 'center' }}>REPS</span>}
          {isDuration && <span style={{ fontSize: 11, color: T3, width: 60, textAlign: 'center' }}>TIME</span>}
          {isDistance && <span style={{ fontSize: 11, color: T3, width: 52, textAlign: 'center' }}>KM</span>}
          {isDistance && <span style={{ fontSize: 11, color: T3, width: 60, textAlign: 'center' }}>TIME</span>}
          <span style={{ fontSize: 11, color: T3, width: 28, textAlign: 'center' }}>✓</span>
        </div>

        {/* Sets */}
        {entry.sets.map((set, setIndex) => {
          const prevWeight = set.weight_kg > 0 ? `${set.weight_kg}×${set.reps}` : '–';
          const isRestActive =
            activeRestTimer?.exerciseIndex === exerciseIndex &&
            activeRestTimer?.setIndex === setIndex;

          return (
            <SetRow
              key={setIndex}
              set={set}
              setIndex={setIndex}
              exerciseIndex={exerciseIndex}
              exerciseType={entry.exercise_type}
              prevHint={prevWeight}
              onToggleComplete={() => onToggleComplete(setIndex)}
              onUpdateSet={(data) => onUpdateSet(setIndex, data)}
              showRestTimer={restOn}
              restSeconds={restDuration}
              onRestDone={onRestDone}
              isRestActive={isRestActive}
            />
          );
        })}

        {/* Add Set */}
        <button
          onClick={onAddSet}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '10px 0',
            background: SURFACE_UP,
            border: `1px dashed ${BORDER}`,
            borderRadius: 8,
            color: T2,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Plus size={14} />
          Add Set
        </button>
      </div>
    </div>
  );
}

// ─── Finish Confirm Modal ─────────────────────────────────────────────────────

interface FinishConfirmProps {
  elapsedSec: number;
  workout: import('@/services/workoutService').ActiveWorkout;
  onFinish: () => void;
  onCancel: () => void;
}

function FinishConfirmModal({ elapsedSec, workout, onFinish, onCancel }: FinishConfirmProps) {
  const totalSets = workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = workout.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.is_completed).length, 0
  );
  const totalVolume = workout.exercises.reduce((acc, ex) =>
    acc + ex.sets.filter(s => s.is_completed).reduce((a, s) => a + (s.weight_kg || 0) * (s.reps || 0), 0), 0
  );
  const min = Math.floor(elapsedSec / 60);
  const sec = elapsedSec % 60;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: SURFACE,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '24px 20px 40px',
          border: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: T3, margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T1, marginBottom: 6, textAlign: 'center' }}>
          Finish Workout?
        </h2>
        <p style={{ fontSize: 13, color: T2, textAlign: 'center', marginBottom: 24 }}>
          Here's your session summary
        </p>

        {/* Stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10, marginBottom: 24,
        }}>
          {[
            { label: 'Duration', value: `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`, icon: <Clock size={16} color={ACCENT} /> },
            { label: 'Sets Done', value: `${completedSets}/${totalSets}`, icon: <Check size={16} color={ACCENT} /> },
            { label: 'Volume', value: `${totalVolume.toFixed(0)} kg`, icon: <BarChart2 size={16} color={ACCENT} /> },
            { label: 'Exercises', value: `${workout.exercises.length}`, icon: <Dumbbell size={16} color={ACCENT} /> },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              background: SURFACE_UP, borderRadius: 12,
              padding: '12px 14px',
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{ ...flex('row', 'center', 'flex-start'), gap: 6, marginBottom: 4 }}>
                {icon}
                <span style={{ fontSize: 11, color: T2 }}>{label}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T1 }}>{value}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onFinish}
          style={{
            width: '100%', padding: '14px 0',
            background: ACCENT, border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 700, color: '#0C1015',
            cursor: 'pointer', marginBottom: 10,
          }}
        >
          Finish Workout
        </button>
        <button
          onClick={onCancel}
          style={{
            width: '100%', padding: '12px 0',
            background: 'transparent', border: `1px solid ${BORDER}`,
            borderRadius: 12, fontSize: 14, color: T2, cursor: 'pointer',
          }}
        >
          Keep Going
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Cancel Confirm Bottom Sheet ──────────────────────────────────────────────

function CancelConfirmSheet({ onKeep, onCancel }: { onKeep: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onKeep}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: SURFACE,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '24px 20px 40px',
          border: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: T3, margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T1, textAlign: 'center', marginBottom: 8 }}>
          Cancel Workout?
        </h2>
        <p style={{ fontSize: 13, color: T2, textAlign: 'center', marginBottom: 24 }}>
          Your progress will be lost.
        </p>
        <button
          onClick={onCancel}
          style={{
            width: '100%', padding: '14px 0',
            background: RED, border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 700, color: '#fff',
            cursor: 'pointer', marginBottom: 10,
          }}
        >
          Cancel Workout
        </button>
        <button
          onClick={onKeep}
          style={{
            width: '100%', padding: '12px 0',
            background: 'transparent', border: `1px solid ${BORDER}`,
            borderRadius: 12, fontSize: 14, color: T2, cursor: 'pointer',
          }}
        >
          Keep Going
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── WorkoutComplete celebration screen ───────────────────────────────────────

interface CompleteSummary {
  duration: number;
  totalVolume: number;
  totalSets: number;
  exerciseCount: number;
  xpEarned: number;
  rpEarned: number;
}

function WorkoutCompleteScreen({ summary, onBack }: { summary: CompleteSummary; onBack: () => void }) {
  const min = Math.floor(summary.duration / 60);
  const sec = summary.duration % 60;

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
    }}>
      {/* Gold check circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        style={{
          width: 88, height: 88, borderRadius: '50%',
          background: ACCENT, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          boxShadow: `0 0 40px ${ACCENT}50`,
        }}
      >
        <Check size={40} color="#0C1015" strokeWidth={3} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ fontSize: 26, fontWeight: 800, color: T1, marginBottom: 8, textAlign: 'center' }}
      >
        Workout Complete! 🎉
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{ fontSize: 14, color: T2, marginBottom: 32, textAlign: 'center' }}
      >
        Great session. Keep pushing!
      </motion.p>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10, width: '100%', maxWidth: 360, marginBottom: 20,
        }}
      >
        {[
          { label: 'Duration', value: `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`, icon: <Clock size={16} color={ACCENT} /> },
          { label: 'Volume', value: `${summary.totalVolume.toFixed(0)} kg`, icon: <BarChart2 size={16} color={ACCENT} /> },
          { label: 'Sets', value: String(summary.totalSets), icon: <Flame size={16} color={ACCENT} /> },
          { label: 'Exercises', value: String(summary.exerciseCount), icon: <Dumbbell size={16} color={ACCENT} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{
            background: SURFACE, borderRadius: 14,
            padding: '14px 16px',
            border: `1px solid ${BORDER}`,
          }}>
            <div style={{ ...flex('row', 'center', 'flex-start'), gap: 6, marginBottom: 6 }}>
              {icon}
              <span style={{ fontSize: 11, color: T2 }}>{label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T1 }}>{value}</div>
          </div>
        ))}
      </motion.div>

      {/* XP / RP pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ ...flex('row', 'center', 'center'), gap: 10, marginBottom: 32 }}
      >
        <div style={{
          ...flex('row', 'center', 'center'), gap: 6,
          padding: '8px 16px', borderRadius: 20,
          background: ACCENT_DIM,
          border: `1px solid ${ACCENT}40`,
        }}>
          <Zap size={14} color={ACCENT} />
          <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>
            +{summary.xpEarned} XP
          </span>
        </div>
        <div style={{
          ...flex('row', 'center', 'center'), gap: 6,
          padding: '8px 16px', borderRadius: 20,
          background: 'rgba(139,92,246,0.15)',
          border: '1px solid rgba(139,92,246,0.3)',
        }}>
          <Trophy size={14} color="#8B5CF6" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#8B5CF6' }}>
            +{summary.rpEarned} RP
          </span>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        onClick={onBack}
        style={{
          width: '100%', maxWidth: 360,
          padding: '15px 0',
          background: ACCENT, border: 'none',
          borderRadius: 14, fontSize: 15,
          fontWeight: 700, color: '#0C1015',
          cursor: 'pointer',
        }}
      >
        Back to Workouts
      </motion.button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const hook = useActiveWorkout();
  const { user } = useAuth();

  const locationState = (location.state ?? {}) as {
    routineId?: string;
    routineName?: string;
    mode?: string;
  };

  // ── State ──────────────────────────────────────────────────────────────────

  const [elapsedSec, setElapsedSec] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [activeRestTimer, setActiveRestTimer] = useState<{
    exerciseIndex: number;
    setIndex: number;
    seconds: number;
  } | null>(null);
  const [exerciseMenuOpen, setExerciseMenuOpen] = useState<number | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [workoutName, setWorkoutName] = useState('My Workout');
  const [completedSummary, setCompletedSummary] = useState<CompleteSummary | null>(null);
  const [initialized, setInitialized] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Timer ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSec(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timeDisplay = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(elapsedSec % 60).padStart(2, '0')}`;

  // ── Initialization ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (hook.loading || initialized) return;

    const { routineId, routineName, mode } = locationState;

    if (hook.workout) {
      // Resume existing
      setWorkoutName(hook.workout.name ?? 'My Workout');
      setInitialized(true);
      return;
    }

    if (routineId) {
      hook.startFromRoutine(routineId).then(() => {
        setWorkoutName(routineName ?? 'Routine Workout');
        setInitialized(true);
      });
    } else if (mode === 'empty' || !hook.workout) {
      const name = routineName ?? 'My Workout';
      hook.startEmpty(name).then(() => {
        setWorkoutName(name);
        setInitialized(true);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.loading, hook.workout, initialized]);

  // Sync name from workout state
  useEffect(() => {
    if (hook.workout?.name && !editingName) {
      setWorkoutName(hook.workout.name);
    }
  }, [hook.workout?.name, editingName]);

  // Focus name input when editing
  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  // Close menus on outside click
  useEffect(() => {
    const handler = () => setExerciseMenuOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const exercises = hook.workout?.exercises ?? [];
  const totalSets = exercises.reduce((a, ex) => a + ex.sets.length, 0);
  const completedSets = exercises.reduce((a, ex) => a + ex.sets.filter(s => s.is_completed).length, 0);
  const progressPct = totalSets > 0 ? completedSets / totalSets : 0;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleToggleComplete = useCallback(async (exIdx: number, setIdx: number) => {
    const ex = exercises[exIdx];
    if (!ex) return;
    const set = ex.sets[setIdx];
    if (!set) return;

    await hook.toggleSetComplete(exIdx, setIdx);

    // Start rest timer if set is being marked complete and rest is on
    const isNowComplete = !set.is_completed;
    if (isNowComplete && ex.rest_timer_seconds > 0) {
      setActiveRestTimer({ exerciseIndex: exIdx, setIndex: setIdx, seconds: ex.rest_timer_seconds });
    }
  }, [exercises, hook]);

  const handleFinish = useCallback(async () => {
    setShowFinishConfirm(false);
    const summary = await hook.finish();
    if (summary) {
      setCompletedSummary({
        duration: summary.duration,
        totalVolume: summary.totalVolume,
        totalSets: summary.totalSets,
        exerciseCount: summary.exerciseCount,
        xpEarned: summary.xpEarned,
        rpEarned: summary.rpEarned,
      });
    } else {
      navigate('/workouts');
    }
  }, [hook, navigate]);

  const handleCancel = useCallback(async () => {
    setShowCancelConfirm(false);
    await hook.cancel();
    navigate('/workouts');
  }, [hook, navigate]);

  const handleClearSets = useCallback((exIdx: number) => {
    const ex = exercises[exIdx];
    if (!ex) return;
    ex.sets.forEach((_, setIdx) => {
      if (ex.sets[setIdx].is_completed) {
        hook.toggleSetComplete(exIdx, setIdx);
      }
    });
  }, [exercises, hook]);

  // ── Render: Completion screen ──────────────────────────────────────────────

  if (completedSummary) {
    return (
      <WorkoutCompleteScreen
        summary={completedSummary}
        onBack={() => navigate('/workouts')}
      />
    );
  }

  // ── Render: Loading ────────────────────────────────────────────────────────

  if (hook.loading || !initialized) {
    return (
      <div style={{
        minHeight: '100vh', background: BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{
            width: 36, height: 36,
            borderRadius: '50%',
            border: `3px solid ${BORDER}`,
            borderTopColor: ACCENT,
          }}
        />
      </div>
    );
  }

  // ── Render: Main ───────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        height: 56,
        background: BG,
        borderBottom: `1px solid ${BORDER}`,
        ...flex('row', 'center', 'space-between'),
        padding: '0 12px',
        gap: 8,
      }}>
        {/* X button */}
        <button
          onClick={() => setShowCancelConfirm(true)}
          style={{
            background: SURFACE_UP, border: 'none',
            borderRadius: 8, padding: 8,
            color: T2, cursor: 'pointer',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
        >
          <X size={18} />
        </button>

        {/* Workout name (editable) */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {editingName ? (
            <input
              ref={nameInputRef}
              value={workoutName}
              onChange={e => setWorkoutName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingName(false); }}
              style={{
                background: SURFACE_UP,
                border: `1px solid ${ACCENT}50`,
                borderRadius: 8,
                padding: '4px 10px',
                color: T1,
                fontSize: 15,
                fontWeight: 600,
                textAlign: 'center',
                outline: 'none',
                width: '100%',
                maxWidth: 180,
              }}
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              style={{
                background: 'transparent', border: 'none',
                color: T1, fontSize: 15, fontWeight: 600,
                cursor: 'pointer', padding: '4px 8px',
                borderRadius: 6,
              }}
            >
              {workoutName}
            </button>
          )}
        </div>

        {/* Right side: timer + finish */}
        <div style={{ ...flex('row', 'center', 'flex-end'), gap: 8, flexShrink: 0 }}>
          {/* Timer chip */}
          <div style={{
            ...flex('row', 'center', 'center'),
            gap: 5,
            background: SURFACE_UP,
            borderRadius: 8,
            padding: '5px 10px',
            border: `1px solid ${BORDER}`,
          }}>
            <Clock size={13} color={ACCENT} />
            <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT, fontVariantNumeric: 'tabular-nums' }}>
              {timeDisplay}
            </span>
          </div>

          {/* Finish button */}
          <button
            onClick={() => setShowFinishConfirm(true)}
            style={{
              background: ACCENT, border: 'none',
              borderRadius: 8, padding: '7px 14px',
              fontSize: 13, fontWeight: 700,
              color: '#0C1015', cursor: 'pointer',
            }}
          >
            Finish
          </button>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: 3, background: SURFACE_UP, flexShrink: 0 }}>
        <motion.div
          animate={{ width: `${progressPct * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: '100%', background: ACCENT, borderRadius: 2 }}
        />
      </div>

      {/* ── Scrollable content ── */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '16px 12px 100px' }}
        onClick={() => exerciseMenuOpen !== null && setExerciseMenuOpen(null)}
      >
        {/* Exercise blocks */}
        <AnimatePresence>
          {exercises.map((entry, exIdx) => (
            <motion.div
              key={`${entry.exercise_id}-${exIdx}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              <ExerciseBlock
                entry={entry}
                exerciseIndex={exIdx}
                menuOpen={exerciseMenuOpen === exIdx}
                onMenuToggle={e => {
                  (e as unknown as React.MouseEvent).stopPropagation();
                  setExerciseMenuOpen(prev => prev === exIdx ? null : exIdx);
                }}
                onMenuClose={() => setExerciseMenuOpen(null)}
                onRemove={() => hook.removeExercise(exIdx)}
                onClearSets={() => handleClearSets(exIdx)}
                onAddSet={() => hook.addSet(exIdx)}
                onUpdateSet={(setIdx, data) => hook.updateSet(exIdx, setIdx, data)}
                onToggleComplete={(setIdx) => handleToggleComplete(exIdx, setIdx)}
                activeRestTimer={activeRestTimer}
                onRestDone={() => setActiveRestTimer(null)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {exercises.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '48px 20px', color: T3,
          }}>
            <Dumbbell size={40} color={T3} style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: T2, marginBottom: 6 }}>
              No exercises yet
            </p>
            <p style={{ fontSize: 13, color: T3, textAlign: 'center' }}>
              Tap "Add exercise" to get started
            </p>
          </div>
        )}

        {/* Add exercise button */}
        <button
          onClick={() => setShowPicker(true)}
          style={{
            width: '100%',
            padding: '16px 0',
            background: ACCENT_DIM,
            border: `1.5px dashed rgba(245,197,24,0.3)`,
            borderRadius: 14,
            color: ACCENT,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: exercises.length > 0 ? 4 : 0,
          }}
        >
          <Plus size={16} />
          Add exercise
        </button>
      </div>

      {/* ── Exercise Picker Overlay ── */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: BG }}
          >
            <ExercisePicker
              onAdd={async (exercise: Exercise) => {
                const newEx: WorkoutExerciseEntry = {
                  exercise_id: exercise.id,
                  name: exercise.name,
                  gif_url: exercise.gif_url,
                  body_part: exercise.body_part,
                  target_muscle: exercise.target_muscle,
                  exercise_type: exercise.exercise_type,
                  notes: '',
                  rest_timer_seconds: 90,
                  sets: [{
                    set_number: 1,
                    weight_kg: 0,
                    reps: 10,
                    duration_sec: null,
                    distance_km: null,
                    is_completed: false,
                    is_pr: false,
                    pr_type: null,
                    rest_seconds: 90,
                  }],
                };
                await hook.addExercise(newEx);
                setShowPicker(false);
              }}
              onClose={() => setShowPicker(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showFinishConfirm && hook.workout && (
          <FinishConfirmModal
            elapsedSec={elapsedSec}
            workout={hook.workout}
            onFinish={handleFinish}
            onCancel={() => setShowFinishConfirm(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCancelConfirm && (
          <CancelConfirmSheet
            onKeep={() => setShowCancelConfirm(false)}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// src/pages/ActiveWorkout.tsx
// Hevy-style active workout logger.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Check, Clock, ChevronDown, MoreHorizontal,
  Trash2, Dumbbell, Trophy, Zap, Flame, BarChart2, AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import ExercisePicker from '@/components/workout/ExercisePicker';
import type { WorkoutExerciseEntry, WorkoutSet, Exercise } from '@/services/workoutService';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG         = '#0C1015';
const SURFACE    = '#141A1F';
const SURFACE_UP = '#1C2429';
const ACCENT     = '#F5C518';
const BLUE       = '#3B82F6';
const BLUE_DIM   = 'rgba(59,130,246,0.12)';
const GREEN      = '#22C55E';
const GREEN_DIM  = 'rgba(34,197,94,0.12)';
const T1         = '#EAEEF2';
const T2         = '#8899AA';
const T3         = '#4A5568';
const BORDER     = 'rgba(255,255,255,0.07)';
const RED        = '#EF4444';
const WARM_COLOR = '#F59E0B';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return s === 0 ? `${m}m` : `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatRestLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}min`;
  return `${m}min ${s}s`;
}

// ─── Rest Timer overlay ───────────────────────────────────────────────────────

function RestCountdown({
  totalSeconds,
  onDone,
}: {
  totalSeconds: number;
  onDone: () => void;
}) {
  const [left, setLeft] = useState(totalSeconds);

  useEffect(() => {
    if (left <= 0) { onDone(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);

  const pct = (totalSeconds - left) / totalSeconds;
  const color = left <= 10 ? RED : left <= 20 ? '#F97316' : BLUE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', marginTop: 8,
        background: SURFACE_UP, borderRadius: 10,
        border: `1px solid ${color}40`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
            <circle cx="22" cy="22" r="18" fill="none" stroke={BORDER} strokeWidth="3" />
            <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={2 * Math.PI * 18}
              strokeDashoffset={2 * Math.PI * 18 * (1 - pct)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
            />
          </svg>
          <span style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 10, fontWeight: 700, color,
          }}>
            {left}s
          </span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T1 }}>Resting…</div>
          <div style={{ fontSize: 11, color: T2 }}>Stay hydrated</div>
        </div>
      </div>
      <button
        onClick={onDone}
        style={{
          padding: '6px 14px', borderRadius: 8,
          background: SURFACE, border: `1px solid ${BORDER}`,
          color: T2, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Skip
      </button>
    </motion.div>
  );
}

// ─── SetRow ───────────────────────────────────────────────────────────────────

interface SetRowProps {
  set: WorkoutSet;
  setIndex: number;
  exerciseType: string;
  prevHint: string;
  onToggleComplete: () => void;
  onUpdateSet: (data: Partial<WorkoutSet>) => void;
  onToggleWarmup: () => void;
  isRestActive: boolean;
  restSeconds: number;
  onRestDone: () => void;
}

function SetRow({
  set, setIndex, exerciseType, prevHint,
  onToggleComplete, onUpdateSet, onToggleWarmup,
  isRestActive, restSeconds, onRestDone,
}: SetRowProps) {
  const isWarmup   = !!set.is_warmup;
  const completed  = set.is_completed;

  const isWeightReps = exerciseType === 'weight_reps' || exerciseType === 'weighted_bodyweight';
  const isBodyweight = exerciseType === 'bodyweight_reps' || exerciseType === 'assisted_bodyweight';
  const isDuration   = exerciseType === 'duration' || exerciseType === 'duration_weight';
  const isDurWeight  = exerciseType === 'duration_weight';
  const isDistance   = exerciseType === 'distance_duration' || exerciseType === 'weight_distance';

  const rowBg = completed
    ? 'rgba(34,197,94,0.07)'
    : isWarmup
    ? 'rgba(245,158,11,0.05)'
    : 'transparent';

  const inputSt: React.CSSProperties = {
    background: completed ? 'rgba(34,197,94,0.08)' : SURFACE_UP,
    border: `1px solid ${completed ? 'rgba(34,197,94,0.2)' : BORDER}`,
    borderRadius: 7, width: 54, height: 38,
    textAlign: 'center', fontSize: 15, fontWeight: 700,
    color: completed ? GREEN : T1, outline: 'none', padding: '0 4px',
  };

  const repTarget =
    set.target_reps_min != null && set.target_reps_max != null
      ? `${set.target_reps_min}–${set.target_reps_max}`
      : set.reps > 0 ? String(set.reps) : undefined;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          display: 'flex', alignItems: 'center',
          minHeight: 48, padding: '4px 6px',
          borderRadius: 8, background: rowBg,
          transition: 'background 0.25s', gap: 6,
        }}
      >
        {/* Set label — "W" or number */}
        <button
          onClick={onToggleWarmup}
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: isWarmup ? 'rgba(245,158,11,0.15)' : SURFACE_UP,
            border: `1px solid ${isWarmup ? WARM_COLOR + '50' : BORDER}`,
            color: isWarmup ? WARM_COLOR : T3,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isWarmup ? 'W' : set.set_number}
        </button>

        {/* Previous */}
        <span style={{
          fontSize: 11, color: T3, textAlign: 'center', flexShrink: 0,
          width: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {prevHint}
        </span>

        {/* KG input */}
        {(isWeightReps || isDurWeight) && (
          <input
            type="number" inputMode="decimal"
            value={set.weight_kg || ''}
            onChange={e => onUpdateSet({ weight_kg: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            style={inputSt}
            min={0} step={0.5}
          />
        )}

        {/* Reps input */}
        {(isWeightReps || isBodyweight) && (
          <input
            type="number" inputMode="numeric"
            value={set.reps || ''}
            onChange={e => onUpdateSet({ reps: parseInt(e.target.value, 10) || 0 })}
            placeholder={repTarget ?? '0'}
            style={inputSt}
            min={0}
          />
        )}

        {/* Duration input */}
        {isDuration && !isDurWeight && (
          <input
            type="number" inputMode="numeric"
            value={set.duration_sec || ''}
            onChange={e => onUpdateSet({ duration_sec: parseInt(e.target.value, 10) || 0 })}
            placeholder="sec"
            style={{ ...inputSt, width: 64 }}
            min={0}
          />
        )}

        {/* Distance input */}
        {isDistance && (
          <input
            type="number" inputMode="decimal"
            value={set.distance_km || ''}
            onChange={e => onUpdateSet({ distance_km: parseFloat(e.target.value) || 0 })}
            placeholder="km"
            style={inputSt}
            min={0} step={0.1}
          />
        )}

        {/* Check */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onToggleComplete}
          style={{
            width: 30, height: 30, borderRadius: '50%', border: 'none',
            background: completed ? GREEN : SURFACE_UP,
            color: completed ? '#fff' : T3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, marginLeft: 'auto',
            transition: 'background 0.2s',
          }}
        >
          <Check size={14} strokeWidth={3} />
        </motion.button>
      </motion.div>

      {/* Rest countdown appears after completing set */}
      <AnimatePresence>
        {isRestActive && (
          <RestCountdown
            key={`rest-${setIndex}`}
            totalSeconds={restSeconds}
            onDone={onRestDone}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── ExerciseBlock ────────────────────────────────────────────────────────────

interface ExerciseBlockProps {
  entry: WorkoutExerciseEntry;
  exerciseIndex: number;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onRemove: () => void;
  onClearSets: () => void;
  onAddSet: (warmup?: boolean) => void;
  onUpdateSet: (setIndex: number, data: Partial<WorkoutSet>) => void;
  onToggleComplete: (setIndex: number) => void;
  onToggleWarmup: (setIndex: number) => void;
  activeRestTimer: { exerciseIndex: number; setIndex: number; seconds: number } | null;
  onRestDone: () => void;
}

const REST_PRESETS = [60, 90, 120, 180, 240, 300];

function ExerciseBlock({
  entry, exerciseIndex,
  menuOpen, onMenuToggle, onMenuClose,
  onRemove, onClearSets, onAddSet,
  onUpdateSet, onToggleComplete, onToggleWarmup,
  activeRestTimer, onRestDone,
}: ExerciseBlockProps) {
  const [notes, setNotes]             = useState(entry.notes ?? '');
  const [restOn, setRestOn]           = useState(entry.rest_timer_seconds > 0);
  const [restDuration, setRestDuration] = useState(entry.rest_timer_seconds || 90);
  const [showRestPicker, setShowRestPicker] = useState(false);

  const type        = entry.exercise_type;
  const isWeightReps = type === 'weight_reps' || type === 'weighted_bodyweight' || type === 'duration_weight';
  const isBodyweight = type === 'bodyweight_reps' || type === 'assisted_bodyweight';
  const isDuration   = type === 'duration' || type === 'duration_weight';
  const isDistance   = type === 'distance_duration' || type === 'weight_distance';

  const completedSets = entry.sets.filter(s => s.is_completed).length;
  const allDone       = entry.sets.length > 0 && completedSets === entry.sets.length;
  const warmupCount   = entry.sets.filter(s => s.is_warmup).length;
  const workSets      = entry.sets.filter(s => !s.is_warmup);

  const instructions = entry.instructions ?? [];

  return (
    <div style={{
      background: SURFACE, borderRadius: 16,
      border: `1px solid ${BORDER}`, marginBottom: 16, overflow: 'visible',
    }}>
      {/* ── Exercise header ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 12, padding: '14px 14px 12px',
      }}>
        {/* GIF / avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: 22, flexShrink: 0,
          background: SURFACE_UP, border: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {entry.gif_url ? (
            <img
              src={entry.gif_url}
              alt={entry.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Dumbbell size={18} color={T3} />
          )}
        </div>

        {/* Name + body part */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: allDone ? GREEN : BLUE,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {entry.name}
          </div>
          {(entry.body_part || entry.target_muscle) && (
            <div style={{ fontSize: 11, color: T3, marginTop: 1 }}>
              {[entry.body_part, entry.target_muscle].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* Three-dot menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onMenuToggle(); }}
            style={{
              background: 'transparent', border: 'none',
              color: T2, cursor: 'pointer', padding: 6,
              borderRadius: 8, display: 'flex', alignItems: 'center',
            }}
          >
            <MoreHorizontal size={20} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                transition={{ duration: 0.14 }}
                style={{
                  position: 'absolute', top: '100%', right: 0, zIndex: 60,
                  background: SURFACE_UP, borderRadius: 12,
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  minWidth: 172, overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => { onClearSets(); onMenuClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '12px 16px',
                    background: 'transparent', border: 'none',
                    color: T2, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  Clear Sets
                </button>
                <div style={{ height: 1, background: BORDER }} />
                <button
                  onClick={() => { onRemove(); onMenuClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '12px 16px',
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

      <div style={{ padding: '0 14px 14px' }}>
        {/* Instructions */}
        {instructions.length > 0 && (
          <p style={{
            fontSize: 13, color: T2, lineHeight: 1.55,
            margin: '0 0 10px', padding: '0 0 10px',
            borderBottom: `1px solid ${BORDER}`,
          }}>
            {instructions[0]}
          </p>
        )}

        {/* Notes textarea */}
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes here..."
          rows={1}
          style={{
            width: '100%', background: 'transparent',
            border: 'none', outline: 'none',
            color: T3, fontSize: 13, resize: 'none',
            padding: '4px 0 10px',
            borderBottom: `1px solid ${BORDER}`,
            marginBottom: 12, fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />

        {/* Rest Timer row */}
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => { setShowRestPicker(v => !v); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: 'none',
              cursor: 'pointer', padding: 0,
            }}
          >
            <Clock size={15} color={restOn ? BLUE : T3} />
            <span style={{ fontSize: 13, fontWeight: 600, color: restOn ? BLUE : T3 }}>
              Rest Timer: {restOn ? formatRestLabel(restDuration) : 'OFF'}
            </span>
            {restOn && <AlertTriangle size={13} color={WARM_COLOR} />}
          </button>

          <AnimatePresence>
            {showRestPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  display: 'flex', gap: 6, flexWrap: 'wrap',
                  paddingTop: 10,
                }}>
                  <button
                    onClick={() => { setRestOn(false); setShowRestPicker(false); }}
                    style={{
                      padding: '5px 10px', borderRadius: 8,
                      border: `1px solid ${!restOn ? BLUE : BORDER}`,
                      background: !restOn ? BLUE_DIM : 'transparent',
                      color: !restOn ? BLUE : T3,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    OFF
                  </button>
                  {REST_PRESETS.map(sec => (
                    <button
                      key={sec}
                      onClick={() => { setRestOn(true); setRestDuration(sec); setShowRestPicker(false); }}
                      style={{
                        padding: '5px 10px', borderRadius: 8,
                        border: `1px solid ${restOn && restDuration === sec ? BLUE : BORDER}`,
                        background: restOn && restDuration === sec ? BLUE_DIM : 'transparent',
                        color: restOn && restDuration === sec ? BLUE : T3,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {formatRestLabel(sec)}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Set table header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '4px 6px', marginBottom: 2, gap: 6,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T3, width: 28, textAlign: 'center' }}>SET</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T3, width: 60, textAlign: 'center' }}>PREVIOUS</span>
          {isWeightReps && (
            <span style={{ fontSize: 11, fontWeight: 700, color: T3, flex: 1, textAlign: 'center' }}>
              🏋 KG
            </span>
          )}
          {(isWeightReps || isBodyweight) && (
            <span style={{ fontSize: 11, fontWeight: 700, color: T3, flex: 1, textAlign: 'center' }}>REPS</span>
          )}
          {isDuration && (
            <span style={{ fontSize: 11, fontWeight: 700, color: T3, flex: 1, textAlign: 'center' }}>TIME</span>
          )}
          {isDistance && (
            <span style={{ fontSize: 11, fontWeight: 700, color: T3, flex: 1, textAlign: 'center' }}>KM</span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: T3, width: 30, textAlign: 'center' }}>✓</span>
        </div>

        {/* Set rows */}
        {entry.sets.map((set, setIndex) => {
          const isRestActive =
            activeRestTimer?.exerciseIndex === exerciseIndex &&
            activeRestTimer?.setIndex === setIndex;

          let prevHint = '–';
          if (!set.is_warmup && set.weight_kg > 0) {
            prevHint = `${set.weight_kg}kg × ${set.reps}`;
          } else if (!set.is_warmup && set.reps > 0) {
            prevHint = `× ${set.reps}`;
          }

          return (
            <SetRow
              key={setIndex}
              set={set}
              setIndex={setIndex}
              exerciseType={entry.exercise_type}
              prevHint={prevHint}
              onToggleComplete={() => onToggleComplete(setIndex)}
              onUpdateSet={data => onUpdateSet(setIndex, data)}
              onToggleWarmup={() => onToggleWarmup(setIndex)}
              isRestActive={isRestActive}
              restSeconds={restDuration}
              onRestDone={onRestDone}
            />
          );
        })}

        {/* Add Set / Add Warm-up */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {warmupCount === 0 && (
            <button
              onClick={() => onAddSet(true)}
              style={{
                flex: 1, padding: '10px 0',
                background: 'rgba(245,158,11,0.08)',
                border: `1px dashed ${WARM_COLOR}40`,
                borderRadius: 8, color: WARM_COLOR,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <Plus size={13} />
              Warm-up
            </button>
          )}
          <button
            onClick={() => onAddSet(false)}
            style={{
              flex: 2, padding: '10px 0',
              background: SURFACE_UP,
              border: `1px dashed ${BORDER}`,
              borderRadius: 8, color: T2,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Plus size={14} />
            Add Set
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Finish Confirm ───────────────────────────────────────────────────────────

interface FinishConfirmProps {
  elapsedSec: number;
  workout: import('@/services/workoutService').ActiveWorkout;
  onFinish: () => void;
  onCancel: () => void;
}

function FinishConfirmModal({ elapsedSec, workout, onFinish, onCancel }: FinishConfirmProps) {
  const totalSets     = workout.exercises.reduce((a, ex) => a + ex.sets.filter(s => !s.is_warmup).length, 0);
  const completedSets = workout.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.is_completed && !s.is_warmup).length, 0);
  const totalVolume   = workout.exercises.reduce((a, ex) =>
    a + ex.sets.filter(s => s.is_completed && !s.is_warmup).reduce((b, s) => b + (s.weight_kg || 0) * (s.reps || 0), 0), 0);
  const min = Math.floor(elapsedSec / 60);
  const sec = elapsedSec % 60;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
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
          Session summary
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Duration',   value: `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`, icon: <Clock size={16} color={ACCENT} /> },
            { label: 'Sets Done',  value: `${completedSets}/${totalSets}`,     icon: <Check size={16} color={ACCENT} /> },
            { label: 'Volume',     value: `${totalVolume.toFixed(0)} kg`,       icon: <BarChart2 size={16} color={ACCENT} /> },
            { label: 'Exercises',  value: `${workout.exercises.length}`,        icon: <Dumbbell size={16} color={ACCENT} /> },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              background: SURFACE_UP, borderRadius: 12,
              padding: '12px 14px', border: `1px solid ${BORDER}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
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
            background: BLUE, border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 700, color: '#fff',
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

// ─── Cancel Confirm ───────────────────────────────────────────────────────────

function CancelConfirmSheet({ onKeep, onCancel }: { onKeep: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onKeep}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: SURFACE,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '24px 20px 40px', border: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: T3, margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T1, textAlign: 'center', marginBottom: 8 }}>
          Discard Workout?
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
          Discard Workout
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

// ─── Workout Complete screen ──────────────────────────────────────────────────

interface CompleteSummary {
  duration: number; totalVolume: number; totalSets: number;
  exerciseCount: number; xpEarned: number; rpEarned: number;
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
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        style={{
          width: 88, height: 88, borderRadius: '50%',
          background: BLUE, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, boxShadow: `0 0 40px ${BLUE}50`,
        }}
      >
        <Check size={40} color="#fff" strokeWidth={3} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ fontSize: 26, fontWeight: 800, color: T1, marginBottom: 8, textAlign: 'center' }}
      >
        Workout Complete! 🎉
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{ fontSize: 14, color: T2, marginBottom: 32, textAlign: 'center' }}
      >
        Great session. Keep pushing!
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10, width: '100%', maxWidth: 360, marginBottom: 20,
        }}
      >
        {[
          { label: 'Duration',  value: `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`, icon: <Clock size={16} color={BLUE} /> },
          { label: 'Volume',    value: `${summary.totalVolume.toFixed(0)} kg`,  icon: <BarChart2 size={16} color={BLUE} /> },
          { label: 'Sets',      value: String(summary.totalSets),               icon: <Flame size={16} color={BLUE} /> },
          { label: 'Exercises', value: String(summary.exerciseCount),           icon: <Dumbbell size={16} color={BLUE} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{
            background: SURFACE, borderRadius: 14,
            padding: '14px 16px', border: `1px solid ${BORDER}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              {icon}
              <span style={{ fontSize: 11, color: T2 }}>{label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T1 }}>{value}</div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 20,
          background: BLUE_DIM, border: `1px solid ${BLUE}40`,
        }}>
          <Zap size={14} color={BLUE} />
          <span style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>
            +{summary.xpEarned} XP
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 20,
          background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
        }}>
          <Trophy size={14} color="#8B5CF6" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#8B5CF6' }}>
            +{summary.rpEarned} RP
          </span>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        onClick={onBack}
        style={{
          width: '100%', maxWidth: 360, padding: '15px 0',
          background: BLUE, border: 'none',
          borderRadius: 14, fontSize: 15, fontWeight: 700,
          color: '#fff', cursor: 'pointer',
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
  const hook     = useActiveWorkout();

  const locationState = (location.state ?? {}) as {
    routineId?: string;
    routineName?: string;
    mode?: string;
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const [elapsedSec, setElapsedSec]         = useState(0);
  const [showPicker, setShowPicker]         = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [activeRestTimer, setActiveRestTimer] = useState<{
    exerciseIndex: number; setIndex: number; seconds: number;
  } | null>(null);
  const [exerciseMenuOpen, setExerciseMenuOpen] = useState<number | null>(null);
  const [editingName, setEditingName]       = useState(false);
  const [workoutName, setWorkoutName]       = useState('Log Workout');
  const [completedSummary, setCompletedSummary] = useState<CompleteSummary | null>(null);
  const [initialized, setInitialized]       = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Initialization ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (hook.loading || initialized) return;
    const { routineId, routineName, mode } = locationState;

    if (hook.workout) {
      setWorkoutName(hook.workout.name ?? 'Log Workout');
      setInitialized(true);
      return;
    }

    if (routineId) {
      hook.startFromRoutine(routineId).then(() => {
        setWorkoutName(routineName ?? 'Log Workout');
        setInitialized(true);
      });
    } else {
      const name = routineName ?? 'Log Workout';
      hook.startEmpty(name).then(() => {
        setWorkoutName(name);
        setInitialized(true);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.loading, hook.workout, initialized]);

  useEffect(() => {
    if (hook.workout?.name && !editingName) setWorkoutName(hook.workout.name);
  }, [hook.workout?.name, editingName]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  useEffect(() => {
    const handler = () => setExerciseMenuOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const exercises    = hook.workout?.exercises ?? [];
  const workSetsAll  = exercises.flatMap(ex => ex.sets.filter(s => !s.is_warmup));
  const totalSets    = workSetsAll.length;
  const completedSets = workSetsAll.filter(s => s.is_completed).length;
  const progressPct  = totalSets > 0 ? completedSets / totalSets : 0;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleComplete = useCallback(async (exIdx: number, setIdx: number) => {
    const ex  = exercises[exIdx];
    const set = ex?.sets[setIdx];
    if (!ex || !set) return;

    await hook.toggleSetComplete(exIdx, setIdx);

    const isNowComplete = !set.is_completed;
    if (isNowComplete && ex.rest_timer_seconds > 0 && !set.is_warmup) {
      setActiveRestTimer({ exerciseIndex: exIdx, setIndex: setIdx, seconds: ex.rest_timer_seconds });
    }
  }, [exercises, hook]);

  const handleToggleWarmup = useCallback((exIdx: number, setIdx: number) => {
    const ex  = exercises[exIdx];
    const set = ex?.sets[setIdx];
    if (!ex || !set) return;
    hook.updateSet(exIdx, setIdx, { is_warmup: !set.is_warmup });
  }, [exercises, hook]);

  const handleAddSet = useCallback((exIdx: number, warmup = false) => {
    if (!exercises[exIdx]) return;
    hook.addSet(exIdx, { is_warmup: warmup });
  }, [exercises, hook]);

  const handleFinish = useCallback(async () => {
    setShowFinishConfirm(false);
    const summary = await hook.finish();
    if (summary) {
      setCompletedSummary({
        duration: summary.duration, totalVolume: summary.totalVolume,
        totalSets: summary.totalSets, exerciseCount: summary.exerciseCount,
        xpEarned: summary.xpEarned, rpEarned: summary.rpEarned,
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
    ex.sets.forEach((s, si) => {
      if (s.is_completed) hook.toggleSetComplete(exIdx, si);
    });
  }, [exercises, hook]);

  // ── Render: complete ───────────────────────────────────────────────────────
  if (completedSummary) {
    return <WorkoutCompleteScreen summary={completedSummary} onBack={() => navigate('/workouts')} />;
  }

  // ── Render: loading ────────────────────────────────────────────────────────
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
            width: 36, height: 36, borderRadius: '50%',
            border: `3px solid ${BORDER}`, borderTopColor: BLUE,
          }}
        />
      </div>
    );
  }

  // ── Render: main ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: BG, borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center',
        padding: '0 14px', height: 54, gap: 10,
      }}>
        {/* Collapse / back */}
        <button
          onClick={() => navigate('/workouts')}
          style={{
            background: 'transparent', border: 'none',
            color: T2, cursor: 'pointer', padding: 4,
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
        >
          <ChevronDown size={22} />
        </button>

        {/* Elapsed */}
        <span style={{
          fontSize: 15, fontWeight: 700, color: T1,
          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        }}>
          {formatElapsed(elapsedSec)}
        </span>

        {/* Workout name (center, editable) */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {editingName ? (
            <input
              ref={nameInputRef}
              value={workoutName}
              onChange={e => setWorkoutName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingName(false); }}
              style={{
                background: SURFACE_UP, border: `1px solid ${BLUE}50`,
                borderRadius: 8, padding: '4px 10px',
                color: T1, fontSize: 14, fontWeight: 600,
                textAlign: 'center', outline: 'none',
                width: '100%', maxWidth: 160,
              }}
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              style={{
                background: 'transparent', border: 'none',
                color: T1, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
                maxWidth: 160, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {workoutName}
            </button>
          )}
        </div>

        {/* Clock + Finish */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Clock size={20} color={T2} />
          <button
            onClick={() => setShowFinishConfirm(true)}
            style={{
              background: BLUE, border: 'none',
              borderRadius: 8, padding: '7px 16px',
              fontSize: 14, fontWeight: 700,
              color: '#fff', cursor: 'pointer',
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
          style={{ height: '100%', background: BLUE, borderRadius: 2 }}
        />
      </div>

      {/* ── Scrollable body ── */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 120px' }}
        onClick={() => exerciseMenuOpen !== null && setExerciseMenuOpen(null)}
      >
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
                onMenuToggle={() => setExerciseMenuOpen(p => p === exIdx ? null : exIdx)}
                onMenuClose={() => setExerciseMenuOpen(null)}
                onRemove={() => hook.removeExercise(exIdx)}
                onClearSets={() => handleClearSets(exIdx)}
                onAddSet={(warmup = false) => handleAddSet(exIdx, warmup)}
                onUpdateSet={(si, data) => hook.updateSet(exIdx, si, data)}
                onToggleComplete={si => handleToggleComplete(exIdx, si)}
                onToggleWarmup={si => handleToggleWarmup(exIdx, si)}
                activeRestTimer={activeRestTimer}
                onRestDone={() => setActiveRestTimer(null)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {exercises.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '56px 20px', color: T3,
          }}>
            <Dumbbell size={40} color={T3} style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: T2, marginBottom: 6 }}>
              No exercises yet
            </p>
            <p style={{ fontSize: 13, color: T3, textAlign: 'center' }}>
              Tap "+ Add Exercise" below to get started
            </p>
          </div>
        )}
      </div>

      {/* ── Sticky bottom bar ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: BG, borderTop: `1px solid ${BORDER}`,
        padding: '12px 14px max(16px, env(safe-area-inset-bottom))',
      }}>
        {/* Add Exercise */}
        <button
          onClick={() => setShowPicker(true)}
          style={{
            width: '100%', padding: '14px 0',
            background: BLUE, border: 'none',
            borderRadius: 12, color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 10,
          }}
        >
          <Plus size={18} />
          Add Exercise
        </button>

        {/* Settings / Discard row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{
              flex: 1, padding: '11px 0',
              background: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: 12, color: T1,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Settings
          </button>
          <button
            onClick={() => setShowCancelConfirm(true)}
            style={{
              flex: 1, padding: '11px 0',
              background: 'transparent', border: `1px solid rgba(239,68,68,0.3)`,
              borderRadius: 12, color: RED,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Discard Workout
          </button>
        </div>
      </div>

      {/* ── Exercise Picker ── */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: BG }}
          >
            <ExercisePicker
              onAdd={async (exercise: Exercise) => {
                const newEx: WorkoutExerciseEntry = {
                  exercise_id:       exercise.id,
                  name:              exercise.name,
                  gif_url:           exercise.gif_url,
                  body_part:         exercise.body_part,
                  target_muscle:     exercise.target_muscle,
                  exercise_type:     exercise.exercise_type,
                  notes:             '',
                  rest_timer_seconds: 90,
                  instructions:      (exercise as any).instructions ?? [],
                  sets: [{
                    set_number: 1,
                    weight_kg: 0, reps: 0,
                    duration_sec: null, distance_km: null,
                    is_completed: false, is_pr: false, pr_type: null,
                    rest_seconds: 90, is_warmup: false,
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

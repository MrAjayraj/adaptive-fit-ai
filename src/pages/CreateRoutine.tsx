// src/pages/CreateRoutine.tsx — Hevy-style routine builder

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  Plus,
  Minus,
  MoreHorizontal,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useRoutines } from '@/hooks/useRoutines';
import ExercisePicker from '@/components/workout/ExercisePicker';
import type { Exercise } from '@/services/workoutService';
import type { RoutineExercise } from '@/services/workoutService';

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG         = '#0C1015';
const SURFACE    = '#141A1F';
const SURFACE_UP = '#1C2429';
const ACCENT     = '#F5C518';
const T1         = '#EAEEF2';
const T2         = '#8899AA';
const T3         = '#4A5568';
const ACCENT_DIM = 'rgba(245,197,24,0.12)';
const BORDER     = 'rgba(255,255,255,0.07)';
const RED        = '#EF4444';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoutineSet {
  reps: number;
  weight_kg: number;
  duration_sec?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function noop() {}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ExerciseMenuProps {
  onRemove: () => void;
  onClearSets: () => void;
  onClose: () => void;
}

function ExerciseMenu({ onRemove, onClearSets, onClose }: ExerciseMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 28,
        right: 0,
        background: SURFACE_UP,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        overflow: 'hidden',
        zIndex: 50,
        minWidth: 170,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <button
        onClick={() => { onRemove(); onClose(); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: RED,
          fontSize: 14,
          textAlign: 'left',
        }}
      >
        <Trash2 style={{ width: 15, height: 15 }} />
        Remove Exercise
      </button>
      <div style={{ height: 1, background: BORDER }} />
      <button
        onClick={() => { onClearSets(); onClose(); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: T2,
          fontSize: 14,
          textAlign: 'left',
        }}
      >
        <Minus style={{ width: 15, height: 15 }} />
        Clear Sets
      </button>
    </div>
  );
}

interface ExerciseBlockProps {
  ex: RoutineExercise;
  exIdx: number;
  onRemove: () => void;
  onUpdateNotes: (v: string) => void;
  onToggleRestTimer: () => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
  onUpdateSet: (setIdx: number, field: 'reps' | 'weight_kg', value: number) => void;
  onClearSets: () => void;
}

function ExerciseBlock({
  ex,
  exIdx,
  onRemove,
  onUpdateNotes,
  onToggleRestTimer,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onClearSets,
}: ExerciseBlockProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const restOn = ex.rest_timer_seconds > 0;

  return (
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      {/* Name row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px 8px',
          position: 'relative',
        }}
      >
        <Reorder.DragControls>
          <div style={{ cursor: 'grab', color: T3, display: 'flex', alignItems: 'center' }}>
            <GripVertical style={{ width: 18, height: 18 }} />
          </div>
        </Reorder.DragControls>

        <span
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: 700,
            color: ACCENT,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {ex.exercise_name}
        </span>

        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: T2,
            display: 'flex',
            alignItems: 'center',
            padding: 4,
            borderRadius: 6,
          }}
        >
          <MoreHorizontal style={{ width: 18, height: 18 }} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ duration: 0.12 }}
              style={{ position: 'absolute', top: 36, right: 12, zIndex: 50 }}
            >
              <ExerciseMenu
                onRemove={onRemove}
                onClearSets={onClearSets}
                onClose={() => setMenuOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notes */}
      <div style={{ padding: '0 14px 8px' }}>
        <input
          value={ex.notes}
          onChange={e => onUpdateNotes(e.target.value)}
          placeholder="Add routine notes here..."
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 12,
            color: T2,
            caretColor: ACCENT,
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Rest timer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <span style={{ fontSize: 12, color: T2 }}>Rest Timer</span>
        <button
          onClick={onToggleRestTimer}
          style={{
            background: restOn ? ACCENT_DIM : SURFACE_UP,
            border: `1px solid ${restOn ? ACCENT : BORDER}`,
            borderRadius: 20,
            padding: '3px 12px',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            color: restOn ? ACCENT : T3,
            letterSpacing: '0.05em',
          }}
        >
          {restOn ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Sets table */}
      <div style={{ padding: '8px 0' }}>
        {/* Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '44px 1fr 72px 72px 36px',
            padding: '0 14px',
            marginBottom: 4,
          }}
        >
          {['SET', 'PREV', 'KG', 'REPS', ''].map((h, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: T3,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                textAlign: 'center',
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Set rows */}
        <AnimatePresence initial={false}>
          {ex.sets.map((set, setIdx) => (
            <motion.div
              key={setIdx}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 44 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr 72px 72px 36px',
                alignItems: 'center',
                height: 44,
                padding: '0 14px',
                overflow: 'hidden',
              }}
            >
              {/* Set number */}
              <span
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: T3,
                }}
              >
                {setIdx + 1}
              </span>

              {/* Prev */}
              <span
                style={{
                  textAlign: 'center',
                  fontSize: 12,
                  color: T3,
                }}
              >
                —
              </span>

              {/* Weight input */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input
                  type="number"
                  value={set.weight_kg || ''}
                  onChange={e =>
                    onUpdateSet(setIdx, 'weight_kg', parseFloat(e.target.value) || 0)
                  }
                  style={{
                    width: 52,
                    background: SURFACE_UP,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    textAlign: 'center',
                    fontSize: 15,
                    color: T1,
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    padding: '4px 0',
                    outline: 'none',
                    MozAppearance: 'textfield',
                  }}
                  inputMode="decimal"
                />
              </div>

              {/* Reps input */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input
                  type="number"
                  value={set.reps || ''}
                  onChange={e =>
                    onUpdateSet(setIdx, 'reps', parseInt(e.target.value) || 0)
                  }
                  style={{
                    width: 52,
                    background: SURFACE_UP,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    textAlign: 'center',
                    fontSize: 15,
                    color: T1,
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    padding: '4px 0',
                    outline: 'none',
                    MozAppearance: 'textfield',
                  }}
                  inputMode="numeric"
                />
              </div>

              {/* Delete row */}
              <button
                onClick={() => onRemoveSet(setIdx)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: T3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  borderRadius: 4,
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add set */}
        <div style={{ padding: '4px 14px 2px' }}>
          <button
            onClick={onAddSet}
            style={{
              width: '100%',
              height: 40,
              background: SURFACE_UP,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: T2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Add Set
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CreateRoutine() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const routines   = useRoutines();
  const titleRef   = useRef<HTMLInputElement>(null);

  // Detect existing routine passed via location state
  const existingRoutine = (location.state as { existingRoutine?: { id: string; name: string; exercises: RoutineExercise[]; notes?: string } })?.existingRoutine;

  const [routineName, setRoutineName] = useState(existingRoutine?.name ?? '');
  const [exercises, setExercises]     = useState<RoutineExercise[]>(existingRoutine?.exercises ?? []);
  const [notes, setNotes]             = useState(existingRoutine?.notes ?? '');
  const [showPicker, setShowPicker]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [editingId]                   = useState<string | null>(existingRoutine?.id ?? null);
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem('routine-hint-dismissed') === 'true'
  );

  // Auto-focus the title field on mount
  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 100);
  }, []);

  // ── Set management ────────────────────────────────────────────────────────

  function addSet(exIdx: number) {
    setExercises(prev => {
      const next = [...prev];
      const ex   = { ...next[exIdx] };
      const last = ex.sets[ex.sets.length - 1] ?? { reps: 10, weight_kg: 0 };
      ex.sets    = [...ex.sets, { reps: last.reps, weight_kg: last.weight_kg }];
      next[exIdx] = ex;
      return next;
    });
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises(prev => {
      const next = [...prev];
      const ex   = { ...next[exIdx] };
      ex.sets    = ex.sets.filter((_, i) => i !== setIdx);
      next[exIdx] = ex;
      return next;
    });
  }

  function updateSet(exIdx: number, setIdx: number, field: 'reps' | 'weight_kg', value: number) {
    setExercises(prev => {
      const next = [...prev];
      const ex   = { ...next[exIdx] };
      ex.sets    = ex.sets.map((s, i) => (i === setIdx ? { ...s, [field]: value } : s));
      next[exIdx] = ex;
      return next;
    });
  }

  function removeExercise(exIdx: number) {
    setExercises(prev => prev.filter((_, i) => i !== exIdx));
  }

  function clearSets(exIdx: number) {
    setExercises(prev => {
      const next  = [...prev];
      next[exIdx] = { ...next[exIdx], sets: [] };
      return next;
    });
  }

  function updateNotes(exIdx: number, value: string) {
    setExercises(prev => {
      const next  = [...prev];
      next[exIdx] = { ...next[exIdx], notes: value };
      return next;
    });
  }

  function toggleRestTimer(exIdx: number) {
    setExercises(prev => {
      const next = [...prev];
      const cur  = next[exIdx].rest_timer_seconds;
      next[exIdx] = { ...next[exIdx], rest_timer_seconds: cur > 0 ? 0 : 90 };
      return next;
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!routineName.trim() || exercises.length === 0 || saving) return;
    setSaving(true);
    try {
      if (editingId) {
        await routines.update(editingId, { name: routineName.trim(), exercises, notes });
      } else {
        await routines.create(routineName.trim(), exercises, notes);
      }
      navigate(-1);
    } finally {
      setSaving(false);
    }
  }

  function dismissHint() {
    localStorage.setItem('routine-hint-dismissed', 'true');
    setHintDismissed(true);
  }

  const canSave = routineName.trim().length > 0 && exercises.length > 0 && !saving;
  const isEditing = !!editingId;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: BG,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* ── Sticky header ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(12,16,21,0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          minHeight: 52,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: T2,
            fontSize: 15,
            fontFamily: 'inherit',
            padding: '4px 0',
          }}
        >
          Cancel
        </button>

        <span style={{ fontSize: 17, fontWeight: 700, color: T1 }}>
          {isEditing ? 'Edit Routine' : 'Create Routine'}
        </span>

        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            background: 'none',
            border: 'none',
            cursor: canSave ? 'pointer' : 'not-allowed',
            color: canSave ? ACCENT : T3,
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'inherit',
            padding: '4px 0',
            transition: 'color 0.15s',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 120px' }}>

        {/* Hint banner */}
        <AnimatePresence>
          {!hintDismissed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  background: ACCENT_DIM,
                  border: `1px solid rgba(245,197,24,0.25)`,
                  borderRadius: 12,
                  padding: '10px 12px',
                  marginTop: 16,
                  marginBottom: 0,
                }}
              >
                <p style={{ flex: 1, fontSize: 13, color: '#D4A900', margin: 0, lineHeight: 1.5 }}>
                  You're creating a Routine. Exercises can be reordered by dragging.
                </p>
                <button
                  onClick={dismissHint}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#D4A900',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 2,
                    flexShrink: 0,
                  }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Routine title */}
        <div style={{ marginTop: 20, marginBottom: 24 }}>
          <input
            ref={titleRef}
            value={routineName}
            onChange={e => setRoutineName(e.target.value)}
            placeholder="Routine Title"
            style={{
              width: '100%',
              background: SURFACE,
              border: 'none',
              outline: 'none',
              borderRadius: 12,
              padding: '14px 16px',
              fontSize: 24,
              fontWeight: 700,
              color: T1,
              fontFamily: 'inherit',
              caretColor: ACCENT,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Notes field */}
        <div style={{ marginBottom: 20 }}>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add workout notes (optional)..."
            style={{
              width: '100%',
              background: SURFACE,
              border: 'none',
              outline: 'none',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              color: T2,
              fontFamily: 'inherit',
              caretColor: ACCENT,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Exercise list or empty state */}
        {exercises.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 60,
              paddingBottom: 40,
              gap: 12,
            }}
          >
            <Dumbbell style={{ width: 48, height: 48, color: T3 }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: T2, margin: 0 }}>
              Get started by adding an exercise
            </p>
            <p style={{ fontSize: 13, color: T3, margin: 0 }}>
              Tap '+ Add exercise' below
            </p>
          </motion.div>
        ) : (
          <Reorder.Group
            axis="y"
            values={exercises}
            onReorder={setExercises}
            style={{ listStyle: 'none', padding: 0, margin: 0 }}
          >
            <AnimatePresence initial={false}>
              {exercises.map((ex, exIdx) => (
                <Reorder.Item
                  key={ex.exercise_id + '-' + exIdx}
                  value={ex}
                  style={{ outline: 'none' }}
                >
                  <ExerciseBlock
                    ex={ex}
                    exIdx={exIdx}
                    onRemove={() => removeExercise(exIdx)}
                    onUpdateNotes={v => updateNotes(exIdx, v)}
                    onToggleRestTimer={() => toggleRestTimer(exIdx)}
                    onAddSet={() => addSet(exIdx)}
                    onRemoveSet={setIdx => removeSet(exIdx, setIdx)}
                    onUpdateSet={(setIdx, field, value) => updateSet(exIdx, setIdx, field, value)}
                    onClearSets={() => clearSets(exIdx)}
                  />
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      {/* ── Bottom: Add exercise button ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px 28px',
          background: `linear-gradient(to top, ${BG} 70%, transparent)`,
          zIndex: 30,
        }}
      >
        <button
          onClick={() => setShowPicker(true)}
          style={{
            width: '100%',
            padding: '15px 0',
            background: ACCENT,
            border: 'none',
            borderRadius: 14,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 700,
            color: '#0C1015',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Plus style={{ width: 18, height: 18 }} />
          Add exercise
        </button>
      </div>

      {/* ── Exercise picker overlay ── */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100 }}
          >
            <ExercisePicker
              onAdd={(exercise: Exercise) => {
                const newEx: RoutineExercise = {
                  exercise_id: exercise.id,
                  exercise_name: exercise.name,
                  gif_url: exercise.gif_url,
                  body_part: exercise.body_part,
                  target_muscle: exercise.target_muscle,
                  exercise_type: exercise.exercise_type,
                  notes: '',
                  rest_timer_seconds: 90,
                  sets: [{ reps: 10, weight_kg: 0 }],
                };
                setExercises(prev => [...prev, newEx]);
                setShowPicker(false);
              }}
              onClose={() => setShowPicker(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

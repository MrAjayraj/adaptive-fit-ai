// src/pages/CreateCustomExercise.tsx — Hevy-style custom exercise creator

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { createCustomExercise } from '@/services/workoutService';
import { supabase } from '@/integrations/supabase/client';

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

// ── Constants ─────────────────────────────────────────────────────────────────

const EQUIPMENT_OPTIONS = [
  { value: 'none',            label: 'None',             emoji: '🚫' },
  { value: 'barbell',         label: 'Barbell',          emoji: '🏋️' },
  { value: 'dumbbell',        label: 'Dumbbell',         emoji: '💪' },
  { value: 'kettlebell',      label: 'Kettlebell',       emoji: '⚫' },
  { value: 'machine',         label: 'Machine',          emoji: '🔩' },
  { value: 'plate',           label: 'Plate',            emoji: '🔘' },
  { value: 'resistance band', label: 'Resistance Band',  emoji: '🎗️' },
  { value: 'cable',           label: 'Cable',            emoji: '📎' },
  { value: 'other',           label: 'Other',            emoji: '📦' },
];

const MUSCLE_OPTIONS = [
  'Abdominals', 'Biceps', 'Calves', 'Chest', 'Forearms',
  'Glutes', 'Hamstrings', 'Lats', 'Lower Back', 'Quadriceps',
  'Shoulders', 'Traps', 'Triceps', 'Upper Back', 'Other',
];

interface ExerciseTypeOption {
  value: string;
  label: string;
  description: string;
  tags: string[];
}

const EXERCISE_TYPE_OPTIONS: ExerciseTypeOption[] = [
  {
    value: 'weight_reps',
    label: 'Weight & Reps',
    description: 'e.g. Bench Press',
    tags: ['REPS', 'KG'],
  },
  {
    value: 'bodyweight_reps',
    label: 'Bodyweight Reps',
    description: 'e.g. Pull Up',
    tags: ['REPS'],
  },
  {
    value: 'weighted_bodyweight',
    label: 'Weighted Bodyweight',
    description: 'e.g. Weighted Pull Up',
    tags: ['REPS', '+KG'],
  },
  {
    value: 'assisted_bodyweight',
    label: 'Assisted Bodyweight',
    description: 'e.g. Assisted Pull Up',
    tags: ['REPS', '-KG'],
  },
  {
    value: 'duration',
    label: 'Duration',
    description: 'e.g. Plank',
    tags: ['TIME'],
  },
  {
    value: 'duration_weight',
    label: 'Duration & Weight',
    description: 'e.g. Weighted Plank',
    tags: ['KG', 'TIME'],
  },
  {
    value: 'distance_duration',
    label: 'Distance & Duration',
    description: 'e.g. Running',
    tags: ['KM', 'TIME'],
  },
  {
    value: 'weight_distance',
    label: 'Weight & Distance',
    description: "e.g. Farmer's Walk",
    tags: ['KG', 'KM'],
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeTag({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: T3,
        background: SURFACE_UP,
        border: `1px solid ${BORDER}`,
        borderRadius: 4,
        padding: '2px 5px',
        letterSpacing: '0.06em',
      }}
    >
      {label}
    </span>
  );
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              zIndex: 80,
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: SURFACE,
              borderRadius: '20px 20px 0 0',
              zIndex: 90,
              maxHeight: '80dvh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Handle */}
            <div
              style={{
                width: 36,
                height: 4,
                background: T3,
                borderRadius: 2,
                margin: '12px auto 0',
                opacity: 0.5,
              }}
            />

            {/* Title + close */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px 12px',
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: T1 }}>
                {title}
              </span>
              <button
                onClick={onClose}
                style={{
                  background: SURFACE_UP,
                  border: 'none',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: T2,
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ overflowY: 'auto', padding: '16px 16px 32px' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Field row ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  value: string;
  placeholder: string;
  onClick: () => void;
}

function FieldRow({ label, value, placeholder, onClick }: FieldRowProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        marginBottom: 10,
      }}
    >
      <span style={{ fontSize: 15, color: T2, fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 15,
          color: value ? T1 : T3,
          fontWeight: value ? 600 : 400,
          maxWidth: '55%',
          textAlign: 'right',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value || placeholder}
      </span>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CreateCustomExercise() {
  const navigate = useNavigate();

  const [name, setName]                   = useState('');
  const [equipment, setEquipment]         = useState('');
  const [primaryMuscle, setPrimaryMuscle] = useState('');
  const [otherMuscles, setOtherMuscles]   = useState<string[]>([]);
  const [exerciseType, setExerciseType]   = useState('weight_reps');
  const [saving, setSaving]               = useState(false);

  // Sheet visibility
  const [sheet, setSheet] = useState<'equipment' | 'primary' | 'other' | 'type' | null>(null);

  // ── Save ────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;

      if (!userId) {
        toast.error('Please sign in to create custom exercises.');
        setSaving(false);
        return;
      }

      const result = await createCustomExercise(  // throws on error
        {
          name: name.trim(),
          equipment: equipment || 'none',
          target_muscle: primaryMuscle || 'other',
          secondary_muscles: otherMuscles,
          exercise_type: exerciseType as any,
          body_part: 'custom',
          is_custom: true,
        },
        userId
      );

      toast.success(`"${result.name}" added to your library!`);
      navigate(-1);
    } catch (err) {
      console.error('[CreateCustomExercise] save error:', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      // Surface the most common failure reason clearly
      if (msg.includes('row-level security') || msg.includes('RLS') || msg.includes('policy')) {
        toast.error('Permission error — make sure you are signed in.');
      } else if (msg.includes('already exists') || msg.includes('duplicate')) {
        toast.error('An exercise with that name already exists.');
      } else {
        toast.error(`Failed to save: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Equipment label ──────────────────────────────────────────────────────

  const equipmentLabel = EQUIPMENT_OPTIONS.find(o => o.value === equipment)?.label ?? '';

  // ── Exercise type label ──────────────────────────────────────────────────

  const typeLabel = EXERCISE_TYPE_OPTIONS.find(o => o.value === exerciseType)?.label ?? '';

  const canSave = name.trim().length > 0 && !saving;

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
      {/* ── Header ── */}
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
            display: 'flex',
            alignItems: 'center',
            padding: 4,
          }}
        >
          <ArrowLeft style={{ width: 22, height: 22 }} />
        </button>

        <span style={{ fontSize: 17, fontWeight: 700, color: T1 }}>
          Create Exercise
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px 60px' }}>

        {/* Photo upload area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: SURFACE_UP,
              border: `2px dashed ${BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Camera style={{ width: 36, height: 36, color: T3 }} />
          </div>
          <span
            style={{
              marginTop: 8,
              fontSize: 12,
              color: T3,
              fontWeight: 500,
            }}
          >
            Add Photo
          </span>
        </div>

        {/* Exercise name */}
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Exercise Name"
          autoFocus
          style={{
            width: '100%',
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: '14px 16px',
            fontSize: 18,
            fontWeight: 600,
            color: T1,
            fontFamily: 'inherit',
            outline: 'none',
            caretColor: ACCENT,
            marginBottom: 10,
            boxSizing: 'border-box',
          }}
        />

        {/* Section label */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T3,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '16px 4px 8px',
          }}
        >
          Details
        </p>

        {/* Equipment picker */}
        <FieldRow
          label="Equipment"
          value={equipmentLabel}
          placeholder="Select equipment"
          onClick={() => setSheet('equipment')}
        />

        {/* Primary muscle */}
        <FieldRow
          label="Primary Muscle"
          value={primaryMuscle}
          placeholder="Select muscle group"
          onClick={() => setSheet('primary')}
        />

        {/* Other muscles */}
        <FieldRow
          label="Other Muscles"
          value={otherMuscles.length > 0 ? otherMuscles.join(', ') : ''}
          placeholder="Optional"
          onClick={() => setSheet('other')}
        />

        {/* Exercise type */}
        <FieldRow
          label="Exercise Type"
          value={typeLabel}
          placeholder="Select type"
          onClick={() => setSheet('type')}
        />
      </div>

      {/* ── Bottom sheet: Equipment ── */}
      <BottomSheet
        visible={sheet === 'equipment'}
        onClose={() => setSheet(null)}
        title="Equipment"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {EQUIPMENT_OPTIONS.map(opt => {
            const selected = equipment === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setEquipment(opt.value);
                  setSheet(null);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '14px 8px',
                  background: selected ? ACCENT_DIM : SURFACE_UP,
                  border: `1.5px solid ${selected ? ACCENT : BORDER}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: selected ? ACCENT : T2,
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* ── Bottom sheet: Primary Muscle ── */}
      <BottomSheet
        visible={sheet === 'primary'}
        onClose={() => setSheet(null)}
        title="Primary Muscle Group"
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {MUSCLE_OPTIONS.map(muscle => {
            const selected = primaryMuscle === muscle;
            return (
              <button
                key={muscle}
                onClick={() => {
                  setPrimaryMuscle(muscle);
                  setSheet(null);
                }}
                style={{
                  padding: '8px 14px',
                  background: selected ? ACCENT_DIM : SURFACE_UP,
                  border: `1.5px solid ${selected ? ACCENT : BORDER}`,
                  borderRadius: 20,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: selected ? ACCENT : T2,
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                {muscle}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* ── Bottom sheet: Other Muscles (multi-select) ── */}
      <BottomSheet
        visible={sheet === 'other'}
        onClose={() => setSheet(null)}
        title="Other Muscles"
      >
        <p style={{ fontSize: 12, color: T3, margin: '0 0 12px', lineHeight: 1.5 }}>
          Select all that apply
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {MUSCLE_OPTIONS.map(muscle => {
            const checked = otherMuscles.includes(muscle);
            return (
              <button
                key={muscle}
                onClick={() => {
                  setOtherMuscles(prev =>
                    checked ? prev.filter(m => m !== muscle) : [...prev, muscle]
                  );
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 4px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `1px solid ${BORDER}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: checked ? ACCENT : SURFACE_UP,
                    border: `1.5px solid ${checked ? ACCENT : BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {checked && <Check style={{ width: 13, height: 13, color: '#0C1015' }} />}
                </div>
                <span
                  style={{
                    fontSize: 14,
                    color: checked ? T1 : T2,
                    fontWeight: checked ? 600 : 400,
                    transition: 'color 0.15s',
                  }}
                >
                  {muscle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Done button */}
        <button
          onClick={() => setSheet(null)}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '13px 0',
            background: ACCENT,
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 700,
            color: '#0C1015',
            fontFamily: 'inherit',
          }}
        >
          Done ({otherMuscles.length} selected)
        </button>
      </BottomSheet>

      {/* ── Bottom sheet: Exercise Type ── */}
      <BottomSheet
        visible={sheet === 'type'}
        onClose={() => setSheet(null)}
        title="Exercise Type"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {EXERCISE_TYPE_OPTIONS.map(opt => {
            const selected = exerciseType === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setExerciseType(opt.value);
                  setSheet(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: selected ? ACCENT_DIM : SURFACE_UP,
                  border: `1.5px solid ${selected ? ACCENT : BORDER}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: selected ? ACCENT : T1,
                    }}
                  >
                    {opt.label}
                  </span>
                  <span style={{ fontSize: 12, color: T3 }}>
                    {opt.description}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {opt.tags.map(tag => (
                    <TypeTag key={tag} label={tag} />
                  ))}
                  {selected && (
                    <div
                      style={{
                        marginLeft: 8,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: ACCENT,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check style={{ width: 12, height: 12, color: '#0C1015' }} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}

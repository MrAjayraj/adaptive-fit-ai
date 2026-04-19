import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Heart, Swords, Check, ChevronRight, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFitness } from '@/context/FitnessContext';
import { useAuth } from '@/context/AuthContext';
import { getWorkoutTemplates } from '@/services/workoutService';
import type { WorkoutTemplate } from '@/services/workoutService';
import { EXERCISE_DATABASE } from '@/types/fitness';
import { v4 } from '@/lib/id';
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
const GREEN_BORDER = 'rgba(12,255,156,0.15)';

type WorkoutType = 'strength' | 'cardio' | 'skill' | 'custom';
type Intensity   = 'low' | 'medium' | 'high';

const TOTAL_STEPS = 3;

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepIndicator({ step, onBack }: { step: number; onBack: () => void }) {
  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 30,
      background: 'rgba(12,16,21,0.96)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft style={{ width: 20, height: 20, color: T2 }} />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Step {step} of {TOTAL_STEPS}
        </span>
        {/* placeholder for symmetry */}
        <div style={{ width: 28 }} />
      </div>
      <div style={{ height: 4, background: SURFACE_UP, borderRadius: 4, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ height: '100%', background: ACCENT, borderRadius: 4 }}
        />
      </div>
    </div>
  );
}

function TypeCard({
  label,
  subtitle,
  icon,
  selected,
  onPress,
}: {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onPress}
      style={{
        background: selected ? 'rgba(12,255,156,0.05)' : SURFACE,
        border: selected ? `2px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 16,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        marginBottom: 10,
        transition: 'background 0.15s ease',
      }}
    >
      {icon}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T1 }}>{label}</div>
        <div style={{ fontSize: 12, color: T2, marginTop: 2 }}>{subtitle}</div>
      </div>
      {selected && (
        <div style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: ACCENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Check style={{ width: 13, height: 13, color: '#0C1015', strokeWidth: 3 }} />
        </div>
      )}
    </motion.div>
  );
}

function Stepper({
  label,
  value,
  onDecrement,
  onIncrement,
  displayValue,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  displayValue?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: T1 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={onDecrement}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: SURFACE_UP,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Minus style={{ width: 14, height: 14, color: T2 }} />
        </button>
        <span style={{ fontSize: 24, fontWeight: 700, color: T1, minWidth: 52, textAlign: 'center' }}>
          {displayValue ?? value}
        </span>
        <button
          onClick={onIncrement}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: SURFACE_UP,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus style={{ width: 14, height: 14, color: T2 }} />
        </button>
      </div>
    </div>
  );
}

function IntensityControl({ value, onChange }: { value: Intensity; onChange: (v: Intensity) => void }) {
  const options: Intensity[] = ['low', 'medium', 'high'];
  return (
    <div>
      <span style={{ fontSize: 14, fontWeight: 600, color: T1, display: 'block', marginBottom: 10 }}>Intensity</span>
      <div style={{
        display: 'flex',
        background: SURFACE_UP,
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: value === opt ? 700 : 500,
              background: value === opt ? ACCENT : 'transparent',
              color: value === opt ? '#0C1015' : T2,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              transition: 'all 0.15s ease',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CreateWorkout() {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const { startCustomWorkout } = useFitness();

  const urlType     = (searchParams.get('type') ?? 'strength') as WorkoutType;
  const urlTemplate = searchParams.get('template');

  const [step, setStep]                       = useState(1);
  const [workoutType, setWorkoutType]         = useState<WorkoutType>(urlType);
  const [workoutName, setWorkoutName]         = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [rounds, setRounds]                   = useState(5);
  const [roundDurationMin, setRoundDurationMin] = useState(3);
  const [restDurationMin, setRestDurationMin] = useState(1);
  const [intensity, setIntensity]             = useState<Intensity>('high');
  const [notes, setNotes]                     = useState('');

  // Load template from URL param
  useEffect(() => {
    if (!urlTemplate) return;
    getWorkoutTemplates()
      .then((templates) => {
        const tmpl = templates.find((t) => t.id === urlTemplate) ?? null;
        if (tmpl) {
          setSelectedTemplate(tmpl);
          setWorkoutName(tmpl.name);
          setWorkoutType(tmpl.workout_type);
          // Pre-fill skill fields from template exercises
          if (tmpl.workout_type === 'skill' && tmpl.exercises?.[0]) {
            const ex = tmpl.exercises[0];
            if (ex.rounds)          setRounds(ex.rounds);
            if (ex.round_duration)  setRoundDurationMin(Math.round(ex.round_duration / 60));
            if (ex.rest_duration)   setRestDurationMin(Math.round(ex.rest_duration / 60));
          }
        }
      })
      .catch(() => {});
  }, [urlTemplate]);

  // Default name for skill when no template
  useEffect(() => {
    if (workoutType === 'skill' && !workoutName) {
      setWorkoutName('Boxing Session');
    }
  }, [workoutType]);

  function handleBack() {
    if (step === 1) {
      navigate(-1);
    } else {
      setStep((s) => s - 1);
    }
  }

  function handleNext() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function toggleExercise(name: string) {
    setSelectedExercises((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  function handleStartWorkout() {
    if (workoutType === 'skill') {
      navigate('/skill-workout', {
        state: {
          name:                      workoutName || 'Boxing Session',
          rounds,
          roundDurationSeconds:      roundDurationMin * 60,
          restBetweenRoundsSeconds:  restDurationMin * 60,
          intensity,
          notes,
        },
      });
      return;
    }

    // Build a WorkoutTemplate-like object for strength/cardio/custom
    const exercises = selectedTemplate
      ? selectedTemplate.exercises
      : selectedExercises.map((name) => ({ name, sets: 3, reps: 10, rest_seconds: 90 }));

    const template: WorkoutTemplate = {
      id:                   v4(),
      name:                 workoutName || 'My Workout',
      description:          null,
      workout_type:         workoutType,
      difficulty:           'intermediate',
      category:             null,
      duration_estimate_min: 45,
      image_url:            null,
      exercises,
      is_featured:          false,
      is_system:            false,
      created_at:           new Date().toISOString(),
    };

    startCustomWorkout(template);
    navigate('/workout');
  }

  // ── Step 1: Type selection ────────────────────────────────────────────────────
  function renderStep1() {
    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T1, marginBottom: 6 }}>
          What type of workout?
        </h2>
        <p style={{ fontSize: 13, color: T2, marginBottom: 24 }}>
          Choose the type that best fits your activity
        </p>

        <TypeCard
          label="Strength Training"
          subtitle="Gym based weight training"
          icon={<Dumbbell style={{ width: 24, height: 24, color: workoutType === 'strength' ? ACCENT : T2, flexShrink: 0 }} />}
          selected={workoutType === 'strength'}
          onPress={() => setWorkoutType('strength')}
        />
        <TypeCard
          label="Cardio"
          subtitle="Running, cycling, HIIT and more"
          icon={<Heart style={{ width: 24, height: 24, color: workoutType === 'cardio' ? ACCENT : T2, flexShrink: 0 }} />}
          selected={workoutType === 'cardio'}
          onPress={() => setWorkoutType('cardio')}
        />
        <TypeCard
          label="Skill Training"
          subtitle="Boxing, MMA, Sports and more"
          icon={<Swords style={{ width: 24, height: 24, color: workoutType === 'skill' ? ACCENT : T2, flexShrink: 0 }} />}
          selected={workoutType === 'skill'}
          onPress={() => setWorkoutType('skill')}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            style={{
              background: ACCENT,
              color: '#0C1015',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Next →
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Step 2: Configure ─────────────────────────────────────────────────────────
  function renderStep2() {
    const isSkill    = workoutType === 'skill';
    const inputStyle: React.CSSProperties = {
      background: SURFACE_UP,
      borderRadius: 12,
      padding: '14px 16px',
      border: '1px solid rgba(255,255,255,0.08)',
      color: T1,
      fontSize: 16,
      width: '100%',
      boxSizing: 'border-box',
      outline: 'none',
    };

    if (isSkill) {
      return (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: T1, marginBottom: 20 }}>
            Configure your session
          </h2>

          {/* Name input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: T1, display: 'block', marginBottom: 8 }}>
              Workout Name
            </label>
            <input
              style={inputStyle}
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="Boxing Session"
            />
          </div>

          {/* Steppers */}
          <div style={{ background: SURFACE, borderRadius: 14, padding: '16px 16px 4px', marginBottom: 16 }}>
            <Stepper
              label="Rounds"
              value={rounds}
              onDecrement={() => setRounds((r) => Math.max(1, r - 1))}
              onIncrement={() => setRounds((r) => Math.min(20, r + 1))}
            />
            <Stepper
              label="Round Duration"
              value={roundDurationMin}
              displayValue={`${roundDurationMin}:00 min`}
              onDecrement={() => setRoundDurationMin((v) => Math.max(1, v - 1))}
              onIncrement={() => setRoundDurationMin((v) => Math.min(10, v + 1))}
            />
            <Stepper
              label="Rest Duration"
              value={restDurationMin}
              displayValue={`${restDurationMin}:00 min`}
              onDecrement={() => setRestDurationMin((v) => Math.max(0, v - 1))}
              onIncrement={() => setRestDurationMin((v) => Math.min(5, v + 1))}
            />
          </div>

          {/* Intensity */}
          <div style={{ background: SURFACE, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <IntensityControl value={intensity} onChange={setIntensity} />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: T1, display: 'block', marginBottom: 8 }}>
              Notes <span style={{ color: T3, fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const, fontFamily: 'inherit' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for this session…"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              style={{
                background: ACCENT,
                color: '#0C1015',
                border: 'none',
                borderRadius: 10,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Next →
            </motion.button>
          </div>
        </div>
      );
    }

    // strength / cardio / custom
    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T1, marginBottom: 20 }}>
          Name your workout
        </h2>

        <div style={{ marginBottom: 24 }}>
          <input
            style={inputStyle}
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder={selectedTemplate?.name ?? 'My Workout'}
          />
        </div>

        {/* Exercise list */}
        <h3 style={{ fontSize: 14, fontWeight: 700, color: T1, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {selectedTemplate ? 'Template Exercises' : 'Choose Exercises'}
        </h3>

        {selectedTemplate ? (
          // Readonly template exercise list
          <div>
            {selectedTemplate.exercises.map((ex, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: SURFACE,
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 8,
                  border: `1px solid ${GREEN_BORDER}`,
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: ACCENT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Check style={{ width: 11, height: 11, color: '#0C1015', strokeWidth: 3 }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T1 }}>{ex.name}</div>
                  {(ex.sets || ex.reps) && (
                    <div style={{ fontSize: 12, color: T3, marginTop: 2 }}>
                      {ex.sets ?? 3} sets × {ex.reps ?? 10} reps
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Selectable exercise list (first 15)
          <div>
            {EXERCISE_DATABASE.slice(0, 15).map((ex) => {
              const isSelected = selectedExercises.includes(ex.name);
              return (
                <motion.div
                  key={ex.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggleExercise(ex.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: isSelected ? 'rgba(12,255,156,0.05)' : SURFACE,
                    border: isSelected ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    marginBottom: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T1 }}>{ex.name}</div>
                    <div style={{ fontSize: 12, color: T3, marginTop: 2, textTransform: 'capitalize' }}>
                      {ex.muscleGroup} · {ex.equipment}
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: ACCENT,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Check style={{ width: 11, height: 11, color: '#0C1015', strokeWidth: 3 }} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            style={{
              background: ACCENT,
              color: '#0C1015',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Next →
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Step 3: Review ────────────────────────────────────────────────────────────
  function renderStep3() {
    const isSkill = workoutType === 'skill';
    const exerciseList = selectedTemplate
      ? selectedTemplate.exercises
      : selectedExercises.map((name) => ({ name, sets: 3, reps: 10 }));

    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T1, marginBottom: 6 }}>
          Review &amp; Start
        </h2>
        <p style={{ fontSize: 13, color: T2, marginBottom: 24 }}>
          Confirm your workout details
        </p>

        {/* Name card */}
        <div style={{ background: SURFACE, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${GREEN_BORDER}` }}>
          <div style={{ fontSize: 11, color: T3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Workout</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T1 }}>{workoutName || 'My Workout'}</div>
          <div style={{
            display: 'inline-block',
            marginTop: 8,
            fontSize: 11,
            fontWeight: 700,
            color: ACCENT,
            background: GREEN_GLOW,
            borderRadius: 20,
            padding: '3px 10px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {workoutType}
          </div>
        </div>

        {isSkill ? (
          <div style={{ background: SURFACE, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              Configuration
            </div>
            {[
              { label: 'Rounds',         value: String(rounds) },
              { label: 'Round Duration', value: `${roundDurationMin}:00 min` },
              { label: 'Rest',           value: `${restDurationMin}:00 min` },
              { label: 'Intensity',      value: intensity.charAt(0).toUpperCase() + intensity.slice(1) },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: T2 }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T1 }}>{row.value}</span>
              </div>
            ))}
            {notes ? (
              <div style={{ marginTop: 8, fontSize: 13, color: T2, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                {notes}
              </div>
            ) : null}
          </div>
        ) : exerciseList.length > 0 ? (
          <div style={{ background: SURFACE, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              Exercises ({exerciseList.length})
            </div>
            {exerciseList.map((ex, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingBottom: i < exerciseList.length - 1 ? 12 : 0,
                  marginBottom: i < exerciseList.length - 1 ? 12 : 0,
                  borderBottom: i < exerciseList.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: ACCENT,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: T1, fontWeight: 600 }}>{ex.name}</div>
                </div>
                {(ex.sets || ex.reps) && (
                  <span style={{ fontSize: 12, color: T3 }}>
                    {ex.sets ?? 3}×{ex.reps ?? 10}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* Start button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStartWorkout}
          style={{
            width: '100%',
            height: 56,
            background: ACCENT,
            color: '#0C1015',
            border: 'none',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 8,
          }}
        >
          Start Workout →
        </motion.button>
      </div>
    );
  }

  const stepContent = [renderStep1, renderStep2, renderStep3][step - 1];

  return (
    <div style={{ background: BG, minHeight: '100dvh' }}>
      <StepIndicator step={step} onBack={handleBack} />

      <div style={{ padding: '20px 16px', overflowY: 'auto', paddingBottom: 120 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {stepContent?.()}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}

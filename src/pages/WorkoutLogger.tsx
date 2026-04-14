import { useState, useEffect, useRef, useCallback } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { WorkoutSet, EXERCISE_DATABASE, WorkoutSplit } from '@/types/fitness';
import {
  Check, ChevronLeft, Minus, Plus, Timer, Trophy, Zap, X,
  TrendingUp, TrendingDown, Clock, Dumbbell, BarChart2, Flame,
  Star, Target, Activity, ChevronRight, AlertTriangle,
} from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 } from '@/lib/id';

// ─────────────────────────────────────────────────────────────────────────────
// RestTimer — circular SVG progress ring with skip button
// ─────────────────────────────────────────────────────────────────────────────
interface RestTimerProps {
  seconds: number;
  onDone: () => void;
  onSkip: () => void;
}

function RestTimer({ seconds, onDone, onSkip }: RestTimerProps) {
  const [left, setLeft] = useState(seconds);
  const total = seconds;
  const R = 28;
  const circ = 2 * Math.PI * R;

  useEffect(() => {
    if (left <= 0) { onDone(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);

  const progress = (total - left) / total; // 0→1
  const strokeDash = circ * progress;
  const offset = circ - strokeDash;

  const min = Math.floor(left / 60);
  const sec = left % 60;
  const timeStr = min > 0 ? `${min}:${String(sec).padStart(2, '0')}` : `${sec}s`;

  // Colour shifts red as time runs out
  const strokeColor = left <= 10 ? '#ef4444' : left <= 20 ? '#f97316' : '#F5C518';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -8 }}
      transition={{ type: 'spring', stiffness: 480, damping: 32 }}
      className="mt-3 p-4 rounded-2xl bg-surface-1 border border-primary-accent/20 flex items-center gap-4"
      style={{ boxShadow: '0 0 20px rgba(245,197,24,0.06)' }}
    >
      {/* Circular ring */}
      <div className="relative shrink-0 w-[68px] h-[68px] flex items-center justify-center">
        <svg
          className="-rotate-90 absolute inset-0"
          width="68" height="68"
          viewBox="0 0 68 68"
        >
          {/* Track */}
          <circle
            cx="34" cy="34" r={R}
            fill="none"
            stroke="rgba(245,197,24,0.10)"
            strokeWidth="4"
          />
          {/* Progress arc */}
          <circle
            cx="34" cy="34" r={R}
            fill="none"
            stroke={strokeColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
          />
        </svg>
        {/* Center label */}
        <div className="flex flex-col items-center leading-none z-10">
          <span
            className="text-[16px] font-extrabold tabular-nums"
            style={{ color: strokeColor, transition: 'color 0.5s' }}
          >
            {timeStr}
          </span>
          <span className="text-[9px] text-text-3 uppercase tracking-widest font-semibold mt-0.5">
            rest
          </span>
        </div>
      </div>

      {/* Info text */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-1">Rest Period</p>
        <p className="text-[11px] text-text-3 mt-0.5">Take a breath, next set soon</p>
      </div>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="shrink-0 px-3.5 py-2 rounded-full bg-primary-accent text-canvas text-[12px] font-bold transition-transform active:scale-95"
      >
        Skip →
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkoutSummary — full-screen end-of-workout outro
// ─────────────────────────────────────────────────────────────────────────────
interface PR { exerciseName: string; type: string; value: number }

interface SummaryProps {
  workoutName: string;
  duration: number;
  volume: number;
  completedSets: number;
  totalSets: number;
  newPRs: PR[];
  rpEarned: number;
  xpEarned: number;
  rating: number;
  onRatingChange: (v: number) => void;
  onSave: () => void;
}

function WorkoutSummary({
  workoutName, duration, volume, completedSets, totalSets,
  newPRs, rpEarned, xpEarned, rating, onRatingChange, onSave,
}: SummaryProps) {
  const statCards = [
    {
      icon: Clock,
      label: 'Duration',
      value: duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`,
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.10)',
    },
    {
      icon: BarChart2,
      label: 'Volume',
      value: volume >= 1000 ? `${(volume / 1000).toFixed(1)}k kg` : `${volume} kg`,
      color: '#34d399',
      bg: 'rgba(52,211,153,0.10)',
    },
    {
      icon: Target,
      label: 'Sets',
      value: `${completedSets}/${totalSets}`,
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.10)',
    },
    {
      icon: TrendingUp,
      label: 'New PRs',
      value: String(newPRs.length),
      color: '#fb923c',
      bg: 'rgba(251,146,60,0.10)',
    },
  ];

  const ratingEmojis = ['😫', '😐', '🙂', '💪', '🔥'];
  const ratingLabels = ['Rough', 'Okay', 'Good', 'Strong', 'Beast!'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-canvas flex flex-col items-center px-5 pt-10 pb-24 gap-6 overflow-y-auto"
    >
      {/* Trophy hero */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        className="relative flex items-center justify-center"
      >
        <div className="absolute w-40 h-40 rounded-full bg-primary-accent/15 blur-[50px]" />
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center relative z-10 animate-pulse-glow"
          style={{
            background: 'linear-gradient(135deg, rgba(245,197,24,0.22), rgba(245,197,24,0.06))',
            border: '2px solid rgba(245,197,24,0.35)',
          }}
        >
          <Trophy className="w-11 h-11 text-primary-accent" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <p className="text-[11px] text-primary-accent font-bold uppercase tracking-[0.18em] mb-1">
          Workout Complete 🎉
        </p>
        <h1 className="text-[26px] font-extrabold text-text-1 leading-tight">{workoutName}</h1>
      </motion.div>

      {/* XP + RP reward pills */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3"
      >
        <div
          className="flex items-center gap-2 px-5 py-2.5 rounded-full"
          style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.30)' }}
        >
          <Zap className="w-4 h-4 text-primary-accent" />
          <span className="text-[15px] font-extrabold text-primary-accent">+{xpEarned} XP</span>
        </div>
        <div
          className="flex items-center gap-2 px-5 py-2.5 rounded-full"
          style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.30)' }}
        >
          <Flame className="w-4 h-4 text-violet-400" />
          <span className="text-[15px] font-extrabold text-violet-400">+{rpEarned} RP</span>
        </div>
      </motion.div>

      {/* Stat grid */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="w-full max-w-sm grid grid-cols-2 gap-2.5"
      >
        {statCards.map(({ icon: Icon, label, value, color, bg }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: bg, border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
            <p className="text-[22px] font-extrabold tabular-nums leading-none" style={{ color }}>
              {value}
            </p>
            <p className="text-[11px] text-text-3 font-medium">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* New PRs */}
      <AnimatePresence>
        {newPRs.length > 0 && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="w-full max-w-sm"
          >
            <p className="text-[11px] text-text-3 uppercase tracking-widest text-center mb-3 font-semibold">
              New Personal Records
            </p>
            <div className="flex flex-col gap-2">
              {newPRs.map((pr, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -12, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                  className="flex items-center justify-between rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.20)' }}
                >
                  <div>
                    <p className="text-[10px] text-primary-accent/70 uppercase tracking-widest font-semibold">
                      {pr.type} PR
                    </p>
                    <p className="text-[14px] font-semibold text-text-1 mt-0.5">{pr.exerciseName}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-primary-accent" />
                    <span className="text-[20px] font-extrabold text-primary-accent tabular-nums">
                      {pr.value}
                      <span className="text-[12px] font-semibold ml-0.5">
                        {pr.type === 'weight' ? 'kg' : pr.type === 'reps' ? 'r' : ''}
                      </span>
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workout rating */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm"
      >
        <p className="text-[12px] text-text-2 text-center mb-3 font-medium">
          How did it feel?
          {rating > 0 && (
            <span className="ml-2 text-primary-accent font-semibold">{ratingLabels[rating - 1]}</span>
          )}
        </p>
        <div className="flex justify-center gap-2">
          {ratingEmojis.map((emoji, i) => (
            <button
              key={i}
              onClick={() => onRatingChange(i + 1)}
              className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-[22px] transition-all duration-200"
              style={{
                background: i + 1 === rating ? 'rgba(245,197,24,0.18)' : 'rgba(255,255,255,0.04)',
                border: i + 1 === rating ? '2px solid rgba(245,197,24,0.50)' : '1px solid rgba(255,255,255,0.08)',
                transform: i + 1 === rating ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Save button */}
      <motion.button
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55 }}
        onClick={onSave}
        whileTap={{ scale: 0.97 }}
        className="w-full max-w-sm py-4 rounded-full flex items-center justify-center gap-2 text-canvas font-extrabold text-[16px]"
        style={{
          background: 'linear-gradient(135deg, #F5C518, #E8B000)',
          boxShadow: '0 8px 32px rgba(245,197,24,0.35)',
        }}
      >
        Save &amp; Level Up
        <ChevronRight className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SetRow — single set with weight/reps spinners + check + animated remove
// ─────────────────────────────────────────────────────────────────────────────
interface SetRowProps {
  set: WorkoutSet;
  index: number;
  canRemove: boolean;
  lastWeight?: number;
  lastReps?: number;
  showRestTimer: boolean;
  restSeconds: number;
  onUpdate: (changes: Partial<WorkoutSet>) => void;
  onToggleComplete: () => void;
  onRemove: () => void;
  onRestDone: () => void;
}

function SetRow({
  set, index, canRemove, lastWeight, lastReps,
  showRestTimer, restSeconds, onUpdate, onToggleComplete, onRemove, onRestDone,
}: SetRowProps) {
  const isNewPR =
    set.completed &&
    lastWeight !== undefined &&
    set.weight > lastWeight;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Row */}
      <div
        className="grid items-center gap-2 p-3 rounded-2xl border transition-all duration-300"
        style={{
          gridTemplateColumns: '34px 1fr 1fr 44px 32px',
          background: set.completed
            ? 'rgba(245,197,24,0.07)'
            : 'rgba(255,255,255,0.03)',
          borderColor: set.completed
            ? 'rgba(245,197,24,0.28)'
            : isNewPR
            ? 'rgba(52,211,153,0.3)'
            : 'rgba(255,255,255,0.07)',
        }}
      >
        {/* Set number */}
        <span
          className="text-[13px] font-extrabold text-center"
          style={{ color: set.completed ? '#F5C518' : '#6b7280' }}
        >
          {index + 1}
        </span>

        {/* Weight spinner */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ weight: Math.max(0, set.weight - 2.5) })}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <Minus className="w-3 h-3 text-text-2" />
          </button>
          <input
            type="number"
            value={set.weight}
            onChange={e => onUpdate({ weight: parseFloat(e.target.value) || 0 })}
            className="w-full text-center bg-transparent text-text-1 font-bold text-[14px] focus:outline-none tabular-nums"
          />
          <button
            onClick={() => onUpdate({ weight: set.weight + 2.5 })}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <Plus className="w-3 h-3 text-text-2" />
          </button>
        </div>

        {/* Reps spinner */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ reps: Math.max(0, set.reps - 1) })}
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <Minus className="w-3 h-3 text-text-2" />
          </button>
          <input
            type="number"
            value={set.reps}
            onChange={e => onUpdate({ reps: parseInt(e.target.value) || 0 })}
            className="w-full text-center bg-transparent text-text-1 font-bold text-[14px] focus:outline-none tabular-nums"
          />
          <button
            onClick={() => onUpdate({ reps: set.reps + 1 })}
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <Plus className="w-3 h-3 text-text-2" />
          </button>
        </div>

        {/* Check button */}
        <button
          onClick={onToggleComplete}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{
            background: set.completed
              ? 'linear-gradient(135deg, #F5C518, #E8B000)'
              : 'rgba(255,255,255,0.05)',
            border: set.completed ? 'none' : '1px solid rgba(255,255,255,0.10)',
            boxShadow: set.completed ? '0 4px 12px rgba(245,197,24,0.35)' : 'none',
          }}
        >
          <Check className={`w-4 h-4 ${set.completed ? 'text-canvas' : 'text-text-3'}`} />
        </button>

        {/* Remove ×  */}
        <button
          onClick={onRemove}
          disabled={!canRemove}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
          style={{
            opacity: canRemove ? 1 : 0.2,
            pointerEvents: canRemove ? 'auto' : 'none',
            color: 'rgba(156,163,175,1)',
          }}
          onMouseEnter={e => { if (canRemove) (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(156,163,175,1)'; }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* PR micro-badge */}
      {isNewPR && (
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="mt-1 ml-1 flex items-center gap-1"
        >
          <Star className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">New PR!</span>
        </motion.div>
      )}

      {/* Rest Timer below this set */}
      <AnimatePresence>
        {showRestTimer && (
          <RestTimer
            key={`rest-${set.id}`}
            seconds={restSeconds}
            onDone={onRestDone}
            onSkip={onRestDone}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommended Workout Logic
// ─────────────────────────────────────────────────────────────────────────────

const SPLIT_DAYS: Record<WorkoutSplit, { name: string; muscles: string[] }[]> = {
  push_pull_legs: [
    { name: 'Push Day', muscles: ['chest', 'shoulders', 'triceps'] },
    { name: 'Pull Day', muscles: ['back', 'biceps'] },
    { name: 'Leg Day', muscles: ['legs', 'glutes'] },
  ],
  upper_lower: [
    { name: 'Upper Body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
    { name: 'Lower Body', muscles: ['legs', 'glutes'] },
  ],
  full_body: [
    { name: 'Full Body', muscles: ['chest', 'back', 'legs', 'shoulders', 'core'] },
  ],
  bro_split: [
    { name: 'Chest Day', muscles: ['chest', 'triceps'] },
    { name: 'Back Day', muscles: ['back', 'biceps'] },
    { name: 'Shoulder Day', muscles: ['shoulders'] },
    { name: 'Arms Day', muscles: ['biceps', 'triceps'] },
    { name: 'Leg Day', muscles: ['legs', 'glutes'] },
  ],
};

function getRecommendedDay(split: WorkoutSplit, lastSplitIndex: number, completedWorkouts: import('@/types/fitness').Workout[]) {
  const days = SPLIT_DAYS[split];
  const nextIndex = (lastSplitIndex + (completedWorkouts.length > 0 ? 1 : 0)) % days.length;
  return { day: days[nextIndex], index: nextIndex };
}

function buildRecommendedExercises(muscles: string[]) {
  const exercises = EXERCISE_DATABASE.filter(ex =>
    muscles.some(m => ex.muscleGroup === m || ex.muscleGroup.startsWith(m))
  );
  // Compounds first, then isolation
  const compounds = exercises.filter(ex => ex.isCompound).slice(0, 3);
  const isolation = exercises.filter(ex => !ex.isCompound).slice(0, 2);
  const selected = [...compounds, ...isolation].slice(0, 5);
  return selected.map(ex => ({
    exerciseId: ex.id,
    exerciseName: ex.name,
    muscleGroup: ex.muscleGroup as import('@/types/fitness').MuscleGroup,
    sets: 3,
    reps: 8,
    weight: 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkoutLogger — main page
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkoutLogger() {
  const {
    activeWorkoutId, currentPlan, updateWorkout, completeWorkout,
    getTodaysWorkout, startWorkout, recentPRs, clearRecentPRs,
    progressHistory, profile, workouts, startCustomWorkout,
  } = useFitness();
  const navigate = useNavigate();

  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [rating, setRating] = useState(3);
  const [activeRestTimer, setActiveRestTimer] = useState<string | null>(null); // set.id
  const [elapsedSec, setElapsedSec] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  const workout = currentPlan.find(w => w.id === activeWorkoutId) || null;

  // ── Set mutation helpers ─────────────────────────────────────────────────────
  const mutateExercise = useCallback(
    (fn: (sets: WorkoutSet[]) => WorkoutSet[]) => {
      if (!workout) return;
      updateWorkout({
        ...workout,
        exercises: workout.exercises.map((ex, ei) =>
          ei === currentExIndex ? { ...ex, sets: fn(ex.sets) } : ex
        ),
      });
    },
    [workout, currentExIndex, updateWorkout]
  );

  // Live workout timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── No active workout — enhanced landing ────────────────────────────────────
  if (!workout) {
    const split = profile?.preferredSplit ?? 'push_pull_legs';
    const lastSplitIndex = 0; // future: read from profile.last_split_index
    const completedWorkouts = workouts.filter(w => w.completed);
    const { day: recommendedDay } = getRecommendedDay(split, lastSplitIndex, completedWorkouts);
    const recommendedExercises = buildRecommendedExercises(recommendedDay.muscles);

    const handleStartRecommended = () => {
      const template = {
        id: v4(),
        name: recommendedDay.name,
        exercises: recommendedExercises,
        tags: recommendedDay.muscles,
        difficulty: 'intermediate' as const,
        estimatedDuration: 45,
        isAIGenerated: true,
        createdAt: new Date().toISOString(),
      };
      startCustomWorkout(template);
    };

    return (
      <div className="min-h-screen bg-canvas pb-24 font-sans">
        <div className="flex items-center gap-3 px-4 pt-6 pb-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <ChevronLeft className="w-4 h-4 text-text-1" />
          </button>
          <h1 className="text-[18px] font-bold text-text-1">Workout</h1>
        </div>

        <div className="px-4 space-y-4">
          {/* Recommended workout card */}
          <div
            className="rounded-[24px] p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.12), rgba(245,197,24,0.04))', border: '1px solid rgba(245,197,24,0.25)' }}
          >
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary-accent/10 blur-[50px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-primary-accent/20 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-primary-accent" />
                </div>
                <span className="text-[11px] font-bold text-primary-accent uppercase tracking-widest">Recommended for you</span>
              </div>
              <h2 className="text-[22px] font-extrabold text-text-1 mb-1">{recommendedDay.name}</h2>
              <p className="text-[12px] text-text-2 mb-4 capitalize">
                {recommendedDay.muscles.join(' · ')}
              </p>

              {/* Exercise preview */}
              <div className="flex flex-col gap-1.5 mb-5">
                {recommendedExercises.slice(0, 4).map((ex, i) => (
                  <div key={ex.exerciseId} className="flex items-center gap-2">
                    <span className="text-[11px] text-primary-accent/60 font-bold w-4">{i + 1}.</span>
                    <span className="text-[13px] text-text-1 font-medium">{ex.exerciseName}</span>
                    <span className="text-[11px] text-text-3">· {ex.sets} sets</span>
                  </div>
                ))}
                {recommendedExercises.length > 4 && (
                  <p className="text-[11px] text-text-3 ml-6">+{recommendedExercises.length - 4} more</p>
                )}
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={handleStartRecommended}
                  className="flex-1 py-3.5 rounded-full font-bold text-[15px] text-canvas flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#F5C518,#E8B000)', boxShadow: '0 6px 24px rgba(245,197,24,0.35)' }}
                >
                  <Star className="w-4 h-4" />
                  Start This Workout
                </button>
                <button
                  onClick={() => navigate('/builder')}
                  className="px-4 py-3.5 rounded-full font-semibold text-[13px] text-text-1"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  Customize
                </button>
              </div>
            </div>
          </div>

          {/* Custom workout option */}
          <button
            onClick={() => navigate('/builder')}
            className="w-full rounded-[20px] p-5 flex items-center gap-4 text-left"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <Dumbbell className="w-5 h-5 text-text-2" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-text-1">Start Custom Workout</p>
              <p className="text-[12px] text-text-3 mt-0.5">Pick your own exercises &amp; sets</p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-3 shrink-0" />
          </button>

          {/* Exercise library shortcut */}
          <button
            onClick={() => navigate('/exercises')}
            className="w-full rounded-[20px] p-5 flex items-center gap-4 text-left"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <Target className="w-5 h-5 text-text-2" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-text-1">Browse Exercises</p>
              <p className="text-[12px] text-text-3 mt-0.5">Search by muscle group or equipment</p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-3 shrink-0" />
          </button>
        </div>

        <BottomNav />
      </div>
    );
  }

  const exercise = workout.exercises[currentExIndex];
  if (!exercise) return null;

  const updateSet = (si: number, changes: Partial<WorkoutSet>) =>
    mutateExercise(sets => sets.map((s, i) => (i === si ? { ...s, ...changes } : s)));

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    const newSet: WorkoutSet = {
      id: v4(),
      weight: last?.weight ?? 0,
      reps: last?.reps ?? 8,
      completed: false,
    };
    mutateExercise(sets => [...sets, newSet]);
  };

  const removeSet = (si: number) => {
    if (exercise.sets.length <= 1) return;
    if (activeRestTimer === exercise.sets[si].id) setActiveRestTimer(null);
    mutateExercise(sets => sets.filter((_, i) => i !== si));
  };

  const toggleSetComplete = (si: number) => {
    const set = exercise.sets[si];
    const nowCompleted = !set.completed;
    updateSet(si, { completed: nowCompleted });
    if (nowCompleted) {
      setActiveRestTimer(set.id);
    } else {
      if (activeRestTimer === set.id) setActiveRestTimer(null);
    }
  };

  // ── Progressive overload ─────────────────────────────────────────────────────
  const lastPerf = progressHistory
    .filter(p => p.exerciseId === exercise.exerciseId)
    .slice(-1)[0] ?? null;

  const progressTrend = (() => {
    if (!lastPerf) return null;
    const currentBest = exercise.sets
      .filter(s => s.completed)
      .reduce((best, s) => (s.weight > best ? s.weight : best), 0);
    if (currentBest === 0) return null;
    if (currentBest > lastPerf.bestSet.weight) return 'up';
    if (currentBest < lastPerf.bestSet.weight) return 'down';
    return 'same';
  })();

  // ── Stats ────────────────────────────────────────────────────────────────────
  const allExercisesDone = workout.exercises.every(ex => ex.sets.every(s => s.completed));
  const completedSets = workout.exercises.reduce((t, ex) => t + ex.sets.filter(s => s.completed).length, 0);
  const totalSets = workout.exercises.reduce((t, ex) => t + ex.sets.length, 0);
  const totalVolume = workout.exercises.reduce(
    (t, ex) => t + ex.sets.filter(s => s.completed).reduce((s, set) => s + set.weight * set.reps, 0),
    0
  );
  const elapsedMinutes = Math.max(1, Math.round(elapsedSec / 60));
  const rpEstimate = 15 + recentPRs.length * 25;
  const xpEstimate = 100 + recentPRs.length * 200;

  const durationDisplay = (() => {
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  })();

  // ── Summary screen ────────────────────────────────────────────────────────────
  if (showSummary) {
    return (
      <WorkoutSummary
        workoutName={workout.name}
        duration={elapsedMinutes}
        volume={totalVolume}
        completedSets={completedSets}
        totalSets={totalSets}
        newPRs={recentPRs}
        rpEarned={rpEstimate}
        xpEarned={xpEstimate}
        rating={rating}
        onRatingChange={setRating}
        onSave={() => {
          completeWorkout(workout.id, rating, elapsedMinutes);
          clearRecentPRs();
          navigate('/');
        }}
      />
    );
  }

  // ── Main Logger UI ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas pb-24 font-sans">
      {/* ─── Cancel confirmation dialog ─── */}
      <AnimatePresence>
        {showCancelConfirm && (
          <div
            className="fixed inset-0 z-[60] bg-canvas/80 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowCancelConfirm(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="w-full max-w-lg bg-surface-1 border border-border-subtle rounded-t-[28px] p-5 pb-24"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-5" />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-text-1">Cancel workout?</h3>
                  <p className="text-[12px] text-text-3">All progress will be lost</p>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-3.5 rounded-full bg-surface-2 border border-border-subtle text-[14px] font-semibold text-text-1"
                >
                  Keep Going
                </button>
                <button
                  onClick={() => { setShowCancelConfirm(false); navigate('/workout'); }}
                  className="flex-1 py-3.5 rounded-full bg-red-500/15 border border-red-500/30 text-[14px] font-bold text-red-400"
                >
                  Cancel Workout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 pt-safe pt-6 pb-3">
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
        >
          <ChevronLeft className="w-4 h-4 text-text-1" />
        </button>

        <div className="text-center">
          <h1 className="text-[15px] font-bold text-text-1">{workout.name}</h1>
          <p className="text-[11px] text-text-3">{workout.exercises.length} exercises</p>
        </div>

        {/* Live clock */}
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ background: 'rgba(245,197,24,0.10)', border: '1px solid rgba(245,197,24,0.22)' }}
        >
          <Timer className="w-3.5 h-3.5 text-primary-accent" />
          <span className="text-[12px] font-bold text-primary-accent tabular-nums">
            {durationDisplay}
          </span>
        </div>
      </div>

      {/* ─── Progress bar ─── */}
      <div className="mx-4 mb-4 h-1.5 rounded-full bg-surface-1 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg,#F5C518,#E8B000)' }}
          animate={{ width: `${totalSets ? (completedSets / totalSets) * 100 : 0}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* ─── Exercise tabs ─── */}
      <div className="flex gap-2 px-4 mb-5 overflow-x-auto no-scrollbar">
        {workout.exercises.map((ex, i) => {
          const done = ex.sets.every(s => s.completed);
          const active = i === currentExIndex;
          return (
            <button
              key={ex.id}
              onClick={() => { setCurrentExIndex(i); setActiveRestTimer(null); }}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200"
              style={{
                background: active
                  ? '#F5C518'
                  : done
                  ? 'rgba(245,197,24,0.15)'
                  : 'rgba(255,255,255,0.05)',
                color: active ? '#111113' : done ? '#F5C518' : '#9ca3af',
                border: active ? 'none' : done ? '1px solid rgba(245,197,24,0.30)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {done && '✓ '}{ex.exerciseName.split(' ').slice(0, 2).join(' ')}
            </button>
          );
        })}
      </div>

      {/* ─── Current exercise ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={exercise.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22 }}
          className="px-4"
        >
          {/* Exercise header */}
          <div className="mb-4">
            <h2 className="text-[22px] font-extrabold text-text-1">{exercise.exerciseName}</h2>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span
                className="text-[11px] capitalize px-2.5 py-1 rounded-full font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}
              >
                {exercise.muscleGroup}
              </span>
              <span className="text-[11px] text-text-3">
                <Clock className="w-3 h-3 inline mr-1 opacity-60" />
                {exercise.restSeconds}s rest
              </span>

              {/* Progressive overload pill */}
              {lastPerf && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background:
                      progressTrend === 'up'
                        ? 'rgba(52,211,153,0.12)'
                        : progressTrend === 'down'
                        ? 'rgba(239,68,68,0.10)'
                        : 'rgba(245,197,24,0.10)',
                    color:
                      progressTrend === 'up'
                        ? '#34d399'
                        : progressTrend === 'down'
                        ? '#f87171'
                        : '#F5C518',
                  }}
                >
                  {progressTrend === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : progressTrend === 'down' ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Activity className="w-3 h-3" />
                  )}
                  Last: {lastPerf.bestSet.weight}kg × {lastPerf.bestSet.reps}
                </motion.span>
              )}
            </div>
          </div>

          {/* Sets column header */}
          <div
            className="grid text-[10px] text-text-3 font-semibold uppercase tracking-widest px-1 mb-2"
            style={{ gridTemplateColumns: '34px 1fr 1fr 44px 32px', gap: '8px' }}
          >
            <span>Set</span>
            <span>Weight (kg)</span>
            <span>Reps</span>
            <span />
            <span />
          </div>

          {/* Sets list */}
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {exercise.sets.map((set, si) => (
                <SetRow
                  key={set.id}
                  set={set}
                  index={si}
                  canRemove={exercise.sets.length > 1}
                  lastWeight={lastPerf?.bestSet.weight}
                  lastReps={lastPerf?.bestSet.reps}
                  showRestTimer={activeRestTimer === set.id && set.completed}
                  restSeconds={exercise.restSeconds || 90}
                  onUpdate={changes => updateSet(si, changes)}
                  onToggleComplete={() => toggleSetComplete(si)}
                  onRemove={() => removeSet(si)}
                  onRestDone={() => setActiveRestTimer(null)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* ─── + Add Set ghost button ─── */}
          <motion.button
            onClick={addSet}
            whileTap={{ scale: 0.97 }}
            className="w-full mt-3 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-semibold transition-all duration-200 group"
            style={{
              border: '1.5px dashed rgba(255,255,255,0.12)',
              color: '#6b7280',
              background: 'transparent',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,197,24,0.40)';
              (e.currentTarget as HTMLElement).style.color = '#F5C518';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
              (e.currentTarget as HTMLElement).style.color = '#6b7280';
            }}
          >
            <Plus className="w-4 h-4" />
            Add Set
          </motion.button>

          {/* ─── Live volume indicator ─── */}
          {totalVolume > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center justify-between rounded-2xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-2 text-text-3">
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="text-[12px] font-semibold">Total Volume</span>
              </div>
              <span className="text-[15px] font-extrabold text-primary-accent tabular-nums">
                {totalVolume >= 1000
                  ? `${(totalVolume / 1000).toFixed(2)}k kg`
                  : `${totalVolume} kg`}
              </span>
            </motion.div>
          )}

          {/* ─── Exercise navigation ─── */}
          <div className="flex gap-3 mt-5">
            {currentExIndex > 0 && (
              <button
                onClick={() => { setCurrentExIndex(i => i - 1); setActiveRestTimer(null); }}
                className="flex-1 py-3.5 rounded-full font-semibold text-[14px] text-text-1 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                Previous
              </button>
            )}

            {currentExIndex < workout.exercises.length - 1 ? (
              <button
                onClick={() => { setCurrentExIndex(i => i + 1); setActiveRestTimer(null); }}
                className="flex-1 py-3.5 rounded-full font-bold text-[14px] text-canvas flex items-center justify-center gap-2 transition-all"
                style={{ background: 'linear-gradient(135deg,#F5C518,#E8B000)', boxShadow: '0 6px 20px rgba(245,197,24,0.28)' }}
              >
                Next Exercise
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <motion.button
                onClick={() => setShowSummary(true)}
                disabled={!allExercisesDone}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3.5 rounded-full font-bold text-[14px] flex items-center justify-center gap-2 transition-all duration-300"
                style={
                  allExercisesDone
                    ? {
                        background: 'linear-gradient(135deg,#F5C518,#E8B000)',
                        color: '#111113',
                        boxShadow: '0 8px 28px rgba(245,197,24,0.35)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#6b7280',
                      }
                }
              >
                {allExercisesDone ? (
                  <>
                    <Trophy className="w-4 h-4" />
                    Finish Workout
                  </>
                ) : (
                  'Complete All Sets First'
                )}
              </motion.button>
            )}
          </div>

          {/* Completion status */}
          <p className="text-center text-[11px] text-text-3 mt-3 font-medium">
            {completedSets} / {totalSets} sets completed
          </p>
        </motion.div>
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

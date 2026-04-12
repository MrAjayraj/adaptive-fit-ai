import { useState, useRef, useCallback } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Camera, User, Flame, Zap, Trophy,
  ChevronRight, LogOut, Check, Trash, Edit2, Calendar
} from 'lucide-react';
import { xpForLevel, xpForNextLevel, getLevelTier } from '@/lib/gamification';
import {
  UserProfile, FitnessGoal, WorkoutSplit, ActivityLevel,
  GOAL_LABELS, SPLIT_LABELS, ACTIVITY_LABELS,
} from '@/types/fitness';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import BottomNav from '@/components/layout/BottomNav';
import CalorieMacroCard from '@/components/profile/CalorieMacroCard';
import XPBreakdownCard from '@/components/profile/XPBreakdownCard';
import { uploadAvatar, getCachedAvatarUrl, updateProfileField } from '@/services/api';

// ── Types for the edit modal ─────────────────────────────────
type FieldKey =
  | 'goalWeight' | 'bodyFat' | 'activityLevel'
  | 'goal' | 'preferredSplit' | 'workoutDays';

interface FieldDef {
  key: FieldKey;
  label: string;
  type: 'number' | 'select' | 'multiselect-days';
  options?: { value: string; label: string; description?: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  dbKey: string;
}

const FIELD_DEFS: FieldDef[] = [
  {
    key: 'goalWeight',
    label: 'Goal Weight',
    type: 'number',
    min: 30,
    max: 300,
    step: 0.5,
    unit: 'kg',
    dbKey: 'goal_weight_kg',
  },
  {
    key: 'bodyFat',
    label: 'Body Fat %',
    type: 'number',
    min: 1,
    max: 70,
    step: 0.5,
    unit: '%',
    dbKey: 'body_fat',
  },
  {
    key: 'activityLevel',
    label: 'Activity Level',
    type: 'select',
    dbKey: 'activity_level',
    options: [
      { value: 'sedentary', label: 'Sedentary', description: 'Desk job, little movement' },
      { value: 'lightly_active', label: 'Lightly Active', description: 'Light walking, 1–3 days/week' },
      { value: 'moderately_active', label: 'Moderately Active', description: 'Regular daily activity, 3–5 days/week' },
      { value: 'very_active', label: 'Very Active', description: 'Physical job or intense training' },
      { value: 'extremely_active', label: 'Extremely Active', description: 'Athlete / heavy labour daily' },
    ],
  },
  {
    key: 'goal',
    label: 'Fitness Goal',
    type: 'select',
    dbKey: 'goal',
    options: [
      { value: 'aggressive_cut', label: 'Aggressive Cut', description: '–750 cal/day deficit' },
      { value: 'lose_fat', label: 'Fat Loss', description: '–500 cal/day deficit' },
      { value: 'maintenance', label: 'Maintenance', description: 'Eat at TDEE' },
      { value: 'lean_bulk', label: 'Lean Bulk', description: '+250 cal/day surplus' },
      { value: 'build_muscle', label: 'Muscle Gain', description: '+500 cal/day surplus' },
    ],
  },
  {
    key: 'preferredSplit',
    label: 'Workout Split',
    type: 'select',
    dbKey: 'preferred_split',
    options: [
      { value: 'push_pull_legs', label: 'Push / Pull / Legs', description: '6-day rotation' },
      { value: 'upper_lower', label: 'Upper / Lower', description: '4-day rotation' },
      { value: 'full_body', label: 'Full Body', description: '3-day rotation' },
      { value: 'bro_split', label: 'Bro Split', description: 'Chest / Back / Shoulders / Arms / Legs' },
    ],
  },
  {
    key: 'workoutDays',
    label: 'Workout Days',
    type: 'multiselect-days',
    dbKey: 'workout_days',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

// ── Inline field-edit bottom sheet ──────────────────────────
interface EditModalProps {
  field: FieldDef | null;
  currentValue: string | number | number[] | undefined;
  onClose: () => void;
  onSave: (key: FieldKey, value: string | number | number[]) => void;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function EditModal({ field, currentValue, onClose, onSave }: EditModalProps) {
  const [val, setVal] = useState<string | number | number[]>(currentValue ?? '');

  if (!field) return null;

  const handleSave = () => {
    if (field.type === 'number') {
      const n = parseFloat(String(val));
      if (isNaN(n) || n < (field.min ?? 0) || n > (field.max ?? 9999)) {
        toast.error(`Enter a value between ${field.min} and ${field.max}`);
        return;
      }
      onSave(field.key, n);
    } else if (field.type === 'multiselect-days') {
      if (Array.isArray(val) && val.length === 0) {
        toast.error('Select at least one workout day');
        return;
      }
      onSave(field.key, val);
    } else {
      onSave(field.key, String(val));
    }
    onClose();
  };

  const toggleDay = (dayIndex: number) => {
    setVal(prev => {
      const currentDays = Array.isArray(prev) ? prev : [];
      if (currentDays.includes(dayIndex)) {
        return currentDays.filter(d => d !== dayIndex).sort();
      }
      return [...currentDays, dayIndex].sort();
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        className="w-full max-w-lg bg-surface-1 border-t border-border-subtle rounded-t-[28px] p-5 pb-24"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-5" />
        <h3 className="text-[18px] font-bold text-text-1 mb-5">Edit {field.label}</h3>

        {field.type === 'number' ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-surface-2 border border-border-subtle rounded-2xl px-4 py-4">
              <button
                onClick={() => setVal(v => Math.max(field.min ?? 0, Number(v) - (field.step ?? 1)))}
                className="w-11 h-11 rounded-xl bg-surface-3 flex items-center justify-center text-xl font-bold text-text-1"
              >−</button>
              <div className="text-center">
                <span className="text-[36px] font-extrabold text-text-1 tabular-nums">{val}</span>
                {field.unit && <span className="text-[16px] text-text-2 ml-1">{field.unit}</span>}
              </div>
              <button
                onClick={() => setVal(v => Math.min(field.max ?? 9999, Number(v) + (field.step ?? 1)))}
                className="w-11 h-11 rounded-xl bg-surface-3 flex items-center justify-center text-xl font-bold text-text-1"
              >+</button>
            </div>
            <input
              type="number"
              value={String(val)}
              min={field.min}
              max={field.max}
              step={field.step}
              onChange={e => setVal(e.target.value)}
              className="bg-surface-2 border border-border-subtle rounded-xl px-4 py-3 text-[14px] text-text-1 outline-none focus:border-primary-accent/50 text-center"
            />
          </div>
        ) : field.type === 'multiselect-days' ? (
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
            {DAYS_OF_WEEK.map((day, idx) => {
              const isSelected = Array.isArray(val) && val.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => toggleDay(idx)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all text-left ${
                    isSelected
                      ? 'border-primary-accent/50 bg-primary-accent/8'
                      : 'border-border-subtle bg-surface-2'
                  }`}
                >
                  <p className="text-[14px] font-semibold text-text-1">{day}</p>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ml-3 transition-colors ${
                    isSelected ? 'bg-primary-accent' : 'bg-surface-3'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-canvas" />}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
            {field.options?.map(opt => (
              <button
                key={opt.value}
                onClick={() => setVal(opt.value)}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all text-left ${
                  val === opt.value
                    ? 'border-primary-accent/50 bg-primary-accent/8'
                    : 'border-border-subtle bg-surface-2'
                }`}
              >
                <div>
                  <p className="text-[14px] font-semibold text-text-1">{opt.label}</p>
                  {opt.description && (
                    <p className="text-[12px] text-text-3 mt-0.5">{opt.description}</p>
                  )}
                </div>
                {val === opt.value && (
                  <div className="w-5 h-5 rounded-full bg-primary-accent flex items-center justify-center shrink-0 ml-3">
                    <Check className="w-3 h-3 text-canvas" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-full bg-surface-2 border border-border-subtle text-[14px] font-semibold text-text-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3.5 rounded-full bg-primary-accent text-canvas text-[14px] font-bold"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Profile Page ───────────────────────────────────────
export default function Profile() {
  const { profile, gamification, weightLogs, signOut, updateWeight, deleteWeightLog, setProfile, isLoading } = useFitness();
  const { isGuest, signInWithGoogle, exitGuestMode } = useAuth();
  const navigate = useNavigate();
  const { xp, level, streak } = gamification;

  const [editingField, setEditingField] = useState<FieldKey | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logWeight, setLogWeight] = useState('');
  const [logBodyFat, setLogBodyFat] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logIdToEdit, setLogIdToEdit] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(getCachedAvatarUrl);
  const [unitPref, setUnitPref] = useState<'metric' | 'imperial'>('metric');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const openField = useCallback((key: FieldKey) => setEditingField(key), []);
  const closeField = useCallback(() => setEditingField(null), []);

  const saveField = useCallback(
    async (key: FieldKey, value: string | number) => {
      if (!profile) return;
      const def = FIELD_DEFS.find(f => f.key === key);
      if (!def) return;

      const updated: UserProfile = { ...profile, [key]: value };
      setProfile(updated); // optimistic

      try {
        await updateProfileField({ [def.dbKey]: value });
        toast.success(`${def.label} updated`);
      } catch {
        setProfile(profile); // rollback
        toast.error('Failed to save — please try again');
      }
    },
    [profile, setProfile]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="relative flex items-center justify-center w-12 h-12">
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary w-full h-full animate-spin" />
          <div className="absolute inset-0 rounded-full blur-[8px] bg-primary/20 w-full h-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="min-h-screen bg-canvas pb-[100px] flex flex-col items-center justify-center font-sans px-6 relative">
        <div className="w-24 h-24 rounded-full bg-surface-2 flex items-center justify-center overflow-hidden border-2 border-surface-3 mb-6">
          <User className="w-12 h-12 text-text-3" />
        </div>
        <h2 className="text-[22px] font-bold text-text-1 mb-2">Guest User</h2>
        <p className="text-[14px] text-text-2 text-center mb-8 max-w-[280px]">
          Sign in to save your workouts, track progress, and compete with others.
        </p>
        <button
          onClick={signInWithGoogle}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-[#FAFAFA] text-[#111113] h-14 rounded-[16px] font-bold text-[15px] transition-transform active:scale-[0.98] mb-4 shadow-md"
        >
          <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>
        <button
          onClick={() => navigate('/')}
          className="text-[14px] font-semibold text-text-2 hover:text-text-1 transition-colors mb-12"
        >
          Back to Home
        </button>
        <button
          onClick={() => { if (exitGuestMode) exitGuestMode(); }}
          className="text-[13px] font-semibold text-red-500 hover:text-red-400 transition-colors py-4 px-6 rounded-full border border-red-500/20 bg-red-500/5 mt-8"
        >
          Exit Guest Mode
        </button>
        <BottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center">
          <User className="w-8 h-8 text-text-3" />
        </div>
        <div className="text-center">
          <h2 className="text-[18px] font-bold text-text-1 mb-1">Profile not found</h2>
          <p className="text-[13px] text-text-2">Your profile data couldn't be loaded.</p>
        </div>
        <button
          onClick={() => navigate('/onboarding')}
          className="w-full max-w-xs h-[52px] bg-primary text-canvas font-bold text-[15px] rounded-[14px]"
        >
          Set Up Profile
        </button>
        <button
          onClick={signOut}
          className="text-[13px] font-semibold text-red-500 hover:text-red-400 transition-colors flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
        <BottomNav />
      </div>
    );
  }

  const tier = getLevelTier(level);
  const nextLevelXP = xpForNextLevel(level);
  const currentLevelXP = xpForLevel(level);
  const xpProgress = nextLevelXP > currentLevelXP
    ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    : 100;

  const chartData = weightLogs.slice(0, 30).reverse().map(log => ({
    date: new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: Number(log.weight),
  }));

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      if (url) { setAvatarUrl(url); toast.success('Avatar updated'); }
      else toast.error('Failed to upload avatar');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleLogMeasurement = async () => {
    const w = parseFloat(logWeight);
    if (!w || w <= 0) {
      if (logWeight) toast.error('Please enter a valid weight.');
      return;
    }
    await updateWeight(w, logDate);
    if (logBodyFat) {
      const bf = parseFloat(logBodyFat);
      if (bf > 0) saveField('bodyFat', bf);
    }
    setShowLogModal(false);
    setLogWeight('');
    setLogBodyFat('');
    setLogDate(new Date().toISOString().split('T')[0]);
    if (logIdToEdit) setLogIdToEdit(null);
    toast.success('Measurement logged');
  };

  const editingFieldDef = editingField ? FIELD_DEFS.find(f => f.key === editingField) ?? null : null;
  const editingCurrentValue = editingField ? (profile as unknown as Record<string, unknown>)[editingField] as string | number | undefined : undefined;

  // Tappable rows: label → display value → field key (null = not editable inline)
  type DetailRow = { label: string; value: string; fieldKey: FieldKey | null };
  const DETAILS: DetailRow[] = [
    { label: 'Full Name', value: profile.name || 'Not set', fieldKey: null },
    { label: 'Age', value: `${profile.age} years`, fieldKey: null },
    { label: 'Sex', value: profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1), fieldKey: null },
    { label: 'Height', value: `${profile.height} cm`, fieldKey: null },
    { label: 'Weight', value: `${profile.weight} kg`, fieldKey: null },
    {
      label: 'Goal Weight',
      value: profile.goalWeight
        ? `${profile.goalWeight} kg`
        : 'Tap to set',
      fieldKey: 'goalWeight',
    },
    {
      label: 'Body Fat',
      value: profile.bodyFat ? `${profile.bodyFat}%` : 'Tap to set',
      fieldKey: 'bodyFat',
    },
    {
      label: 'Activity',
      value: ACTIVITY_LABELS[profile.activityLevel],
      fieldKey: 'activityLevel',
    },
    {
      label: 'Goal',
      value: GOAL_LABELS[profile.goal],
      fieldKey: 'goal',
    },
    {
      label: 'Split',
      value: SPLIT_LABELS[profile.preferredSplit],
      fieldKey: 'preferredSplit',
    },
    {
      label: 'Workout Days',
      value: profile.workoutDays?.length 
        ? `${profile.workoutDays.length} days (${profile.workoutDays.map(d => DAYS_OF_WEEK[d].substring(0, 3)).join(', ')})` 
        : 'Not set',
      fieldKey: 'workoutDays',
    },
  ];

  // Goal weight secondary hint (e.g. "4 kg less than current")
  const goalWeightHint = (() => {
    if (!profile.goalWeight) return null;
    const diff = profile.goalWeight - profile.weight;
    if (Math.abs(diff) < 0.5) return 'At goal weight';
    return diff > 0
      ? `${diff.toFixed(1)} kg to gain`
      : `${Math.abs(diff).toFixed(1)} kg to lose`;
  })();

  return (
    <div className="min-h-screen bg-canvas pb-[100px] font-sans">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-lg md:max-w-[1080px] mx-auto md:pl-[104px] md:pr-8 space-y-5 px-4 pt-14 md:pt-10 mb-8"
      >
        {/* HEADER */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-surface-1 border border-border-subtle flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-text-1" />
          </button>
          <h1 className="text-[18px] font-bold text-text-1">Profile</h1>
          <div className="w-10" /> {/* spacer */}
        </motion.div>

        {/* AVATAR + IDENTITY */}
        <motion.div variants={itemVariants} className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="absolute inset-[-6px] rounded-full border-2 border-primary-accent/40" />
            <div className="w-24 h-24 rounded-full bg-surface-2 flex items-center justify-center overflow-hidden border-2 border-surface-3">
              {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                : <User className="w-12 h-12 text-text-3" />
              }
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-accent flex items-center justify-center border-2 border-canvas disabled:opacity-60"
            >
              <Camera className="w-3.5 h-3.5 text-canvas" />
            </button>
            <div className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-primary-accent flex items-center justify-center">
              <span className="text-[10px] font-extrabold text-canvas">L{level}</span>
            </div>
          </div>
          <h2 className="text-[22px] font-bold text-text-1">{profile.name || 'Athlete'}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[13px]">{tier.icon}</span>
            <span className="text-[13px] text-text-2 capitalize">{tier.tier} · Lv.{level}</span>
          </div>

          <div className="w-full max-w-xs mt-4">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-text-2">{xp} XP</span>
              <span className="text-primary-accent font-semibold">{nextLevelXP} XP</span>
            </div>
            <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-accent to-accent-alt rounded-full"
                layoutId="xpBar"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ type: 'spring', stiffness: 50 }}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-surface-1 border border-border-subtle rounded-full px-3 py-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[12px] font-bold text-text-1">{streak}</span>
              <span className="text-[11px] text-text-3">streak</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-1 border border-border-subtle rounded-full px-3 py-1.5">
              <Zap className="w-3.5 h-3.5 text-primary-accent" />
              <span className="text-[12px] font-bold text-text-1">{xp}</span>
              <span className="text-[11px] text-text-3">XP</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-1 border border-border-subtle rounded-full px-3 py-1.5">
              <Trophy className="w-3.5 h-3.5 text-primary-accent" />
              <span className="text-[12px] font-bold text-text-1">{gamification.prs.length}</span>
              <span className="text-[11px] text-text-3">PRs</span>
            </div>
          </div>
        </motion.div>

        {/* SPLIT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">

            {/* PERSONAL DETAILS — tappable rows */}
            <motion.div variants={itemVariants}>
              <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest mb-3 px-1">Personal Details</p>
              <div className="bg-surface-1 rounded-[20px] border border-border-subtle overflow-hidden">
                {DETAILS.map(({ label, value, fieldKey }, i) => {
                  const isTappable = fieldKey !== null;
                  const isGoalWeight = fieldKey === 'goalWeight';
                  return (
                    <button
                      key={label}
                      disabled={!isTappable}
                      onClick={() => isTappable && openField(fieldKey!)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                        i < DETAILS.length - 1 ? 'border-b border-border-subtle' : ''
                      } ${isTappable ? 'hover:bg-surface-2 active:bg-surface-2 cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className="text-[13px] text-text-2">{label}</span>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className={`text-[13px] font-semibold ${
                            value === 'Tap to set' ? 'text-text-3 italic' : 'text-text-1'
                          }`}>
                            {value}
                          </span>
                          {isGoalWeight && goalWeightHint && (
                            <p className="text-[10px] text-text-3 mt-0.5">{goalWeightHint}</p>
                          )}
                        </div>
                        {isTappable && <ChevronRight className="w-3.5 h-3.5 text-text-3 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* NUTRITION & XP BREAKDOWN */}
            <motion.div variants={itemVariants}>
              <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest mb-3 px-1">Nutrition</p>
              <CalorieMacroCard />
            </motion.div>
            <motion.div variants={itemVariants}>
              <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest mb-3 px-1">XP Breakdown</p>
              <XPBreakdownCard />
            </motion.div>
          </div>

          <div className="space-y-6">
            {/* BODY STATS */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest">Weight History</p>
                <button
                  onClick={() => {
                    setLogIdToEdit(null);
                    setLogWeight(String(profile.weight));
                    setLogBodyFat(profile.bodyFat ? String(profile.bodyFat) : '');
                    setLogDate(new Date().toISOString().split('T')[0]);
                    setShowLogModal(true);
                  }}
                  className="px-3 py-1.5 rounded-full bg-primary-accent text-canvas text-[11px] font-bold"
                >
                  Log New
                </button>
              </div>
              <div className="bg-surface-1 rounded-[20px] border border-border-subtle p-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" tick={{ fill: '#565660', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={8} />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: '#565660', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={8} width={32} />
                      <Tooltip contentStyle={{ background: '#252529', border: 'none', borderRadius: 12, color: '#FAFAFA', fontSize: 12 }} itemStyle={{ color: '#F5C518' }} />
                      <Line type="monotone" dataKey="weight" stroke="#F5C518" strokeWidth={2.5} dot={{ fill: '#F5C518', stroke: '#111113', strokeWidth: 2, r: 4 }} />
                      {profile.goalWeight && <ReferenceLine y={profile.goalWeight} stroke="#4ADE80" strokeDasharray="3 3" />}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-[13px] text-text-3 text-center py-8">Log measurements to see your weight trend</p>
                )}

                {/* Recent Entries */}
                {weightLogs.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[11px] uppercase font-bold text-text-3 tracking-widest mb-3">Recent Entries</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                      {weightLogs.slice(0, 5).map(log => (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border-subtle">
                          <div>
                            <p className="text-[14px] font-bold text-text-1">{log.weight} kg</p>
                            <p className="text-[11px] text-text-3">{new Date(log.logged_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setLogIdToEdit(log.id);
                                setLogWeight(String(log.weight));
                                setLogDate(log.logged_at);
                                setShowLogModal(true);
                              }}
                              className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center hover:bg-surface-3/80 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-text-2" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this entry?')) {
                                  deleteWeightLog(log.id)
                                    .then(() => toast.success('Entry deleted'))
                                    .catch(() => toast.error('Failed to delete entry'));
                                }
                              }}
                              className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                            >
                              <Trash className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* ACHIEVEMENTS */}
            <motion.div variants={itemVariants}>
              <button onClick={() => navigate('/achievements')} className="flex items-center justify-between w-full mb-3 px-1">
                <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest">Achievements</p>
                <ChevronRight className="w-4 h-4 text-text-3" />
              </button>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {gamification.achievements.filter(a => a.unlockedAt).slice(0, 6).map(a => (
                  <div key={a.id} className="shrink-0 w-[60px] h-[60px] rounded-full bg-surface-1 border border-border-subtle flex items-center justify-center text-xl">
                    {a.icon}
                  </div>
                ))}
                {gamification.achievements.filter(a => a.unlockedAt).length === 0 && (
                  <p className="text-[12px] text-text-3 py-2">Complete workouts to earn achievements</p>
                )}
              </div>
            </motion.div>

            {/* SETTINGS */}
            <motion.div variants={itemVariants}>
              <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest mb-3 px-1">Settings</p>
              <div className="bg-surface-1 rounded-[20px] border border-border-subtle overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                  <span className="text-[14px] font-medium text-text-1">Unit</span>
                  <div className="flex rounded-full overflow-hidden border border-border-subtle">
                    <button
                      onClick={() => setUnitPref('metric')}
                      className={`px-3.5 py-1.5 text-[12px] font-bold transition-colors ${unitPref === 'metric' ? 'bg-primary-accent text-canvas' : 'bg-surface-2 text-text-2'}`}
                    >Metric</button>
                    <button
                      onClick={() => setUnitPref('imperial')}
                      className={`px-3.5 py-1.5 text-[12px] font-medium transition-colors ${unitPref === 'imperial' ? 'bg-primary-accent text-canvas' : 'bg-surface-2 text-text-2'}`}
                    >Imperial</button>
                  </div>
                </div>
                <button onClick={signOut} className="flex items-center gap-2.5 p-4 w-full text-red-500 hover:bg-surface-2 transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span className="text-[14px] font-semibold">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* LOG MODAL */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowLogModal(false)}>
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="w-full max-w-lg bg-surface-1 border-t border-border-subtle p-5 rounded-t-[28px] pb-24"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-4" />
              <h3 className="text-[18px] font-bold text-text-1 mb-4">{logIdToEdit ? 'Edit Measurement' : 'Log Measurement'}</h3>
              <div className="flex flex-col gap-4 mb-6">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-text-3 uppercase tracking-wider ml-1">Weight (kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    className="bg-surface-2 border border-border-subtle rounded-xl px-4 py-3.5 text-[15px] font-medium text-text-1 outline-none focus:border-primary-accent/50"
                    value={logWeight}
                    onChange={e => setLogWeight(e.target.value)}
                    placeholder={`${profile.weight}`}
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-text-3 uppercase tracking-wider ml-1">Body Fat % (Optional)</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Optional"
                    className="bg-surface-2 border border-border-subtle rounded-xl px-4 py-3.5 text-[15px] font-medium text-text-1 outline-none focus:border-primary-accent/50"
                    value={logBodyFat}
                    onChange={e => setLogBodyFat(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-text-3 uppercase tracking-wider ml-1">Date</span>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-text-3 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      className="w-full bg-surface-2 border border-border-subtle rounded-xl pl-10 pr-4 py-3.5 text-[15px] font-medium text-text-1 outline-none focus:border-primary-accent/50 filter-calendar-icon-light"
                      value={logDate}
                      onChange={e => setLogDate(e.target.value)}
                    />
                  </div>
                </label>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={handleLogMeasurement} className="w-full py-4 rounded-full bg-primary-accent text-canvas text-[15px] font-bold">
                  Save
                </button>
                <button onClick={() => setShowLogModal(false)} className="w-full py-3.5 rounded-full bg-transparent text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors text-[14px] font-bold">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FIELD EDIT MODAL */}
      <AnimatePresence>
        {editingField && (
          <EditModal
            field={editingFieldDef}
            currentValue={editingCurrentValue}
            onClose={closeField}
            onSave={saveField}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

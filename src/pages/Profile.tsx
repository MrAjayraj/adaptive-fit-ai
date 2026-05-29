import { useState, useRef, useCallback } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Camera, User, Flame, Zap, Trophy,
  ChevronRight, LogOut, Trash, Edit2, Calendar, ShieldAlert
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
import TrophyShowcase from '@/components/profile/TrophyShowcase';
import PersonalRecordsRow from '@/components/profile/PersonalRecordsRow';
import CustomFieldSheets from '@/components/profile/CustomFieldSheets';
import { uploadAvatar, getCachedAvatarUrl, updateProfileField } from '@/services/api';

type FieldKey =
  | 'goalWeight' | 'bodyFat' | 'activityLevel'
  | 'goal' | 'preferredSplit' | 'workoutDays'
  | 'username' | 'name';

interface FieldDef {
  key: FieldKey;
  label: string;
  type: 'number' | 'select' | 'multiselect-days' | 'text';
  options?: { value: string; label: string; description?: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  dbKey: string;
}

const FIELD_DEFS: FieldDef[] = [
  {
    key: 'username',
    label: 'Username',
    type: 'text',
    dbKey: 'username',
  },
  {
    key: 'name',
    label: 'Full Name',
    type: 'text',
    dbKey: 'name',
  },
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
const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 350, damping: 25 } }
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    () => profile?.avatarUrl ?? getCachedAvatarUrl()
  );
  const [unitPref, setUnitPref] = useState<'metric' | 'imperial'>('metric');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const openField = useCallback((key: FieldKey) => setEditingField(key), []);
  const closeField = useCallback(() => setEditingField(null), []);

  const saveField = useCallback(
    async (key: FieldKey, value: any) => {
      if (!profile) return;
      const def = FIELD_DEFS.find(f => f.key === key);
      if (!def) return;

      const updated: UserProfile = { ...profile, [key]: value };
      setProfile(updated); // optimistic

      try {
        await updateProfileField({ [def.dbKey]: value });
        toast.success(`${def.label} updated successfully`);
      } catch {
        setProfile(profile); // rollback
        toast.error('Failed to save field — please try again');
      }
    },
    [profile, setProfile]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative flex items-center justify-center w-14 h-14">
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary w-full h-full animate-spin" />
          <div className="absolute inset-0 rounded-full blur-[10px] bg-primary/20 w-full h-full animate-pulse" />
        </div>
      </div>
    );
  }

  // Cohesive dark guest state matching design Guidelines
  if (isGuest) {
    return (
      <div className="min-h-screen bg-background pb-[100px] flex flex-col items-center justify-center px-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-radial-gradient(circle at center, rgba(245,197,24,0.02), transparent 70%) pointer-events-none" />
        
        <div className="w-24 h-24 rounded-full bg-surface-2 flex items-center justify-center border border-border-subtle relative mb-6 shadow-glow">
          <User className="w-12 h-12 text-text-3" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
          </div>
        </div>

        <h2 className="text-[24px] font-black text-text-1 mb-2 tracking-tight uppercase">Guest Athlete</h2>
        <p className="text-[14px] text-text-2 text-center mb-8 max-w-[280px] leading-relaxed">
          Sign in to secure your stats, track weight shifts, build custom splits, and compete with other athletes.
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-[#FAFAFA] hover:bg-[#FAFAFA]/90 text-[#111113] h-14 rounded-2xl font-extrabold text-[15px] transition-transform active:scale-[0.98] mb-4 shadow-md uppercase tracking-wider"
        >
          <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Connect Google Account
        </button>

        <button
          onClick={() => navigate('/')}
          className="text-[14px] font-bold text-text-2 hover:text-text-1 transition-colors tracking-widest uppercase mb-6"
        >
          Back to Home
        </button>

        <button
          onClick={() => { if (exitGuestMode) exitGuestMode(); }}
          className="text-[12px] font-bold text-destructive hover:text-destructive/80 transition-all py-3 px-6 rounded-full border border-destructive/20 bg-destructive/5 mt-10 tracking-widest uppercase"
        >
          Exit Guest Session
        </button>
        <BottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 relative font-sans">
        <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center border border-border/20">
          <User className="w-8 h-8 text-text-3" />
        </div>
        <div className="text-center">
          <h2 className="text-[20px] font-black text-text-1 mb-1 uppercase tracking-tight">Athlete profile not found</h2>
          <p className="text-[13px] text-text-2">Your global user account information failed to retrieve.</p>
        </div>
        <button
          onClick={() => navigate('/onboarding')}
          className="w-full max-w-xs h-[54px] bg-primary text-background font-black text-[14px] rounded-full uppercase tracking-wider shadow-lg shadow-primary/15"
        >
          Begin Profile Setup
        </button>
        <button
          onClick={signOut}
          className="text-[13px] font-bold text-destructive hover:text-destructive/80 transition-colors flex items-center gap-2 tracking-wider uppercase mt-2"
        >
          <LogOut className="w-4 h-4" /> Terminate Session
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

  // Concentric circle SVG settings
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (circumference * xpProgress) / 100;

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
      if (url) {
        setAvatarUrl(url);
        if (profile) setProfile({ ...profile, avatarUrl: url });
        toast.success('Profile avatar updated');
      } else {
        toast.error('Avatar upload failed — verify container visibility');
      }
    } catch {
      toast.error('Unexpected avatar upload failure');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleLogMeasurement = async () => {
    const w = parseFloat(logWeight);
    if (!w || w <= 0) {
      if (logWeight) toast.error('Enter a valid physical bodyweight');
      return;
    }
    await updateWeight(w, logDate, logIdToEdit);
    if (logBodyFat) {
      const bf = parseFloat(logBodyFat);
      if (bf > 0) saveField('bodyFat', bf);
    }
    setShowLogModal(false);
    setLogWeight('');
    setLogBodyFat('');
    setLogDate(new Date().toISOString().split('T')[0]);
    if (logIdToEdit) setLogIdToEdit(null);
    toast.success(logIdToEdit ? 'Entry adjusted' : 'New weight entry logged');
  };

  const editingFieldDef = editingField ? FIELD_DEFS.find(f => f.key === editingField) ?? null : null;
  const editingCurrentValue = editingField ? (profile as unknown as Record<string, unknown>)[editingField] as string | number | number[] | undefined : undefined;

  // Weight goal helper calculation
  const weightDifference = profile.goalWeight ? profile.goalWeight - profile.weight : 0;
  const isGoalReached = Math.abs(weightDifference) < 0.2;

  return (
    <div className="min-h-screen bg-background pb-[100px] font-sans">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-lg md:max-w-[1080px] mx-auto md:pl-[104px] md:pr-8 space-y-6 px-4 pt-14 md:pt-10 mb-8"
      >
        {/* HEADER */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-surface-1 border border-border/40 flex items-center justify-center active:scale-95 transition-all hover:bg-surface-2"
          >
            <ArrowLeft className="w-4 h-4 text-text-1" />
          </button>
          <h1 className="text-[15px] font-black uppercase tracking-wider text-text-2">Athlete Dossier</h1>
          <div className="w-10" />
        </motion.div>

        {/* AVATAR + IDENTITY (Elite Dossier Header Layout) */}
        <motion.div 
          variants={itemVariants} 
          className="relative flex flex-col items-center bg-surface-1 border border-border/40 rounded-[28px] p-6 overflow-hidden shadow-glow"
        >
          <div className="absolute inset-0 bg-radial-gradient(circle at top right, rgba(245,197,24,0.03), transparent 60%) pointer-events-none" />

          <div className="relative mb-5 w-[112px] h-[112px] flex items-center justify-center">
            {/* Dynamic concentric radial level border */}
            <svg className="absolute w-full h-full -rotate-90">
              <circle 
                cx="56" 
                cy="56" 
                r={radius} 
                stroke="rgba(255,255,255,0.04)" 
                strokeWidth="3.5" 
                fill="transparent" 
              />
              <motion.circle 
                cx="56" 
                cy="56" 
                r={radius} 
                stroke="#F5C518" 
                strokeWidth="3.5" 
                fill="transparent" 
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: strokeOffset }}
                transition={{ type: 'spring', stiffness: 45, delay: 0.1 }}
              />
            </svg>
            
            {/* User avatar core bubble */}
            <div className="w-20 h-20 rounded-full bg-surface-2 flex items-center justify-center overflow-hidden border border-border/20 z-10 relative">
              {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                : <User className="w-10 h-10 text-text-3" />
              }
            </div>
            
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary hover:bg-primary-hover flex items-center justify-center border-2 border-surface-1 disabled:opacity-60 z-20 active:scale-90 transition-transform"
            >
              <Camera className="w-3.5 h-3.5 text-background" />
            </button>
            
            {/* Dynamic Level tag */}
            <div className="absolute -top-0.5 -left-0.5 w-7 h-7 rounded-full bg-primary flex items-center justify-center z-20 shadow-md">
              <span className="text-[10px] font-black text-background">L{level}</span>
            </div>
          </div>

          <h2 className="text-[24px] font-black text-text-1 tracking-tight">{profile.name || 'Athlete'}</h2>
          
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[13px]">{tier.icon}</span>
            <span className="text-[12px] text-text-2 capitalize font-bold tracking-wide">{tier.tier} · Level {level}</span>
          </div>

          {/* Clean metadata strip */}
          <div className="text-[11px] text-text-3 font-semibold uppercase tracking-wider mt-1.5 flex gap-2 items-center">
            <span>{xp} XP Total</span>
            <span className="w-1 h-1 rounded-full bg-surface-3" />
            <span className="text-primary">{nextLevelXP - xp} XP to level {level + 1}</span>
          </div>

          {/* Core high-end stat indicators layout */}
          <div className="flex gap-2.5 mt-5 w-full max-w-xs">
            <div className="flex-1 flex flex-col items-center p-3 rounded-2xl bg-surface-2/60 border border-border/10">
              <Flame className="w-4 h-4 text-orange-400 mb-1" />
              <span className="text-[15px] font-black text-text-1 leading-none">{streak}</span>
              <span className="text-[9px] text-text-3 uppercase font-bold tracking-widest mt-1">Streak</span>
            </div>
            <div className="flex-1 flex flex-col items-center p-3 rounded-2xl bg-surface-2/60 border border-border/10">
              <Zap className="w-4 h-4 text-primary mb-1" />
              <span className="text-[15px] font-black text-text-1 leading-none">{xp}</span>
              <span className="text-[9px] text-text-3 uppercase font-bold tracking-widest mt-1">XP Total</span>
            </div>
            <div className="flex-1 flex flex-col items-center p-3 rounded-2xl bg-surface-2/60 border border-border/10">
              <Trophy className="w-4 h-4 text-primary mb-1" />
              <span className="text-[15px] font-black text-text-1 leading-none">{gamification.prs.length}</span>
              <span className="text-[9px] text-text-3 uppercase font-bold tracking-widest mt-1">Records</span>
            </div>
          </div>
        </motion.div>

        {/* SPLIT DOUBLE GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* COLUMN 1: Visual properties selectors + Trophy widgets */}
          <div className="space-y-6">

            {/* REDESIGNED CORE PROFILE BOARDS (Grouped by Contexts) */}
            <motion.div variants={itemVariants} className="space-y-4">
              
              {/* Group A: Bio Identity */}
              <div className="bg-surface-1 rounded-3xl border border-border/40 overflow-hidden">
                <div className="px-4 py-3 bg-surface-2/30 border-b border-border/30">
                  <h3 className="text-[10px] uppercase font-bold tracking-widest text-text-3">Bio Info</h3>
                </div>
                
                <button
                  onClick={() => openField('username')}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-2/50 transition-colors text-left border-b border-border/20"
                >
                  <span className="text-[13px] text-text-2 font-medium">Username</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-text-1">{profile.username ? `@${profile.username}` : 'Not set'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-3" />
                  </div>
                </button>

                <button
                  onClick={() => openField('name')}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-2/50 transition-colors text-left"
                >
                  <span className="text-[13px] text-text-2 font-medium">Full Name</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-text-1">{profile.name || 'Not configured'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-3" />
                  </div>
                </button>
              </div>

              {/* Group B: Physical Metrics with Delta tags */}
              <div className="bg-surface-1 rounded-3xl border border-border/40 overflow-hidden">
                <div className="px-4 py-3 bg-surface-2/30 border-b border-border/30">
                  <h3 className="text-[10px] uppercase font-bold tracking-widest text-text-3">Body Dimensions</h3>
                </div>

                <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/20 bg-surface-2/10">
                  <span className="text-[13px] text-text-2 font-medium">Starting Dimensions</span>
                  <div className="text-right">
                    <span className="text-[13px] font-bold text-text-1">{profile.height} cm · {profile.weight} kg</span>
                    <p className="text-[9px] text-text-3 mt-0.5">Logged age: {profile.age} yrs · Sex: {profile.gender}</p>
                  </div>
                </div>

                <button
                  onClick={() => openField('goalWeight')}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-2/50 transition-colors text-left border-b border-border/20"
                >
                  <span className="text-[13px] text-text-2 font-medium">Goal Target Weight</span>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[13px] font-bold text-text-1">
                        {profile.goalWeight ? `${profile.goalWeight} kg` : 'Not configured'}
                      </span>
                      {profile.goalWeight && (
                        <p className={`text-[10px] font-bold mt-0.5 ${
                          isGoalReached ? 'text-emerald-400' : 'text-primary'
                        }`}>
                          {isGoalReached ? 'Target Achieved 🎉' : 
                           weightDifference > 0 ? `+${weightDifference.toFixed(1)} kg to bulk` : 
                           `–${Math.abs(weightDifference).toFixed(1)} kg to cut`}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-text-3" />
                  </div>
                </button>

                <button
                  onClick={() => openField('bodyFat')}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-2/50 transition-colors text-left"
                >
                  <span className="text-[13px] text-text-2 font-medium">Body Fat Ratio</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-text-1">{profile.bodyFat ? `${profile.bodyFat}%` : 'Tap to log'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-3" />
                  </div>
                </button>
              </div>

              {/* Group C: Training Strategies with active Week circles */}
              <div className="bg-surface-1 rounded-3xl border border-border/40 overflow-hidden">
                <div className="px-4 py-3 bg-surface-2/30 border-b border-border/30">
                  <h3 className="text-[10px] uppercase font-bold tracking-widest text-text-3">Training Strategy</h3>
                </div>

                <button
                  onClick={() => openField('goal')}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-2/50 transition-colors text-left border-b border-border/20"
                >
                  <span className="text-[13px] text-text-2 font-medium">Fitness Goal</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-text-1 capitalize">{GOAL_LABELS[profile.goal]}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-3" />
                  </div>
                </button>

                <button
                  onClick={() => openField('activityLevel')}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-2/50 transition-colors text-left border-b border-border/20"
                >
                  <span className="text-[13px] text-text-2 font-medium">Physical Activity</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-text-1">{ACTIVITY_LABELS[profile.activityLevel]}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-3" />
                  </div>
                </button>

                <button
                  onClick={() => openField('preferredSplit')}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-2/50 transition-colors text-left border-b border-border/20"
                >
                  <span className="text-[13px] text-text-2 font-medium">Preferred Split</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-text-1">{SPLIT_LABELS[profile.preferredSplit]}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-3" />
                  </div>
                </button>

                {/* Training days - visual bubble layout directly in detail list */}
                <button
                  onClick={() => openField('workoutDays')}
                  className="w-full flex flex-col px-4 py-4 hover:bg-surface-2/50 transition-colors text-left gap-3"
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[13px] text-text-2 font-medium">Active Training Schedule</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] font-extrabold text-primary">{profile.workoutDays?.length || 0} Days/Wk</span>
                      <ChevronRight className="w-3.5 h-3.5 text-text-3" />
                    </div>
                  </div>

                  <div className="flex justify-between w-full max-w-[280px] mx-auto py-1 px-3 bg-surface-2/80 rounded-2xl border border-border/5">
                    {DAYS_SHORT.map((day, idx) => {
                      const isActive = profile.workoutDays?.includes(idx);
                      return (
                        <div 
                          key={idx}
                          className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
                            isActive ? 'bg-primary text-background' : 'text-text-3 bg-surface-3/50'
                          }`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </button>
              </div>

            </motion.div>

            {/* NEW TROPHY SHOWCASE COMPONENT */}
            <motion.div variants={itemVariants}>
              <TrophyShowcase />
            </motion.div>

            {/* PR CAROUSEL */}
            <motion.div variants={itemVariants}>
              <PersonalRecordsRow />
            </motion.div>

          </div>

          {/* COLUMN 2: Weight logs, charts, Calorie dashboard, setting blocks */}
          <div className="space-y-6">
            
            {/* BODY STATS (Redesigned Weight History) */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-primary" />
                  <h3 className="text-[12px] font-bold text-text-3 uppercase tracking-wider">Weight History Chart</h3>
                </div>
                <button
                  onClick={() => {
                    setLogIdToEdit(null);
                    setLogWeight(String(profile.weight));
                    setLogBodyFat(profile.bodyFat ? String(profile.bodyFat) : '');
                    setLogDate(new Date().toISOString().split('T')[0]);
                    setShowLogModal(true);
                  }}
                  className="px-3 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-background text-[11px] font-black uppercase tracking-wider shadow-md shadow-primary/10 active:scale-95 transition-all"
                >
                  Log Metric
                </button>
              </div>
              
              <div className="bg-surface-1 rounded-3xl border border-border/40 p-4 shadow-glow">
                {chartData.length > 0 ? (
                  <div className="relative pt-2">
                    <ResponsiveContainer width="100%" height={170}>
                      <LineChart data={chartData}>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: '#818188', fontSize: 9, fontWeight: 'bold' }} 
                          axisLine={false} 
                          tickLine={false} 
                          tickMargin={8} 
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          tick={{ fill: '#818188', fontSize: 9, fontWeight: 'bold' }} 
                          axisLine={false} 
                          tickLine={false} 
                          tickMargin={8} 
                          width={28} 
                        />
                        <Tooltip 
                          contentStyle={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, color: '#FCFCFC', fontSize: 11, fontWeight: 'bold' }} 
                          itemStyle={{ color: '#F5C518' }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="weight" 
                          stroke="#F5C518" 
                          strokeWidth={3} 
                          dot={{ fill: '#F5C518', stroke: '#111113', strokeWidth: 2.5, r: 5.5 }} 
                          activeDot={{ fill: '#F5C518', stroke: '#1C1C1E', strokeWidth: 3, r: 7 }}
                        />
                        {profile.goalWeight && <ReferenceLine y={profile.goalWeight} stroke="#4ADE80" strokeDasharray="3 3" strokeWidth={1.5} />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-[13px] text-text-3 text-center py-8">Log weight measurements to populate your trend chart</p>
                )}

                {/* Recent Entries */}
                {weightLogs.length > 0 && (
                  <div className="mt-5 border-t border-border/20 pt-4">
                    <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest mb-3">Recent Logs</p>
                    <div className="space-y-2 max-h-[170px] overflow-y-auto no-scrollbar">
                      {weightLogs.slice(0, 5).map(log => (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface-2 border border-border/10 hover:border-border/30 transition-all">
                          <div>
                            <p className="text-[14px] font-black text-text-1 tabular-nums">{log.weight} kg</p>
                            <p className="text-[10px] font-bold text-text-3 uppercase tracking-wider">{new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
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
                                if (window.confirm('Remove this bodyweight entry permanently?')) {
                                  deleteWeightLog(log.id)
                                    .then(() => toast.success('Entry removed'))
                                    .catch(() => toast.error('Failed to remove entry'));
                                }
                              }}
                              className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                            >
                              <Trash className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* FUEL & NUTRITIONTARGETS */}
            <motion.div variants={itemVariants}>
              <div className="px-1 mb-3">
                <h3 className="text-[12px] font-bold text-text-3 uppercase tracking-wider">Nutrition targets</h3>
              </div>
              <CalorieMacroCard />
            </motion.div>

            {/* XP BREAKDOWNCARD */}
            <motion.div variants={itemVariants}>
              <div className="px-1 mb-3">
                <h3 className="text-[12px] font-bold text-text-3 uppercase tracking-wider">XP Allocation</h3>
              </div>
              <XPBreakdownCard />
            </motion.div>

            {/* SETTINGS CARD */}
            <motion.div variants={itemVariants}>
              <div className="px-1 mb-3">
                <h3 className="text-[12px] font-bold text-text-3 uppercase tracking-wider">System Settings</h3>
              </div>
              <div className="bg-surface-1 rounded-3xl border border-border/40 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border/20">
                  <span className="text-[13px] font-bold text-text-1 uppercase tracking-wider">Units of measure</span>
                  <div className="flex rounded-full overflow-hidden border border-border/30 bg-surface-2 p-0.5">
                    <button
                      onClick={() => setUnitPref('metric')}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                        unitPref === 'metric' ? 'bg-primary text-background font-black shadow' : 'text-text-3 hover:text-text-2'
                      }`}
                    >Metric</button>
                    <button
                      onClick={() => setUnitPref('imperial')}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                        unitPref === 'imperial' ? 'bg-primary text-background font-black shadow' : 'text-text-3 hover:text-text-2'
                      }`}
                    >Imperial</button>
                  </div>
                </div>
                
                <button onClick={signOut} className="flex items-center gap-2.5 p-4 w-full text-destructive hover:bg-destructive/5 transition-colors font-bold text-[13px] uppercase tracking-wider">
                  <LogOut className="w-4 h-4" />
                  <span>Terminate session</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* DYNAMIC LOG MODAL */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-end justify-center" onClick={() => setShowLogModal(false)}>
            <motion.div
              initial={{ y: 280, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 280, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="w-full max-w-lg bg-surface-1 border-t border-border-subtle p-6 rounded-t-[32px] pb-12 shadow-[0_-12px_40px_rgba(0,0,0,0.6)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-surface-3 rounded-full mx-auto mb-5" />
              <h3 className="text-[20px] font-black text-text-1 mb-5 uppercase tracking-tight">
                {logIdToEdit ? 'Adjust Log' : 'New Metric Log'}
              </h3>
              
              <div className="flex flex-col gap-4 mb-6">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider ml-1">Current Bodyweight (kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    className="bg-surface-2 border border-border-subtle rounded-2xl px-4 py-3.5 text-[15px] font-bold text-text-1 outline-none focus:border-primary/50"
                    value={logWeight}
                    onChange={e => setLogWeight(e.target.value)}
                    placeholder={`${profile.weight}`}
                    autoFocus
                  />
                </label>
                
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider ml-1">Current Body Fat % (Optional)</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Optional metric value"
                    className="bg-surface-2 border border-border-subtle rounded-2xl px-4 py-3.5 text-[15px] font-bold text-text-1 outline-none focus:border-primary/50"
                    value={logBodyFat}
                    onChange={e => setLogBodyFat(e.target.value)}
                  />
                </label>
                
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider ml-1">Log Date</span>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-text-3 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      className="w-full bg-surface-2 border border-border-subtle rounded-2xl pl-10 pr-4 py-3.5 text-[15px] font-bold text-text-1 outline-none focus:border-primary/50 filter-calendar-icon-light"
                      value={logDate}
                      onChange={e => setLogDate(e.target.value)}
                    />
                  </div>
                </label>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogModal(false)} 
                  className="flex-1 py-4 rounded-full bg-surface-2 hover:bg-surface-3 text-[14px] font-bold text-text-2 active:scale-95 transition-all border border-border/10"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLogMeasurement} 
                  className="flex-1 py-4 rounded-full bg-primary hover:bg-primary-hover text-background text-[14px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-primary/10"
                >
                  Save Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DYNAMIC FIELD EDIT SHEETS */}
      <AnimatePresence>
        {editingField && (
          <CustomFieldSheets
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

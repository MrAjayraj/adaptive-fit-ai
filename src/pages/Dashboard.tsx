import { useState, useRef, useEffect, useCallback } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { detectFatigue } from '@/lib/workout-generator';
import { calculateBMR, calculateFullCalories } from '@/lib/calories';
import { xpForNextLevel, xpForLevel, getLevelTier } from '@/lib/gamification';
import {
  Bell, Play, TrendingUp, Flame, Dumbbell, ChevronRight,
  Star, Footprints, Zap, AlertTriangle, Users, Trophy, CalendarDays, Plus, Minus,
} from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import DailyMissions from '@/components/gamification/DailyMissions';
import RankBadgeCard from '@/components/gamification/RankBadgeCard';
import { motion } from 'framer-motion';
import { upsertTodaySteps } from '@/services/api';

const CATEGORIES = ['All', 'Shoulders', 'Arms', 'Chest', 'Legs', 'Core', 'Back'];

const EXERCISE_CARDS = [
  { name: 'Home Workout',   count: 12, rating: 4.9, gradient: 'from-orange-500/20 to-amber-600/10' },
  { name: 'Hand Exercises', count: 8,  rating: 4.8, gradient: 'from-violet-500/20 to-purple-600/10' },
  { name: 'Upper Body',     count: 15, rating: 4.7, gradient: 'from-blue-500/20 to-cyan-600/10' },
  { name: 'Core Workout',   count: 10, rating: 4.9, gradient: 'from-emerald-500/20 to-teal-600/10' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 28 } },
};

// ── Weekly Recap Banner ──────────────────────────────────────
function WeeklyRecapBanner() {
  const { workouts } = useFitness();
  const navigate = useNavigate();

  const now = new Date();
  const day = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((day + 6) % 7));
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const weekWorkouts = workouts.filter(w => w.completed && w.date >= weekStartStr);
  if (weekWorkouts.length < 2) return null;

  const totalVol = weekWorkouts.reduce((sum, w) =>
    sum + w.exercises.reduce((es, ex) =>
      es + ex.sets.filter(s => s.completed).reduce((ss, s) => ss + s.weight * s.reps, 0), 0), 0);
  const totalDuration = weekWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
  const daysWorked = new Set(weekWorkouts.map(w => w.date)).size;

  return (
    <motion.div
      variants={itemVariants}
      className="relative bg-surface-1 rounded-[20px] border border-primary-accent/20 overflow-hidden"
      style={{ boxShadow: '0 0 20px rgba(245,197,24,0.06)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-accent/8 to-transparent pointer-events-none" />
      <div className="relative z-10 p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary-accent/15 flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5 text-primary-accent" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold text-primary-accent uppercase tracking-widest mb-0.5">Weekly Recap</p>
          <p className="text-[13px] font-semibold text-text-1">
            {daysWorked} sessions · {totalVol >= 1000 ? `${(totalVol / 1000).toFixed(1)}k` : totalVol} kg · {totalDuration}m
          </p>
        </div>
        <button
          onClick={() => navigate('/progress')}
          className="shrink-0 flex items-center gap-1 text-[12px] font-bold text-primary-accent"
        >
          View <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Challenge Hero Card ──────────────────────────────────────
function ChallengeHeroCard() {
  const { gamification, currentPlan, workouts, getTodaysWorkout, generatePlan, startWorkout } = useFitness();
  const navigate = useNavigate();

  const { streak } = gamification;
  const todaysWorkout = getTodaysWorkout();
  const fatigue = detectFatigue(workouts);

  const joinedIds: Set<string> = (() => {
    try {
      const s = localStorage.getItem('fitai-joined-challenges');
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch { return new Set(); }
  })();

  const hasActiveChallenges = joinedIds.size > 0;

  const handleStartWorkout = () => {
    if (todaysWorkout) { startWorkout(todaysWorkout.id); navigate('/workout'); }
  };

  if (fatigue.fatigued) {
    return (
      <motion.div
        variants={itemVariants}
        className="relative bg-surface-1 rounded-[24px] p-5 overflow-hidden border border-orange-500/20"
        style={{ minHeight: 130 }}
      >
        <div className="absolute -top-6 -right-6 w-36 h-36 bg-orange-500/15 blur-[40px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Recovery Alert</span>
            </div>
            <h2 className="text-[18px] font-bold text-text-1 leading-snug mb-1">{fatigue.message}</h2>
            <p className="text-[12px] text-text-2">Consider a rest day or light stretching</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (hasActiveChallenges) {
    return (
      <motion.div
        variants={itemVariants}
        className="relative bg-surface-1 rounded-[24px] p-5 overflow-hidden border border-primary-accent/25"
        style={{ minHeight: 130, boxShadow: '0 0 24px rgba(245,197,24,0.08)' }}
      >
        <div className="absolute -top-6 -right-6 w-36 h-36 bg-primary-accent/15 blur-[40px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active Challenge</span>
            </div>
            <h2 className="text-[18px] font-bold text-text-1 leading-snug mb-1">
              {joinedIds.size} challenge{joinedIds.size > 1 ? 's' : ''} in progress
            </h2>
            <p className="text-[12px] text-text-2 mb-3">Keep going — your rivals are watching</p>
          </div>
          <button onClick={() => navigate('/challenges')} className="shrink-0 flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">View</span>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={itemVariants}
      className="relative bg-surface-1 rounded-[24px] p-5 overflow-hidden border border-border-subtle"
      style={{ minHeight: 130 }}
    >
      <div className="absolute -top-6 -right-6 w-36 h-36 bg-primary-accent/15 blur-[40px] rounded-full pointer-events-none" />
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 bg-primary-accent rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-primary-accent uppercase tracking-widest">
              {todaysWorkout ? "Today's Workout" : "Today's Challenge"}
            </span>
          </div>
          <h2 className="text-[18px] font-bold text-text-1 leading-snug mb-1">
            {todaysWorkout ? todaysWorkout.name : 'Join our Squats Challenge'}
          </h2>
          <p className="text-[12px] text-text-2 mb-3">4.5k+ athletes competing</p>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {['bg-orange-400', 'bg-blue-400', 'bg-emerald-400'].map((c, i) => (
                <div key={i} className={`w-6 h-6 rounded-full ${c} border-2 border-surface-1`} />
              ))}
            </div>
            <span className="text-[11px] text-text-3">Join them</span>
          </div>
        </div>
        <button
          id="start-workout-btn"
          onClick={todaysWorkout ? handleStartWorkout : generatePlan}
          className="shrink-0 flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-primary-accent flex items-center justify-center shadow-volt">
            <Play className="w-5 h-5 fill-canvas text-canvas ml-0.5" />
          </div>
          <span className="text-[9px] font-bold text-primary-accent uppercase tracking-wider">
            {todaysWorkout ? 'Start' : 'Build'}
          </span>
        </button>
      </div>
    </motion.div>
  );
}

// ── Interactive Step Counter ─────────────────────────────────
function StepCounter({ steps, onChange }: { steps: number; onChange: (n: number) => void }) {
  const STEP_GOAL = 10000;
  const pct = Math.min((steps / STEP_GOAL) * 100, 100);

  return (
    <div className="w-full bg-surface-1 rounded-[20px] p-5 border border-border-subtle flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
            <Footprints className="w-4 h-4 text-primary-accent" />
          </div>
          <span className="text-[13px] text-text-2 font-bold tracking-widest uppercase">Daily Steps</span>
        </div>
        <p className="text-[28px] font-extrabold text-text-1 tabular-nums leading-none">
          {steps.toLocaleString()}
        </p>
      </div>

      <div className="h-1.5 w-full bg-surface-3 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-primary-accent rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, steps - 1000))}
          className="w-10 h-10 shrink-0 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center active:scale-95 transition-transform"
        >
          <Minus className="w-4 h-4 text-text-2" />
        </button>
        <div className="flex-1 flex gap-2">
          <button
            onClick={() => onChange(steps + 500)}
            className="flex-1 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-[13px] font-bold text-text-1 active:scale-95 transition-transform"
          >
            +500
          </button>
          <button
            onClick={() => onChange(steps + 1000)}
            className="flex-1 h-10 rounded-xl bg-primary-accent/15 border border-primary-accent/30 flex items-center justify-center text-[13px] font-bold text-primary-accent active:scale-95 transition-transform"
          >
            +1k
          </button>
        </div>
        <button
          onClick={() => onChange(steps + 1000)}
          className="w-10 h-10 shrink-0 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4 text-text-2" />
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────
export default function Dashboard() {
  const {
    profile, workouts, gamification, getWeeklyStats, setStepsToday, getDailyMissions,
  } = useFitness();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const missionsRef = useRef<HTMLDivElement>(null);

  // Step counter with debounced Supabase save
  const stats = getWeeklyStats();
  const { xp, level, streak, stepsToday, stepDate, prs, achievements } = gamification;

  const today = new Date().toISOString().split('T')[0];
  const steps = stepDate === today ? stepsToday : 0;

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleStepChange = useCallback((newSteps: number) => {
    setStepsToday(newSteps);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      upsertTodaySteps(newSteps).catch(() => {/* silent */});
    }, 1000);
  }, [setStepsToday]);

  // Bell badge: count incomplete missions
  const missions = getDailyMissions();
  const incompleteMissions = missions.filter(m => !m.completed).length;

  const scrollToMissions = () => {
    missionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const currentLevelXP = xpForLevel(level);
  const nextLevelXP    = xpForNextLevel(level);
  const xpProgress     = nextLevelXP > currentLevelXP
    ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 100;
  const tier = getLevelTier(level);

  const bmr      = profile ? calculateBMR(profile.weight, profile.height, profile.age, profile.gender, profile.bodyFat) : 0;
  const calories = profile ? calculateFullCalories(bmr, profile.goal, profile.activityLevel) : null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const unlockedAchievements = achievements.filter(a => a.unlockedAt);

  return (
    <div className="min-h-screen bg-canvas pb-[100px] font-sans">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-lg md:max-w-[1080px] mx-auto md:pl-[104px] md:pr-8 space-y-5 px-4 pt-14 md:pt-10"
      >
        {/* ── 1. HEADER ───────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-text-2 tracking-wide">{greeting}</p>
            <h1 className="text-[22px] font-bold text-text-1 tracking-tight leading-tight">
              {profile?.name || 'Athlete'}
            </h1>
            <p className="text-[11px] text-text-3 mt-0.5">
              {stats.totalWorkouts} trainings done · Lv.{level} {tier.icon}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Bell — scrolls to Daily Missions, shows incomplete count */}
            <button
              id="notification-bell"
              onClick={scrollToMissions}
              className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center relative"
            >
              <Bell className="w-[18px] h-[18px] text-text-2" strokeWidth={1.8} />
              {incompleteMissions > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary-accent rounded-full border-2 border-canvas flex items-center justify-center">
                  <span className="text-[9px] font-extrabold text-canvas leading-none px-0.5">
                    {incompleteMissions}
                  </span>
                </span>
              )}
            </button>
            <button
              id="profile-avatar"
              onClick={() => navigate('/profile')}
              className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center border-2 border-primary-accent/40"
            >
              <span className="text-[15px] font-bold text-primary-accent">
                {profile?.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </button>
          </div>
        </motion.div>

        {/* ── 2. XP BAR ────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <div className="flex-1 h-12 bg-surface-1 rounded-full flex items-center px-4 gap-2 border border-border-subtle">
            <Zap className="w-4 h-4 text-primary-accent" />
            <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-accent to-accent-alt transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <span className="text-[11px] text-text-2 tabular-nums whitespace-nowrap">
              {xp} / {nextLevelXP} XP
            </span>
          </div>
          <div className="shrink-0 w-12 h-12 rounded-full bg-primary-accent flex items-center justify-center">
            <span className="text-[11px] font-extrabold text-canvas">L{level}</span>
          </div>
        </motion.div>

        {/* ── 3. RANK BADGE ────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <RankBadgeCard />
        </motion.div>

        {/* ── 4. CHALLENGE HERO ────────────────────────────────── */}
        <ChallengeHeroCard />

        {/* ── 5. WEEKLY RECAP ──────────────────────────────────── */}
        <WeeklyRecapBanner />

        {/* ── 6. QUICK STATS ROW ───────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          {/* Steps — interactive */}
          <StepCounter steps={steps} onChange={handleStepChange} />

          <div className="flex gap-3">
            {/* Streak */}
            <div className="flex-1 bg-surface-1 rounded-[20px] p-5 border border-border-subtle flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-24 bg-orange-500/10 blur-[32px] rounded-full" />
              <Flame className="w-8 h-8 text-orange-400 fill-orange-400/25 mb-1.5 relative z-10" />
              <div className="text-center relative z-10 block">
                <span className="text-[32px] font-extrabold text-text-1 tabular-nums leading-none block">{streak}</span>
                <span className="text-[12px] font-medium text-text-2 mt-1 block">day streak</span>
              </div>
            </div>

            {/* Calories */}
            <div className="flex-1 bg-surface-1 rounded-[20px] p-5 border border-border-subtle flex flex-col justify-between items-center relative overflow-hidden">
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary-accent/15 blur-[28px] rounded-full pointer-events-none" />
              <div className="w-full flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-primary-accent" />
                </div>
                <span className="text-[10px] font-bold text-primary-accent uppercase tracking-widest bg-primary-accent/10 px-2 py-1 rounded-full">Target</span>
              </div>
              <div className="w-full text-left mt-1 relative z-10">
                <p className="text-[32px] font-extrabold text-text-1 tabular-nums leading-none tracking-tight">{calories?.target ?? '—'}</p>
                <span className="text-[14px] text-text-3 font-semibold mt-1 block">kcal / day</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── 7. CATEGORY FILTERS ──────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                id={`cat-${cat.toLowerCase()}`}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-primary-accent text-canvas shadow-volt'
                    : 'bg-surface-1 text-text-2 border border-border-subtle hover:border-primary-accent/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── 8. POPULAR EXERCISES ─────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-bold text-text-1">Popular exercises</h3>
            <button
              onClick={() => navigate('/exercises')}
              className="flex items-center gap-1 text-[13px] font-semibold text-primary-accent"
            >
              See all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            {EXERCISE_CARDS.map((card) => (
              <motion.button
                key={card.name}
                onClick={() => navigate('/exercises')}
                className="shrink-0 w-[158px] bg-surface-1 rounded-[20px] p-4 border border-border-subtle flex flex-col justify-between overflow-hidden relative"
                style={{ minHeight: 172 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
                <div className="relative z-10">
                  <h4 className="text-[14px] font-bold text-text-1 leading-snug">{card.name}</h4>
                  <p className="text-[11px] text-text-2 mt-0.5">{card.count} exercises</p>
                </div>
                <div className="relative z-10 flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-primary-accent text-primary-accent" />
                    <span className="text-[12px] font-bold text-primary-accent tabular-nums">{card.rating}</span>
                  </div>
                  <span className="text-[10px] text-canvas font-bold bg-primary-accent px-2.5 py-1 rounded-full">Start</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── 9. THIS WEEK STATS ───────────────────────────────── */}
        <motion.div variants={itemVariants} className="bg-surface-1 rounded-[20px] border border-border-subtle">
          <div className="flex items-center justify-between px-4 pt-4 mb-3">
            <h3 className="text-[14px] font-bold text-text-1">This Week</h3>
            <span className="text-[11px] text-text-3">7-day summary</span>
          </div>
          <div className="flex divide-x divide-border-subtle">
            {[
              { label: 'Workouts', value: stats.totalWorkouts,  unit: '',    icon: Dumbbell },
              { label: 'Volume',   value: `${(stats.totalVolume / 1000).toFixed(1)}k`, unit: 'kg', icon: TrendingUp },
              { label: 'Duration', value: stats.totalDuration,  unit: 'min', icon: Footprints },
            ].map(({ label, value, unit, icon: Icon }) => (
              <div key={label} className="flex-1 flex flex-col items-center py-4 gap-1">
                <Icon className="w-4 h-4 text-text-3 mb-1" />
                <span className="text-[22px] font-extrabold text-text-1 tabular-nums leading-none">{value}</span>
                {unit && <span className="text-[9px] text-text-3 uppercase tracking-widest">{unit}</span>}
                <span className="text-[10px] text-text-3 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── 10. DAILY MISSIONS ───────────────────────────────── */}
        <motion.div variants={itemVariants} ref={missionsRef}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[14px] font-bold text-text-1">Daily Missions</h3>
            <span className="text-[11px] text-text-3">
              {(() => {
                const now = new Date();
                const hoursLeft = 23 - now.getHours();
                const minsLeft = 59 - now.getMinutes();
                return hoursLeft > 0 ? `${hoursLeft}h left` : `${minsLeft}m left`;
              })()}
            </span>
          </div>
          <DailyMissions />
        </motion.div>

        {/* ── 11. PERSONAL RECORDS ─────────────────────────────── */}
        {prs.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[14px] font-bold text-text-1">Personal Records</h3>
              <button className="flex items-center gap-0.5 text-[13px] font-semibold text-primary-accent">
                See all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
              {prs.slice(-6).reverse().map((pr, i) => (
                <div
                  key={`${pr.exerciseId}-${pr.type}-${i}`}
                  className="shrink-0 bg-surface-1 border border-border-subtle rounded-[20px] p-4 w-[120px]"
                >
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-3 inline-block ${
                    pr.type === 'weight' ? 'bg-primary-accent/15 text-primary-accent'
                    : pr.type === 'reps' ? 'bg-blue-500/15 text-blue-400'
                    : 'bg-emerald-500/15 text-emerald-400'
                  }`}>
                    {pr.type}
                  </span>
                  <p className="text-[11px] text-text-2 font-medium mb-1 truncate">{pr.exerciseName}</p>
                  <p className="text-[20px] font-extrabold text-text-1 tabular-nums leading-none">
                    {pr.value}
                    <span className="text-[10px] text-text-3 ml-0.5">
                      {pr.type === 'weight' ? 'kg' : pr.type === 'reps' ? 'rx' : 'kg'}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── 12. ACHIEVEMENTS ─────────────────────────────────── */}
        {unlockedAchievements.length > 0 && (
          <motion.div variants={itemVariants} className="pb-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[14px] font-bold text-text-1">Achievements</h3>
              <button onClick={() => navigate('/achievements')} className="text-[11px] text-text-3 font-semibold">
                {unlockedAchievements.length}/45
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
              {unlockedAchievements.slice(0, 8).map(a => (
                <div key={a.id} className="shrink-0 w-[54px] h-[54px] rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center text-xl">
                  {a.icon}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      <BottomNav />
    </div>
  );
}

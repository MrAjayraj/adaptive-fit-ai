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
import { motion, useScroll, useTransform } from 'framer-motion';
import { upsertTodaySteps } from '@/services/api';

const CATEGORIES = ['All', 'Chest', 'Arms', 'Back', 'Legs', 'Shoulders', 'Core'];

const EXERCISE_CARDS = [
  { name: 'Chest Day Mass', count: 6, rating: 4.9, gradient: 'from-[#E2FF31]/20 to-transparent', bento: 'col-span-2 row-span-2' },
  { name: 'Arm Blaster',    count: 4,  rating: 4.8, gradient: 'from-[#FFB800]/20 to-transparent', bento: 'col-span-1 row-span-1' },
  { name: 'Core Crusher',   count: 5, rating: 4.7, gradient: 'from-blue-500/20 to-transparent', bento: 'col-span-1 row-span-1' },
];

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

// ── Shared Glass Container ──────────────────────────────────────
function GlassCard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div
      variants={itemVariants}
      whileInView={{ scale: 0.98 }}
      viewport={{ margin: "-100px", once: false, amount: "some" }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`rounded-2xl border border-white/10 relative overflow-hidden backdrop-blur-[15px] saturate-[180%] ${className}`}
      style={{
        background: 'rgba(20, 20, 20, 0.6)',
        ...style
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Magnetic Button ──────────────────────────────────────────────
function MagneticButton({ children, onClick, className = '', style = {} }: { children: React.ReactNode, onClick?: () => void, className?: string, style?: React.CSSProperties }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 } as any}
      className={className}
      style={style}
    >
      {children}
    </motion.button>
  );
}

// ── Weekly Recap Banner ──────────────────────────────────────
function WeeklyRecapBanner({ onNavigate }: { onNavigate: () => void }) {
  const { workouts } = useFitness();

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
    <GlassCard className="p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-[#E2FF31]/10 flex items-center justify-center shrink-0 border border-[#E2FF31]/20 shadow-[0_0_15px_rgba(226,255,49,0.1)]">
        <CalendarDays className="w-5 h-5 text-[#E2FF31]" />
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-bold text-[#E2FF31] uppercase tracking-widest mb-0.5">Weekly Recap</p>
        <p className="text-[13px] font-semibold text-white">
          {daysWorked} sessions · {totalVol >= 1000 ? `${(totalVol / 1000).toFixed(1)}k` : totalVol} kg · {totalDuration}m
        </p>
      </div>
      <MagneticButton
        onClick={onNavigate}
        className="shrink-0 flex items-center gap-1 text-[12px] font-bold text-[#E2FF31]"
      >
        View <ChevronRight className="w-3.5 h-3.5" />
      </MagneticButton>
    </GlassCard>
  );
}

// ── Seasonal Rank Card ───────────────────────────────────────
function EnhancedRankCard({ gamification, onClick }: { gamification: any, onClick: () => void }) {
  const { xp, level } = gamification;
  const currentXP = xpForLevel(level);
  const nextXP = xpForNextLevel(level);
  const progress = Math.min(((xp - currentXP) / (nextXP - currentXP)) * 100, 100);
  const tier = getLevelTier(level);

  return (
    <GlassCard className="p-5 flex flex-col gap-4 cursor-pointer" style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.4)' }}>
      <div onClick={onClick} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            {/* Metallic Badge using conic gradient */}
            <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-white/20 shadow-[inset_0_2px_10px_rgba(255,255,255,0.2),0_0_20px_rgba(0,0,0,0.5)]"
                 style={{ background: `conic-gradient(from 180deg at 50% 50%, #4a4a4a 0deg, #b0b0b0 90deg, #ffffff 180deg, #b0b0b0 270deg, #4a4a4a 360deg)` }}>
              <div className="w-12 h-12 rounded-full bg-black/80 flex items-center justify-center backdrop-blur-md border border-white/10 text-xl">
                {tier.icon}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#E2FF31] text-black font-black text-[10px] flex items-center justify-center border-2 border-black/80 shadow-[0_0_10px_rgba(226,255,49,0.5)]">
              {level}
            </div>
          </div>
          <div>
            <h3 className="text-white font-black text-lg tracking-tight uppercase" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {tier.tier} Tier
            </h3>
            <p className="text-white/50 font-semibold text-[11px] uppercase tracking-widest">Elite Status</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/30" />
      </div>

      {/* Liquid Fill Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-end">
          <span className="text-[#FFB800] text-[10px] uppercase font-bold tracking-widest">Season Progress</span>
          <span className="text-white font-black tabular-nums text-sm">{xp} <span className="text-white/40 text-[10px]">/ {nextXP} XP</span></span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.2 }}
            className="h-full relative rounded-full"
            style={{
              background: 'linear-gradient(90deg, #FFB800, #FFE173)',
              boxShadow: '0 0 10px rgba(255,184,0,0.6)'
            }}
          >
            {/* Liquid shimmer overlay */}
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"
            />
          </motion.div>
        </div>
      </div>
    </GlassCard>
  );
}

// ── Interactive Counters ─────────────────────────────────
function MetricCounters({ steps, onStepChange, calories }: { steps: number; onStepChange: (n: number) => void; calories: any }) {
  const stepTarget = 10000;
  return (
    <div className="flex gap-4">
      {/* Steps Block */}
      <GlassCard className="flex-1 p-5 isolate">
        <div className="absolute -top-4 -left-4 w-20 h-20 bg-[#FFB800]/10 blur-[20px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-[#FFB800]/10 border border-[#FFB800]/20 flex items-center justify-center">
            <Footprints className="w-3.5 h-3.5 text-[#FFB800]" />
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">Daily Steps</span>
        </div>
        <div className="flex items-end justify-between mt-2">
          <span className="text-3xl font-black text-white tabular-nums tracking-tighter" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            {steps.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-4">
          <MagneticButton onClick={() => onStepChange(Math.max(0, steps - 500))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors shadow-[inset_0_-2px_4px_rgba(0,0,0,0.4)]">
            <Minus className="w-4 h-4" />
          </MagneticButton>
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden shadow-inner">
            <div className="h-full bg-[#FFB800] w-full" style={{ width: `${Math.min((steps / stepTarget) * 100, 100)}%`, boxShadow: '0 0 10px rgba(255,184,0,0.5)' }} />
          </div>
          <MagneticButton onClick={() => onStepChange(steps + 500)} className="w-10 h-10 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 flex items-center justify-center text-[#FFB800] hover:border-[#FFB800]/50 transition-colors shadow-[0_4px_10px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <Plus className="w-4 h-4" />
          </MagneticButton>
        </div>
      </GlassCard>

      {/* Calories Block */}
      <GlassCard className="w-[140px] shrink-0 p-5 flex flex-col justify-between">
        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-[#E2FF31]/10 blur-[20px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E2FF31]/10 border border-[#E2FF31]/20 flex items-center justify-center">
             <Flame className="w-3.5 h-3.5 text-[#E2FF31]" />
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">Target</span>
        </div>
        <div className="mt-4">
          <span className="text-3xl font-black text-white tabular-nums tracking-tighter block">{calories?.target ?? '—'}</span>
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">kcal</span>
        </div>
      </GlassCard>
    </div>
  );
}

// ── Bento Grid Workouts ─────────────────────────────────
function WorkoutBento() {
  const navigate = useNavigate();

  return (
    <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 auto-rows-[120px]">
      {EXERCISE_CARDS.map((card, i) => (
        <MagneticButton
          key={card.name}
          onClick={() => navigate('/exercises')}
          className={`text-left relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-md ${card.bento} group shadow-[0_8px_30px_rgba(0,0,0,0.4)]`}
          style={{ background: 'rgba(20,20,20,0.6)' }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 transition-opacity group-hover:opacity-80`} />
          <div className="relative z-10 p-5 h-full flex flex-col justify-between">
            <div>
               <h4 className="text-lg font-black text-white tracking-tight uppercase" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                 {card.name}
               </h4>
               <p className="text-xs font-semibold text-white/60 tracking-wider">
                 {card.count} EXERCISES
               </p>
            </div>
            <div className="flex items-center justify-between">
               <div className="flex bg-black/40 backdrop-blur border border-white/10 px-2 py-1 rounded-full items-center gap-1">
                 <Star className="w-3 h-3 text-[#FFB800] fill-[#FFB800]" />
                 <span className="text-[10px] font-bold text-white max-w-[200px] tabular-nums">{card.rating}</span>
               </div>
               {i === 0 && (
                 <div className="w-12 h-12 rounded-full bg-[#E2FF31] text-black flex items-center justify-center transform transition-transform group-hover:scale-110 shadow-[0_0_20px_rgba(226,255,49,0.4)]">
                   <Play className="w-5 h-5 ml-1 fill-black" />
                 </div>
               )}
            </div>
          </div>
        </MagneticButton>
      ))}
    </motion.div>
  );
}


// ── Main Dashboard ───────────────────────────────────────────
export default function Dashboard() {
  const {
    profile, workouts, gamification, getWeeklyStats, setStepsToday, getDailyMissions,
  } = useFitness();
  const navigate = useNavigate();
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

  const missions = getDailyMissions();
  const incompleteMissions = missions.filter(m => !m.completed).length;

  const scrollToMissions = () => {
    missionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const bmr = profile ? calculateBMR(profile.weight, profile.height, profile.age, profile.gender, profile.bodyFat) : 0;
  const calories = profile ? calculateFullCalories(bmr, profile.goal, profile.activityLevel) : null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const CustomFlameIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#FFB800]">
      <motion.path
        animate={{
          d: [
            "M12 2C12 2 7 9 7 14C7 16.7614 9.23858 19 12 19C14.7614 19 17 16.7614 17 14C17 9 12 2 12 2Z",
            "M12 1C12 1 6 8.5 7 14C7 16.7614 9.23858 20 12 20C14.7614 20 17.5 16.7614 17 14C17 9 12 1 12 1Z",
            "M12 2C12 2 7 9 7 14C7 16.7614 9.23858 19 12 19C14.7614 19 17 16.7614 17 14C17 9 12 2 12 2Z"
          ]
        }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        fill="currentColor"
      />
      <motion.path
        animate={{
          d: [
            "M12 10C12 10 9.5 13 10.5 16C10.5 16 11 15 12 14.5C13 15 13.5 16 13.5 16C14.5 13 12 10 12 10Z",
            "M12 11C12 11 10 14 11 17C11 17 11.5 16 12 15.5C12.5 16 13 17 13 17C14 14 12 11 12 11Z",
            "M12 10C12 10 9.5 13 10.5 16C10.5 16 11 15 12 14.5C13 15 13.5 16 13.5 16C14.5 13 12 10 12 10Z"
          ]
        }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.2 }}
        fill="#FFE173"
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#050505] pb-[100px] font-sans overflow-x-hidden selection:bg-[#E2FF31]/30">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-lg md:max-w-[1080px] mx-auto md:pl-[104px] md:pr-8 space-y-6 px-4 pt-14 md:pt-10 tracking-[-0.02em]"
      >
        {/* ── 1. DYNAMIC HEADER ───────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex items-start justify-between">
          <div className="flex gap-4">
            <MagneticButton onClick={() => navigate('/profile')} className="relative">
              <div className="w-14 h-14 rounded-full bg-white/5 border-2 border-[#E2FF31] flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(226,255,49,0.3)]">
                <span className="text-xl font-black text-[#E2FF31]">{profile?.name?.charAt(0)?.toUpperCase() || 'A'}</span>
              </div>
            </MagneticButton>
            <div>
              <p className="text-[12px] font-bold text-white/50 tracking-wider uppercase mb-0.5">{greeting}</p>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none uppercase">
                {profile?.name || 'Athlete'}
              </h1>
              {/* Level Bar Pulse */}
              <div className="flex items-center gap-2 mt-2">
                <div className="w-3 h-3 rounded-full bg-[#E2FF31] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] shadow-[0_0_10px_rgba(226,255,49,0.8)]" />
                <span className="text-[11px] font-bold text-[#E2FF31] uppercase tracking-widest">
                  Level {level} Active
                </span>
              </div>
            </div>
          </div>
          <MagneticButton
            onClick={scrollToMissions}
            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative shadow-[0_4px_10px_rgba(0,0,0,0.3)] backdrop-blur-md"
          >
            <Bell className="w-5 h-5 text-white/80" strokeWidth={2} />
            {incompleteMissions > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-[#FFB800] rounded-full border-2 border-[#050505] flex items-center justify-center shadow-[0_0_10px_rgba(255,184,0,0.5)]">
                <span className="text-[8px] font-black text-black leading-none">{incompleteMissions}</span>
              </span>
            )}
          </MagneticButton>
        </motion.div>

        {/* ── 2. RANK BADGE CARD ────────────────────────────────────── */}
        <EnhancedRankCard gamification={gamification} onClick={() => navigate('/rank')} />

        {/* ── 3. WORKOUT BENTO GRID ────────────────────────────────── */}
        <WorkoutBento />

        {/* ── 4. TACTILE METRICS ───────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4">
          <MetricCounters steps={steps} onStepChange={handleStepChange} calories={calories} />

          {/* Streak Banner with Flickering Flame */}
          <GlassCard className="p-5 flex items-center justify-between overflow-hidden">
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-40 h-40 bg-[#FFB800]/10 blur-[40px] pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                <CustomFlameIcon />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white/50 tracking-widest uppercase mb-1">Consistency</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white tabular-nums tracking-tighter" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{streak}</span>
                  <span className="text-sm font-bold text-white/40 uppercase">Days</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="bg-white/10 text-white/80 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase border border-white/10">Fire</span>
            </div>
          </GlassCard>
        </motion.div>

        {/* ── 5. WEEKLY RECAP ──────────────────────────────────── */}
        <WeeklyRecapBanner onNavigate={() => navigate('/progress')} />

        {/* ── 6. DAILY MISSIONS ───────────────────────────────── */}
        <motion.div variants={itemVariants} ref={missionsRef} className="pb-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Missions</h3>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2">
             <DailyMissions />
          </div>
        </motion.div>

      </motion.div>

      <BottomNav />
    </div>
  );
}

import { useState } from 'react';
import { useFitness } from '@/context/FitnessContext';
import BottomNav from '@/components/layout/BottomNav';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, Dumbbell, Calendar, Trophy, ChevronRight,
  Medal, BarChart3, Activity, Flame, Footprints, Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';

const PERIODS = ['Daily', 'Weekly', 'Monthly'];
const WORKOUT_TYPES = ['All types', 'Full body', 'Upper', 'Lower', 'Core'];

const FIND_WORKOUTS = [
  {
    name: 'Upper Body',
    sub: 'Shoulders, biceps, triceps',
    duration: '30 min',
    kcal: '140–300 kcal',
    color: 'from-orange-500/20 to-amber-600/5',
  },
  {
    name: 'Stretching',
    sub: 'Full body flexibility',
    duration: '25 min',
    kcal: '80–140 kcal',
    color: 'from-violet-500/20 to-purple-600/5',
  },
  {
    name: 'Core Blast',
    sub: 'Abs, obliques, lower back',
    duration: '20 min',
    kcal: '100–220 kcal',
    color: 'from-blue-500/20 to-cyan-600/5',
  },
  {
    name: 'Leg Day',
    sub: 'Quads, hamstrings, glutes',
    duration: '35 min',
    kcal: '200–380 kcal',
    color: 'from-emerald-500/20 to-teal-600/5',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};

export default function Progress() {
  const { workouts, progressHistory, getWeeklyStats, gamification, getTotalVolume } = useFitness();
  const stats       = getWeeklyStats();
  const totalVolume = getTotalVolume();
  const [period, setPeriod]           = useState('Daily');
  const [workoutType, setWorkoutType] = useState('All types');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const { prs } = gamification;
  const isEmpty  = workouts.length === 0;

  // ── Derived chart data ─────────────────────────────────────────
  const volumeData = workouts.slice(-10).map(w => ({
    name: new Date(w.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    volume: Math.round(
      w.exercises.reduce((sum, ex) =>
        sum + ex.sets.filter(s => s.completed).reduce((s2, set) => s2 + set.weight * set.reps, 0), 0
      )
    ),
  }));

  const muscleData = Object.entries(stats.muscleGroupBreakdown)
    .filter(([_, v]) => v > 0)
    .map(([muscle, volume]) => ({
      name: muscle.charAt(0).toUpperCase() + muscle.slice(1),
      volume: Math.round(volume as number),
    }))
    .sort((a, b) => b.volume - a.volume);

  const exerciseMap = new Map<string, { name: string; entries: typeof progressHistory }>();
  for (const entry of progressHistory) {
    if (!exerciseMap.has(entry.exerciseId)) {
      exerciseMap.set(entry.exerciseId, { name: entry.exerciseName, entries: [] });
    }
    exerciseMap.get(entry.exerciseId)!.entries.push(entry);
  }

  const exerciseList = [...exerciseMap.entries()].map(([id, data]) => {
    const first = data.entries[0];
    const last  = data.entries[data.entries.length - 1];
    const improvement = data.entries.length >= 2 && first.totalVolume > 0
      ? ((last.totalVolume - first.totalVolume) / first.totalVolume) * 100 : 0;
    return { id, name: data.name, improvement: Math.round(improvement), lastWeight: last.bestSet.weight, entries: data.entries };
  }).sort((a, b) => b.improvement - a.improvement);

  const selectedData     = selectedExercise ? exerciseMap.get(selectedExercise) : null;
  const exerciseChartData = selectedData?.entries.map(e => ({
    name: new Date(e.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    weight: e.bestSet.weight,
    volume: Math.round(e.totalVolume),
  })) || [];

  // Calorie goal progress (dummy if no real data)
  const calorieProgress = Math.min((stats.totalWorkouts / 7) * 100, 100);
  const avgSteps = 1800;

  return (
    <div className="min-h-screen bg-canvas pb-[100px] font-sans">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full max-w-lg md:max-w-[1080px] mx-auto md:pl-[104px] md:pr-8">

        {/* ── HEADER ───────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="px-5 pt-14 pb-4 flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-text-1 tracking-tight">Progress</h1>
          <button className="w-10 h-10 rounded-full bg-surface-1 border border-border-subtle flex items-center justify-center">
            <span className="text-text-2 text-sm">···</span>
          </button>
        </motion.div>

        {/* ── PERIOD TOGGLE ─────────────────────────────────── */}
        <motion.div variants={itemVariants} className="px-5 mb-5">
          <div className="flex bg-surface-1 rounded-full p-1 border border-border-subtle gap-1">
            {PERIODS.map(p => (
              <button
                key={p}
                id={`period-${p.toLowerCase()}`}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200 ${
                  period === p
                    ? 'bg-primary-accent text-canvas shadow-volt'
                    : 'text-text-2 hover:text-text-1'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </motion.div>

        {isEmpty ? (
          <motion.div variants={itemVariants} className="px-5 flex flex-col items-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-5">
              <TrendingUp className="w-8 h-8 text-text-3" />
            </div>
            <h2 className="text-[18px] font-bold text-text-1 mb-2">No Data Yet</h2>
            <p className="text-text-2 text-[14px] max-w-[240px]">Complete workouts to see your progress, PRs, and exercise trends.</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* ── MAIN STATS: Circle + Side Cards ─────────────── */}
            <motion.div variants={itemVariants} className="px-5 md:px-0">
              <div className="flex gap-4 items-center">
                {/* Circular ring */}
                <div className="relative w-[140px] h-[140px] shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#252529" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="50"
                      fill="none"
                      stroke="#F5C518"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${calorieProgress * 3.14} ${314 - calorieProgress * 3.14}`}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[26px] font-extrabold text-text-1 tabular-nums leading-none">
                      {Math.round(calorieProgress)}%
                    </span>
                    <span className="text-[10px] text-text-2 mt-0.5">Average</span>
                    <span className="text-[11px] text-primary-accent font-semibold">{avgSteps}</span>
                  </div>
                </div>

                {/* Side stats */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="bg-surface-1 rounded-[16px] p-3 border border-border-subtle">
                    <div className="flex items-center gap-2 mb-1">
                      <Footprints className="w-4 h-4 text-text-2" />
                      <span className="text-[11px] text-text-3">Step (km)</span>
                    </div>
                    <p className="text-[18px] font-extrabold text-text-1 tabular-nums leading-none">
                      {stats.totalWorkouts}
                      <span className="text-[11px] text-text-3 font-normal ml-1">sessions</span>
                    </p>
                  </div>
                  <div className="bg-surface-1 rounded-[16px] p-3 border border-border-subtle">
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="text-[11px] text-text-3">Calories</span>
                    </div>
                    <p className="text-[18px] font-extrabold text-text-1 tabular-nums leading-none">
                      {(totalVolume / 10).toFixed(0)}
                      <span className="text-[11px] text-text-3 font-normal ml-1">Cal</span>
                    </p>
                  </div>
                  <div className="bg-surface-1 rounded-[16px] p-3 border border-border-subtle">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-primary-accent" />
                      <span className="text-[11px] text-text-3">Weight</span>
                    </div>
                    <p className="text-[18px] font-extrabold text-text-1 tabular-nums leading-none">
                      {(totalVolume / 1000).toFixed(1)}k
                      <span className="text-[11px] text-text-3 font-normal ml-1">kg vol</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── VOLUME CHART ─────────────────────────────────── */}
            {volumeData.length > 1 && (
              <motion.div variants={itemVariants} className="px-5 md:px-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px] font-bold text-text-1">Volume Trend</h3>
                  <Activity className="w-4 h-4 text-text-3" />
                </div>
                <div className="bg-surface-1 p-4 rounded-[20px] border border-border-subtle">
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={volumeData}>
                      <defs>
                        <linearGradient id="voltGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#F5C518" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#F5C518" stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fill: '#565660', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={8} />
                      <YAxis tick={{ fill: '#565660', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={8} width={36} />
                      <Tooltip
                        contentStyle={{ background: '#252529', border: 'none', borderRadius: 12, color: '#FAFAFA', fontSize: 12 }}
                        itemStyle={{ color: '#F5C518' }}
                      />
                      <Area type="monotone" dataKey="volume" stroke="#F5C518" fill="url(#voltGrad)" strokeWidth={2.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
            </div>

            {/* ── FIND YOUR WORKOUT ─────────────────────────── */}
            <motion.div variants={itemVariants} className="px-5">
              <h3 className="text-[15px] font-bold text-text-1 mb-3">Find your workout</h3>
              {/* Type filters */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
                {WORKOUT_TYPES.map(t => (
                  <button
                    key={t}
                    id={`wtype-${t.toLowerCase().replace(/\s/g, '-')}`}
                    onClick={() => setWorkoutType(t)}
                    className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-200 ${
                      workoutType === t
                        ? 'bg-primary-accent text-canvas shadow-volt'
                        : 'bg-surface-1 text-text-2 border border-border-subtle'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {/* Workout cards */}
              <div className="flex flex-col gap-3">
                {FIND_WORKOUTS.map(w => (
                  <motion.div
                    key={w.name}
                    className={`relative bg-surface-1 rounded-[20px] p-4 border border-border-subtle overflow-hidden flex items-center gap-4`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${w.color} pointer-events-none`} />
                    <div className="flex-1 relative z-10">
                      <h4 className="text-[16px] font-bold text-text-1 leading-snug">{w.name}</h4>
                      <p className="text-[12px] text-text-2 mb-2">{w.sub}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-text-3" />
                          <span className="text-[11px] text-text-2">{w.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-text-3" />
                          <span className="text-[11px] text-text-2">{w.kcal}</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 w-14 h-14 rounded-full bg-primary-accent/15 border border-primary-accent/30 flex items-center justify-center relative z-10">
                      <Dumbbell className="w-6 h-6 text-primary-accent" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* ── PERSONAL RECORDS ─────────────────────────── */}
            {prs.length > 0 && (
              <motion.div variants={itemVariants} className="px-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px] font-bold text-text-1">Personal Records</h3>
                  <Trophy className="w-4 h-4 text-primary-accent" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {prs.filter(p => p.type === 'weight').slice(0, 4).map((pr, i) => (
                    <div key={`${pr.exerciseId}-${i}`} className="bg-surface-1 p-4 rounded-[18px] border border-border-subtle relative overflow-hidden">
                      <div className="absolute -top-3 -right-3 w-16 h-16 bg-primary-accent/10 rounded-full pointer-events-none" />
                      <Medal className="w-4 h-4 text-primary-accent mb-2" />
                      <p className="text-[11px] text-text-2 truncate font-medium mb-1">{pr.exerciseName}</p>
                      <p className="text-[24px] font-extrabold text-text-1 tabular-nums leading-none">
                        {pr.value}
                        <span className="text-[13px] text-text-3 font-medium ml-1">kg</span>
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── EXERCISE PROGRESSION ─────────────────────── */}
            <motion.div variants={itemVariants} className="px-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-bold text-text-1">
                  <TrendingUp className="w-4 h-4 inline mr-1.5 text-primary-accent" />
                  Exercise Progress
                </h3>
              </div>
              {/* Exercise chips */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
                {exerciseList.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => setSelectedExercise(selectedExercise === ex.id ? null : ex.id)}
                    className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-all ${
                      selectedExercise === ex.id
                        ? 'bg-primary-accent text-canvas'
                        : 'bg-surface-1 text-text-2 border border-border-subtle'
                    }`}
                  >
                    {ex.name.split(' ').slice(0, 2).join(' ')}
                  </button>
                ))}
              </div>

              {/* Chart */}
              {selectedExercise && exerciseChartData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-1 p-4 rounded-[20px] mb-3 border border-border-subtle"
                >
                  <p className="text-[12px] text-text-2 mb-3 font-medium">Weight progression (kg)</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={exerciseChartData}>
                      <XAxis dataKey="name" tick={{ fill: '#565660', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={8} />
                      <YAxis tick={{ fill: '#565660', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={8} width={30} />
                      <Tooltip
                        contentStyle={{ background: '#252529', border: 'none', borderRadius: 12, color: '#FAFAFA', fontSize: 12 }}
                        itemStyle={{ color: '#F5C518' }}
                      />
                      <Line type="monotone" dataKey="weight" stroke="#F5C518" strokeWidth={2.5}
                        dot={{ fill: '#F5C518', stroke: '#111113', strokeWidth: 2, r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Exercise list */}
              <div className="flex flex-col gap-2">
                {exerciseList.slice(0, 5).map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => setSelectedExercise(selectedExercise === ex.id ? null : ex.id)}
                    className={`flex items-center justify-between p-4 rounded-[16px] border transition-all ${
                      selectedExercise === ex.id
                        ? 'bg-surface-2 border-primary-accent/30'
                        : 'bg-surface-1 border-border-subtle hover:border-primary-accent/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedExercise === ex.id ? 'bg-primary-accent' : 'bg-surface-3'
                      }`}>
                        <Dumbbell className={`w-4 h-4 ${selectedExercise === ex.id ? 'text-canvas' : 'text-text-2'}`} />
                      </div>
                      <div className="text-left">
                        <p className="text-[14px] font-semibold text-text-1">{ex.name}</p>
                        <p className="text-[11px] text-text-3">
                          Best: {ex.lastWeight}kg
                          {ex.improvement !== 0 && (
                            <span className={ex.improvement > 0 ? ' text-primary-accent ml-2' : ' text-red-400 ml-2'}>
                              {ex.improvement > 0 ? '+' : ''}{ex.improvement}%
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedExercise === ex.id ? 'text-primary-accent rotate-90' : 'text-text-3'}`} />
                  </button>
                ))}
              </div>
            </motion.div>

            {/* ── MUSCLE BREAKDOWN ─────────────────────────── */}
            {muscleData.length > 0 && (
              <motion.div variants={itemVariants} className="px-5 pb-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px] font-bold text-text-1">
                    <BarChart3 className="w-4 h-4 inline mr-1.5 text-text-2" />
                    Muscle Focus
                  </h3>
                </div>
                <div className="bg-surface-1 p-4 rounded-[20px] border border-border-subtle">
                  <ResponsiveContainer width="100%" height={Math.max(180, muscleData.length * 36)}>
                    <BarChart data={muscleData} layout="vertical" barSize={10}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#8A8A90', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={76} />
                      <Tooltip
                        cursor={{ fill: 'rgba(245,197,24,0.04)' }}
                        contentStyle={{ background: '#252529', border: 'none', borderRadius: 12, color: '#FAFAFA', fontSize: 12 }}
                        itemStyle={{ color: '#F5C518' }}
                      />
                      <Bar dataKey="volume" fill="#F5C518" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

          </div>
        )}
      </motion.div>
      <BottomNav />
    </div>
  );
}

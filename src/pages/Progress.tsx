import { useState } from 'react';
import { useFitness } from '@/context/FitnessContext';
import BottomNav from '@/components/layout/BottomNav';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line } from 'recharts';
import { TrendingUp, Dumbbell, Calendar, Trophy, ChevronRight, Medal } from 'lucide-react';

export default function Progress() {
  const { workouts, progressHistory, getWeeklyStats, gamification, getTotalVolume } = useFitness();
  const stats = getWeeklyStats();
  const totalVolume = getTotalVolume();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  // Volume over time (last 10 workouts)
  const volumeData = workouts.slice(-10).map(w => {
    const vol = w.exercises.reduce((sum, ex) =>
      sum + ex.sets.filter(s => s.completed).reduce((s2, set) => s2 + set.weight * set.reps, 0), 0
    );
    return {
      name: new Date(w.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      volume: Math.round(vol),
    };
  });

  // Muscle group breakdown
  const muscleData = Object.entries(stats.muscleGroupBreakdown)
    .filter(([_, v]) => v > 0)
    .map(([muscle, volume]) => ({
      name: muscle.charAt(0).toUpperCase() + muscle.slice(1),
      volume: Math.round(volume),
    }))
    .sort((a, b) => b.volume - a.volume);

  // Unique exercises with history
  const exerciseMap = new Map<string, { name: string; entries: typeof progressHistory }>();
  for (const entry of progressHistory) {
    if (!exerciseMap.has(entry.exerciseId)) {
      exerciseMap.set(entry.exerciseId, { name: entry.exerciseName, entries: [] });
    }
    exerciseMap.get(entry.exerciseId)!.entries.push(entry);
  }

  // Top exercises by improvement
  const exerciseList = [...exerciseMap.entries()].map(([id, data]) => {
    const first = data.entries[0];
    const last = data.entries[data.entries.length - 1];
    const improvement = data.entries.length >= 2 && first.totalVolume > 0
      ? ((last.totalVolume - first.totalVolume) / first.totalVolume) * 100
      : 0;
    return { id, name: data.name, improvement: Math.round(improvement), lastWeight: last.bestSet.weight, entries: data.entries };
  }).sort((a, b) => b.improvement - a.improvement);

  // Selected exercise chart data
  const selectedData = selectedExercise ? exerciseMap.get(selectedExercise) : null;
  const exerciseChartData = selectedData?.entries.map(e => ({
    name: new Date(e.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    weight: e.bestSet.weight,
    volume: Math.round(e.totalVolume),
    reps: e.bestSet.reps,
  })) || [];

  // PRs for display
  const { prs } = gamification;
  const weightPRs = prs.filter(p => p.type === 'weight');

  const isEmpty = workouts.length === 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Progress</h1>
        <p className="text-sm text-muted-foreground">Track your gains & PRs</p>
      </div>

      {isEmpty ? (
        <div className="px-5 flex flex-col items-center justify-center py-20 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-display font-bold text-foreground mb-2">No Data Yet</h2>
          <p className="text-muted-foreground text-sm">Complete workouts to see your progress charts, PRs, and exercise trends.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="px-5 grid grid-cols-3 gap-2 mb-6">
            <div className="glass-card p-3 text-center">
              <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-display font-bold text-foreground">{workouts.length}</p>
              <p className="text-[10px] text-muted-foreground">Workouts</p>
            </div>
            <div className="glass-card p-3 text-center">
              <Dumbbell className="w-4 h-4 text-accent mx-auto mb-1" />
              <p className="text-lg font-display font-bold text-foreground">
                {(totalVolume / 1000).toFixed(0)}k
              </p>
              <p className="text-[10px] text-muted-foreground">Total Vol (kg)</p>
            </div>
            <div className="glass-card p-3 text-center">
              <Trophy className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-display font-bold text-foreground">{prs.length}</p>
              <p className="text-[10px] text-muted-foreground">PRs Set</p>
            </div>
          </div>

          {/* Volume Chart */}
          {volumeData.length > 1 && (
            <div className="px-5 mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Volume Trend</h3>
              <div className="glass-card p-4">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={volumeData}>
                    <defs>
                      <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(145, 80%, 42%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(145, 80%, 42%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                    <Area type="monotone" dataKey="volume" stroke="hsl(145, 80%, 42%)" fill="url(#volumeGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Weight PRs */}
          {weightPRs.length > 0 && (
            <div className="px-5 mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">🏅 Weight PRs</h3>
              <div className="grid grid-cols-2 gap-2">
                {weightPRs.slice(0, 6).map((pr, i) => (
                  <div key={`${pr.exerciseId}-${i}`} className="glass-card p-3 glow-border">
                    <p className="text-xs text-muted-foreground truncate">{pr.exerciseName}</p>
                    <p className="text-lg font-display font-bold text-foreground">{pr.value}kg</p>
                    <p className="text-[10px] text-primary">Personal Best</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exercise Progression */}
          <div className="px-5 mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Exercise Progression</h3>

            {/* Exercise selector */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3">
              {exerciseList.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExercise(selectedExercise === ex.id ? null : ex.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedExercise === ex.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ex.name.split(' ').slice(0, 2).join(' ')}
                </button>
              ))}
            </div>

            {/* Selected exercise chart */}
            {selectedExercise && exerciseChartData.length > 0 && (
              <div className="glass-card p-4 mb-3 animate-fade-in">
                <p className="text-xs text-muted-foreground mb-2">Weight Progression</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={exerciseChartData}>
                    <XAxis dataKey="name" tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                    <Line type="monotone" dataKey="weight" stroke="hsl(145, 80%, 42%)" strokeWidth={2} dot={{ fill: 'hsl(145, 80%, 42%)', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Exercise improvement list */}
            <div className="flex flex-col gap-2">
              {exerciseList.slice(0, 8).map(ex => {
                const prForEx = prs.find(p => p.exerciseId === ex.id && p.type === 'weight');
                return (
                  <button
                    key={ex.id}
                    onClick={() => setSelectedExercise(selectedExercise === ex.id ? null : ex.id)}
                    className="glass-card-hover flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-3">
                      {prForEx ? (
                        <Medal className="w-5 h-5 text-primary" />
                      ) : (
                        <Dumbbell className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{ex.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Last: {ex.lastWeight}kg
                          {ex.entries.length >= 2 && (
                            <span className={ex.improvement > 0 ? ' text-primary' : ' text-destructive'}>
                              {' '}({ex.improvement > 0 ? '+' : ''}{ex.improvement}%)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Muscle Breakdown */}
          {muscleData.length > 0 && (
            <div className="px-5 mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Muscle Focus</h3>
              <div className="glass-card p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={muscleData} layout="vertical">
                    <XAxis type="number" tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={{ background: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                    <Bar dataKey="volume" fill="hsl(200, 85%, 55%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      <BottomNav />
    </div>
  );
}

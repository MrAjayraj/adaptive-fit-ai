import { useFitness } from '@/context/FitnessContext';
import BottomNav from '@/components/layout/BottomNav';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Dumbbell, Calendar } from 'lucide-react';

export default function Progress() {
  const { workouts, progressHistory, getWeeklyStats } = useFitness();
  const stats = getWeeklyStats();

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

  // Top exercises by progress
  const exerciseMap = new Map<string, { name: string; entries: typeof progressHistory }>();
  for (const entry of progressHistory) {
    if (!exerciseMap.has(entry.exerciseId)) {
      exerciseMap.set(entry.exerciseId, { name: entry.exerciseName, entries: [] });
    }
    exerciseMap.get(entry.exerciseId)!.entries.push(entry);
  }

  const topExercises = [...exerciseMap.entries()]
    .filter(([_, data]) => data.entries.length >= 2)
    .map(([id, data]) => {
      const first = data.entries[0];
      const last = data.entries[data.entries.length - 1];
      const improvement = last.totalVolume > 0 && first.totalVolume > 0
        ? ((last.totalVolume - first.totalVolume) / first.totalVolume) * 100
        : 0;
      return { id, name: data.name, improvement: Math.round(improvement), lastWeight: last.bestSet.weight };
    })
    .sort((a, b) => b.improvement - a.improvement)
    .slice(0, 5);

  const isEmpty = workouts.length === 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Progress</h1>
        <p className="text-sm text-muted-foreground">Track your gains</p>
      </div>

      {isEmpty ? (
        <div className="px-5 flex flex-col items-center justify-center py-20 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Complete workouts to see your progress</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="px-5 grid grid-cols-2 gap-3 mb-6">
            <div className="glass-card p-4">
              <Calendar className="w-5 h-5 text-primary mb-2" />
              <p className="text-2xl font-display font-bold text-foreground">{workouts.length}</p>
              <p className="text-xs text-muted-foreground">Total Workouts</p>
            </div>
            <div className="glass-card p-4">
              <Dumbbell className="w-5 h-5 text-accent mb-2" />
              <p className="text-2xl font-display font-bold text-foreground">
                {(progressHistory.reduce((s, p) => s + p.totalVolume, 0) / 1000).toFixed(0)}k
              </p>
              <p className="text-xs text-muted-foreground">Total Volume (kg)</p>
            </div>
          </div>

          {/* Volume Chart */}
          {volumeData.length > 0 && (
            <div className="px-5 mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Volume Trend</h3>
              <div className="glass-card p-4">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={volumeData}>
                    <defs>
                      <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(145, 80%, 42%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(145, 80%, 42%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="volume" stroke="hsl(145, 80%, 42%)" fill="url(#volumeGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Muscle Breakdown */}
          {muscleData.length > 0 && (
            <div className="px-5 mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Muscle Focus</h3>
              <div className="glass-card p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={muscleData} layout="vertical">
                    <XAxis type="number" tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                    />
                    <Bar dataKey="volume" fill="hsl(200, 85%, 55%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top Exercises */}
          {topExercises.length > 0 && (
            <div className="px-5 mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Top Improvements</h3>
              <div className="flex flex-col gap-2">
                {topExercises.map(ex => (
                  <div key={ex.id} className="glass-card flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{ex.name}</p>
                      <p className="text-xs text-muted-foreground">Last: {ex.lastWeight}kg</p>
                    </div>
                    <span className={`text-sm font-bold ${ex.improvement > 0 ? 'text-primary' : 'text-destructive'}`}>
                      {ex.improvement > 0 ? '+' : ''}{ex.improvement}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <BottomNav />
    </div>
  );
}

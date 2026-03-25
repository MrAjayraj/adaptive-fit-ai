import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { detectFatigue } from '@/lib/workout-generator';
import { Play, Flame, Dumbbell, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/layout/BottomNav';

export default function Dashboard() {
  const { profile, currentPlan, workouts, getTodaysWorkout, getWeeklyStats, generatePlan, startWorkout } = useFitness();
  const navigate = useNavigate();

  const todaysWorkout = getTodaysWorkout();
  const stats = getWeeklyStats();
  const fatigue = detectFatigue(workouts);

  const handleStartWorkout = () => {
    if (todaysWorkout) {
      startWorkout(todaysWorkout.id);
      navigate('/workout');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <p className="text-muted-foreground text-sm">Welcome back</p>
        <h1 className="text-2xl font-display font-bold text-foreground">{profile?.name || 'Athlete'}</h1>
      </div>

      {/* Fatigue Alert */}
      {fatigue.fatigued && (
        <div className="mx-5 mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex gap-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/80">{fatigue.message}</p>
        </div>
      )}

      {/* Today's Workout Card */}
      {todaysWorkout ? (
        <div className="mx-5 mb-5 glass-card p-5 glow-border animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-primary font-medium uppercase tracking-wider">Today's Workout</p>
              <h2 className="text-xl font-display font-bold text-foreground mt-1">{todaysWorkout.name}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
            <span>{todaysWorkout.exercises.length} exercises</span>
            <span>~{todaysWorkout.exercises.length * 8} min</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {[...new Set(todaysWorkout.exercises.map(e => e.muscleGroup))].map(mg => (
              <span key={mg} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize">
                {mg}
              </span>
            ))}
          </div>
          <Button onClick={handleStartWorkout} className="w-full bg-gradient-primary hover:opacity-90">
            <Play className="w-4 h-4" />
            Start Workout
          </Button>
        </div>
      ) : (
        <div className="mx-5 mb-5 glass-card p-5 text-center">
          <p className="text-muted-foreground mb-3">No workout planned</p>
          <Button onClick={generatePlan} className="bg-gradient-primary hover:opacity-90">
            Generate New Plan
          </Button>
        </div>
      )}

      {/* Weekly Stats */}
      <div className="px-5 mb-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">This Week</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Flame, value: stats.totalWorkouts, label: 'Workouts', color: 'text-primary' },
            { icon: TrendingUp, value: `${(stats.totalVolume / 1000).toFixed(1)}k`, label: 'Volume (kg)', color: 'text-accent' },
            { icon: Dumbbell, value: `${stats.totalDuration}m`, label: 'Duration', color: 'text-primary' },
          ].map(({ icon: Icon, value, label, color }) => (
            <div key={label} className="glass-card p-3.5 text-center">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-1.5`} />
              <p className="text-xl font-display font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Workouts */}
      <div className="px-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Upcoming</h3>
        <div className="flex flex-col gap-2">
          {currentPlan
            .filter(w => !w.completed)
            .slice(0, 4)
            .map(workout => (
              <button
                key={workout.id}
                onClick={() => {
                  startWorkout(workout.id);
                  navigate('/workout');
                }}
                className="glass-card-hover flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{workout.name}</p>
                    <p className="text-xs text-muted-foreground">{workout.exercises.length} exercises</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

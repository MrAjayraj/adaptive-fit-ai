import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { detectFatigue } from '@/lib/workout-generator';
import { calculateBMR, calculateTargetCalories, xpForNextLevel, xpForLevel } from '@/lib/gamification';
import { Play, Flame, Dumbbell, TrendingUp, AlertTriangle, ChevronRight, Zap, Trophy, Footprints, Target, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import BottomNav from '@/components/layout/BottomNav';

export default function Dashboard() {
  const {
    profile, currentPlan, workouts, gamification,
    getTodaysWorkout, getWeeklyStats, generatePlan, startWorkout,
    setStepsToday,
  } = useFitness();
  const navigate = useNavigate();

  const todaysWorkout = getTodaysWorkout();
  const stats = getWeeklyStats();
  const fatigue = detectFatigue(workouts);

  const { xp, level, streak, stepsToday, stepDate, prs, achievements } = gamification;
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForNextLevel(level);
  const xpProgress = nextLevelXP > currentLevelXP
    ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    : 100;

  // Calorie calculation
  const bmr = profile ? calculateBMR(profile.weight, profile.height, profile.age, profile.gender) : 0;
  const calories = profile ? calculateTargetCalories(bmr, profile.goal, profile.daysPerWeek) : null;

  // Steps (reset if different day)
  const today = new Date().toISOString().split('T')[0];
  const steps = stepDate === today ? stepsToday : 0;
  const estCalBurned = Math.round(steps * 0.04 + (stats.totalDuration * 6));

  const unlockedAchievements = achievements.filter(a => a.unlockedAt);

  const handleStartWorkout = () => {
    if (todaysWorkout) {
      startWorkout(todaysWorkout.id);
      navigate('/workout');
    }
  };

  const adjustSteps = (delta: number) => {
    setStepsToday(Math.max(0, steps + delta));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with Level */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Welcome back</p>
            <h1 className="text-2xl font-display font-bold text-foreground">{profile?.name || 'Athlete'}</h1>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10">
                <Flame className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs font-bold text-destructive">{streak}</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-primary">Lv.{level}</span>
            </div>
          </div>
        </div>
      </div>

      {/* XP Bar */}
      <div className="px-5 mb-4">
        <div className="glass-card p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Level {level}</span>
            <span className="text-xs text-primary font-medium">{xp} / {nextLevelXP} XP</span>
          </div>
          <Progress value={xpProgress} className="h-2 bg-muted" />
        </div>
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
          <div className="flex gap-4 mb-3 text-sm text-muted-foreground">
            <span>{todaysWorkout.exercises.length} exercises</span>
            <span>+{50} XP</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {[...new Set(todaysWorkout.exercises.map(e => e.muscleGroup))].map(mg => (
              <span key={mg} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize">{mg}</span>
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
          <div className="flex gap-2">
            <Button onClick={generatePlan} className="flex-1 bg-gradient-primary hover:opacity-90">
              Generate Plan
            </Button>
            <Button onClick={() => navigate('/builder')} variant="outline" className="flex-1">
              Custom Workout
            </Button>
          </div>
        </div>
      )}

      {/* Daily Stats Row */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-2 gap-3">
          {/* Steps */}
          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <Footprints className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">Steps Today</span>
            </div>
            <p className="text-xl font-display font-bold text-foreground mb-1">{steps.toLocaleString()}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => adjustSteps(-500)}
                className="w-6 h-6 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                <Minus className="w-3 h-3" />
              </button>
              <button onClick={() => adjustSteps(500)}
                className="w-6 h-6 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                <Plus className="w-3 h-3" />
              </button>
              <button onClick={() => adjustSteps(1000)}
                className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground">+1k</button>
            </div>
          </div>

          {/* Calories */}
          {calories && (
            <div className="glass-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Calories</span>
              </div>
              <p className="text-xl font-display font-bold text-foreground">{calories.target}</p>
              <p className="text-[10px] text-muted-foreground">{calories.label}</p>
              <p className="text-[10px] text-accent mt-0.5">~{estCalBurned} burned today</p>
            </div>
          )}
        </div>
      </div>

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

      {/* Recent PRs */}
      {prs.length > 0 && (
        <div className="px-5 mb-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Personal Records</h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {prs.slice(-6).reverse().map((pr, i) => (
              <div key={`${pr.exerciseId}-${pr.type}-${i}`} className="shrink-0 glass-card p-3 min-w-[140px]">
                <p className="text-[10px] text-primary font-medium uppercase">🏅 {pr.type} PR</p>
                <p className="text-sm font-medium text-foreground mt-1 truncate">{pr.exerciseName}</p>
                <p className="text-lg font-display font-bold text-foreground">
                  {pr.value}{pr.type === 'weight' ? 'kg' : pr.type === 'reps' ? ' reps' : 'kg vol'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {unlockedAchievements.length > 0 && (
        <div className="px-5 mb-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Achievements</h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {unlockedAchievements.map(a => (
              <div key={a.id} className="shrink-0 glass-card p-3 min-w-[100px] text-center">
                <span className="text-2xl">{a.icon}</span>
                <p className="text-[10px] font-medium text-foreground mt-1">{a.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    <p className="text-xs text-muted-foreground">{workout.exercises.length} exercises · +50 XP</p>
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

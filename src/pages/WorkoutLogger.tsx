import { useState } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { WorkoutSet, Workout } from '@/types/fitness';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, Minus, Plus, Star, Timer, Trophy, Zap } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';

export default function WorkoutLogger() {
  const { activeWorkoutId, currentPlan, updateWorkout, completeWorkout, getTodaysWorkout, startWorkout, recentPRs, clearRecentPRs, gamification } = useFitness();
  const navigate = useNavigate();
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [rating, setRating] = useState(3);
  const [elapsed, setElapsed] = useState(0);

  const workout = currentPlan.find(w => w.id === activeWorkoutId) || null;

  if (!workout) {
    const next = getTodaysWorkout();
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-muted-foreground text-center">No active workout</p>
        {next ? (
          <Button onClick={() => startWorkout(next.id)} className="bg-gradient-primary hover:opacity-90">
            Start: {next.name}
          </Button>
        ) : (
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button variant="outline" onClick={() => navigate('/')}>Go to Dashboard</Button>
            <Button onClick={() => navigate('/builder')} className="bg-gradient-primary hover:opacity-90">
              Create Custom Workout
            </Button>
          </div>
        )}
        <BottomNav />
      </div>
    );
  }

  const exercise = workout.exercises[currentExIndex];
  if (!exercise) return null;

  const updateSet = (setIndex: number, changes: Partial<WorkoutSet>) => {
    const updatedExercises = workout.exercises.map((ex, ei) => {
      if (ei !== currentExIndex) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, si) => (si === setIndex ? { ...s, ...changes } : s)),
      };
    });
    updateWorkout({ ...workout, exercises: updatedExercises });
  };

  const allExercisesDone = workout.exercises.every(ex => ex.sets.every(s => s.completed));

  const handleFinish = () => {
    completeWorkout(workout.id, rating, elapsed || workout.exercises.length * 8);
  };

  // Show PR celebration + completion screen
  if (showComplete) {
    const hasNewPRs = recentPRs.length > 0;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-5 animate-scale-in">
        <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center animate-pulse-glow">
          <Trophy className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground">Workout Complete!</h2>

        {/* XP gained preview */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">+50 XP{recentPRs.length > 0 ? ` + ${recentPRs.length * 100} PR Bonus` : ''}</span>
        </div>

        {/* New PRs */}
        {hasNewPRs && (
          <div className="w-full max-w-xs">
            <p className="text-xs text-muted-foreground uppercase tracking-wider text-center mb-2">🎉 New Personal Records!</p>
            <div className="flex flex-col gap-1.5">
              {recentPRs.map((pr, i) => (
                <div key={i} className="glass-card glow-border p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground capitalize">{pr.type} PR</p>
                    <p className="text-sm font-medium text-foreground">{pr.exerciseName}</p>
                  </div>
                  <span className="text-lg font-display font-bold text-primary">
                    {pr.value}{pr.type === 'weight' ? 'kg' : pr.type === 'reps' ? ' reps' : 'kg'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-muted-foreground text-center text-sm">How did it feel?</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(v => (
            <button key={v} onClick={() => setRating(v)} className="p-2">
              <Star className={`w-8 h-8 transition-all ${v <= rating ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
            </button>
          ))}
        </div>
        <Button onClick={() => { handleFinish(); clearRecentPRs(); navigate('/'); }} className="w-full max-w-xs bg-gradient-primary hover:opacity-90">
          Save & Level Up
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-display font-bold text-foreground">{workout.name}</h1>
        <div className="flex items-center gap-1 text-muted-foreground text-sm">
          <Timer className="w-4 h-4" />
        </div>
      </div>

      {/* Exercise Tabs */}
      <div className="flex gap-1.5 px-5 mb-5 overflow-x-auto no-scrollbar">
        {workout.exercises.map((ex, i) => {
          const done = ex.sets.every(s => s.completed);
          return (
            <button
              key={ex.id}
              onClick={() => setCurrentExIndex(i)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                i === currentExIndex
                  ? 'bg-primary text-primary-foreground'
                  : done
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {ex.exerciseName.split(' ').slice(0, 2).join(' ')}
            </button>
          );
        })}
      </div>

      {/* Current Exercise */}
      <div className="px-5 animate-fade-in" key={exercise.id}>
        <div className="mb-4">
          <h2 className="text-xl font-display font-bold text-foreground">{exercise.exerciseName}</h2>
          <p className="text-xs text-muted-foreground capitalize">{exercise.muscleGroup} · Rest {exercise.restSeconds}s</p>
        </div>

        {/* Sets */}
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-[40px_1fr_1fr_48px] gap-2 text-xs text-muted-foreground px-1">
            <span>Set</span>
            <span>Weight (kg)</span>
            <span>Reps</span>
            <span></span>
          </div>

          {exercise.sets.map((set, si) => (
            <div
              key={set.id}
              className={`grid grid-cols-[40px_1fr_1fr_48px] gap-2 items-center glass-card p-2.5 transition-all ${
                set.completed ? 'border-primary/30' : ''
              }`}
            >
              <span className={`text-sm font-bold text-center ${set.completed ? 'text-primary' : 'text-muted-foreground'}`}>
                {si + 1}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateSet(si, { weight: Math.max(0, set.weight - 2.5) })}
                  className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  value={set.weight}
                  onChange={e => updateSet(si, { weight: parseFloat(e.target.value) || 0 })}
                  className="w-full text-center bg-transparent text-foreground font-bold text-sm focus:outline-none"
                />
                <button
                  onClick={() => updateSet(si, { weight: set.weight + 2.5 })}
                  className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateSet(si, { reps: Math.max(0, set.reps - 1) })}
                  className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  value={set.reps}
                  onChange={e => updateSet(si, { reps: parseInt(e.target.value) || 0 })}
                  className="w-full text-center bg-transparent text-foreground font-bold text-sm focus:outline-none"
                />
                <button
                  onClick={() => updateSet(si, { reps: set.reps + 1 })}
                  className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={() => updateSet(si, { completed: !set.completed })}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  set.completed
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Nav between exercises */}
        <div className="flex gap-3 mt-6">
          {currentExIndex > 0 && (
            <Button variant="outline" onClick={() => setCurrentExIndex(i => i - 1)} className="flex-1">
              Previous
            </Button>
          )}
          {currentExIndex < workout.exercises.length - 1 ? (
            <Button onClick={() => setCurrentExIndex(i => i + 1)} className="flex-1">
              Next Exercise
            </Button>
          ) : (
            <Button
              onClick={() => setShowComplete(true)}
              className="flex-1 bg-gradient-primary hover:opacity-90"
              disabled={!allExercisesDone}
            >
              Finish Workout
            </Button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

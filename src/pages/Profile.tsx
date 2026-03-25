import { useFitness } from '@/context/FitnessContext';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/layout/BottomNav';
import { User, RefreshCw, Trash2 } from 'lucide-react';

export default function Profile() {
  const { profile, workouts, progressHistory, generatePlan, setProfile } = useFitness();

  const handleReset = () => {
    if (confirm('This will clear all your data. Are you sure?')) {
      localStorage.removeItem('fitai-state');
      window.location.reload();
    }
  };

  if (!profile) return null;

  const goalLabels: Record<string, string> = {
    build_muscle: 'Build Muscle',
    lose_fat: 'Lose Fat',
    strength: 'Build Strength',
    endurance: 'Endurance',
    general: 'General Fitness',
  };

  const splitLabels: Record<string, string> = {
    push_pull_legs: 'Push/Pull/Legs',
    upper_lower: 'Upper/Lower',
    full_body: 'Full Body',
    bro_split: 'Body Part Split',
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>
      </div>

      {/* Avatar & Name */}
      <div className="px-5 flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-3">
          <User className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">{profile.name}</h2>
        <p className="text-sm text-muted-foreground capitalize">{profile.experience} · {goalLabels[profile.goal]}</p>
      </div>

      {/* Stats */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Stats</h3>
        <div className="glass-card divide-y divide-border">
          {[
            ['Age', `${profile.age} years`],
            ['Weight', `${profile.weight} kg`],
            ['Height', `${profile.height} cm`],
            ['Goal', goalLabels[profile.goal]],
            ['Split', splitLabels[profile.preferredSplit]],
            ['Days/Week', `${profile.daysPerWeek}`],
            ['Workouts Completed', `${workouts.length}`],
            ['Exercises Tracked', `${new Set(progressHistory.map(p => p.exerciseId)).size}`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between p-3.5">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 flex flex-col gap-2">
        <Button onClick={generatePlan} variant="outline" className="w-full">
          <RefreshCw className="w-4 h-4" />
          Regenerate Plan
        </Button>
        <Button onClick={handleReset} variant="outline" className="w-full text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
          Reset All Data
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}

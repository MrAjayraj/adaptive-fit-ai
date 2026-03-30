import { useFitness } from '@/context/FitnessContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import BottomNav from '@/components/layout/BottomNav';
import { User, RefreshCw, Trash2, Zap, Trophy, Flame, Lock } from 'lucide-react';
import { ACHIEVEMENT_DEFS, xpForLevel, xpForNextLevel } from '@/lib/gamification';

export default function Profile() {
  const { profile, workouts, progressHistory, generatePlan, gamification } = useFitness();
  const { xp, level, streak, achievements } = gamification;

  const handleReset = () => {
    if (confirm('This will clear all your data. Are you sure?')) {
      localStorage.removeItem('fitai-state');
      window.location.reload();
    }
  };

  if (!profile) return null;

  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForNextLevel(level);
  const xpProgress = nextLevelXP > currentLevelXP
    ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    : 100;

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

  const unlockedIds = new Set(achievements.filter(a => a.unlockedAt).map(a => a.id));

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>
      </div>

      {/* Avatar & Name with Level */}
      <div className="px-5 flex flex-col items-center mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center">
            <User className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-card border border-primary text-xs font-bold text-primary">
            Lv.{level}
          </div>
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mt-3">{profile.name}</h2>
        <p className="text-sm text-muted-foreground capitalize">{profile.experience} · {goalLabels[profile.goal]}</p>

        {/* XP Bar */}
        <div className="w-full max-w-xs mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{xp} XP</span>
            <span className="text-xs text-primary">Next: {nextLevelXP} XP</span>
          </div>
          <Progress value={xpProgress} className="h-2 bg-muted" />
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1">
            <Flame className="w-4 h-4 text-destructive" />
            <span className="text-sm font-bold text-foreground">{streak} streak</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">{xp} XP</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold text-foreground">{gamification.prs.length} PRs</span>
          </div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Achievements</h3>
        <div className="grid grid-cols-4 gap-2">
          {ACHIEVEMENT_DEFS.map(a => {
            const unlocked = unlockedIds.has(a.id);
            return (
              <div
                key={a.id}
                className={`glass-card p-2.5 text-center transition-all ${
                  unlocked ? 'glow-border' : 'opacity-40'
                }`}
              >
                <span className="text-xl">{unlocked ? a.icon : '🔒'}</span>
                <p className="text-[9px] text-foreground mt-1 leading-tight">{a.name}</p>
              </div>
            );
          })}
        </div>
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

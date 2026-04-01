import { useState } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import BottomNav from '@/components/layout/BottomNav';
import { User, RefreshCw, Trash2, Zap, Trophy, Flame, Save, Scale } from 'lucide-react';
import { ACHIEVEMENT_DEFS, xpForLevel, xpForNextLevel } from '@/lib/gamification';
import { calculateBMR, calculateTargetCalories } from '@/lib/calories';
import { UserProfile, FitnessGoal, ExperienceLevel, Gender, WorkoutSplit } from '@/types/fitness';
import { toast } from 'sonner';

export default function Profile() {
  const { profile, workouts, progressHistory, generatePlan, gamification, setProfile, weightLogs } = useFitness();
  const { xp, level, streak, achievements } = gamification;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UserProfile | null>(null);

  const handleReset = () => {
    if (confirm('This will clear all your data. Are you sure?')) {
      localStorage.removeItem('fitai-state');
      window.location.reload();
    }
  };

  if (!profile) return null;

  const startEdit = () => {
    setForm({ ...profile });
    setEditing(true);
  };

  const saveEdit = () => {
    if (form) {
      setProfile(form);
      setEditing(false);
      toast.success('Profile updated');
    }
  };

  const update = (fields: Partial<UserProfile>) => setForm(prev => prev ? { ...prev, ...fields } : prev);

  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForNextLevel(level);
  const xpProgress = nextLevelXP > currentLevelXP
    ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    : 100;

  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender, profile.bodyFat);
  const calories = calculateTargetCalories(bmr, profile.goal, profile.daysPerWeek);

  const goalLabels: Record<string, string> = {
    build_muscle: 'Build Muscle', lose_fat: 'Lose Fat', strength: 'Build Strength',
    endurance: 'Endurance', general: 'General Fitness',
  };

  const splitLabels: Record<string, string> = {
    push_pull_legs: 'Push/Pull/Legs', upper_lower: 'Upper/Lower',
    full_body: 'Full Body', bro_split: 'Body Part Split',
  };

  const unlockedIds = new Set(achievements.filter(a => a.unlockedAt).map(a => a.id));

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={startEdit}>Edit</Button>
        ) : (
          <Button size="sm" onClick={saveEdit}>
            <Save className="w-3.5 h-3.5" /> Save
          </Button>
        )}
      </div>

      {/* Avatar & Name */}
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

      {/* Calorie Summary */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Daily Nutrition Target</h3>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-display font-bold text-foreground">{calories.target} cal</span>
            <span className="text-xs text-primary">{calories.label}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">{calories.protein}g</p>
              <p className="text-[10px] text-muted-foreground">Protein</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{calories.carbs}g</p>
              <p className="text-[10px] text-muted-foreground">Carbs</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{calories.fat}g</p>
              <p className="text-[10px] text-muted-foreground">Fat</p>
            </div>
          </div>
          {profile.bodyFat && (
            <p className="text-[10px] text-muted-foreground mt-2 text-center">Using Katch-McArdle (BF: {profile.bodyFat}%)</p>
          )}
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Achievements</h3>
        <div className="grid grid-cols-4 gap-2">
          {ACHIEVEMENT_DEFS.map(a => {
            const unlocked = unlockedIds.has(a.id);
            return (
              <div key={a.id} className={`glass-card p-2.5 text-center transition-all ${unlocked ? 'glow-border' : 'opacity-40'}`}>
                <span className="text-xl">{unlocked ? a.icon : '🔒'}</span>
                <p className="text-[9px] text-foreground mt-1 leading-tight">{a.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editable Stats */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Body Metrics</h3>
        {editing && form ? (
          <div className="glass-card p-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Name</span>
              <input className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.name} onChange={e => update({ name: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Age</span>
                <input type="number" className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.age} onChange={e => update({ age: parseInt(e.target.value) || 0 })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Gender</span>
                <select className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.gender} onChange={e => update({ gender: e.target.value as Gender })}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Height (cm)</span>
                <input type="number" className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.height} onChange={e => update({ height: parseInt(e.target.value) || 0 })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Body Fat %</span>
                <input type="number" className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.bodyFat ?? ''} onChange={e => update({ bodyFat: parseFloat(e.target.value) || undefined })} placeholder="Optional" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Goal</span>
                <select className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.goal} onChange={e => update({ goal: e.target.value as FitnessGoal })}>
                  <option value="build_muscle">Build Muscle</option>
                  <option value="lose_fat">Lose Fat</option>
                  <option value="strength">Strength</option>
                  <option value="endurance">Endurance</option>
                  <option value="general">General Fitness</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Experience</span>
                <select className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.experience} onChange={e => update({ experience: e.target.value as ExperienceLevel })}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Days/Week</span>
                <input type="number" min={1} max={7} className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.daysPerWeek} onChange={e => update({ daysPerWeek: parseInt(e.target.value) || 3 })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Split</span>
                <select className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.preferredSplit} onChange={e => update({ preferredSplit: e.target.value as WorkoutSplit })}>
                  <option value="push_pull_legs">Push/Pull/Legs</option>
                  <option value="upper_lower">Upper/Lower</option>
                  <option value="full_body">Full Body</option>
                  <option value="bro_split">Body Part Split</option>
                </select>
              </label>
            </div>
          </div>
        ) : (
          <div className="glass-card divide-y divide-border">
            {[
              ['Age', `${profile.age} years`],
              ['Weight', `${profile.weight} kg`],
              ['Height', `${profile.height} cm`],
              ['Body Fat', profile.bodyFat ? `${profile.bodyFat}%` : 'Not set'],
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
        )}
      </div>

      {/* Weight History */}
      {weightLogs.length > 0 && (
        <div className="px-5 mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
            <Scale className="w-4 h-4" /> Weight History
          </h3>
          <div className="glass-card divide-y divide-border max-h-48 overflow-y-auto">
            {weightLogs.slice(0, 10).map(log => (
              <div key={log.id} className="flex justify-between p-3">
                <span className="text-sm text-muted-foreground">{log.logged_at}</span>
                <span className="text-sm font-bold text-foreground">{Number(log.weight)} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 flex flex-col gap-2">
        <Button onClick={generatePlan} variant="outline" className="w-full">
          <RefreshCw className="w-4 h-4" /> Regenerate Plan
        </Button>
        <Button onClick={handleReset} variant="outline" className="w-full text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" /> Reset All Data
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}

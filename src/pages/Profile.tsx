import { useState } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import BottomNav from '@/components/layout/BottomNav';
import CalorieMacroCard from '@/components/profile/CalorieMacroCard';
import AchievementsGrid from '@/components/profile/AchievementsGrid';
import XPBreakdownCard from '@/components/profile/XPBreakdownCard';
import LevelBadge from '@/components/dashboard/LevelBadge';
import { User, RefreshCw, Trash2, Zap, Trophy, Flame, Save, Scale, ChevronDown, ChevronUp } from 'lucide-react';
import { xpForLevel, xpForNextLevel, getLevelTier } from '@/lib/gamification';
import { UserProfile, FitnessGoal, ExperienceLevel, Gender, WorkoutSplit, ActivityLevel, GOAL_LABELS, SPLIT_LABELS, ACTIVITY_LABELS } from '@/types/fitness';
import { toast } from 'sonner';

export default function Profile() {
  const { profile, workouts, progressHistory, generatePlan, gamification, setProfile, weightLogs } = useFitness();
  const { xp, level, streak, achievements } = gamification;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UserProfile | null>(null);
  const [showWeightHistory, setShowWeightHistory] = useState(false);

  const handleReset = () => {
    if (confirm('This will clear all your data. Are you sure?')) {
      localStorage.removeItem('fitai-state');
      window.location.reload();
    }
  };

  if (!profile) return null;

  const startEdit = () => { setForm({ ...profile }); setEditing(true); };
  const saveEdit = () => {
    if (form) { setProfile(form); setEditing(false); toast.success('Profile updated'); }
  };
  const update = (fields: Partial<UserProfile>) => setForm(prev => prev ? { ...prev, ...fields } : prev);

  const tier = getLevelTier(level);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForNextLevel(level);
  const xpProgress = nextLevelXP > currentLevelXP ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 100;

  const bmi = profile.height > 0 ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1) : '—';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={startEdit}>Edit</Button>
        ) : (
          <Button size="sm" onClick={saveEdit}><Save className="w-3.5 h-3.5" /> Save</Button>
        )}
      </div>

      {/* Avatar & Level */}
      <div className="px-5 flex flex-col items-center mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center">
            <User className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="absolute -bottom-1 -right-1">
            <LevelBadge level={level} size="sm" />
          </div>
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mt-3">{profile.name}</h2>
        <p className="text-sm text-muted-foreground capitalize">
          {profile.experience} · {GOAL_LABELS[profile.goal]} · <span className={tier.color}>{tier.tier}</span>
        </p>

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

      {/* Body Stats Summary */}
      <div className="px-5 mb-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Body Stats</h3>
        {editing && form ? (
          <div className="glass-card p-4 flex flex-col gap-3 animate-scale-in">
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
                <span className="text-xs text-muted-foreground">Sex</span>
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
                <span className="text-xs text-muted-foreground">Goal Weight (kg)</span>
                <input type="number" className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.goalWeight ?? ''} onChange={e => update({ goalWeight: parseFloat(e.target.value) || undefined })} placeholder="Optional" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Activity Level</span>
                <select className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.activityLevel} onChange={e => update({ activityLevel: e.target.value as ActivityLevel })}>
                  {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Fitness Goal</span>
                <select className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.goal} onChange={e => update({ goal: e.target.value as FitnessGoal })}>
                  {Object.entries(GOAL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
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
                  {Object.entries(SPLIT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : (
          <div className="glass-card divide-y divide-border">
            {[
              ['Age', `${profile.age} years`],
              ['Weight', `${profile.weight} kg`],
              ['Goal Weight', profile.goalWeight ? `${profile.goalWeight} kg` : 'Not set'],
              ['Height', `${profile.height} cm`],
              ['BMI', bmi],
              ['Body Fat', profile.bodyFat ? `${profile.bodyFat}%` : 'Not set'],
              ['Activity', ACTIVITY_LABELS[profile.activityLevel]],
              ['Goal', GOAL_LABELS[profile.goal]],
              ['Split', SPLIT_LABELS[profile.preferredSplit]],
              ['Days/Week', `${profile.daysPerWeek}`],
              ['Workouts', `${workouts.length}`],
              ['Exercises Tracked', `${new Set(progressHistory.map(p => p.exerciseId)).size}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between p-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calorie & Macro Card */}
      <div className="px-5 mb-5">
        <CalorieMacroCard />
      </div>

      {/* XP Breakdown */}
      <div className="px-5 mb-5">
        <XPBreakdownCard />
      </div>

      {/* Achievements */}
      <div className="px-5 mb-5">
        <AchievementsGrid />
      </div>

      {/* Weight History */}
      {weightLogs.length > 0 && (
        <div className="px-5 mb-5">
          <button
            onClick={() => setShowWeightHistory(!showWeightHistory)}
            className="flex items-center gap-2 mb-3 w-full"
          >
            <Scale className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Weight History</h3>
            {showWeightHistory ? <ChevronUp className="w-3 h-3 text-muted-foreground ml-auto" /> : <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />}
          </button>
          {showWeightHistory && (
            <div className="glass-card divide-y divide-border max-h-48 overflow-y-auto animate-fade-in">
              {weightLogs.slice(0, 15).map(log => (
                <div key={log.id} className="flex justify-between p-3">
                  <span className="text-sm text-muted-foreground">{log.logged_at}</span>
                  <span className="text-sm font-bold text-foreground">{Number(log.weight)} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-5 flex flex-col gap-2 mb-6">
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

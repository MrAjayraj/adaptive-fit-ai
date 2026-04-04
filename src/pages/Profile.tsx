import { useState } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import CalorieMacroCard from '@/components/profile/CalorieMacroCard';
import XPBreakdownCard from '@/components/profile/XPBreakdownCard';
import LevelBadge from '@/components/dashboard/LevelBadge';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowLeft, Camera, User, Save, Scale, Flame, Zap, Trophy, ChevronRight, LogOut, Info } from 'lucide-react';
import { xpForLevel, xpForNextLevel, getLevelTier } from '@/lib/gamification';
import { UserProfile, FitnessGoal, ExperienceLevel, Gender, WorkoutSplit, ActivityLevel, GOAL_LABELS, SPLIT_LABELS, ACTIVITY_LABELS } from '@/types/fitness';
import { toast } from 'sonner';

const GOAL_CARDS = [
  { value: 'aggressive_cut', label: 'Aggressive Cut', icon: '🔥', cal: '-750' },
  { value: 'lose_fat', label: 'Fat Loss', icon: '📉', cal: '-500' },
  { value: 'maintenance', label: 'Maintenance', icon: '⚖️', cal: '+0' },
  { value: 'general', label: 'General Fitness', icon: '🎯', cal: '+0' },
  { value: 'lean_bulk', label: 'Lean Bulk', icon: '💪', cal: '+250' },
  { value: 'build_muscle', label: 'Muscle Gain', icon: '🏋️', cal: '+500' },
  { value: 'strength', label: 'Strength', icon: '🦾', cal: '+200' },
];

const ACTIVITY_DESCRIPTIONS: Record<string, string> = {
  sedentary: 'Desk job, little exercise',
  lightly_active: 'Light exercise 1-3 days/week',
  moderately_active: 'Moderate exercise 3-5 days/week',
  very_active: 'Hard exercise 6-7 days/week',
  extremely_active: 'Very intense daily + physical job',
};

export default function Profile() {
  const { profile, setProfile, gamification, weightLogs, workouts, progressHistory, updateWeight, generatePlan, signOut } = useFitness();
  const navigate = useNavigate();
  const { xp, level, streak } = gamification;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UserProfile | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logWeight, setLogWeight] = useState('');
  const [logBodyFat, setLogBodyFat] = useState('');

  if (!profile) return null;

  const tier = getLevelTier(level);
  const nextLevelXP = xpForNextLevel(level);
  const currentLevelXP = xpForLevel(level);
  const xpProgress = nextLevelXP > currentLevelXP ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 100;

  const bmi = profile.height > 0 ? profile.weight / ((profile.height / 100) ** 2) : 0;
  const bmiLabel = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const bmiColor = bmi < 18.5 ? 'text-accent' : bmi < 25 ? 'text-primary' : bmi < 30 ? 'text-yellow-400' : 'text-destructive';

  const chartData = weightLogs.slice(0, 30).reverse().map(log => ({
    date: new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: Number(log.weight),
  }));

  const startEdit = () => { setForm({ ...profile }); setEditing(true); };
  const cancelEdit = () => { setForm(null); setEditing(false); };
  const saveEdit = () => {
    if (form) { setProfile(form); setEditing(false); setForm(null); toast.success('Profile updated'); }
  };
  const update = (fields: Partial<UserProfile>) => setForm(prev => prev ? { ...prev, ...fields } : prev);

  const handleLogMeasurement = async () => {
    const w = parseFloat(logWeight);
    if (!w || w <= 0) return;
    await updateWeight(w);
    if (logBodyFat) {
      const bf = parseFloat(logBodyFat);
      if (bf > 0 && form) update({ bodyFat: bf });
    }
    setShowLogModal(false);
    setLogWeight('');
    setLogBodyFat('');
    toast.success('Measurement logged');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const p = editing && form ? form : profile;

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="w-9 h-9 rounded-full bg-card flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={startEdit}>Edit Profile</Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
            <Button size="sm" onClick={saveEdit}><Save className="w-3.5 h-3.5" /> Save</Button>
          </div>
        )}
      </div>

      {/* Avatar & Identity */}
      <div className="flex flex-col items-center px-5 mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center overflow-hidden">
            <User className="w-12 h-12 text-primary-foreground" />
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-background">
            <Camera className="w-3.5 h-3.5 text-primary-foreground" />
          </button>
          <div className="absolute -top-1 -right-1">
            <LevelBadge level={level} size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <h1 className="text-2xl font-display font-bold text-foreground">{p.name || 'Athlete'}</h1>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
            <span className="text-xs">{tier.icon}</span>
            <span className="text-xs font-bold text-primary">Lv.{level}</span>
          </div>
        </div>
        <div className="w-full max-w-xs mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{xp} XP</span>
            <span className="text-primary">{nextLevelXP} XP</span>
          </div>
          <Progress value={xpProgress} className="h-2 bg-muted" />
        </div>
        <div className="flex gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1"><Flame className="w-4 h-4 text-destructive" /><span className="font-bold text-foreground">{streak} streak</span></div>
          <div className="flex items-center gap-1"><Zap className="w-4 h-4 text-primary" /><span className="font-bold text-foreground">{xp} XP</span></div>
          <div className="flex items-center gap-1"><Trophy className="w-4 h-4 text-accent" /><span className="font-bold text-foreground">{gamification.prs.length} PRs</span></div>
        </div>
        <div className="glass-card p-2.5 mt-3 w-full max-w-xs">
          <p className="text-xs text-muted-foreground text-center">
            Current: <span className="text-foreground font-bold">{streak} days</span> 🔥 | Freezes: <span className="text-foreground font-bold">{gamification.streakFreezeUsed ? 0 : 1}</span>
          </p>
        </div>
      </div>

      {/* Personal Details */}
      <div className="px-5 mb-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Personal Details</h3>
        {editing && form ? (
          <div className="glass-card p-4 flex flex-col gap-3 animate-scale-in">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Full Name</span>
              <input className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.name} onChange={e => update({ name: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Age</span>
                <input type="number" className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.age} onChange={e => update({ age: parseInt(e.target.value) || 0 })} />
              </label>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Sex</span>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(['male', 'female', 'other'] as const).map(g => (
                    <button key={g} onClick={() => update({ gender: g })}
                      className={`flex-1 py-2 text-xs font-medium transition-colors capitalize ${form.gender === g ? 'bg-primary text-primary-foreground' : 'bg-input text-muted-foreground'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Height (cm)</span>
                <input type="number" className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.height} onChange={e => update({ height: parseInt(e.target.value) || 0 })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Weight (kg)</span>
                <input type="number" step="0.1" className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.weight} onChange={e => update({ weight: parseFloat(e.target.value) || 0 })} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Goal Weight (kg)</span>
                <input type="number" step="0.1" className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.goalWeight ?? ''} onChange={e => update({ goalWeight: parseFloat(e.target.value) || undefined })} placeholder="Optional" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">Body Fat % <Info className="w-3 h-3" /></span>
                <input type="number" step="0.1" className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.bodyFat ?? ''} onChange={e => update({ bodyFat: parseFloat(e.target.value) || undefined })} placeholder="Optional" />
              </label>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Activity Level</span>
              <div className="flex flex-col gap-1.5">
                {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                  <button key={key} onClick={() => update({ activityLevel: key as ActivityLevel })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${form.activityLevel === key ? 'border-primary bg-primary/10' : 'border-border bg-input'}`}>
                    <p className={`text-sm font-medium ${form.activityLevel === key ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                    <p className="text-[10px] text-muted-foreground">{ACTIVITY_DESCRIPTIONS[key]}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Fitness Goal</span>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_CARDS.map(g => (
                  <button key={g.value} onClick={() => update({ goal: g.value as FitnessGoal })}
                    className={`p-3 rounded-lg border text-center transition-all ${form.goal === g.value ? 'border-primary bg-primary/10' : 'border-border bg-input'}`}>
                    <span className="text-xl">{g.icon}</span>
                    <p className={`text-xs font-medium mt-1 ${form.goal === g.value ? 'text-primary' : 'text-foreground'}`}>{g.label}</p>
                    <p className="text-[10px] text-muted-foreground">{g.cal} cal</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Experience</span>
                <select className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.experience} onChange={e => update({ experience: e.target.value as ExperienceLevel })}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Days/Week</span>
                <input type="number" min={1} max={7} className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.daysPerWeek} onChange={e => update({ daysPerWeek: parseInt(e.target.value) || 3 })} />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Split</span>
              <select className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.preferredSplit} onChange={e => update({ preferredSplit: e.target.value as WorkoutSplit })}>
                {Object.entries(SPLIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
        ) : (
          <div className="glass-card divide-y divide-border">
            {[
              ['Full Name', p.name || 'Not set'],
              ['Age', `${p.age} years`],
              ['Sex', p.gender.charAt(0).toUpperCase() + p.gender.slice(1)],
              ['Height', `${p.height} cm`],
              ['Weight', `${p.weight} kg`],
              ['Goal Weight', p.goalWeight ? `${p.goalWeight} kg` : 'Not set'],
              ['Body Fat', p.bodyFat ? `${p.bodyFat}%` : 'Not set'],
              ['Activity', ACTIVITY_LABELS[p.activityLevel]],
              ['Goal', GOAL_LABELS[p.goal]],
              ['Split', SPLIT_LABELS[p.preferredSplit]],
              ['Days/Week', `${p.daysPerWeek}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between p-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nutrition Target */}
      <div className="px-5 mb-5">
        <CalorieMacroCard />
      </div>

      {/* Body Stats History */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Body Stats History</h3>
          <Button size="sm" variant="outline" onClick={() => setShowLogModal(true)}>Log New</Button>
        </div>
        <div className="glass-card p-4">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(220 10% 50%)' }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'hsl(220 10% 50%)' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={{ background: 'hsl(220 18% 10%)', border: '1px solid hsl(220 15% 18%)', borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="weight" stroke="hsl(145 80% 42%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(145 80% 42%)' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Log measurements to see trends</p>
          )}
          {bmi > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">BMI</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${bmiColor}`}>{bmi.toFixed(1)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${bmiColor} bg-card border border-border`}>{bmiLabel}</span>
              </div>
            </div>
          )}
          {weightLogs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Recent Measurements</p>
              {weightLogs.slice(0, 5).map(log => (
                <div key={log.id} className="flex justify-between py-1">
                  <span className="text-xs text-muted-foreground">{log.logged_at}</span>
                  <span className="text-xs font-bold text-foreground">{Number(log.weight)} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* XP Breakdown */}
      <div className="px-5 mb-5">
        <XPBreakdownCard />
      </div>

      {/* Achievements preview */}
      <div className="px-5 mb-5">
        <button onClick={() => navigate('/achievements')} className="flex items-center justify-between w-full mb-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Achievements</h3>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {gamification.achievements.filter(a => a.unlockedAt).slice(0, 6).map(a => (
            <div key={a.id} className="shrink-0 glass-card p-3 min-w-[80px] text-center">
              <span className="text-xl">{a.icon}</span>
              <p className="text-[10px] font-medium text-foreground mt-1 truncate">{a.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Settings</h3>
        <div className="glass-card divide-y divide-border">
          <div className="flex items-center justify-between p-3">
            <span className="text-sm text-foreground">Unit Preference</span>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground">Metric</button>
              <button className="px-3 py-1.5 text-xs font-medium bg-input text-muted-foreground">Imperial</button>
            </div>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 p-3 w-full text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowLogModal(false)}>
          <div className="w-full max-w-lg glass-card p-5 rounded-t-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-display font-bold text-foreground mb-4">Log Measurement</h3>
            <div className="flex flex-col gap-3 mb-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Weight (kg)</span>
                <input type="number" step="0.1" className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={logWeight} onChange={e => setLogWeight(e.target.value)} placeholder={`${profile.weight}`} autoFocus />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Body Fat % (optional)</span>
                <input type="number" step="0.1" className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={logBodyFat} onChange={e => setLogBodyFat(e.target.value)} placeholder="Optional" />
              </label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowLogModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-gradient-primary" onClick={handleLogMeasurement}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

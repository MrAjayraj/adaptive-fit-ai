import { useState, useRef } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, User, Save, Flame, Zap, Trophy, ChevronRight, LogOut, Info } from 'lucide-react';
import { xpForLevel, xpForNextLevel, getLevelTier } from '@/lib/gamification';
import { UserProfile, FitnessGoal, ExperienceLevel, WorkoutSplit, ActivityLevel, GOAL_LABELS, SPLIT_LABELS, ACTIVITY_LABELS } from '@/types/fitness';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import BottomNav from '@/components/layout/BottomNav';
import CalorieMacroCard from '@/components/profile/CalorieMacroCard';
import XPBreakdownCard from '@/components/profile/XPBreakdownCard';
import { uploadAvatar, getCachedAvatarUrl } from '@/services/api';

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

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

export default function Profile() {
  const { profile, gamification, weightLogs, signOut, updateWeight, setProfile, isLoading } = useFitness();
  const navigate = useNavigate();
  const { xp, level, streak } = gamification;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UserProfile | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logWeight, setLogWeight] = useState('');
  const [logBodyFat, setLogBodyFat] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(getCachedAvatarUrl);
  const [unitPref, setUnitPref] = useState<'metric' | 'imperial'>('metric');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="relative flex items-center justify-center w-12 h-12">
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary w-full h-full animate-spin" />
          <div className="absolute inset-0 rounded-full blur-[8px] bg-primary/20 w-full h-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const tier = getLevelTier(level);
  const nextLevelXP = xpForNextLevel(level);
  const currentLevelXP = xpForLevel(level);
  const xpProgress = nextLevelXP > currentLevelXP ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 100;

  const bmi = profile.height > 0 ? profile.weight / ((profile.height / 100) ** 2) : 0;
  const bmiLabel = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const bmiColor = bmi < 18.5 ? 'text-accent-alt' : bmi < 25 ? 'text-emerald-400' : bmi < 30 ? 'text-yellow-400' : 'text-red-400';

  const chartData = weightLogs.slice(0, 30).reverse().map(log => ({
    date: new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: Number(log.weight),
  }));

  const startEdit = () => { setForm({ ...profile }); setEditing(true); };
  const cancelEdit = () => { setForm(null); setEditing(false); };
  const saveEdit = () => { if (form) { setProfile(form); setEditing(false); setForm(null); toast.success('Profile updated'); } };
  const update = (fields: Partial<UserProfile>) => setForm(prev => prev ? { ...prev, ...fields } : prev);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      if (url) {
        setAvatarUrl(url);
        toast.success('Avatar updated');
      } else {
        toast.error('Failed to upload avatar');
      }
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

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

  const p = editing && form ? form : profile;
  const DETAILS = [
    ['Full Name', p.name || 'Not set'],
    ['Age', `${p.age} years`],
    ['Sex', p.gender.charAt(0).toUpperCase() + p.gender.slice(1)],
    ['Height', `${p.height} cm`],
    ['Weight', `${p.weight} kg`],
    ['Goal Wt', p.goalWeight ? `${p.goalWeight} kg` : 'Not set'],
    ['Body Fat', p.bodyFat ? `${p.bodyFat}%` : 'Not set'],
    ['Activity', ACTIVITY_LABELS[p.activityLevel]],
    ['Goal', GOAL_LABELS[p.goal]],
    ['Split', SPLIT_LABELS[p.preferredSplit]],
    ['Days/Wk', `${p.daysPerWeek}`],
  ];

  return (
    <div className="min-h-screen bg-canvas pb-[100px] font-sans">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full max-w-lg md:max-w-[1080px] mx-auto md:pl-[104px] md:pr-8 space-y-5 px-4 pt-14 md:pt-10 mb-8">
        {/* HEADER */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-1 border border-border-subtle flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-text-1" />
          </button>
          <h1 className="text-[18px] font-bold text-text-1">Profile</h1>
          {!editing ? (
            <button onClick={startEdit} className="px-4 py-2 rounded-full bg-surface-2 border border-border-subtle text-[13px] font-semibold text-text-1">Edit</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancelEdit} className="px-3 py-2 rounded-full bg-surface-2 border border-border-subtle text-[12px] text-text-2">Cancel</button>
              <button onClick={saveEdit} className="px-3 py-2 rounded-full bg-primary-accent text-canvas text-[12px] font-bold flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
            </div>
          )}
        </motion.div>

        {/* AVATAR + IDENTITY */}
        <motion.div variants={itemVariants} className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="absolute inset-[-6px] rounded-full border-2 border-primary-accent/40" />
            <div className="w-24 h-24 rounded-full bg-surface-2 flex items-center justify-center overflow-hidden border-2 border-surface-3">
              {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                : <User className="w-12 h-12 text-text-3" />
              }
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-accent flex items-center justify-center border-2 border-canvas disabled:opacity-60"
            >
              <Camera className="w-3.5 h-3.5 text-canvas" />
            </button>
            <div className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-primary-accent flex items-center justify-center">
              <span className="text-[10px] font-extrabold text-canvas">L{level}</span>
            </div>
          </div>
          <h2 className="text-[22px] font-bold text-text-1">{p.name || 'Athlete'}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[13px]">{tier.icon}</span>
            <span className="text-[13px] text-text-2 capitalize">{tier.tier} · Lv.{level}</span>
          </div>

          <div className="w-full max-w-xs mt-4">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-text-2">{xp} XP</span>
              <span className="text-primary-accent font-semibold">{nextLevelXP} XP</span>
            </div>
            <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-primary-accent to-accent-alt rounded-full" layoutId="xpBar"
                initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }} transition={{ type: 'spring' as const, stiffness: 50 }} />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-surface-1 border border-border-subtle rounded-full px-3 py-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[12px] font-bold text-text-1">{streak}</span>
              <span className="text-[11px] text-text-3">streak</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-1 border border-border-subtle rounded-full px-3 py-1.5">
              <Zap className="w-3.5 h-3.5 text-primary-accent" />
              <span className="text-[12px] font-bold text-text-1">{xp}</span>
              <span className="text-[11px] text-text-3">XP</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-1 border border-border-subtle rounded-full px-3 py-1.5">
              <Trophy className="w-3.5 h-3.5 text-primary-accent" />
              <span className="text-[12px] font-bold text-text-1">{gamification.prs.length}</span>
              <span className="text-[11px] text-text-3">PRs</span>
            </div>
          </div>
        </motion.div>

        {/* SPLIT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            {/* PERSONAL DETAILS */}
            <motion.div variants={itemVariants}>
              <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest mb-3 px-1">Personal Details</p>
              {editing && form ? (
                <div className="bg-surface-1 rounded-[20px] border border-border-subtle p-4 flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-text-3">Full Name</span>
                    <input className="bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[14px] text-text-1 outline-none focus:border-primary-accent/50" value={form.name} onChange={e => update({ name: e.target.value })} />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-text-3">Age</span>
                      <input type="number" className="bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[14px] text-text-1 outline-none" value={form.age} onChange={e => update({ age: parseInt(e.target.value) || 0 })} />
                    </label>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-text-3">Sex</span>
                      <div className="flex rounded-xl overflow-hidden border border-border-subtle">
                        {(['male', 'female', 'other'] as const).map(g => (
                          <button key={g} onClick={() => update({ gender: g })} className={`flex-1 py-2.5 text-[11px] font-semibold capitalize transition-colors ${form.gender === g ? 'bg-primary-accent text-canvas' : 'bg-surface-2 text-text-2'}`}>{g}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-text-3">Height (cm)</span>
                      <input type="number" className="bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[14px] text-text-1 outline-none" value={form.height} onChange={e => update({ height: parseInt(e.target.value) || 0 })} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-text-3">Weight (kg)</span>
                      <input type="number" step="0.1" className="bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[14px] text-text-1 outline-none" value={form.weight} onChange={e => update({ weight: parseFloat(e.target.value) || 0 })} />
                    </label>
                  </div>
                  {/* Additional form elements here... */}
                </div>
              ) : (
                <div className="bg-surface-1 rounded-[20px] border border-border-subtle overflow-hidden">
                  {DETAILS.map(([label, value], i) => (
                    <div key={label} className={`flex justify-between px-4 py-3 ${i < DETAILS.length - 1 ? 'border-b border-border-subtle' : ''}`}>
                      <span className="text-[13px] text-text-2">{label}</span>
                      <span className="text-[13px] font-semibold text-text-1">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* NUTRITION & XP BREAKDOWN */}
            <motion.div variants={itemVariants}>
              <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest mb-3 px-1">Nutrition</p>
              <CalorieMacroCard />
            </motion.div>
            <motion.div variants={itemVariants}>
              <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest mb-3 px-1">XP Breakdown</p>
              <XPBreakdownCard />
            </motion.div>
          </div>

          <div className="space-y-6">
            {/* BODY STATS */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest">Body Stats History</p>
                <button onClick={() => setShowLogModal(true)} className="px-3 py-1.5 rounded-full bg-primary-accent text-canvas text-[11px] font-bold">Log New</button>
              </div>
              <div className="bg-surface-1 rounded-[20px] border border-border-subtle p-4">
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" tick={{ fill: '#565660', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={8} />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: '#565660', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={8} width={32} />
                      <Tooltip contentStyle={{ background: '#252529', border: 'none', borderRadius: 12, color: '#FAFAFA', fontSize: 12 }} itemStyle={{ color: '#F5C518' }} />
                      <Line type="monotone" dataKey="weight" stroke="#F5C518" strokeWidth={2.5} dot={{ fill: '#F5C518', stroke: '#111113', strokeWidth: 2, r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-[13px] text-text-3 text-center py-8">Log measurements to see trends</p>
                )}
                {bmi > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
                    <span className="text-[12px] text-text-2">BMI</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[18px] font-extrabold ${bmiColor} tabular-nums`}>{bmi.toFixed(1)}</span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full bg-surface-2 border border-border-subtle ${bmiColor}`}>{bmiLabel}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* ACHIEVEMENTS */}
            <motion.div variants={itemVariants}>
              <button onClick={() => navigate('/achievements')} className="flex items-center justify-between w-full mb-3 px-1">
                <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest">Achievements</p>
                <ChevronRight className="w-4 h-4 text-text-3" />
              </button>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {gamification.achievements.filter(a => a.unlockedAt).slice(0, 6).map(a => (
                  <div key={a.id} className="shrink-0 w-[60px] h-[60px] rounded-full bg-surface-1 border border-border-subtle flex items-center justify-center text-xl">{a.icon}</div>
                ))}
              </div>
            </motion.div>

            {/* SETTINGS */}
            <motion.div variants={itemVariants}>
              <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest mb-3 px-1">Settings</p>
              <div className="bg-surface-1 rounded-[20px] border border-border-subtle overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                  <span className="text-[14px] font-medium text-text-1">Unit</span>
                  <div className="flex rounded-full overflow-hidden border border-border-subtle">
                    <button
                      onClick={() => setUnitPref('metric')}
                      className={`px-3.5 py-1.5 text-[12px] font-bold transition-colors ${unitPref === 'metric' ? 'bg-primary-accent text-canvas' : 'bg-surface-2 text-text-2'}`}
                    >Metric</button>
                    <button
                      onClick={() => setUnitPref('imperial')}
                      className={`px-3.5 py-1.5 text-[12px] font-medium transition-colors ${unitPref === 'imperial' ? 'bg-primary-accent text-canvas' : 'bg-surface-2 text-text-2'}`}
                    >Imperial</button>
                  </div>
                </div>
                <button onClick={signOut} className="flex items-center gap-2.5 p-4 w-full text-red-500 hover:bg-surface-2 transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span className="text-[14px] font-semibold">Sign Out</span>
                </button>
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>

      {/* LOG MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowLogModal(false)}>
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-lg bg-surface-1 border border-border-subtle p-5 rounded-t-[28px]" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-4" />
            <h3 className="text-[18px] font-bold text-text-1 mb-4">Log Measurement</h3>
            <div className="flex flex-col gap-3 mb-4">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-text-3">Weight (kg)</span>
                <input type="number" step="0.1" className="bg-surface-2 border border-border-subtle rounded-xl px-4 py-3 text-[14px] text-text-1 outline-none focus:border-primary-accent/50" value={logWeight} onChange={e => setLogWeight(e.target.value)} placeholder={`${profile.weight}`} autoFocus />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-text-3">Body Fat % (optional)</span>
                <input type="number" step="0.1" placeholder="Optional" className="bg-surface-2 border border-border-subtle rounded-xl px-4 py-3 text-[14px] text-text-1 outline-none focus:border-primary-accent/50" value={logBodyFat} onChange={e => setLogBodyFat(e.target.value)} />
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogModal(false)} className="flex-1 py-3.5 rounded-full bg-surface-2 border border-border-subtle text-[14px] font-semibold text-text-1">Cancel</button>
              <button onClick={handleLogMeasurement} className="flex-1 py-3.5 rounded-full bg-primary-accent text-canvas text-[14px] font-bold">Save</button>
            </div>
          </motion.div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}

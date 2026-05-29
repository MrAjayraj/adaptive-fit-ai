// src/components/profile/CustomFieldSheets.tsx
// FitPulse — Bespoke, high-fidelity mobile bottom sheets for profile property customization.
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Calendar, ChevronRight, Scale, Activity, Flame, Compass, Dumbbell, User, Info, Zap } from 'lucide-react';
import { toast } from 'sonner';

type FieldKey =
  | 'goalWeight' | 'bodyFat' | 'activityLevel'
  | 'goal' | 'preferredSplit' | 'workoutDays'
  | 'username' | 'name';

interface FieldDef {
  key: FieldKey;
  label: string;
  type: 'number' | 'select' | 'multiselect-days' | 'text';
  options?: { value: string; label: string; description?: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  dbKey: string;
}

interface CustomFieldSheetsProps {
  field: FieldDef | null;
  currentValue: any;
  onClose: () => void;
  onSave: (key: FieldKey, value: any) => void;
}

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Custom badges and icons for Goals
const GOAL_META: Record<string, { badge: string; icon: any; color: string; desc: string }> = {
  aggressive_cut: { badge: '–750 kcal/day', icon: Flame, color: 'text-red-400 border-red-500/20 bg-red-500/5', desc: 'Aggressive fat reduction' },
  lose_fat: { badge: '–500 kcal/day', icon: Flame, color: 'text-orange-400 border-orange-500/20 bg-orange-500/5', desc: 'Standard calorie deficit' },
  maintenance: { badge: '0 kcal/day', icon: Compass, color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5', desc: 'Fuel body at TDEE' },
  lean_bulk: { badge: '+250 kcal/day', icon: Zap, color: 'text-primary border-primary/20 bg-primary/5', desc: 'Build muscle, minimize fat' },
  build_muscle: { badge: '+500 kcal/day', icon: Dumbbell, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5', desc: 'Maximum hypertrophy focus' },
};

// Custom badges and icons for Splits
const SPLIT_META: Record<string, { badge: string; color: string }> = {
  push_pull_legs: { badge: '6 Days/Wk', color: 'text-primary border-primary/20 bg-primary/5' },
  upper_lower: { badge: '4 Days/Wk', color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
  full_body: { badge: '3 Days/Wk', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5' },
  bro_split: { badge: '5 Days/Wk', color: 'text-orange-400 border-orange-500/20 bg-orange-500/5' },
};

// Custom badges and icons for Activity Levels
const ACTIVITY_META: Record<string, { badge: string; color: string }> = {
  sedentary: { badge: 'Desk Job / Inactive', color: 'text-text-3 border-border/20 bg-surface-2' },
  lightly_active: { badge: '1–3 Days/Wk Active', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5' },
  moderately_active: { badge: '3–5 Days/Wk Training', color: 'text-primary border-primary/20 bg-primary/5' },
  very_active: { badge: 'Physical Job / Heavy Training', color: 'text-orange-400 border-orange-500/20 bg-orange-500/5' },
  extremely_active: { badge: 'Athletic Athlete / Daily Labor', color: 'text-red-400 border-red-500/20 bg-red-500/5' },
};

export default function CustomFieldSheets({ field, currentValue, onClose, onSave }: CustomFieldSheetsProps) {
  const [val, setVal] = useState<any>('');

  useEffect(() => {
    if (field) {
      setVal(currentValue ?? (field.type === 'multiselect-days' ? [] : ''));
    }
  }, [field, currentValue]);

  if (!field) return null;

  const handleSave = () => {
    if (field.type === 'number') {
      const n = parseFloat(String(val));
      if (isNaN(n) || n < (field.min ?? 0) || n > (field.max ?? 9999)) {
        toast.error(`Enter a value between ${field.min} and ${field.max}`);
        return;
      }
      onSave(field.key, n);
    } else if (field.type === 'multiselect-days') {
      if (Array.isArray(val) && val.length === 0) {
        toast.error('Select at least one workout day');
        return;
      }
      onSave(field.key, val);
    } else if (field.key === 'username') {
      const u = String(val).trim();
      if (u && (u.length < 3 || u.length > 20)) {
        toast.error('Username must be between 3 and 20 characters');
        return;
      }
      onSave(field.key, u);
    } else {
      onSave(field.key, val);
    }
    onClose();
  };

  const toggleDay = (dayIdx: number) => {
    setVal((prev: any) => {
      const currentDays = Array.isArray(prev) ? prev : [];
      if (currentDays.includes(dayIdx)) {
        return currentDays.filter(d => d !== dayIdx).sort();
      }
      return [...currentDays, dayIdx].sort();
    });
  };

  const adjustNumber = (amount: number) => {
    setVal((prev: any) => {
      const parsed = parseFloat(String(prev)) || 0;
      const next = parseFloat((parsed + amount).toFixed(1));
      return Math.min(field.max ?? 9999, Math.max(field.min ?? 0, next));
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-end justify-center"
      onClick={onClose}
    >
      {/* Dim sheet container */}
      <motion.div
        initial={{ y: 280, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 280, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="w-full max-w-lg bg-surface-1 border-t border-border-subtle rounded-t-[32px] p-6 pb-12 shadow-[0_-12px_40px_rgba(0,0,0,0.6)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Notch */}
        <div className="w-12 h-1.5 bg-surface-3 rounded-full mx-auto mb-5" />

        {/* Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[10px] uppercase font-bold text-text-3 tracking-widest">Update Settings</span>
            <h3 className="text-[20px] font-black text-text-1">{field.label}</h3>
          </div>
          <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center border border-border/20">
            {field.key === 'goalWeight' || field.key === 'bodyFat' ? <Scale className="w-4 h-4 text-primary" /> :
             field.key === 'workoutDays' ? <Calendar className="w-4 h-4 text-primary" /> :
             <Activity className="w-4 h-4 text-primary" />}
          </div>
        </div>

        {/* Bespoke renderers */}
        <div className="mb-6 max-h-[50vh] overflow-y-auto no-scrollbar">
          
          {/* 1. Day Picker Sheet */}
          {field.type === 'multiselect-days' && (
            <div className="space-y-5">
              <p className="text-[12px] text-text-2 text-center bg-surface-2/40 border border-border/10 p-3 rounded-2xl flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                Select which days of the week you plan to train. We use this to calculate and track your workout streaks.
              </p>
              
              <div className="flex justify-between gap-1.5 py-4 px-1 bg-surface-2/50 rounded-3xl border border-border/10">
                {DAYS_SHORT.map((day, idx) => {
                  const isSelected = Array.isArray(val) && val.includes(idx);
                  return (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleDay(idx)}
                      className={`relative w-11 h-11 rounded-full font-black text-[13px] flex flex-col items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-primary text-background shadow-md shadow-primary/20 scale-105' 
                          : 'bg-surface-3 text-text-2 hover:text-text-1'
                      }`}
                    >
                      <span>{day}</span>
                      {isSelected && (
                        <motion.span 
                          layoutId="activeDayDot"
                          className="absolute bottom-1.5 w-1 h-1 rounded-full bg-background"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2 justify-center py-2">
                {DAYS_FULL.map((day, idx) => {
                  const isSelected = Array.isArray(val) && val.includes(idx);
                  if (!isSelected) return null;
                  return (
                    <span key={idx} className="text-[11px] font-bold px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider animate-scale-in">
                      {day}
                    </span>
                  );
                })}
                {(!Array.isArray(val) || val.length === 0) && (
                  <span className="text-[11px] font-bold text-text-3 italic">No workout days selected yet</span>
                )}
              </div>
            </div>
          )}

          {/* 2. Metric Stepper Sheet */}
          {field.type === 'number' && (
            <div className="space-y-6">
              {/* Giant Numeric Value Display */}
              <div className="bg-surface-2 rounded-3xl border border-border/10 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-radial-gradient(circle at center, rgba(245,197,24,0.02), transparent 70%) pointer-events-none" />
                <span className="text-[10px] uppercase font-bold text-text-3 tracking-widest mb-1">Target Readout</span>
                <div className="flex items-baseline gap-1.5 justify-center">
                  <motion.span 
                    key={String(val)}
                    initial={{ scale: 0.95, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-[48px] font-extrabold text-text-1 tabular-nums tracking-tighter"
                  >
                    {val}
                  </motion.span>
                  <span className="text-[20px] font-bold text-primary lowercase">{field.unit}</span>
                </div>
                
                {/* Visual gauge slider */}
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={parseFloat(String(val)) || (field.min ?? 0)}
                  onChange={e => setVal(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-surface-3 rounded-full appearance-none cursor-pointer mt-5 accent-primary"
                />
              </div>

              {/* Incremental Adjusters Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => adjustNumber(-10)}
                  className="py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-[12px] font-bold text-text-2 active:scale-95 transition-all border border-border/10"
                >
                  –10 {field.unit}
                </button>
                <button
                  onClick={() => adjustNumber(-1)}
                  className="py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-[12px] font-bold text-text-2 active:scale-95 transition-all border border-border/10"
                >
                  –1 {field.unit}
                </button>
                <button
                  onClick={() => adjustNumber(-0.1)}
                  className="py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-[12px] font-bold text-text-2 active:scale-95 transition-all border border-border/10"
                >
                  –0.1 {field.unit}
                </button>

                <button
                  onClick={() => adjustNumber(10)}
                  className="py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-[12px] font-bold text-text-2 active:scale-95 transition-all border border-border/10"
                >
                  +10 {field.unit}
                </button>
                <button
                  onClick={() => adjustNumber(1)}
                  className="py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-[12px] font-bold text-text-2 active:scale-95 transition-all border border-border/10"
                >
                  +1 {field.unit}
                </button>
                <button
                  onClick={() => adjustNumber(0.1)}
                  className="py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-[12px] font-bold text-text-2 active:scale-95 transition-all border border-border/10"
                >
                  +0.1 {field.unit}
                </button>
              </div>

              {/* Direct Input fallback */}
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-semibold text-text-3 whitespace-nowrap">Or enter directly:</span>
                <input
                  type="number"
                  value={String(val)}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  onChange={e => setVal(e.target.value)}
                  className="w-full bg-surface-2 border border-border-subtle rounded-xl px-4 py-2.5 text-[14px] text-text-1 font-bold outline-none focus:border-primary/50 text-center"
                />
              </div>
            </div>
          )}

          {/* 3. Volumetric Custom Selection Card Chips */}
          {field.type === 'select' && (
            <div className="space-y-2.5">
              {field.options?.map(opt => {
                const isSelected = val === opt.value;
                const isGoal = field.key === 'goal';
                const isSplit = field.key === 'preferredSplit';
                const isActivity = field.key === 'activityLevel';

                // Get injected metadata
                const meta = isGoal ? GOAL_META[opt.value] : null;
                const splitMeta = isSplit ? SPLIT_META[opt.value] : null;
                const actMeta = isActivity ? ACTIVITY_META[opt.value] : null;

                const CardIcon = meta?.icon || (isSelected ? Check : ChevronRight);

                return (
                  <button
                    key={opt.value}
                    onClick={() => setVal(opt.value)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.99] ${
                      isSelected
                        ? 'border-primary/50 bg-primary/5 shadow-md shadow-primary/5 scale-[1.01]'
                        : 'border-border/30 bg-surface-2/60 hover:bg-surface-2 hover:border-border/60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 pr-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-primary text-background' : 'bg-surface-3 text-text-2'
                      }`}>
                        {isGoal && meta?.icon ? (
                          <meta.icon className="w-4 h-4" />
                        ) : (
                          <Dumbbell className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[14px] font-bold text-text-1">{opt.label}</p>
                          {meta?.badge && (
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.color}`}>
                              {meta.badge}
                            </span>
                          )}
                          {splitMeta?.badge && (
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${splitMeta.color}`}>
                              {splitMeta.badge}
                            </span>
                          )}
                          {actMeta?.badge && (
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${actMeta.color}`}>
                              {actMeta.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-text-3 mt-0.5 line-clamp-1">{opt.description}</p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 ml-3">
                        <Check className="w-3 h-3 text-background" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 4. Text Input Sheets */}
          {field.type === 'text' && (
            <div className="space-y-4">
              <div className="bg-surface-2 border border-border/10 rounded-2xl p-4">
                <input
                  type="text"
                  value={String(val)}
                  onChange={e => {
                    if (field.key === 'username') {
                      // lowercase, alphanumeric + underscores
                      setVal(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    } else {
                      setVal(e.target.value);
                    }
                  }}
                  placeholder={`Enter ${field.label}`}
                  className="w-full bg-transparent text-[16px] font-bold text-text-1 outline-none border-b border-border/30 focus:border-primary py-2 transition-all"
                  autoFocus
                />
              </div>
              {field.key === 'username' ? (
                <p className="text-[11px] text-text-3 flex items-center gap-1.5 px-1 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                  Your username must be unique, lowercase, and contain only letters, numbers, or underscores (3–20 chars).
                </p>
              ) : (
                <p className="text-[11px] text-text-3 flex items-center gap-1.5 px-1">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                  Your full name will be shown publicly to friends and challenge participants.
                </p>
              )}
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-full bg-surface-2 hover:bg-surface-3 text-[14px] font-bold text-text-1 active:scale-95 transition-all border border-border/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-4 rounded-full bg-primary text-background text-[14px] font-black uppercase tracking-wider hover:bg-primary-hover active:scale-95 transition-all shadow-lg shadow-primary/10"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

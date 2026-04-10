import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserProfileRow } from '@/types/index';
import { Flame, TrendingUp, Dumbbell, Scale, Zap, Check, ChevronLeft, Activity } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = 6;

const GOAL_OPTIONS = [
  { id: 'lose_fat', label: 'Lose Fat', icon: <Flame />, desc: 'Burn fat while preserving muscle', target: '-500 cal deficit', color: '#EF4444' },
  { id: 'lean_bulk', label: 'Lean Bulk', icon: <TrendingUp />, desc: 'Build muscle with minimal fat', target: '+250 cal surplus', color: '#00BFA5' },
  { id: 'build_muscle', label: 'Build Muscle', icon: <Dumbbell />, desc: 'Maximum muscle growth', target: '+500 cal surplus', color: '#00E676' },
  { id: 'maintain', label: 'Maintain', icon: <Scale />, desc: 'Stay where you are', target: '0 cal adjustment', color: '#94A3B8' },
  { id: 'aggressive_cut', label: 'Aggressive Cut', icon: <Zap />, desc: 'Rapid fat loss', target: '-750 cal deficit', color: '#eab308' },
];

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, very little movement' },
  { id: 'lightly_active', label: 'Lightly Active', desc: 'Light walking, some movement' },
  { id: 'moderately_active', label: 'Moderately Active', desc: 'Regular daily activity' },
  { id: 'very_active', label: 'Very Active', desc: 'Physical job or lots of walking' },
  { id: 'extremely_active', label: 'Extremely Active', desc: 'Athlete or labor-intensive job' },
];

export default function OnboardingFlow() {
  const { session, isGuest } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = right, -1 = left
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<Partial<UserProfileRow>>({
    age: 25,
    gender: 'Male',
    height: 175,
    weight: 70,
    unit_preference: 'metric',
    goal: '',
    activity_level: 'moderately_active',
    goal_weight_kg: null,
  });

  const updateForm = (updates: Partial<UserProfileRow>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    setDirection(1);
    setStep(s => Math.min(s + 1, STEPS));
  };

  const prevStep = () => {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 1));
  };

  const handleFinish = async () => {
    if (!session?.user && !isGuest) {
      toast.error('Authentication Error');
      return;
    }
    
    setIsSaving(true);
    try {
      const name = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Athlete';
      
      // 1. Save Profile via api.ts unified interface
      const { upsertProfile } = await import('@/services/api');
      await upsertProfile({
        name,
        age: form.age,
        gender: form.gender,
        height: form.height,
        goal: form.goal,
        experience: 'intermediate', // Defaulting for now
        days_per_week: 4,
        preferred_split: 'push_pull_legs',
        activity_level: form.activity_level,
        goal_weight_kg: form.goal_weight_kg,
        unit_preference: form.unit_preference,
        avatar_url: session?.user?.user_metadata?.avatar_url || null,
        onboarding_complete: true,
      });

      if (session?.user) {
        // 2. Initialize Season Rank (Iron III)
        const now = new Date();
        const seasonId = `season-${now.getFullYear()}-${now.getMonth() + 1}`;
        await supabase.from('user_ranks').insert({
          user_id: session.user.id,
          season_id: seasonId,
          rp: 0,
          tier: 'iron',
          division: 3
        }).catch(console.warn); // ignore if fails

        // 3. Initialize Streaks
        await supabase.from('user_streaks').insert({
          user_id: session.user.id,
          current_streak: 0,
          longest_streak: 0,
          streak_freezes_remaining: 2,
          streak_freeze_used_this_week: false
        }).catch(console.warn);

        // 4. Record initial body stats weight
        await supabase.from('body_stats_log').insert({
          user_id: session.user.id,
          weight_kg: form.weight,
          logged_at: new Date().toISOString()
        }).catch(console.warn);
      }

      toast.success(`Welcome to Fit Pulse, ${name.split(' ')[0]}! 💪`);
      
      // Give local fitness context a moment to hydrate before switching routes
      setTimeout(() => navigate('/home'), 300);

    } catch (e) {
      console.error(e);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  const name = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'Athlete';
  const avatar = session?.user?.user_metadata?.avatar_url;

  return (
    <div className="fixed inset-0 bg-canvas flex flex-col pt-safe px-6 pb-8 overflow-hidden selection:bg-primary/20">
      
      {/* HEADER NAV */}
      <div className="flex items-center justify-between h-12 relative w-full shrink-0 z-50">
        {step > 1 ? (
          <button onClick={prevStep} className="text-text-2 hover:text-text-1 flex items-center gap-1 -ml-2 p-2">
            <ChevronLeft size={20} /> <span className="text-[14px]">Back</span>
          </button>
        ) : (
          <div className="w-[60px]" />
        )}

        <div className="flex gap-2">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i + 1 === step ? 'bg-primary' : i + 1 < step ? 'bg-primary/50' : 'bg-surface-3'
              }`} 
            />
          ))}
        </div>

        {step === 4 || step === 5 ? (
          <button onClick={nextStep} className="text-text-2 hover:text-text-1 text-[14px] p-2 -mr-2">
            Skip
          </button>
        ) : (
          <div className="w-[60px]" />
        )}
      </div>

      <div className="flex-1 relative mt-8 h-full min-h-0">
        <AnimatePresence custom={direction} initial={false} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0 flex flex-col"
          >
            {/* STEP 1: WELCOME */}
            {step === 1 && (
              <div className="flex flex-col items-center justify-center flex-1 h-full pb-20">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-border bg-surface-2 flex items-center justify-center">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Activity size={32} className="text-text-3" />
                    )}
                  </div>
                  <motion.div 
                    initial={{ pathLength: 0 }} 
                    animate={{ pathLength: 1 }} 
                    transition={{ duration: 1, ease: 'easeInOut', delay: 0.2 }}
                    className="absolute -inset-1 rounded-full border-[2px] border-primary" 
                  />
                </div>
                <h1 className="text-3xl font-bold text-center">Welcome, <span className="text-text-1">{name}</span>!</h1>
                <p className="text-[14px] text-text-2 mt-3 text-center max-w-[250px]">
                  Let's set up your Fit Pulse profile in under a minute.
                </p>
                <div className="absolute bottom-4 left-0 right-0">
                   <button onClick={nextStep} className="w-full h-[52px] bg-primary text-[#06090D] font-bold text-[15px] rounded-[14px]">Let's Go</button>
                </div>
              </div>
            )}

            {/* STEP 2: BODY STATS */}
            {step === 2 && (
              <div className="flex flex-col flex-1 h-full pb-20">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold">About You</h2>
                  <p className="text-[13px] text-text-2 mt-1">Foundation for your metrics.</p>
                </div>

                <div className="flex flex-col gap-6 overflow-y-auto pb-10 hide-scrollbar">
                  {/* Age */}
                  <div className="bg-surface-1 border border-border p-5 rounded-[20px]">
                     <p className="text-[11px] font-medium text-text-2 uppercase tracking-wider mb-2">Age</p>
                     <div className="flex items-center justify-between">
                        <button onClick={() => updateForm({ age: Math.max(13, (form.age || 25) - 1)})} className="w-10 h-10 bg-surface-3 rounded-full flex items-center justify-center text-text-2">-</button>
                        <span className="text-4xl font-bold tracking-tight">{form.age}</span>
                        <button onClick={() => updateForm({ age: Math.min(100, (form.age || 25) + 1)})} className="w-10 h-10 bg-surface-3 rounded-full flex items-center justify-center text-text-2">+</button>
                     </div>
                  </div>

                  {/* Sex */}
                  <div className="bg-surface-1 border border-border p-5 rounded-[20px]">
                    <p className="text-[11px] font-medium text-text-2 uppercase tracking-wider mb-3">Biological Sex</p>
                    <div className="flex gap-2">
                       {['Male', 'Female', 'Other'].map(s => (
                         <button 
                           key={s} 
                           onClick={() => updateForm({ gender: s })}
                           className={`flex-1 h-10 rounded-xl text-[13px] transition-colors border ${form.gender === s ? 'bg-primary/10 border-primary/50 text-primary font-medium' : 'bg-surface-3 border-transparent text-text-2'}`}
                         >
                           {s}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     {/* Height */}
                     <div className="bg-surface-1 border border-border p-5 rounded-[20px] flex flex-col">
                        <p className="text-[11px] font-medium text-text-2 uppercase tracking-wider mb-2">Height</p>
                        <div className="flex items-end gap-1 mt-auto">
                          <input 
                            type="number" 
                            className="w-full bg-transparent text-4xl font-bold tracking-tight px-0 py-0 focus:outline-none focus:ring-0" 
                            value={form.height || ''} 
                            onChange={e => updateForm({ height: parseInt(e.target.value) || 0 })} 
                          />
                          <span className="text-[13px] text-text-3 font-medium mb-1">cm</span>
                        </div>
                     </div>
                     {/* Weight */}
                     <div className="bg-surface-1 border border-border p-5 rounded-[20px] flex flex-col">
                        <p className="text-[11px] font-medium text-text-2 uppercase tracking-wider mb-2">Weight</p>
                        <div className="flex items-end gap-1 mt-auto">
                          <input 
                            type="number" 
                            className="w-full bg-transparent text-4xl font-bold tracking-tight px-0 py-0 focus:outline-none focus:ring-0" 
                            value={form.weight || ''} 
                            onChange={e => updateForm({ weight: parseFloat(e.target.value) || 0 })} 
                          />
                          <span className="text-[13px] text-text-3 font-medium mb-1">kg</span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="absolute bottom-4 left-0 right-0">
                   <button 
                     onClick={nextStep} 
                     disabled={!form.height || !form.weight}
                     className="w-full h-[52px] bg-primary text-[#06090D] font-bold text-[15px] rounded-[14px] disabled:opacity-50"
                   >
                     Continue
                   </button>
                </div>
              </div>
            )}

            {/* STEP 3: FITNESS GOAL */}
            {step === 3 && (
              <div className="flex flex-col flex-1 h-full pb-20">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">What's your goal?</h2>
                  <p className="text-[13px] text-text-2 mt-1">We'll personalize your calorie targets.</p>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto pb-10 hide-scrollbar">
                  {GOAL_OPTIONS.map(g => (
                    <button
                      key={g.id}
                      onClick={() => updateForm({ goal: g.id })}
                      className={`relative flex items-center p-4 rounded-[20px] text-left transition-all border ${form.goal === g.id ? 'bg-primary/5 border-primary/40' : 'bg-surface-1 border-border'}`}
                    >
                      {form.goal === g.id && (
                        <div className="absolute inset-0 rounded-[20px] shadow-[0_0_20px_rgba(0,230,118,0.06)] pointer-events-none" />
                      )}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border" style={{ color: g.color, background: `${g.color}15` }}>
                        {React.cloneElement(g.icon, { size: 18 })}
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="font-semibold text-[15px] text-text-1">{g.label}</p>
                        <p className="text-[11px] text-text-2 mt-0.5">{g.desc}</p>
                      </div>
                      <div className="text-right ml-2 shrink-0 flex flex-col items-end">
                        <span className="text-[10px] font-medium" style={{ color: g.color }}>{g.target}</span>
                        {form.goal === g.id && <Check size={16} className="text-primary mt-1" />}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="absolute bottom-4 left-0 right-0 pt-4 bg-gradient-to-t from-canvas via-canvas">
                   <button 
                     onClick={nextStep} 
                     disabled={!form.goal}
                     className="w-full h-[52px] bg-primary text-[#06090D] font-bold text-[15px] rounded-[14px] disabled:opacity-50"
                   >
                     Continue
                   </button>
                </div>
              </div>
            )}

            {/* STEP 4: ACTIVITY LEVEL */}
            {step === 4 && (
              <div className="flex flex-col flex-1 h-full pb-20">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">How active are you?</h2>
                  <p className="text-[13px] text-text-2 mt-1">Outside of your workouts.</p>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto pb-10 hide-scrollbar">
                  {ACTIVITY_OPTIONS.map(a => (
                    <button
                      key={a.id}
                      onClick={() => updateForm({ activity_level: a.id })}
                      className={`flex items-center p-4 rounded-[20px] text-left transition-colors border ${form.activity_level === a.id ? 'bg-surface-2 border-text-3' : 'bg-surface-1 border-border'}`}
                    >
                      <div className="w-5 h-5 rounded-full border border-text-3 flex items-center justify-center mr-4 shrink-0">
                         {form.activity_level === a.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <p className={`font-semibold text-[15px] ${form.activity_level === a.id ? 'text-text-1' : 'text-text-2'}`}>{a.label}</p>
                        <p className="text-[11px] text-text-3 mt-0.5">{a.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="absolute bottom-4 left-0 right-0 pt-4">
                   <button onClick={nextStep} className="w-full h-[52px] bg-primary text-[#06090D] font-bold text-[15px] rounded-[14px]">Continue</button>
                </div>
              </div>
            )}

            {/* STEP 5: GOAL WEIGHT */}
            {step === 5 && (
              <div className="flex flex-col flex-1 h-full pb-20">
                <div className="mb-12">
                  <h2 className="text-2xl font-bold">Set a target weight</h2>
                  <p className="text-[13px] text-text-2 mt-1">Optional — helps track your journey.</p>
                </div>

                <div className="flex-1 flex flex-col items-center">
                   <div className="relative">
                      <input 
                        type="number" 
                        placeholder={form.weight?.toString() || "70"}
                        className="bg-transparent text-center text-7xl font-bold tracking-tight focus:outline-none w-[200px]" 
                        value={form.goal_weight_kg || ''} 
                        onChange={e => updateForm({ goal_weight_kg: parseFloat(e.target.value) || undefined })} 
                      />
                      <span className="absolute -right-4 bottom-2 text-xl text-text-3 font-semibold">kg</span>
                   </div>
                   
                   {form.weight && form.goal_weight_kg && (
                     <motion.div 
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className={`mt-8 px-4 py-2 rounded-full border font-medium text-[13px] flex items-center gap-2 ${
                         form.goal_weight_kg > form.weight ? 'bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]' : 'bg-primary/10 border-primary/30 text-primary'
                       }`}
                     >
                        <span>{form.weight} kg → {form.goal_weight_kg} kg</span>
                        <span className="opacity-80">
                          ({form.goal_weight_kg > form.weight ? '+' : ''}{(form.goal_weight_kg - form.weight).toFixed(1)} kg)
                        </span>
                     </motion.div>
                   )}
                </div>

                <div className="absolute bottom-4 left-0 right-0 pt-4 flex gap-3">
                   <button onClick={nextStep} className="flex-1 h-[52px] bg-primary text-[#06090D] font-bold text-[15px] rounded-[14px]">Continue</button>
                </div>
              </div>
            )}

            {/* STEP 6: READY! */}
            {step === 6 && (
              <div className="flex flex-col items-center justify-center flex-1 h-full pb-20">
                <motion.div 
                   initial={{ scale: 0.5, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   transition={{ type: 'spring', delay: 0.1 }}
                   className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 relative"
                >
                  <motion.div
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    style={{ strokeDasharray: '1 1' }}
                  />
                  <Check size={40} />
                </motion.div>
                
                <h2 className="text-3xl font-bold mb-8">You're all set!</h2>

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="w-full bg-surface-1 border border-border p-6 rounded-[24px]"
                >
                  <p className="text-center font-bold text-xl text-primary mb-2">Daily Target: 2,347 kcal</p>
                  <p className="text-center text-[12px] text-text-2 mb-6">Protein: 178g · Carbs: 264g · Fat: 65g</p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-surface-2 p-3 rounded-xl">
                       <span className="text-[12px] text-text-2 uppercase font-medium">Goal</span>
                       <span className="text-[14px] font-semibold">{GOAL_OPTIONS.find(g => g.id === form.goal)?.label}</span>
                    </div>
                    <div className="flex justify-between items-center bg-surface-2 p-3 rounded-xl">
                       <span className="text-[12px] text-text-2 uppercase font-medium">Rank</span>
                       <span className="text-[14px] font-semibold text-text-3">Starts at Iron III</span>
                    </div>
                  </div>
                </motion.div>

                <div className="absolute bottom-4 left-0 right-0">
                   <button 
                     onClick={handleFinish} 
                     disabled={isSaving}
                     className="w-full h-[52px] bg-primary text-[#06090D] font-bold text-[15px] rounded-[14px] disabled:opacity-50 flex items-center justify-center"
                   >
                     {isSaving ? <Activity className="animate-spin w-5 h-5 text-current opacity-70" /> : 'Start Training'}
                   </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

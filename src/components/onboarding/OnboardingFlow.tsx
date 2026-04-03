import React, { useState } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { UserProfile, FitnessGoal, ExperienceLevel, Gender, WorkoutSplit } from '@/types/fitness';
import { Button } from '@/components/ui/button';
import { Dumbbell, Target, User, Zap, ChevronRight, ChevronLeft } from 'lucide-react';

const STEPS = ['Welcome', 'Basic Info', 'Goals', 'Schedule'];

const defaultProfile: UserProfile = {
  name: '',
  age: 25,
  gender: 'male',
  weight: 70,
  height: 175,
  bodyFat: undefined,
  activityLevel: 'moderately_active',
  goal: 'build_muscle',
  experience: 'intermediate',
  daysPerWeek: 4,
  preferredSplit: 'push_pull_legs',
  onboardingComplete: false,
};

export default function OnboardingFlow() {
  const { setProfile, generatePlan } = useFitness();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<UserProfile>(defaultProfile);

  const update = (fields: Partial<UserProfile>) => setForm(prev => ({ ...prev, ...fields }));

  const handleComplete = () => {
    const completed = { ...form, onboardingComplete: true };
    setProfile(completed);
    setTimeout(() => generatePlan(), 100);
  };

  const canProceed = () => {
    if (step === 1) return form.name.trim().length > 0;
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress bar */}
      <div className="flex gap-1.5 p-4 pt-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= step ? 'bg-gradient-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col px-6 pb-6 animate-fade-in" key={step}>
        {step === 0 && (
          <div className="flex-1 flex flex-col justify-center items-center text-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center animate-pulse-glow">
              <Dumbbell className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-3">
                FitAI
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Your intelligent fitness companion. Adaptive workouts that evolve with you.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
              {[
                { icon: Target, text: 'Personalized plans' },
                { icon: Zap, text: 'Smart progression' },
                { icon: User, text: 'Fatigue detection' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="glass-card flex items-center gap-3 p-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-foreground text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 flex flex-col pt-8 gap-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-1">About You</h2>
              <p className="text-muted-foreground text-sm">Let's get to know you</p>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">Name</span>
                <input
                  className="bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Your name"
                  value={form.name}
                  onChange={e => update({ name: e.target.value })}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm text-muted-foreground">Age</span>
                  <input
                    type="number"
                    className="bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={form.age}
                    onChange={e => update({ age: parseInt(e.target.value) || 0 })}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm text-muted-foreground">Gender</span>
                  <select
                    className="bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={form.gender}
                    onChange={e => update({ gender: e.target.value as Gender })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm text-muted-foreground">Weight (kg)</span>
                  <input
                    type="number"
                    className="bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={form.weight}
                    onChange={e => update({ weight: parseFloat(e.target.value) || 0 })}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm text-muted-foreground">Height (cm)</span>
                  <input
                    type="number"
                    className="bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={form.height}
                    onChange={e => update({ height: parseInt(e.target.value) || 0 })}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">Body Fat % <span className="text-xs opacity-60">(optional — improves calorie accuracy)</span></span>
                <input
                  type="number"
                  className="bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.bodyFat ?? ''}
                  onChange={e => update({ bodyFat: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g. 15"
                />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col pt-8 gap-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-1">Your Goal</h2>
              <p className="text-muted-foreground text-sm">What are you training for?</p>
            </div>

            <div className="flex flex-col gap-2">
              {([
                { value: 'build_muscle', label: '💪 Build Muscle', desc: 'Hypertrophy focused' },
                { value: 'lose_fat', label: '🔥 Lose Fat', desc: 'Cut with muscle preservation' },
                { value: 'strength', label: '🏋️ Build Strength', desc: 'Powerlifting style' },
                { value: 'endurance', label: '🏃 Endurance', desc: 'Stamina and conditioning' },
                { value: 'general', label: '⚡ General Fitness', desc: 'Balanced approach' },
              ] as { value: FitnessGoal; label: string; desc: string }[]).map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => update({ goal: value })}
                  className={`glass-card p-4 text-left transition-all duration-200 ${
                    form.goal === value
                      ? 'glow-border'
                      : 'hover:border-muted-foreground/30'
                  }`}
                >
                  <span className="text-foreground font-medium">{label}</span>
                  <span className="text-muted-foreground text-xs block mt-0.5">{desc}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4 mt-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">Experience Level</span>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => update({ experience: lvl })}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize transition-all ${
                        form.experience === lvl
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col pt-8 gap-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-1">Schedule</h2>
              <p className="text-muted-foreground text-sm">How do you like to train?</p>
            </div>

            <label className="flex flex-col gap-3">
              <span className="text-sm text-muted-foreground">Days per week</span>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(d => (
                  <button
                    key={d}
                    onClick={() => update({ daysPerWeek: d })}
                    className={`flex-1 py-3 rounded-lg text-lg font-bold transition-all ${
                      form.daysPerWeek === d
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </label>

            <label className="flex flex-col gap-3">
              <span className="text-sm text-muted-foreground">Preferred Split</span>
              <div className="flex flex-col gap-2">
                {([
                  { value: 'push_pull_legs', label: 'Push / Pull / Legs' },
                  { value: 'upper_lower', label: 'Upper / Lower' },
                  { value: 'full_body', label: 'Full Body' },
                  { value: 'bro_split', label: 'Body Part Split' },
                ] as { value: WorkoutSplit; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => update({ preferredSplit: value })}
                    className={`glass-card p-3.5 text-left transition-all ${
                      form.preferredSplit === value
                        ? 'glow-border'
                        : 'hover:border-muted-foreground/30'
                    }`}
                  >
                    <span className="text-foreground font-medium text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </label>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              <Zap className="w-4 h-4" />
              Generate My Plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

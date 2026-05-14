import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { saveFighterProfile } from '@/services/mmaService';
import { useAuth } from '@/context/AuthContext';

type Step = 1 | 2 | 3 | 4;

interface MmaOnboardingProps {
  onComplete: (openQuickLog?: boolean) => void;
}

const BG     = '#0d0d0d';
const CARD   = '#161616';
const CARD2  = '#1e1e1e';
const ACCENT = '#1ed760';
const T1     = '#ffffff';
const T2     = '#aaaaaa';
const T3     = '#555555';
const BORDER = 'rgba(255,255,255,0.08)';

const SPORT_MAP: Record<string, string> = {
  striking: 'boxing', grappling: 'bjj', mma: 'mma',
};

export function MmaOnboarding({ onComplete }: MmaOnboardingProps) {
  const { user } = useAuth();
  const [step,         setStep]         = useState<Step>(1);
  const [primarySport, setPrimarySport] = useState<string | null>(null);
  const [experience,   setExperience]   = useState<string | null>(null);
  const [stance,       setStance]       = useState<string | null>(null);
  const [isSaving,     setIsSaving]     = useState(false);
  const [saveError,    setSaveError]    = useState(false);

  const canNext =
    (step === 1 && !!primarySport) ||
    (step === 2 && !!experience)   ||
    (step === 3 && !!stance);

  const handleNext = () => {
    if (!canNext) return;
    if (step === 2 && primarySport === 'grappling') { setStep(4); return; }
    setStep(s => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step === 4 && primarySport === 'grappling') { setStep(2); return; }
    setStep(s => (s - 1) as Step);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveError(false);
    const saved = await saveFighterProfile({
      user_id: user.id,
      primary_sport_slug: SPORT_MAP[primarySport || 'mma'] || 'mma',
      experience_level: experience,
      stance: stance || 'Orthodox',
      onboarding_complete: true,
      streak_current: 0,
      streak_longest: 0,
    });
    setIsSaving(false);
    if (!saved) {
      setSaveError(true);
      return;
    }
    onComplete(true); // pass true → dashboard opens QuickLog immediately
  };

  const progressDots = primarySport === 'grappling' ? 2 : 3;
  const currentDot   = step === 4 ? progressDots : step;

  return (
    <div style={{ background: BG, minHeight: '100dvh', padding: 'max(16px,env(safe-area-inset-top)) 20px 24px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
        {step > 1 && step < 4 && (
          <button onClick={handleBack} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: T1, cursor: 'pointer', marginLeft: -8, flexShrink: 0 }}>
            <ChevronLeft size={24} />
          </button>
        )}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 6 }}>
          {Array.from({ length: progressDots }, (_, i) => (
            <div key={i} style={{ width: 28, height: 4, borderRadius: 2, background: currentDot > i ? ACCENT : CARD2, transition: 'background 0.3s' }} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1 — Primary Sport */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} style={{ flex: 1 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: T1, marginBottom: 8 }}>What's your primary focus?</h1>
            <p style={{ fontSize: 15, color: T2, marginBottom: 32, lineHeight: 1.5 }}>This determines which techniques appear first. You can log any sport anytime.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <OptionCard title="Striking" desc="Boxing, Muay Thai, Kickboxing" icon="🥊" selected={primarySport === 'striking'} onClick={() => setPrimarySport('striking')} />
              <OptionCard title="Grappling" desc="Wrestling, BJJ, Judo" icon="🤼" selected={primarySport === 'grappling'} onClick={() => setPrimarySport('grappling')} />
              <OptionCard title="MMA" desc="I train both striking and grappling" icon="⚔️" selected={primarySport === 'mma'} onClick={() => setPrimarySport('mma')} />
            </div>
          </motion.div>
        )}

        {/* Step 2 — Experience */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} style={{ flex: 1 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: T1, marginBottom: 8 }}>Your experience level</h1>
            <p style={{ fontSize: 15, color: T2, marginBottom: 32, lineHeight: 1.5 }}>We'll adjust mastery thresholds so early progress feels real.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <OptionCard title="Complete beginner" desc="I have never trained martial arts" selected={experience === 'beginner'} onClick={() => setExperience('beginner')} />
              <OptionCard title="Some experience" desc="I have trained but not consistently" selected={experience === 'some'} onClick={() => setExperience('some')} />
              <OptionCard title="Experienced" desc="I train regularly at a gym" selected={experience === 'experienced'} onClick={() => setExperience('experienced')} />
              <OptionCard title="Competitive" desc="I compete or have competed" selected={experience === 'competitive'} onClick={() => setExperience('competitive')} />
            </div>
          </motion.div>
        )}

        {/* Step 3 — Stance */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} style={{ flex: 1 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: T1, marginBottom: 8 }}>Your stance</h1>
            <p style={{ fontSize: 15, color: T2, marginBottom: 32, lineHeight: 1.5 }}>Helps personalize striking technique cues.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <OptionCard title="Orthodox" desc="Left foot forward — most common" icon="👊" selected={stance === 'Orthodox'} onClick={() => setStance('Orthodox')} />
              <OptionCard title="Southpaw" desc="Right foot forward" icon="🤛" selected={stance === 'Southpaw'} onClick={() => setStance('Southpaw')} />
              <OptionCard title="Unsure" desc="I'm still figuring it out" selected={stance === 'Unsure'} onClick={() => setStance('Unsure')} />
            </div>
          </motion.div>
        )}

        {/* Step 4 — Profile Ready */}
        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
              style={{ width: 88, height: 88, borderRadius: '50%', background: `${ACCENT}22`, border: `2px solid ${ACCENT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
            >
              <Check size={44} color={ACCENT} />
            </motion.div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: T1, marginBottom: 12 }}>Your training profile is ready</h1>
            <p style={{ fontSize: 15, color: T2, maxWidth: 280, lineHeight: 1.6, marginBottom: 32 }}>
              Let's log your first reps. Your dashboard comes alive the moment you start tracking.
            </p>
            {/* Profile summary card */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, width: '100%', textAlign: 'left' }}>
              {[
                { label: 'Focus',      value: primarySport },
                { label: 'Level',      value: experience },
                ...(primarySport !== 'grappling' ? [{ label: 'Stance', value: stance }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ color: T2, fontSize: 14 }}>{row.label}</span>
                  <span style={{ color: T1, fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom CTA */}
      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
        {step < 4 ? (
          <button onClick={handleNext} disabled={!canNext}
            style={{ width: '100%', height: 56, borderRadius: 16, background: canNext ? ACCENT : CARD2, color: canNext ? '#000' : T3, fontSize: 16, fontWeight: 800, border: 'none', cursor: canNext ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background 0.25s' }}
          >
            Continue <ChevronRight size={20} />
          </button>
        ) : (
          <>
            {saveError && (
              <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>
                Failed to save your profile. Please check your connection and try again.
              </div>
            )}
            <button onClick={handleSave} disabled={isSaving}
              style={{ width: '100%', height: 56, borderRadius: 16, background: ACCENT, color: '#000', fontSize: 16, fontWeight: 900, border: 'none', cursor: 'pointer', transition: 'opacity 0.2s', opacity: isSaving ? 0.7 : 1 }}
            >
              {isSaving ? 'Setting up...' : saveError ? 'Retry →' : 'Start First Session →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function OptionCard({ title, desc, icon, selected, onClick }: { title: string; desc: string; icon?: string; selected: boolean; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={onClick}
      style={{ width: '100%', padding: '16px 18px', background: selected ? `${ACCENT}12` : CARD, border: `1.5px solid ${selected ? ACCENT : BORDER}`, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
    >
      {icon && <div style={{ fontSize: 26, flexShrink: 0 }}>{icon}</div>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: selected ? ACCENT : T1, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, color: selected ? `${ACCENT}aa` : T2 }}>{desc}</div>
      </div>
      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${selected ? ACCENT : T3}`, background: selected ? ACCENT : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {selected && <Check size={13} color="#000" />}
      </div>
    </motion.button>
  );
}

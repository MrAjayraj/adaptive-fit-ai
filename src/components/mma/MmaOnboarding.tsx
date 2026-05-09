import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { saveFighterProfile } from '@/services/mmaService';
import { useAuth } from '@/context/AuthContext';

type Step = 1 | 2 | 3 | 4;

interface MmaOnboardingProps {
  onComplete: () => void;
}

const BG      = '#0d0d0d';
const CARD    = '#161616';
const CARD2   = '#1e1e1e';
const ACCENT  = '#1ed760';
const T1      = '#ffffff';
const T2      = '#aaaaaa';
const BORDER  = 'rgba(255,255,255,0.08)';

export function MmaOnboarding({ onComplete }: MmaOnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [primarySport, setPrimarySport] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [stance, setStance] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleNext = () => {
    if (step === 1 && !primarySport) return;
    if (step === 2 && !experience) return;
    
    // If grappling selected in step 1, skip stance (step 3)
    if (step === 2 && primarySport === 'grappling') {
      setStep(4);
      return;
    }
    
    if (step === 3 && !stance) return;
    
    setStep(s => (s + 1) as Step);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    await saveFighterProfile({
      user_id: user.id,
      primary_sport_slug: primarySport === 'striking' ? 'boxing' : primarySport === 'grappling' ? 'bjj' : 'mma',
      experience_level: experience,
      stance: stance || 'Orthodox',
      onboarding_complete: true,
      streak_current: 0,
      streak_longest: 0
    });
    setIsSaving(false);
    onComplete();
  };

  return (
    <div style={{ background: BG, minHeight: '100dvh', padding: 'max(16px,env(safe-area-inset-top)) 16px 24px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        {step > 1 && step < 4 && (
          <button 
            onClick={() => setStep(s => (s === 4 && primarySport === 'grappling' ? 2 : s - 1) as Step)}
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: T1, cursor: 'pointer', marginLeft: -8 }}
          >
            <ChevronLeft style={{ width: 24, height: 24 }} />
          </button>
        )}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 6, paddingRight: step > 1 && step < 4 ? 32 : 0 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ width: 32, height: 4, borderRadius: 2, background: step >= i ? ACCENT : CARD2 }} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ flex: 1 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: T1, marginBottom: 8 }}>What's your primary focus?</h1>
            <p style={{ fontSize: 15, color: T2, marginBottom: 32 }}>This determines which techniques appear first.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <OptionCard 
                title="Striking" 
                desc="Boxing, Muay Thai, Kickboxing" 
                icon="🥊" 
                selected={primarySport === 'striking'} 
                onClick={() => setPrimarySport('striking')} 
              />
              <OptionCard 
                title="Grappling" 
                desc="Wrestling, BJJ, Judo" 
                icon="🤼" 
                selected={primarySport === 'grappling'} 
                onClick={() => setPrimarySport('grappling')} 
              />
              <OptionCard 
                title="MMA" 
                desc="I train both striking and grappling" 
                icon="🥋" 
                selected={primarySport === 'mma'} 
                onClick={() => setPrimarySport('mma')} 
              />
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ flex: 1 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: T1, marginBottom: 8 }}>Your experience level</h1>
            <p style={{ fontSize: 15, color: T2, marginBottom: 32 }}>We'll adjust your starter mastery thresholds.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <OptionCard 
                title="Complete beginner" 
                desc="I have never trained martial arts" 
                selected={experience === 'beginner'} 
                onClick={() => setExperience('beginner')} 
              />
              <OptionCard 
                title="Some experience" 
                desc="I have trained but not consistently" 
                selected={experience === 'some'} 
                onClick={() => setExperience('some')} 
              />
              <OptionCard 
                title="Experienced" 
                desc="I train regularly at a gym" 
                selected={experience === 'experienced'} 
                onClick={() => setExperience('experienced')} 
              />
              <OptionCard 
                title="Competitive" 
                desc="I compete or have competed" 
                selected={experience === 'competitive'} 
                onClick={() => setExperience('competitive')} 
              />
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ flex: 1 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: T1, marginBottom: 8 }}>Your stance</h1>
            <p style={{ fontSize: 15, color: T2, marginBottom: 32 }}>Important for striking techniques.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <OptionCard 
                title="Orthodox" 
                desc="Left foot forward" 
                selected={stance === 'Orthodox'} 
                onClick={() => setStance('Orthodox')} 
              />
              <OptionCard 
                title="Southpaw" 
                desc="Right foot forward" 
                selected={stance === 'Southpaw'} 
                onClick={() => setStance('Southpaw')} 
              />
              <OptionCard 
                title="Unsure" 
                desc="I'm still figuring it out" 
                selected={stance === 'Unsure'} 
                onClick={() => setStance('Unsure')} 
              />
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${ACCENT}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Check style={{ width: 40, height: 40, color: ACCENT }} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: T1, marginBottom: 12 }}>Your profile is ready</h1>
            <p style={{ fontSize: 16, color: T2, marginBottom: 32, maxWidth: 280, lineHeight: 1.5 }}>
              The Technique Mastery OS is set up. Log your first reps to make your dashboard come alive.
            </p>
            
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, width: '100%', marginBottom: 32, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: T2, fontSize: 14 }}>Focus</span>
                <span style={{ color: T1, fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{primarySport}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: T2, fontSize: 14 }}>Experience</span>
                <span style={{ color: T1, fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{experience}</span>
              </div>
              {primarySport !== 'grappling' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T2, fontSize: 14 }}>Stance</span>
                  <span style={{ color: T1, fontSize: 14, fontWeight: 600 }}>{stance}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
        {step < 4 ? (
          <button 
            onClick={handleNext}
            disabled={
              (step === 1 && !primarySport) || 
              (step === 2 && !experience) || 
              (step === 3 && !stance)
            }
            style={{ 
              width: '100%', height: 56, borderRadius: 16, 
              background: ((step === 1 && primarySport) || (step === 2 && experience) || (step === 3 && stance)) ? ACCENT : CARD2,
              color: ((step === 1 && primarySport) || (step === 2 && experience) || (step === 3 && stance)) ? '#000' : T3,
              fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            Continue <ChevronRight style={{ width: 20, height: 20 }} />
          </button>
        ) : (
          <button 
            onClick={handleSave}
            disabled={isSaving}
            style={{ 
              width: '100%', height: 56, borderRadius: 16, 
              background: ACCENT, color: '#000',
              fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {isSaving ? 'Saving...' : 'Start First Session'}
          </button>
        )}
      </div>
    </div>
  );
}

function OptionCard({ title, desc, icon, selected, onClick }: { title: string, desc: string, icon?: string, selected: boolean, onClick: () => void }) {
  return (
    <motion.button 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{ 
        width: '100%', padding: '16px 20px', background: selected ? `${ACCENT}15` : CARD,
        border: `1px solid ${selected ? ACCENT : BORDER}`, borderRadius: 16,
        display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.2s'
      }}
    >
      {icon && <div style={{ fontSize: 24 }}>{icon}</div>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: selected ? ACCENT : T1, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: selected ? `${ACCENT}cc` : T2 }}>{desc}</div>
      </div>
      <div style={{ 
        width: 22, height: 22, borderRadius: '50%', 
        border: `2px solid ${selected ? ACCENT : T3}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: selected ? ACCENT : 'transparent'
      }}>
        {selected && <Check style={{ width: 14, height: 14, color: '#000' }} />}
      </div>
    </motion.button>
  );
}

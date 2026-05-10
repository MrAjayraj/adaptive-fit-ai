import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ChevronDown, Check, StopCircle } from 'lucide-react';
import { logSession } from '@/services/mmaService';
import type { Technique } from '@/types/mma';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const BG     = '#0d0d0d';
const CARD   = '#161616';
const CARD2  = '#1e1e1e';
const ACCENT = '#1ed760';
const T1     = '#ffffff';
const T2     = '#aaaaaa';
const T3     = '#555555';
const BORDER = 'rgba(255,255,255,0.08)';

const TRAINING_TYPES = [
  { id: 'shadow', label: 'Shadow', icon: '👤' },
  { id: 'bag',    label: 'Bag',    icon: '🥊' },
  { id: 'pads',   label: 'Pads',   icon: '🖐️' },
  { id: 'sparring',label:'Sparring',icon:'🤼' },
  { id: 'drill',  label: 'Drill',  icon: '🔄' },
  { id: 'live_roll',label:'Live Roll',icon:'🥋' },
];

const INTENSITIES = [
  { id: 'light',  label: 'Light'  },
  { id: 'medium', label: 'Medium' },
  { id: 'hard',   label: 'Hard'   },
];

export interface QuickLogResult {
  techniqueId: string;
  reps: number;
  sets: number;
  leveledUp: boolean;
  newLevel: number;
  totalReps: number;
  sessionId?: string;
}

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  technique: Technique | null;
  mode: 'single' | 'full';
  existingSessionId?: string;
  onLogComplete?: (result: QuickLogResult) => void;
}

export function QuickLogModal({ isOpen, onClose, technique, mode, existingSessionId, onLogComplete }: QuickLogModalProps) {
  const { user } = useAuth();
  const [reps,         setReps]         = useState(10);
  const [sets,         setSets]         = useState(1);
  const [trainingType, setTrainingType] = useState('shadow');
  const [intensity,    setIntensity]    = useState('medium');
  const [notesOpen,    setNotesOpen]    = useState(false);
  const [notes,        setNotes]        = useState('');
  const [isSaving,     setIsSaving]     = useState(false);
  const [showSuccess,  setShowSuccess]  = useState(false);
  const [leveledUp,    setLeveledUp]    = useState(false);
  const [newLevel,     setNewLevel]     = useState(1);
  const [elapsed,      setElapsed]      = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReps(10); setSets(1); setTrainingType('shadow'); setIntensity('medium');
      setNotesOpen(false); setNotes(''); setShowSuccess(false); setLeveledUp(false); setElapsed(0);
    }
    if (isOpen && mode === 'full') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isOpen, technique, mode]);

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleSave = async (logAnother = false) => {
    if (!user || !technique) return;
    setIsSaving(true);
    const result = await logSession(user.id, technique.id, reps, sets, trainingType, intensity, notes, existingSessionId);
    setIsSaving(false);
    if (result) {
      setLeveledUp(result.leveledUp);
      setNewLevel(result.newLevel);
      if (onLogComplete) {
        onLogComplete({ techniqueId: technique.id, reps: reps * sets, sets, leveledUp: result.leveledUp, newLevel: result.newLevel, totalReps: result.totalReps, sessionId: result.sessionId });
      }
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (logAnother) { setReps(10); setSets(1); setNotes(''); setNotesOpen(false); }
        else { onClose(); }
      }, 2200);
    } else {
      toast.error('Failed to save — check your connection');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      >
        <div style={{ flex: 1 }} onClick={onClose} />
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          style={{ background: CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '20px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '92vh', overflowY: 'auto' }}
        >
          {showSuccess ? (
            <SuccessScreen reps={reps * sets} leveledUp={leveledUp} newLevel={newLevel} />
          ) : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: T2, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 3 }}>
                    {mode === 'full' ? 'Training Session' : 'Log Session'}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T1 }}>
                    {technique?.name || 'Select Technique'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {mode === 'full' && (
                    <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StopCircle size={14} /> {fmtTime(elapsed)}
                    </div>
                  )}
                  <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, background: CARD2, border: 'none', color: T2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* REPS — Big number pad style */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T2, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Reps per set</div>
                <div style={{ display: 'flex', alignItems: 'center', background: BG, borderRadius: 16, padding: '10px 16px', border: `1px solid ${BORDER}`, gap: 8 }}>
                  <button
                    onPointerDown={() => setReps(r => Math.max(1, r - 1))}
                    style={{ width: 48, height: 48, borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, color: T1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  ><Minus size={18} /></button>
                  <input
                    type="number"
                    value={reps}
                    onChange={e => setReps(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ background: 'transparent', border: 'none', color: T1, fontSize: 52, fontWeight: 900, textAlign: 'center', flex: 1, outline: 'none', minWidth: 0 }}
                  />
                  <button
                    onPointerDown={() => setReps(r => r + 1)}
                    style={{ width: 48, height: 48, borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, color: T1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  ><Plus size={18} /></button>
                </div>
                {/* Quick-add chips */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {[5, 10, 25, 50].map(val => (
                    <button key={val}
                      onPointerDown={() => setReps(r => r + val)}
                      style={{ flex: 1, height: 38, borderRadius: 10, background: CARD2, border: `1px solid ${BORDER}`, color: ACCENT, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >+{val}</button>
                  ))}
                </div>
              </div>

              {/* Sets + Intensity row */}
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Sets</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BG, borderRadius: 12, padding: '8px 12px', border: `1px solid ${BORDER}` }}>
                    <button onPointerDown={() => setSets(s => Math.max(1, s - 1))} style={{ background: 'transparent', border: 'none', color: T2, cursor: 'pointer', display: 'flex' }}><Minus size={16} /></button>
                    <span style={{ fontSize: 22, fontWeight: 800, color: T1 }}>{sets}</span>
                    <button onPointerDown={() => setSets(s => s + 1)} style={{ background: 'transparent', border: 'none', color: T2, cursor: 'pointer', display: 'flex' }}><Plus size={16} /></button>
                  </div>
                </div>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Intensity</div>
                  <div style={{ display: 'flex', background: BG, borderRadius: 12, padding: 4, border: `1px solid ${BORDER}` }}>
                    {INTENSITIES.map(int => (
                      <button key={int.id} onPointerDown={() => setIntensity(int.id)}
                        style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: intensity === int.id ? CARD2 : 'transparent', border: 'none', color: intensity === int.id ? T1 : T2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >{int.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Training Type */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Training Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {TRAINING_TYPES.map(type => (
                    <button key={type.id} onPointerDown={() => setTrainingType(type.id)}
                      style={{ padding: '10px 6px', borderRadius: 12, background: trainingType === type.id ? `${ACCENT}18` : BG, border: `1px solid ${trainingType === type.id ? ACCENT : BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: 18 }}>{type.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: trainingType === type.id ? ACCENT : T2 }}>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes (collapsed) */}
              <div>
                <button onPointerDown={() => setNotesOpen(!notesOpen)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', padding: 0, color: T3, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Add coaching note (optional)
                  <ChevronDown size={14} style={{ transform: notesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {notesOpen && (
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="What clicked, what to fix, coaching cue..."
                    style={{ width: '100%', marginTop: 10, background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, color: T1, fontSize: 14, minHeight: 72, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => handleSave(false)} disabled={isSaving || !technique}
                  style={{ width: '100%', height: 56, borderRadius: 16, background: ACCENT, color: '#000', fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer', opacity: isSaving || !technique ? 0.6 : 1, transition: 'opacity 0.2s' }}
                >
                  {isSaving ? 'Saving...' : `Save — ${reps * sets} total reps`}
                </button>
                <button onClick={() => handleSave(true)} disabled={isSaving || !technique}
                  style={{ width: '100%', height: 48, borderRadius: 14, background: 'transparent', border: `1px solid ${BORDER}`, color: T1, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: isSaving ? 0.5 : 1 }}
                >
                  Save & log another technique
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SuccessScreen({ reps, leveledUp, newLevel }: { reps: number; leveledUp: boolean; newLevel: number }) {
  const LEVEL_NAMES: Record<number, string> = { 1:'Raw',2:'Building',3:'Developing',4:'Reliable',5:'Sharp',6:'Elite' };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
      style={{ minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}
    >
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.05 }}
        style={{ width: 80, height: 80, borderRadius: '50%', background: leveledUp ? `linear-gradient(135deg, ${ACCENT}, #00b348)` : ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${ACCENT}66` }}
      >
        <Check size={40} color="#000" strokeWidth={3} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: T1, marginBottom: 4 }}>+{reps} reps!</div>
        {leveledUp ? (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, color: ACCENT }}>Level Up! → {LEVEL_NAMES[newLevel]}</div>
            <div style={{ fontSize: 14, color: T2, marginTop: 6 }}>You reached mastery level {newLevel}. Keep going.</div>
          </>
        ) : (
          <div style={{ fontSize: 15, color: T2 }}>Progress updated ✓</div>
        )}
      </motion.div>
    </motion.div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ChevronDown, Check, StopCircle, RefreshCw, Zap } from 'lucide-react';
import { logSession } from '@/services/mmaService';
import type { Technique } from '@/types/mma';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  technique: Technique | null; // For Mode A
  // If null, we might be in Mode B (Full session log)
  mode: 'single' | 'full';
  onLogComplete?: (techniqueId: string, reps: number) => void;
}

const BG      = '#0d0d0d';
const CARD    = '#161616';
const CARD2   = '#1e1e1e';
const ACCENT  = '#1ed760';
const T1      = '#ffffff';
const T2      = '#aaaaaa';
const BORDER  = 'rgba(255,255,255,0.08)';

const TRAINING_TYPES = [
  { id: 'shadow', label: 'Shadow', icon: '👤' },
  { id: 'bag', label: 'Bag', icon: '🥊' },
  { id: 'pads', label: 'Pads', icon: '🖐️' },
  { id: 'sparring', label: 'Sparring', icon: '🤼' },
  { id: 'drill', label: 'Drill', icon: '🔄' },
  { id: 'live_roll', label: 'Live Roll', icon: '🥋' }
];

const INTENSITIES = [
  { id: 'light', label: 'Light' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' }
];

export function QuickLogModal({ isOpen, onClose, technique, mode, onLogComplete }: QuickLogModalProps) {
  const { user } = useAuth();
  
  const [reps, setReps] = useState(10);
  const [sets, setSets] = useState(1);
  const [trainingType, setTrainingType] = useState('shadow');
  const [intensity, setIntensity] = useState('medium');
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset state when opening for a new technique
  useEffect(() => {
    if (isOpen) {
      setReps(10);
      setSets(1);
      setTrainingType('shadow');
      setIntensity('medium');
      setNotesOpen(false);
      setNotes('');
      setShowSuccess(false);
    }
  }, [isOpen, technique]);

  const handleSave = async (logAnother = false) => {
    if (!user || !technique) return;
    
    setIsSaving(true);
    const result = await logSession(
      user.id,
      technique.id,
      reps,
      sets,
      trainingType,
      intensity,
      notes
    );
    setIsSaving(false);
    
    if (result) {
      if (onLogComplete) onLogComplete(technique.id, reps * sets);
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (logAnother) {
          // Keep modal open, reset values
          setReps(10);
          setSets(1);
          setNotes('');
          setNotesOpen(false);
        } else {
          onClose();
        }
      }, 2000);
    } else {
      toast.error('Failed to save log');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      >
        <div style={{ flex: 1 }} onClick={onClose} />
        
        <motion.div 
          initial={{ y: '100%' }} 
          animate={{ y: 0 }} 
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ background: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 24, maxHeight: '90vh', overflowY: 'auto' }}
        >
          {showSuccess ? (
            <div style={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} style={{ width: 80, height: 80, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Check style={{ width: 40, height: 40, color: '#000' }} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: T1, margin: 0, textAlign: 'center' }}>{reps * sets} Reps Logged!</h2>
                <p style={{ color: ACCENT, textAlign: 'center', marginTop: 8, fontWeight: 600 }}>Progress Updated</p>
              </motion.div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: T2, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 4 }}>
                    {mode === 'full' ? 'Training Session' : 'Log Session'}
                  </div>
                  {mode === 'single' || technique ? (
                    <div style={{ fontSize: 22, fontWeight: 800, color: T1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {technique?.name}
                      {mode === 'single' && <ChevronDown style={{ width: 16, height: 16, color: T3 }} />}
                    </div>
                  ) : (
                    <select 
                      onChange={(e) => {
                        // In a real app we'd fetch and set the technique from the catalog based on ID
                        // For now we'll just show the placeholder
                      }}
                      style={{ background: BG, border: `1px solid ${BORDER}`, color: T1, padding: '8px 12px', borderRadius: 8, fontSize: 16, outline: 'none' }}
                    >
                      <option value="">Select Technique...</option>
                      <option value="jab">Jab</option>
                      <option value="cross">Cross</option>
                      <option value="hook">Hook</option>
                      <option value="double-leg">Double Leg</option>
                    </select>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {mode === 'full' && (
                    <div style={{ fontSize: 16, fontWeight: 700, color: ACCENT, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StopCircle style={{ width: 16, height: 16 }} /> 00:00
                    </div>
                  )}
                  <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, background: CARD2, border: 'none', color: T2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X style={{ width: 18, height: 18 }} />
                  </button>
                </div>
              </div>

              {/* Reps */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T1, marginBottom: 12 }}>Reps per set</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BG, borderRadius: 16, padding: '12px 16px', border: `1px solid ${BORDER}` }}>
                  <button onClick={() => setReps(Math.max(1, reps - 1))} style={{ width: 48, height: 48, borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, color: T1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Minus />
                  </button>
                  <input 
                    type="number" 
                    value={reps} 
                    onChange={e => setReps(parseInt(e.target.value) || 0)}
                    style={{ background: 'transparent', border: 'none', color: T1, fontSize: 40, fontWeight: 800, textAlign: 'center', width: 100, outline: 'none' }}
                  />
                  <button onClick={() => setReps(reps + 1)} style={{ width: 48, height: 48, borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, color: T1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Plus />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {[5, 10, 25, 50].map(val => (
                    <button key={val} onClick={() => setReps(reps + val)} style={{ flex: 1, height: 36, borderRadius: 8, background: CARD2, border: 'none', color: T2, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                {/* Sets */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T1, marginBottom: 8 }}>Sets</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BG, borderRadius: 12, padding: '8px 12px', border: `1px solid ${BORDER}` }}>
                    <button onClick={() => setSets(Math.max(1, sets - 1))} style={{ background: 'transparent', border: 'none', color: T2, cursor: 'pointer' }}><Minus style={{ width: 16, height: 16 }} /></button>
                    <span style={{ fontSize: 20, fontWeight: 700, color: T1 }}>{sets}</span>
                    <button onClick={() => setSets(sets + 1)} style={{ background: 'transparent', border: 'none', color: T2, cursor: 'pointer' }}><Plus style={{ width: 16, height: 16 }} /></button>
                  </div>
                </div>

                {/* Intensity */}
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T1, marginBottom: 8 }}>Intensity</div>
                  <div style={{ display: 'flex', background: BG, borderRadius: 12, padding: 4, border: `1px solid ${BORDER}` }}>
                    {INTENSITIES.map(int => (
                      <button 
                        key={int.id}
                        onClick={() => setIntensity(int.id)}
                        style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: intensity === int.id ? CARD2 : 'transparent', border: 'none', color: intensity === int.id ? T1 : T2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {int.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Training Type */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T1, marginBottom: 8 }}>Training Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {TRAINING_TYPES.map(type => (
                    <button 
                      key={type.id}
                      onClick={() => setTrainingType(type.id)}
                      style={{ padding: '10px 8px', borderRadius: 12, background: trainingType === type.id ? `${ACCENT}15` : BG, border: `1px solid ${trainingType === type.id ? ACCENT : BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: 20 }}>{type.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: trainingType === type.id ? ACCENT : T2 }}>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <button 
                  onClick={() => setNotesOpen(!notesOpen)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', padding: 0, color: T2, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Add notes (optional)
                  <ChevronDown style={{ width: 16, height: 16, transform: notesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {notesOpen && (
                  <textarea 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Coaching point, what clicked, what to fix..."
                    style={{ width: '100%', marginTop: 12, background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, color: T1, fontSize: 14, minHeight: 80, resize: 'none', outline: 'none' }}
                  />
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                <button 
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  style={{ width: '100%', height: 56, borderRadius: 16, background: ACCENT, color: '#000', fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer' }}
                >
                  {isSaving ? 'Saving...' : 'Save session'}
                </button>
                <button 
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  style={{ width: '100%', height: 56, borderRadius: 16, background: 'transparent', border: `1px solid ${BORDER}`, color: T1, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
                >
                  Save & log another
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

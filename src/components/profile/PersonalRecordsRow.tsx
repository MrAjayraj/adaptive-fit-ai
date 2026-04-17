// src/components/profile/PersonalRecordsRow.tsx
// FitPulse — horizontal scrollable PR carousel for the Profile page
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, X, TrendingUp } from 'lucide-react';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import type { PersonalRecord } from '@/hooks/usePersonalRecords';
import { toast } from 'sonner';

const YELLOW     = '#F5C518';
const YELLOW_DIM = 'rgba(245,197,24,0.10)';
const SURFACE    = '#1A1A1E';
const SURFACE_HI = '#252529';

const EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press',
  'Pull-Ups', 'Row', 'Leg Press', 'Curl', 'Dip', 'Plank', 'Running',
];

const UNITS = ['kg', 'lbs', 'reps', 'km', 'min', 'sec'];

// ── Single PR card ────────────────────────────────────────────────────────────
function PRCard({ pr, onDelete }: { pr: PersonalRecord; onDelete: (id: string) => void }) {
  const setDate = new Date(pr.set_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      className="relative flex-shrink-0 w-[130px] rounded-[18px] p-4 group"
      style={{
        background: YELLOW_DIM,
        border: `1px solid rgba(245,197,24,0.18)`,
        boxShadow: `0 4px 20px rgba(245,197,24,0.06)`,
      }}
    >
      {/* Delete button */}
      <button
        onClick={() => onDelete(pr.id)}
        className="absolute top-2 right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}
      >
        <X size={11} />
      </button>

      {/* Trophy */}
      <div
        className="w-8 h-8 rounded-[10px] flex items-center justify-center mb-3"
        style={{ background: 'rgba(245,197,24,0.15)' }}
      >
        <Trophy size={16} style={{ color: YELLOW }} />
      </div>

      {/* Exercise name */}
      <p className="text-[11px] font-bold tracking-wide uppercase text-white/50 mb-1 leading-tight">
        {pr.exercise}
      </p>

      {/* Value */}
      <div className="flex items-baseline gap-0.5">
        <span className="text-[22px] font-black text-white tabular-nums leading-none" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
          {pr.unit === 'reps' || !Number.isInteger(pr.value) ? pr.value : pr.value}
        </span>
        <span className="text-[11px] font-semibold text-white/40 mb-1">{pr.unit}</span>
      </div>

      {/* Date */}
      <p className="text-[10px] text-white/30 mt-1.5">{setDate}</p>
    </motion.div>
  );
}

// ── Log PR modal ─────────────────────────────────────────────────────────────
function LogPRModal({ onClose, onLog }: {
  onClose: () => void;
  onLog: (data: Omit<PersonalRecord, 'id' | 'user_id' | 'set_at'>) => Promise<PersonalRecord | null>;
}) {
  const [exercise, setExercise] = useState('');
  const [customExercise, setCustomExercise] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('kg');
  const [saving, setSaving] = useState(false);

  const finalExercise = exercise === 'custom' ? customExercise : exercise;

  const handleSubmit = async () => {
    if (!finalExercise.trim() || !value || isNaN(Number(value))) {
      toast.error('Please fill in exercise and value');
      return;
    }
    setSaving(true);
    await onLog({
      exercise: finalExercise.trim(),
      value: Number(value),
      unit,
      workout_id: null,
      notes: null,
    });
    setSaving(false);
    onClose();
    toast.success(`PR logged: ${finalExercise} — ${value} ${unit}`, {
      icon: '🏆',
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto rounded-t-[28px] px-5 pt-6 pb-8"
        style={{ background: '#1A1A1E', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

        <h2 className="text-[18px] font-black text-white mb-5 uppercase tracking-tight">Log a PR</h2>

        {/* Exercise picker */}
        <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block mb-2">Exercise</label>
        <div className="flex gap-2 flex-wrap mb-3">
          {EXERCISES.map((ex) => (
            <button
              key={ex}
              onClick={() => setExercise(ex)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={exercise === ex
                ? { background: YELLOW, color: '#111113' }
                : { background: SURFACE_HI, color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.07)' }
              }
            >
              {ex}
            </button>
          ))}
          <button
            onClick={() => setExercise('custom')}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
            style={exercise === 'custom'
              ? { background: YELLOW, color: '#111113' }
              : { background: SURFACE_HI, color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.07)' }
            }
          >
            + Custom
          </button>
        </div>

        {exercise === 'custom' && (
          <input
            autoFocus
            value={customExercise}
            onChange={(e) => setCustomExercise(e.target.value)}
            placeholder="Exercise name…"
            className="w-full mb-4 px-4 py-3 rounded-[14px] text-[15px] text-white bg-transparent outline-none"
            style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'inherit' }}
          />
        )}

        {/* Value + Unit */}
        <div className="flex gap-3 mt-2">
          <div className="flex-1">
            <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block mb-2">Value</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-[14px] text-[18px] font-black text-white outline-none tabular-nums"
              style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block mb-2">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-[50px] px-4 rounded-[14px] text-[14px] font-bold text-white outline-none"
              style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'inherit' }}
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full mt-6 py-4 rounded-[18px] text-[15px] font-black uppercase tracking-wider transition-opacity disabled:opacity-50"
          style={{ background: YELLOW, color: '#111113' }}
        >
          {saving ? 'Saving…' : 'Save PR 🏆'}
        </button>
      </motion.div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PersonalRecordsRow() {
  const { prs, isLoading, logPR, deletePR } = usePersonalRecords();
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} style={{ color: YELLOW }} />
          <h3 className="text-[15px] font-black text-white uppercase tracking-tight">Personal Records</h3>
          {prs.length > 0 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: YELLOW_DIM, color: YELLOW }}
            >
              {prs.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: YELLOW_DIM }}
        >
          <Plus size={14} style={{ color: YELLOW }} />
        </button>
      </div>

      {/* Horizontal scroll */}
      {isLoading ? (
        <div className="flex gap-3 px-4 overflow-x-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-shrink-0 w-[130px] h-[130px] rounded-[18px] animate-pulse" style={{ background: SURFACE }} />
          ))}
        </div>
      ) : prs.length === 0 ? (
        <button
          onClick={() => setShowModal(true)}
          className="mx-4 w-[calc(100%-32px)] rounded-[18px] py-5 flex flex-col items-center gap-2 border border-dashed transition-colors hover:border-yellow-400/40"
          style={{ background: YELLOW_DIM, borderColor: 'rgba(245,197,24,0.2)' }}
        >
          <Trophy size={24} style={{ color: YELLOW }} />
          <p className="text-[13px] font-semibold text-white/50">Log your first PR</p>
        </button>
      ) : (
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-2">
          <AnimatePresence>
            {prs.map((pr) => (
              <PRCard key={pr.id} pr={pr} onDelete={deletePR} />
            ))}
          </AnimatePresence>

          {/* Add more button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex-shrink-0 w-[56px] rounded-[18px] flex items-center justify-center border border-dashed transition-colors"
            style={{ background: YELLOW_DIM, borderColor: 'rgba(245,197,24,0.2)' }}
          >
            <Plus size={20} style={{ color: YELLOW }} />
          </button>
        </div>
      )}

      {/* Log PR modal */}
      <AnimatePresence>
        {showModal && (
          <LogPRModal
            onClose={() => setShowModal(false)}
            onLog={logPR}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

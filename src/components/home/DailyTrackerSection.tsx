// src/components/home/DailyTrackerSection.tsx
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check } from 'lucide-react';
import type { TrackerItem } from '@/services/dailyTrackerService';

// ── Design tokens ──────────────────────────────────────────────────────────────
const SURF  = 'rgba(22,22,22,0.85)';
const SURF2 = 'rgba(30,30,30,0.9)';
const BORDER = 'rgba(255,255,255,0.07)';
const T1    = '#FAFAFA';
const T2    = '#8899AA';
const T3    = '#4A5568';

// ── Unit step increments ───────────────────────────────────────────────────────
function getStep(unit: string | null): number {
  if (!unit) return 1;
  const u = unit.toLowerCase();
  if (u === 'liters') return 0.5;
  if (u === 'glasses') return 1;
  if (u === 'grams') return 10;
  if (u === 'steps') return 500;
  if (u === 'minutes') return 5;
  if (u === 'hours') return 0.5;
  return 1;
}

function formatValue(val: number, unit: string | null): string {
  if (!unit) return String(val);
  const u = unit.toLowerCase();
  if (u === 'liters') return val % 1 === 0 ? `${val}L` : `${val.toFixed(1)}L`;
  if (u === 'grams') return `${val}g`;
  if (u === 'steps') return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val);
  if (u === 'minutes') return `${val}min`;
  if (u === 'hours') return val % 1 === 0 ? `${val}h` : `${val.toFixed(1)}h`;
  return `${val} ${unit}`;
}

// ── Binary Tracker Card ────────────────────────────────────────────────────────
function BinaryCard({
  tracker, onToggle, onDelete,
}: {
  tracker: TrackerItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const done = tracker.completion?.is_completed ?? false;
  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      onClick={() => onToggle(tracker.id)}
      style={{
        background: done ? `${tracker.color}10` : SURF,
        border: `1px solid ${done ? tracker.color + '40' : BORDER}`,
        borderRadius: 14,
        padding: '14px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: 22, flexShrink: 0 }}>{tracker.icon}</span>

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 14, fontWeight: 600, color: done ? T2 : T1,
          textDecoration: done ? 'line-through' : 'none',
          transition: 'all 0.2s',
        }}>
          {tracker.title}
        </span>
      </div>

      {/* Toggle circle */}
      <motion.div
        animate={{ scale: done ? [1, 1.25, 1] : 1 }}
        transition={{ duration: 0.3 }}
        style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: done ? tracker.color : 'transparent',
          border: `2px solid ${done ? tracker.color : 'rgba(255,255,255,0.15)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: done ? `0 0 14px ${tracker.color}60` : 'none',
          transition: 'all 0.2s',
        }}
      >
        <AnimatePresence>
          {done && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Check size={16} color="#000" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Delete button (long-press via right-click for web) */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(tracker.id); }}
        style={{
          position: 'absolute', top: 4, right: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          color: T3, padding: 4, lineHeight: 0, opacity: 0.4,
        }}
      >
        <X size={10} />
      </button>
    </motion.div>
  );
}

// ── Numeric / Duration Tracker Card ───────────────────────────────────────────
function NumericCard({
  tracker, onUpdate, onDelete,
}: {
  tracker: TrackerItem;
  onUpdate: (id: string, val: number, target: number) => void;
  onDelete: (id: string) => void;
}) {
  const done   = tracker.completion?.is_completed ?? false;
  const curVal = tracker.completion?.current_value ?? 0;
  const target = tracker.target_value;
  const pct    = Math.min((curVal / target) * 100, 100);
  const step   = getStep(tracker.unit);

  const increment = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = Math.min(curVal + step, target * 1.5);
    onUpdate(tracker.id, parseFloat(newVal.toFixed(2)), target);
  }, [curVal, step, target, tracker.id, onUpdate]);

  const decrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = Math.max(curVal - step, 0);
    onUpdate(tracker.id, parseFloat(newVal.toFixed(2)), target);
  }, [curVal, step, target, tracker.id, onUpdate]);

  return (
    <motion.div
      layout
      style={{
        background: done ? `${tracker.color}10` : SURF,
        border: `1px solid ${done ? tracker.color + '40' : BORDER}`,
        borderRadius: 14,
        padding: '12px 14px',
        position: 'relative',
        transition: 'all 0.2s',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{tracker.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: done ? T2 : T1, lineHeight: 1.2 }}>
            {tracker.title}
          </div>
          <div style={{ fontSize: 11, color: done ? tracker.color : T3, marginTop: 2, fontWeight: 600 }}>
            {formatValue(curVal, tracker.unit)} / {formatValue(target, tracker.unit)}
          </div>
        </div>
        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={decrement}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: T2, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1,
            }}
          >
            −
          </button>
          <button
            onClick={increment}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: done ? `${tracker.color}30` : `${tracker.color}20`,
              border: `1px solid ${tracker.color}60`,
              color: tracker.color, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1,
              fontWeight: 700,
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 16 }}
          style={{
            height: '100%', borderRadius: 4,
            background: tracker.color,
            boxShadow: `0 0 8px ${tracker.color}60`,
          }}
        />
      </div>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(tracker.id); }}
        style={{
          position: 'absolute', top: 6, right: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: T3, padding: 4, lineHeight: 0, opacity: 0.4,
        }}
      >
        <X size={10} />
      </button>
    </motion.div>
  );
}

// ── Add Tracker Sheet ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'hydration', label: 'Hydration', emoji: '💧' },
  { key: 'nutrition',   label: 'Nutrition',   emoji: '🥗' },
  { key: 'sleep',       label: 'Sleep',       emoji: '😴' },
  { key: 'supplement',  label: 'Supplement',  emoji: '💊' },
  { key: 'movement',    label: 'Movement',    emoji: '🏃' },
  { key: 'mindfulness', label: 'Mindfulness', emoji: '🧘' },
  { key: 'habit',       label: 'Habit',       emoji: '✅' },
  { key: 'custom',      label: 'Custom',      emoji: '⭐' },
];

const TYPE_ICONS: Record<string, string> = {
  binary: '✓', numeric: '123', duration: '⏱',
};

const PALETTE = ['#0CFF9C','#3B82F6','#F97316','#8B5CF6','#EF4444','#10B981','#EC4899','#F59E0B'];

const ICON_OPTIONS = ['💧','🥩','😴','💊','🚶','🧘','🚫','📖','🏋️','🥗','☕','🍎','🧴','🎯','💪','🔥','⚡','🎵'];

function AddTrackerSheet({
  onClose, onAdd,
}: {
  onClose: () => void;
  onAdd: (data: Partial<TrackerItem>) => Promise<void>;
}) {
  const [title,     setTitle]     = useState('');
  const [type,      setType]      = useState<'binary' | 'numeric' | 'duration'>('binary');
  const [category,  setCategory]  = useState('habit');
  const [target,    setTarget]    = useState('1');
  const [unit,      setUnit]      = useState('');
  const [color,     setColor]     = useState('#0CFF9C');
  const [icon,      setIcon]      = useState('✓');
  const [recur,     setRecur]     = useState<'daily' | 'weekdays' | 'weekends'>('daily');
  const [saving,    setSaving]    = useState(false);

  const handleAdd = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        title: title.trim(),
        category,
        icon,
        tracker_type: type,
        target_value: type !== 'binary' ? parseFloat(target) || 1 : 1,
        unit: type !== 'binary' ? (unit.trim() || null) : null,
        color,
        recurrence_type: recur,
        recurrence_days: recur === 'weekdays' ? [1,2,3,4,5] : recur === 'weekends' ? [6,7] : [1,2,3,4,5,6,7],
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }, [title, category, icon, type, target, unit, color, recur, onAdd, onClose]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 50, backdropFilter: 'blur(4px)',
        }}
      />
      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
          background: '#111', borderRadius: '24px 24px 0 0',
          padding: '0 0 max(24px, env(safe-area-inset-bottom))',
          maxHeight: '88dvh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: T1 }}>New Tracker</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: 12, color: T3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Drink more water"
              style={{
                width: '100%', background: SURF2, border: `1px solid ${BORDER}`,
                borderRadius: 10, color: T1, fontSize: 15, padding: '11px 14px',
                marginTop: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Type */}
          <div>
            <label style={{ fontSize: 12, color: T3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {(['binary', 'numeric', 'duration'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    flex: 1, padding: '10px 6px',
                    background: type === t ? `${color}20` : SURF2,
                    border: `1px solid ${type === t ? color : BORDER}`,
                    borderRadius: 10, cursor: 'pointer',
                    color: type === t ? color : T2,
                    fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                    transition: 'all 0.15s',
                  }}
                >
                  {TYPE_ICONS[t]} {t}
                </button>
              ))}
            </div>
          </div>

          {/* Target + Unit (numeric/duration only) */}
          {type !== 'binary' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: T3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Target</label>
                <input
                  type="number"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  style={{
                    width: '100%', background: SURF2, border: `1px solid ${BORDER}`,
                    borderRadius: 10, color: T1, fontSize: 15, padding: '11px 14px',
                    marginTop: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: T3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unit</label>
                <input
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder={type === 'duration' ? 'minutes' : 'grams'}
                  style={{
                    width: '100%', background: SURF2, border: `1px solid ${BORDER}`,
                    borderRadius: 10, color: T1, fontSize: 15, padding: '11px 14px',
                    marginTop: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label style={{ fontSize: 12, color: T3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  style={{
                    padding: '7px 12px',
                    background: category === c.key ? `${color}18` : SURF2,
                    border: `1px solid ${category === c.key ? color : BORDER}`,
                    borderRadius: 20, cursor: 'pointer',
                    color: category === c.key ? color : T2,
                    fontSize: 12, fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label style={{ fontSize: 12, color: T3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {ICON_OPTIONS.map(em => (
                <button
                  key={em}
                  onClick={() => setIcon(em)}
                  style={{
                    width: 40, height: 40, borderRadius: 10, fontSize: 20,
                    background: icon === em ? `${color}20` : SURF2,
                    border: `1px solid ${icon === em ? color : BORDER}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label style={{ fontSize: 12, color: T3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Color</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: c,
                    border: color === c ? `3px solid #fff` : '3px solid transparent',
                    cursor: 'pointer', transition: 'border 0.15s',
                    boxShadow: color === c ? `0 0 12px ${c}80` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label style={{ fontSize: 12, color: T3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Schedule</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {(['daily', 'weekdays', 'weekends'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRecur(r)}
                  style={{
                    flex: 1, padding: '9px 6px',
                    background: recur === r ? `${color}20` : SURF2,
                    border: `1px solid ${recur === r ? color : BORDER}`,
                    borderRadius: 10, cursor: 'pointer',
                    color: recur === r ? color : T2,
                    fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                    transition: 'all 0.15s',
                  }}
                >
                  {r === 'daily' ? '📅 Daily' : r === 'weekdays' ? '💼 Weekdays' : '🏖 Weekends'}
                </button>
              ))}
            </div>
          </div>

          {/* Preview + Create */}
          <div style={{
            background: SURF2, borderRadius: 14, padding: '12px 14px',
            border: `1px solid ${color}40`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T1 }}>{title || 'Tracker Name'}</div>
              <div style={{ fontSize: 11, color: T3, marginTop: 1 }}>
                {type !== 'binary' ? `Target: ${formatValue(parseFloat(target) || 0, unit || null)}` : 'Daily habit'}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', width: 12, height: 12, borderRadius: '50%', background: color }} />
          </div>

          <motion.button
            onClick={handleAdd}
            disabled={saving || !title.trim()}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%', padding: '15px 20px',
              background: `linear-gradient(135deg, ${color}, ${color}cc)`,
              border: 'none', borderRadius: 16,
              color: '#000', fontSize: 16, fontWeight: 800,
              cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !title.trim() ? 0.5 : 1,
              boxShadow: `0 4px 20px ${color}40`,
              marginBottom: 8,
            }}
          >
            {saving ? 'Creating...' : '+ Create Tracker'}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Section ───────────────────────────────────────────────────────────────
interface DailyTrackerSectionProps {
  trackers: TrackerItem[];
  completedCount: number;
  onToggle: (id: string) => void;
  onUpdate: (id: string, val: number, target: number) => void;
  onAdd: (data: Partial<TrackerItem>) => Promise<void>;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export function DailyTrackerSection({
  trackers, completedCount, onToggle, onUpdate, onAdd, onDelete, isLoading,
}: DailyTrackerSectionProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Sort: incomplete first, then complete
  const sorted = [...trackers].sort((a, b) => {
    const aDone = a.completion?.is_completed ? 1 : 0;
    const bDone = b.completion?.is_completed ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  return (
    <>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: T1, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
            Daily Trackers
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: completedCount === trackers.length && trackers.length > 0 ? '#0CFF9C' : T3,
            background: completedCount === trackers.length && trackers.length > 0 ? 'rgba(12,255,156,0.12)' : 'rgba(255,255,255,0.05)',
            borderRadius: 10, padding: '3px 8px',
            border: `1px solid ${completedCount === trackers.length && trackers.length > 0 ? 'rgba(12,255,156,0.3)' : BORDER}`,
          }}>
            {completedCount}/{trackers.length}
          </span>
        </div>
        <button
          onClick={() => setShowAddSheet(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(12,255,156,0.1)', border: '1px solid rgba(12,255,156,0.3)',
            borderRadius: 10, padding: '6px 12px',
            color: '#0CFF9C', fontSize: 12, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Plus size={12} strokeWidth={3} />
          Add
        </button>
      </div>

      {/* Tracker cards */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 58, background: 'rgba(255,255,255,0.03)',
              borderRadius: 14, border: `1px solid ${BORDER}`,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '32px 16px',
          background: SURF, borderRadius: 16, border: `1px dashed ${BORDER}`,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 14, color: T2, fontWeight: 600 }}>No trackers yet</div>
          <div style={{ fontSize: 12, color: T3, marginTop: 4 }}>
            Tap "Add" to create your first daily habit
          </div>
        </div>
      ) : (
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence mode="popLayout">
            {sorted.map(tracker => (
              <motion.div
                key={tracker.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.18 }}
              >
                {tracker.tracker_type === 'binary' ? (
                  <BinaryCard
                    tracker={tracker}
                    onToggle={onToggle}
                    onDelete={onDelete}
                  />
                ) : (
                  <NumericCard
                    tracker={tracker}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Dashed "Add" card at bottom */}
          <motion.button
            onClick={() => setShowAddSheet(true)}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '14px',
              background: 'transparent',
              border: `1.5px dashed rgba(255,255,255,0.10)`,
              borderRadius: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: T3, fontSize: 13, fontWeight: 600,
              transition: 'border-color 0.15s, color 0.15s',
            }}
          >
            <Plus size={14} />
            Add Tracker
          </motion.button>
        </motion.div>
      )}

      {/* Add Tracker Sheet */}
      <AnimatePresence>
        {showAddSheet && (
          <AddTrackerSheet
            onClose={() => setShowAddSheet(false)}
            onAdd={onAdd}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// src/components/home/EmotionTracker.tsx
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MoodLog } from '@/services/dailyTrackerService';

// ── Mood config ────────────────────────────────────────────────────────────────
const MOODS = [
  { score: 1, emoji: '😫', label: 'Awful',   color: '#EF4444', bg: 'rgba(239,68,68,0.15)'   },
  { score: 2, emoji: '😟', label: 'Bad',     color: '#F97316', bg: 'rgba(249,115,22,0.15)'  },
  { score: 3, emoji: '😐', label: 'Meh',     color: '#EAB308', bg: 'rgba(234,179,8,0.15)'   },
  { score: 4, emoji: '😊', label: 'Good',    color: '#22C55E', bg: 'rgba(34,197,94,0.15)'   },
  { score: 5, emoji: '🤩', label: 'Amazing', color: '#0CFF9C', bg: 'rgba(12,255,156,0.15)'  },
];

const MOOD_TAGS = [
  { key: 'well_rested',  label: 'Well Rested',  emoji: '😴' },
  { key: 'tired',        label: 'Tired',         emoji: '😩' },
  { key: 'stressed',     label: 'Stressed',      emoji: '😰' },
  { key: 'calm',         label: 'Calm',          emoji: '😌' },
  { key: 'energetic',    label: 'Energetic',     emoji: '⚡' },
  { key: 'low_energy',   label: 'Low Energy',    emoji: '🔋' },
  { key: 'motivated',    label: 'Motivated',     emoji: '💪' },
  { key: 'unmotivated',  label: 'Unmotivated',   emoji: '😤' },
  { key: 'sore',         label: 'Sore',          emoji: '🤕' },
  { key: 'recovered',    label: 'Recovered',     emoji: '✅' },
  { key: 'anxious',      label: 'Anxious',       emoji: '😬' },
  { key: 'confident',    label: 'Confident',     emoji: '😎' },
  { key: 'focused',      label: 'Focused',       emoji: '🎯' },
  { key: 'distracted',   label: 'Distracted',    emoji: '🤯' },
  { key: 'grateful',     label: 'Grateful',      emoji: '🙏' },
  { key: 'frustrated',   label: 'Frustrated',    emoji: '😤' },
];

const SLIDERS = [
  { key: 'energy_level',   label: 'Energy',        emoji: '⚡', lowLabel: 'Drained',   highLabel: 'Supercharged' },
  { key: 'sleep_quality',  label: 'Sleep Quality', emoji: '😴', lowLabel: 'Terrible',  highLabel: 'Amazing'      },
  { key: 'stress_level',   label: 'Stress',        emoji: '😰', lowLabel: 'Chill',     highLabel: 'Overwhelmed'  },
  { key: 'soreness_level', label: 'Soreness',      emoji: '💪', lowLabel: 'Fresh',     highLabel: 'Destroyed'    },
] as const;

// ── Slider ─────────────────────────────────────────────────────────────────────
function BodySlider({
  label, emoji, lowLabel, highLabel, value, onChange, color,
}: {
  label: string; emoji: string; lowLabel: string; highLabel: string;
  value: number; onChange: (v: number) => void; color: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: '#EAEEF2', fontWeight: 600 }}>
          {emoji} {label}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 800, color,
          background: `${color}18`, borderRadius: 6,
          padding: '2px 8px', minWidth: 28, textAlign: 'center',
        }}>
          {value}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: '#4A5568', minWidth: 40 }}>{lowLabel}</span>
        <div style={{ flex: 1, position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 4,
            background: 'rgba(255,255,255,0.08)',
          }} />
          <div style={{
            position: 'absolute', left: 0, height: 4, borderRadius: 4,
            background: color, width: `${value * 10}%`,
            transition: 'width 0.15s',
          }} />
          <input
            type="range" min={0} max={10} value={value}
            onChange={e => onChange(Number(e.target.value))}
            style={{
              position: 'absolute', inset: 0, width: '100%', opacity: 0,
              cursor: 'pointer', height: 20,
            }}
          />
        </div>
        <span style={{ fontSize: 10, color: '#4A5568', minWidth: 50, textAlign: 'right' }}>{highLabel}</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface EmotionTrackerProps {
  existingMood: MoodLog | null;
  onSave: (data: {
    mood_score: number;
    mood_tags: string[];
    energy_level: number | null;
    sleep_quality: number | null;
    stress_level: number | null;
    soreness_level: number | null;
    note: string;
  }) => Promise<void>;
}

export function EmotionTracker({ existingMood, onSave }: EmotionTrackerProps) {
  const [expanded, setExpanded] = useState(!existingMood);
  const [selectedMood, setSelectedMood] = useState<number | null>(existingMood?.mood_score ?? null);
  const [selectedTags, setSelectedTags] = useState<string[]>(existingMood?.mood_tags ?? []);
  const [slidersOpen, setSlidersOpen] = useState(false);
  const [energy,   setEnergy]   = useState(existingMood?.energy_level   ?? 5);
  const [sleep,    setSleep]    = useState(existingMood?.sleep_quality   ?? 5);
  const [stress,   setStress]   = useState(existingMood?.stress_level   ?? 5);
  const [soreness, setSoreness] = useState(existingMood?.soreness_level ?? 5);
  const [note, setNote]         = useState(existingMood?.note ?? '');
  const [saving, setSaving]     = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);

  const toggleTag = useCallback((key: string) => {
    setSelectedTags(prev =>
      prev.includes(key)
        ? prev.filter(t => t !== key)
        : prev.length < 5 ? [...prev, key] : prev
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedMood) return;
    setSaving(true);
    try {
      await onSave({
        mood_score: selectedMood,
        mood_tags: selectedTags,
        energy_level: slidersOpen ? energy : null,
        sleep_quality: slidersOpen ? sleep : null,
        stress_level: slidersOpen ? stress : null,
        soreness_level: slidersOpen ? soreness : null,
        note,
      });
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  }, [selectedMood, selectedTags, energy, sleep, stress, soreness, note, slidersOpen, onSave]);

  const moodConfig = MOODS.find(m => m.score === (existingMood?.mood_score ?? selectedMood));

  // ── Collapsed summary view ─────────────────────────────────────────────────
  if (!expanded && existingMood) {
    const mc = MOODS.find(m => m.score === existingMood.mood_score)!;
    const tagLabels = existingMood.mood_tags
      .slice(0, 2)
      .map(k => MOOD_TAGS.find(t => t.key === k)?.label)
      .filter(Boolean)
      .join(', ');

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(20,20,20,0.7)',
          border: `1px solid ${mc.color}30`,
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
        }}
        onClick={() => setExpanded(true)}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: mc.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}>
          {mc.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: mc.color }}>{mc.label}</div>
          {tagLabels && (
            <div style={{ fontSize: 12, color: '#8899AA', marginTop: 2 }}>{tagLabels}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontSize: 10, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tap to edit</span>
          <ChevronDown size={14} color="#4A5568" />
        </div>
      </motion.div>
    );
  }

  // ── Expanded logging view ──────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(18,18,18,0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        overflow: 'hidden',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#FAFAFA' }}>
          How are you feeling?
        </span>
        {existingMood && (
          <button
            onClick={() => setExpanded(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A5568', padding: 4 }}
          >
            <ChevronUp size={18} />
          </button>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {/* Mood emoji row */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20 }}>
          {MOODS.map(m => {
            const isSelected = selectedMood === m.score;
            return (
              <motion.button
                key={m.score}
                onClick={() => setSelectedMood(m.score)}
                whileTap={{ scale: 1.3 }}
                animate={{ scale: isSelected ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{
                  background: isSelected ? m.bg : 'transparent',
                  border: `2px solid ${isSelected ? m.color : 'transparent'}`,
                  borderRadius: 14,
                  width: 56, height: 64,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0, gap: 4,
                  boxShadow: isSelected ? `0 0 16px ${m.color}40` : 'none',
                  transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <span style={{ fontSize: isSelected ? 30 : 26, lineHeight: 1, transition: 'font-size 0.15s' }}>
                  {m.emoji}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: isSelected ? m.color : '#4A5568',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  transition: 'color 0.15s',
                }}>
                  {m.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {selectedMood && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              {/* Mood tags */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#8899AA', fontWeight: 600, marginBottom: 10 }}>
                  What's influencing your mood?
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {MOOD_TAGS.map(tag => {
                    const isSelected = selectedTags.includes(tag.key);
                    const mc = moodConfig;
                    return (
                      <motion.button
                        key={tag.key}
                        onClick={() => toggleTag(tag.key)}
                        whileTap={{ scale: 0.92 }}
                        style={{
                          background: isSelected
                            ? (mc ? `${mc.color}18` : 'rgba(12,255,156,0.1)')
                            : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isSelected ? (mc?.color ?? '#0CFF9C') : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 20,
                          padding: '6px 12px',
                          display: 'flex', alignItems: 'center', gap: 5,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 12 }}>{tag.emoji}</span>
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: isSelected ? (mc?.color ?? '#0CFF9C') : '#8899AA',
                          transition: 'color 0.15s',
                        }}>
                          {tag.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Body check-in (collapsible) */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 12, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: 16,
              }}>
                <button
                  onClick={() => setSlidersOpen(v => !v)}
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '12px 14px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#EAEEF2' }}>
                    Body Check-in
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4A5568' }}>
                    <span style={{ fontSize: 11 }}>{slidersOpen ? 'Hide' : 'Optional'}</span>
                    {slidersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                <AnimatePresence>
                  {slidersOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '4px 14px 14px' }}>
                        {SLIDERS.map(s => {
                          const vals: Record<string, [number, (v: number) => void]> = {
                            energy_level:   [energy,   setEnergy],
                            sleep_quality:  [sleep,    setSleep],
                            stress_level:   [stress,   setStress],
                            soreness_level: [soreness, setSoreness],
                          };
                          const [val, setVal] = vals[s.key];
                          const mc = moodConfig;
                          return (
                            <BodySlider
                              key={s.key}
                              label={s.label}
                              emoji={s.emoji}
                              lowLabel={s.lowLabel}
                              highLabel={s.highLabel}
                              value={val}
                              onChange={setVal}
                              color={mc?.color ?? '#0CFF9C'}
                            />
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Note */}
              <div style={{ marginBottom: 16 }}>
                {!noteExpanded ? (
                  <button
                    onClick={() => setNoteExpanded(true)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: '#4A5568', padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    + Add a note (optional)
                  </button>
                ) : (
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Any thoughts about today..."
                    rows={2}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                      color: '#EAEEF2', fontSize: 13, padding: '10px 12px',
                      resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                )}
              </div>

              {/* Save button */}
              <motion.button
                onClick={handleSave}
                disabled={saving}
                whileTap={{ scale: 0.96 }}
                style={{
                  width: '100%',
                  background: moodConfig
                    ? `linear-gradient(135deg, ${moodConfig.color}, ${moodConfig.color}cc)`
                    : '#0CFF9C',
                  border: 'none', borderRadius: 14,
                  color: '#000', fontSize: 15, fontWeight: 800,
                  padding: '14px 20px', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  boxShadow: moodConfig ? `0 4px 20px ${moodConfig.color}40` : undefined,
                  transition: 'opacity 0.15s',
                }}
              >
                {saving ? 'Saving...' : '✓ Log Check-in'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedMood && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#4A5568', marginTop: 4 }}>
            Tap an emoji to start your check-in
          </p>
        )}
      </div>
    </motion.div>
  );
}

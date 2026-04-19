import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Heart, Swords, Plus, Play, Calendar, Clock, ChevronRight, Flame, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useFitness } from '@/context/FitnessContext';
import { getWorkoutTemplates, getPopularWorkouts } from '@/services/workoutService';
import type { WorkoutTemplate } from '@/services/workoutService';
import BottomNav from '@/components/layout/BottomNav';

// ── Design tokens ──────────────────────────────────────────────────────────────
const ACCENT       = '#0CFF9C';
const BG           = '#0C1015';
const SURFACE      = '#141A1F';
const SURFACE_UP   = '#1C2429';
const T1           = '#EAEEF2';
const T2           = '#8899AA';
const T3           = '#4A5568';
const GREEN_GLOW   = 'rgba(12,255,156,0.1)';
const GREEN_BORDER = 'rgba(12,255,156,0.15)';

type FilterType = 'all' | 'strength' | 'cardio' | 'skill' | 'custom';

const FILTER_CHIPS: { label: string; value: FilterType }[] = [
  { label: 'ALL',      value: 'all'      },
  { label: 'STRENGTH', value: 'strength' },
  { label: 'CARDIO',   value: 'cardio'   },
  { label: 'SKILL',    value: 'skill'    },
  { label: 'CUSTOM',   value: 'custom'   },
];

function getTypeGradient(type: WorkoutTemplate['workout_type']): string {
  switch (type) {
    case 'strength': return 'linear-gradient(135deg, rgba(245,197,24,0.15), rgba(245,197,24,0.05))';
    case 'cardio':   return 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))';
    case 'skill':    return 'linear-gradient(135deg, rgba(12,255,156,0.15), rgba(12,255,156,0.05))';
    default:         return 'linear-gradient(135deg, rgba(12,255,156,0.15), rgba(12,255,156,0.05))';
  }
}

function TypeIcon({ type, size }: { type: WorkoutTemplate['workout_type']; size: number }) {
  const style = { width: size, height: size, color: ACCENT, flexShrink: 0 as const };
  switch (type) {
    case 'strength': return <Dumbbell style={style} />;
    case 'cardio':   return <Heart    style={style} />;
    case 'skill':    return <Swords   style={style} />;
    default:         return <Dumbbell style={style} />;
  }
}

function getSubtitle(t: WorkoutTemplate): string {
  switch (t.workout_type) {
    case 'strength': {
      const count = Array.isArray(t.exercises) ? t.exercises.length : 0;
      const cat   = t.category ? t.category.toUpperCase() : 'STRENGTH';
      return count > 0 ? `${cat} · ${count} EXERCISES` : cat;
    }
    case 'skill': {
      const rounds  = t.exercises?.[0]?.rounds ?? 5;
      const durSecs = t.exercises?.[0]?.round_duration ?? 180;
      const durMin  = Math.round(durSecs / 60);
      return `${rounds} ROUNDS · ${durMin} MIN`;
    }
    case 'cardio': {
      const dur = t.duration_estimate_min ?? 30;
      return `${dur} MIN · HIGH INTENSITY`;
    }
    default: {
      const cat = t.category ? t.category.toUpperCase() : 'CUSTOM';
      return cat;
    }
  }
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: SURFACE_UP,
        borderRadius: 14,
        height: 200,
        marginBottom: 12,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <motion.div
        animate={{ x: ['−100%', '100%'] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
        }}
      />
    </div>
  );
}

function TemplateCard({ template, onPress }: { template: WorkoutTemplate; onPress: () => void }) {
  const imageArea: React.CSSProperties = {
    height: 140,
    background: template.image_url ? undefined : getTypeGradient(template.workout_type),
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const difficultyColors: Record<string, string> = {
    beginner:     '#4A5568',
    intermediate: '#8899AA',
    advanced:     ACCENT,
  };

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={onPress}
      style={{
        background: SURFACE,
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        marginBottom: 12,
        cursor: 'pointer',
      }}
    >
      {/* Image / gradient area */}
      <div style={imageArea}>
        {template.image_url ? (
          <img
            src={template.image_url}
            alt={template.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
          />
        ) : null}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <TypeIcon type={template.workout_type} size={32} />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px 16px' }}>
        {/* Row 1: name + difficulty */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T1, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {template.name}
          </span>
          <span style={{
            fontSize: 9,
            color: difficultyColors[template.difficulty] ?? T2,
            background: SURFACE_UP,
            borderRadius: 20,
            padding: '2px 8px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            flexShrink: 0,
          }}>
            {template.difficulty}
          </span>
        </div>

        {/* Row 2: category subtitle */}
        <div style={{ marginTop: 4, fontSize: 11, color: T3, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
          {getSubtitle(template)}
        </div>

        {/* Row 3: duration + play */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock style={{ width: 12, height: 12, color: T2 }} />
            <span style={{ fontSize: 11, color: T2 }}>
              {template.duration_estimate_min ?? 30} min
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onPress(); }}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: ACCENT,
              color: '#0C1015',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Play style={{ width: 18, height: 18, fill: '#0C1015' }} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function WorkoutHub() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [templates, setTemplates]       = useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading]       = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getWorkoutTemplates()
      .then((data) => { if (!cancelled) setTemplates(data); })
      .catch(() => { if (!cancelled) setTemplates([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = activeFilter === 'all'
    ? templates
    : templates.filter((t) => t.workout_type === activeFilter);

  function handleTemplatePress(template: WorkoutTemplate) {
    navigate(`/create-workout?template=${template.id}&type=${template.workout_type}`);
  }

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: 100 }}>
      {/* ── Header ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(12,16,21,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: 'max(16px, env(safe-area-inset-top)) 16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: T1 }}>Workouts</span>
          <button
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => {/* calendar action */}}
          >
            <Calendar style={{ width: 20, height: 20, color: T2 }} />
          </button>
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => setActiveFilter(chip.value)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                whiteSpace: 'nowrap' as const,
                cursor: 'pointer',
                flexShrink: 0,
                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.06)',
                background: isActive ? ACCENT : SURFACE_UP,
                color:      isActive ? '#0C1015' : T2,
                transition: 'all 0.15s ease',
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ── Template list ── */}
      <div style={{ padding: '0 16px', overflowY: 'auto' }}>
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 }}>
            <Dumbbell style={{ width: 32, height: 32, color: T3 }} />
            <span style={{ fontSize: 14, color: T2 }}>No templates yet</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilter}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {filtered.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPress={() => handleTemplatePress(template)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Create custom button ── */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/create-workout?type=strength')}
          style={{
            width: '100%',
            background: SURFACE,
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: 14,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
            marginTop: 4,
            marginBottom: 16,
          }}
        >
          <Plus style={{ width: 18, height: 18, color: ACCENT }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: T2 }}>Create Custom Workout</span>
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
}

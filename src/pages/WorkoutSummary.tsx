import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Trophy, Zap, Flame, Clock, Target, BarChart2, Home, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFitness } from '@/context/FitnessContext';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT     = '#0CFF9C';
const BG         = '#0C1015';
const SURFACE    = '#141A1F';
const SURFACE_UP = '#1C2429';
const T1         = '#EAEEF2';
const T2         = '#8899AA';
const T3         = '#4A5568';
const AMBER      = '#F59E0B';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SummaryState {
  workoutName:    string;
  workoutType:    'strength' | 'cardio' | 'skill' | 'custom';
  duration:       number;      // minutes
  totalRounds?:   number;
  caloriesBurned?: number;
  totalSets?:     number;
  totalVolume?:   number;
  prCount?:       number;
  xpEarned?:     number;
  rpEarned?:     number;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  iconColor,
  value,
  label,
  delay = 0,
}: {
  icon: React.ReactNode;
  iconColor: string;
  value: string;
  label: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      style={{
        background: SURFACE,
        borderRadius: 14,
        padding: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ color: iconColor, display: 'flex' }}>{icon}</div>
      <p
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: T1,
          margin: '8px 0 0',
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: 11, color: T3, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </p>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkoutSummary() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const state     = location.state as SummaryState | null;

  // Guard
  useEffect(() => {
    if (!state) navigate('/home', { replace: true });
  }, [state, navigate]);

  if (!state) return null;

  const {
    workoutName,
    workoutType,
    duration,
    totalRounds,
    caloriesBurned,
    totalSets,
    totalVolume,
    prCount,
    xpEarned,
    rpEarned,
  } = state;

  const calories     = caloriesBurned ?? Math.round(duration * 6.5);
  const xp           = xpEarned ?? 100;
  const rp           = rpEarned ?? 15;
  const isSkill      = workoutType === 'skill';
  const isStrength   = workoutType === 'strength';

  // Volume display: e.g. 3400 → "3.4k"
  const volumeDisplay = totalVolume
    ? `${Math.round((totalVolume / 1000) * 10) / 10}k`
    : '0';

  // Build stat cards array
  const statCards: Array<{
    icon: React.ReactNode;
    iconColor: string;
    value: string;
    label: string;
  }> = [
    {
      icon:       <Clock size={22} />,
      iconColor:  '#60A5FA',
      value:      `${duration}m`,
      label:      'Duration',
    },
    // Skill: rounds completed; Strength: volume
    isSkill
      ? {
          icon:       <Target size={22} />,
          iconColor:  ACCENT,
          value:      `${totalRounds ?? 0}`,
          label:      'Rounds Completed',
        }
      : {
          icon:       <BarChart2 size={22} />,
          iconColor:  ACCENT,
          value:      `${volumeDisplay} kg`,
          label:      'Volume',
        },
    {
      icon:       <Flame size={22} />,
      iconColor:  '#F97316',
      value:      `${calories} kcal`,
      label:      'Calories',
    },
    {
      icon:       <Zap size={22} />,
      iconColor:  ACCENT,
      value:      `+${xp} XP`,
      label:      'Earned',
    },
  ];

  return (
    <div
      style={{
        background: BG,
        minHeight: '100dvh',
        overflowY: 'auto',
        padding: '0 0 120px',
      }}
    >
      {/* ── TOP SECTION ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 60,
          paddingBottom: 32,
        }}
      >
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: `3px solid ${ACCENT}`,
            background: 'rgba(12,255,156,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={36} color={ACCENT} strokeWidth={2.5} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: T1,
            marginTop: 20,
            textAlign: 'center',
            margin: '20px 0 0',
          }}
        >
          Great Work! 💪
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            fontSize: 15,
            color: T2,
            textAlign: 'center',
            marginTop: 4,
            margin: '4px 0 0',
          }}
        >
          {workoutName}
        </motion.p>
      </div>

      {/* ── STATS GRID ── */}
      <div
        style={{
          padding: '0 16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginTop: 8,
        }}
      >
        {statCards.map((card, i) => (
          <StatCard
            key={card.label}
            icon={card.icon}
            iconColor={card.iconColor}
            value={card.value}
            label={card.label}
            delay={0.35 + i * 0.07}
          />
        ))}
      </div>

      {/* ── XP + RP REWARD PILLS ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 12,
          marginTop: 16,
          padding: '0 16px',
        }}
      >
        {/* XP pill */}
        <div
          style={{
            background: 'rgba(12,255,156,0.1)',
            border: '1px solid rgba(12,255,156,0.25)',
            borderRadius: 20,
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Zap size={16} color={ACCENT} />
          <span style={{ fontSize: 15, fontWeight: 800, color: ACCENT }}>
            +{xp} XP
          </span>
        </div>

        {/* RP pill */}
        <div
          style={{
            background: 'rgba(167,139,250,0.1)',
            border: '1px solid rgba(167,139,250,0.25)',
            borderRadius: 20,
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Flame size={16} color="#A78BFA" />
          <span style={{ fontSize: 15, fontWeight: 800, color: '#A78BFA' }}>
            +{rp} RP
          </span>
        </div>
      </motion.div>

      {/* ── PRs SECTION ── */}
      {prCount && prCount > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72 }}
          style={{ padding: '0 16px', marginTop: 12 }}
        >
          <div
            style={{
              background: 'rgba(12,255,156,0.06)',
              border: '1px solid rgba(12,255,156,0.15)',
              borderRadius: 12,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Trophy size={16} color={ACCENT} />
            <span style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>
              {prCount} New Personal Record{prCount > 1 ? 's' : ''}
            </span>
          </div>
        </motion.div>
      ) : null}

      {/* ── FIXED BOTTOM BUTTONS ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 16px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(12,16,21,0.96)',
          backdropFilter: 'blur(12px)',
          zIndex: 50,
        }}
      >
        {/* Back to Home */}
        <button
          onClick={() => navigate('/home')}
          style={{
            display: 'block',
            width: '100%',
            height: 54,
            borderRadius: 14,
            background: ACCENT,
            border: 'none',
            color: BG,
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          Back to Home
        </button>

        {/* View Progress */}
        <button
          onClick={() => navigate('/progress')}
          style={{
            display: 'block',
            width: '100%',
            height: 46,
            borderRadius: 14,
            background: SURFACE,
            border: '1px solid rgba(255,255,255,0.08)',
            color: T2,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          View Progress
        </button>
      </div>
    </div>
  );
}

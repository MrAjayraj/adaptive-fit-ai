import React from 'react';
import { motion } from 'framer-motion';
// lucide-react import kept for consistency with design system
import { Dumbbell } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT = '#0CFF9C';
const SURFACE = '#141A1F';
const T1 = '#EAEEF2';
const T2 = '#8899AA';
const T3 = '#4A5568';
const GREEN_BORDER = 'rgba(12,255,156,0.15)';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface WorkoutMetadata {
  name: string;
  duration_min: number;
  calories: number;
  exercise_count: number;
  volume_kg?: number;
}

interface WorkoutShareCardProps {
  metadata: WorkoutMetadata;
  /** Smaller version for inside chat bubbles */
  compact?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const Dot: React.FC = () => (
  <span style={{ color: T3, margin: '0 4px', userSelect: 'none' }}>·</span>
);

// ── Component ─────────────────────────────────────────────────────────────────
export const WorkoutShareCard: React.FC<WorkoutShareCardProps> = ({
  metadata,
  compact = false,
}) => {
  const { name, duration_min, calories, exercise_count, volume_kg } = metadata;

  // ── Compact variant ──────────────────────────────────────────────────────────
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 10,
          overflow: 'hidden',
          border: `1px solid ${GREEN_BORDER}`,
          background: SURFACE,
          padding: '8px 10px',
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            width: 3,
            alignSelf: 'stretch',
            background: ACCENT,
            borderRadius: 2,
            flexShrink: 0,
          }}
        />

        <Dumbbell size={14} color={ACCENT} style={{ flexShrink: 0 }} />

        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T1,
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </span>

        <span style={{ fontSize: 12, color: T2, flexShrink: 0 }}>
          {duration_min}m
        </span>
      </motion.div>
    );
  }

  // ── Full variant ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        border: `1px solid ${GREEN_BORDER}`,
        background: SURFACE,
        display: 'flex',
      }}
    >
      {/* Green left accent bar */}
      <div
        style={{
          width: 3,
          background: ACCENT,
          flexShrink: 0,
        }}
      />

      {/* Content area */}
      <div style={{ flex: 1, padding: '12px 14px' }}>

        {/* Top row: workout name + "WORKOUT COMPLETED" pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: T1,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </span>

          <span
            style={{
              background: 'rgba(12,255,156,0.10)',
              color: ACCENT,
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '3px 8px',
              borderRadius: 20,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Workout Completed
          </span>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: ACCENT,
            }}
          >
            🔥 {calories} KCAL
          </span>

          <Dot />

          <span style={{ fontSize: 12, color: T2 }}>{duration_min}m</span>

          <Dot />

          <span style={{ fontSize: 12, color: T2 }}>
            {exercise_count} exercise{exercise_count !== 1 ? 's' : ''}
          </span>

          {volume_kg !== undefined && (
            <>
              <Dot />
              <span style={{ fontSize: 12, color: T2 }}>
                {volume_kg.toLocaleString()} kg
              </span>
            </>
          )}
        </div>

      </div>
    </motion.div>
  );
};

export default WorkoutShareCard;

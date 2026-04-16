/**
 * WorkoutShareCard.tsx
 * FitPulse — dual-context workout share card (Web React, Vite)
 *
 * Context 'feed'  → full-width hero card with map, 3-stat strip, share sheet
 * Context 'dm'    → compact 260px card with 2 stats + orange CTA button
 *
 * @example Feed usage
 * ```tsx
 * <WorkoutShareCard
 *   workoutId="abc123"
 *   context="feed"
 *   userName="Alex Rivera"
 *   avatarUrl="/avatars/alex.jpg"
 *   workoutType="run"
 *   durationMin={42}
 *   caloriesBurned={380}
 *   distanceKm={7.4}
 *   completedAt={new Date()}
 *   mapSnapshotUrl="/maps/run-map.jpg"
 * />
 * ```
 *
 * @example DM usage
 * ```tsx
 * <WorkoutShareCard
 *   workoutId="abc123"
 *   context="dm"
 *   userName="Alex Rivera"
 *   avatarUrl="/avatars/alex.jpg"
 *   workoutType="strength"
 *   durationMin={55}
 *   caloriesBurned={290}
 *   completedAt={new Date()}
 * />
 * ```
 */

import React, { CSSProperties, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#131318',
  surface:   '#1F1F24',
  surfaceHi: '#2A292F',
  highest:   '#35343A',
  primary:   '#FF6B35',
  primaryDim:'#FFB59D',
  green:     '#4AE176',
  textPri:   '#E4E1E9',
  textSec:   '#E1BFB5',
  textMuted: '#A98A80',
  outline:   'rgba(89,65,57,0.22)',
} as const;

// ─── Workout type config ─────────────────────────────────────────────────────
type WorkoutType = 'run' | 'strength' | 'cycle' | 'yoga' | 'hiit';

interface TypeConfig {
  icon:       string;
  label:      string;
  gradient:   string;   // CSS linear-gradient
  accentColor:string;
  illustration:string;  // emoji used as animated illustration when no map
}

const TYPE_CONFIG: Record<WorkoutType, TypeConfig> = {
  run: {
    icon:          '🏃',
    label:         'Run',
    gradient:      'linear-gradient(135deg, #FF6B35 0%, #FF9A35 100%)',
    accentColor:   '#FF6B35',
    illustration:  '🏃‍♂️',
  },
  strength: {
    icon:          '🏋️',
    label:         'Strength',
    gradient:      'linear-gradient(135deg, #8B5CF6 0%, #B066FF 100%)',
    accentColor:   '#8B5CF6',
    illustration:  '🏋️‍♂️',
  },
  cycle: {
    icon:          '🚴',
    label:         'Cycle',
    gradient:      'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)',
    accentColor:   '#0EA5E9',
    illustration:  '🚴‍♂️',
  },
  yoga: {
    icon:          '🧘',
    label:         'Yoga',
    gradient:      'linear-gradient(135deg, #4AE176 0%, #10B981 100%)',
    accentColor:   '#4AE176',
    illustration:  '🧘‍♀️',
  },
  hiit: {
    icon:          '⚡',
    label:         'HIIT',
    gradient:      'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
    accentColor:   '#EF4444',
    illustration:  '⚡',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────
export interface WorkoutShareCardProps {
  workoutId:       string;
  context:         'feed' | 'dm';
  userName:        string;
  avatarUrl:       string;
  workoutType:     WorkoutType;
  durationMin:     number;
  caloriesBurned:  number;
  distanceKm?:     number;
  completedAt:     Date;
  mapSnapshotUrl?: string;
  /** Called when "View full workout" / "View workout" is pressed */
  onViewWorkout?:  (workoutId: string) => void;
  /** Called when "Post to feed" is pressed */
  onPostToFeed?:   (workoutId: string) => void;
  /** Called when "Send in chat" is pressed */
  onSendInChat?:   (workoutId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function fmtRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fmtDistance(km: number): string {
  return km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ src, name, size }: { src: string; name: string; size: number }) {
  const [imgErr, setImgErr] = useState(false);
  const initials = name.trim().split(/\s+/).filter(Boolean)
    .map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  if (src && !imgErr) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgErr(true)}
        style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2, flexShrink: 0,
      background: C.primary, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: '#fff',
    }}>
      {initials}
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({
  icon, label, value, accent,
}: { icon: string; label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 16, fontWeight: 700, color: accent ?? C.textPri }}>{value}</span>
      <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, letterSpacing: 0.3 }}>{label}</span>
    </div>
  );
}

// ─── Share action sheet ───────────────────────────────────────────────────────
interface ShareSheetProps {
  onClose:       () => void;
  onSendInChat:  () => void;
  onPostToFeed:  () => void;
  onCopyLink:    () => void;
}

function ShareSheet({ onClose, onSendInChat, onPostToFeed, onCopyLink }: ShareSheetProps) {
  const actions = [
    { icon: '💬', label: 'Send in chat',  onClick: () => { onSendInChat(); onClose(); } },
    { icon: '📢', label: 'Post to feed',  onClick: () => { onPostToFeed(); onClose(); } },
    { icon: '🔗', label: 'Copy link',     onClick: () => { onCopyLink();   onClose(); } },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end',
        }}
      >
        <motion.div
          initial={{ y: 200 }}
          animate={{ y: 0 }}
          exit={{ y: 200 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', backgroundColor: C.surfaceHi,
            borderRadius: '24px 24px 0 0', padding: '20px 0 32px',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          </div>

          <p style={{
            textAlign: 'center', fontSize: 16, fontWeight: 700,
            color: C.textPri, margin: '0 0 16px', letterSpacing: 0.3,
          }}>
            Share Workout
          </p>

          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                width: '100%', padding: '14px 24px',
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: C.surface,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {a.icon}
              </span>
              <span style={{ fontSize: 16, fontWeight: 500, color: C.textPri }}>{a.label}</span>
            </button>
          ))}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Feed card
// ═══════════════════════════════════════════════════════════════════════════════
function FeedCard({
  workoutId,
  userName,
  avatarUrl,
  workoutType,
  durationMin,
  caloriesBurned,
  distanceKm,
  completedAt,
  mapSnapshotUrl,
  onViewWorkout,
  onPostToFeed,
  onSendInChat,
}: WorkoutShareCardProps) {
  const cfg = TYPE_CONFIG[workoutType];
  const [shareOpen, setShareOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 18) + 2);

  const handleLike = () => {
    setLiked((prev) => {
      setLikeCount((c) => prev ? c - 1 : c + 1);
      return !prev;
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/workout/${workoutId}`);
  };

  return (
    <>
      <div style={{
        backgroundColor: C.surface,
        borderRadius: 20,
        overflow: 'hidden',
        border: `1px solid ${C.outline}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        fontFamily: "'Inter','Manrope',sans-serif",
      }}>
        {/* ── Gradient header ─────────────────────────────────────────────── */}
        <div style={{ position: 'relative', background: cfg.gradient, padding: '20px 16px 48px' }}>
          {/* Noise texture overlay */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.08,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }} />

          {/* Top row: avatar + name + timestamp */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar src={avatarUrl} name={userName} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, lineHeight: '20px' }}>
                {userName}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
                {fmtRelative(completedAt)}
              </p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20,
              padding: '4px 12px',
            }}>
              <span style={{ fontSize: 16 }}>{cfg.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{cfg.label}</span>
            </div>
          </div>

          {/* Large illustration / emoji in corner */}
          <div style={{
            position: 'absolute', bottom: 10, right: 16,
            fontSize: 72, opacity: 0.18, lineHeight: 1,
            userSelect: 'none', pointerEvents: 'none',
          }}>
            {cfg.icon}
          </div>
        </div>

        {/* ── Stat strip (overlaps header) ────────────────────────────────── */}
        <div style={{ margin: '-28px 16px 0', position: 'relative', zIndex: 2 }}>
          <div style={{
            backgroundColor: C.surfaceHi,
            borderRadius: 16,
            border: `1px solid ${C.outline}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            padding: '14px 8px',
            gap: 4,
          }}>
            <StatChip icon="⏱" label="Duration"  value={fmtDuration(durationMin)} accent={cfg.accentColor} />
            <div style={{ width: 1, backgroundColor: C.outline, alignSelf: 'stretch' }} />
            <StatChip icon="🔥" label="Calories"  value={`${caloriesBurned} kcal`} />
            {distanceKm != null && (
              <>
                <div style={{ width: 1, backgroundColor: C.outline, alignSelf: 'stretch' }} />
                <StatChip icon="📍" label="Distance" value={fmtDistance(distanceKm)} />
              </>
            )}
          </div>
        </div>

        {/* ── Map thumbnail or animated illustration ───────────────────────── */}
        <div style={{ margin: '12px 16px', borderRadius: 14, overflow: 'hidden', height: 140, position: 'relative' }}>
          {mapSnapshotUrl ? (
            <img
              src={mapSnapshotUrl}
              alt="Route map"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: `${cfg.gradient}`,
              opacity: 0.15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <motion.span
                animate={{ scale: [1, 1.12, 1], rotate: [0, 4, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: 72, lineHeight: 1, opacity: 0.7 }}
              >
                {cfg.illustration}
              </motion.span>
            </div>
          )}
          {/* Gradient overlay on map for legibility */}
          {mapSnapshotUrl && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(31,31,36,0.6) 0%, transparent 50%)',
            }} />
          )}
        </div>

        {/* ── Action row ──────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '4px 16px 16px',
          gap: 8,
        }}>
          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleLike}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: liked ? `${C.primary}22` : 'none',
              border: liked ? `1px solid ${C.primary}55` : `1px solid ${C.outline}`,
              borderRadius: 12, padding: '8px 14px',
              cursor: 'pointer', color: liked ? C.primary : C.textMuted,
              fontSize: 14, fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 17 }}>{liked ? '❤️' : '🤍'}</span>
            {likeCount}
          </motion.button>

          {/* View workout */}
          <button
            onClick={() => onViewWorkout?.(workoutId)}
            style={{
              flex: 1,
              background: 'none',
              border: `1px solid ${C.outline}`,
              borderRadius: 12, padding: '8px 14px',
              cursor: 'pointer', color: C.textSec,
              fontSize: 14, fontWeight: 600,
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            View workout
          </button>

          {/* Share */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShareOpen(true)}
            style={{
              width: 42, height: 42, borderRadius: 12,
              backgroundColor: C.primary,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
              boxShadow: `0 2px 12px ${C.primary}44`,
            }}
            aria-label="Share workout"
          >
            ↗️
          </motion.button>
        </div>
      </div>

      {/* Share action sheet portal */}
      {shareOpen && (
        <ShareSheet
          onClose={() => setShareOpen(false)}
          onSendInChat={() => onSendInChat?.(workoutId)}
          onPostToFeed={() => onPostToFeed?.(workoutId)}
          onCopyLink={handleCopyLink}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DM (compact) card
// ═══════════════════════════════════════════════════════════════════════════════
function DMCard({
  workoutId,
  workoutType,
  durationMin,
  caloriesBurned,
  distanceKm,
  completedAt,
  onViewWorkout,
}: WorkoutShareCardProps) {
  const cfg = TYPE_CONFIG[workoutType];

  const stat1 = { icon: '⏱', value: fmtDuration(durationMin),    label: 'Duration' };
  const stat2 = distanceKm != null
    ? { icon: '📍', value: fmtDistance(distanceKm),               label: 'Distance' }
    : { icon: '🔥', value: `${caloriesBurned} kcal`,              label: 'Calories' };

  return (
    <div style={{
      maxWidth: 260,
      backgroundColor: C.surface,
      borderRadius: 16,
      overflow: 'hidden',
      border: `1px solid ${C.outline}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      fontFamily: "'Inter','Manrope',sans-serif",
    }}>
      {/* Compact gradient header */}
      <div style={{
        background: cfg.gradient,
        padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          fontSize: 28, lineHeight: 1,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}>
          {cfg.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, lineHeight: '18px' }}>
            {cfg.label} Workout
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
            {fmtRelative(completedAt)}
          </p>
        </div>
      </div>

      {/* 2-stat inline strip */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: `1px solid ${C.outline}`,
      }}>
        {[stat1, stat2].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <div style={{ width: 1, backgroundColor: C.outline }} />}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', padding: '10px 8px', gap: 2,
            }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.textPri }}>{s.value}</span>
              <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 500 }}>{s.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* CTA button */}
      <div style={{ padding: '10px 12px' }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => onViewWorkout?.(workoutId)}
          style={{
            width: '100%',
            background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDim})`,
            border: 'none', borderRadius: 12,
            padding: '10px 0',
            fontSize: 14, fontWeight: 700, color: '#fff',
            cursor: 'pointer', letterSpacing: 0.3,
            boxShadow: `0 2px 10px ${C.primary}44`,
            fontFamily: 'inherit',
          }}
        >
          View workout ↗
        </motion.button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public component
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Dual-context FitPulse workout share card.
 *
 * - `context="feed"` → full hero card (~375px) with gradient header, 3-stat
 *   strip, map or animated illustration, like + view + share-sheet actions.
 * - `context="dm"` → compact card (max 260px) with 2 inline stats and an
 *   orange "View workout" button.
 */
const WorkoutShareCard: React.FC<WorkoutShareCardProps> = (props) => {
  if (props.context === 'dm') return <DMCard {...props} />;
  return <FeedCard {...props} />;
};

export default WorkoutShareCard;

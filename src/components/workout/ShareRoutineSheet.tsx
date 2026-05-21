// src/components/workout/ShareRoutineSheet.tsx
// Bottom sheet for sharing a routine to the community.

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Globe, Check } from 'lucide-react';
import { toast } from 'sonner';
import { shareRoutinePublic } from '@/services/workoutService';
import type { RoutineExercise } from '@/services/workoutService';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG      = '#0C1015';
const SURF    = '#141A1F';
const ACCENT  = '#F5C518';
const T1      = '#EAEEF2';
const T2      = '#8899AA';
const T3      = '#4A5568';
const BORDER  = 'rgba(255,255,255,0.07)';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ShareRoutineSheetProps {
  routine: {
    id: string;
    name: string;
    exercises: RoutineExercise[];
  };
  userId: string;
  userProfile?: { name?: string; avatar_url?: string | null } | null;
  onClose: () => void;
  onShared?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ShareRoutineSheet({
  routine,
  userId,
  userProfile,
  onClose,
  onShared,
}: ShareRoutineSheetProps) {
  const [message, setMessage]   = useState('');
  const [sharing, setSharing]   = useState(false);
  const [done, setDone]         = useState(false);

  // ── Share handler ──────────────────────────────────────────────────────────

  const handleShareCommunity = useCallback(async () => {
    setSharing(true);
    try {
      await shareRoutinePublic(routine.id, userId, {
        routineName:  routine.name,
        exercises:    routine.exercises,
        sharerName:   userProfile?.name,
        sharerAvatar: userProfile?.avatar_url ?? undefined,
        message:      message.trim() || undefined,
      });
      setDone(true);
      toast.success('Routine shared to community!');
      onShared?.();
      setTimeout(onClose, 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to share. Please try again.');
    } finally {
      setSharing(false);
    }
  }, [routine, userId, userProfile, message, onClose, onShared]);

  // ── Render ──────────────────────────────────────────────────────────────────

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
          zIndex: 60, backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 61,
          background: BG,
          borderRadius: '22px 22px 0 0',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px 14px',
        }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, color: T1, margin: 0 }}>Share Routine</p>
            <p style={{ fontSize: 12, color: T3, margin: '2px 0 0' }}>{routine.name}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3, padding: 4, lineHeight: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 12px' }}>
          {/* Info card */}
          <div style={{
            background: `${ACCENT}0D`,
            border: `1px solid ${ACCENT}25`,
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', gap: 12, alignItems: 'flex-start',
            marginBottom: 18,
          }}>
            <Globe size={20} color={ACCENT} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: T1, margin: 0 }}>Share to Community</p>
              <p style={{ fontSize: 12, color: T2, margin: '4px 0 0', lineHeight: 1.5 }}>
                Anyone on FitPulse can discover, view, and add this routine to their program.
              </p>
            </div>
          </div>

          {/* Routine preview */}
          <div style={{
            background: SURF, borderRadius: 12,
            border: `1px solid ${BORDER}`,
            padding: '12px 14px', marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${ACCENT}18`, border: `1px solid ${ACCENT}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 18 }}>💪</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: T1, margin: 0 }}>{routine.name}</p>
              <p style={{ fontSize: 12, color: T3, margin: '2px 0 0' }}>
                {routine.exercises.length} {routine.exercises.length === 1 ? 'exercise' : 'exercises'}
              </p>
            </div>
          </div>

          {/* Message */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: T3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell others about this routine..."
              rows={3}
              style={{
                width: '100%', marginTop: 8,
                background: SURF, border: `1px solid ${BORDER}`,
                borderRadius: 12, color: T1, fontSize: 14,
                padding: '12px 14px', resize: 'none',
                fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box', lineHeight: 1.5,
              }}
            />
          </div>

          {/* Share button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleShareCommunity}
            disabled={sharing || done}
            style={{
              width: '100%', height: 52, borderRadius: 14,
              background: done ? '#22C55E' : `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
              border: 'none', color: '#0C1015',
              fontSize: 15, fontWeight: 800,
              cursor: sharing || done ? 'default' : 'pointer',
              opacity: sharing ? 0.7 : 1,
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              transition: 'background 0.25s',
            }}
          >
            {done ? (
              <><Check size={18} /> Shared!</>
            ) : sharing ? (
              'Sharing...'
            ) : (
              <><Globe size={16} /> Share to Community</>
            )}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

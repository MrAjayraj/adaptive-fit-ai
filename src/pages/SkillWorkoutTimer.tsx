import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pause, Play, Square, ChevronRight, ArrowLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFitness } from '@/context/FitnessContext';
import { useAuth } from '@/context/AuthContext';

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
interface SkillState {
  name: string;
  rounds: number;
  roundDurationSeconds: number;
  restBetweenRoundsSeconds: number;
  intensity: 'low' | 'medium' | 'high';
  notes?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const CIRCUMFERENCE = 2 * Math.PI * 90; // ≈ 565.49

// ─── Component ────────────────────────────────────────────────────────────────
export default function SkillWorkoutTimer() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const skillState = location.state as SkillState | null;

  // Guard – bounce back if no state
  useEffect(() => {
    if (!skillState) navigate('/workout', { replace: true });
  }, [skillState, navigate]);

  if (!skillState) return null;

  return <TimerInner skillState={skillState} />;
}

function TimerInner({ skillState }: { skillState: SkillState }) {
  const navigate = useNavigate();
  const { name, rounds, roundDurationSeconds, restBetweenRoundsSeconds } = skillState;

  // ── State ──
  const [phase, setPhase]               = useState<'round' | 'rest' | 'complete'>('round');
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft]         = useState(roundDurationSeconds);
  const [isPaused, setIsPaused]         = useState(false);
  const [totalElapsedSec, setTotalElapsedSec] = useState(0);
  const [completedRounds, setCompletedRounds] = useState<number[]>([]);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [confirmAction, setConfirmAction] = useState<'back' | 'end'>('end');

  // total duration for the current phase (for the ring calculation)
  const totalDuration =
    phase === 'round' ? roundDurationSeconds :
    phase === 'rest'  ? restBetweenRoundsSeconds : 1;

  // ── Main countdown timer ──
  useEffect(() => {
    if (isPaused || phase === 'complete') return;

    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Will hit 0 – handle transition in next tick
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isPaused, phase]);

  // ── Phase transition when timeLeft hits 0 ──
  useEffect(() => {
    if (timeLeft !== 0) return;

    if (phase === 'round') {
      setCompletedRounds(prev => [...prev, currentRound]);

      if (currentRound >= rounds) {
        // Last round finished
        setPhase('complete');
        return;
      }

      if (restBetweenRoundsSeconds === 0) {
        // Skip rest
        setCurrentRound(r => r + 1);
        setTimeLeft(roundDurationSeconds);
        setPhase('round');
      } else {
        setPhase('rest');
        setTimeLeft(restBetweenRoundsSeconds);
      }
    } else if (phase === 'rest') {
      if (currentRound >= rounds) {
        setPhase('complete');
      } else {
        setCurrentRound(r => r + 1);
        setTimeLeft(roundDurationSeconds);
        setPhase('round');
      }
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Total elapsed ticker ──
  useEffect(() => {
    if (isPaused || phase === 'complete') return;
    const id = setInterval(() => setTotalElapsedSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [isPaused, phase]);

  // ── Ring progress ──
  const progress    = totalDuration > 0 ? timeLeft / totalDuration : 0;
  const dashOffset  = CIRCUMFERENCE * progress;
  const ringColor   = phase === 'rest' ? AMBER : ACCENT;

  // ── Confirm dialog helpers ──
  const askBack = () => { setConfirmAction('back'); setShowConfirm(true); setIsPaused(true); };
  const askEnd  = () => { setConfirmAction('end');  setShowConfirm(true); setIsPaused(true); };

  const handleConfirm = () => {
    const stats = buildStats();
    if (confirmAction === 'back') {
      navigate('/workout');
    } else {
      navigate('/workout-summary', { state: stats });
    }
  };

  const handleKeepGoing = () => {
    setShowConfirm(false);
    setIsPaused(false);
  };

  const buildStats = () => ({
    workoutName:   name,
    workoutType:   'skill' as const,
    duration:      Math.round(totalElapsedSec / 60) || 1,
    totalRounds:   completedRounds.length,
    caloriesBurned: Math.round((totalElapsedSec / 60) * 8),
    xpEarned:      completedRounds.length * 20,
    rpEarned:      completedRounds.length * 3,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        background: BG,
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '16px 16px',
          paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
          background: 'rgba(12,16,21,0.92)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Back */}
        <button
          onClick={askBack}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: T2,
            padding: 0,
          }}
        >
          <ArrowLeft size={22} />
        </button>

        {/* Title */}
        <p style={{ fontSize: 16, fontWeight: 700, color: T1, margin: 0 }}>
          {name}
        </p>

        {/* Spacer */}
        <div style={{ width: 36 }} />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 32px',
          gap: 0,
        }}
      >
        {/* Phase label */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: phase === 'rest' ? AMBER : ACCENT,
            marginBottom: 8,
            margin: '0 0 8px',
          }}
        >
          {phase === 'rest'
            ? 'REST'
            : phase === 'complete'
            ? 'COMPLETE'
            : `ROUND ${currentRound} OF ${rounds}`}
        </p>

        {/* Circular timer */}
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            border: '2px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* SVG ring */}
          <svg
            width={200}
            height={200}
            style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
          >
            {/* Track */}
            <circle
              cx={100}
              cy={100}
              r={90}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={6}
            />
            {/* Progress */}
            <circle
              cx={100}
              cy={100}
              r={90}
              fill="none"
              stroke={ringColor}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
            />
          </svg>

          {/* Center text */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <span
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: T1,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                fontFeatureSettings: '"tnum"',
              }}
            >
              {formatTime(timeLeft)}
            </span>
            <span style={{ fontSize: 11, color: T3, marginTop: 6 }}>
              {phase === 'rest' ? 'Rest Time' : 'Round Time'}
            </span>
          </div>
        </div>

        {/* Next-up label */}
        <p
          style={{
            fontSize: 11,
            color: phase === 'rest' ? ACCENT : T3,
            marginTop: 18,
            margin: '18px 0 0',
          }}
        >
          {phase === 'round' &&
            `NEXT: ${restBetweenRoundsSeconds === 0 ? 'Next Round' : `REST · ${restBetweenRoundsSeconds}s`}`}
          {phase === 'rest' && `NEXT: Round ${currentRound + 1}`}
        </p>

        {/* Round dots */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 8,
            marginTop: 20,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 280,
          }}
        >
          {Array.from({ length: rounds }, (_, i) => {
            const roundNum = i + 1;
            const done     = completedRounds.includes(roundNum);
            const active   = roundNum === currentRound && phase === 'round';
            return (
              <div
                key={roundNum}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: done
                    ? ACCENT
                    : active
                    ? `rgba(12,255,156,0.45)`
                    : T3,
                  transition: 'background 0.3s ease',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ── BOTTOM CONTROLS ── */}
      <div
        style={{
          padding: '0 32px 32px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
        }}
      >
        {/* Pause / Play */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsPaused(p => !p)}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: SURFACE_UP,
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: T1,
            flexShrink: 0,
          }}
        >
          {isPaused ? <Play size={22} fill={T1} /> : <Pause size={22} />}
        </motion.button>

        {/* End workout */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={askEnd}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#EF4444',
            flexShrink: 0,
          }}
        >
          <Square size={22} />
        </motion.button>
      </div>

      {/* ── COMPLETE OVERLAY ── */}
      <AnimatePresence>
        {phase === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 60,
              padding: '32px',
            }}
          >
            {/* Check circle */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
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

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: T1,
                marginTop: 20,
                textAlign: 'center',
                margin: '20px 0 4px',
              }}
            >
              All Rounds Complete! 🏆
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{ fontSize: 14, color: T2, margin: '4px 0 32px', textAlign: 'center' }}
            >
              {skillState.name}
            </motion.p>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 24,
                marginBottom: 40,
              }}
            >
              {[
                { label: 'Rounds',   value: `${rounds}` },
                { label: 'Total',    value: formatTime(totalElapsedSec) },
                { label: 'Calories', value: `${Math.round((totalElapsedSec / 60) * 8)} kcal` },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: T1, margin: '0 0 4px' }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: 11, color: T3, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}
            >
              <button
                onClick={() => navigate('/workout-summary', { state: buildCompleteStats() })}
                style={{
                  height: 52,
                  borderRadius: 14,
                  background: ACCENT,
                  border: 'none',
                  color: BG,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                View Summary
              </button>
              <button
                onClick={() => navigate('/workout')}
                style={{
                  height: 48,
                  borderRadius: 14,
                  background: 'none',
                  border: `1px solid rgba(255,255,255,0.12)`,
                  color: T2,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONFIRM DIALOG ── */}
      <AnimatePresence>
        {showConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleKeepGoing}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                zIndex: 70,
              }}
            />

            {/* Bottom sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 80,
                background: SURFACE,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: '28px 24px',
                paddingBottom: 'max(28px, env(safe-area-inset-bottom, 28px))',
              }}
            >
              {/* Handle */}
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.12)',
                  margin: '0 auto 24px',
                }}
              />

              <h3 style={{ fontSize: 18, fontWeight: 800, color: T1, margin: '0 0 6px', textAlign: 'center' }}>
                End workout?
              </h3>
              <p style={{ fontSize: 14, color: T2, margin: '0 0 28px', textAlign: 'center' }}>
                Your progress will be lost.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={handleKeepGoing}
                  style={{
                    height: 52,
                    borderRadius: 14,
                    background: ACCENT,
                    border: 'none',
                    color: BG,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Keep Going
                </button>
                <button
                  onClick={handleConfirm}
                  style={{
                    height: 48,
                    borderRadius: 14,
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#EF4444',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  End Workout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  // helper defined inside render scope so it can reference latest state
  function buildCompleteStats() {
    return {
      workoutName:    name,
      workoutType:    'skill' as const,
      duration:       Math.round(totalElapsedSec / 60) || 1,
      totalRounds:    rounds,
      caloriesBurned: Math.round((totalElapsedSec / 60) * 8),
      xpEarned:       rounds * 20,
      rpEarned:       rounds * 3,
    };
  }
}

// Re-export the inner name under the expected default as well
// (TimerInner is kept internal; SkillWorkoutTimer is the real default)

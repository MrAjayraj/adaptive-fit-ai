/**
 * @file animationSystem.tsx
 * FitPulse Animation System — Web (Framer Motion)
 *
 * NOTE: The project is a Vite + React web app, so this file uses
 * Framer Motion instead of React Native Reanimated 2.
 * Every utility maps 1-to-1 to the Reanimated spec:
 *
 *   Reanimated concept          →  Framer Motion equivalent
 *   ─────────────────────────────────────────────────────────
 *   useSharedValue / withSpring → useSpring / useMotionValue
 *   useAnimatedStyle             → motion element style prop
 *   withTiming / withSequence    → animate / transition
 *   Animated.loop                → animate with repeat: Infinity
 *   runOnJS                      → plain callback in onAnimationComplete
 *
 * Brand palette:
 *   Primary   #FF6B35  (brand orange)
 *   Surface   #1F1F24
 *   Green     #4AE176
 *   Accent    #FFB59D
 */

import React, {
  CSSProperties,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const BRAND = {
  primary:   '#FF6B35',
  primaryDim:'#FFB59D',
  green:     '#4AE176',
  cyan:      '#00E5FF',
  purple:    '#B066FF',
  yellow:    '#FFD600',
  surface:   '#1F1F24',
  bg:        '#131318',
} as const;

const CONFETTI_COLORS = [
  BRAND.primary, BRAND.primaryDim, BRAND.green,
  BRAND.cyan, BRAND.purple, BRAND.yellow,
];

// ─── Utilities ─────────────────────────────────────────────────────────────────
function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. useMessageSendSpring
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Hook — bubble scale 0.85 → 1.0 spring on send.
 * Reanimated equiv: withSpring(1, { damping:12, stiffness:180 })
 *
 * @example
 * ```tsx
 * const { scaleStyle, trigger } = useMessageSendSpring();
 * <motion.div style={scaleStyle} onAnimationStart={trigger}>
 *   {bubble}
 * </motion.div>
 * ```
 */
export interface UseMessageSendSpringReturn {
  /** Pass directly to a <motion.*> element's `animate` prop after `trigger()` */
  animate: object;
  /** Call this when a message is sent to fire the spring */
  trigger: () => void;
}

export function useMessageSendSpring(): UseMessageSendSpringReturn {
  const [key, setKey] = useState(0);
  const trigger = () => setKey((k) => k + 1);

  const animate = key === 0
    ? { scale: 1 }
    : { scale: [0.85, 1] };

  return {
    animate,
    trigger,
  };
}

// Usage wrapper — wrap each outgoing bubble with this
export interface MessageBubbleWrapperProps {
  /** Set true every time the message is sent (flips internal key) */
  sent: boolean;
  children: React.ReactNode;
  style?: CSSProperties;
}

/**
 * Wraps a message bubble with the send-spring animation.
 * @example
 * ```tsx
 * <MessageBubbleWrapper sent={justSent}>
 *   <div className="bubble">Hello!</div>
 * </MessageBubbleWrapper>
 * ```
 */
export const MessageBubbleWrapper: React.FC<MessageBubbleWrapperProps> = ({
  sent, children, style,
}) => {
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { if (sent) setAnimKey((k) => k + 1); }, [sent]);

  return (
    <motion.div
      key={animKey}
      initial={{ scale: 0.85 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 12, stiffness: 180 }}
      style={{ display: 'inline-flex', ...style }}
    >
      {children}
    </motion.div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. HeartBurst
// ══════════════════════════════════════════════════════════════════════════════
export interface HeartBurstProps {
  /** x coordinate of the tap (e.g. from MouseEvent.clientX) */
  x: number;
  /** y coordinate of the tap (e.g. from MouseEvent.clientY) */
  y: number;
  /** Called after the animation completes (auto-dismiss) */
  onComplete?: () => void;
}

/**
 * Absolute-positioned heart that bursts from a tap point.
 * scale: 0 → 1.4 → 1, opacity 1 → 0, 400ms.
 * Brand orange #FF6B35.
 *
 * @example
 * ```tsx
 * const [burst, setBurst] = useState<{x:number;y:number}|null>(null);
 *
 * <div onDoubleClick={(e) => setBurst({ x: e.clientX, y: e.clientY })}>
 *   {burst && (
 *     <HeartBurst x={burst.x} y={burst.y} onComplete={() => setBurst(null)} />
 *   )}
 * </div>
 * ```
 */
export const HeartBurst: React.FC<HeartBurstProps> = ({ x, y, onComplete }) => (
  <motion.div
    initial={{ scale: 0, opacity: 1, x: x - 24, y: y - 24 }}
    animate={{ scale: [0, 1.4, 1], opacity: [1, 1, 0] }}
    transition={{ duration: 0.4, times: [0, 0.55, 1], ease: 'easeOut' }}
    onAnimationComplete={onComplete}
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: 48,
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 36,
      pointerEvents: 'none',
      zIndex: 9999,
      color: BRAND.primary,
      userSelect: 'none',
    }}
  >
    ❤️
  </motion.div>
);

// ══════════════════════════════════════════════════════════════════════════════
// 3. ConfettiRain
// ══════════════════════════════════════════════════════════════════════════════
interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  rotation: number;
}

const PARTICLE_COUNT = 40;

function makeParticles(): ConfettiParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: randomBetween(2, 98),          // % across screen width
    color: randomItem(CONFETTI_COLORS),
    delay: randomBetween(0, 0.6),
    size: randomBetween(6, 12),
    rotation: randomBetween(0, 360),
  }));
}

export interface ConfettiRainProps {
  /** Whether the confetti is currently active */
  active: boolean;
  /** Called after all particles have fallen (≈ 1.8s + max delay 0.6s) */
  onComplete?: () => void;
}

/**
 * 40 confetti particles falling from the top over 1.8s.
 * Trigger on challenge win by setting active=true.
 *
 * @example
 * ```tsx
 * const [won, setWon] = useState(false);
 * <ConfettiRain active={won} onComplete={() => setWon(false)} />
 * ```
 */
export const ConfettiRain: React.FC<ConfettiRainProps> = ({ active, onComplete }) => {
  const [particles] = useState(makeParticles);
  const lastParticleDelay = Math.max(...particles.map((p) => p.delay));
  const totalDuration = 1.8 + lastParticleDelay;

  useEffect(() => {
    if (!active || !onComplete) return;
    const t = setTimeout(() => onComplete(), totalDuration * 1000 + 100);
    return () => clearTimeout(t);
  }, [active, onComplete, totalDuration]);

  if (!active) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        pointerEvents: 'none', zIndex: 9990, overflow: 'hidden',
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: p.rotation }}
          animate={{
            y: '105vh',
            opacity: [1, 1, 0],
            rotate: p.rotation + randomBetween(-180, 180),
          }}
          transition={{
            duration: 1.8,
            delay: p.delay,
            ease: 'easeIn',
            times: [0, 0.8, 1],
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: randomBetween(0, 1) > 0.5 ? '50%' : 2,
          }}
        />
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 4. KudosFloat
// ══════════════════════════════════════════════════════════════════════════════
export interface KudosFloatProps {
  /** Whether the float animation is active */
  visible: boolean;
  /** Called after the 600ms animation completes */
  onComplete?: () => void;
  /** Override the label (default "+Kudos 💪") */
  label?: string;
  /** Bottom offset from which the text starts floating */
  bottom?: number;
}

/**
 * "+Kudos 💪" text floats upward from the reaction bar and fades out over 600ms.
 *
 * @example
 * ```tsx
 * const [showKudos, setShowKudos] = useState(false);
 * <button onClick={() => setShowKudos(true)}>💪 Kudos</button>
 * <KudosFloat visible={showKudos} onComplete={() => setShowKudos(false)} />
 * ```
 */
export const KudosFloat: React.FC<KudosFloatProps> = ({
  visible,
  onComplete,
  label = '+Kudos 💪',
  bottom = 80,
}) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: -64, opacity: 0 }}
        exit={{}}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        onAnimationComplete={onComplete}
        style={{
          position: 'fixed',
          bottom,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9998,
          pointerEvents: 'none',
          backgroundColor: BRAND.primary,
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 700,
          padding: '6px 16px',
          borderRadius: 24,
          whiteSpace: 'nowrap',
          boxShadow: `0 4px 16px ${BRAND.primary}44`,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </motion.div>
    )}
  </AnimatePresence>
);

// ══════════════════════════════════════════════════════════════════════════════
// 5. useTypingDots
// ══════════════════════════════════════════════════════════════════════════════
export interface UseTypingDotsReturn {
  /** Render this element to show the typing indicator */
  TypingIndicator: React.FC;
}

/**
 * 3 staggered scale-pulsing dots while isTyping=true.
 * 200ms stagger, loops continuously.
 * Reanimated equiv: withRepeat(withSequence(...), -1, true)
 *
 * @example
 * ```tsx
 * const { TypingIndicator } = useTypingDots(isFriendTyping);
 * {isFriendTyping && <TypingIndicator />}
 * ```
 */
export function useTypingDots(isTyping: boolean): UseTypingDotsReturn {
  const TypingIndicator: React.FC = () => {
    if (!isTyping) return null;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 14px',
          backgroundColor: BRAND.surface,
          borderRadius: '18px 18px 18px 4px',
          alignSelf: 'flex-start',
          width: 52,
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{
              duration: 0.6,
              delay: i * 0.2,
              repeat: Infinity,
              repeatDelay: 0.2,
              ease: 'easeInOut',
            }}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: BRAND.primaryDim,
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    );
  };

  return { TypingIndicator };
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. ChallengeCompleteExplosion
// ══════════════════════════════════════════════════════════════════════════════
interface ExplosionParticle {
  id: number;
  angle: number;
  distance: number;
  color: string;
  size: number;
}

const EXPLOSION_COUNT = 60;

function makeExplosionParticles(): ExplosionParticle[] {
  return Array.from({ length: EXPLOSION_COUNT }, (_, i) => ({
    id: i,
    angle: (i / EXPLOSION_COUNT) * 360 + randomBetween(-10, 10),
    distance: randomBetween(80, 200),
    color: randomItem(CONFETTI_COLORS),
    size: randomBetween(5, 12),
  }));
}

export interface ChallengeCompleteExplosionProps {
  /** Whether the explosion overlay is visible */
  visible: boolean;
  /** Called after auto-dismiss at 2.4s */
  onDismiss?: () => void;
  /** Override the label (default "Challenge Complete!") */
  label?: string;
}

/**
 * Full-screen overlay: 60-particle burst + trophy scale-up + label, 2.4s, auto-dismiss.
 * Reanimated equiv: withSequence + runOnJS(onDismiss)
 *
 * @example
 * ```tsx
 * const [explode, setExplode] = useState(false);
 * <button onClick={() => setExplode(true)}>Complete</button>
 * <ChallengeCompleteExplosion
 *   visible={explode}
 *   onDismiss={() => setExplode(false)}
 * />
 * ```
 */
export const ChallengeCompleteExplosion: React.FC<ChallengeCompleteExplosionProps> = ({
  visible,
  onDismiss,
  label = 'Challenge Complete!',
}) => {
  const [particles] = useState(makeExplosionParticles);

  useEffect(() => {
    if (!visible || !onDismiss) return;
    const t = setTimeout(() => onDismiss(), 2_400);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 16,
            backgroundColor: 'rgba(0,0,0,0.72)',
            zIndex: 9995,
            pointerEvents: 'none',
          }}
        >
          {/* Particles */}
          {particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.distance;
            const ty = Math.sin(rad) * p.distance;
            return (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{ x: tx, y: ty, scale: 0, opacity: 0 }}
                transition={{ duration: 1.0, ease: 'easeOut', delay: 0.1 }}
                style={{
                  position: 'absolute',
                  width: p.size, height: p.size,
                  backgroundColor: p.color,
                  borderRadius: p.size / 2,
                }}
              />
            );
          })}

          {/* Trophy */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1.0] }}
            transition={{ duration: 0.6, times: [0, 0.6, 1], ease: 'easeOut' }}
            style={{ fontSize: 80, lineHeight: 1, userSelect: 'none' }}
          >
            🏆
          </motion.div>

          {/* Label */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            style={{
              margin: 0,
              fontSize: 26, fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: 0.5,
              textAlign: 'center',
              textShadow: `0 2px 16px ${BRAND.primary}88`,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {label}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 7. ShareCardSlideUp
// ══════════════════════════════════════════════════════════════════════════════
export interface ShareCardSlideUpProps {
  /** Whether the bottom sheet is open */
  open: boolean;
  /** Called when the backdrop is tapped or sheet is dismissed */
  onClose: () => void;
  /** Content rendered inside the sheet */
  children: React.ReactNode;
  /** Max height of the sheet (default 480) */
  maxHeight?: number;
}

/**
 * Bottom sheet slides up from y:300→0 with spring(damping:20),
 * backdrop fades in behind.
 * Reanimated equiv: withSpring(translateY, { damping:20 })
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <button onClick={() => setOpen(true)}>Share Workout</button>
 * <ShareCardSlideUp open={open} onClose={() => setOpen(false)}>
 *   <ShareWorkoutCard ... />
 * </ShareCardSlideUp>
 * ```
 */
export const ShareCardSlideUp: React.FC<ShareCardSlideUpProps> = ({
  open,
  onClose,
  children,
  maxHeight = 480,
}) => (
  <AnimatePresence>
    {open && (
      <>
        {/* Backdrop */}
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9970,
          }}
        />

        {/* Sheet */}
        <motion.div
          key="sheet"
          initial={{ y: 300 }}
          animate={{ y: 0 }}
          exit={{ y: 300 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            zIndex: 9971,
            backgroundColor: BRAND.surface,
            borderRadius: '24px 24px 0 0',
            maxHeight,
            overflowY: 'auto',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Handle bar */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.15)',
            }} />
          </div>
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

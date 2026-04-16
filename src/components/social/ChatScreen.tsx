/**
 * ChatScreen.tsx
 * FitPulse – DM Chat Screen  (Web React – Vite, no react-native)
 *
 * Stitch design: Kinetic Obsidian
 *   Primary   #FF6B35  brand orange
 *   Green     #4AE176  online LED
 *   Surface   #131318 → #1F1F24 → #2A292F → #35343A
 *
 * Features:
 *  - Glassmorphism header: back + avatar + name/status + video icon
 *  - Chat bubbles: outgoing (orange, top-right: 4px) / incoming (surface)
 *  - Workout card bubble: icon, stats, "View Workout" CTA
 *  - Timestamp groups (centered, 11px muted)
 *  - Swipe/drag right on any bubble → quoted reply bar (3px orange left-border)
 *  - Long-press (> 400 ms) → floating emoji reaction bar (6 emojis)
 *  - Reactions rendered as orange pill chips below bubble
 *  - Reply preview bar above input (3px orange left-border + × close)
 *  - Input bar: attachment + text field + orange send button
 */

import React, {
  CSSProperties,
  useEffect,
  useRef,
  useState,
} from 'react';

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
  outline:   'rgba(89,65,57,0.18)',
} as const;

const REACTION_EMOJIS = ['❤️', '💪', '🔥', '😂', '👏', '✅'] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type MessageType = 'text' | 'workout-card';

interface Reaction { emoji: string; count: number }

interface WorkoutCard {
  icon: string;
  name: string;
  duration: string;
  calories: string;
  exercises: string;
}

interface Message {
  id: string;
  type: MessageType;
  text?: string;
  card?: WorkoutCard;
  outgoing: boolean;
  timestamp: string;
  showTimestamp?: boolean;
  reactions?: Reaction[];
  replyTo?: { name: string; preview: string };
}

// ─── Mock messages ────────────────────────────────────────────────────────────
const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    type: 'text',
    text: "Hey! Ready for today's leg day? 💪",
    outgoing: false,
    timestamp: '9:41 AM',
    showTimestamp: true,
  },
  {
    id: '2',
    type: 'text',
    text: 'Absolutely! Just finished my warm-up 🔥',
    outgoing: true,
    timestamp: '9:42 AM',
  },
  {
    id: '3',
    type: 'text',
    text: 'Check out my workout from yesterday 👇',
    outgoing: false,
    timestamp: '9:43 AM',
  },
  {
    id: '4',
    type: 'workout-card',
    outgoing: false,
    timestamp: '9:43 AM',
    card: {
      icon: '🏋️',
      name: 'Leg Day Destroyer',
      duration: '45 min',
      calories: '420 kcal',
      exercises: 'Squats • Lunges • Leg Press • +3 more',
    },
  },
  {
    id: '5',
    type: 'text',
    text: 'This looks insane! Sending mine too 💯',
    outgoing: true,
    timestamp: '9:44 AM',
    showTimestamp: true,
    reactions: [{ emoji: '❤️', count: 1 }],
    replyTo: { name: 'Alex Rivera', preview: 'Check out my workout from yesterday 👇' },
  },
  {
    id: '6',
    type: 'text',
    text: "Let's crush it today! See you at the gym 🏃",
    outgoing: false,
    timestamp: '9:45 AM',
  },
];

// ─── Swipe-to-reply hook ──────────────────────────────────────────────────────
interface SwipeState { offsetX: number; triggered: boolean }

function useBubbleSwipe(onReply: () => void) {
  const [state, setState] = useState<SwipeState>({ offsetX: 0, triggered: false });
  const startX = useRef(0);
  const dragging = useRef(false);
  // Mutable ref so onPointerUp always reads the latest offset (avoids stale closure).
  const offsetXRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    dragging.current = true;
    offsetXRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const clamped = Math.max(0, Math.min(72, dx)); // right only, max 72px
    offsetXRef.current = clamped;
    setState({ offsetX: clamped, triggered: false });
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (offsetXRef.current > 50) onReply();
    offsetXRef.current = 0;
    setState({ offsetX: 0, triggered: false });
  };

  return { offsetX: state.offsetX, onPointerDown, onPointerMove, onPointerUp };
}

// ─── Bubble border-radius ─────────────────────────────────────────────────────
const bubbleRadius = (outgoing: boolean): string =>
  outgoing
    ? '18px 4px 18px 18px'   // top-right pinched
    : '4px 18px 18px 18px';  // top-left pinched

// ─── WorkoutCardBubble ────────────────────────────────────────────────────────
const WorkoutCardBubble: React.FC<{
  card: WorkoutCard;
  onViewWorkout: () => void;
}> = ({ card, onViewWorkout }) => (
  <div style={s.workoutCard}>
    <div style={s.wcHeader}>
      <span style={s.wcIcon}>{card.icon}</span>
      <span style={s.wcName}>{card.name}</span>
    </div>
    <div style={s.wcStats}>
      <span style={s.wcStat}>🕐 {card.duration}</span>
      <span style={s.wcStatDot}>•</span>
      <span style={s.wcStat}>🔥 {card.calories}</span>
    </div>
    <p style={s.wcExercises}>{card.exercises}</p>
    <button style={s.wcBtn} onClick={onViewWorkout}>
      View Workout
    </button>
  </div>
);

// ─── ReactionBar floating overlay ─────────────────────────────────────────────
const ReactionBar: React.FC<{
  visible: boolean;
  onReact: (emoji: string) => void;
  onClose: () => void;
}> = ({ visible, onReact, onClose }) => {
  if (!visible) return null;
  return (
    <>
      {/* backdrop */}
      <div style={s.reactionBackdrop} onClick={onClose} />
      <div style={s.reactionBar}>
        {REACTION_EMOJIS.map((e) => (
          <button
            key={e}
            style={s.reactionBtn}
            onClick={() => { onReact(e); onClose(); }}
          >
            {e}
          </button>
        ))}
      </div>
    </>
  );
};

// ─── Single message bubble ────────────────────────────────────────────────────
interface BubbleProps {
  msg: Message;
  onReply: (msg: Message) => void;
  onReact: (id: string, emoji: string) => void;
}

const MessageBubble: React.FC<BubbleProps> = ({ msg, onReply, onReact }) => {
  const [showReactions, setShowReactions] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipe = useBubbleSwipe(() => onReply(msg));

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => setShowReactions(true), 420);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Cleanup: clear any pending timer if the component unmounts mid-press.
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };
  }, []);

  const bubbleBg = msg.outgoing ? C.primary : C.surface;
  const textColor = msg.outgoing ? '#FFFFFF' : C.textPri;
  const align = msg.outgoing ? 'flex-end' : 'flex-start';

  return (
    <>
      <ReactionBar
        visible={showReactions}
        onReact={(emoji) => onReact(msg.id, emoji)}
        onClose={() => setShowReactions(false)}
      />

      {/* timestamp */}
      {msg.showTimestamp && (
        <div style={s.tsLabel}>{msg.timestamp}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, margin: '3px 0' }}>
        {/* reply context */}
        {msg.replyTo && (
          <div
            style={{
              ...s.replyContext,
              alignSelf: align,
              marginRight: msg.outgoing ? 0 : undefined,
              marginLeft: !msg.outgoing ? 0 : undefined,
            }}
          >
            <div style={s.replyContextBar} />
            <div>
              <span style={s.replyContextName}>{msg.replyTo.name}</span>
              <p style={s.replyContextText}>{msg.replyTo.preview}</p>
            </div>
          </div>
        )}

        {/* bubble */}
        <div
          style={{
            ...s.bubbleWrapper,
            justifyContent: align,
            transform: `translateX(${msg.outgoing ? 0 : swipe.offsetX}px)`,
            transition: swipe.offsetX === 0 ? 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          }}
          onPointerDown={(e) => { swipe.onPointerDown(e); startLongPress(); }}
          onPointerMove={swipe.onPointerMove}
          onPointerUp={(e) => { swipe.onPointerUp(); cancelLongPress(); }}
          onPointerCancel={(e) => { swipe.onPointerUp(); cancelLongPress(); }}
        >
          <div
            style={{
              backgroundColor: bubbleBg,
              borderRadius: bubbleRadius(msg.outgoing),
              padding: msg.type === 'workout-card' ? '4px' : '10px 14px',
              maxWidth: msg.type === 'workout-card' ? 280 : 280,
              border: msg.type === 'workout-card' ? `1px solid ${C.primary}44` : undefined,
              boxShadow: msg.outgoing
                ? '0 2px 12px rgba(255,107,53,0.25)'
                : '0 2px 8px rgba(0,0,0,0.25)',
            }}
          >
            {msg.type === 'workout-card' && msg.card ? (
              <WorkoutCardBubble
                card={msg.card}
                onViewWorkout={() => console.log('View workout')}
              />
            ) : (
              <span style={{ fontSize: 15, color: textColor, lineHeight: '22px', wordBreak: 'break-word' }}>
                {msg.text}
              </span>
            )}
          </div>
        </div>

        {/* reaction chips */}
        {!!msg.reactions?.length && (
          <div style={{ ...s.reactionsRow, justifyContent: align }}>
            {msg.reactions.map((r) => (
              <span key={r.emoji} style={s.reactionChip}>
                {r.emoji} {r.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Main ChatScreen ──────────────────────────────────────────────────────────
const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      type: 'text',
      text,
      outgoing: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      showTimestamp: true,
      replyTo: replyingTo
        ? { name: replyingTo.outgoing ? 'You' : 'Alex Rivera', preview: replyingTo.text ?? '' }
        : undefined,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setReplyingTo(null);
  };

  const handleReact = (id: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const existing = m.reactions ?? [];
        const idx = existing.findIndex((r) => r.emoji === emoji);
        const updated =
          idx >= 0
            ? existing.map((r, i) => (i === idx ? { ...r, count: r.count + 1 } : r))
            : [...existing, { emoji, count: 1 }];
        return { ...m, reactions: updated };
      })
    );
  };

  return (
    <div style={s.safe}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <button style={s.headerBtn} aria-label="Back">
          <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span>
        </button>

        <div style={s.headerAvatar}>
          <div style={s.avatar}>AR</div>
          <div style={s.onlineDot} />
        </div>

        <div style={s.headerInfo}>
          <span style={s.headerName}>Alex Rivera</span>
          <span style={s.headerStatus}>● Online</span>
        </div>

        <div style={{ flex: 1 }} />

        <button style={s.videoBtn} aria-label="Video call">
          <span style={{ fontSize: 18 }}>📹</span>
        </button>
      </div>

      {/* ── Message list ────────────────────────────────────────────────── */}
      <div ref={listRef} style={s.messageList}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onReply={setReplyingTo}
            onReact={handleReact}
          />
        ))}
        {/* bottom padding */}
        <div style={{ height: 16 }} />
      </div>

      {/* ── Reply preview bar ────────────────────────────────────────────── */}
      {replyingTo && (
        <div style={s.replyBar}>
          <div style={s.replyBarBorder} />
          <div style={{ flex: 1 }}>
            <span style={s.replyBarName}>
              Replying to {replyingTo.outgoing ? 'yourself' : 'Alex Rivera'}
            </span>
            <p style={s.replyBarText} title={replyingTo.text}>
              {replyingTo.text ?? replyingTo.card?.name}
            </p>
          </div>
          <button style={s.replyCloseBtn} onClick={() => setReplyingTo(null)}>
            ×
          </button>
        </div>
      )}

      {/* ── Input bar ────────────────────────────────────────────────────── */}
      <div style={s.inputBar}>
        <button style={s.inputIconBtn} aria-label="Attachment">
          <span style={{ fontSize: 20 }}>＋</span>
        </button>

        <input
          style={s.textInput}
          placeholder="Type a message…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
        />

        <button style={s.sendBtn} onClick={handleSend} aria-label="Send">
          <span style={{ fontSize: 18 }}>➤</span>
        </button>
      </div>
    </div>
  );
};

export default ChatScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, CSSProperties> = {
  safe: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    backgroundColor: C.bg,
    fontFamily: "'Inter', 'Manrope', sans-serif",
    color: C.textPri,
    position: 'relative',
    overflow: 'hidden',
  },

  // ── Header
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    backgroundColor: 'rgba(19,19,24,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    flexShrink: 0,
    borderBottom: `1px solid ${C.outline}`,
  },
  headerBtn: {
    background: 'none',
    border: 'none',
    color: C.textPri,
    cursor: 'pointer',
    padding: '0 4px',
    display: 'flex',
    alignItems: 'center',
  },
  headerAvatar: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.green,
    border: `2px solid ${C.bg}`,
    boxShadow: `0 0 5px 1px ${C.green}99`,
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  headerName: {
    fontSize: 16,
    fontWeight: 700,
    color: C.textPri,
    lineHeight: '20px',
  },
  headerStatus: {
    fontSize: 12,
    color: C.green,
    fontWeight: 500,
    lineHeight: '16px',
  },
  videoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceHi,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Message list
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },

  // ── Timestamp
  tsLabel: {
    alignSelf: 'center',
    fontSize: 11,
    color: C.textMuted,
    margin: '12px 0 4px',
    fontWeight: 500,
    letterSpacing: 0.3,
  },

  // ── Bubble wrapper
  bubbleWrapper: {
    display: 'flex',
    width: '100%',
    touchAction: 'pan-y',
    userSelect: 'none',
    cursor: 'default',
  },

  // ── Reply context (above bubble)
  replyContext: {
    display: 'flex',
    gap: 8,
    marginBottom: 4,
    maxWidth: 260,
    backgroundColor: C.surfaceHi,
    borderRadius: 10,
    padding: '6px 10px',
    overflow: 'hidden',
  },
  replyContextBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: C.primary,
    flexShrink: 0,
  },
  replyContextName: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: C.primary,
    marginBottom: 2,
  },
  replyContextText: {
    margin: 0,
    fontSize: 12,
    color: C.textMuted,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 220,
  },

  // ── Reaction row
  reactionsRow: {
    display: 'flex',
    gap: 4,
    marginTop: 4,
    width: '100%',
  },
  reactionChip: {
    backgroundColor: C.primary,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 600,
    padding: '2px 10px',
    borderRadius: 12,
  },

  // ── Floating reaction bar
  reactionBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 40,
  },
  reactionBar: {
    position: 'fixed',
    bottom: 90,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 50,
    display: 'flex',
    gap: 4,
    backgroundColor: 'rgba(53,52,58,0.90)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 36,
    padding: '8px 16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    border: `1px solid ${C.outline}`,
  },
  reactionBtn: {
    background: 'none',
    border: 'none',
    fontSize: 26,
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: 8,
    transition: 'transform 0.15s ease',
    lineHeight: 1,
  },

  // ── Reply preview bar
  replyBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 16px',
    backgroundColor: C.surfaceHi,
    flexShrink: 0,
    borderTop: `1px solid ${C.outline}`,
  },
  replyBarBorder: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: C.primary,
    flexShrink: 0,
  },
  replyBarName: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: C.primary,
    marginBottom: 2,
  },
  replyBarText: {
    margin: 0,
    fontSize: 12,
    color: C.textMuted,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 260,
  },
  replyCloseBtn: {
    background: 'none',
    border: 'none',
    color: C.textMuted,
    fontSize: 20,
    cursor: 'pointer',
    padding: 4,
    lineHeight: 1,
  },

  // ── Input bar
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    backgroundColor: 'rgba(19,19,24,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    flexShrink: 0,
    borderTop: `1px solid ${C.outline}`,
  },
  inputIconBtn: {
    background: 'none',
    border: 'none',
    color: C.textMuted,
    fontSize: 22,
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0E0E13',
    border: `1px solid ${C.outline}`,
    borderRadius: 24,
    padding: '10px 16px',
    fontSize: 15,
    color: C.textPri,
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primary,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    boxShadow: '0 2px 12px rgba(255,107,53,0.4)',
    flexShrink: 0,
  },

  // ── Workout card (inside bubble)
  workoutCard: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  wcHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  wcIcon: { fontSize: 24 },
  wcName: {
    fontSize: 16,
    fontWeight: 700,
    color: C.textPri,
  },
  wcStats: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  wcStat: {
    fontSize: 13,
    color: C.textSec,
    fontWeight: 500,
  },
  wcStatDot: {
    fontSize: 13,
    color: C.textMuted,
  },
  wcExercises: {
    margin: 0,
    fontSize: 12,
    color: C.textMuted,
    lineHeight: '18px',
  },
  wcBtn: {
    marginTop: 4,
    width: '100%',
    padding: '10px 0',
    borderRadius: 12,
    background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDim})`,
    border: 'none',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 0.3,
  },
};

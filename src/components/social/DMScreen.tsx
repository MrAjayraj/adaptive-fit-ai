// src/components/social/DMScreen.tsx
// WhatsApp-quality private chat — Kinetic Pulse design system
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, Dumbbell, MoreVertical, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useFitness } from '@/context/FitnessContext';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { markConversationRead, getConversationId } from '@/services/chatService';
import Avatar from '@/components/shared/Avatar';
import ChatBubble from './ChatBubble';
import type { BubbleMessage } from './ChatBubble';
import ChatInput from './ChatInput';
import WorkoutShareCard from './WorkoutShareCard';
import type { Reaction } from './MessageReactions';
import { ReactionPicker } from './MessageReactions';
import { supabase } from '@/integrations/supabase/client';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT       = '#0CFF9C';
const BG           = '#0C1015';
const SURFACE      = '#141A1F';
const SURFACE_UP   = '#1C2429';
const T1           = '#EAEEF2';
const T2           = '#8899AA';
const T3           = '#4A5568';
const GREEN_BORDER = 'rgba(12,255,156,0.15)';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function withinGroup(a: BubbleMessage, b: BubbleMessage): boolean {
  if (a.sender_id !== b.sender_id) return false;
  return (
    Math.abs(
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) < 2 * 60 * 1000
  );
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function formatDateLabel(iso: string): string {
  const d   = new Date(iso);
  const now  = new Date();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'TODAY';
  if (d.toDateString() === yest.toDateString()) return 'YESTERDAY';
  return d
    .toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();
}

// ─── Date separator ───────────────────────────────────────────────────────────
function DateSeparator({ label }: { label: string }) {
  return (
    <div
      style={{
        display:        'flex',
        justifyContent: 'center',
        margin:         '12px 0',
      }}
    >
      <span
        style={{
          fontSize:     11,
          color:        T3,
          textTransform:'uppercase',
          letterSpacing:'0.08em',
          background:   SURFACE_UP,
          padding:      '3px 12px',
          borderRadius: 20,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Context menu ─────────────────────────────────────────────────────────────
interface ContextMenuProps {
  msg:               BubbleMessage;
  rect:              DOMRect;
  isMine:            boolean;
  onReaction:        (r: Reaction) => void;
  onReply:           () => void;
  onCopy:            () => void;
  onDeleteForMe:     () => void;
  onDeleteForAll?:   () => void;
  onClose:           () => void;
}

function ContextMenu({
  msg,
  rect,
  isMine,
  onReaction,
  onReply,
  onCopy,
  onDeleteForMe,
  onDeleteForAll,
  onClose,
}: ContextMenuProps) {
  // Position the card above the bubble, clamped to viewport
  const top = Math.max(60, rect.top - 130);

  return (
    <AnimatePresence>
      <motion.div
        key="ctx-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset:    0,
          zIndex:   60,
        }}
        onClick={onClose}
      />

      <motion.div
        key="ctx-card"
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position:        'fixed',
          zIndex:          61,
          top:             top,
          left:            '50%',
          transform:       'translateX(-50%)',
          background:      SURFACE_UP,
          border:          `1px solid ${GREEN_BORDER}`,
          borderRadius:    18,
          boxShadow:       '0 12px 40px rgba(0,0,0,0.6)',
          padding:         12,
          minWidth:        220,
          display:         'flex',
          flexDirection:   'column',
          gap:             4,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Reaction picker */}
        <div style={{ marginBottom: 8 }}>
          <ReactionPicker onPick={(r) => { onReaction(r); onClose(); }} />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 4 }} />

        {/* Reply */}
        <CtxItem label="Reply" onClick={() => { onReply(); onClose(); }} />

        {/* Copy — only for text messages */}
        {msg.message_type === 'text' && (
          <CtxItem label="Copy" onClick={() => { onCopy(); onClose(); }} />
        )}

        {/* Delete for me */}
        <CtxItem
          label="Delete for me"
          danger
          onClick={() => { onDeleteForMe(); onClose(); }}
        />

        {/* Delete for everyone — only mine & within 1h */}
        {onDeleteForAll && (
          <CtxItem
            label="Delete for everyone"
            danger
            onClick={() => { onDeleteForAll(); onClose(); }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function CtxItem({
  label,
  danger,
  onClick,
}: {
  label:   string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width:          '100%',
        padding:        '10px 14px',
        background:     'transparent',
        border:         'none',
        borderRadius:   10,
        cursor:         'pointer',
        textAlign:      'left',
        fontSize:       14,
        fontWeight:     500,
        color:          danger ? '#EF4444' : T1,
        fontFamily:     'inherit',
        transition:     'background 0.12s',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = 'transparent')
      }
    >
      {label}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DMScreen() {
  const { friendId = '' } = useParams<{ friendId: string }>();
  const navigate           = useNavigate();
  const { user }           = useAuth();
  // useFitness available for future workout-share feature
  const _fitness           = useFitness();

  const {
    messages,
    isLoading,
    sendMessage,
    deleteForMe,
    deleteForEveryone,
  } = useDirectMessages(friendId);

  // ── State ──────────────────────────────────────────────────────────────────
  const [text, setText]               = useState('');
  const [replyTo, setReplyTo]         = useState<BubbleMessage | null>(null);
  const [showScrollFab, setScrollFab] = useState(false);
  const [contextMsg, setContextMsg]   = useState<{
    msg:  BubbleMessage;
    rect: DOMRect;
  } | null>(null);
  const [friendProfile, setFriendProfile] = useState<{
    name:           string;
    avatar_url:     string | null;
    last_active_at?: string;
  } | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const listRef   = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isOnline =
    !!friendProfile?.last_active_at &&
    Date.now() - new Date(friendProfile.last_active_at).getTime() < 5 * 60 * 1000;

  // ── Fetch friend profile ───────────────────────────────────────────────────
  useEffect(() => {
    if (!friendId) return;
    supabase
      .from('user_profiles' as never)
      .select('user_id,name,avatar_url,last_active_at')
      .eq('user_id', friendId)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (data) {
          setFriendProfile({
            name:           data.name ?? 'User',
            avatar_url:     data.avatar_url ?? null,
            last_active_at: data.last_active_at,
          });
        }
      });
  }, [friendId]);

  // ── Mark conversation read ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !friendId) return;
    markConversationRead(
      getConversationId(user.id, friendId),
      user.id
    ).catch(() => {/* best effort */});
  }, [user, friendId]);

  // ── Auto-scroll on new messages ────────────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    if (isFirstLoad) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      setIsFirstLoad(false);
      return;
    }
    const el = listRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 150) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // ── Scroll FAB visibility ──────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setScrollFab(el.scrollHeight - el.scrollTop - el.clientHeight > 180);
  }, []);

  // ── Convert hook messages → BubbleMessage ─────────────────────────────────
  const bubbles: BubbleMessage[] = messages.map((m) => ({
    id:           m.id,
    content:      m.content,
    message_type: (m as any).message_type ?? 'text',
    metadata:     (m as any).metadata ?? {},
    created_at:   m.created_at,
    is_read:      m.is_read,
    sender_id:    m.sender_id,
    sender_profile: m.sender_profile
      ? {
          user_id:    m.sender_profile.user_id,
          name:       m.sender_profile.name,
          avatar_url: m.sender_profile.avatar_url,
        }
      : undefined,
    reply_message: m.reply_message ?? null,
  }));

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    const replyId = replyTo?.id;
    setReplyTo(null);
    try {
      await sendMessage(content, replyId);
    } catch {
      // error already handled by hook
    }
  }, [text, replyTo, sendMessage]);

  // ── Workout share placeholder ──────────────────────────────────────────────
  const handleShareWorkout = useCallback(() => {
    // Toast via browser alert-style; swap for sonner/toast if available
    const event = new CustomEvent('dm:toast', {
      detail: { message: 'Workout sharing coming soon' },
    });
    window.dispatchEvent(event);
    // Fallback: console so feature is always visible in dev
    console.info('[DMScreen] Workout sharing coming soon');
  }, []);

  // ── Context menu helpers ───────────────────────────────────────────────────
  const handleLongPress = useCallback(
    (msg: BubbleMessage, rect: DOMRect) => {
      setContextMsg({ msg, rect });
    },
    []
  );

  const closeCtx = useCallback(() => setContextMsg(null), []);

  const ctxCanDeleteForAll =
    contextMsg &&
    contextMsg.msg.sender_id === user?.id &&
    Date.now() - new Date(contextMsg.msg.created_at).getTime() < 3_600_000;

  // ── Friend display name ────────────────────────────────────────────────────
  const friendName = friendProfile?.name ?? 'User';

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight:     '100dvh',
        background:    BG,
        display:       'flex',
        flexDirection: 'column',
        position:      'relative',
        fontFamily:    "'Inter','Manrope',system-ui,sans-serif",
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          position:        'sticky',
          top:             0,
          zIndex:          30,
          background:      'rgba(12,16,21,0.95)',
          backdropFilter:  'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom:    '1px solid rgba(255,255,255,0.06)',
          padding:         '12px 16px',
          paddingTop:      'max(12px, env(safe-area-inset-top))',
          display:         'flex',
          alignItems:      'center',
          gap:             10,
        }}
      >
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          style={{
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            padding:    4,
            display:    'flex',
            alignItems: 'center',
            color:      T2,
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={22} />
        </button>

        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          <Avatar
            src={friendProfile?.avatar_url ?? undefined}
            name={friendName}
            size={36}
          />
        </div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        8,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                fontSize:     16,
                fontWeight:   700,
                color:        T1,
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
              }}
            >
              {friendName}
            </span>

            {/* Streak badge */}
            {friendProfile && (
              <span
                style={{
                  fontSize:        10,
                  fontWeight:      700,
                  textTransform:   'uppercase',
                  letterSpacing:   '0.08em',
                  color:           ACCENT,
                  background:      'rgba(12,255,156,0.10)',
                  border:          `1px solid ${GREEN_BORDER}`,
                  borderRadius:    20,
                  padding:         '3px 8px',
                  flexShrink:      0,
                }}
              >
                🔥 STREAK
              </span>
            )}
          </div>

          {/* Online status */}
          <span
            style={{
              fontSize:      10,
              fontWeight:    600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color:         isOnline ? ACCENT : T3,
            }}
          >
            {isOnline ? 'ONLINE · TRAINING NOW' : 'last seen recently'}
          </span>
        </div>

        {/* More button */}
        <button
          aria-label="More options"
          style={{
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            padding:    6,
            display:    'flex',
            alignItems: 'center',
            color:      T2,
            flexShrink: 0,
          }}
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* ── STATS BAR ──────────────────────────────────────────────────────── */}
      {friendProfile && isOnline && (
        <div
          style={{
            background:  SURFACE,
            padding:     '10px 16px',
            display:     'flex',
            alignItems:  'center',
            gap:         0,
            flexShrink:  0,
          }}
        >
          <StatCell value="120" label="WORKOUTS" />
          <div
            style={{
              width:      1,
              height:     28,
              background: 'rgba(255,255,255,0.08)',
              margin:     '0 16px',
            }}
          />
          <StatCell value="30" label="DAYS STREAK" />
        </div>
      )}

      {/* ── MESSAGE LIST ───────────────────────────────────────────────────── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          flex:          1,
          overflowY:     'auto',
          padding:       '12px 16px',
          paddingBottom: 8,
          minHeight:     0,
        }}
      >
        {/* Empty state */}
        {!isLoading && bubbles.length === 0 && (
          <div
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              padding:        '80px 0',
              gap:            12,
              textAlign:      'center',
            }}
          >
            <Avatar
              src={friendProfile?.avatar_url ?? undefined}
              name={friendName}
              size={72}
            />
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: T1, margin: '0 0 4px' }}>
                {friendName}
              </p>
              <p style={{ fontSize: 13, color: T2, margin: 0 }}>Say hello! 👋</p>
            </div>
          </div>
        )}

        {/* Bubbles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {bubbles.map((msg, i) => {
            const prev     = bubbles[i - 1];
            const next     = bubbles[i + 1];
            const showDate = !prev || !sameDay(prev.created_at, msg.created_at);
            const isMine   = msg.sender_id === user?.id;
            const isFirst  = !prev || !withinGroup(prev, msg);
            const isLast   = !next || !withinGroup(msg, next);

            return (
              <div key={msg.id} style={{ marginTop: isFirst && i > 0 ? 12 : 2 }}>
                {showDate && <DateSeparator label={formatDateLabel(msg.created_at)} />}
                <ChatBubble
                  msg={msg}
                  isMine={isMine}
                  isFirst={isFirst}
                  isLast={isLast}
                  showSenderName={false}
                  onLongPress={handleLongPress}
                  onReplyTo={(m) => setReplyTo(m)}
                />
              </div>
            );
          })}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* ── SCROLL FAB ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScrollFab && (
          <motion.button
            key="scroll-fab"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            aria-label="Scroll to bottom"
            style={{
              position:       'fixed',
              right:          16,
              bottom:         120,
              width:          40,
              height:         40,
              borderRadius:   '50%',
              background:     SURFACE_UP,
              border:         `1px solid ${GREEN_BORDER}`,
              boxShadow:      '0 4px 16px rgba(0,0,0,0.5)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              cursor:         'pointer',
              zIndex:         20,
            }}
          >
            <ChevronDown size={18} color={T2} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── QUICK SHARE BAR ────────────────────────────────────────────────── */}
      <div
        style={{
          padding:     '8px 16px',
          display:     'flex',
          gap:         8,
          flexShrink:  0,
          background:  'transparent',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleShareWorkout}
          style={{
            display:     'flex',
            alignItems:  'center',
            gap:         6,
            padding:     '8px 14px',
            borderRadius: 20,
            background:  SURFACE_UP,
            border:      '1px solid rgba(255,255,255,0.06)',
            cursor:      'pointer',
            outline:     'none',
            fontFamily:  'inherit',
          }}
        >
          <Dumbbell size={14} color={ACCENT} />
          <span
            style={{
              fontSize:      11,
              fontWeight:    600,
              color:         T2,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            SHARE WORKOUT
          </span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleShareWorkout}
          style={{
            display:     'flex',
            alignItems:  'center',
            gap:         6,
            padding:     '8px 14px',
            borderRadius: 20,
            background:  SURFACE_UP,
            border:      '1px solid rgba(255,255,255,0.06)',
            cursor:      'pointer',
            outline:     'none',
            fontFamily:  'inherit',
          }}
        >
          <Flame size={14} color={ACCENT} />
          <span
            style={{
              fontSize:      11,
              fontWeight:    600,
              color:         T2,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            SHARE CALORIES
          </span>
        </motion.button>
      </div>

      {/* ── REPLY BAR ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            key="reply-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <div
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         8,
                padding:     '8px 16px',
                background:  SURFACE,
                borderTop:   '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Accent strip */}
              <div
                style={{
                  width:        3,
                  alignSelf:    'stretch',
                  borderRadius: 2,
                  background:   ACCENT,
                  flexShrink:   0,
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: T3, marginBottom: 2 }}>
                  Replying to{' '}
                  <strong style={{ color: ACCENT }}>
                    {replyTo.sender_id === user?.id
                      ? 'You'
                      : replyTo.sender_profile?.name ?? friendName}
                  </strong>
                </div>
                <div
                  style={{
                    fontSize:     12,
                    color:        T2,
                    overflow:     'hidden',
                    whiteSpace:   'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {replyTo.content}
                </div>
              </div>

              <button
                onClick={() => setReplyTo(null)}
                aria-label="Cancel reply"
                style={{
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  padding:    4,
                  color:      T3,
                  display:    'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CHAT INPUT ─────────────────────────────────────────────────────── */}
      <ChatInput
        value={text}
        onChange={setText}
        onSend={handleSend}
        placeholder="Message…"
      />

      {/* ── CONTEXT MENU ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {contextMsg && (
          <ContextMenu
            key="ctx-menu"
            msg={contextMsg.msg}
            rect={contextMsg.rect}
            isMine={contextMsg.msg.sender_id === user?.id}
            onReaction={(r) => {
              // Reactions persistence is handled inside ChatBubble via onReaction prop;
              // here we just close the menu (bubble already got the event via ReactionPicker).
            }}
            onReply={() => setReplyTo(contextMsg.msg)}
            onCopy={() => {
              navigator.clipboard.writeText(contextMsg.msg.content).catch(() => {});
            }}
            onDeleteForMe={async () => {
              try {
                await deleteForMe(contextMsg.msg.id);
              } catch {/* best-effort */}
            }}
            onDeleteForAll={
              ctxCanDeleteForAll
                ? async () => {
                    try {
                      await deleteForEveryone(contextMsg.msg.id);
                    } catch {/* best-effort */}
                  }
                : undefined
            }
            onClose={closeCtx}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stat cell ────────────────────────────────────────────────────────────────
function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span
        style={{
          fontSize:   13,
          fontWeight: 700,
          color:      T1,
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize:      10,
          fontWeight:    600,
          color:         T3,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
    </div>
  );
}

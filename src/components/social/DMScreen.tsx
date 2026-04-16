// src/components/social/DMScreen.tsx
// FitPulse DM Chat – Kinetic Obsidian design  (real Supabase data)
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Mic, Reply, Copy, Trash2, Trash, X,
  ChevronDown, MoreVertical, Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useAuth } from '@/context/AuthContext';
import { fetchProfilesByIds } from '@/services/socialService';
import Avatar from '@/components/shared/Avatar';
import type { UserProfileSummary } from '@/types/social';
import type { DirectMessage } from '@/services/chatService';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#0E0E13',
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

// ─── Time helpers ─────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function fmtDateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}
function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}
function withinGroup(a: DirectMessage, b: DirectMessage) {
  if (a.sender_id !== b.sender_id) return false;
  return Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < 2 * 60 * 1000;
}

// ─── Floating reaction bar ────────────────────────────────────────────────────
function ReactionBar({
  visible, anchor, onReact, onClose,
}: {
  visible: boolean;
  anchor: { x: number; y: number } | null;
  onReact: (e: string) => void;
  onClose: () => void;
}) {
  if (!visible || !anchor) return null;
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 48 }} onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          zIndex: 49,
          top: Math.max(80, anchor.y - 64),
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 4,
          backgroundColor: 'rgba(53,52,58,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 36,
          padding: '8px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
          border: `1px solid ${C.outline}`,
        }}
      >
        {REACTION_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => { onReact(e); onClose(); }}
            style={{
              background: 'none', border: 'none',
              fontSize: 26, cursor: 'pointer',
              padding: '4px 6px', borderRadius: 8, lineHeight: 1,
            }}
          >
            {e}
          </button>
        ))}
      </div>
    </>
  );
}

// ─── Context menu ─────────────────────────────────────────────────────────────
interface MenuItem { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }

function CtxMenu({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  useEffect(() => {
    const h = () => onClose();
    const t = setTimeout(() => {
      document.addEventListener('mousedown', h);
      document.addEventListener('touchstart', h);
    }, 10);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.14 }}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', zIndex: 50,
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        padding: '4px 0', minWidth: 176,
        background: C.highest,
        border: `1px solid ${C.outline}`,
        bottom: '100%', marginBottom: 8, right: 0,
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', padding: '10px 16px',
            fontSize: 14, fontWeight: 500,
            background: 'none', border: 'none', cursor: 'pointer',
            color: item.danger ? '#EF4444' : C.textPri,
            transition: 'background 0.12s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </motion.div>
  );
}

// ─── Reply preview bar ────────────────────────────────────────────────────────
function ReplyBar({ msg, isMe, onClear }: { msg: DirectMessage; isMe: boolean; onClear: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px',
      background: C.surfaceHi,
      borderTop: `1px solid ${C.outline}`,
    }}>
      <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: C.primary, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.primary, marginBottom: 2 }}>
          {isMe ? 'You' : 'Them'}
        </p>
        <p style={{ fontSize: 13, color: C.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
          {msg.content}
        </p>
      </div>
      <button onClick={onClear} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}>
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
interface BubbleProps {
  msg: DirectMessage;
  isMine: boolean;
  isFirst: boolean;
  isLast: boolean;
  onReply: (m: DirectMessage) => void;
  onDeleteForMe: (id: string) => void;
  onDeleteForEveryone: (id: string) => void;
}

function Bubble({ msg, isMine, isFirst, isLast, onReply, onDeleteForMe, onDeleteForEveryone }: BubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<{ x: number; y: number } | null>(null);
  // TODO(persistence): reactions are ephemeral (local state only).
  // Wire to a backend reactions table (addReaction / removeReaction) so they
  // survive remounts and are visible to the other participant.
  const [reactions, setReactions] = useState<string[]>([]);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDeleted = msg.deleted_for_everyone;
  const ageMs = Date.now() - new Date(msg.created_at).getTime();
  const canDeleteAll = isMine && ageMs < 3_600_000;

  const menuItems: MenuItem[] = [
    { icon: <Reply size={15} />, label: 'Reply', onClick: () => onReply(msg) },
    !isDeleted && { icon: <Copy size={15} />, label: 'Copy', onClick: () => { navigator.clipboard.writeText(msg.content); toast.success('Copied'); } },
    { icon: <Trash2 size={15} />, label: 'Delete for me', onClick: () => onDeleteForMe(msg.id), danger: true },
    canDeleteAll && !isDeleted && { icon: <Trash size={15} />, label: 'Delete for everyone', onClick: () => onDeleteForEveryone(msg.id), danger: true },
  ].filter(Boolean) as MenuItem[];

  // Kinetic Obsidian radius pattern
  const myBR    = `18px ${isFirst ? '18px' : '6px'} ${isLast ? '4px' : '6px'} 18px`;
  const theirBR = `${isFirst ? '18px' : '6px'} 18px 18px ${isLast ? '4px' : '6px'}`;

  const bubbleBg = isDeleted
    ? 'rgba(255,255,255,0.04)'
    : isMine
      ? C.primary
      : C.surface;

  const startLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    holdRef.current = setTimeout(() => {
      setReactionAnchor({ x: rect.left + rect.width / 2, y: rect.top });
    }, 420);
  };
  const cancelLongPress = () => { if (holdRef.current) clearTimeout(holdRef.current); };

  const handleReact = (emoji: string) => {
    setReactions((prev) =>
      prev.includes(emoji) ? prev.filter((e) => e !== emoji) : [...prev, emoji]
    );
  };

  // Deduplicate + count
  const reactionCounts = reactions.reduce<Record<string, number>>((acc, e) => {
    acc[e] = (acc[e] ?? 0) + 1; return acc;
  }, {});

  return (
    <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', position: 'relative' }}>
      {/* Floating reaction bar */}
      <ReactionBar
        visible={!!reactionAnchor}
        anchor={reactionAnchor}
        onReact={handleReact}
        onClose={() => setReactionAnchor(null)}
      />

      <div style={{ position: 'relative', maxWidth: '75%', minWidth: 60 }}>
        {/* Reply preview embedded in bubble */}
        {(msg as any).reply_message && !isDeleted && (
          <div style={{
            marginBottom: 4, padding: '6px 12px',
            borderRadius: 10, fontSize: 12,
            background: isMine ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
            borderLeft: `2px solid ${C.primary}`,
          }}>
            <p style={{ fontWeight: 700, color: C.primary, fontSize: 11, margin: '0 0 2px' }}>
              {(msg as any).reply_message.sender_id === msg.sender_id ? 'You' : 'Them'}
            </p>
            <p style={{ color: C.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(msg as any).reply_message.content}
            </p>
          </div>
        )}

        {/* Bubble */}
        <div
          className="group relative"
          style={{
            padding: '10px 14px',
            borderRadius: isMine ? myBR : theirBR,
            background: bubbleBg,
            boxShadow: isMine
              ? '0 2px 12px rgba(255,107,53,0.28)'
              : '0 2px 8px rgba(0,0,0,0.28)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onMouseMove={cancelLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
        >
          <p style={{
            fontSize: 15, lineHeight: '22px',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
            color: isDeleted
              ? 'rgba(255,255,255,0.25)'
              : isMine
                ? '#FFFFFF'
                : C.textPri,
            fontStyle: isDeleted ? 'italic' : undefined,
          }}>
            {isDeleted ? 'This message was deleted' : msg.content}
          </p>

          {/* Timestamp + read */}
          {isLast && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, marginTop: 4,
              justifyContent: isMine ? 'flex-end' : 'flex-start',
            }}>
              <span style={{ fontSize: 10, color: isMine ? 'rgba(255,255,255,0.55)' : C.textMuted }}>
                {fmtTime(msg.created_at)}
              </span>
              {isMine && !isDeleted && (
                <span style={{ fontSize: 10, fontWeight: 700, color: msg.is_read ? C.primaryDim : 'rgba(255,255,255,0.35)' }}>
                  {msg.is_read ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          )}

          {/* Hover menu trigger */}
          {!isDeleted && (
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                position: 'absolute', top: 4,
                ...(isMine ? { left: -28 } : { right: -28 }),
                background: C.highest,
                border: `1px solid ${C.outline}`,
                borderRadius: '50%', padding: 4, cursor: 'pointer',
              }}
            >
              <MoreVertical size={13} style={{ color: C.textMuted }} />
            </button>
          )}

          <AnimatePresence>
            {menuOpen && <CtxMenu items={menuItems} onClose={() => setMenuOpen(false)} />}
          </AnimatePresence>
        </div>

        {/* Reaction chips */}
        {Object.keys(reactionCounts).length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                style={{
                  padding: '2px 10px', borderRadius: 12,
                  backgroundColor: C.primary,
                  border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, color: '#FFFFFF',
                }}
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main DMScreen ─────────────────────────────────────────────────────────────
export default function DMScreen() {
  const { friendId = '' } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { messages, isLoading, hasMore, error, sendMessage, loadOlder, deleteForMe, deleteForEveryone } =
    useDirectMessages(friendId);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [friendProfile, setFriendProfile] = useState<UserProfileSummary | null>(null);
  const [sending, setSending] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  // TODO(presence): wire to Supabase Realtime Presence so isOnline reflects
  // the friend's actual connection state. Until then, defaults to false.
  const [isOnline] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!friendId) return;
    fetchProfilesByIds([friendId]).then((map) => {
      const p = map.get(friendId);
      if (p) setFriendProfile(p);
    });
  }, [friendId]);

  useLayoutEffect(() => {
    if (messages.length === 0) return;
    if (isFirstLoad) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      setIsFirstLoad(false);
      return;
    }
    const el = listRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (near) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 180);
  }, []);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setText('');
    setSending(true);
    try {
      await sendMessage(content, replyTo?.id);
      setReplyTo(null);
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const friendName = friendProfile?.name ?? 'Chat';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: C.bg, fontFamily: "'Inter','Manrope',sans-serif", color: C.textPri }}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px',
        background: 'rgba(14,14,19,0.88)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.outline}`,
        flexShrink: 0, position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: C.textSec, cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={22} />
        </button>

        {/* Avatar + online dot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar src={friendProfile?.avatar_url} name={friendName} size={40} />
          <div style={{
            position: 'absolute', bottom: 1, right: 1,
            width: 11, height: 11, borderRadius: 6,
            backgroundColor: C.green,
            border: `2px solid ${C.bg}`,
            boxShadow: `0 0 5px 1px ${C.green}88`,
          }} />
        </div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.textPri, margin: 0, lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {friendName}
          </p>
          <p style={{ fontSize: 11, color: isOnline ? C.green : C.textMuted, margin: 0, fontWeight: 500 }}>
            {isOnline ? '● Online' : '○ Offline'}
          </p>
        </div>

        {/* Video call */}
        <button style={{
          width: 36, height: 36, borderRadius: 18,
          background: C.surfaceHi, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.textMuted,
        }}>
          <Video size={18} />
        </button>
      </div>

      {/* ── Message list ─────────────────────────────────────────────────────── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', minHeight: 0 }}
      >
        {/* Load older */}
        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <button
              onClick={loadOlder}
              disabled={isLoading}
              style={{
                fontSize: 12, fontWeight: 600,
                padding: '6px 16px', borderRadius: 20,
                background: `${C.primary}18`, color: C.primary,
                border: 'none', cursor: 'pointer',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              {isLoading ? 'Loading…' : '↑ Load older'}
            </button>
          </div>
        )}

        {error && <p style={{ textAlign: 'center', fontSize: 13, color: '#EF4444', padding: '16px 0' }}>{error}</p>}

        {!isLoading && messages.length === 0 && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12, textAlign: 'center' }}>
            <Avatar src={friendProfile?.avatar_url} name={friendName} size={72} />
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: C.textPri, margin: '0 0 4px' }}>{friendName}</p>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Say hello! 👋</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {messages.map((msg, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const showDate = !prev || !sameDay(prev.created_at, msg.created_at);
            const isMine  = msg.sender_id === user?.id;
            const isFirst = !prev || !withinGroup(prev, msg);
            const isLast  = !next || !withinGroup(msg, next);
            const mt = isFirst && i > 0 ? 12 : 2;

            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 8px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '3px 12px', borderRadius: 20,
                      background: C.surfaceHi, color: C.textMuted,
                    }}>
                      {fmtDateLabel(msg.created_at)}
                    </span>
                  </div>
                )}
                <div style={{ marginTop: mt }}>
                  <Bubble
                    msg={msg}
                    isMine={isMine}
                    isFirst={isFirst}
                    isLast={isLast}
                    onReply={setReplyTo}
                    onDeleteForMe={async (id) => { try { await deleteForMe(id); } catch { toast.error('Failed'); } }}
                    onDeleteForEveryone={async (id) => {
                      try { await deleteForEveryone(id); toast.success('Deleted for everyone'); }
                      catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
                    }}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom FAB */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              position: 'absolute', right: 16, bottom: 90,
              width: 40, height: 40, borderRadius: 20,
              background: C.highest,
              border: `1px solid ${C.outline}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 10,
            }}
          >
            <ChevronDown size={18} style={{ color: C.textMuted }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Reply preview ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden', flexShrink: 0 }}>
            <ReplyBar msg={replyTo} isMe={replyTo.sender_id === user?.id} onClear={() => setReplyTo(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input bar ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 10,
        padding: '10px 14px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        background: 'rgba(14,14,19,0.90)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${C.outline}`,
        flexShrink: 0,
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'flex-end',
          borderRadius: 24, overflow: 'hidden',
          background: '#0A0A0F',
          border: `1px solid ${C.outline}`,
        }}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
            }}
            onKeyDown={handleKey}
            placeholder="Type a message…"
            rows={1}
            style={{
              flex: 1, background: 'transparent',
              padding: '10px 16px',
              fontSize: 15, color: C.textPri,
              outline: 'none', border: 'none', resize: 'none',
              fontFamily: 'inherit', maxHeight: 110, minHeight: 40,
              lineHeight: '22px',
            }}
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={text.trim() ? handleSend : undefined}
          disabled={sending}
          style={{
            width: 44, height: 44, borderRadius: 22, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            background: text.trim() ? C.primary : C.surfaceHi,
            boxShadow: text.trim() ? `0 2px 12px ${C.primary}44` : 'none',
            transition: 'background 0.2s, box-shadow 0.2s',
            opacity: sending ? 0.5 : 1,
          }}
        >
          {text.trim()
            ? <Send size={17} style={{ color: '#FFFFFF' }} />
            : <Mic size={17} style={{ color: C.textMuted }} />
          }
        </motion.button>
      </div>
    </div>
  );
}

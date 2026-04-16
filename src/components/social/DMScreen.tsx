// src/components/social/DMScreen.tsx — WhatsApp-quality DM chat
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Mic, Reply, Copy, Trash2, Trash, X,
  ChevronDown, MoreVertical, Phone, Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useAuth } from '@/context/AuthContext';
import { fetchProfilesByIds } from '@/services/socialService';
import Avatar from '@/components/shared/Avatar';
import type { UserProfileSummary } from '@/types/social';
import type { DirectMessage } from '@/services/chatService';

// ─── Accent ───────────────────────────────────────────────────────────────────
const ACCENT = '#00E676';

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

// ─── Context menu ─────────────────────────────────────────────────────────────
interface MenuItem { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }

function CtxMenu({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  useEffect(() => {
    const h = (e: MouseEvent | TouchEvent) => { e.stopPropagation(); onClose(); };
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
      transition={{ duration: 0.15 }}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-50 rounded-[14px] overflow-hidden shadow-2xl py-1 min-w-[170px]"
      style={{ background: '#1C1C20', border: '1px solid rgba(255,255,255,0.1)', bottom: '100%', marginBottom: 8, right: 0 }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); onClose(); }}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] font-medium transition-colors hover:bg-white/5"
          style={{ color: item.danger ? '#EF4444' : '#FAFAFA' }}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </motion.div>
  );
}

// ─── Reply bar ────────────────────────────────────────────────────────────────
function ReplyBar({ msg, isMe, onClear }: { msg: DirectMessage; isMe: boolean; onClear: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2"
      style={{ background: 'rgba(0,230,118,0.06)', borderTop: '1px solid rgba(0,230,118,0.12)' }}
    >
      <div className="w-0.5 self-stretch rounded-full" style={{ background: ACCENT }} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold" style={{ color: ACCENT }}>{isMe ? 'You' : 'Them'}</p>
        <p className="text-[13px] text-white/50 truncate">{msg.content}</p>
      </div>
      <button onClick={onClear} className="p-1 text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
interface BubbleProps {
  msg: DirectMessage;
  isMine: boolean;
  isFirst: boolean; // first in a consecutive group (show corner radius)
  isLast: boolean;  // last in a consecutive group (show timestamp)
  onReply: (m: DirectMessage) => void;
  onDeleteForMe: (id: string) => void;
  onDeleteForEveryone: (id: string) => void;
}

function Bubble({ msg, isMine, isFirst, isLast, onReply, onDeleteForMe, onDeleteForEveryone }: BubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDeleted = msg.deleted_for_everyone;
  const ageMs = Date.now() - new Date(msg.created_at).getTime();
  const canDeleteAll = isMine && ageMs < 3600000;

  const menuItems: MenuItem[] = [
    { icon: <Reply size={15} />, label: 'Reply', onClick: () => onReply(msg) },
    !isDeleted && { icon: <Copy size={15} />, label: 'Copy', onClick: () => { navigator.clipboard.writeText(msg.content); toast.success('Copied'); } },
    { icon: <Trash2 size={15} />, label: 'Delete for me', onClick: () => onDeleteForMe(msg.id), danger: true },
    canDeleteAll && !isDeleted && { icon: <Trash size={15} />, label: 'Delete for everyone', onClick: () => onDeleteForEveryone(msg.id), danger: true },
  ].filter(Boolean) as MenuItem[];

  // Border radius: WhatsApp style
  const myBR = {
    borderRadius: '18px',
    borderTopLeftRadius: '18px',
    borderTopRightRadius: isFirst ? '18px' : '6px',
    borderBottomRightRadius: isLast ? '4px' : '6px',
    borderBottomLeftRadius: '18px',
  };
  const theirBR = {
    borderRadius: '18px',
    borderTopLeftRadius: isFirst ? '18px' : '6px',
    borderTopRightRadius: '18px',
    borderBottomRightRadius: '18px',
    borderBottomLeftRadius: isLast ? '4px' : '6px',
  };

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group relative`}>
      <div className="relative max-w-[75%]" style={{ minWidth: 60 }}>
        {/* Reply preview in bubble */}
        {msg.reply_message && !isDeleted && (
          <div
            className="mb-1 px-3 py-1.5 rounded-[10px] text-[12px]"
            style={{
              background: isMine ? 'rgba(0,230,118,0.08)' : 'rgba(255,255,255,0.06)',
              borderLeft: `2px solid ${ACCENT}`,
            }}
          >
            <p className="font-bold truncate" style={{ color: ACCENT, fontSize: 11 }}>
              {msg.reply_message.sender_id === msg.sender_id ? 'You' : 'Them'}
            </p>
            <p className="text-white/50 truncate">{msg.reply_message.content}</p>
          </div>
        )}

        {/* Bubble */}
        <div
          className="px-3.5 py-2.5 select-none cursor-pointer relative"
          style={{
            ...(isMine ? myBR : theirBR),
            background: isDeleted
              ? 'rgba(255,255,255,0.05)'
              : isMine
                ? 'rgba(0,230,118,0.15)'
                : '#1C1C22',
          }}
          onMouseDown={() => { holdRef.current = setTimeout(() => setMenuOpen(true), 500); }}
          onMouseUp={() => { if (holdRef.current) clearTimeout(holdRef.current); }}
          onMouseLeave={() => { if (holdRef.current) clearTimeout(holdRef.current); }}
          onTouchStart={() => { holdRef.current = setTimeout(() => setMenuOpen(true), 500); }}
          onTouchEnd={() => { if (holdRef.current) clearTimeout(holdRef.current); }}
        >
          <p
            className="text-[15px] leading-snug whitespace-pre-wrap break-words"
            style={{ color: isDeleted ? 'rgba(255,255,255,0.3)' : '#FAFAFA', fontStyle: isDeleted ? 'italic' : undefined }}
          >
            {isDeleted ? 'This message was deleted' : msg.content}
          </p>

          {/* Timestamp + read receipt */}
          {isLast && (
            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{fmtTime(msg.created_at)}</span>
              {isMine && !isDeleted && (
                <span
                  className="text-[10px] font-bold"
                  style={{ color: msg.is_read ? ACCENT : 'rgba(255,255,255,0.3)' }}
                >
                  {msg.is_read ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hover menu trigger */}
        {!isDeleted && (
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
            className={`absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full ${isMine ? 'left-[-28px]' : 'right-[-28px]'}`}
            style={{ background: '#1C1C22', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <MoreVertical size={13} className="text-white/40" />
          </button>
        )}

        {/* Context menu */}
        <AnimatePresence>
          {menuOpen && (
            <CtxMenu items={menuItems} onClose={() => setMenuOpen(false)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DMScreen() {
  const { friendId = '' } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { messages, isLoading, hasMore, error, sendMessage, loadOlder, deleteForMe, deleteForEveryone } = useDirectMessages(friendId);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [friendProfile, setFriendProfile] = useState<UserProfileSummary | null>(null);
  const [sending, setSending] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="flex flex-col h-screen bg-[#0A0A0D]">
      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-3 py-3 sticky top-0 z-20"
        style={{ background: '#111116', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={22} />
        </button>

        <button className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
          <Avatar src={friendProfile?.avatar_url} name={friendName} size={38} />
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold text-white truncate leading-tight">{friendName}</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {friendProfile?.username ? `@${friendProfile.username}` : 'tap for info'}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button className="p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
            <Video size={20} />
          </button>
          <button className="p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
            <Phone size={20} />
          </button>
        </div>
      </div>

      {/* ── Message list ── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ background: '#0A0A0D' }}
      >
        {/* Load older */}
        {hasMore && (
          <div className="flex justify-center mb-4">
            <button
              onClick={loadOlder}
              disabled={isLoading}
              className="text-[12px] font-semibold px-4 py-1.5 rounded-full transition-colors disabled:opacity-50"
              style={{ background: 'rgba(0,230,118,0.1)', color: ACCENT }}
            >
              {isLoading ? 'Loading…' : '↑ Load older'}
            </button>
          </div>
        )}

        {error && <p className="text-center text-[13px] text-red-400 py-4">{error}</p>}

        {!isLoading && messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Avatar src={friendProfile?.avatar_url} name={friendName} size={72} />
            <div>
              <p className="text-[16px] font-semibold text-white">{friendName}</p>
              <p className="text-[13px] text-white/35 mt-1">Say hello! 👋</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-[2px]">
          {messages.map((msg, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const showDate = !prev || !sameDay(prev.created_at, msg.created_at);
            const isMine = msg.sender_id === user?.id;
            const isFirst = !prev || !withinGroup(prev, msg);
            const isLast = !next || !withinGroup(msg, next);
            const gap = isFirst && i > 0 ? 'mt-3' : 'mt-0.5';

            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span
                      className="text-[11px] font-semibold px-3 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}
                    >
                      {fmtDateLabel(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={gap}>
                  <Bubble
                    msg={msg}
                    isMine={isMine}
                    isFirst={isFirst}
                    isLast={isLast}
                    onReply={setReplyTo}
                    onDeleteForMe={async (id) => { try { await deleteForMe(id); } catch { toast.error('Failed'); } }}
                    onDeleteForEveryone={async (id) => { try { await deleteForEveryone(id); toast.success('Deleted for everyone'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } }}
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
            className="absolute right-4 bottom-[80px] w-10 h-10 rounded-full shadow-xl flex items-center justify-center z-10"
            style={{ background: '#1C1C22', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <ChevronDown size={18} className="text-white/50" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
            <ReplyBar msg={replyTo} isMe={replyTo.sender_id === user?.id} onClear={() => setReplyTo(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input bar ── */}
      <div
        className="flex items-end gap-2 px-3 py-2.5 safe-bottom"
        style={{ background: '#111116', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
      >
        <div
          className="flex-1 flex items-end rounded-3xl overflow-hidden"
          style={{ background: '#1C1C22', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px'; }}
            onKeyDown={handleKey}
            placeholder="Message..."
            rows={1}
            className="flex-1 bg-transparent px-4 py-2.5 text-[15px] text-white placeholder:text-white/25 outline-none leading-snug resize-none"
            style={{ maxHeight: 110, minHeight: 40 }}
          />
        </div>

        {/* Send / Mic */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={text.trim() ? handleSend : undefined}
          disabled={sending}
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50"
          style={{ background: text.trim() ? ACCENT : 'rgba(255,255,255,0.07)' }}
        >
          {text.trim()
            ? <Send size={17} style={{ color: '#06090D' }} />
            : <Mic size={17} className="text-white/40" />
          }
        </motion.button>
      </div>
    </div>
  );
}

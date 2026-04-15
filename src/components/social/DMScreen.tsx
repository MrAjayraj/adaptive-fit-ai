// src/components/social/DMScreen.tsx
// Full-screen DM chat between two users.

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Reply,
  Copy,
  Trash2,
  Trash,
  X,
  ChevronDown,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useAuth } from '@/context/AuthContext';
import { fetchProfilesByIds } from '@/services/socialService';
import type { UserProfileSummary } from '@/types/social';
import type { DirectMessage } from '@/services/chatService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 36 }: { src: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center flex-shrink-0"
    >
      {initials}
    </div>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface CtxMenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function ContextMenu({
  items,
  onClose,
  anchorRef,
}: {
  items: CtxMenuItem[];
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement>;
}) {
  useEffect(() => {
    const handle = (e: MouseEvent | TouchEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('touchstart', handle);
    };
  }, [onClose, anchorRef]);

  return (
    <div
      ref={anchorRef}
      className="absolute z-50 bg-surface-2 border border-border rounded-[14px] shadow-xl py-1 min-w-[160px] overflow-hidden"
      style={{ bottom: '100%', marginBottom: 8 }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); onClose(); }}
          className={`flex items-center gap-3 w-full px-4 py-2.5 text-[14px] font-medium transition-colors hover:bg-white/5 ${
            item.danger ? 'text-red-400' : 'text-text-1'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface BubbleProps {
  msg: DirectMessage;
  isMine: boolean;
  onReply: (msg: DirectMessage) => void;
  onDeleteForMe: (id: string) => void;
  onDeleteForEveryone: (id: string) => void;
}

function MessageBubble({ msg, isMine, onReply, onDeleteForMe, onDeleteForEveryone }: BubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null!);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDeleted = msg.deleted_for_everyone;
  const ageMs = Date.now() - new Date(msg.created_at).getTime();
  const canDeleteForAll = isMine && ageMs < 60 * 60 * 1000;

  const menuItems: CtxMenuItem[] = [
    {
      icon: <Reply size={15} />,
      label: 'Reply',
      onClick: () => onReply(msg),
    },
    {
      icon: <Copy size={15} />,
      label: 'Copy',
      onClick: () => { navigator.clipboard.writeText(msg.content); toast.success('Copied'); },
    },
    {
      icon: <Trash2 size={15} />,
      label: 'Delete for me',
      onClick: () => onDeleteForMe(msg.id),
      danger: true,
    },
    ...(canDeleteForAll ? [{
      icon: <Trash size={15} />,
      label: 'Delete for everyone',
      onClick: () => onDeleteForEveryone(msg.id),
      danger: true,
    }] : []),
  ];

  const handleHoldStart = () => {
    holdTimer.current = setTimeout(() => setShowMenu(true), 450);
  };
  const handleHoldEnd = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
      <div className="relative max-w-[78%]">
        {/* Reply preview */}
        {msg.reply_message && (
          <div
            className={`mb-1 px-3 py-1.5 rounded-[10px] border-l-2 border-primary bg-primary/5 text-[12px] text-text-2 truncate ${
              isMine ? 'ml-auto' : ''
            }`}
            style={{ maxWidth: '100%' }}
          >
            <span className="text-primary font-semibold text-[11px]">
              {msg.reply_message.sender_id === msg.sender_id ? 'You' : ''}
            </span>
            <p className="truncate">{msg.reply_message.content}</p>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`relative px-3.5 py-2 rounded-[18px] select-none cursor-pointer ${
            isMine
              ? 'bg-primary text-[#06090D] rounded-br-[6px]'
              : 'bg-surface-2 text-text-1 rounded-bl-[6px]'
          } ${isDeleted ? 'opacity-50 italic' : ''}`}
          onMouseDown={isDeleted ? undefined : handleHoldStart}
          onMouseUp={isDeleted ? undefined : handleHoldEnd}
          onMouseLeave={isDeleted ? undefined : handleHoldEnd}
          onTouchStart={isDeleted ? undefined : handleHoldStart}
          onTouchEnd={isDeleted ? undefined : handleHoldEnd}
        >
          <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">
            {isDeleted ? 'Message deleted' : msg.content}
          </p>
          <div className={`flex items-center gap-1 mt-0.5 justify-end ${isMine ? 'opacity-70' : 'opacity-50'}`}>
            <span className="text-[10px]">{formatTime(msg.created_at)}</span>
            {isMine && !isDeleted && (
              <span className="text-[10px]">{msg.is_read ? '✓✓' : '✓'}</span>
            )}
          </div>

          {/* Inline menu trigger (visible on hover on desktop) */}
          {!isDeleted && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
              className={`absolute top-1 ${isMine ? 'left-[-28px]' : 'right-[-28px]'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-surface-2 border border-border text-text-2`}
            >
              <MoreVertical size={13} />
            </button>
          )}
        </div>

        {/* Context menu */}
        {showMenu && (
          <ContextMenu
            items={menuItems}
            onClose={() => setShowMenu(false)}
            anchorRef={anchorRef}
          />
        )}
      </div>
    </div>
  );
}

// ─── Reply Preview Bar ────────────────────────────────────────────────────────

function ReplyBar({
  msg,
  onClear,
}: {
  msg: DirectMessage;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-surface-2 border-t border-border-subtle">
      <div className="flex-1 border-l-2 border-primary pl-2">
        <p className="text-[11px] text-primary font-semibold">Replying</p>
        <p className="text-[13px] text-text-2 truncate">{msg.content}</p>
      </div>
      <button onClick={onClear} className="p-1.5 text-text-3 hover:text-text-1">
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DMScreen() {
  const { friendId = '' } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    messages,
    isLoading,
    hasMore,
    error,
    sendMessage,
    loadOlder,
    deleteForMe,
    deleteForEveryone,
  } = useDirectMessages(friendId);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [friendProfile, setFriendProfile] = useState<UserProfileSummary | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isFirstLoad = useRef(true);

  // Fetch friend profile
  useEffect(() => {
    if (!friendId) return;
    fetchProfilesByIds([friendId]).then((map) => {
      const p = map.get(friendId);
      if (p) setFriendProfile(p);
    });
  }, [friendId]);

  // Auto-scroll to bottom on first load and new messages
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    if (isFirstLoad.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      isFirstLoad.current = false;
    } else {
      // Only scroll if already near bottom
      const el = listRef.current;
      if (!el) return;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (nearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollBtn(!nearBottom);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      await sendMessage(content, replyTo?.id);
      setReplyTo(null);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteForMe = async (id: string) => {
    try { await deleteForMe(id); }
    catch { toast.error('Failed to delete message'); }
  };

  const handleDeleteForEveryone = async (id: string) => {
    try { await deleteForEveryone(id); toast.success('Deleted for everyone'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  };

  const friendName = friendProfile?.name ?? 'Chat';

  return (
    <div className="flex flex-col h-screen bg-[#06090D]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#06090D]/95 backdrop-blur border-b border-[#1E2330] sticky top-0 z-20">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full text-text-2 hover:text-text-1 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        {friendProfile && (
          <Avatar src={friendProfile.avatar_url} name={friendProfile.name} size={38} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-text-1 truncate">{friendName}</p>
          {friendProfile?.username && (
            <p className="text-[12px] text-text-3">@{friendProfile.username}</p>
          )}
        </div>
      </div>

      {/* ── Message List ───────────────────────────────────────────────────── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {/* Load older */}
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadOlder}
              disabled={isLoading}
              className="text-[12px] text-primary font-semibold px-4 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading…' : 'Load older messages'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-4">
            <p className="text-[13px] text-red-400">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
              {friendProfile && (
                <Avatar src={friendProfile.avatar_url} name={friendProfile.name} size={56} />
              )}
            </div>
            <p className="text-[15px] font-semibold text-text-1">{friendName}</p>
            <p className="text-[13px] text-text-3 mt-1">
              Say hi — this is the start of your conversation!
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showDate = !prev || !isSameDay(prev.created_at, msg.created_at);
          const isMine = msg.sender_id === user?.id;

          return (
            <React.Fragment key={msg.id}>
              {/* Date separator */}
              {showDate && (
                <div className="flex items-center justify-center py-3">
                  <span className="text-[11px] font-medium text-text-3 bg-surface-2 px-3 py-1 rounded-full">
                    {formatDateLabel(msg.created_at)}
                  </span>
                </div>
              )}
              <MessageBubble
                msg={msg}
                isMine={isMine}
                onReply={setReplyTo}
                onDeleteForMe={handleDeleteForMe}
                onDeleteForEveryone={handleDeleteForEveryone}
              />
            </React.Fragment>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── Scroll-to-bottom button ─────────────────────────────────────────── */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute right-4 bottom-[80px] w-9 h-9 rounded-full bg-surface-2 border border-border shadow-lg flex items-center justify-center text-text-2 hover:text-text-1 z-10"
        >
          <ChevronDown size={18} />
        </button>
      )}

      {/* ── Reply bar ──────────────────────────────────────────────────────── */}
      {replyTo && (
        <ReplyBar msg={replyTo} onClear={() => setReplyTo(null)} />
      )}

      {/* ── Input bar ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-[#06090D] border-t border-[#1E2330] flex items-end gap-2 pb-safe">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={1}
          style={{ resize: 'none', maxHeight: 120, overflowY: 'auto' }}
          className="flex-1 bg-surface-2 border border-border rounded-[20px] px-4 py-2.5 text-[15px] text-text-1 placeholder:text-text-3 outline-none focus:border-primary/40 transition-colors leading-snug"
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-[#06090D] transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}

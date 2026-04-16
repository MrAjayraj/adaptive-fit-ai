/**
 * ChatList.tsx
 * FitPulse – Social Chat List  (Web React, no react-native)
 *
 * Design System: Kinetic Obsidian (Stitch-generated)
 *   Primary   #FF6B35  brand orange
 *   Gold      #FFE16D  pin icon
 *   Green     #4AE176  online dot (LED glow)
 *   Surface   #131318 → #1F1F24 → #2A292F → #35343A
 */

import React, { CSSProperties, useRef, useState } from 'react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#131318',
  surface:   '#1F1F24',
  surfaceHi: '#2A292F',
  highest:   '#35343A',
  primary:   '#FF6B35',
  gold:      '#FFE16D',
  green:     '#4AE176',
  textPri:   '#E4E1E9',
  textSec:   '#E1BFB5',
  textMuted: '#A98A80',
  error:     '#EF4444',
  archive:   '#2A292F',
} as const;

const SWIPE_OPEN_PX = -160; // px
const SWIPE_THRESHOLD = -70;

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterTab = 'All' | 'Groups' | 'Unread';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread?: number;
  isOnline?: boolean;
  isPinned?: boolean;
  isGroup?: boolean;
  isVerified?: boolean;
  avatarColor: string;
  avatarLabel: string;
}

// ─── Placeholder data ─────────────────────────────────────────────────────────
const INITIAL_CHATS: Chat[] = [
  {
    id: '1',
    name: 'Alex Rivera',
    lastMessage: '🔥 Just crushed leg day! PR on squat!',
    timestamp: '2m',
    unread: 3,
    isOnline: true,
    isPinned: true,
    avatarColor: '#FF6B35',
    avatarLabel: 'AR',
  },
  {
    id: '2',
    name: 'Iron Squad 💪',
    lastMessage: "Maya: Don't forget tomorrow's challenge",
    timestamp: '15m',
    isPinned: true,
    isGroup: true,
    avatarColor: '#2A292F',
    avatarLabel: '👥',
  },
  {
    id: '3',
    name: 'Maya Chen',
    lastMessage: 'See you at the gym at 6?',
    timestamp: '1h',
    unread: 1,
    isOnline: true,
    avatarColor: '#7C3AED',
    avatarLabel: 'MC',
  },
  {
    id: '4',
    name: 'FitPulse Official',
    lastMessage: 'Your weekly summary is ready 📊',
    timestamp: '3h',
    isVerified: true,
    avatarColor: '#FF6B35',
    avatarLabel: 'FP',
  },
  {
    id: '5',
    name: 'Jordan Kim',
    lastMessage: 'Those macros look perfect 👌',
    timestamp: 'Yesterday',
    isOnline: false,
    avatarColor: '#0EA5E9',
    avatarLabel: 'JK',
  },
  {
    id: '6',
    name: 'Morning Crew 🌅',
    lastMessage: "Let's go! 5am tomorrow!",
    timestamp: '2d',
    isGroup: true,
    avatarColor: '#F59E0B',
    avatarLabel: '🌅',
  },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar: React.FC<{ chat: Chat }> = ({ chat }) => (
  <div style={s.avatarWrapper}>
    <div style={{ ...s.avatar, backgroundColor: chat.avatarColor }}>
      <span style={chat.isGroup ? s.avatarEmoji : s.avatarText}>
        {chat.avatarLabel}
      </span>
      {chat.isGroup && (
        <>
          <div style={s.groupRing1} />
          <div style={s.groupRing2} />
        </>
      )}
    </div>
    {chat.isOnline && (
      <div style={s.onlineDot}>
        <div style={s.onlineDotInner} />
      </div>
    )}
  </div>
);

// ─── ChatRow with pointer-based swipe ─────────────────────────────────────────
interface ChatRowProps {
  chat: Chat;
  onPress: (chat: Chat) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

const ChatRow: React.FC<ChatRowProps> = ({ chat, onPress, onArchive, onDelete }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hovered, setHovered] = useState(false);
  const startX = useRef(0);
  const dragging = useRef(false);

  const snapTo = (target: number) => {
    setIsAnimating(true);
    setOffsetX(target);
    setIsOpen(target !== 0);
    setTimeout(() => setIsAnimating(false), 280);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const base = isOpen ? SWIPE_OPEN_PX : 0;
    const clamped = Math.max(SWIPE_OPEN_PX, Math.min(0, base + dx));
    setOffsetX(clamped);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = e.clientX - startX.current;
    if (!isOpen && dx < SWIPE_THRESHOLD)  { snapTo(SWIPE_OPEN_PX); return; }
    if (isOpen  && dx > -SWIPE_THRESHOLD) { snapTo(0); return; }
    snapTo(isOpen ? SWIPE_OPEN_PX : 0);
  };

  // action reveal progress 0→1
  const progress = Math.abs(offsetX) / Math.abs(SWIPE_OPEN_PX);

  return (
    <div style={s.rowWrapper}>
      {/* ── Hidden action strip ─────────────────────────────────────────── */}
      <div
        style={{
          ...s.swipeActionsContainer,
          opacity: progress,
          transform: `translateX(${(1 - progress) * 80}px)`,
        }}
      >
        <button
          style={{ ...s.swipeAction, backgroundColor: C.archive }}
          onClick={() => { snapTo(0); onArchive(chat.id); }}
        >
          <span style={s.swipeIcon}>📁</span>
          <span style={s.swipeLabel}>Archive</span>
        </button>
        <button
          style={{ ...s.swipeAction, backgroundColor: C.error }}
          onClick={() => { snapTo(0); onDelete(chat.id); }}
        >
          <span style={s.swipeIcon}>🗑</span>
          <span style={s.swipeLabel}>Delete</span>
        </button>
      </div>

      {/* ── Sliding row ────────────────────────────────────────────────── */}
      <div
        style={{
          ...s.rowSlide,
          transform: `translateX(${offsetX}px)`,
          transition: isAnimating ? 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          role="button"
          tabIndex={0}
          style={{
            ...s.chatRow,
            backgroundColor: hovered ? C.surfaceHi : C.surface,
            cursor: 'pointer',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => { if (isOpen) { snapTo(0); } else { onPress(chat); } }}
          onKeyDown={(e) => { if (e.key === 'Enter') onPress(chat); }}
        >
          <Avatar chat={chat} />

          {/* Middle: name + preview */}
          <div style={s.chatMeta}>
            <div style={s.chatNameRow}>
              {chat.isPinned && <span style={s.pinIcon}>📌</span>}
              <span style={s.chatName}>{chat.name}</span>
              {chat.isVerified && (
                <span style={s.verifiedBadge}>✓</span>
              )}
            </div>
            <p style={s.chatPreview}>{chat.lastMessage}</p>
          </div>

          {/* Right: timestamp + badge */}
          <div style={s.chatRight}>
            <span style={s.timestamp}>{chat.timestamp}</span>
            {!!chat.unread && (
              <span style={s.unreadBadge}>{chat.unread}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main ChatList ─────────────────────────────────────────────────────────────
const ChatList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);

  const TABS: FilterTab[] = ['All', 'Groups', 'Unread'];

  const filtered = chats.filter((c) => {
    if (activeTab === 'Groups') return !!c.isGroup;
    if (activeTab === 'Unread') return !!c.unread;
    return true;
  });

  const pinned  = filtered.filter((c) => c.isPinned);
  const regular = filtered.filter((c) => !c.isPinned);

  const removeChat = (id: string) =>
    setChats((prev) => prev.filter((c) => c.id !== id));

  const renderSection = (label: string, data: Chat[]) => {
    if (!data.length) return null;
    return (
      <div key={label}>
        <div style={s.sectionHeader}>
          <span style={s.sectionIcon}>{label === 'Pinned' ? '📌' : '💬'}</span>
          <span style={s.sectionLabel}>{label}</span>
        </div>
        {data.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            onPress={(c) => console.log('Open chat:', c.name)}
            onArchive={removeChat}
            onDelete={removeChat}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={s.safe}>
      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <div style={s.nav}>
        <span style={s.navTitle}>Messages</span>
        <button style={s.composeBtn} aria-label="New message">
          <span style={{ fontSize: 18 }}>✏️</span>
        </button>
      </div>

      {/* ── Filter Tabs ──────────────────────────────────────────────────── */}
      <div style={s.tabRow}>
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              style={active ? { ...s.tab, ...s.tabActive } : s.tab}
              onClick={() => setActiveTab(tab)}
            >
              <span style={active ? { ...s.tabText, ...s.tabTextActive } : s.tabText}>
                {tab}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Scrollable list ──────────────────────────────────────────────── */}
      <div style={s.list}>
        {renderSection('Pinned', pinned)}
        {renderSection('Recent', regular)}
        {filtered.length === 0 && (
          <div style={s.emptyState}>
            <span style={{ fontSize: 48 }}>💬</span>
            <span style={s.emptyText}>No conversations yet</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;

// ─── Styles (CSS-in-JS, mirrors RN StyleSheet) ────────────────────────────────
const s: Record<string, CSSProperties> = {
  safe: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    backgroundColor: C.bg,
    fontFamily: "'Inter', 'Manrope', sans-serif",
    color: C.textPri,
    userSelect: 'none',
  },

  // ── Nav
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    backgroundColor: 'rgba(19,19,24,0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    flexShrink: 0,
  },
  navTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: C.textPri,
    letterSpacing: 0.3,
  },
  composeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceHi,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Filter tabs
  tabRow: {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    flexShrink: 0,
  },
  tab: {
    padding: '8px 18px',
    borderRadius: 24,
    backgroundColor: 'transparent',
    border: '1px solid rgba(169,138,128,0.18)',
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: 500,
    color: C.textMuted,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: 700,
  },

  // ── Scrollable list
  list: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: 32,
  },

  // ── Section header
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '16px 20px 6px',
  },
  sectionIcon: { fontSize: 13 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Row wrapper (clip for swipe overflow)
  rowWrapper: {
    position: 'relative',
    overflow: 'hidden',
    margin: '3px 12px',
    borderRadius: 16,
  },

  // ── Action strip (hidden behind row)
  swipeActionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 160,
    display: 'flex',
    borderRadius: 16,
    overflow: 'hidden',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
  },
  swipeAction: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    border: 'none',
    cursor: 'pointer',
  },
  swipeIcon: { fontSize: 20 },
  swipeLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#FFFFFF',
  },

  // ── Sliding row
  rowSlide: {
    backgroundColor: C.surface,
    borderRadius: 16,
    willChange: 'transform',
  },

  // ── Chat row
  chatRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 16,
    transition: 'background-color 0.15s ease',
    outline: 'none',
  },

  // ── Avatar
  avatarWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    flexShrink: 0,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 700,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  avatarEmoji: { fontSize: 28 },
  groupRing1: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.surfaceHi,
    border: `2px solid ${C.surface}`,
  },
  groupRing2: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.highest,
    border: `2px solid ${C.surface}`,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.surface,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.green,
    boxShadow: `0 0 6px 2px ${C.green}99`,  // LED glow
  },

  // ── Chat meta
  chatMeta: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  chatNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  pinIcon: {
    fontSize: 12,
    color: C.gold,
    flexShrink: 0,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 600,
    color: C.textPri,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.primary,
    fontSize: 10,
    fontWeight: 800,
    color: '#FFFFFF',
    flexShrink: 0,
  },
  chatPreview: {
    margin: 0,
    fontSize: 14,
    color: C.textSec,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  // ── Right side
  chatRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
    minWidth: 50,
  },
  timestamp: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: 400,
    whiteSpace: 'nowrap',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.primary,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
    fontSize: 11,
    fontWeight: 700,
    color: '#FFFFFF',
  },

  // ── Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: C.textMuted,
  },
};

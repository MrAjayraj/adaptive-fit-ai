// src/pages/ChatsScreen.tsx — Unified DMs + Groups inbox
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PenSquare, Search, MessageCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversations } from '@/hooks/useConversations';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/context/AuthContext';
import { useFitness } from '@/context/FitnessContext';
import BottomNav from '@/components/layout/BottomNav';

// ─── Avatar colour palette (consistent per-name) ──────────────────────────────
const AVATAR_GRADIENTS = [
  ['#FF6B6B','#FF8E53'],
  ['#4ECDC4','#45B7D1'],
  ['#A78BFA','#7C3AED'],
  ['#F97316','#EF4444'],
  ['#10B981','#059669'],
  ['#3B82F6','#2563EB'],
  ['#EC4899','#DB2777'],
  ['#F59E0B','#D97706'],
  ['#06B6D4','#0284C7'],
  ['#8B5CF6','#6D28D9'],
];

function nameToGradient(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + (hash << 5) - hash;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

// ─── Gradient avatar ──────────────────────────────────────────────────────────
function GradAvatar({ name, src, size = 48, isGroup = false }: {
  name: string; src?: string | null; size?: number; isGroup?: boolean;
}) {
  const [from, to] = nameToGradient(name);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, position: 'relative' }}>
      {src ? (
        <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
      ) : isGroup ? (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'rgba(0,230,118,0.12)',
          border: '1px solid rgba(0,230,118,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={size * 0.42} color="#00E676" />
        </div>
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: `linear-gradient(135deg, ${from}, ${to})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: size * 0.35, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {initials(name)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Time format ──────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)   return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Chat item type ───────────────────────────────────────────────────────────
interface ChatItem {
  id:               string;
  kind:             'dm' | 'group';
  name:             string;
  avatarUrl:        string | null;
  lastMessage:      string;
  lastMessageAt:    string;
  unreadCount:      number;
  isLastMessageMine: boolean;
  friendId?:        string;
  groupObj?:        import('@/types/social').Group;
}

// ─── Chat row ─────────────────────────────────────────────────────────────────
function ChatRow({ item, onClick }: { item: ChatItem; onClick: () => void }) {
  const hasUnread = item.unreadCount > 0;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
      style={{
        width: '100%', display: 'flex', alignItems: 'center',
        gap: 0, textAlign: 'left', height: 76,
        background: 'transparent', border: 'none', cursor: 'pointer',
        transition: 'background 0.12s',
      }}
    >
      {/* Avatar */}
      <div style={{ flexShrink: 0, padding: '0 12px 0 16px', position: 'relative' }}>
        <GradAvatar name={item.name} src={item.avatarUrl} size={50} isGroup={item.kind === 'group'} />
        {hasUnread && (
          <span style={{
            position: 'absolute', bottom: 2, right: 10,
            minWidth: 18, height: 18, padding: '0 4px',
            background: '#00E676', color: '#06090D',
            fontSize: 10, fontWeight: 800, borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #06090D',
          }}>
            {item.unreadCount > 99 ? '99+' : item.unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 16px 0 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        height: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
          <span style={{
            fontSize: 15, fontWeight: hasUnread ? 700 : 600,
            color: hasUnread ? '#FAFAFA' : '#C7C7CC',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {item.name}
          </span>
          <span style={{
            fontSize: 12, flexShrink: 0,
            color: hasUnread ? '#00E676' : 'rgba(255,255,255,0.28)',
            fontWeight: hasUnread ? 600 : 400,
          }}>
            {formatTime(item.lastMessageAt)}
          </span>
        </div>
        <span style={{
          fontSize: 13,
          color: hasUnread ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.32)',
          fontWeight: hasUnread ? 500 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'block',
        }}>
          {item.isLastMessageMine
            ? <span style={{ color: 'rgba(255,255,255,0.4)' }}>You: </span>
            : null}
          {item.lastMessage}
        </span>
      </div>
    </motion.button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ChatsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations } = useConversations();
  const { myGroups } = useGroups();
  const [query, setQuery] = useState('');

  const items = useMemo<ChatItem[]>(() => {
    const dmItems: ChatItem[] = conversations.map(conv => ({
      id:                `dm-${conv.conversation_id}`,
      kind:              'dm' as const,
      name:              conv.friend_profile?.name ?? 'Unknown',
      avatarUrl:         conv.friend_profile?.avatar_url ?? null,
      lastMessage:       conv.last_message,
      lastMessageAt:     conv.last_message_at,
      unreadCount:       conv.unread_count,
      isLastMessageMine: false,
      friendId:          conv.friend_id,
    }));

    const groupItems: ChatItem[] = myGroups.map(g => ({
      id:                `grp-${g.id}`,
      kind:              'group' as const,
      name:              g.name,
      avatarUrl:         g.avatar_url ?? null,
      lastMessage:       g.description ?? 'No messages yet',
      lastMessageAt:     g.created_at,
      unreadCount:       0,
      isLastMessageMine: false,
      groupObj:          g,
    }));

    const all = [...dmItems, ...groupItems].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(item => item.name.toLowerCase().includes(q));
  }, [conversations, myGroups, query]);

  const totalUnread = items.reduce((sum, i) => sum + i.unreadCount, 0);

  function handleItemClick(item: ChatItem) {
    if (item.kind === 'dm' && item.friendId) {
      // Pass friendName so DMScreen can show the correct name immediately,
      // before the async profile fetch completes (prevents "User" flash)
      navigate(`/chat/${item.friendId}`, { state: { friendName: item.name } });
    } else {
      navigate('/social', { state: { openGroup: item.groupObj } });
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#06090D', display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Manrope',system-ui,sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(6,9,13,0.97)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: 'max(16px,env(safe-area-inset-top)) 16px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/social')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px 6px 0', display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.45)' }}
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Chats
              </h1>
              {totalUnread > 0 && (
                <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: '#00E676' }}>
                  {totalUnread} unread
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/social')}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}
          >
            <PenSquare size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search chats..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '10px 14px 10px 38px',
              fontSize: 14, color: '#fff', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 110 }}>
        <AnimatePresence>
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 24px', textAlign: 'center', gap: 16 }}
            >
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={30} color="#00E676" />
              </div>
              <div>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>No chats yet</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6, maxWidth: 220 }}>
                  Add friends and say hi, or join a group to get started.
                </p>
              </div>
              <button
                onClick={() => navigate('/social')}
                style={{ background: '#00E676', color: '#06090D', border: 'none', borderRadius: 20, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Find Friends
              </button>
            </motion.div>
          ) : (
            <div>
              {items.map(item => (
                <ChatRow key={item.id} item={item} onClick={() => handleItemClick(item)} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}

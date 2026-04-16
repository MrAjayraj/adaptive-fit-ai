// src/pages/ChatsScreen.tsx — Combined DMs + Groups inbox (WhatsApp-style)
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PenSquare, Search, MessageCircle, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useConversations } from '@/hooks/useConversations';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/context/AuthContext';
import { useFitness } from '@/context/FitnessContext';
import Avatar from '@/components/shared/Avatar';
import BottomNav from '@/components/layout/BottomNav';

// ─── Time formatting ──────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Unified chat item ────────────────────────────────────────────────────────
interface ChatItem {
  id: string;
  kind: 'dm' | 'group';
  name: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isLastMessageMine: boolean;
  // DM-specific
  friendId?: string;
  // Group-specific
  groupObj?: import('@/types/social').Group;
}

// ─── Row component ────────────────────────────────────────────────────────────
function ChatRow({ item, onClick }: { item: ChatItem; onClick: () => void }) {
  const hasUnread = item.unreadCount > 0;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
      className="w-full flex items-center gap-0 text-left transition-colors hover:bg-white/[0.025] active:bg-white/[0.04]"
      style={{ height: 72 }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 pl-4 pr-3">
        <div className="relative">
          {item.kind === 'group' ? (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.2)' }}
            >
              {item.avatarUrl
                ? <Avatar src={item.avatarUrl} name={item.name} size={48} />
                : <Users size={20} className="text-[#00E676]" />
              }
            </div>
          ) : (
            <Avatar src={item.avatarUrl} name={item.name} size={48} />
          )}
          {hasUnread && item.unreadCount > 0 && (
            <span
              className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center"
              style={{ background: '#00E676', color: '#06090D', border: '2px solid #06090D' }}
            >
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Middle: name + preview */}
      <div
        className="flex-1 flex flex-col justify-center min-w-0 py-4 pr-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p
            className="text-[15px] truncate"
            style={{
              fontWeight: hasUnread ? 700 : 600,
              color: hasUnread ? '#FAFAFA' : '#D1D1D6',
            }}
          >
            {item.name}
          </p>
          <span className="text-[11px] flex-shrink-0" style={{ color: hasUnread ? '#00E676' : 'rgba(255,255,255,0.3)' }}>
            {formatTime(item.lastMessageAt)}
          </span>
        </div>
        <p
          className="text-[13px] truncate"
          style={{
            color: hasUnread ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
            fontWeight: hasUnread ? 500 : 400,
          }}
        >
          {item.isLastMessageMine ? <span style={{ color: 'rgba(255,255,255,0.45)' }}>You: </span> : null}
          {item.lastMessage}
        </p>
      </div>
    </motion.button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ChatsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useFitness();
  const { conversations } = useConversations();
  const { myGroups } = useGroups();
  const [query, setQuery] = useState('');

  // Build unified sorted list
  const items = useMemo<ChatItem[]>(() => {
    const dmItems: ChatItem[] = conversations.map((conv) => ({
      id: `dm-${conv.conversation_id}`,
      kind: 'dm',
      name: conv.friend_profile?.name ?? 'Unknown',
      avatarUrl: conv.friend_profile?.avatar_url ?? null,
      lastMessage: conv.last_message,
      lastMessageAt: conv.last_message_at,
      unreadCount: conv.unread_count,
      isLastMessageMine: false, // simplified; we'd need sender_id in ConversationPreview
      friendId: conv.friend_id,
    }));

    const groupItems: ChatItem[] = myGroups.map((g) => ({
      id: `grp-${g.id}`,
      kind: 'group',
      name: g.name,
      avatarUrl: g.avatar_url ?? null,
      lastMessage: g.description ?? 'No messages yet',
      lastMessageAt: g.created_at,
      unreadCount: 0,
      isLastMessageMine: false,
      groupObj: g,
    }));

    const all = [...dmItems, ...groupItems].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((item) => item.name.toLowerCase().includes(q));
  }, [conversations, myGroups, query]);

  const totalUnread = items.reduce((sum, i) => sum + i.unreadCount, 0);

  function handleItemClick(item: ChatItem) {
    if (item.kind === 'dm' && item.friendId) {
      navigate(`/chat/${item.friendId}`);
    } else {
      navigate('/social', { state: { openGroup: item.groupObj } });
    }
  }

  return (
    <div className="min-h-screen bg-[#06090D] flex flex-col">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-5 pb-2"
        style={{ background: 'rgba(6,9,13,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/social')}
              className="p-2 -ml-2 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-[22px] font-bold text-white leading-none">Chats</h1>
              {totalUnread > 0 && (
                <p className="text-[12px] font-semibold mt-0.5" style={{ color: '#00E676' }}>
                  {totalUnread} unread
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/social')}
            className="p-2.5 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white/70"
          >
            <PenSquare size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-[14px] text-white placeholder:text-white/25 outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-28">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center gap-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)' }}
            >
              <MessageCircle size={32} className="text-[#00E676]" />
            </div>
            <div>
              <p className="text-[17px] font-bold text-white">No chats yet</p>
              <p className="text-[13px] text-white/40 mt-1.5 max-w-[220px] leading-relaxed">
                Add friends and say hi, or join a group to get started.
              </p>
            </div>
            <button
              onClick={() => navigate('/social')}
              className="px-6 py-2.5 rounded-2xl font-bold text-[14px]"
              style={{ background: '#00E676', color: '#06090D' }}
            >
              Find Friends
            </button>
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <ChatRow key={item.id} item={item} onClick={() => handleItemClick(item)} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

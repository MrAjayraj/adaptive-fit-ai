// src/pages/Social.tsx — Redesigned Social Hub
// Meta-quality design: glassmorphism, pill tabs, animated friend rows, rich cards

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Settings, UserPlus, Trophy, MessageSquare,
  Search, Check, X, Clock, MoreVertical, MessageCircle,
  Shield, Users, ChevronRight, UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriends } from '@/hooks/useFriends';
import { useFitness } from '@/context/FitnessContext';
import { useConversations } from '@/hooks/useConversations';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/context/AuthContext';
import ActivityFeedView from '@/components/social/ActivityFeedView';
import GroupsView from '@/components/social/GroupsView';
import GroupChatView from '@/components/social/GroupChatView';
import BottomNav from '@/components/layout/BottomNav';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Group } from '@/types/social';
import type { Friendship, UserProfileSummary } from '@/types/social';

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG         = '#0C1015';
const SURFACE    = '#141A1F';
const SURFACE_UP = '#1C2429';
const SURFACE_3  = '#222B33';
const ACCENT     = '#0CFF9C';
const GOLD       = '#F5C518';
const T1         = '#EAEEF2';
const T2         = '#8899AA';
const T3         = '#4A5568';
const BORDER     = 'rgba(255,255,255,0.06)';
const G_GLOW     = 'rgba(12,255,156,0.10)';
const G_BORDER   = 'rgba(12,255,156,0.20)';
const RED        = '#FF4B6E';

type Tab = 'FRIENDS' | 'GROUPS' | 'FEED';
const TABS: Tab[] = ['FRIENDS', 'GROUPS', 'FEED'];

// ── Rank colours ──────────────────────────────────────────────────────────────
const RANK_COLOR: Record<string, string> = {
  bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700',
  platinum: '#00BFFF', diamond: '#B9F2FF', master: '#FF6B6B', grandmaster: '#FF3366',
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({
  src, name, size = 44, ring = false, online = false,
}: {
  src: string | null; name: string; size?: number;
  ring?: boolean; online?: boolean;
}) {
  const col = RANK_COLOR.gold; // fallback gradient
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: ring ? `linear-gradient(135deg, ${ACCENT}, #0080FF)` : 'transparent',
        padding: ring ? 2 : 0,
        boxShadow: ring ? `0 0 12px ${G_GLOW}` : 'none',
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          overflow: 'hidden', background: SURFACE_3,
          border: ring ? 'none' : `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {src ? (
            <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: size * 0.36, fontWeight: 800, color: T2 }}>
              {initials(name)}
            </span>
          )}
        </div>
      </div>
      {online && (
        <div style={{
          position: 'absolute', bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28, borderRadius: '50%',
          background: ACCENT, border: `2px solid ${BG}`,
          boxShadow: `0 0 6px ${ACCENT}`,
        }} />
      )}
    </div>
  );
}

// ── Rank badge ────────────────────────────────────────────────────────────────
function RankBadge({ tier, division }: { tier?: string; division?: number }) {
  if (!tier) return null;
  const c = RANK_COLOR[tier.toLowerCase()] ?? T3;
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, color: c,
      background: `${c}18`, border: `1px solid ${c}35`,
      borderRadius: 6, padding: '2px 6px', letterSpacing: '0.03em',
      textTransform: 'uppercase',
    }}>
      {tier}{division != null ? ` D${division}` : ''}
    </span>
  );
}

// ── Active Now bubbles ────────────────────────────────────────────────────────
interface ActiveFriend { user_id: string; name: string; avatar_url: string | null }

function ActiveNow({ friends }: { friends: ActiveFriend[] }) {
  const navigate = useNavigate();
  if (friends.length === 0) return null;
  return (
    <div style={{ padding: '16px 0 4px' }}>
      <div style={{ padding: '0 20px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Active Now · {friends.length}
        </span>
        <span style={{ fontSize: 11, color: ACCENT, fontWeight: 600 }}>●</span>
      </div>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 20px 4px', scrollbarWidth: 'none' }}>
        {friends.map(f => (
          <motion.div
            key={f.user_id}
            whileTap={{ scale: 0.93 }}
            onClick={() => navigate(`/chat/${f.user_id}`, { state: { friendName: f.name } })}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 56 }}
          >
            <div style={{ position: 'relative' }}>
              <Avatar src={f.avatar_url} name={f.name} size={52} ring online />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: T2, textAlign: 'center', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.name.split(' ')[0]}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Quick action cards ────────────────────────────────────────────────────────
function QuickActions({ unread, pendingCount, onGroupsTab }: { unread: number; pendingCount: number; onGroupsTab: () => void }) {
  const navigate = useNavigate();
  const actions = [
    {
      icon: <UserPlus size={20} />, label: 'Add Friend', color: GOLD,
      onClick: () => {}, // handled inline via search
    },
    {
      icon: <MessageSquare size={20} />, label: 'Messages', color: ACCENT, badge: unread || undefined,
      onClick: () => navigate('/chats'),
    },
    {
      icon: <Trophy size={20} />, label: 'Challenge', color: '#A78BFA',
      onClick: () => navigate('/challenges'),
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 20px' }}>
      {actions.map(a => (
        <motion.button
          key={a.label}
          whileTap={{ scale: 0.94 }}
          onClick={a.onClick}
          style={{
            flex: 1, height: 76, background: SURFACE,
            border: `1px solid ${BORDER}`, borderRadius: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 7, cursor: 'pointer', position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle glow bg */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 16,
            background: `radial-gradient(circle at 50% 30%, ${a.color}0D, transparent 70%)`,
          }} />
          <span style={{ color: a.color, position: 'relative' }}>{a.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.06em', position: 'relative' }}>
            {a.label}
          </span>
          {a.badge ? (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: RED, borderRadius: 10,
              minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: '#fff', padding: '0 5px',
            }}>
              {a.badge > 99 ? '99+' : a.badge}
            </div>
          ) : null}
          {a.label === 'Add Friend' && pendingCount > 0 && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: RED, borderRadius: 10,
              minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: '#fff', padding: '0 5px',
            }}>
              {pendingCount}
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}

// ── Friend row ─────────────────────────────────────────────────────────────────
function FriendRow({
  friendship, myId, onMessage, onRemove,
}: {
  friendship: Friendship; myId: string;
  onMessage: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  const p = friendship.friend_profile;
  const [menuOpen, setMenuOpen] = useState(false);
  if (!p) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onMessage(p.user_id, p.name)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 20px', cursor: 'pointer',
        borderBottom: `1px solid ${BORDER}`,
        transition: 'background 0.12s ease',
      }}
    >
      <Avatar src={p.avatar_url} name={p.name} size={48} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.name}
          </span>
          <RankBadge tier={p.rank_tier ?? undefined} division={p.rank_division ?? undefined} />
        </div>
        <span style={{ fontSize: 12, color: T3, marginTop: 2, display: 'block' }}>
          {p.username ? `@${p.username}` : 'Active recently'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={e => { e.stopPropagation(); onMessage(p.user_id, p.name); }}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: G_GLOW, border: `1px solid ${G_BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
          title="Send message"
        >
          <MessageCircle size={16} color={ACCENT} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'transparent', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            position: 'relative',
          }}
        >
          <MoreVertical size={16} color={T3} />
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.13 }}
                style={{
                  position: 'absolute', top: '120%', right: 0, zIndex: 60,
                  background: SURFACE_UP, border: `1px solid ${BORDER}`,
                  borderRadius: 14, overflow: 'hidden', minWidth: 160,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                }}
              >
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); onRemove(friendship.id); }}
                  style={{ width: '100%', padding: '13px 16px', background: 'none', border: 'none',
                    textAlign: 'left', fontSize: 14, fontWeight: 600, color: RED, cursor: 'pointer' }}
                >
                  Remove Friend
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Pending request row ───────────────────────────────────────────────────────
function PendingRow({
  friendship, onAccept, onDecline,
}: {
  friendship: Friendship;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const p = friendship.friend_profile;
  const name = p?.name ?? 'Unknown';
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.93 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 20px', borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <Avatar src={p?.avatar_url ?? null} name={name} size={46} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: T1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <span style={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>Wants to be friends</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onAccept(friendship.id)}
          style={{
            height: 34, padding: '0 14px', borderRadius: 10,
            background: ACCENT, border: 'none', color: '#0C1015',
            fontSize: 13, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Check size={13} strokeWidth={3} /> Accept
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onDecline(friendship.id)}
          style={{
            height: 34, padding: '0 12px', borderRadius: 10,
            background: SURFACE_UP, border: `1px solid ${BORDER}`,
            color: T2, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <X size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Search result row ─────────────────────────────────────────────────────────
function SearchRow({
  profile, isFriend, onAdd,
}: {
  profile: UserProfileSummary; isFriend: boolean;
  onAdd: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: `1px solid ${BORDER}` }}
    >
      <Avatar src={profile.avatar_url} name={profile.name} size={46} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: T1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile.name}
        </span>
        {profile.username && (
          <span style={{ fontSize: 12, color: T3 }}>@{profile.username}</span>
        )}
      </div>
      {isFriend ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: ACCENT, fontSize: 12, fontWeight: 700 }}>
          <UserCheck size={14} /> Friends
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onAdd(profile.user_id)}
          style={{
            height: 34, padding: '0 14px', borderRadius: 10,
            background: G_GLOW, border: `1px solid ${G_BORDER}`,
            color: ACCENT, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <UserPlus size={13} /> Add
        </motion.button>
      )}
    </motion.div>
  );
}

// ── Squad mini card ────────────────────────────────────────────────────────────
function SquadMiniCard({ group, onChat }: { group: Group; onChat: (g: Group) => void }) {
  const memberCount = (group as Group & { member_count?: number }).member_count ?? 0;
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => onChat(group)}
      style={{
        background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18,
        padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14, overflow: 'hidden', position: 'relative',
      }}
    >
      {/* Subtle accent stripe */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(to bottom, ${ACCENT}, #0080FF)`, borderRadius: '18px 0 0 18px' }} />

      {/* Group avatar */}
      <div style={{
        width: 48, height: 48, borderRadius: 14, background: SURFACE_UP,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 800, color: ACCENT, border: `1px solid ${G_BORDER}`,
        flexShrink: 0,
      }}>
        {group.avatar_url ? (
          <img src={group.avatar_url} alt={group.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} />
        ) : (
          group.name.charAt(0).toUpperCase()
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: T1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {group.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 12, color: T3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={11} /> {memberCount} member{memberCount !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>● Active recently</span>
        </div>
      </div>

      <div style={{
        height: 32, padding: '0 12px', borderRadius: 10,
        background: G_GLOW, border: `1px solid ${G_BORDER}`,
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 12, fontWeight: 700, color: ACCENT, flexShrink: 0,
      }}>
        <MessageCircle size={13} /> Chat
      </div>
    </motion.div>
  );
}

// ── Section divider ────────────────────────────────────────────────────────────
function SectionLabel({ title, count, action, onAction }: { title: string; count?: number; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: T1, letterSpacing: '0.01em' }}>{title}</span>
        {count != null && count > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: ACCENT,
            background: G_GLOW, border: `1px solid ${G_BORDER}`,
            borderRadius: 20, padding: '2px 8px',
          }}>{count}</span>
        )}
      </div>
      {action && onAction && (
        <button onClick={onAction} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: ACCENT, display: 'flex', alignItems: 'center', gap: 3 }}>
          {action} <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

// ── FRIENDS TAB ────────────────────────────────────────────────────────────────
function FriendsTab({
  activeFriends, onGroupsTab, openGroupChat,
}: {
  activeFriends: ActiveFriend[];
  onGroupsTab: () => void;
  openGroupChat: (g: Group) => void;
}) {
  const navigate   = useNavigate();
  const { myGroups } = useGroups();
  const { totalUnread } = useConversations();
  const {
    friends, pendingIncoming, pendingOutgoing,
    isLoading, error, sendRequest, acceptRequest,
    declinRequest, removeFriend, searchUsers,
  } = useFriends();

  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<UserProfileSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const friendIds = new Set(friends.map(f => f.friend_profile?.user_id));

  const handleSearch = useCallback(async (v: string) => {
    setQuery(v);
    if (!v.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await searchUsers(v);
      setResults(r);
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  }, [searchUsers]);

  const handleAdd = async (id: string) => {
    try { await sendRequest(id); toast.success('Friend request sent!'); }
    catch { toast.error('Could not send request'); }
  };
  const handleAccept = async (id: string) => {
    try { await acceptRequest(id); toast.success('Friend request accepted!'); }
    catch { toast.error('Could not accept request'); }
  };
  const handleDecline = async (id: string) => {
    try { await declinRequest(id); }
    catch { toast.error('Could not decline request'); }
  };
  const handleRemove = async (id: string) => {
    try { await removeFriend(id); toast.success('Removed'); }
    catch { toast.error('Could not remove friend'); }
  };
  const handleMessage = (userId: string, name: string) => {
    navigate(`/chat/${userId}`, { state: { friendName: name } });
  };

  return (
    <div>
      {/* Active Now */}
      <ActiveNow friends={activeFriends} />

      {/* Quick actions */}
      <QuickActions
        unread={totalUnread}
        pendingCount={pendingIncoming.length}
        onGroupsTab={onGroupsTab}
      />

      {/* Search bar */}
      <div style={{ padding: '4px 20px 8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T3, pointerEvents: 'none' }} />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by username…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: SURFACE_UP, border: `1px solid ${query ? G_BORDER : BORDER}`,
              borderRadius: 14, padding: '12px 14px 12px 40px',
              fontSize: 14, color: T1, outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
          />
          {searching && (
            <div style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              width: 16, height: 16, borderRadius: '50%',
              border: `2px solid ${G_BORDER}`, borderTopColor: ACCENT,
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
          {query && !searching && (
            <button onClick={() => { setQuery(''); setResults([]); }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={15} color={T3} />
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      <AnimatePresence>
        {query.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ background: SURFACE, marginBottom: 4, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}
          >
            {results.length === 0 && !searching && (
              <div style={{ padding: '20px', textAlign: 'center', color: T3, fontSize: 14 }}>
                No users found for "{query}"
              </div>
            )}
            {results.map(p => (
              <SearchRow key={p.user_id} profile={p} isFriend={friendIds.has(p.user_id)} onAdd={handleAdd} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Squads */}
      {myGroups.length > 0 && (
        <div>
          <SectionLabel title="Your Squads" count={myGroups.length} action="See all" onAction={onGroupsTab} />
          <div style={{ padding: '0 20px' }}>
            {myGroups.slice(0, 3).map(g => (
              <SquadMiniCard key={g.id} group={g} onChat={openGroupChat} />
            ))}
          </div>
        </div>
      )}

      {/* Pending requests */}
      <AnimatePresence>
        {pendingIncoming.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SectionLabel title="Friend Requests" count={pendingIncoming.length} />
            <div style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}22`, margin: '0 20px', borderRadius: 16, overflow: 'hidden' }}>
              <AnimatePresence>
                {pendingIncoming.map(f => (
                  <PendingRow key={f.id} friendship={f} onAccept={handleAccept} onDecline={handleDecline} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends list */}
      <SectionLabel title="Friends" count={friends.length} />
      <div style={{ background: SURFACE, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        {isLoading ? (
          [0, 1, 2].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: SURFACE_UP, animation: 'pulse 1.5s ease infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: '40%', height: 14, background: SURFACE_UP, borderRadius: 6, marginBottom: 6, animation: 'pulse 1.5s ease infinite' }} />
                <div style={{ width: '25%', height: 11, background: SURFACE_3, borderRadius: 6, animation: 'pulse 1.5s ease infinite' }} />
              </div>
            </div>
          ))
        ) : error ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Shield size={28} style={{ color: T3, display: 'block', margin: '0 auto 8px' }} />
            <p style={{ color: T2, fontSize: 14, margin: 0 }}>Friends unavailable</p>
          </div>
        ) : friends.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: G_GLOW, border: `1px solid ${G_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Users size={26} color={ACCENT} />
            </div>
            <p style={{ color: T1, fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>No friends yet</p>
            <p style={{ color: T3, fontSize: 13, margin: 0 }}>Search by username to add people</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {friends.map(f => (
              <FriendRow
                key={f.id}
                friendship={f}
                myId=""
                onMessage={handleMessage}
                onRemove={handleRemove}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Outgoing pending */}
      {pendingOutgoing.length > 0 && (
        <div>
          <SectionLabel title="Sent Requests" count={pendingOutgoing.length} />
          <div style={{ background: SURFACE, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
            {pendingOutgoing.map(f => {
              const p = f.friend_profile;
              if (!p) return null;
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: `1px solid ${BORDER}` }}>
                  <Avatar src={p.avatar_url} name={p.name} size={44} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: T1, display: 'block' }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: T3, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Clock size={11} /> Request pending
                    </span>
                  </div>
                  <button onClick={() => handleDecline(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3 }}>
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Social page ───────────────────────────────────────────────────────────
export default function Social() {
  const navigate = useNavigate();
  const { profile } = useFitness();
  const { user }    = useAuth();
  const { totalUnread } = useConversations();
  const { pendingIncoming, friends } = useFriends();

  const [activeTab, setActiveTab]         = useState<Tab>('FRIENDS');
  const [prevIdx, setPrevIdx]             = useState(0);
  const [activeFriends, setActiveFriends] = useState<ActiveFriend[]>([]);
  const [openGroupChat, setOpenGroupChat] = useState<Group | null>(null);

  const activeIdx  = TABS.indexOf(activeTab);
  const direction: 1 | -1 = activeIdx >= prevIdx ? 1 : -1;

  function switchTab(tab: Tab) {
    setPrevIdx(activeIdx);
    setActiveTab(tab);
  }

  // Fetch active friends
  useEffect(() => {
    if (!user || friends.length === 0) return;
    const ids = friends.map(f => f.friend_profile?.user_id).filter(Boolean) as string[];
    if (!ids.length) return;
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    (supabase.from('user_profiles' as never) as any)
      .select('user_id,name,avatar_url')
      .in('user_id', ids)
      .gte('last_active_at', fiveMinAgo)
      .then(({ data }: { data: any[] | null }) => {
        if (data) setActiveFriends(data.map(p => ({ user_id: p.user_id, name: p.name, avatar_url: p.avatar_url })));
      });
  }, [user, friends]);

  // ── Identity gate ─────────────────────────────────────────────────────────
  if (!profile?.username) {
    return (
      <div style={{ minHeight: '100dvh', background: BG, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ width: 80, height: 80, borderRadius: '50%', background: G_GLOW, border: `1px solid ${G_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
          >
            <Users size={36} color={ACCENT} />
          </motion.div>
          <p style={{ fontSize: 22, fontWeight: 800, color: T1, margin: '0 0 10px' }}>Claim Your Identity</p>
          <p style={{ fontSize: 14, color: T2, margin: '0 0 32px', lineHeight: 1.6, maxWidth: 280 }}>
            Set a username to connect with friends, join squads, and see their workouts.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/profile')}
            style={{ background: ACCENT, color: '#0C1015', border: 'none', borderRadius: 14, padding: '14px 36px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
          >
            Set Username →
          </motion.button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: BG, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(12,16,21,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${BORDER}`,
        padding: 'max(14px, env(safe-area-inset-top)) 20px 0',
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          {/* Left: avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Avatar
              src={profile?.avatarUrl ?? null}
              name={profile?.name ?? 'U'}
              size={36}
              ring
            />
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T1, lineHeight: 1.2 }}>
                {profile?.name ?? 'User'}
              </p>
              {profile?.username && (
                <p style={{ margin: 0, fontSize: 11, color: T3, fontWeight: 500 }}>
                  @{profile.username}
                </p>
              )}
            </div>
          </div>

          {/* Right: icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Messages */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate('/chats')}
              style={{ width: 38, height: 38, borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
            >
              <MessageSquare size={20} color={T2} />
              {totalUnread > 0 && (
                <div style={{
                  position: 'absolute', top: 4, right: 4,
                  background: RED, borderRadius: 8, minWidth: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: '#fff', padding: '0 4px',
                  border: `1.5px solid ${BG}`,
                }}>
                  {totalUnread > 9 ? '9+' : totalUnread}
                </div>
              )}
            </motion.button>

            {/* Notifications */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              style={{ width: 38, height: 38, borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
            >
              <Bell size={20} color={T2} />
              {pendingIncoming.length > 0 && (
                <div style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 8, height: 8, borderRadius: '50%', background: RED,
                  border: `1.5px solid ${BG}`,
                }} />
              )}
            </motion.button>

            {/* Settings */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate('/profile')}
              style={{ width: 38, height: 38, borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Settings size={20} color={T2} />
            </motion.button>
          </div>
        </div>

        {/* ── TAB BAR with sliding pill ───────────────────────────────────── */}
        <div style={{ display: 'flex', position: 'relative' }}>
          {TABS.map(tab => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                style={{
                  flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '8px 0 14px', fontSize: 12, fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: isActive ? T1 : T3,
                  transition: 'color 0.2s ease', position: 'relative',
                }}
              >
                {tab}
                {isActive && (
                  <motion.div
                    layoutId="tab-underline"
                    style={{
                      position: 'absolute', bottom: 0, left: '15%', right: '15%',
                      height: 3, background: ACCENT, borderRadius: '3px 3px 0 0',
                      boxShadow: `0 0 8px ${ACCENT}`,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 108 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: direction * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 28 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {activeTab === 'FRIENDS' && (
              <FriendsTab
                activeFriends={activeFriends}
                onGroupsTab={() => switchTab('GROUPS')}
                openGroupChat={g => setOpenGroupChat(g)}
              />
            )}
            {activeTab === 'GROUPS' && <GroupsView />}
            {activeTab === 'FEED'    && <ActivityFeedView />}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav />

      {/* ── GROUP CHAT OVERLAY ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {openGroupChat && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100 }}
          >
            <GroupChatView group={openGroupChat} onClose={() => setOpenGroupChat(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

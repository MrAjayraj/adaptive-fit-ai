// src/pages/Social.tsx — Meta-quality Social Hub v2
// Claude design system: gradient avatars, frosted header, WhatsApp-like friend rows

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Settings, UserPlus, Trophy, MessageSquare,
  Search, Check, X, Clock, MoreVertical, MessageCircle,
  Shield, Users, ChevronRight, UserCheck, Pencil,
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
const BG       = '#06090D';
const SURFACE  = '#0F1318';
const SURF2    = '#161C22';
const SURF3    = '#1E252E';
const ACCENT   = '#00E676';
const GOLD     = '#F5C518';
const T1       = '#FAFAFA';
const T2       = '#8E9BAA';
const T3       = '#3E4A57';
const BORDER   = 'rgba(255,255,255,0.06)';
const A_GLOW   = 'rgba(0,230,118,0.10)';
const A_BORDER = 'rgba(0,230,118,0.20)';
const RED      = '#FF3B5C';

type Tab = 'FRIENDS' | 'GROUPS' | 'FEED';
const TABS: Tab[] = ['FRIENDS', 'GROUPS', 'FEED'];

// ── Avatar colour palette ─────────────────────────────────────────────────────
const GRAD_PAIRS: [string, string][] = [
  ['#FF6B6B','#FF8E53'], ['#4ECDC4','#45B7D1'], ['#A78BFA','#7C3AED'],
  ['#F97316','#EF4444'], ['#10B981','#059669'], ['#3B82F6','#2563EB'],
  ['#EC4899','#DB2777'], ['#F59E0B','#D97706'], ['#06B6D4','#0284C7'],
];
function nameGrad(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + (h << 5) - h;
  return GRAD_PAIRS[Math.abs(h) % GRAD_PAIRS.length];
}
function initials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

// ── Gradient avatar ───────────────────────────────────────────────────────────
function GAvatar({
  name, src, size = 46, online = false, ring = false,
}: {
  name: string; src?: string | null; size?: number; online?: boolean; ring?: boolean;
}) {
  const [from, to] = nameGrad(name);
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        padding: ring ? 2 : 0,
        background: ring ? `linear-gradient(135deg, ${ACCENT}, #00B4FF)` : 'transparent',
        boxShadow: ring ? `0 0 12px ${A_GLOW}` : 'none',
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
          background: src ? 'transparent' : `linear-gradient(135deg, ${from}, ${to})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {src
            ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: size * 0.34, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                {initials(name)}
              </span>}
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
const RANK_COL: Record<string, string> = {
  bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700',
  platinum: '#00BFFF', diamond: '#B9F2FF', master: '#FF6B6B', grandmaster: '#FF3366',
};
function RankBadge({ tier }: { tier?: string }) {
  if (!tier) return null;
  const c = RANK_COL[tier.toLowerCase()] ?? T3;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: c,
      background: `${c}18`, border: `1px solid ${c}30`,
      borderRadius: 6, padding: '2px 6px', letterSpacing: '0.03em',
      textTransform: 'uppercase', flexShrink: 0,
    }}>
      {tier}
    </span>
  );
}

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60)    return 'just now';
  if (d < 3600)  return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

// ── Active Now strip ──────────────────────────────────────────────────────────
interface AF { user_id: string; name: string; avatar_url: string | null }

function ActiveNow({ friends }: { friends: AF[] }) {
  const navigate = useNavigate();
  if (!friends.length) return null;
  return (
    <div style={{ padding: '14px 0 4px' }}>
      <div style={{ padding: '0 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Active Now
        </span>
        <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, display: 'inline-block', boxShadow: `0 0 6px ${ACCENT}` }} />
          {friends.length}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 16px 4px', scrollbarWidth: 'none' }}>
        {friends.map(f => (
          <motion.div
            key={f.user_id}
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate(`/chat/${f.user_id}`, { state: { friendName: f.name } })}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 54 }}
          >
            <GAvatar src={f.avatar_url} name={f.name} size={52} online ring />
            <span style={{ fontSize: 11, fontWeight: 600, color: T2, maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
              {f.name.split(' ')[0]}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Quick action row ──────────────────────────────────────────────────────────
function QuickActions({ unread, pendingCount, onGroupsTab }: { unread: number; pendingCount: number; onGroupsTab: () => void }) {
  const navigate = useNavigate();
  const actions = [
    { icon: <UserPlus size={18} />, label: 'Add Friend', color: GOLD,     badge: pendingCount || 0, onClick: () => {} },
    { icon: <MessageSquare size={18} />, label: 'Messages', color: ACCENT, badge: unread || 0,        onClick: () => navigate('/chats') },
    { icon: <Trophy size={18} />,       label: 'Challenge', color: '#A78BFA', badge: 0,              onClick: () => navigate('/challenges') },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, padding: '10px 16px 4px' }}>
      {actions.map(a => (
        <motion.button
          key={a.label}
          whileTap={{ scale: 0.93 }}
          onClick={a.onClick}
          style={{
            flex: 1, height: 72, background: SURFACE,
            border: `1px solid ${BORDER}`, borderRadius: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 6, cursor: 'pointer',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 0%, ${a.color}12, transparent 70%)` }} />
          <span style={{ color: a.color, position: 'relative', display: 'flex' }}>{a.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.07em', position: 'relative' }}>
            {a.label}
          </span>
          {a.badge > 0 && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: RED, borderRadius: 10, minWidth: 16, height: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, color: '#fff', padding: '0 4px',
            }}>
              {a.badge > 99 ? '99+' : a.badge}
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ title, count, action, onAction }: { title: string; count?: number; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 16px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: T2, textTransform: 'uppercase', letterSpacing: '0.09em' }}>{title}</span>
        {count != null && count > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: ACCENT,
            background: A_GLOW, border: `1px solid ${A_BORDER}`,
            borderRadius: 20, padding: '1px 7px',
          }}>
            {count}
          </span>
        )}
      </div>
      {action && onAction && (
        <button onClick={onAction} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: ACCENT, display: 'flex', alignItems: 'center', gap: 2 }}>
          {action} <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

// ── Friend row ────────────────────────────────────────────────────────────────
function FriendRow({
  friendship, onMessage, onRemove,
}: {
  friendship: Friendship;
  onMessage: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  const p = friendship.friend_profile;
  const [menuOpen, setMenuOpen] = useState(false);
  if (!p) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', cursor: 'pointer',
        borderBottom: `1px solid ${BORDER}`,
      }}
      onClick={() => onMessage(p.user_id, p.name)}
    >
      <GAvatar src={p.avatar_url} name={p.name} size={48} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.name}
          </span>
          <RankBadge tier={p.rank_tier ?? undefined} />
        </div>
        <span style={{ fontSize: 12, color: T3, display: 'block' }}>
          {p.username ? `@${p.username}` : 'Active recently'}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={e => { e.stopPropagation(); onMessage(p.user_id, p.name); }}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: A_GLOW, border: `1px solid ${A_BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <MessageCircle size={16} color={ACCENT} />
        </motion.button>

        <div style={{ position: 'relative' }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'transparent', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <MoreVertical size={15} color={T3} />
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: 'absolute', top: '110%', right: 0, zIndex: 60,
                  background: SURF2, border: `1px solid ${BORDER}`,
                  borderRadius: 14, overflow: 'hidden', minWidth: 160,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                }}
              >
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); onRemove(friendship.id); }}
                  style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 14, fontWeight: 600, color: RED, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Remove Friend
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ── Pending request row ───────────────────────────────────────────────────────
function PendingRow({ friendship, onAccept, onDecline }: { friendship: Friendship; onAccept: (id: string) => void; onDecline: (id: string) => void }) {
  const p    = friendship.friend_profile;
  const name = p?.name ?? 'Unknown';
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.93 }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${BORDER}` }}
    >
      <GAvatar src={p?.avatar_url} name={name} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: T1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ fontSize: 11, color: GOLD, fontWeight: 600, marginTop: 2, display: 'block' }}>Wants to connect</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onAccept(friendship.id)}
          style={{ height: 32, padding: '0 14px', borderRadius: 20, background: ACCENT, border: 'none', color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Check size={12} strokeWidth={3} /> Accept
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onDecline(friendship.id)}
          style={{ height: 32, width: 32, borderRadius: '50%', background: SURF3, border: `1px solid ${BORDER}`, color: T2, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Search result row ─────────────────────────────────────────────────────────
function SearchRow({ profile, isFriend, onAdd }: { profile: UserProfileSummary; isFriend: boolean; onAdd: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${BORDER}` }}
    >
      <GAvatar src={profile.avatar_url} name={profile.name} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: T1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          style={{ height: 32, padding: '0 14px', borderRadius: 20, background: A_GLOW, border: `1px solid ${A_BORDER}`, color: ACCENT, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <UserPlus size={12} /> Add
        </motion.button>
      )}
    </motion.div>
  );
}

// ── Squad card (in Friends tab) ───────────────────────────────────────────────
function SquadCard({ group, onChat }: { group: Group; onChat: (g: Group) => void }) {
  const mc = (group as any).member_count ?? 0;
  const [from, to] = nameGrad(group.name);
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => onChat(group)}
      style={{
        background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
        padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(to bottom, ${from}, ${to})`, borderRadius: '16px 0 0 16px' }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: group.avatar_url ? 'transparent' : `linear-gradient(135deg, ${from}, ${to})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden',
      }}>
        {group.avatar_url
          ? <img src={group.avatar_url} alt={group.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
          : group.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: T1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {group.name}
        </span>
        <span style={{ fontSize: 11, color: T3, display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          <Users size={10} /> {mc} member{mc !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{
        height: 30, padding: '0 12px', borderRadius: 20,
        background: A_GLOW, border: `1px solid ${A_BORDER}`,
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 700, color: ACCENT, flexShrink: 0,
      }}>
        <MessageCircle size={12} /> Chat
      </div>
    </motion.div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function FriendSkeleton() {
  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: SURF2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: '38%', height: 13, background: SURF2, borderRadius: 6, marginBottom: 7 }} />
            <div style={{ width: '22%', height: 10, background: SURF3, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </>
  );
}

// ── FRIENDS TAB ───────────────────────────────────────────────────────────────
function FriendsTab({ activeFriends, onGroupsTab, openGroupChat }: {
  activeFriends: AF[]; onGroupsTab: () => void; openGroupChat: (g: Group) => void;
}) {
  const navigate = useNavigate();
  const { myGroups } = useGroups();
  const { totalUnread } = useConversations();
  const { friends, pendingIncoming, pendingOutgoing, isLoading, error, sendRequest, acceptRequest, declinRequest, removeFriend, searchUsers } = useFriends();

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<UserProfileSummary[]>([]);
  const [srching,  setSrching]  = useState(false);
  const friendIds = new Set(friends.map(f => f.friend_profile?.user_id));

  const handleSearch = useCallback(async (v: string) => {
    setQuery(v);
    if (!v.trim()) { setResults([]); return; }
    setSrching(true);
    try { setResults(await searchUsers(v)); }
    catch { toast.error('Search failed'); }
    finally { setSrching(false); }
  }, [searchUsers]);

  const handleAdd     = async (id: string) => { try { await sendRequest(id);   toast.success('Request sent!'); }  catch { toast.error('Could not send request'); } };
  const handleAccept  = async (id: string) => { try { await acceptRequest(id); toast.success('Friend added!'); } catch { toast.error('Could not accept'); } };
  const handleDecline = async (id: string) => { try { await declinRequest(id); } catch { toast.error('Could not decline'); } };
  const handleRemove  = async (id: string) => { try { await removeFriend(id);  toast.success('Removed'); }        catch { toast.error('Could not remove'); } };
  const handleMessage = (userId: string, name: string) => navigate(`/chat/${userId}`, { state: { friendName: name } });

  return (
    <div>
      <ActiveNow friends={activeFriends} />
      <QuickActions unread={totalUnread} pendingCount={pendingIncoming.length} onGroupsTab={onGroupsTab} />

      {/* Search */}
      <div style={{ padding: '6px 16px 4px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T3, pointerEvents: 'none' }} />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by username…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: SURF2, border: `1px solid ${query ? A_BORDER : BORDER}`,
              borderRadius: 14, padding: '11px 14px 11px 38px',
              fontSize: 14, color: T1, outline: 'none', fontFamily: 'inherit',
              transition: 'border-color 0.2s',
            }}
          />
          {srching && <div style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', border: `2px solid ${A_BORDER}`, borderTopColor: ACCENT, animation: 'spin 0.7s linear infinite' }} />}
          {query && !srching && (
            <button onClick={() => { setQuery(''); setResults([]); }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={14} color={T3} />
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      <AnimatePresence>
        {query.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ background: SURFACE, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, marginBottom: 4 }}
          >
            {results.length === 0 && !srching && (
              <div style={{ padding: '18px', textAlign: 'center', color: T3, fontSize: 13 }}>
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
          <SectionLabel title="Your Squads" count={myGroups.length} action="All" onAction={onGroupsTab} />
          <div style={{ padding: '0 16px' }}>
            {myGroups.slice(0, 3).map(g => <SquadCard key={g.id} group={g} onChat={openGroupChat} />)}
          </div>
        </div>
      )}

      {/* Pending requests */}
      <AnimatePresence>
        {pendingIncoming.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SectionLabel title="Requests" count={pendingIncoming.length} />
            <div style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}18`, margin: '0 16px', borderRadius: 14, overflow: 'hidden' }}>
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
        {isLoading ? <FriendSkeleton />
          : error ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <Shield size={26} style={{ color: T3, display: 'block', margin: '0 auto 8px' }} />
              <p style={{ color: T2, fontSize: 14, margin: 0 }}>Friends unavailable</p>
            </div>
          ) : friends.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: A_GLOW, border: `1px solid ${A_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Users size={24} color={ACCENT} />
              </div>
              <p style={{ color: T1, fontSize: 15, fontWeight: 700, margin: '0 0 5px' }}>No friends yet</p>
              <p style={{ color: T3, fontSize: 12, margin: 0 }}>Search by username above to add people</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {friends.map(f => (
                <FriendRow key={f.id} friendship={f} onMessage={handleMessage} onRemove={handleRemove} />
              ))}
            </AnimatePresence>
          )}
      </div>

      {/* Outgoing */}
      {pendingOutgoing.length > 0 && (
        <div>
          <SectionLabel title="Sent Requests" count={pendingOutgoing.length} />
          <div style={{ background: SURFACE, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
            {pendingOutgoing.map(f => {
              const p = f.friend_profile;
              if (!p) return null;
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${BORDER}` }}>
                  <GAvatar src={p.avatar_url} name={p.name} size={44} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T1, display: 'block' }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: T3, display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <Clock size={10} /> Pending
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

  const [activeTab,      setActiveTab]      = useState<Tab>('FRIENDS');
  const [prevIdx,        setPrevIdx]        = useState(0);
  const [activeFriends,  setActiveFriends]  = useState<AF[]>([]);
  const [openGroupChat,  setOpenGroupChat]  = useState<Group | null>(null);

  const activeIdx = TABS.indexOf(activeTab);
  const direction: 1 | -1 = activeIdx >= prevIdx ? 1 : -1;

  function switchTab(tab: Tab) {
    setPrevIdx(activeIdx);
    setActiveTab(tab);
  }

  // Fetch active friends (online in last 5 min)
  useEffect(() => {
    if (!user || !friends.length) return;
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

  // ── Identity gate ──────────────────────────────────────────────────────────
  if (!profile?.username) {
    return (
      <div style={{ minHeight: '100dvh', background: BG, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ width: 80, height: 80, borderRadius: '50%', background: A_GLOW, border: `1px solid ${A_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
          >
            <Users size={36} color={ACCENT} />
          </motion.div>
          <p style={{ fontSize: 22, fontWeight: 800, color: T1, margin: '0 0 10px' }}>Claim Your Identity</p>
          <p style={{ fontSize: 14, color: T2, margin: '0 0 28px', lineHeight: 1.6, maxWidth: 280 }}>
            Set a username to connect with friends, join squads, and see their workouts.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/profile')}
            style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 20, padding: '13px 32px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
          >
            Set Username →
          </motion.button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: BG, display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Manrope',system-ui,sans-serif" }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        * { scrollbar-width: none; } *::-webkit-scrollbar { display:none; }
      `}</style>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(6,9,13,0.96)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${BORDER}`,
        padding: 'max(14px,env(safe-area-inset-top)) 16px 0',
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          {/* Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GAvatar src={profile?.avatarUrl} name={profile?.name ?? 'U'} size={38} ring />
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T1, lineHeight: 1.2 }}>
                {profile?.name ?? 'User'}
              </p>
              {profile?.username && (
                <p style={{ margin: 0, fontSize: 11, color: T3, fontWeight: 500 }}>@{profile.username}</p>
              )}
            </div>
          </div>

          {/* Icon buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Messages */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate('/chats')}
              style={{ width: 38, height: 38, borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
            >
              <MessageSquare size={20} color={T2} />
              {totalUnread > 0 && (
                <div style={{ position: 'absolute', top: 5, right: 5, background: RED, borderRadius: 8, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff', padding: '0 3px', border: `1.5px solid ${BG}` }}>
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
                <div style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: RED, border: `1.5px solid ${BG}` }} />
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

        {/* Tab bar */}
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
                  textTransform: 'uppercase', letterSpacing: '0.09em',
                  color: isActive ? T1 : T3,
                  transition: 'color 0.18s', position: 'relative',
                }}
              >
                {tab}
                {isActive && (
                  <motion.div
                    layoutId="tab-line"
                    style={{
                      position: 'absolute', bottom: 0, left: '18%', right: '18%',
                      height: 2.5, background: ACCENT, borderRadius: '3px 3px 0 0',
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
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 110 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 24 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {activeTab === 'FRIENDS' && (
              <FriendsTab
                activeFriends={activeFriends}
                onGroupsTab={() => switchTab('GROUPS')}
                openGroupChat={g => setOpenGroupChat(g)}
              />
            )}
            {activeTab === 'GROUPS' && <GroupsView />}
            {activeTab === 'FEED'   && <ActivityFeedView />}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav />

      {/* ── Group chat overlay ─────────────────────────────────────────────── */}
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

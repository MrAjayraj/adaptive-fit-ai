// src/components/social/FriendsList.tsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Check, X, Clock, UserMinus, Shield, AlertCircle, MessageCircle } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import type { UserProfileSummary, Friendship } from '@/types/social';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

function Avatar({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-[14px] object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="rounded-[14px] bg-[#2A2A2A] border border-white/5 text-text-2 font-bold flex items-center justify-center flex-shrink-0"
    >
      {initials}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 px-2 border-b border-white/5">
      <div className="w-12 h-12 rounded-[14px] bg-[#222] animate-pulse" />
      <div className="flex-1">
        <div className="w-24 h-4 bg-[#222] rounded animate-pulse mb-2" />
        <div className="w-16 h-3 bg-[#111] rounded animate-pulse" />
      </div>
    </div>
  );
}

function RankBadge({ tier, division }: { tier?: string; division?: number }) {
  if (!tier) return null;
  const colors: Record<string, string> = {
    bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700',
    platinum: '#00BFFF', diamond: '#B9F2FF', master: '#FF6B6B', grandmaster: '#FF3366',
  };
  const color = colors[tier.toLowerCase()] ?? '#9191A0';
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] capitalize"
      style={{ color, border: `1px solid ${color}40`, background: `${color}15` }}
    >
      {tier} {division != null ? `D${division}` : ''}
    </span>
  );
}

function FriendRow({
  friendship,
  onRemove,
  onMessage,
}: {
  friendship: Friendship;
  onRemove: (id: string) => void;
  onMessage: (userId: string) => void;
}) {
  const p = friendship.friend_profile;
  if (!p) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className="flex items-center gap-4 py-3 px-2 border-b border-white/5 last:border-b-0"
    >
      <Avatar src={p.avatar_url} name={p.name} size={48} />
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <p className="text-[16px] font-semibold text-text-1 truncate">{p.name}</p>
          <RankBadge tier={p.rank_tier ?? undefined} division={p.rank_division ?? undefined} />
        </div>
        {p.username && <p className="text-[13px] text-text-3 font-medium truncate mt-0.5">@{p.username}</p>}
      </div>
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(0,230,118,0.1)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onMessage(p.user_id)}
          className="p-2.5 rounded-full text-text-3 hover:text-[#00E676] transition-colors"
          title="Send message"
        >
          <MessageCircle size={18} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,107,107,0.1)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onRemove(friendship.id)}
          className="p-2.5 rounded-full text-text-3 hover:text-red-400 transition-colors"
          title="Remove friend"
        >
          <UserMinus size={18} />
        </motion.button>
      </div>
    </motion.div>
  );
}

function PendingIncomingRow({
  friendship,
  onAccept,
  onDecline,
}: {
  friendship: Friendship;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const p = friendship.friend_profile;
  const name = p?.name ?? 'Unknown User';
  const username = p?.username;
  const avatar = p?.avatar_url ?? null;
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-4 py-4 px-3 bg-surface-2/50 rounded-[16px] mb-2 border border-white/5"
    >
      <Avatar src={avatar} name={name} size={48} />
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-semibold text-text-1 truncate">{name}</p>
        {username && <p className="text-[13px] text-text-3 font-medium truncate mt-0.5">@{username}</p>}
      </div>
      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAccept(friendship.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#00E676] text-[#06090D] text-[13px] font-bold hover:brightness-110 transition-all shadow-[0_4px_16px_rgba(0,230,118,0.2)]"
          title="Accept"
        >
          <Check size={14} strokeWidth={2.5} /> Accept
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onDecline(friendship.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#222] border border-white/5 text-text-2 text-[13px] font-semibold hover:bg-[#333] transition-colors"
          title="Decline"
        >
          <X size={14} /> Ignore
        </motion.button>
      </div>
    </motion.div>
  );
}

function PendingOutgoingRow({
  friendship,
  onCancel,
}: {
  friendship: Friendship;
  onCancel: (id: string) => void;
}) {
  const p = friendship.friend_profile;
  if (!p) return null;
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 py-3 px-1"
    >
      <Avatar src={p.avatar_url} name={p.name} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-text-1 truncate">{p.name}</p>
        {p.username && <p className="text-[13px] text-text-2 truncate">@{p.username}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-text-3 flex items-center gap-1">
          <Clock size={11} /> Pending
        </span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onCancel(friendship.id)}
          className="p-1.5 rounded-[8px] text-text-3 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Cancel request"
        >
          <X size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
}

function SearchResultRow({
  profile,
  onAdd,
  alreadyFriend,
}: {
  profile: UserProfileSummary;
  onAdd: (id: string) => void;
  alreadyFriend: boolean;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 py-3 px-2 border-b border-white/5"
    >
      <Avatar src={profile.avatar_url} name={profile.name} size={48} />
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-semibold text-text-1 truncate">{profile.name}</p>
        {profile.username && <p className="text-[13px] text-text-3 font-medium truncate mt-0.5">@{profile.username}</p>}
      </div>
      {alreadyFriend ? (
        <span className="text-[12px] text-[#00E676] flex items-center gap-1 font-semibold">
          <Check size={14} strokeWidth={3} /> FRIEND
        </span>
      ) : (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAdd(profile.user_id)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-[#00E676] text-[#06090D] text-[13px] font-bold hover:brightness-110 transition-colors shadow-[0_4px_16px_rgba(0,230,118,0.2)]"
        >
          <UserPlus size={14} /> Add Friend
        </motion.button>
      )}
    </motion.div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1">
      <span className="text-[11px] font-bold uppercase tracking-widest text-text-3">{title}</span>
      {count > 0 && (
        <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

export default function FriendsList() {
  const navigate = useNavigate();
  const {
    friends,
    pendingIncoming,
    pendingOutgoing,
    isLoading,
    error,
    sendRequest,
    acceptRequest,
    declinRequest,
    removeFriend,
    blockUser,
    searchUsers,
  } = useFriends();

  // ── All hooks MUST come before any conditional returns (Rules of Hooks) ────
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfileSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const friendIds = new Set(friends.map((f) => f.friend_profile?.user_id));

  const handleSearch = useCallback(
    async (val: string) => {
      setQuery(val);
      if (!val.trim()) { setSearchResults([]); return; }
      setIsSearching(true);
      try {
        const results = await searchUsers(val);
        setSearchResults(results);
      } catch {
        toast.error('Search failed');
      } finally {
        setIsSearching(false);
      }
    },
    [searchUsers]
  );

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <div>
          <p className="text-[17px] font-semibold text-text-1">Friends Unavailable</p>
          <p className="text-[13px] text-text-2 mt-1 leading-relaxed max-w-xs">{error}</p>
        </div>
      </div>
    );
  }

  const handleAdd = async (addresseeId: string) => {
    try {
      await sendRequest(addresseeId);
      toast.success('Friend request sent!');
    } catch {
      toast.error('Could not send request');
    }
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
    try { await removeFriend(id); toast.success('Friend removed'); }
    catch { toast.error('Could not remove friend'); }
  };

  const handleBlock = async (userId: string) => {
    try { await blockUser(userId); toast.success('User blocked'); }
    catch { toast.error('Could not block user'); }
  };

  void handleBlock; // available but only called from context menus, suppress lint

  const handleMessage = (userId: string) => {
    navigate(`/chat/${userId}`);
  };

  return (
    <div className="flex flex-col gap-0 bg-[#0C1015]/80 backdrop-blur-xl rounded-[20px] p-2">
      {/* Search */}
      <div className="relative mb-2 px-2 pt-2">
        <Search size={16} className="absolute left-6 top-[28px] text-text-3" />
        <input
          type="text"
          placeholder="Search by username (min 3 chars)"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-[#1A1A1A] border border-white/5 rounded-[16px] pl-10 pr-4 py-3.5 text-[15px] font-medium text-text-1 placeholder:text-text-3 outline-none focus:border-[#00E676]/40 focus:ring-1 focus:ring-[#00E676]/20 transition-all shadow-inner"
        />
        {isSearching && (
          <div className="absolute right-6 top-[28px] w-4 h-4 border-2 border-[#00E676]/30 border-t-[#00E676] rounded-full animate-spin" />
        )}
      </div>

      {/* Search results */}
      {query && (
        <div className="mt-2">
          {searchResults.length === 0 && !isSearching && (
            <p className="text-[13px] text-text-3 py-3 text-center">No users found</p>
          )}
          {searchResults.map((profile) => (
            <SearchResultRow
              key={profile.user_id}
              profile={profile}
              onAdd={handleAdd}
              alreadyFriend={friendIds.has(profile.user_id)}
            />
          ))}
        </div>
      )}



      {/* Friends list */}
      <div className="px-2">
        <SectionHeader title="Your Friends" count={friends.length} />
        {isLoading ? (
          <div className="py-2 flex flex-col gap-0">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : friends.length === 0 ? (
        <div className="py-8 text-center">
          <Shield size={32} className="mx-auto text-text-3 mb-2" />
          <p className="text-[15px] text-text-2">No friends yet</p>
          <p className="text-[13px] text-text-3">Search for people to add them</p>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          <AnimatePresence mode="popLayout">
            {friends.map((f) => (
              <FriendRow key={f.id} friendship={f} onRemove={handleRemove} onMessage={handleMessage} />
            ))}
          </AnimatePresence>
        </div>
      )}
      </div>

      {/* Incoming requests — moved below friends list */}
      {pendingIncoming.length > 0 && (
        <div className="mt-6 mb-1 rounded-[16px] border border-[#00E676]/20 bg-[#00E676]/5 px-3 pb-1">
          <SectionHeader title={`Pending Requests`} count={pendingIncoming.length} />
          <div className="divide-y divide-border-subtle/50">
            {pendingIncoming.map((f) => (
              <PendingIncomingRow
                key={f.id}
                friendship={f}
                onAccept={handleAccept}
                onDecline={handleDecline}
              />
            ))}
          </div>
        </div>
      )}

      {/* Outgoing requests */}
      {pendingOutgoing.length > 0 && (
        <div className="mt-4 px-2">
          <SectionHeader title="Sent Requests" count={pendingOutgoing.length} />
          <div className="divide-y divide-border-subtle">
            {pendingOutgoing.map((f) => (
              <PendingOutgoingRow key={f.id} friendship={f} onCancel={handleDecline} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

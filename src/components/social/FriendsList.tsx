// src/components/social/FriendsList.tsx
import React, { useState, useCallback } from 'react';
import { Search, UserPlus, Check, X, Clock, UserMinus, Shield, AlertCircle } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import type { UserProfileSummary, Friendship } from '@/types/social';
import { toast } from 'sonner';

function Avatar({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) {
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

function FriendRow({ friendship, onRemove }: { friendship: Friendship; onRemove: (id: string) => void }) {
  const p = friendship.friend_profile;
  if (!p) return null;
  return (
    <div className="flex items-center gap-3 py-3 px-1">
      <Avatar src={p.avatar_url} name={p.name} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-text-1 truncate">{p.name}</p>
        {p.username && <p className="text-[13px] text-text-2 truncate">@{p.username}</p>}
        <RankBadge tier={p.rank_tier ?? undefined} division={p.rank_division ?? undefined} />
      </div>
      <button
        onClick={() => onRemove(friendship.id)}
        className="p-2 rounded-[10px] text-text-3 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        title="Remove friend"
      >
        <UserMinus size={16} />
      </button>
    </div>
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
    <div className="flex items-center gap-3 py-3 px-1">
      <Avatar src={avatar} name={name} size={44} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-text-1 truncate">{name}</p>
        {username && <p className="text-[12px] text-text-2 truncate">@{username}</p>}
        <p className="text-[11px] text-text-3 mt-0.5">Wants to be your friend</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onAccept(friendship.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] bg-[#00E676] text-[#06090D] text-[13px] font-bold hover:bg-[#00E676]/90 transition-colors"
          title="Accept"
        >
          <Check size={13} /> Accept
        </button>
        <button
          onClick={() => onDecline(friendship.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] border border-red-400/40 text-red-400 text-[13px] font-semibold hover:bg-red-400/10 transition-colors"
          title="Decline"
        >
          <X size={13} /> Decline
        </button>
      </div>
    </div>
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
    <div className="flex items-center gap-3 py-3 px-1">
      <Avatar src={p.avatar_url} name={p.name} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-text-1 truncate">{p.name}</p>
        {p.username && <p className="text-[13px] text-text-2 truncate">@{p.username}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-text-3 flex items-center gap-1">
          <Clock size={11} /> Pending
        </span>
        <button
          onClick={() => onCancel(friendship.id)}
          className="p-1.5 rounded-[8px] text-text-3 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Cancel request"
        >
          <X size={14} />
        </button>
      </div>
    </div>
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
    <div className="flex items-center gap-3 py-3 px-1">
      <Avatar src={profile.avatar_url} name={profile.name} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-text-1 truncate">{profile.name}</p>
        {profile.username && <p className="text-[13px] text-text-2 truncate">@{profile.username}</p>}
        <RankBadge tier={profile.rank_tier ?? undefined} division={profile.rank_division ?? undefined} />
      </div>
      {alreadyFriend ? (
        <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
          <Check size={12} /> Friends
        </span>
      ) : (
        <button
          onClick={() => onAdd(profile.user_id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-primary/15 text-primary text-[13px] font-semibold hover:bg-primary/25 transition-colors"
        >
          <UserPlus size={13} /> Add
        </button>
      )}
    </div>
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

  return (
    <div className="flex flex-col gap-0 bg-surface-1 rounded-[20px] border border-border p-4">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
        <input
          type="text"
          placeholder="Search people..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-surface-2 border border-border-subtle rounded-[14px] pl-9 pr-4 py-2.5 text-[15px] text-text-1 placeholder:text-text-3 outline-none focus:border-primary/50 transition-colors"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
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

      {/* Incoming requests — shown prominently above friends list */}
      {pendingIncoming.length > 0 && (
        <div className="mt-3 mb-1 rounded-[16px] border border-[#00E676]/20 bg-[#00E676]/5 px-3 pb-1">
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
        <>
          <SectionHeader title="Sent" count={pendingOutgoing.length} />
          <div className="divide-y divide-border-subtle">
            {pendingOutgoing.map((f) => (
              <PendingOutgoingRow key={f.id} friendship={f} onCancel={handleDecline} />
            ))}
          </div>
        </>
      )}

      {/* Friends list */}
      <SectionHeader title="Friends" count={friends.length} />
      {isLoading ? (
        <div className="py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : friends.length === 0 ? (
        <div className="py-8 text-center">
          <Shield size={32} className="mx-auto text-text-3 mb-2" />
          <p className="text-[15px] text-text-2">No friends yet</p>
          <p className="text-[13px] text-text-3">Search for people to add them</p>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {friends.map((f) => (
            <FriendRow key={f.id} friendship={f} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  );
}

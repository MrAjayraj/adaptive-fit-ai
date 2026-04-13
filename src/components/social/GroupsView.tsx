// src/components/social/GroupsView.tsx
import { useState } from 'react';
import { useGroups } from '@/hooks/useGroups';
import type { Group } from '@/types/social';
import { Users, Plus, Hash, ChevronRight, X, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';

// ── Create Group Bottom Sheet ────────────────────────────────────────────────
function CreateGroupSheet({ onClose }: { onClose: () => void }) {
  const { createGroup } = useGroups();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { toast.error('Group name is required'); return; }
    setLoading(true);
    try {
      await createGroup(name.trim(), description.trim(), isPublic);
      toast.success('Group created!');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0E1117] border-t border-[#1E2330] rounded-t-3xl p-6 safe-bottom">
        {/* Handle */}
        <div className="w-10 h-1 bg-[#2D3446] rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-[#E5E7EB]">Create Group</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#E5E7EB] transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider mb-1.5 block">
              Group Name
            </label>
            <input
              type="text"
              placeholder="e.g. Morning Grind Squad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full bg-[#06090D] border border-[#1E2330] rounded-xl px-4 py-3 text-sm text-[#E5E7EB] placeholder-[#4B5563] focus:outline-none focus:border-[#00E676]/50"
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider mb-1.5 block">
              Description (optional)
            </label>
            <textarea
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full bg-[#06090D] border border-[#1E2330] rounded-xl px-4 py-3 text-sm text-[#E5E7EB] placeholder-[#4B5563] focus:outline-none focus:border-[#00E676]/50 resize-none"
            />
          </div>
          {/* Public toggle */}
          <button
            onClick={() => setIsPublic((p) => !p)}
            className="flex items-center gap-3 w-full py-3 px-4 bg-[#06090D] border border-[#1E2330] rounded-xl"
          >
            {isPublic ? (
              <Globe size={16} className="text-[#00E676]" />
            ) : (
              <Lock size={16} className="text-[#F59E0B]" />
            )}
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[#E5E7EB]">{isPublic ? 'Public' : 'Private'}</p>
              <p className="text-xs text-[#6B7280]">
                {isPublic ? 'Anyone with invite code can join' : 'Invite only'}
              </p>
            </div>
            <div
              className={`w-10 h-5.5 rounded-full transition-colors ${isPublic ? 'bg-[#00E676]' : 'bg-[#2D3446]'}`}
              style={{ height: 22, width: 40 }}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-[3px] ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </div>
          </button>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="w-full mt-5 py-3.5 rounded-2xl bg-[#00E676] text-[#06090D] font-bold text-sm hover:bg-[#00E676]/90 transition disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create Group'}
        </button>
      </div>
    </>
  );
}

// ── Group Card ────────────────────────────────────────────────────────────────
function GroupCard({ group }: { group: Group }) {
  return (
    <div className="flex items-center gap-3 bg-[#0E1117] border border-[#1E2330] rounded-2xl p-4">
      {group.avatar_url ? (
        <img
          src={group.avatar_url}
          alt={group.name}
          className="w-12 h-12 rounded-xl object-cover shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-[#1E2330] flex items-center justify-center shrink-0">
          <Users size={20} className="text-[#00E676]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#E5E7EB] truncate">{group.name}</p>
          {group.is_public ? (
            <Globe size={11} className="text-[#6B7280] shrink-0" />
          ) : (
            <Lock size={11} className="text-[#6B7280] shrink-0" />
          )}
        </div>
        {group.description && (
          <p className="text-xs text-[#6B7280] truncate mt-0.5">{group.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-[#4B5563]">
            {group.member_count ?? 0} member{(group.member_count ?? 0) !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-[#2D3446]">·</span>
          <span className="text-xs text-[#4B5563] font-mono uppercase tracking-wider">
            {group.invite_code}
          </span>
        </div>
      </div>
      <ChevronRight size={16} className="text-[#2D3446] shrink-0" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
import GroupChatView from './GroupChatView';

export default function GroupsView() {
  const { myGroups, isLoading, joinByInviteCode, leaveGroup } = useGroups();
  const [showCreate, setShowCreate] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      await joinByInviteCode(inviteCode.trim());
      toast.success('Joined group!');
      setInviteCode('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid invite code');
    } finally {
      setJoining(false);
    }
  }

  if (activeGroup) {
    return (
      <GroupChatView
        group={activeGroup}
        onBack={() => setActiveGroup(null)}
        onLeave={async () => {
          if (window.confirm(`Leave group "${activeGroup.name}"?`)) {
            await leaveGroup(activeGroup.id);
            setActiveGroup(null);
          }
        }}
      />
    );
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      {/* Actions Row */}
      <div className="flex gap-3">
        {/* Join by code */}
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
            <input
              type="text"
              placeholder="Invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={10}
              className="w-full bg-[#0E1117] border border-[#1E2330] rounded-xl pl-8 pr-3 py-2.5 text-sm text-[#E5E7EB] placeholder-[#4B5563] focus:outline-none focus:border-[#00E676]/50 font-mono tracking-widest uppercase"
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={joining || !inviteCode.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30 text-sm font-semibold hover:bg-[#00E676]/20 transition disabled:opacity-50 whitespace-nowrap"
          >
            {joining ? '…' : 'Join'}
          </button>
        </div>
        {/* Create button */}
        <button
          onClick={() => setShowCreate(true)}
          className="p-2.5 rounded-xl bg-[#00E676] text-[#06090D] hover:bg-[#00E676]/90 transition"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Groups list */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-t-2 border-[#00E676] rounded-full animate-spin" />
        </div>
      ) : myGroups.length === 0 ? (
        <div className="text-center py-12">
          <Users size={40} className="text-[#2D3446] mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">No groups yet</p>
          <p className="text-xs text-[#4B5563] mt-1">Create a group or join one with an invite code.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myGroups.map((group) => (
             <button
               key={group.id}
               className="w-full text-left bg-transparent border-none p-0 outline-none block"
               onClick={() => setActiveGroup(group)}
             >
              <GroupCard group={group} />
            </button>
          ))}
        </div>
      )}

      {/* Create Group Sheet */}
      {showCreate && <CreateGroupSheet onClose={() => setShowCreate(false)} />}
    </div>
  );
}

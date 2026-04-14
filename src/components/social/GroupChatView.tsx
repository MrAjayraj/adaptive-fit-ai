// src/components/social/GroupChatView.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Copy, Check, Users, MessageSquare, Settings,
  Send, Trash2, Crown, Shield, User as UserIcon, RefreshCw,
  Globe, Lock, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { Group, GroupMember } from '@/types/social';
import {
  fetchGroupMessages,
  sendGroupMessage,
  fetchGroupMembers,
  updateGroup,
  regenerateInviteCode,
  transferOwnership,
  removeMemberFromGroup,
  deleteGroup,
  leaveGroup as svcLeaveGroup,
  type GroupMessageRow,
} from '@/services/socialService';

// ─── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 32 }: { src: string | null | undefined; name: string; size?: number }) {
  const initials = (name || 'U').split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
  if (src) return <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />;
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className="rounded-full bg-[#00E676]/20 text-[#00E676] font-bold flex items-center justify-center flex-shrink-0"
    >
      {initials}
    </div>
  );
}

// ─── Timestamp ───────────────────────────────────────────────────────────────────

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── CopyButton ──────────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1E2330] text-[#9CA3AF] text-[11px] font-mono hover:bg-[#2D3446] transition"
    >
      {copied ? <Check size={11} className="text-[#00E676]" /> : <Copy size={11} />}
      {label ?? text}
    </button>
  );
}

// ─── CHAT TAB ────────────────────────────────────────────────────────────────────

function ChatTab({ group }: { group: Group }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupMessageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadRef = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async () => {
    try {
      const msgs = await fetchGroupMessages(group.id);
      setMessages(msgs);
    } catch (err) {
      console.error('[ChatTab] load error:', err);
      toast.error('Could not load messages');
    } finally {
      setIsLoading(false);
    }
  }, [group.id]);

  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { load(); }, [load]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`chat-${group.id}`)
      .on('postgres_changes' as never, {
        event: 'INSERT', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${group.id}`,
      }, () => { loadRef.current?.(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [group.id, user]);

  const handleSend = async () => {
    if (!user || !input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    // Optimistic
    const opt: GroupMessageRow = {
      id: `opt-${Date.now()}`,
      group_id: group.id,
      sender_id: user.id,
      content: text,
      is_deleted: false,
      created_at: new Date().toISOString(),
    };
    setMessages((p) => [...p, opt]);
    try {
      await sendGroupMessage(group.id, user.id, text);
      await load();
    } catch (err) {
      toast.error('Failed to send message');
      setMessages((p) => p.filter((m) => m.id !== opt.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-[#00E676]/30 border-t-[#00E676] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-2">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare size={32} className="mx-auto text-[#2D3446] mb-2" />
            <p className="text-[13px] text-[#6B7280]">No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user?.id;
          const name = msg.sender_profile?.name ?? 'Unknown';
          const prev = messages[i - 1];
          const showHeader = !prev || prev.sender_id !== msg.sender_id;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isMe && showHeader
                ? <Avatar src={msg.sender_profile?.avatar_url} name={name} size={24} />
                : !isMe && <div style={{ width: 24, flexShrink: 0 }} />}
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && showHeader && (
                  <span className="text-[11px] font-bold text-[#9CA3AF] px-1">{name}</span>
                )}
                <div className={`px-3 py-2 rounded-2xl text-[14px] leading-snug ${
                  isMe ? 'bg-[#00E676]/15 text-[#E5E7EB] rounded-br-sm' : 'bg-[#1E2330] text-[#E5E7EB] rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-[#4B5563] px-1">{timeAgo(msg.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#1E2330] flex gap-2 bg-[#0E1117]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Message..."
          className="flex-1 bg-[#06090D] border border-[#1E2330] rounded-xl px-4 py-2.5 text-[14px] text-[#E5E7EB] placeholder-[#4B5563] focus:outline-none focus:border-[#00E676]/40"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-xl bg-[#00E676] text-[#06090D] flex items-center justify-center hover:bg-[#00E676]/90 transition disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── MEMBERS TAB ─────────────────────────────────────────────────────────────────

function MembersTab({ group, isOwner, onRefreshMembers }: { group: Group; isOwner: boolean; onRefreshMembers: () => void }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGroupMembers(group.id)
      .then(setMembers)
      .catch((e) => console.error('[MembersTab]', e))
      .finally(() => setIsLoading(false));
  }, [group.id]);

  const handleRemove = async (member: GroupMember) => {
    if (!window.confirm(`Remove ${member.profile?.name ?? 'this member'} from the group?`)) return;
    try {
      await removeMemberFromGroup(group.id, member.user_id);
      setMembers((p) => p.filter((m) => m.id !== member.id));
      onRefreshMembers();
      toast.success('Member removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const roleIcon = (role: GroupMember['role']) => {
    if (role === 'owner') return <Crown size={11} className="text-[#FFD700]" />;
    if (role === 'admin') return <Shield size={11} className="text-[#00BFFF]" />;
    return <UserIcon size={11} className="text-[#6B7280]" />;
  };

  const roleCls = (role: GroupMember['role']) => {
    if (role === 'owner') return 'text-[#FFD700] border-[#FFD700]/30 bg-[#FFD700]/10';
    if (role === 'admin') return 'text-[#00BFFF] border-[#00BFFF]/30 bg-[#00BFFF]/10';
    return 'text-[#6B7280] border-[#6B7280]/30 bg-[#6B7280]/10';
  };

  if (isLoading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#00E676]/30 border-t-[#00E676] rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 py-3 space-y-2 pb-8">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-3">
        {members.length} Member{members.length !== 1 ? 's' : ''}
      </p>
      {members.map((member) => {
        const p = member.profile;
        const name = p?.name ?? 'Unknown';
        const isMe = member.user_id === user?.id;
        const canRemove = isOwner && !isMe && member.role !== 'owner';
        return (
          <div key={member.id} className="flex items-center gap-3 p-3 rounded-2xl bg-[#0E1117] border border-[#1E2330]">
            <Avatar src={p?.avatar_url} name={name} size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[14px] font-semibold text-[#E5E7EB] truncate">{name}</p>
                {isMe && <span className="text-[10px] text-[#6B7280]">(you)</span>}
              </div>
              {p?.username && <p className="text-[12px] text-[#6B7280]">@{p.username}</p>}
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold capitalize ${roleCls(member.role)}`}>
              {roleIcon(member.role)} {member.role}
            </div>
            {canRemove && (
              <button onClick={() => handleRemove(member)} className="p-1.5 rounded-lg text-[#6B7280] hover:text-red-400 hover:bg-red-400/10 transition">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── SETTINGS TAB ────────────────────────────────────────────────────────────────

function SettingsTab({
  group, members, isOwner, onGroupUpdated, onGroupDeleted, onLeft,
}: {
  group: Group;
  members: GroupMember[];
  isOwner: boolean;
  onGroupUpdated: (fields: Partial<Group>) => void;
  onGroupDeleted: () => void;
  onLeft: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [isPublic, setIsPublic] = useState(group.is_public);
  const [inviteCode, setInviteCode] = useState(group.invite_code);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transferTo, setTransferTo] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      await updateGroup(group.id, { name: name.trim(), description: description.trim(), is_public: isPublic });
      onGroupUpdated({ name: name.trim(), description: description.trim(), is_public: isPublic });
      toast.success('Group updated');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleRegenCode = async () => {
    try {
      const code = await regenerateInviteCode(group.id);
      setInviteCode(code);
      onGroupUpdated({ invite_code: code });
      toast.success('New invite code generated');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleTransfer = async () => {
    if (!transferTo || !user) return;
    if (!window.confirm('Transfer ownership? You will become a regular member.')) return;
    try {
      await transferOwnership(group.id, user.id, transferTo);
      toast.success('Ownership transferred');
      onLeft();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleDelete = async () => {
    try {
      await deleteGroup(group.id);
      toast.success('Group deleted');
      onGroupDeleted();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete group'); }
  };

  const handleLeave = async () => {
    if (!user || !window.confirm('Leave this group?')) return;
    try {
      await svcLeaveGroup(user.id, group.id);
      toast.success('Left group');
      onLeft();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to leave'); }
  };

  const nonOwnerMembers = members.filter((m) => m.role !== 'owner' && m.user_id !== user?.id);

  return (
    <div className="px-4 py-3 space-y-4 pb-10 overflow-y-auto">
      {isOwner && (
        <>
          {/* Info */}
          <div className="rounded-2xl bg-[#0E1117] border border-[#1E2330] p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Group Info</p>
            <div>
              <label className="text-[12px] text-[#6B7280] mb-1 block">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50}
                className="w-full bg-[#06090D] border border-[#1E2330] rounded-xl px-3 py-2.5 text-[14px] text-[#E5E7EB] focus:outline-none focus:border-[#00E676]/40" />
            </div>
            <div>
              <label className="text-[12px] text-[#6B7280] mb-1 block">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={200}
                className="w-full bg-[#06090D] border border-[#1E2330] rounded-xl px-3 py-2.5 text-[14px] text-[#E5E7EB] focus:outline-none focus:border-[#00E676]/40 resize-none" />
            </div>
            <button onClick={() => setIsPublic((p) => !p)}
              className="flex items-center gap-3 w-full py-2.5 px-3 bg-[#06090D] border border-[#1E2330] rounded-xl">
              {isPublic ? <Globe size={14} className="text-[#00E676]" /> : <Lock size={14} className="text-[#F59E0B]" />}
              <div className="flex-1 text-left">
                <p className="text-[13px] font-medium text-[#E5E7EB]">{isPublic ? 'Public' : 'Private'}</p>
              </div>
              <div className={`rounded-full transition-colors ${isPublic ? 'bg-[#00E676]' : 'bg-[#2D3446]'}`} style={{ width: 40, height: 22 }}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-[3px] ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
            <button onClick={handleSave} disabled={saving}
              className="w-full py-2.5 rounded-xl bg-[#00E676] text-[#06090D] font-bold text-[13px] hover:bg-[#00E676]/90 transition disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

          {/* Invite code */}
          <div className="rounded-2xl bg-[#0E1117] border border-[#1E2330] p-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Invite Code</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 font-mono text-[16px] font-bold text-[#00E676] tracking-widest">{inviteCode}</span>
              <CopyButton text={inviteCode} label="Copy" />
              <button onClick={handleRegenCode}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1E2330] text-[#9CA3AF] text-[12px] hover:bg-[#2D3446] transition">
                <RefreshCw size={12} /> New
              </button>
            </div>
          </div>

          {/* Transfer */}
          {nonOwnerMembers.length > 0 && (
            <div className="rounded-2xl bg-[#0E1117] border border-[#1E2330] p-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Transfer Ownership</p>
              <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
                className="w-full bg-[#06090D] border border-[#1E2330] rounded-xl px-3 py-2.5 text-[14px] text-[#E5E7EB] focus:outline-none">
                <option value="">Select member…</option>
                {nonOwnerMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.profile?.name ?? m.user_id}</option>
                ))}
              </select>
              <button onClick={handleTransfer} disabled={!transferTo}
                className="w-full py-2.5 rounded-xl border border-[#F59E0B]/40 text-[#F59E0B] font-bold text-[13px] hover:bg-[#F59E0B]/10 transition disabled:opacity-40">
                Transfer Ownership
              </button>
            </div>
          )}

          {/* Delete */}
          <div className="rounded-2xl bg-red-950/30 border border-red-500/20 p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-400">Danger Zone</p>
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 rounded-xl border border-red-500/40 text-red-400 font-bold text-[13px] hover:bg-red-500/10 transition">
                Delete Group
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-red-300 leading-relaxed">
                    This will delete the group and all messages. <strong>This cannot be undone.</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#1E2330] text-[#9CA3AF] font-semibold text-[13px]">Cancel</button>
                  <button onClick={handleDelete}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-[13px] hover:bg-red-600 transition">
                    Delete Forever
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Leave (non-owner) */}
      {!isOwner && (
        <div className="rounded-2xl bg-[#0E1117] border border-[#1E2330] p-4">
          <button onClick={handleLeave}
            className="w-full py-2.5 rounded-xl border border-red-500/40 text-red-400 font-bold text-[13px] hover:bg-red-500/10 transition">
            Leave Group
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────────

type Tab = 'chat' | 'members' | 'settings';

interface GroupChatViewProps {
  group: Group;
  onBack: () => void;
  onLeave: () => void;
}

export default function GroupChatView({ group: initialGroup, onBack, onLeave }: GroupChatViewProps) {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group>(initialGroup);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [members, setMembers] = useState<GroupMember[]>([]);

  const isOwner = group.created_by === user?.id;

  useEffect(() => {
    fetchGroupMembers(group.id)
      .then(setMembers)
      .catch((e) => console.error('[GroupChatView] members:', e));
  }, [group.id]);

  const handleGroupUpdated = (fields: Partial<Group>) => setGroup((p) => ({ ...p, ...fields }));

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={13} /> },
    { id: 'members', label: 'Members', icon: <Users size={13} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={13} /> },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#06090D]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#06090D]/95 backdrop-blur border-b border-[#1E2330] px-4 pt-4 pb-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1E2330] transition">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold text-[#E5E7EB] truncate">{group.name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-[#6B7280]">{group.member_count ?? 0} members</span>
              <span className="text-[#2D3446]">·</span>
              <CopyButton text={group.invite_code} label={group.invite_code} />
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 flex-1 justify-center pb-2.5 text-[13px] font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-[#00E676] border-[#00E676]'
                  : 'text-[#6B7280] border-transparent hover:text-[#9CA3AF]'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'chat' && <ChatTab group={group} />}
        {activeTab === 'members' && (
          <MembersTab
            group={group}
            isOwner={isOwner}
            onRefreshMembers={() => fetchGroupMembers(group.id).then(setMembers).catch(console.error)}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            group={group}
            members={members}
            isOwner={isOwner}
            onGroupUpdated={handleGroupUpdated}
            onGroupDeleted={onLeave}
            onLeft={onLeave}
          />
        )}
      </div>
    </div>
  );
}

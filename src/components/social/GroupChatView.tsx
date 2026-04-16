// src/components/social/GroupChatView.tsx — WhatsApp-quality group chat
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Mic, Reply, Copy, Trash2, X,
  MoreVertical, Phone, Video, Info, Users, Crown, Shield,
  User as UserIcon, RefreshCw, Globe, Lock, AlertTriangle,
  Check, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { Group, GroupMember } from '@/types/social';
import {
  fetchGroupMessages, sendGroupMessage, fetchGroupMembers,
  updateGroup, regenerateInviteCode, transferOwnership,
  removeMemberFromGroup, deleteGroup, leaveGroup as svcLeaveGroup,
  type GroupMessageRow,
} from '@/services/socialService';
import Avatar from '@/components/shared/Avatar';

const ACCENT = '#00E676';

// ─── Time helpers ─────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function fmtDateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}
function sameDay(a: string, b: string) { return new Date(a).toDateString() === new Date(b).toDateString(); }
function withinGroup(a: GroupMessageRow, b: GroupMessageRow) {
  if (a.sender_id !== b.sender_id) return false;
  return Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < 2 * 60 * 1000;
}

// ─── Context menu ─────────────────────────────────────────────────────────────
interface MenuItem { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }
function CtxMenu({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  useEffect(() => {
    const h = () => onClose();
    const t = setTimeout(() => document.addEventListener('mousedown', h), 10);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h); };
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-50 rounded-[14px] overflow-hidden shadow-2xl py-1 min-w-[170px]"
      style={{ background: '#1C1C20', border: '1px solid rgba(255,255,255,0.1)', bottom: '100%', marginBottom: 8, right: 0 }}
    >
      {items.map((item, i) => (
        <button key={i} onClick={() => { item.onClick(); onClose(); }}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] font-medium hover:bg-white/5"
          style={{ color: item.danger ? '#EF4444' : '#FAFAFA' }}>
          {item.icon}{item.label}
        </button>
      ))}
    </motion.div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function GroupBubble({
  msg, isMine, isFirst, isLast, onReply,
}: {
  msg: GroupMessageRow; isMine: boolean; isFirst: boolean; isLast: boolean; onReply: (m: GroupMessageRow) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDeleted = msg.is_deleted;
  const name = msg.sender_profile?.name ?? 'Unknown';
  const myBR = { borderRadius: '18px', borderTopRightRadius: isFirst ? '18px' : '6px', borderBottomRightRadius: isLast ? '4px' : '6px' };
  const theirBR = { borderRadius: '18px', borderTopLeftRadius: isFirst ? '18px' : '6px', borderBottomLeftRadius: isLast ? '4px' : '6px' };

  const menuItems: MenuItem[] = [
    { icon: <Reply size={15} />, label: 'Reply', onClick: () => onReply(msg) },
    !isDeleted && { icon: <Copy size={15} />, label: 'Copy', onClick: () => { navigator.clipboard.writeText(msg.content); toast.success('Copied'); } },
  ].filter(Boolean) as MenuItem[];

  return (
    <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar (theirs only, last in group) */}
      {!isMine && (
        isLast
          ? <Avatar src={msg.sender_profile?.avatar_url} name={name} size={26} className="mb-0.5 flex-shrink-0" />
          : <div style={{ width: 26, flexShrink: 0 }} />
      )}

      <div className="relative max-w-[75%] group">
        {/* Sender name (first in group, not mine) */}
        {!isMine && isFirst && (
          <p className="text-[11px] font-bold mb-1 px-1" style={{ color: ACCENT }}>{name}</p>
        )}

        <div
          className="px-3.5 py-2.5 cursor-pointer select-none"
          style={{
            ...(isMine ? myBR : theirBR),
            background: isDeleted ? 'rgba(255,255,255,0.05)' : isMine ? 'rgba(0,230,118,0.15)' : '#1C1C22',
          }}
          onMouseDown={() => { holdRef.current = setTimeout(() => setMenuOpen(true), 500); }}
          onMouseUp={() => { if (holdRef.current) clearTimeout(holdRef.current); }}
          onMouseLeave={() => { if (holdRef.current) clearTimeout(holdRef.current); }}
          onTouchStart={() => { holdRef.current = setTimeout(() => setMenuOpen(true), 500); }}
          onTouchEnd={() => { if (holdRef.current) clearTimeout(holdRef.current); }}
        >
          <p
            className="text-[15px] leading-snug whitespace-pre-wrap break-words"
            style={{ color: isDeleted ? 'rgba(255,255,255,0.3)' : '#FAFAFA', fontStyle: isDeleted ? 'italic' : undefined }}
          >
            {isDeleted ? 'This message was deleted' : msg.content}
          </p>
          {isLast && (
            <p className={`text-[10px] mt-1 ${isMine ? 'text-right' : 'text-left'}`} style={{ color: 'rgba(255,255,255,0.3)' }}>
              {fmtTime(msg.created_at)}
            </p>
          )}
        </div>

        {/* Hover menu */}
        {!isDeleted && (
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
            className={`absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full ${isMine ? 'left-[-28px]' : 'right-[-28px]'}`}
            style={{ background: '#1C1C22', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <MoreVertical size={13} className="text-white/40" />
          </button>
        )}
        <AnimatePresence>
          {menuOpen && <CtxMenu items={menuItems} onClose={() => setMenuOpen(false)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Chat panel ───────────────────────────────────────────────────────────────
function ChatPanel({ group }: { group: Group }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupMessageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<GroupMessageRow | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loadRef = useRef<(() => Promise<void>) | null>(null);
  const isFirstLoad = useRef(true);

  const load = useCallback(async () => {
    try {
      const msgs = await fetchGroupMessages(group.id);
      setMessages(msgs);
    } catch { toast.error('Could not load messages'); }
    finally { setIsLoading(false); }
  }, [group.id]);

  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { load(); }, [load]);

  useLayoutEffect(() => {
    if (messages.length === 0) return;
    if (isFirstLoad.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      isFirstLoad.current = false;
      return;
    }
    const el = listRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    if (!user) return;
    const uid = Math.random().toString(36).slice(2, 7);
    const channel = supabase
      .channel(`grp-${group.id}-${uid}`)
      .on('postgres_changes' as never, { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${group.id}` }, () => loadRef.current?.())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [group.id, user]);

  const handleSend = async () => {
    if (!user || !text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    const opt: GroupMessageRow = { id: `opt-${Date.now()}`, group_id: group.id, sender_id: user.id, content, is_deleted: false, created_at: new Date().toISOString() };
    setMessages((p) => [...p, opt]);
    try { await sendGroupMessage(group.id, user.id, content); await load(); setReplyTo(null); }
    catch { toast.error('Failed to send'); setMessages((p) => p.filter((m) => m.id !== opt.id)); setText(content); }
    finally { setSending(false); }
    inputRef.current?.focus();
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-t-[#00E676] border-[#00E676]/20 rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={listRef} onScroll={() => { const el = listRef.current; if (el) setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 180); }} className="flex-1 overflow-y-auto px-4 py-3 space-y-[2px]" style={{ background: '#0A0A0D' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <p className="text-4xl">💬</p>
            <p className="text-[14px] text-white/40">Say hello to the group!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const showDate = !prev || !sameDay(prev.created_at, msg.created_at);
          const isMine = msg.sender_id === user?.id;
          const isFirst = !prev || !withinGroup(prev, msg);
          const isLast = !next || !withinGroup(msg, next);
          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-4">
                  <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                    {fmtDateLabel(msg.created_at)}
                  </span>
                </div>
              )}
              <div className={isFirst && i > 0 ? 'mt-3' : 'mt-0.5'}>
                <GroupBubble msg={msg} isMine={isMine} isFirst={isFirst} isLast={isLast} onReply={setReplyTo} />
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Scroll FAB */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute right-4 bottom-[80px] w-10 h-10 rounded-full shadow-xl flex items-center justify-center z-10"
            style={{ background: '#1C1C22', border: '1px solid rgba(255,255,255,0.1)' }}>
            <ChevronDown size={18} className="text-white/50" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Reply bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
            <div className="flex items-center gap-3 px-4 py-2" style={{ background: 'rgba(0,230,118,0.06)', borderTop: '1px solid rgba(0,230,118,0.12)' }}>
              <div className="w-0.5 self-stretch rounded-full" style={{ background: ACCENT }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold" style={{ color: ACCENT }}>{replyTo.sender_profile?.name ?? 'Them'}</p>
                <p className="text-[13px] text-white/50 truncate">{replyTo.content}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1 text-white/30 hover:text-white/60"><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex items-end gap-2 px-3 py-2.5" style={{ background: '#111116', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <div className="flex-1 flex items-end rounded-3xl overflow-hidden" style={{ background: '#1C1C22', border: '1px solid rgba(255,255,255,0.08)' }}>
          <textarea ref={inputRef} value={text} onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px'; }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message..." rows={1}
            className="flex-1 bg-transparent px-4 py-2.5 text-[15px] text-white placeholder:text-white/25 outline-none leading-snug resize-none"
            style={{ maxHeight: 110, minHeight: 40 }} />
        </div>
        <motion.button whileTap={{ scale: 0.88 }} onClick={text.trim() ? handleSend : undefined} disabled={sending}
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50"
          style={{ background: text.trim() ? ACCENT : 'rgba(255,255,255,0.07)' }}>
          {text.trim() ? <Send size={17} style={{ color: '#06090D' }} /> : <Mic size={17} className="text-white/40" />}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Group Info panel ─────────────────────────────────────────────────────────
function GroupInfoPanel({
  group, members, isOwner,
  onGroupUpdated, onGroupDeleted, onLeft, onClose,
}: {
  group: Group; members: GroupMember[]; isOwner: boolean;
  onGroupUpdated: (f: Partial<Group>) => void; onGroupDeleted: () => void; onLeft: () => void; onClose: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [isPublic, setIsPublic] = useState(group.is_public);
  const [inviteCode, setInviteCode] = useState(group.invite_code);
  const [saving, setSaving] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      await updateGroup(group.id, { name: name.trim(), description: description.trim(), is_public: isPublic });
      onGroupUpdated({ name: name.trim(), description: description.trim(), is_public: isPublic });
      toast.success('Group updated');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const roleIcon = (role: GroupMember['role']) =>
    role === 'owner' ? <Crown size={11} className="text-yellow-400" /> :
    role === 'admin' ? <Shield size={11} className="text-blue-400" /> :
    <UserIcon size={11} className="text-white/30" />;

  const nonOwners = members.filter((m) => m.role !== 'owner' && m.user_id !== user?.id);

  return (
    <div className="flex flex-col h-full bg-[#0A0A0D]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0" style={{ background: '#111116', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onClose} className="p-2 -ml-2 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <p className="text-[17px] font-bold text-white flex-1">Group Info</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="flex flex-col items-center py-6 px-4">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(0,230,118,0.12)', border: '2px solid rgba(0,230,118,0.2)' }}>
            {group.avatar_url
              ? <Avatar src={group.avatar_url} name={group.name} size={96} />
              : <Users size={36} className="text-[#00E676]" />
            }
          </div>
          <p className="text-[22px] font-bold text-white">{group.name}</p>
          <p className="text-[14px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Group · {members.length} members
          </p>
          {group.description && (
            <p className="text-[13px] text-center mt-2 max-w-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{group.description}</p>
          )}
        </div>

        {/* Invite code */}
        <div className="mx-4 mb-3 rounded-[16px] p-4 space-y-2" style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Invite Code</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[20px] font-bold tracking-widest flex-1" style={{ color: ACCENT }}>{inviteCode}</span>
            <button onClick={() => { navigator.clipboard.writeText(inviteCode); toast.success('Copied'); }}
              className="p-2 rounded-full hover:bg-white/5 transition-colors" title="Copy">
              <Copy size={16} className="text-white/40" />
            </button>
            {isOwner && (
              <button onClick={async () => { try { const c = await regenerateInviteCode(group.id); setInviteCode(c); onGroupUpdated({ invite_code: c }); toast.success('New code generated'); } catch { toast.error('Failed'); } }}
                className="p-2 rounded-full hover:bg-white/5 transition-colors" title="Regenerate">
                <RefreshCw size={16} className="text-white/40" />
              </button>
            )}
          </div>
        </div>

        {/* Members list */}
        <div className="mx-4 mb-3 rounded-[16px] overflow-hidden" style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[14px] font-bold text-white">{members.length} Members</p>
          </div>
          {members.map((member, i) => {
            const p = member.profile;
            const mName = p?.name ?? 'Unknown';
            const isMe = member.user_id === user?.id;
            return (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                <Avatar src={p?.avatar_url} name={mName} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[14px] font-semibold text-white truncate">{mName}</p>
                    {isMe && <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>You</span>}
                  </div>
                  {p?.username && <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>@{p.username}</p>}
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold capitalize"
                  style={{
                    background: member.role === 'owner' ? 'rgba(255,215,0,0.12)' : member.role === 'admin' ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.06)',
                    color: member.role === 'owner' ? '#FFD700' : member.role === 'admin' ? '#38BDF8' : 'rgba(255,255,255,0.3)',
                  }}>
                  {roleIcon(member.role)} {member.role}
                </div>
                {isOwner && !isMe && member.role !== 'owner' && (
                  <button onClick={async () => {
                    if (!window.confirm(`Remove ${mName}?`)) return;
                    try { await removeMemberFromGroup(group.id, member.user_id); toast.success('Removed'); onGroupUpdated({}); }
                    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
                  }} className="p-1.5 rounded-full text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Owner settings */}
        {isOwner && (
          <div className="mx-4 mb-3 rounded-[16px] p-4 space-y-3" style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Edit Group</p>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="Group name"
              className="w-full bg-transparent rounded-xl px-3 py-2.5 text-[14px] text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={200} placeholder="Description (optional)"
              className="w-full rounded-xl px-3 py-2.5 text-[14px] text-white outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
            <button onClick={() => setIsPublic((p) => !p)} className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {isPublic ? <Globe size={14} className="text-[#00E676]" /> : <Lock size={14} className="text-yellow-400" />}
              <span className="flex-1 text-left text-[13px] text-white">{isPublic ? 'Public' : 'Private'}</span>
              <div className="w-10 h-5 rounded-full transition-colors relative" style={{ background: isPublic ? ACCENT : 'rgba(255,255,255,0.15)' }}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
            <button onClick={handleSave} disabled={saving}
              className="w-full py-2.5 rounded-xl font-bold text-[13px] transition-colors disabled:opacity-50"
              style={{ background: ACCENT, color: '#06090D' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Transfer ownership */}
        {isOwner && nonOwners.length > 0 && (
          <div className="mx-4 mb-3 rounded-[16px] p-4 space-y-3" style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Transfer Ownership</p>
            <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-[14px] text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <option value="">Select member…</option>
              {nonOwners.map((m) => <option key={m.user_id} value={m.user_id}>{m.profile?.name ?? m.user_id}</option>)}
            </select>
            <button onClick={async () => {
              if (!transferTo || !user || !window.confirm('Transfer ownership?')) return;
              try { await transferOwnership(group.id, user.id, transferTo); toast.success('Ownership transferred'); onLeft(); }
              catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
            }} disabled={!transferTo}
              className="w-full py-2.5 rounded-xl font-bold text-[13px] disabled:opacity-40 transition-colors"
              style={{ border: '1px solid rgba(245,158,11,0.4)', color: '#F59E0B' }}>
              Transfer Ownership
            </button>
          </div>
        )}

        {/* Danger zone */}
        <div className="mx-4 mb-8 rounded-[16px] p-4 space-y-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          {isOwner ? (
            !showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-2.5 rounded-xl font-bold text-[13px] text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
                Delete Group
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10">
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-red-300 leading-relaxed">This will permanently delete the group and all messages.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
                  <button onClick={async () => { try { await deleteGroup(group.id); toast.success('Group deleted'); onGroupDeleted(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } }}
                    className="flex-1 py-2.5 rounded-xl font-bold text-[13px] bg-red-500 text-white hover:bg-red-600 transition-colors">
                    Delete Forever
                  </button>
                </div>
              </div>
            )
          ) : (
            <button onClick={async () => {
              if (!user || !window.confirm('Leave this group?')) return;
              try { await svcLeaveGroup(user.id, group.id); toast.success('Left group'); onLeft(); }
              catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
            }} className="w-full py-2.5 rounded-xl font-bold text-[13px] text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
              Leave Group
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface GroupChatViewProps { group: Group; onBack: () => void; onLeave: () => void; }

export default function GroupChatView({ group: initialGroup, onBack, onLeave }: GroupChatViewProps) {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group>(initialGroup);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const isOwner = group.created_by === user?.id;

  useEffect(() => {
    fetchGroupMembers(group.id).then(setMembers).catch(console.error);
  }, [group.id]);

  const handleGroupUpdated = (fields: Partial<Group>) => {
    setGroup((p) => ({ ...p, ...fields }));
    // Refresh members if needed
    fetchGroupMembers(group.id).then(setMembers).catch(console.error);
  };

  if (showInfo) {
    return (
      <GroupInfoPanel
        group={group} members={members} isOwner={isOwner}
        onGroupUpdated={handleGroupUpdated}
        onGroupDeleted={onLeave}
        onLeft={onLeave}
        onClose={() => setShowInfo(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0D]">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 sticky top-0 z-20 flex-shrink-0" style={{ background: '#111116', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onBack} className="p-2 rounded-full text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors flex-shrink-0">
          <ArrowLeft size={22} />
        </button>

        <button onClick={() => setShowInfo(true)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,230,118,0.12)' }}>
            {group.avatar_url ? <Avatar src={group.avatar_url} name={group.name} size={36} /> : <Users size={16} className="text-[#00E676]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold text-white truncate leading-tight">{group.name}</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{group.member_count ?? members.length} members</p>
          </div>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button className="p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"><Video size={20} /></button>
          <button onClick={() => setShowInfo(true)} className="p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"><Info size={20} /></button>
        </div>
      </div>

      {/* Chat */}
      <ChatPanel group={group} />
    </div>
  );
}

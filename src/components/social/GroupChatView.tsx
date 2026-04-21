// src/components/social/GroupChatView.tsx — WhatsApp-quality group chat (Kinetic Pulse)
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pin, Users, X, Info, ChevronDown, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useGroupChat } from '@/hooks/useGroupChat';
import { useGroups } from '@/hooks/useGroups';
import Avatar from '@/components/shared/Avatar';
import ChatBubble from './ChatBubble';
import type { BubbleMessage } from './ChatBubble';
import ChatInput from './ChatInput';
import type { Reaction } from './MessageReactions';
import { ReactionPicker } from './MessageReactions';
import type { Group, GroupMessage } from '@/types/social';
import { supabase } from '@/integrations/supabase/client';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT     = '#0CFF9C';
const BG         = '#0C1015';
const SURFACE    = '#141A1F';
const SURFACE_UP = '#1C2429';
const T1         = '#EAEEF2';
const T2         = '#8899AA';
const T3         = '#4A5568';

// ─── Props ─────────────────────────────────────────────────────────────────────
interface GroupChatViewProps {
  group: Group;
  onBack: () => void;
  onLeave?: () => void;
  /** @deprecated use onBack */
  onClose?: () => void;
}

// ─── Workout share card ────────────────────────────────────────────────────────
function ShareCard({ type, meta }: { type: 'workout_share' | 'calorie_share'; meta: Record<string, unknown> }) {
  const isWorkout = type === 'workout_share';
  const accent  = isWorkout ? '#31A24C' : '#F7B928';
  const bg      = isWorkout ? 'rgba(49,162,76,0.12)' : 'rgba(247,185,40,0.12)';
  const border  = isWorkout ? 'rgba(49,162,76,0.3)'  : 'rgba(247,185,40,0.3)';

  const wStats = isWorkout
    ? [
        [meta.name as string ?? 'Workout',       'Name'],
        [(meta.duration_min as string ?? '—') + ' min', 'Duration'],
        [(meta.calories as string ?? '—') + ' kcal',    'Burned'],
      ]
    : [
        [(meta.calories as string ?? '—'), 'kcal'],
        [(meta.protein as string ?? '—') + 'g', 'Protein'],
        [(meta.carbs as string ?? '—') + 'g',   'Carbs'],
      ];

  return (
    <div style={{ background: bg, borderRadius: 16, border: `1px solid ${border}`, padding: '12px 14px', maxWidth: '85%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
          {isWorkout ? '🏋️' : '🔥'}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {isWorkout ? 'Workout Shared' : 'Calories Log'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {wStats.map(([v, l], i) => (
          <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#E4E6EA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
            <div style={{ fontSize: 9, fontWeight: 500, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.3 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function withinGroup(a: GroupMessage, b: GroupMessage) {
  if (a.user_id !== b.user_id) return false;
  return Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < 2 * 60 * 1000;
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function fmtDateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'TODAY';
  if (d.toDateString() === yest.toDateString()) return 'YESTERDAY';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

function toBubble(m: GroupMessage): BubbleMessage {
  return {
    id: m.id,
    content: m.message,
    message_type: (m as any).message_type ?? 'text',
    metadata: (m as any).metadata ?? {},
    created_at: m.created_at,
    sender_id: m.user_id,
    sender_profile: m.user_profile
      ? {
          user_id: m.user_profile.user_id,
          name: m.user_profile.name,
          avatar_url: m.user_profile.avatar_url,
        }
      : undefined,
  };
}

// ─── Date separator ────────────────────────────────────────────────────────────
function DateSeparator({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '12px 0',
      }}
    >
      <span
        style={{
          background: SURFACE_UP,
          color: T3,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          padding: '4px 12px',
          borderRadius: 20,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Group Info Panel ──────────────────────────────────────────────────────────
interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    user_id: string;
    name: string;
    avatar_url: string | null;
    username?: string | null;
  };
}

function GroupInfoPanel({
  group,
  onClose,
}: {
  group: Group;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [copied, setCopied] = useState(false);
  const db = (table: string) => (supabase.from(table as never) as any);

  useEffect(() => {
    (async () => {
      const { data: rows } = await db('group_members')
        .select('id,user_id,role,joined_at')
        .eq('group_id', group.id);

      if (!rows || rows.length === 0) return;

      const ids = rows.map((r: any) => r.user_id);
      const { data: profiles } = await db('user_profiles')
        .select('user_id,name,avatar_url,username')
        .in('user_id', ids);

      const profileMap = new Map<string, any>();
      for (const p of profiles ?? []) profileMap.set(p.user_id, p);

      setMembers(
        rows.map((r: any) => ({
          ...r,
          profile: profileMap.get(r.user_id),
        }))
      );
    })();
  }, [group.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(group.invite_code ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: BG,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 16px',
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          background: SURFACE,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 700, color: T1 }}>Group Info</span>
        <button
          onClick={onClose}
          style={{
            background: SURFACE_UP,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={16} color={T2} />
        </button>
      </div>

      {/* Group avatar + name */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '28px 16px 20px',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            background: SURFACE_UP,
            border: `1px solid rgba(12,255,156,0.2)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {group.avatar_url ? (
            <Avatar src={group.avatar_url} name={group.name} size={80} />
          ) : (
            <Users size={32} color={ACCENT} />
          )}
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: T1 }}>{group.name}</span>
        <span style={{ fontSize: 13, color: T3 }}>{members.length} members</span>
      </div>

      {/* Invite code */}
      <div
        style={{
          margin: '0 16px 12px',
          background: SURFACE,
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14,
          padding: '12px 16px',
        }}
      >
        <span style={{ fontSize: 11, color: T3, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Invite Code
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <span
            style={{
              flex: 1,
              fontFamily: 'monospace',
              fontSize: 16,
              fontWeight: 700,
              color: T1,
              letterSpacing: '0.12em',
            }}
          >
            {group.invite_code ?? '—'}
          </span>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleCopy}
            style={{
              background: copied ? `rgba(12,255,156,0.12)` : SURFACE_UP,
              border: `1px solid ${copied ? 'rgba(12,255,156,0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 8,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              color: copied ? ACCENT : T2,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </motion.button>
        </div>
      </div>

      {/* Members */}
      <div
        style={{
          margin: '0 16px 24px',
          background: SURFACE,
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: T1 }}>Members</span>
        </div>
        {members.map((m, i) => {
          const name = m.profile?.name ?? 'Unknown';
          const isOwner = m.role === 'owner';
          const isAdmin = m.role === 'admin';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
              }}
            >
              <Avatar src={m.profile?.avatar_url ?? undefined} name={name} size={36} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: T1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </span>
              {(isOwner || isAdmin) && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '2px 7px',
                    borderRadius: 20,
                    background: isOwner ? 'rgba(255,215,0,0.12)' : 'rgba(56,189,248,0.12)',
                    color: isOwner ? '#FFD700' : '#38BDF8',
                    flexShrink: 0,
                  }}
                >
                  {isOwner ? 'OWNER' : 'ADMIN'}
                </span>
              )}
            </div>
          );
        })}
        {members.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', color: T3, fontSize: 13 }}>
            Loading members…
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function GroupChatView({ group, onBack, onClose, onLeave }: GroupChatViewProps) {
  const handleBack = onBack ?? onClose ?? (() => {});
  // allow useNavigate to not throw if router context is absent (it may already be in one)
  let navigate: ReturnType<typeof useNavigate> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigate = useNavigate();
  } catch {
    navigate = null;
  }

  const { user } = useAuth();
  const { messages, isLoading, sendMessage, sendShare } = useGroupChat(group.id);
  const { myGroups } = useGroups();

  // ── State ──────────────────────────────────────────────────────────────────
  const [text, setText] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<(GroupMessage & { user_profile?: any }) | null>(null);
  const [showPinned, setShowPinned] = useState(true);
  const [replyTo, setReplyTo] = useState<BubbleMessage | null>(null);
  const [contextMsg, setContextMsg] = useState<{ msg: BubbleMessage; rect: DOMRect } | null>(null);
  const [showScrollFab, setShowScrollFab] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // ── Fetch pinned message on mount ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from('group_messages' as never) as any)
        .select('id,group_id,user_id,message,created_at,is_pinned,pinned_at')
        .eq('group_id', group.id)
        .eq('is_pinned', true)
        .maybeSingle();
      if (data) setPinnedMessage(data as GroupMessage);
    })();
  }, [group.id]);

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    const el = listRef.current;
    if (isFirstLoad.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      isFirstLoad.current = false;
      return;
    }
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // ── Scroll FAB visibility ─────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setShowScrollFab(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  }, []);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');
    try {
      await sendMessage(content);
      setReplyTo(null);
    } catch {
      setText(content);
    }
  }, [text, sendMessage]);

  // ── Context menu: close on backdrop click ─────────────────────────────────
  const closeContext = useCallback(() => setContextMsg(null), []);

  // ── Member avatars for header stack ───────────────────────────────────────
  const currentGroup = myGroups.find((g) => g.id === group.id) ?? group;

  // We'll fetch members for the avatar stack separately (lightweight)
  const [stackMembers, setStackMembers] = useState<Array<{ user_id: string; avatar_url: string | null; name: string }>>([]);
  useEffect(() => {
    (async () => {
      const db = (t: string) => (supabase.from(t as never) as any);
      const { data: rows } = await db('group_members')
        .select('user_id')
        .eq('group_id', group.id)
        .limit(5);
      if (!rows || rows.length === 0) return;
      const ids = rows.map((r: any) => r.user_id);
      const { data: profiles } = await db('user_profiles')
        .select('user_id,name,avatar_url')
        .in('user_id', ids);
      setStackMembers((profiles ?? []).slice(0, 3));
    })();
  }, [group.id]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: BG,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(12,16,21,0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '12px 16px',
          paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Back */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleBack}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px 4px 0', color: T2, flexShrink: 0 }}
        >
          <ArrowLeft size={20} color={T2} />
          <span style={{ fontSize: 13, color: T2, fontWeight: 500 }}>Back</span>
        </motion.button>

        {/* Center — group avatar + name */}
        <button
          onClick={() => setShowInfo(true)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: SURFACE_UP,
              border: '1px solid rgba(12,255,156,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {group.avatar_url ? (
              <Avatar src={group.avatar_url} name={group.name} size={36} />
            ) : (
              <Users size={18} color={ACCENT} />
            )}
          </div>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: T1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {group.name}
          </span>
        </button>

        {/* Right side: avatar stack + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Avatar stack */}
          {stackMembers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {stackMembers.map((m, i) => (
                <div
                  key={m.user_id}
                  style={{
                    marginLeft: i === 0 ? 0 : -6,
                    zIndex: stackMembers.length - i,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: '1.5px solid rgba(12,16,21,0.95)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <Avatar src={m.avatar_url ?? undefined} name={m.name} size={22} />
                </div>
              ))}
            </div>
          )}
          {/* Info button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShowInfo(true)}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: SURFACE_UP,
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Info size={16} color={T2} />
          </motion.button>
        </div>
      </div>

      {/* ── MEMBER AVATAR ROW ──────────────────────────────────────────────── */}
      <div style={{ background: SURFACE, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '8px 16px 10px', display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {stackMembers.map((m, i) => (
          <div key={m.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Avatar src={m.avatar_url ?? undefined} name={m.name} size={32} />
              {i < 2 && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: ACCENT, border: '1.5px solid #141A1F' }} />}
            </div>
            <span style={{ fontSize: 9, fontWeight: 500, color: T2, maxWidth: 36, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name.split(' ')[0]}</span>
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, cursor: 'pointer' }} onClick={() => setShowInfo(true)}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1.5px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <span style={{ fontSize: 9, fontWeight: 500, color: T3 }}>Add</span>
        </div>
      </div>

      {/* ── STATS RIBBON ──────────────────────────────────────────────────────── */}
      <div style={{ background: 'rgba(10,14,18,0.8)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center' }}>
        {[
          { icon: '🏋️', label: 'Workouts', val: String(group.workouts_count ?? '—') },
          { icon: '👥', label: 'Members',  val: String((group.member_count ?? stackMembers.length) || '—') },
          { icon: '🔥', label: 'Streak',   val: group.streak_days ? `${group.streak_days}d` : '—' },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '8px 6px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
              <span style={{ fontSize: 11 }}>{s.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: T1 }}>{s.val}</span>
            </div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: T3, textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── PINNED CHALLENGE CARD ────────────────────────────────────────────── */}
      <AnimatePresence>
        {pinnedMessage && showPinned && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              margin: '8px 16px',
              background: 'rgba(12,255,156,0.06)',
              border: '1px solid rgba(12,255,156,0.15)',
              borderRadius: 12,
              padding: '10px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Pin size={14} color={ACCENT} />
              <span
                style={{
                  flex: 1,
                  fontSize: 10,
                  fontWeight: 700,
                  color: ACCENT,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Pinned Message
              </span>
              <button
                onClick={() => setShowPinned(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} color={T3} />
              </button>
            </div>
            <p
              style={{
                marginTop: 4,
                fontSize: 13,
                color: T1,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {pinnedMessage.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MESSAGE LIST ─────────────────────────────────────────────────────── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 0 8px',
          position: 'relative',
        }}
      >
        {isLoading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px 0',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: `2px solid ${ACCENT}`,
                borderTopColor: 'transparent',
                animation: 'spin 0.75s linear infinite',
              }}
            />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 24px',
              gap: 8,
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 40 }}>💬</span>
            <span style={{ fontSize: 14, color: T3 }}>Be the first to say hello!</span>
          </div>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const showDate = !prev || !sameDay(prev.created_at, msg.created_at);
          const isMine = msg.user_id === user?.id;
          const isFirst = !prev || !withinGroup(prev, msg);
          const isLast = !next || !withinGroup(msg, next);
          const bubble = toBubble(msg);

          const isShareCard = msg.message_type === 'workout_share' || msg.message_type === 'calorie_share';

          return (
            <div key={msg.id}>
              {showDate && <DateSeparator label={fmtDateLabel(msg.created_at)} />}
              {isShareCard ? (
                <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', padding: '4px 16px' }}>
                  <ShareCard type={msg.message_type as 'workout_share' | 'calorie_share'} meta={msg.metadata} />
                </div>
              ) : (
                <ChatBubble
                  msg={bubble}
                  isMine={isMine}
                  isFirst={isFirst}
                  isLast={isLast}
                  showSenderName={true}
                  onLongPress={(m, rect) => setContextMsg({ msg: m, rect })}
                  onReplyTo={(m) => setReplyTo(m)}
                />
              )}
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── SCROLL FAB ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScrollFab && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              position: 'fixed',
              right: 16,
              bottom: 90,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: SURFACE_UP,
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 25,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <ChevronDown size={18} color={T2} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── REPLY BAR ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                background: SURFACE,
                borderLeft: `3px solid ${ACCENT}`,
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, marginBottom: 2 }}>
                  {replyTo.sender_profile?.name ?? 'Someone'}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: T2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {replyTo.content}
                </div>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} color={T3} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONTEXT MENU ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {contextMsg && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeContext}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 40,
                background: 'rgba(0,0,0,0.5)',
              }}
            />
            {/* Picker + actions */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 12 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'fixed',
                zIndex: 41,
                bottom: '50%',
                left: '50%',
                transform: 'translateX(-50%) translateY(50%)',
                background: SURFACE_UP,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                minWidth: 220,
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}
            >
              {/* Reaction picker */}
              <ReactionPicker
                onPick={(r: Reaction) => {
                  // Reactions are cosmetic here — close menu after pick
                  closeContext();
                }}
              />
              {/* Actions */}
              <div
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  paddingTop: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <button
                  onClick={() => {
                    setReplyTo(contextMsg.msg);
                    closeContext();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    color: T1,
                    fontSize: 14,
                    fontWeight: 500,
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <ChevronDown size={15} color={T2} style={{ transform: 'rotate(180deg)' }} />
                  Reply
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(contextMsg.msg.content);
                    closeContext();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    color: T1,
                    fontSize: 14,
                    fontWeight: 500,
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <Copy size={15} color={T2} />
                  Copy
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── SHARE STRIP ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, padding: '6px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
        {[
          { label: 'Workout',   icon: '🏋️', onClick: () => sendShare?.('workout_share', { name: 'Today\'s Workout', duration_min: '—', calories: '—' }, 'Shared a workout') },
          { label: 'Calories',  icon: '🔥', onClick: () => sendShare?.('calorie_share', { calories: '—', protein: '—', carbs: '—' }, 'Shared calories') },
          { label: 'Challenge', icon: '🏆', onClick: () => {} },
          { label: 'Photo',     icon: '📸', onClick: () => {} },
        ].map((s, i) => (
          <button key={i} onClick={s.onClick} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: T2, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 13 }}>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* ── CHAT INPUT ───────────────────────────────────────────────────────── */}
      <ChatInput
        value={text}
        onChange={setText}
        onSend={handleSend}
        placeholder="Message group…"
      />

      {/* ── GROUP INFO PANEL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showInfo && (
          <GroupInfoPanel group={group} onClose={() => setShowInfo(false)} />
        )}
      </AnimatePresence>

      {/* Spin animation for loading spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

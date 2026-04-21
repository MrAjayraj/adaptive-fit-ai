// src/components/social/GroupsView.tsx — Social v2 (Meta DS)
import { useState, useEffect, useCallback } from 'react';
import { useGroups } from '@/hooks/useGroups';
import type { Group, GroupMember } from '@/types/social';
import { toast } from 'sonner';
import GroupChatView from './GroupChatView';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG      = '#111213';
const SURF    = '#1C1E21';
const SURF2   = '#242628';
const BORDER  = 'rgba(255,255,255,0.08)';
const BLUE    = '#0064E0';
const BLUEL   = '#47A5FA';
const GREEN   = '#31A24C';
const T1      = '#E4E6EA';
const T2      = '#B0B3B8';
const TMUT    = '#65676B';

// Deterministic colour per group name
const GROUP_COLORS = ['#E8613C','#0064E0','#31A24C','#A121CE','#F7B928','#2ABBA7','#FB724B'];
function groupColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + (h << 5) - h;
  return GROUP_COLORS[Math.abs(h) % GROUP_COLORS.length];
}

// ── Avatar stack ───────────────────────────────────────────────────────────────
function AvatarStack({ members, size = 22, max = 3 }: { members: GroupMember[]; size?: number; max?: number }) {
  const shown = members.slice(0, max);
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((m, i) => {
        const name = m.profile?.name ?? '?';
        const bg = groupColor(name);
        return (
          <div key={m.id} style={{
            width: size, height: size, borderRadius: '50%',
            background: bg, border: `2px solid ${SURF}`,
            marginLeft: i > 0 ? -size * 0.35 : 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.4, fontWeight: 700, color: '#fff',
            zIndex: shown.length - i, position: 'relative', flexShrink: 0,
          }}>
            {name[0]?.toUpperCase()}
          </div>
        );
      })}
      {members.length > max && (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)', border: `2px solid ${SURF}`,
          marginLeft: -size * 0.35,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.38, fontWeight: 600, color: T2, zIndex: 0, flexShrink: 0,
        }}>
          +{members.length - max}
        </div>
      )}
    </div>
  );
}

// ── Rich Group Card ────────────────────────────────────────────────────────────
function RichGroupCard({ group, members, onClick }: { group: Group; members: GroupMember[]; onClick: () => void }) {
  const color    = groupColor(group.name);
  const streak   = group.streak_days ?? 0;
  const workouts = group.workouts_count ?? 0;
  const mc       = group.member_count ?? members.length;

  return (
    <div
      onClick={onClick}
      style={{ background: SURF, borderRadius: 20, border: `1px solid ${BORDER}`, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
    >
      {/* Gradient banner */}
      <div style={{ height: 56, position: 'relative', background: `linear-gradient(135deg, ${color}cc, ${color}44)`, overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }} viewBox="0 0 300 56" preserveAspectRatio="xMidYMid slice">
          {[0,1,2,3,4,5].map(i => <circle key={i} cx={i*60} cy={28} r={30+i*10} fill="none" stroke="white" strokeWidth="1.5" />)}
        </svg>
        {streak > 0 && (
          <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '4px 10px' }}>
            <span style={{ fontSize: 12 }}>🔥</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{streak}d streak</span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: -18, left: 16, width: 44, height: 44, borderRadius: 14, background: color, border: `3px solid ${SURF}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {group.name[0]?.toUpperCase()}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: T1 }}>{group.name}</span>
            <div style={{ fontSize: 12, color: TMUT, marginTop: 2 }}>
              {mc} member{mc !== 1 ? 's' : ''} · {workouts} workout{workouts !== 1 ? 's' : ''}
            </div>
          </div>
          {members.length > 0 && <AvatarStack members={members} size={24} max={3} />}
        </div>

        {group.description && (
          <div style={{ background: BG, borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: T2, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.description}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={e => { e.stopPropagation(); onClick(); }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: GREEN, color: '#fff', border: 'none', borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Open Chat
          </button>
          <button onClick={e => e.stopPropagation()} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, cursor: 'pointer', color: T2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Group Sheet ─────────────────────────────────────────────────────────
function CreateGroupSheet({ onClose, createGroup }: { onClose: () => void; createGroup: (n: string, d: string, pub: boolean) => Promise<Group> }) {
  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleCreate() {
    if (!name.trim()) { toast.error('Name required'); return; }
    setLoading(true);
    try {
      await createGroup(name.trim(), desc.trim(), isPublic);
      toast.success('Squad created!');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, background: SURF, borderRadius: '20px 20px 0 0', padding: '16px 16px 40px', maxHeight: '85dvh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: T1 }}>New Squad</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: T2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: name ? `linear-gradient(135deg,${groupColor(name)},${GREEN})` : SURF2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#fff', transition: 'background 0.3s' }}>
            {name[0]?.toUpperCase() || '?'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Squad Name</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning Warriors"
              style={{ width: '100%', boxSizing: 'border-box', background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', fontSize: 15, fontWeight: 500, color: T1, outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Description (optional)</div>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's this squad about?" rows={2}
              style={{ width: '100%', boxSizing: 'border-box', background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', fontSize: 14, color: T1, outline: 'none', fontFamily: 'inherit', resize: 'none' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Privacy</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['private', 'public'] as const).map(p => (
                <button key={p} onClick={() => setIsPublic(p === 'public')} style={{ flex: 1, padding: 10, borderRadius: 12, border: `1.5px solid ${(p === 'public') === isPublic ? GREEN : BORDER}`, background: (p === 'public') === isPublic ? 'rgba(49,162,76,0.1)' : SURF, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: (p === 'public') === isPublic ? GREEN : T2, textTransform: 'capitalize' }}>
                  {p === 'private' ? '🔒 Private' : '🌐 Public'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleCreate} disabled={loading || !name.trim()}
          style={{ width: '100%', marginTop: 20, padding: '14px', borderRadius: 20, background: GREEN, color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: name.trim() ? 1 : 0.4 }}
        >
          {loading ? 'Creating…' : 'Create Squad'}
        </button>
      </div>
    </>
  );
}

// ── Discover squads ────────────────────────────────────────────────────────────
const DISCOVER = [
  { name: 'Morning Runners', members: 24, tag: 'Running',  color: '#2ABBA7' },
  { name: 'Gym Bros',        members: 18, tag: 'Strength', color: '#E8613C' },
  { name: 'Yoga Vibes',      members: 31, tag: 'Yoga',     color: '#A121CE' },
  { name: 'HIIT Squad',      members: 12, tag: 'HIIT',     color: '#F7B928' },
];

// ── Main ───────────────────────────────────────────────────────────────────────
export default function GroupsView() {
  const { myGroups, isLoading, joinByInviteCode, createGroup, getGroupMembers } = useGroups();
  const [showCreate,  setShowCreate]  = useState(false);
  const [inviteCode,  setInviteCode]  = useState('');
  const [codeError,   setCodeError]   = useState(false);
  const [joining,     setJoining]     = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [membersMap,  setMembersMap]  = useState<Record<string, GroupMember[]>>({});

  useEffect(() => {
    if (!myGroups.length) return;
    Promise.all(
      myGroups.map(async g => {
        try { return [g.id, await getGroupMembers(g.id)] as [string, GroupMember[]]; }
        catch { return [g.id, []] as [string, GroupMember[]]; }
      })
    ).then(pairs => setMembersMap(Object.fromEntries(pairs)));
  }, [myGroups, getGroupMembers]);

  const handleJoin = useCallback(async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      await joinByInviteCode(inviteCode.trim().toUpperCase());
      toast.success('Joined squad!');
      setInviteCode(''); setCodeError(false);
    } catch {
      setCodeError(true);
      setTimeout(() => setCodeError(false), 1500);
    } finally {
      setJoining(false);
    }
  }, [inviteCode, joinByInviteCode]);

  if (activeGroup) {
    return <GroupChatView group={activeGroup} onBack={() => setActiveGroup(null)} onLeave={() => setActiveGroup(null)} />;
  }

  return (
    <div style={{ padding: '16px 0 110px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Join a Squad */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(0,100,224,0.15), rgba(49,162,76,0.1))', borderRadius: 20, border: '1px solid rgba(0,100,224,0.2)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,100,224,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BLUEL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T1 }}>Join a Squad</div>
              <div style={{ fontSize: 11, color: TMUT }}>Enter an invite code from a friend</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={inviteCode}
              onChange={e => { setInviteCode(e.target.value); setCodeError(false); }}
              onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
              placeholder="e.g. CBD1832C"
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${codeError ? '#E41E3F' : inviteCode ? BLUEL : BORDER}`, borderRadius: 12, padding: '11px 14px', fontSize: 14, fontWeight: 600, color: T1, outline: 'none', fontFamily: 'inherit', letterSpacing: 1, transition: 'border 0.2s' }}
            />
            <button onClick={handleJoin} disabled={joining || !inviteCode.trim()}
              style={{ background: codeError ? 'rgba(228,30,63,0.15)' : BLUE, color: codeError ? '#E41E3F' : '#fff', border: 'none', borderRadius: 12, padding: '0 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: inviteCode.trim() ? 1 : 0.5 }}
            >
              {joining ? '…' : codeError ? '✗ Invalid' : 'Join →'}
            </button>
          </div>
          {codeError && <div style={{ fontSize: 11, color: '#E41E3F', marginTop: 6 }}>No squad found with that code.</div>}
        </div>
      </div>

      {/* My Squads */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Squads</span>
            {myGroups.length > 0 && <span style={{ background: GREEN, color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{myGroups.length}</span>}
          </div>
          <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`, borderRadius: 100, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: T2 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Squad
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${GREEN}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : myGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏋️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T2, marginBottom: 4 }}>No squads yet</div>
            <div style={{ fontSize: 12, color: TMUT }}>Create one or join with an invite code above</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
            {myGroups.map(g => <RichGroupCard key={g.id} group={g} members={membersMap[g.id] ?? []} onClick={() => setActiveGroup(g)} />)}
          </div>
        )}
      </div>

      {/* Discover Squads */}
      <div>
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Discover Squads</span>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {DISCOVER.map((s, i) => (
            <div key={i} style={{ flexShrink: 0, width: 130, background: SURF, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <div style={{ height: 44, background: `linear-gradient(135deg, ${s.color}99, ${s.color}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>{s.tag}</span>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T1, marginBottom: 2 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: TMUT, marginBottom: 8 }}>{s.members} members</div>
                <button style={{ width: '100%', padding: '7px', borderRadius: 100, background: 'transparent', border: `1.5px solid ${BLUEL}`, color: BLUEL, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Request</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && <CreateGroupSheet onClose={() => setShowCreate(false)} createGroup={createGroup} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

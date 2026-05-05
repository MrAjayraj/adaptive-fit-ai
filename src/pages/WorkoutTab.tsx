// src/pages/WorkoutTab.tsx — Redesigned: teal accent, filter pills, Hevy-style cards

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal, Play, Clock, Dumbbell, Zap,
  Share2, Globe, Users, RefreshCw, Plus, ChevronRight,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useFitness } from '@/context/FitnessContext';
import {
  getActiveWorkout, getCommunityRoutines,
  getRoutinesSharedWithMe, cloneSharedRoutine,
} from '@/services/workoutService';
import type { ActiveWorkout, Routine, SharedRoutineRow } from '@/services/workoutService';
import { useRoutines } from '@/hooks/useRoutines';
import { ShareRoutineSheet } from '@/components/workout/ShareRoutineSheet';
import BottomNav from '@/components/layout/BottomNav';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG      = '#0d0d0d';
const CARD    = '#161616';
const CARD2   = '#1e1e1e';
const ACCENT  = '#1ed760';   // Spotify-ish teal-green
const T1      = '#ffffff';
const T2      = '#aaaaaa';
const T3      = '#555555';
const BORDER  = 'rgba(255,255,255,0.08)';

// ── Helpers ────────────────────────────────────────────────────────────────────
function daysAgo(d: string | null) {
  if (!d) return 'Never';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}
function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function formatElapsed(s?: string) {
  if (!s) return '0m';
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ background: CARD, borderRadius: 14, height: 68, marginBottom: 10, overflow: 'hidden', position: 'relative' }}>
      <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)' }} />
    </div>
  );
}

// ── Three-dot menu ─────────────────────────────────────────────────────────────
function RoutineMenu({ onEdit, onDuplicate, onShare, onDelete, onClose }:
  { onEdit:()=>void; onDuplicate:()=>void; onShare:()=>void; onDelete:()=>void; onClose:()=>void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  const items = [
    { label: 'Edit',      color: T1,        fn: onEdit },
    { label: 'Duplicate', color: T1,        fn: onDuplicate },
    { label: 'Share',     color: '#60a5fa', fn: onShare },
    { label: 'Delete',    color: '#f87171', fn: onDelete },
  ];
  return (
    <motion.div ref={ref} initial={{ opacity:0, scale:0.9, y:-4 }} animate={{ opacity:1, scale:1, y:0 }}
      exit={{ opacity:0, scale:0.9 }} transition={{ duration: 0.12 }}
      style={{ position:'absolute', right:0, top:38, zIndex:50, background:CARD2, borderRadius:12,
        border:`1px solid ${BORDER}`, minWidth:140, overflow:'hidden', boxShadow:'0 8px 28px rgba(0,0,0,0.6)' }}>
      {items.map(it => (
        <button key={it.label} onClick={e => { e.stopPropagation(); it.fn(); onClose(); }}
          style={{ display:'block', width:'100%', padding:'11px 16px', background:'none',
            border:'none', textAlign:'left', fontSize:14, fontWeight:500, color:it.color, cursor:'pointer' }}>
          {it.label}
        </button>
      ))}
    </motion.div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({ name, onConfirm, onCancel }:{ name:string; onConfirm:()=>void; onCancel:()=>void }) {
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.75)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={onCancel}>
      <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}
        onClick={e => e.stopPropagation()}
        style={{ background:CARD2, borderRadius:18, border:`1px solid ${BORDER}`,
          padding:'24px 20px', width:'100%', maxWidth:320 }}>
        <p style={{ fontSize:16, fontWeight:700, color:T1, marginBottom:6 }}>Delete routine?</p>
        <p style={{ fontSize:13, color:T2, marginBottom:24, lineHeight:1.5 }}>"{name}" will be permanently deleted.</p>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, height:44, borderRadius:12, background:CARD,
            border:`1px solid ${BORDER}`, color:T2, fontSize:14, fontWeight:600, cursor:'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, height:44, borderRadius:12, background:'#f87171',
            border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>Delete</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Routine card (matches screenshot) ─────────────────────────────────────────
function RoutineCard({ routine, index, onStart, onEdit, onDuplicate, onShare, onDelete }:
  { routine:Routine; index:number; onStart:()=>void; onEdit:()=>void;
    onDuplicate:()=>void; onShare:()=>void; onDelete:()=>void }) {
  const [menu, setMenu] = useState(false);
  const exCount = Array.isArray(routine.exercises) ? routine.exercises.length : 0;

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.2, delay:index*0.05 }}
      style={{ background:CARD, borderRadius:14, border:`1px solid ${BORDER}`, zIndex: menu ? 10 : 1,
        marginBottom:10, display:'flex', alignItems:'center', padding:'14px 14px', position:'relative' }}>

      {/* Text */}
      <div style={{ flex:1, minWidth:0, paddingRight:40 }}>
        <p style={{ fontSize:15, fontWeight:700, color:T1, margin:'0 0 3px',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {routine.name}
        </p>
        <p style={{ fontSize:12, color:T2, margin:0 }}>
          {exCount} exercise{exCount !== 1 ? 's' : ''} · Last: {daysAgo(routine.last_performed_at)}
        </p>
      </div>

      {/* Round play button */}
      <motion.button whileTap={{ scale:0.88 }} onClick={e => { e.stopPropagation(); onStart(); }}
        style={{ width:42, height:42, borderRadius:'50%', background:ACCENT, border:'none',
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
        <Play style={{ width:16, height:16, fill:'#000', color:'#000', marginLeft:2 }} />
      </motion.button>

      {/* 3-dot */}
      <div style={{ position:'absolute', right:62, top:'50%', transform:'translateY(-50%)' }}>
        <motion.button whileTap={{ scale:0.9 }} onClick={e => { e.stopPropagation(); setMenu(o => !o); }}
          style={{ width:30, height:30, borderRadius:8, background:'transparent',
            border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <MoreHorizontal style={{ width:18, height:18, color:T3 }} />
        </motion.button>
        <AnimatePresence>
          {menu && <RoutineMenu onEdit={onEdit} onDuplicate={onDuplicate} onShare={onShare} onDelete={onDelete} onClose={() => setMenu(false)} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Quick Start card ───────────────────────────────────────────────────────────
function QuickCard({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale:0.97 }} onClick={onClick}
      style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
        background:CARD, borderRadius:14, border:`1px solid ${BORDER}`, cursor:'pointer',
        marginBottom:10, textAlign:'left' }}>
      <div style={{ width:42, height:42, borderRadius:12, background:CARD2, flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        {icon}
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:15, fontWeight:700, color:T1, margin:0 }}>{title}</p>
        <p style={{ fontSize:12, color:T2, margin:'2px 0 0' }}>{subtitle}</p>
      </div>
      <ChevronRight style={{ width:18, height:18, color:T3, flexShrink:0 }} />
    </motion.button>
  );
}

// ── Community card ─────────────────────────────────────────────────────────────
function CommunityCard({ shared, index, onAdd, adding }:
  { shared:SharedRoutineRow; index:number; onAdd:()=>void; adding:boolean }) {
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.2, delay:index*0.04 }}
      style={{ background:CARD, borderRadius:14, border:`1px solid ${BORDER}`, marginBottom:10, padding:'12px 14px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <div style={{ width:28, height:28, borderRadius:'50%', background:CARD2, border:`1px solid ${BORDER}`,
          display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
          {shared.sharer_avatar
            ? <img src={shared.sharer_avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:12, fontWeight:700, color:ACCENT }}>{shared.sharer_name?.charAt(0)?.toUpperCase() ?? '?'}</span>}
        </div>
        <span style={{ fontSize:12, fontWeight:600, color:T2, flex:1 }}>{shared.sharer_name ?? 'Anonymous'}</span>
        <span style={{ fontSize:11, color:T3 }}>{timeAgo(shared.created_at)}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:15, fontWeight:700, color:T1, margin:0 }}>{shared.routine_name}</p>
          <span style={{ fontSize:11, color:T3 }}>{shared.exercise_count} exercises</span>
        </div>
        <motion.button whileTap={{ scale:0.9 }} onClick={onAdd} disabled={adding}
          style={{ height:34, paddingLeft:14, paddingRight:14, borderRadius:10,
            background: adding ? CARD2 : `${ACCENT}22`, border:`1px solid ${adding ? BORDER : `${ACCENT}55`}`,
            color: adding ? T3 : ACCENT, fontSize:12, fontWeight:700, cursor: adding ? 'default':'pointer',
            display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          {adding ? 'Adding…' : '+ Add'}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Filter pills ───────────────────────────────────────────────────────────────
const FILTERS = ['ALL','STRENGTH','CARDIO','STRETCHING'] as const;
type Filter = typeof FILTERS[number];

function filterRoutine(r: Routine, f: Filter) {
  if (f === 'ALL') return true;
  const name = (r.name + ' ' + (r.notes ?? '')).toLowerCase();
  if (f === 'STRENGTH')   return name.includes('strength') || name.includes('weight') || name.includes('lift') || name.includes('muscle');
  if (f === 'CARDIO')     return name.includes('cardio') || name.includes('hiit') || name.includes('run') || name.includes('cycle');
  if (f === 'STRETCHING') return name.includes('stretch') || name.includes('yoga') || name.includes('flex') || name.includes('mobility');
  return true;
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function WorkoutTab() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { profile } = useFitness();
  const { routines, loading, remove, duplicate, refresh } = useRoutines();

  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [elapsedLabel, setElapsedLabel]   = useState('');
  const [deleteTarget, setDeleteTarget]   = useState<{ id: string; name: string } | null>(null);
  const [shareTarget, setShareTarget]     = useState<Routine | null>(null);
  const [filter, setFilter]               = useState<Filter>('ALL');

  // Community
  const [communityTab, setCommunityTab]     = useState<'community'|'shared'>('community');
  const [community, setCommunity]           = useState<SharedRoutineRow[]>([]);
  const [sharedWithMe, setSharedWithMe]     = useState<SharedRoutineRow[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);

  const handleStartRoutine = (routineId: string, routineName: string) => {
    if (activeWorkout) {
      alert('You already have a workout in progress. Please finish or cancel it first.');
      return;
    }
    navigate('/workout/active', { state: { routineId, routineName } });
  };

  const handleQuickStart = (routineName: string) => {
    if (activeWorkout) {
      alert('You already have a workout in progress. Please finish or cancel it first.');
      return;
    }
    navigate('/workout/active', { state: { routineName, mode: 'empty' } });
  };
  const [addingId, setAddingId]             = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getActiveWorkout(user.id).then(setActiveWorkout).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!activeWorkout) return;
    const tick = () => setElapsedLabel(formatElapsed(activeWorkout.started_at));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [activeWorkout]);

  const loadCommunity = useCallback(async () => {
    if (!user) return;
    setCommunityLoading(true);
    try {
      const [pub, priv] = await Promise.all([getCommunityRoutines(user.id), getRoutinesSharedWithMe(user.id)]);
      setCommunity(pub); setSharedWithMe(priv);
    } catch { /* ignore */ } finally { setCommunityLoading(false); }
  }, [user]);

  useEffect(() => { loadCommunity(); }, [loadCommunity]);

  async function handleDelete(id: string) { await remove(id); setDeleteTarget(null); }

  async function handleAddCommunity(shared: SharedRoutineRow) {
    if (!user) return;
    setAddingId(shared.id);
    try {
      const cloned = await cloneSharedRoutine(shared.id, user.id);
      if (cloned) { toast.success(`"${shared.routine_name}" added!`); refresh(); loadCommunity(); }
      else toast.error('Failed to add routine.');
    } catch { toast.error('Failed to add routine.'); }
    finally { setAddingId(null); }
  }

  const filtered = routines.filter(r => filterRoutine(r, filter));
  const displayed = communityTab === 'community' ? community : sharedWithMe;

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: 108, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ position:'sticky', top:0, zIndex:30, background:'rgba(13,13,13,0.95)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        padding:'max(16px,env(safe-area-inset-top)) 16px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <span style={{ fontSize:22, fontWeight:800, color:T1 }}>Workouts</span>
          <motion.button whileTap={{ scale:0.88 }} onClick={() => navigate('/routine/new')}
            style={{ width:34, height:34, borderRadius:'50%', background:CARD2, border:`1px solid ${BORDER}`,
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Calendar style={{ width:16, height:16, color:T2 }} />
          </motion.button>
        </div>

        {/* Filter pills */}
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ flexShrink:0, height:32, paddingLeft:16, paddingRight:16, borderRadius:20,
                background: filter === f ? ACCENT : CARD2,
                border: filter === f ? 'none' : `1px solid ${BORDER}`,
                color: filter === f ? '#000' : T2,
                fontSize:12, fontWeight:700, cursor:'pointer', letterSpacing:'0.03em' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>

        {/* ── Active workout banner ── */}
        <AnimatePresence>
          {activeWorkout && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
              exit={{ opacity:0, height:0 }} transition={{ duration:0.22 }}
              style={{ background:`${ACCENT}15`, border:`1px solid ${ACCENT}44`, borderRadius:14,
                padding:'12px 14px', display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:`${ACCENT}22`,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Zap style={{ width:16, height:16, color:ACCENT, fill:ACCENT }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:11, fontWeight:700, color:ACCENT, margin:0, letterSpacing:'0.05em' }}>WORKOUT IN PROGRESS</p>
                <p style={{ fontSize:14, fontWeight:600, color:T1, margin:'2px 0 0',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activeWorkout.name}</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <span style={{ fontSize:12, color:ACCENT, display:'flex', alignItems:'center', gap:4 }}>
                  <Clock style={{ width:11, height:11 }} />{elapsedLabel}
                </span>
                <motion.button whileTap={{ scale:0.92 }} onClick={() => navigate(`/workout/active?id=${activeWorkout.id}`)}
                  style={{ height:32, paddingLeft:14, paddingRight:14, borderRadius:20, background:ACCENT,
                    border:'none', color:'#000', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  Continue →
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MY ROUTINES ── */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <span style={{ fontSize:11, fontWeight:700, color:T3, letterSpacing:'0.08em' }}>MY ROUTINES</span>
          {routines.length > 0 && (
            <span style={{ fontSize:11, fontWeight:700, color:T3, background:CARD2,
              borderRadius:10, padding:'1px 7px' }}>{routines.length}</span>
          )}
        </div>

        {loading ? (
          <><Skeleton /><Skeleton /><Skeleton /></>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'28px 16px', background:CARD, borderRadius:14,
            border:`1px dashed ${BORDER}`, marginBottom:14 }}>
            <Dumbbell style={{ width:28, height:28, color:T3, margin:'0 auto 10px' }} />
            <p style={{ fontSize:14, fontWeight:600, color:T2, margin:0 }}>
              {routines.length === 0 ? 'No routines yet' : `No ${filter.toLowerCase()} routines`}
            </p>
          </div>
        ) : (
          filtered.map((r, i) => (
            <RoutineCard key={r.id} routine={r} index={i}
              onStart={() => handleStartRoutine(r.id, r.name)}
              onEdit={() => navigate('/routine/new', { state: { existingRoutine: { id: r.id, name: r.name, exercises: r.exercises, notes: r.notes ?? '' } } })}
              onDuplicate={() => duplicate(r.id)}
              onShare={() => setShareTarget(r)}
              onDelete={() => setDeleteTarget({ id: r.id, name: r.name })}
            />
          ))
        )}

        {/* Create custom workout link */}
        <motion.button whileTap={{ scale:0.97 }} onClick={() => navigate('/routine/new')}
          style={{ width:'100%', height:44, borderRadius:14, background:'transparent', border:'none',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6, cursor:'pointer', marginBottom:28 }}>
          <Plus style={{ width:15, height:15, color:ACCENT }} />
          <span style={{ fontSize:14, fontWeight:600, color:ACCENT }}>Create Custom Workout</span>
        </motion.button>

        {/* ── QUICK START ── */}
        <p style={{ fontSize:11, fontWeight:700, color:T3, letterSpacing:'0.08em', marginBottom:12 }}>QUICK START</p>

        <QuickCard
          icon={<Dumbbell style={{ width:20, height:20, color:ACCENT }} />}
          title="Strength"
          subtitle="45–60 min · 320 kcal"
          onClick={() => handleQuickStart('Strength Workout')}
        />
        <QuickCard
          icon={<Zap style={{ width:20, height:20, color:'#f87171', fill:'#f87171' }} />}
          title="Cardio / HIIT"
          subtitle="20–30 min · 280 kcal"
          onClick={() => handleQuickStart('Cardio / HIIT')}
        />
        <QuickCard
          icon={<span style={{ fontSize:18 }}>🥊</span>}
          title="Skill / Boxing"
          subtitle="30 min · 240 kcal"
          onClick={() => handleQuickStart('Skill / Boxing')}
        />

        {/* ── DISCOVER / Community ── */}
        <div style={{ marginTop:28 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Share2 style={{ width:16, height:16, color:ACCENT }} />
              <span style={{ fontSize:11, fontWeight:700, color:T3, letterSpacing:'0.08em' }}>DISCOVER</span>
            </div>
            <motion.button whileTap={{ scale:0.9 }} onClick={loadCommunity}
              style={{ width:28, height:28, borderRadius:'50%', background:CARD2, border:`1px solid ${BORDER}`,
                display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <RefreshCw style={{ width:13, height:13, color:T3 }} />
            </motion.button>
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {([{ key:'community', label:'Community', Icon: Globe }, { key:'shared', label:'Shared with Me', Icon: Users }] as const).map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setCommunityTab(key)}
                style={{ flex:1, height:34, borderRadius:10,
                  background: communityTab === key ? `${ACCENT}18` : CARD,
                  border: `1px solid ${communityTab === key ? `${ACCENT}44` : BORDER}`,
                  color: communityTab === key ? ACCENT : T2,
                  fontSize:12, fontWeight:700, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                <Icon style={{ width:13, height:13 }} />{label}
              </button>
            ))}
          </div>

          {communityLoading ? (
            <><Skeleton /><Skeleton /></>
          ) : displayed.length === 0 ? (
            <div style={{ textAlign:'center', padding:'28px 16px', background:CARD, borderRadius:14, border:`1px dashed ${BORDER}` }}>
              <p style={{ fontSize:14, fontWeight:600, color:T2, margin:0 }}>
                {communityTab === 'community' ? 'No routines shared yet' : 'Nothing shared with you yet'}
              </p>
            </div>
          ) : displayed.map((s, i) => (
            <CommunityCard key={s.id} shared={s} index={i}
              onAdd={() => handleAddCommunity(s)} adding={addingId === s.id} />
          ))}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {deleteTarget && <DeleteConfirm name={deleteTarget.name} onConfirm={() => handleDelete(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {shareTarget && (
          <ShareRoutineSheet routine={shareTarget} userId={user?.id ?? ''}
            userProfile={profile ? { name: profile.name, avatar_url: profile.avatarUrl } : null}
            onClose={() => setShareTarget(null)} onShared={loadCommunity} />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

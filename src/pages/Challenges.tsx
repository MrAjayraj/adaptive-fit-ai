import { useState, useEffect } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { supabase } from '@/integrations/supabase/client';
import { getLocalId } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Target, Crown, Medal, Zap, Clock, Plus, X, ChevronRight, Flame, Shield } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { toast } from 'sonner';

interface Challenge {
  id: string; name: string; description: string | null; type: string;
  target_value: number; target_unit: string; duration_days: number; icon: string; is_active: boolean;
}

interface LeaderboardEntry {
  id: string; username: string; xp: number; level: number;
  total_workouts: number; total_volume: number; streak: number;
}

type Tab = 'challenges' | 'leaderboard';
type LBCategory = 'xp' | 'volume' | 'workouts' | 'streak';

const DUMMY_LB: LeaderboardEntry[] = [
  { id: 'd1', username: 'FitWarrior99', xp: 12450, level: 18, total_workouts: 156, total_volume: 285000, streak: 34 },
  { id: 'd2', username: 'IronMike', xp: 10200, level: 15, total_workouts: 132, total_volume: 245000, streak: 22 },
  { id: 'd3', username: 'GymQueen', xp: 9800, level: 14, total_workouts: 128, total_volume: 198000, streak: 45 },
  { id: 'd4', username: 'BeastMode', xp: 8500, level: 13, total_workouts: 115, total_volume: 178000, streak: 18 },
  { id: 'd5', username: 'PowerLifter', xp: 7200, level: 11, total_workouts: 98, total_volume: 320000, streak: 12 },
  { id: 'd6', username: 'RunnerX', xp: 6800, level: 10, total_workouts: 145, total_volume: 95000, streak: 28 },
  { id: 'd7', username: 'SwoleSister', xp: 5900, level: 9, total_workouts: 87, total_volume: 156000, streak: 15 },
  { id: 'd8', username: 'GainsTrain', xp: 4500, level: 8, total_workouts: 72, total_volume: 134000, streak: 8 },
  { id: 'd9', username: 'FlexKing', xp: 3200, level: 6, total_workouts: 54, total_volume: 98000, streak: 5 },
  { id: 'd10', username: 'NewbiePro', xp: 1800, level: 4, total_workouts: 28, total_volume: 45000, streak: 3 },
];

export default function Challenges() {
  const { gamification, workouts, profile, getTotalVolume, awardRP } = useFitness();
  const [tab, setTab] = useState<Tab>('challenges');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [joinedIds, setJoinedIds] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('fitai-joined-challenges'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lbCat, setLbCat] = useState<LBCategory>('xp');
  const [showCreate, setShowCreate] = useState(false);
  const [newCh, setNewCh] = useState({ name: '', type: 'workouts', target: '10', duration: 30 });

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { localStorage.setItem('fitai-joined-challenges', JSON.stringify([...joinedIds])); }, [joinedIds]);

  const fetchAll = async () => {
    const { data: ch } = await supabase.from('challenges').select('*').eq('is_active', true);
    if (ch) setChallenges(ch as Challenge[]);
    const { data: parts } = await supabase.from('challenge_participants').select('challenge_id');
    if (parts) {
      const counts: Record<string, number> = {};
      (parts as { challenge_id: string }[]).forEach(p => { counts[p.challenge_id] = (counts[p.challenge_id] || 0) + 1; });
      setParticipantCounts(counts);
    }
    const { data: lb } = await supabase.from('leaderboard').select('*').order('xp', { ascending: false }).limit(50);
    setLeaderboard((lb as LeaderboardEntry[] | null)?.length ? (lb as LeaderboardEntry[]) : DUMMY_LB);
    setLoading(false);
  };

  const joinChallenge = async (id: string) => {
    setJoinedIds(prev => { const n = new Set(prev); n.add(id); return n; });
    await supabase.from('challenge_participants').insert([{ challenge_id: id, local_user_name: profile?.name || getLocalId() }]);
    awardRP(5, 'Joined a challenge');
    toast.success('Challenge joined! +5 RP');
  };

  const leaveChallenge = (id: string) => { setJoinedIds(prev => { const n = new Set(prev); n.delete(id); return n; }); };

  const getProgress = (c: Challenge): number => {
    switch (c.target_unit) {
      case 'workouts': return workouts.length;
      case 'volume': return getTotalVolume();
      case 'steps': return gamification.stepsToday * c.duration_days;
      case 'streak': return gamification.streak;
      default: return 0;
    }
  };

  const handleCreate = async () => {
    if (!newCh.name) return;
    await supabase.from('challenges').insert([{
      name: newCh.name, type: 'personal', target_value: parseInt(newCh.target) || 10,
      target_unit: newCh.type, duration_days: newCh.duration, icon: '🎯', created_by: getLocalId(),
    }]);
    setShowCreate(false);
    setNewCh({ name: '', type: 'workouts', target: '10', duration: 30 });
    fetchAll();
    toast.success('Challenge created!');
  };

  const sorted = [...leaderboard].sort((a, b) => {
    switch (lbCat) {
      case 'volume': return (b.total_volume || 0) - (a.total_volume || 0);
      case 'workouts': return b.total_workouts - a.total_workouts;
      case 'streak': return b.streak - a.streak;
      default: return b.xp - a.xp;
    }
  });

  const getScore = (e: LeaderboardEntry) => {
    switch (lbCat) {
      case 'volume': return `${((e.total_volume || 0) / 1000).toFixed(0)}k kg`;
      case 'workouts': return `${e.total_workouts}`;
      case 'streak': return `${e.streak}🔥`;
      default: return `${e.xp.toLocaleString()} XP`;
    }
  };

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const myName = profile?.name || 'You';
  const myRank = sorted.findIndex(e => e.username === myName) + 1;

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const itemVariants = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen bg-canvas pb-[100px] font-sans">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-lg md:max-w-[1080px] mx-auto md:pl-[104px] md:pr-8 px-4 pt-14 md:pt-10 space-y-5"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-text-1">Compete</h1>
            <p className="text-[13px] text-text-3">Challenges &amp; Leaderboard</p>
          </div>
          <div className="flex items-center gap-2 bg-surface-1 border border-border-subtle rounded-full px-3 py-1.5">
            <Zap className="w-3.5 h-3.5 text-primary-accent" />
            <span className="text-[12px] font-bold text-text-1">Lv.{gamification.level}</span>
            <span className="text-[11px] text-text-3">· {gamification.xp.toLocaleString()} XP</span>
          </div>
        </motion.div>

        {/* ── Tab Switcher ───────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex gap-1.5 bg-surface-1 p-1.5 rounded-2xl border border-border-subtle">
          {(['challenges', 'leaderboard'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold capitalize transition-all ${
                tab === t ? 'bg-primary-accent text-canvas shadow-volt' : 'text-text-3 hover:text-text-2'
              }`}
            >
              {t === 'challenges' ? '⚔️ Challenges' : '🏆 Leaderboard'}
            </button>
          ))}
        </motion.div>

        {/* ── CHALLENGES TAB ─────────────────────────────────────── */}
        {tab === 'challenges' && (
          <>
            {/* My stats pill */}
            <motion.div variants={itemVariants} className="relative bg-surface-1 rounded-[20px] border border-border-subtle p-4 flex items-center gap-3 overflow-hidden">
              <div className="absolute -top-4 -right-4 w-28 h-28 bg-primary-accent/10 blur-[30px] rounded-full pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-primary-accent/15 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-accent" />
              </div>
              <div className="flex-1 relative z-10">
                <p className="text-[14px] font-bold text-text-1">Level {gamification.level} · {gamification.xp.toLocaleString()} XP</p>
                <p className="text-[12px] text-text-3">{workouts.length} workouts · {gamification.streak} day streak</p>
              </div>
              <div className="relative z-10 text-right">
                <p className="text-[10px] text-text-3 uppercase tracking-widest font-semibold">Active</p>
                <p className="text-[18px] font-extrabold text-primary-accent">{joinedIds.size}</p>
              </div>
            </motion.div>

            {/* Active Challenges */}
            {challenges.filter(c => joinedIds.has(c.id)).length > 0 && (
              <motion.div variants={itemVariants}>
                <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest mb-2 px-1">Active Challenges</p>
                <div className="space-y-2">
                  {challenges.filter(c => joinedIds.has(c.id)).map(c => {
                    const progress = getProgress(c);
                    const pct = Math.min(100, (progress / Number(c.target_value)) * 100);
                    const completed = pct >= 100;
                    const participants = participantCounts[c.id] || 0;
                    return (
                      <div
                        key={c.id}
                        className={`bg-surface-1 rounded-[20px] border p-4 ${completed ? 'border-primary-accent/30' : 'border-border-subtle'}`}
                        style={completed ? { boxShadow: '0 0 20px rgba(245,197,24,0.08)' } : {}}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[24px]">{c.icon}</span>
                            <div>
                              <p className="text-[14px] font-bold text-text-1">{c.name}</p>
                              <p className="text-[11px] text-text-3">{c.description}</p>
                            </div>
                          </div>
                          {completed
                            ? <Medal className="w-5 h-5 text-primary-accent" />
                            : <button onClick={() => leaveChallenge(c.id)} className="text-[10px] text-red-400 font-semibold">Leave</button>
                          }
                        </div>
                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-[11px] mb-1.5">
                            <span className="text-text-3">{Math.round(progress).toLocaleString()} / {Number(c.target_value).toLocaleString()} {c.target_unit}</span>
                            <span className="font-bold text-primary-accent">{Math.round(pct)}%</span>
                          </div>
                          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-accent to-accent-alt rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-text-3">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.duration_days} days</span>
                          {completed && <span className="text-emerald-400 font-semibold">✅ Complete</span>}
                          {participants > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{participants}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Available Challenges */}
            <motion.div variants={itemVariants}>
              <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest mb-2 px-1">
                {joinedIds.size > 0 ? 'Available Challenges' : 'All Challenges'}
              </p>
              <div className="space-y-2">
                {loading
                  ? [1, 2, 3].map(i => (
                    <div key={i} className="bg-surface-1 rounded-[20px] border border-border-subtle p-4 animate-pulse">
                      <div className="h-4 bg-surface-3 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-surface-3 rounded w-1/2" />
                    </div>
                  ))
                  : challenges.filter(c => !joinedIds.has(c.id)).map(c => (
                    <div key={c.id} className="bg-surface-1 rounded-[20px] border border-border-subtle p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[22px]">{c.icon}</span>
                          <div>
                            <p className="text-[14px] font-semibold text-text-1">{c.name}</p>
                            <p className="text-[11px] text-text-3">{c.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-text-3">
                          <span className="flex items-center gap-1">
                            {c.type === 'community' ? <><Users className="w-3 h-3" /> Community</> : <><Target className="w-3 h-3" /> Personal</>}
                          </span>
                          <span>· {c.duration_days}d</span>
                          <span>· {Number(c.target_value).toLocaleString()} {c.target_unit}</span>
                          {participantCounts[c.id] && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{participantCounts[c.id]}</span>}
                        </div>
                        <button
                          onClick={() => joinChallenge(c.id)}
                          className="px-4 py-1.5 rounded-full bg-primary-accent text-canvas text-[12px] font-bold"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </motion.div>
          </>
        )}

        {/* ── LEADERBOARD TAB ────────────────────────────────────── */}
        {tab === 'leaderboard' && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
            {/* Category pills */}
            <motion.div variants={itemVariants} className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {([['xp', '⚡ XP'], ['volume', '🏋️ Volume'], ['workouts', '💪 Workouts'], ['streak', '🔥 Streak']] as [LBCategory, string][]).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setLbCat(k)}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-all ${
                    lbCat === k
                      ? 'bg-primary-accent text-canvas shadow-volt'
                      : 'bg-surface-1 border border-border-subtle text-text-2'
                  }`}
                >
                  {l}
                </button>
              ))}
            </motion.div>

            {/* My Position */}
            <motion.div variants={itemVariants}>
              <div className="bg-surface-1 rounded-[20px] border border-primary-accent/25 p-4 flex items-center gap-3" style={{ boxShadow: '0 0 20px rgba(245,197,24,0.06)' }}>
                <div className="w-11 h-11 rounded-full bg-primary-accent flex items-center justify-center text-[13px] font-extrabold text-canvas">
                  {myRank > 0 ? `#${myRank}` : '?'}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-bold text-text-1">{myName} <span className="text-[10px] text-primary-accent font-bold ml-1">YOU</span></p>
                  <p className="text-[11px] text-text-3">Lv.{gamification.level} · {gamification.xp.toLocaleString()} XP</p>
                </div>
              </div>
            </motion.div>

            {/* Podium */}
            {top3.length >= 3 && (
              <motion.div variants={itemVariants} className="flex items-end justify-center gap-2 pt-2">
                {/* #2 */}
                <div className="w-[30%] text-center">
                  <div className="bg-surface-1 border border-border-subtle rounded-[16px] p-2 mb-1">
                    <p className="text-[12px] font-bold text-text-1 truncate">{top3[1].username}</p>
                    <p className="text-[10px] text-text-3">{getScore(top3[1])}</p>
                  </div>
                  <div className="text-[20px]">🥈</div>
                  <div className="h-10 bg-surface-2 rounded-b-xl mt-1" />
                </div>
                {/* #1 */}
                <div className="w-[36%] text-center">
                  <Crown className="w-5 h-5 text-primary-accent mx-auto mb-1" />
                  <div className="bg-surface-1 border border-primary-accent/30 rounded-[16px] p-2 mb-1" style={{ boxShadow: '0 0 16px rgba(245,197,24,0.12)' }}>
                    <p className="text-[13px] font-extrabold text-primary-accent truncate">{top3[0].username}</p>
                    <p className="text-[10px] text-primary-accent/70 font-semibold">{getScore(top3[0])}</p>
                  </div>
                  <div className="text-[24px]">👑</div>
                  <div className="h-16 bg-primary-accent/10 rounded-b-xl mt-1" />
                </div>
                {/* #3 */}
                <div className="w-[30%] text-center">
                  <div className="bg-surface-1 border border-border-subtle rounded-[16px] p-2 mb-1">
                    <p className="text-[12px] font-bold text-text-1 truncate">{top3[2].username}</p>
                    <p className="text-[10px] text-text-3">{getScore(top3[2])}</p>
                  </div>
                  <div className="text-[20px]">🥉</div>
                  <div className="h-6 bg-surface-2 rounded-b-xl mt-1" />
                </div>
              </motion.div>
            )}

            {/* Rest of leaderboard */}
            <motion.div variants={itemVariants} className="space-y-1.5">
              {rest.map((entry, i) => {
                const isMe = entry.username === myName;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                      isMe ? 'bg-primary-accent/8 border-primary-accent/25' : 'bg-surface-1 border-border-subtle'
                    }`}
                  >
                    <span className="w-7 text-[13px] font-extrabold text-text-3 text-center">#{i + 4}</span>
                    <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-[13px] font-bold text-text-2">
                      {entry.username.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className={`text-[13px] font-semibold ${isMe ? 'text-primary-accent' : 'text-text-1'}`}>
                        {entry.username}
                        {isMe && <span className="text-[10px] text-primary-accent/70 ml-1 font-bold">YOU</span>}
                      </p>
                      <p className="text-[10px] text-text-3">Lv.{entry.level} · {entry.total_workouts} wkts · {entry.streak}🔥</p>
                    </div>
                    <p className="text-[13px] font-extrabold text-text-1">{getScore(entry)}</p>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {/* ── Create Challenge FAB ──────────────────────────────────── */}
      {tab === 'challenges' && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-primary-accent flex items-center justify-center shadow-volt z-40"
        >
          <Plus className="w-6 h-6 text-canvas" />
        </button>
      )}

      {/* ── Create Challenge Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              className="w-full max-w-lg bg-surface-1 border border-border-subtle p-5 rounded-t-[28px]"
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-extrabold text-text-1">Create Challenge</h3>
                <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-text-2" />
                </button>
              </div>
              <div className="flex flex-col gap-3 mb-4">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-text-3 font-semibold">Challenge Name</span>
                  <input
                    className="bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[14px] text-text-1 outline-none focus:border-primary-accent/50"
                    value={newCh.name}
                    onChange={e => setNewCh(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. 100 Pushups Challenge"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-text-3 font-semibold">Type</span>
                  <select
                    className="bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[14px] text-text-1 outline-none"
                    value={newCh.type}
                    onChange={e => setNewCh(p => ({ ...p, type: e.target.value }))}
                  >
                    <option value="workouts">Workouts</option>
                    <option value="volume">Volume (kg)</option>
                    <option value="steps">Steps</option>
                    <option value="streak">Streak (days)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-text-3 font-semibold">Target</span>
                  <input
                    type="number"
                    className="bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[14px] text-text-1 outline-none"
                    value={newCh.target}
                    onChange={e => setNewCh(p => ({ ...p, target: e.target.value }))}
                  />
                </label>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-text-3 font-semibold">Duration</span>
                  <div className="flex gap-2">
                    {[7, 14, 30, 60, 90].map(d => (
                      <button
                        key={d}
                        onClick={() => setNewCh(p => ({ ...p, duration: d }))}
                        className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-all ${
                          newCh.duration === d ? 'bg-primary-accent text-canvas' : 'bg-surface-2 text-text-2'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handleCreate} className="w-full py-3.5 rounded-full bg-primary-accent text-canvas font-extrabold text-[15px]">
                Create Challenge
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

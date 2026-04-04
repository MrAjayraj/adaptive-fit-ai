import { useState, useEffect } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { supabase } from '@/integrations/supabase/client';
import { getLocalId } from '@/services/api';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Target, Crown, Medal, Zap, Clock, Plus, X } from 'lucide-react';
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
type TimeRange = 'week' | 'month' | 'all';
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
  const { gamification, workouts, profile, getTotalVolume } = useFitness();
  const [tab, setTab] = useState<Tab>('challenges');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [joinedIds, setJoinedIds] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('fitai-joined-challenges'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
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
    toast.success('Challenge joined!');
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
      case 'streak': return `${e.streak} 🔥`;
      default: return `${e.xp.toLocaleString()} XP`;
    }
  };

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const myName = profile?.name || 'You';
  const myRank = sorted.findIndex(e => e.username === myName) + 1;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-2xl font-display font-bold text-foreground">Compete</h1>
        <p className="text-sm text-muted-foreground">Challenges & Leaderboard</p>
      </div>

      <div className="flex gap-1 px-5 mb-5">
        {(['challenges', 'leaderboard'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
            {t === 'challenges' ? '⚔️ Challenges' : '🏆 Leaderboard'}
          </button>
        ))}
      </div>

      {tab === 'challenges' && (
        <div className="px-5 space-y-3">
          {/* Stats */}
          <div className="glass-card p-4 glow-border mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Level {gamification.level} · {gamification.xp} XP</p>
                <p className="text-xs text-muted-foreground">{workouts.length} workouts · {gamification.streak} day streak</p>
              </div>
            </div>
          </div>

          {/* Active */}
          {challenges.filter(c => joinedIds.has(c.id)).length > 0 && (
            <>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Challenges</h3>
              {challenges.filter(c => joinedIds.has(c.id)).map(c => {
                const progress = getProgress(c);
                const pct = Math.min(100, (progress / Number(c.target_value)) * 100);
                const completed = pct >= 100;
                const daysLeft = c.duration_days;
                const dailyNeeded = (Number(c.target_value) - progress) / Math.max(daysLeft, 1);
                const onTrack = pct >= (100 / c.duration_days) * (c.duration_days - daysLeft + 1);
                return (
                  <div key={c.id} className={`glass-card p-4 ${completed ? 'glow-border' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{c.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.description}</p>
                        </div>
                      </div>
                      {completed && <Medal className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="mb-1.5">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{Math.round(progress).toLocaleString()} / {Number(c.target_value).toLocaleString()} {c.target_unit}</span>
                        <span className="text-primary font-medium">{Math.round(pct)}%</span>
                      </div>
                      <Progress value={pct} className="h-2 bg-muted" />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{daysLeft} days left</span>
                        <span>{completed ? '✅ Complete' : onTrack ? '✅ On track' : '⚠️ Behind'}</span>
                        {participantCounts[c.id] && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{participantCounts[c.id]}</span>}
                      </div>
                      <button onClick={() => leaveChallenge(c.id)} className="text-destructive">Leave</button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Available */}
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {joinedIds.size > 0 ? 'Available Challenges' : 'All Challenges'}
          </h3>
          {challenges.filter(c => !joinedIds.has(c.id)).map(c => (
            <div key={c.id} className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {c.type === 'community' ? <><Users className="w-3 h-3" /> Community</> : <><Target className="w-3 h-3" /> Personal</>}
                  </span>
                  <span>· {c.duration_days} days</span>
                  <span>· {Number(c.target_value).toLocaleString()} {c.target_unit}</span>
                  {participantCounts[c.id] && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{participantCounts[c.id]}</span>}
                </div>
                <Button size="sm" onClick={() => joinChallenge(c.id)} className="bg-gradient-primary hover:opacity-90 h-7 text-xs px-3">Join</Button>
              </div>
            </div>
          ))}

          {loading && [1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}

          {/* Create FAB */}
          <button onClick={() => setShowCreate(true)}
            className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg z-40">
            <Plus className="w-6 h-6 text-primary-foreground" />
          </button>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="px-5 space-y-3">
          {/* Time toggle */}
          <div className="flex gap-1">
            {(['week', 'month', 'all'] as TimeRange[]).map(t => (
              <button key={t} onClick={() => setTimeRange(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize ${timeRange === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {t === 'week' ? 'This Week' : t === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {([['xp', 'XP'], ['volume', 'Volume'], ['workouts', 'Workouts'], ['streak', 'Streak']] as [LBCategory, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setLbCat(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${lbCat === k ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted text-muted-foreground'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* My position */}
          <div className="glass-card p-4 glow-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                {myRank > 0 ? `#${myRank}` : '—'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{myName} <span className="text-xs text-primary ml-1">YOU</span></p>
                <p className="text-xs text-muted-foreground">Lv.{gamification.level} · {gamification.xp} XP</p>
              </div>
            </div>
          </div>

          {/* Podium */}
          {top3.length >= 3 && (
            <div className="flex items-end justify-center gap-2 pt-4">
              {/* #2 */}
              <div className="w-1/3 text-center">
                <div className="glass-card p-2 border border-gray-300/20">
                  <p className="text-lg">🥈</p>
                  <p className="text-xs font-medium text-foreground truncate">{top3[1].username}</p>
                  <p className="text-[10px] text-muted-foreground">{getScore(top3[1])}</p>
                </div>
                <div className="h-12 bg-muted/20 rounded-b-lg" />
              </div>
              {/* #1 */}
              <div className="w-1/3 text-center">
                <div className="glass-card p-2 glow-border">
                  <p className="text-lg">👑</p>
                  <p className="text-xs font-medium text-foreground truncate">{top3[0].username}</p>
                  <p className="text-[10px] text-primary font-bold">{getScore(top3[0])}</p>
                </div>
                <div className="h-20 bg-primary/10 rounded-b-lg" />
              </div>
              {/* #3 */}
              <div className="w-1/3 text-center">
                <div className="glass-card p-2 border border-amber-600/20">
                  <p className="text-lg">🥉</p>
                  <p className="text-xs font-medium text-foreground truncate">{top3[2].username}</p>
                  <p className="text-[10px] text-muted-foreground">{getScore(top3[2])}</p>
                </div>
                <div className="h-8 bg-muted/20 rounded-b-lg" />
              </div>
            </div>
          )}

          {/* Rest */}
          <div className="flex flex-col gap-1.5">
            {rest.map((entry, i) => {
              const isMe = entry.username === myName;
              return (
                <div key={entry.id} className={`glass-card flex items-center gap-3 p-3 ${isMe ? 'glow-border' : ''}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                    #{i + 4}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {entry.username} {isMe && <span className="text-xs text-primary ml-1">YOU</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Lv.{entry.level} · {entry.total_workouts} workouts · {entry.streak}🔥</p>
                  </div>
                  <p className="text-sm font-display font-bold text-foreground">{getScore(entry)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Challenge Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg glass-card p-5 rounded-t-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold text-foreground">Create Challenge</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="flex flex-col gap-3 mb-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Challenge Name</span>
                <input className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={newCh.name} onChange={e => setNewCh(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 100 Pushups Challenge" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Type</span>
                <select className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={newCh.type} onChange={e => setNewCh(p => ({ ...p, type: e.target.value }))}>
                  <option value="workouts">Workouts</option>
                  <option value="volume">Volume (kg)</option>
                  <option value="steps">Steps</option>
                  <option value="streak">Streak (days)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Target</span>
                <input type="number" className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={newCh.target} onChange={e => setNewCh(p => ({ ...p, target: e.target.value }))} />
              </label>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Duration</span>
                <div className="flex gap-2">
                  {[7, 14, 30, 60, 90].map(d => (
                    <button key={d} onClick={() => setNewCh(p => ({ ...p, duration: d }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium ${newCh.duration === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Button className="w-full bg-gradient-primary" onClick={handleCreate}>Create Challenge</Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

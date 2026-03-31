import { useState, useEffect } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Target, Flame, Crown, ChevronRight, Medal, Zap } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';

interface Challenge {
  id: string;
  name: string;
  description: string | null;
  type: string;
  target_value: number;
  target_unit: string;
  duration_days: number;
  icon: string;
  is_active: boolean;
}

interface LeaderboardEntry {
  id: string;
  username: string;
  xp: number;
  level: number;
  total_workouts: number;
  streak: number;
}

type Tab = 'challenges' | 'leaderboard';

export default function Challenges() {
  const { gamification, workouts, profile, getTotalVolume } = useFitness();
  const [tab, setTab] = useState<Tab>('challenges');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('fitai-joined-challenges');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChallenges();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    localStorage.setItem('fitai-joined-challenges', JSON.stringify([...joinedIds]));
  }, [joinedIds]);

  const fetchChallenges = async () => {
    const { data } = await supabase.from('challenges').select('*').eq('is_active', true);
    if (data) setChallenges(data as Challenge[]);
    setLoading(false);
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('leaderboard').select('*').order('xp', { ascending: false }).limit(50);
    if (data) setLeaderboard(data as LeaderboardEntry[]);
  };

  const joinChallenge = (id: string) => {
    setJoinedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const leaveChallenge = (id: string) => {
    setJoinedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const getChallengeProgress = (challenge: Challenge): number => {
    switch (challenge.target_unit) {
      case 'workouts': return workouts.length;
      case 'volume': return getTotalVolume();
      case 'steps': return gamification.stepsToday * challenge.duration_days;
      case 'streak': return gamification.streak;
      default: return 0;
    }
  };

  const myRank = leaderboard.findIndex(e => e.username === (profile?.name || 'You')) + 1;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-2xl font-display font-bold text-foreground">Compete</h1>
        <p className="text-sm text-muted-foreground">Challenges & Leaderboard</p>
      </div>

      {/* Tabs */}
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
          {/* Your stats summary */}
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

          {/* Active / Joined first */}
          {challenges.filter(c => joinedIds.has(c.id)).length > 0 && (
            <>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Challenges</h3>
              {challenges.filter(c => joinedIds.has(c.id)).map(c => {
                const progress = getChallengeProgress(c);
                const pct = Math.min(100, (progress / Number(c.target_value)) * 100);
                const completed = pct >= 100;
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
                        <span className="text-muted-foreground">{Math.round(progress)} / {Number(c.target_value)} {c.target_unit}</span>
                        <span className="text-primary font-medium">{Math.round(pct)}%</span>
                      </div>
                      <Progress value={pct} className="h-2 bg-muted" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {c.type === 'community' ? <><Users className="w-3 h-3" /> Community</> : <><Target className="w-3 h-3" /> Personal</>}
                        · {c.duration_days} days
                      </span>
                      <button onClick={() => leaveChallenge(c.id)} className="text-[10px] text-destructive">Leave</button>
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
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {c.type === 'community' ? <><Users className="w-3 h-3" /> Community</> : <><Target className="w-3 h-3" /> Personal</>}
                  · {c.duration_days} days · Target: {Number(c.target_value).toLocaleString()} {c.target_unit}
                </span>
                <Button size="sm" onClick={() => joinChallenge(c.id)} className="bg-gradient-primary hover:opacity-90 h-7 text-xs px-3">
                  Join
                </Button>
              </div>
            </div>
          ))}

          {loading && (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="px-5 space-y-3">
          {/* Your position card */}
          <div className="glass-card p-4 glow-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                {myRank > 0 ? `#${myRank}` : '—'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{profile?.name || 'You'}</p>
                <p className="text-xs text-muted-foreground">Level {gamification.level} · {gamification.xp} XP</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-display font-bold text-primary">{gamification.xp}</p>
                <p className="text-[10px] text-muted-foreground">XP</p>
              </div>
            </div>
          </div>

          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Global Rankings</h3>

          {leaderboard.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Crown className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No entries yet</p>
              <p className="text-xs text-muted-foreground mt-1">Complete workouts to appear on the leaderboard</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {leaderboard.map((entry, i) => (
                <div key={entry.id} className={`glass-card flex items-center gap-3 p-3 ${i < 3 ? 'glow-border' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-primary/20 text-primary' :
                    i === 1 ? 'bg-accent/20 text-accent' :
                    i === 2 ? 'bg-destructive/20 text-destructive' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{entry.username}</p>
                    <p className="text-[10px] text-muted-foreground">Lv.{entry.level} · {entry.total_workouts} workouts · {entry.streak}🔥</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-display font-bold text-foreground">{entry.xp.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">XP</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

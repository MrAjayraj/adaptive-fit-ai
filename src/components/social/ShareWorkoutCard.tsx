// src/components/social/ShareWorkoutCard.tsx
import React, { useState } from 'react';
import { Share2, Copy, Check, Trophy, Flame, Dumbbell, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFitness } from '@/context/FitnessContext';
import type { Workout } from '@/types/fitness';

interface ShareWorkoutCardProps {
  workout: Workout;
}

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function formatVolume(volume: number): string {
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k kg`;
  return `${Math.round(volume)} kg`;
}

type TierColor = {
  text: string;
  accent: string;
  glow: string;
};

function getTierStyle(tier: string | undefined): TierColor {
  const map: Record<string, TierColor> = {
    bronze:      { text: '#CD7F32', accent: '#CD7F32', glow: '#CD7F3240' },
    silver:      { text: '#C0C0C0', accent: '#C0C0C0', glow: '#C0C0C040' },
    gold:        { text: '#FFD700', accent: '#FFD700', glow: '#FFD70040' },
    platinum:    { text: '#00BFFF', accent: '#00BFFF', glow: '#00BFFF40' },
    diamond:     { text: '#B9F2FF', accent: '#B9F2FF', glow: '#B9F2FF40' },
    master:      { text: '#FF6B6B', accent: '#FF6B6B', glow: '#FF6B6B40' },
    grandmaster: { text: '#FF3366', accent: '#FF3366', glow: '#FF336640' },
  };
  return map[tier?.toLowerCase() ?? ''] ?? { text: '#00E676', accent: '#00E676', glow: '#00E67640' };
}

export default function ShareWorkoutCard({ workout }: ShareWorkoutCardProps) {
  const { user } = useAuth();
  const { seasonalRank, profile } = useFitness();

  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  const tier = seasonalRank.userRank.tier;
  const division = seasonalRank.userRank.division;
  const tierStyle = getTierStyle(tier);
  const userName = profile?.name ?? user?.email ?? 'Athlete';

  // Derived stats
  const totalVolume = workout.exercises.reduce(
    (acc, ex) =>
      acc + ex.sets.reduce((s, set) => s + (set.completed ? set.weight * set.reps : 0), 0),
    0
  );

  const exerciseSummary = workout.exercises.slice(0, 5).map((ex) => ({
    name: ex.exerciseName,
    sets: ex.sets.filter((s) => s.completed).length,
    best_weight: Math.max(...ex.sets.filter((s) => s.completed).map((s) => s.weight), 0),
  }));

  const prCount = 0; // PRs tracked in gamification context, placeholder here

  const handleShare = async () => {
    if (!user) return;
    setIsSharing(true);

    try {
      const shareToken = generateToken();
      const cardData = {
        name: workout.name,
        duration_min: workout.duration ?? 0,
        total_volume: totalVolume,
        exercises: exerciseSummary,
        pr_count: prCount,
        rank_tier: tier,
        rank_division: division,
        user_name: userName,
        date: workout.date,
      };

      const { error } = await (supabase.from('shared_workout_cards' as never) as unknown as {
        insert: (row: object) => Promise<{ error: unknown }>;
      }).insert({
        user_id: user.id,
        workout_id: workout.id,
        card_data: cardData,
        share_token: shareToken,
        view_count: 0,
      });

      if (error) throw error;

      const url = `${window.location.origin}/share/${shareToken}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 3000);
    } catch (err) {
      console.error('[ShareWorkoutCard] share error:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const copyUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Visual card */}
      <div
        className="relative rounded-[20px] overflow-hidden border p-5"
        style={{
          background: 'linear-gradient(135deg, #0A0E14 0%, #0E1520 100%)',
          borderColor: `${tierStyle.accent}40`,
          boxShadow: `0 0 40px ${tierStyle.glow}`,
        }}
      >
        {/* Glow blob */}
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[60px] pointer-events-none"
          style={{ background: tierStyle.glow }}
        />

        {/* Top: user + rank */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] text-text-3 uppercase tracking-widest font-medium mb-0.5">
              Workout Complete
            </p>
            <p className="text-[17px] font-bold text-text-1">{userName}</p>
          </div>
          <div
            className="px-3 py-1.5 rounded-[10px] text-[12px] font-bold uppercase tracking-wide"
            style={{
              color: tierStyle.text,
              background: `${tierStyle.accent}18`,
              border: `1px solid ${tierStyle.accent}40`,
            }}
          >
            {tier} {division != null ? `D${division}` : ''}
          </div>
        </div>

        {/* Workout name */}
        <p
          className="relative z-10 text-[22px] font-extrabold mb-3 tracking-tight"
          style={{ color: tierStyle.accent }}
        >
          {workout.name}
        </p>

        {/* Stats row */}
        <div className="relative z-10 flex items-center gap-4 mb-4">
          {workout.duration != null && (
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-text-3" />
              <span className="text-[13px] text-text-2">{Math.round(workout.duration)} min</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Flame size={13} className="text-text-3" />
            <span className="text-[13px] text-text-2">{formatVolume(totalVolume)} volume</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Dumbbell size={13} className="text-text-3" />
            <span className="text-[13px] text-text-2">{workout.exercises.length} exercises</span>
          </div>
          {prCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Trophy size={13} style={{ color: tierStyle.accent }} />
              <span className="text-[13px]" style={{ color: tierStyle.accent }}>
                {prCount} PR{prCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Exercise list */}
        {exerciseSummary.length > 0 && (
          <div className="relative z-10 flex flex-col gap-1.5">
            {exerciseSummary.map((ex, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[13px] text-text-2 truncate max-w-[60%]">{ex.name}</span>
                <span className="text-[12px] text-text-3">
                  {ex.sets} sets
                  {ex.best_weight > 0 && ` · ${ex.best_weight} kg`}
                </span>
              </div>
            ))}
            {workout.exercises.length > 5 && (
              <p className="text-[11px] text-text-3 mt-0.5">
                +{workout.exercises.length - 5} more exercises
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="relative z-10 mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-text-3">
            {new Date(workout.date).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </span>
          <span
            className="text-[11px] font-bold"
            style={{ color: tierStyle.accent }}
          >
            AdaptiveFit AI
          </span>
        </div>
      </div>

      {/* Share button / URL */}
      {shareUrl ? (
        <div className="flex items-center gap-2 bg-surface-1 border border-border rounded-[14px] px-4 py-3">
          <p className="flex-1 text-[13px] text-text-2 font-mono truncate">{shareUrl}</p>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-primary/15 text-primary text-[13px] font-semibold hover:bg-primary/25 transition-colors flex-shrink-0"
          >
            {urlCopied ? (
              <>
                <Check size={13} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={13} />
                Copy
              </>
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={handleShare}
          disabled={isSharing || !user}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] bg-primary text-canvas text-[15px] font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSharing ? (
            <>
              <div className="w-4 h-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />
              Sharing…
            </>
          ) : (
            <>
              <Share2 size={16} />
              Share Workout
            </>
          )}
        </button>
      )}
    </div>
  );
}

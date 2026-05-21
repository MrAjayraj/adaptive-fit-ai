import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFighterProfile,
  saveFighterProfile,
  getUserProgress,
  getRecentTechniques,
  getSessionHistory,
  getWeeklyReps,
  getWeeklyStats,
  getWeeklyRepChart,
  logSession
} from './mmaService';

describe('MMA Skills Guest Mode Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initially return null for getFighterProfile("guest")', async () => {
    const profile = await getFighterProfile('guest');
    expect(profile).toBeNull();
  });

  it('should save and fetch fighter profile for guest', async () => {
    const saved = await saveFighterProfile({
      user_id: 'guest',
      primary_sport_slug: 'boxing',
      experience_level: 'beginner',
      stance: 'Orthodox',
      onboarding_complete: true,
    });

    expect(saved).not.toBeNull();
    expect(saved?.user_id).toBe('guest');
    expect(saved?.primary_sport_slug).toBe('boxing');
    expect(saved?.onboarding_complete).toBe(true);

    const fetched = await getFighterProfile('guest');
    expect(fetched).not.toBeNull();
    expect(fetched?.primary_sport_slug).toBe('boxing');
  });

  it('should log sessions, update reps, and increment streaks locally', async () => {
    // 1. Establish guest profile first
    await saveFighterProfile({
      user_id: 'guest',
      primary_sport_slug: 'boxing',
      experience_level: 'beginner',
      stance: 'Orthodox',
      onboarding_complete: true,
    });

    // 2. Log first session (10 reps * 3 sets = 30 reps)
    const techId = 'tech-jab-123';
    const logResult = await logSession(
      'guest',
      techId,
      10, // reps
      3,  // sets
      'shadowboxing',
      'medium',
      'First training log'
    );

    expect(logResult).not.toBeNull();
    expect(logResult?.totalReps).toBe(30);
    expect(logResult?.newLevel).toBe(1);
    expect(logResult?.leveledUp).toBe(false);

    // 3. Verify user progress
    const progressMap = await getUserProgress('guest');
    expect(progressMap[techId]).toBeDefined();
    expect(progressMap[techId].total_reps).toBe(30);
    expect(progressMap[techId].mastery_level).toBe(1);

    // 4. Verify recent techniques
    const recentIds = await getRecentTechniques('guest', 7);
    expect(recentIds).toContain(techId);

    // 5. Verify session logs
    const history = await getSessionHistory('guest', techId);
    expect(history.length).toBe(1);
    expect(history[0].reps).toBe(10);
    expect(history[0].sets).toBe(3);

    // 6. Verify weekly stats
    const weeklyReps = await getWeeklyReps('guest');
    expect(weeklyReps).toBe(30);

    const weeklyStats = await getWeeklyStats('guest');
    expect(weeklyStats.sessions).toBe(1);
    expect(weeklyStats.reps).toBe(30);

    const repChart = await getWeeklyRepChart('guest', 8);
    expect(repChart[7]).toBe(30);

    // 7. Verify profile streak increments
    const updatedProfile = await getFighterProfile('guest');
    expect(updatedProfile?.streak_current).toBe(1);

    // 8. Log second session to trigger mastery level up (Level 2 requires 100 reps; logging 80 reps * 1 set = 80 reps -> total 110 reps)
    const levelUpResult = await logSession(
      'guest',
      techId,
      80,
      1,
      'heavy_bag',
      'hard',
      'Mastery level up test'
    );

    expect(levelUpResult).not.toBeNull();
    expect(levelUpResult?.totalReps).toBe(110);
    expect(levelUpResult?.newLevel).toBe(2);
    expect(levelUpResult?.leveledUp).toBe(true);
  });
});

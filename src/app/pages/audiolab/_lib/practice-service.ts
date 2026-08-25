/**
 * AUDIOLAB PRACTICE SERVICE
 * 
 * Practice progress tracking
 * Handles: session tracking, streaks, XP, weekly stats
 */

import type { 
  PracticeProgress, 
  PracticeMode,
  PracticeStats 
} from '../_types';

// Level thresholds
const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000,
  17000, 23000, 30000, 40000, 52000, 67000, 85000, 107000, 135000, 170000
];

// SESSION TRACKING

/**
 * Start a new practice session
 */
export async function startSession(
  userId: string, 
  songId: string, 
  mode: PracticeMode
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  console.warn('[migration] practice-service.ts: startSession — no JWT API route yet');
  void userId;
  void songId;
  void mode;
  return { success: false, error: 'Practice session start unavailable during migration' };
}

/**
 * End a practice session and update progress
 */
export async function endSession(
  sessionId: string, 
  stats: { score: number; accuracy: number; streak: number; duration: number }
): Promise<{ success: boolean; xpEarned?: number; error?: string }> {
  console.warn('[migration] practice-service.ts: endSession — no JWT API route yet');
  void sessionId;
  void stats;
  return { success: false, error: 'Practice session end unavailable during migration' };
}

// PROGRESS TRACKING

/**
 * Get user's practice progress
 */
export async function getUserProgress(userId: string): Promise<PracticeProgress | null> {
  console.warn('[migration] practice-service.ts: getUserProgress — no JWT API route yet');
  return createInitialProgress(userId);
}

/**
 * Get weekly stats for a user
 */
export async function getWeeklyStats(userId: string): Promise<{
  minutesPracticed: number;
  sessionsCompleted: number;
  averageScore: number;
  averageAccuracy: number;
  dailyBreakdown: { day: string; minutes: number }[];
}> {
  console.warn('[migration] practice-service.ts: getWeeklyStats — no JWT API route yet');
  void userId;
  return {
    minutesPracticed: 0,
    sessionsCompleted: 0,
    averageScore: 0,
    averageAccuracy: 0,
    dailyBreakdown: []
  };
}

/**
 * Update streak (call daily to check for broken streaks)
 */
export async function updateStreak(userId: string): Promise<number> {
  console.warn('[migration] practice-service.ts: updateStreak — no JWT API route yet');
  void userId;
  return 0;
}

/**
 * Reset weekly progress (call at start of each week)
 */
export async function resetWeeklyProgress(userId: string): Promise<void> {
  console.warn('[migration] practice-service.ts: resetWeeklyProgress — no JWT API route yet');
  void userId;
}

// LEADERBOARD

/**
 * Get top users by XP
 */
export async function getLeaderboard(limitCount: number = 10): Promise<{
  userId: string;
  xp: number;
  level: number;
  totalSessions: number;
}[]> {
  console.warn('[migration] practice-service.ts: getLeaderboard — no JWT API route yet');
  void limitCount;
  return [];
}

// HELPER FUNCTIONS

/**
 * Create initial progress for a new user
 */
function createInitialProgress(userId: string): PracticeProgress {
  return {
    userId,
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: '',
    weeklyTarget: 60, // 60 minutes per week default
    weeklyProgress: 0,
    totalSessions: 0,
    totalMinutes: 0,
    averageScore: 0,
    averageAccuracy: 0,
    xp: 0,
    level: 1,
    updatedAt: new Date()
  };
}

/**
 * Calculate level from XP
 */
function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Get XP needed for next level
 */
export function getXpForNextLevel(currentXp: number): { current: number; needed: number; progress: number } {
  const level = calculateLevel(currentXp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  
  const xpInLevel = currentXp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = Math.round((xpInLevel / xpNeeded) * 100);
  
  return {
    current: xpInLevel,
    needed: xpNeeded,
    progress
  };
}

/**
 * Convert progress to PracticeStats (for UI)
 */
export function progressToStats(progress: PracticeProgress): PracticeStats {
  return {
    score: progress.averageScore,
    accuracy: progress.averageAccuracy,
    streak: progress.currentStreak,
    hitRate: progress.averageAccuracy,
    sessionsCompleted: progress.totalSessions,
    weeklyProgress: Math.round((progress.weeklyProgress / progress.weeklyTarget) * 100)
  };
}

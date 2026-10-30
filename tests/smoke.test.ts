import { describe, it, expect } from 'vitest';
import { ChallengeTemplateEnum, PlayerProfileSchema } from '@wake/shared';

describe('Scaffold & Shared Types Smoke Test', () => {
  it('validates challenge template enum values', () => {
    const templates = ChallengeTemplateEnum.options;
    expect(templates).toContain('wordle');
    expect(templates).toContain('blackjack');
    expect(templates).toContain('cipher');
    expect(templates).toContain('simon');
    expect(templates).toContain('dark_maze');
  });

  it('validates player profile schema parsing', () => {
    const profile = PlayerProfileSchema.parse({
      sessionId: 'test-session',
      totalPlayTimeMs: 12000,
      typingSpeedWpm: 60,
      commandIdleTimeAvgMs: 1500,
      deaths: 1,
      mistakesTotal: 2,
      hintsUsedTotal: 0,
      roomsRevisitedCount: 1,
      itemsIgnoredCount: 0,
      solveTimesByTemplate: {},
      tags: ['cautious']
    });

    expect(profile.sessionId).toBe('test-session');
    expect(profile.tags).toContain('cautious');
  });
});

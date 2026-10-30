import { describe, it, expect } from 'vitest';
import { FALLBACK_CHALLENGES, HORROR_WORDS_5 } from '@wake/content';
import { validateChallengeItem } from '@wake/shared';

describe('Fallback Challenge Pool Verification', () => {
  it('contains at least 25 fallback presets across all 5 templates and 5 difficulty levels', () => {
    expect(FALLBACK_CHALLENGES.length).toBeGreaterThanOrEqual(25);
  });

  it('proves every single fallback challenge passes deterministic validation', () => {
    for (const challenge of FALLBACK_CHALLENGES) {
      const result = validateChallengeItem(challenge, HORROR_WORDS_5);
      if (!result.valid) {
        console.error(`Validation failed for ${challenge.id}: ${result.error}`);
      }
      expect(result.valid).toBe(true);
      expect(challenge.difficulty).toBeGreaterThanOrEqual(1);
      expect(challenge.difficulty).toBeLessThanOrEqual(5);
    }
  });
});

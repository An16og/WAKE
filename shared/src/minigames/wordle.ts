import { WordleParams, WordleParamsSchema } from '../types.js';

export interface LetterFeedback {
  letter: string;
  status: 'correct' | 'present' | 'absent';
}

export function validateWordleParams(
  params: unknown,
  allowedWordsList?: string[]
): { valid: boolean; error?: string; data?: WordleParams } {
  const parsed = WordleParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { valid: false, error: parsed.error.message };
  }

  const upper = parsed.data.targetWord.toUpperCase();
  if (upper.length !== 5 || !/^[A-Z]{5}$/.test(upper)) {
    return { valid: false, error: `targetWord must be exactly 5 alphabetic letters, got "${upper}"` };
  }

  if (allowedWordsList && allowedWordsList.length > 0) {
    const exists = allowedWordsList.some((w) => w.toUpperCase() === upper);
    if (!exists) {
      return { valid: false, error: `targetWord "${upper}" is not in the recognized word list` };
    }
  }

  return {
    valid: true,
    data: {
      ...parsed.data,
      targetWord: upper
    }
  };
}

export function evaluateWordleGuess(target: string, guess: string): LetterFeedback[] {
  const t = target.toUpperCase();
  const g = guess.toUpperCase();
  const result: LetterFeedback[] = new Array(5);
  const targetLetterCounts: Record<string, number> = {};

  for (let i = 0; i < 5; i++) {
    const char = t[i];
    targetLetterCounts[char] = (targetLetterCounts[char] || 0) + 1;
  }

  // Pass 1: find correct letters (green)
  for (let i = 0; i < 5; i++) {
    if (g[i] === t[i]) {
      result[i] = { letter: g[i], status: 'correct' };
      targetLetterCounts[g[i]]--;
    }
  }

  // Pass 2: find present (yellow) and absent (gray)
  for (let i = 0; i < 5; i++) {
    if (result[i]) continue;
    const char = g[i];
    if (targetLetterCounts[char] && targetLetterCounts[char] > 0) {
      result[i] = { letter: char, status: 'present' };
      targetLetterCounts[char]--;
    } else {
      result[i] = { letter: char, status: 'absent' };
    }
  }

  return result;
}

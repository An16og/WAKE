export * from './wordle.js';
export * from './blackjack.js';
export * from './cipher.js';
export * from './simon.js';
export * from './dark_maze.js';

import { ChallengeItem } from '../types.js';
import { validateWordleParams } from './wordle.js';
import { validateBlackjackParams } from './blackjack.js';
import { validateCipherParams } from './cipher.js';
import { validateSimonParams } from './simon.js';
import { validateDarkMazeParams } from './dark_maze.js';

export function validateChallengeItem(
  challenge: ChallengeItem,
  allowedWordsList?: string[]
): { valid: boolean; error?: string } {
  switch (challenge.template) {
    case 'wordle':
      return validateWordleParams(challenge.params, allowedWordsList);
    case 'blackjack':
      return validateBlackjackParams(challenge.params);
    case 'cipher':
      return validateCipherParams(challenge.params);
    case 'simon':
      return validateSimonParams(challenge.params);
    case 'dark_maze':
      return validateDarkMazeParams(challenge.params);
    default:
      return { valid: false, error: `Unknown challenge template: ${(challenge as any).template}` };
  }
}

import { BlackjackParams, BlackjackParamsSchema } from '../types.js';

export interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string; // '2'-'10', 'J', 'Q', 'K', 'A'
  points: number[]; // e.g. Ace can be [1, 11]
}

export function validateBlackjackParams(
  params: unknown
): { valid: boolean; error?: string; data?: BlackjackParams } {
  const parsed = BlackjackParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { valid: false, error: parsed.error.message };
  }

  if (parsed.data.targetPoints < 1 || parsed.data.targetPoints > 3) {
    return { valid: false, error: 'targetPoints must be between 1 and 3' };
  }
  if (parsed.data.stakeDistance < 1 || parsed.data.stakeDistance > 3) {
    return { valid: false, error: 'stakeDistance must be between 1 and 3' };
  }

  return { valid: true, data: parsed.data };
}

export function createDeck(): Card[] {
  const suits: Card['suit'][] = ['♠', '♥', '♦', '♣'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (const s of suits) {
    for (const v of values) {
      if (v === 'A') {
        deck.push({ suit: s, value: v, points: [1, 11] });
      } else if (['K', 'Q', 'J'].includes(v)) {
        deck.push({ suit: s, value: v, points: [10] });
      } else {
        deck.push({ suit: s, value: v, points: [parseInt(v, 10)] });
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function calculateHandValue(cards: Card[]): number {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.value === 'A') {
      aces++;
      total += 11;
    } else {
      total += card.points[0];
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

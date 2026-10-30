import { describe, it, expect } from 'vitest';
import {
  validateWordleParams,
  evaluateWordleGuess,
  validateBlackjackParams,
  calculateHandValue,
  validateCipherParams,
  encryptCaesar,
  decryptCaesar,
  atbash,
  validateSimonParams,
  validateDarkMazeParams
} from '@wake/shared';

describe('Minigame 1: Wordle Validator & Engine', () => {
  const horrorWords = ['GHOST', 'DREAD', 'ICHOR', 'CRYPT', 'BLOOD'];

  it('accepts valid wordle parameters within dictionary', () => {
    const res = validateWordleParams(
      { targetWord: 'GHOST', maxAttempts: 6, hint: 'Spirit' },
      horrorWords
    );
    expect(res.valid).toBe(true);
    expect(res.data?.targetWord).toBe('GHOST');
  });

  it('rejects word not in allowed list', () => {
    const res = validateWordleParams(
      { targetWord: 'PIZZA', maxAttempts: 6 },
      horrorWords
    );
    expect(res.valid).toBe(false);
    expect(res.error).toContain('not in the recognized word list');
  });

  it('rejects non-5-letter words (adversarial)', () => {
    const res1 = validateWordleParams({ targetWord: 'LONGWORD' }, horrorWords);
    expect(res1.valid).toBe(false);

    const res2 = validateWordleParams({ targetWord: 'GH12' }, horrorWords);
    expect(res2.valid).toBe(false);
  });

  it('evaluates guesses with correct letter states', () => {
    // target: GHOST, guess: GREAT
    // G: correct, R: absent, E: absent, A: absent, T: correct
    const feedback = evaluateWordleGuess('GHOST', 'GREAT');
    expect(feedback[0]).toEqual({ letter: 'G', status: 'correct' });
    expect(feedback[1]).toEqual({ letter: 'R', status: 'absent' });
    expect(feedback[4]).toEqual({ letter: 'T', status: 'correct' });
  });
});

describe('Minigame 2: Blackjack Validator & Engine', () => {
  it('validates fair params', () => {
    const res = validateBlackjackParams({
      targetPoints: 2,
      stakeDistance: 2,
      dealerPersonality: 'cold'
    });
    expect(res.valid).toBe(true);
  });

  it('rejects out of bounds stakes (adversarial)', () => {
    const res = validateBlackjackParams({
      targetPoints: 5,
      stakeDistance: 10
    });
    expect(res.valid).toBe(false);
  });

  it('accurately calculates blackjack hand values with flexible Aces', () => {
    const hand = [
      { suit: '♠' as const, value: 'A', points: [1, 11] },
      { suit: '♥' as const, value: '8', points: [8] }
    ];
    expect(calculateHandValue(hand)).toBe(19);

    // Add 5 -> 19 + 5 = 24 -> Ace reduces to 1 -> 14
    hand.push({ suit: '♦' as const, value: '5', points: [5] });
    expect(calculateHandValue(hand)).toBe(14);
  });
});

describe('Minigame 3: Cipher Validator & Engine', () => {
  it('validates Caesar cipher with matching shift and plaintext', () => {
    const plain = 'WAKE';
    const cipher = encryptCaesar(plain, 3);
    const res = validateCipherParams({
      cipherType: 'caesar',
      ciphertext: cipher,
      plaintext: plain,
      shift: 3
    });
    expect(res.valid).toBe(true);
  });

  it('rejects Caesar cipher with falsified plaintext (adversarial)', () => {
    const res = validateCipherParams({
      cipherType: 'caesar',
      ciphertext: 'ZDNH', // WAKE shifted 3
      plaintext: 'SLEEP', // incorrect
      shift: 3
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Caesar decryption failed');
  });

  it('validates Atbash mirror cipher', () => {
    const plain = 'HELL';
    const cipher = atbash(plain);
    const res = validateCipherParams({
      cipherType: 'atbash',
      ciphertext: cipher,
      plaintext: plain
    });
    expect(res.valid).toBe(true);
  });
});

describe('Minigame 4: Simon Validator', () => {
  it('validates legitimate sequences', () => {
    const res = validateSimonParams({
      sequence: ['^', 'v', '<', '>'],
      displaySpeedMs: 700
    });
    expect(res.valid).toBe(true);
  });

  it('rejects sequence too short or containing empty strings (adversarial)', () => {
    const res1 = validateSimonParams({ sequence: ['^', 'v'] });
    expect(res1.valid).toBe(false);

    const res2 = validateSimonParams({ sequence: ['^', '', '>'] });
    expect(res2.valid).toBe(false);
  });
});

describe('Minigame 5: Dark Maze Validator & BFS Reachability', () => {
  it('validates reachable maze within move budget', () => {
    const maze = {
      width: 5,
      height: 5,
      visionRadius: 2,
      moveBudget: 10,
      grid: [
        "#####",
        "#S..#",
        "###.#",
        "#..E#",
        "#####"
      ],
      start: [1, 1] as [number, number],
      exit: [3, 3] as [number, number]
    };

    const res = validateDarkMazeParams(maze);
    expect(res.valid).toBe(true);
    expect(res.shortestPathLength).toBe(4);
  });

  it('rejects impossible maze with blocked wall / no path (adversarial)', () => {
    const maze = {
      width: 5,
      height: 5,
      visionRadius: 2,
      moveBudget: 15,
      grid: [
        "#####",
        "#S#.#",
        "#####", // impassable wall completely sealing exit
        "#..E#",
        "#####"
      ],
      start: [1, 1] as [number, number],
      exit: [3, 3] as [number, number]
    };

    const res = validateDarkMazeParams(maze);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('No reachable path exists');
  });

  it('rejects maze where shortest path exceeds move budget (adversarial)', () => {
    // S-curve maze with shortest path of 12 steps, but budget set to 10
    const maze = {
      width: 7,
      height: 7,
      visionRadius: 2,
      moveBudget: 10,
      grid: [
        "#######",
        "#S....#",
        "#####.#",
        "#.....#",
        "#.#####",
        "#....E#",
        "#######"
      ],
      start: [1, 1] as [number, number],
      exit: [5, 5] as [number, number]
    };

    const res = validateDarkMazeParams(maze);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('exceeds moveBudget');
  });
});

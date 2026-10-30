import { describe, it, expect } from 'vitest';
import { QueueSlot, DirectorResponseSchema, ChallengeItem } from '@wake/shared';
import { FALLBACK_CHALLENGES } from '@wake/content';

class LookaheadQueue {
  private slots: QueueSlot[] = [];
  private capacity: number;

  constructor(capacity = 3) {
    this.capacity = capacity;
    for (let i = 0; i < capacity; i++) {
      this.slots.push({
        index: i,
        template: 'wordle',
        difficulty: 1,
        status: 'queued',
        source: 'fallback'
      });
    }
  }

  public getSlots(): QueueSlot[] {
    return this.slots;
  }

  public fillBatch(challenges: ChallengeItem[], source: 'director' | 'fallback'): void {
    for (let i = 0; i < Math.min(challenges.length, this.capacity); i++) {
      this.slots[i] = {
        index: i,
        template: challenges[i].template,
        difficulty: challenges[i].difficulty,
        status: 'validated',
        challenge: challenges[i],
        source,
        generatedAt: Date.now()
      };
    }
  }

  public popNextChallenge(): ChallengeItem | null {
    if (this.slots.length === 0) return null;
    const nextSlot = this.slots.shift();
    // Replenish empty slot
    this.slots.push({
      index: this.capacity - 1,
      template: 'wordle',
      difficulty: 1,
      status: 'queued',
      source: 'fallback'
    });
    return nextSlot?.challenge || null;
  }
}

describe('Lookahead Queue Engine', () => {
  it('initializes with expected capacity of queued slots', () => {
    const queue = new LookaheadQueue(3);
    expect(queue.getSlots().length).toBe(3);
    expect(queue.getSlots()[0].status).toBe('queued');
  });

  it('populates validated challenges into slots', () => {
    const queue = new LookaheadQueue(3);
    const mockBatch: ChallengeItem[] = [
      FALLBACK_CHALLENGES[0],
      FALLBACK_CHALLENGES[5],
      FALLBACK_CHALLENGES[10]
    ];

    queue.fillBatch(mockBatch, 'director');
    const slots = queue.getSlots();
    expect(slots[0].status).toBe('validated');
    expect(slots[0].challenge?.template).toBe(mockBatch[0].template);
    expect(slots[0].source).toBe('director');
  });

  it('pops next challenge while replenishing slot', () => {
    const queue = new LookaheadQueue(3);
    const mockBatch: ChallengeItem[] = [
      FALLBACK_CHALLENGES[0],
      FALLBACK_CHALLENGES[1],
      FALLBACK_CHALLENGES[2]
    ];

    queue.fillBatch(mockBatch, 'director');
    const popped = queue.popNextChallenge();
    expect(popped?.id).toBe(mockBatch[0].id);
    expect(queue.getSlots().length).toBe(3);
  });
});

describe('Director Response Schema Parsing', () => {
  it('parses valid director JSON structure', () => {
    const validJson = {
      next_challenges: [
        {
          template: 'wordle',
          difficulty: 3,
          params: { targetWord: 'DREAD', maxAttempts: 6 },
          hint: 'The crushing weight'
        }
      ],
      narration: ['Cold footsteps drag behind you.'],
      taunts: ['You stood still for {avg_think_s}.'],
      difficulty_adjust: { wordle: 3 }
    };

    const parsed = DirectorResponseSchema.parse(validJson);
    expect(parsed.next_challenges.length).toBe(1);
    expect(parsed.taunts[0]).toContain('{avg_think_s}');
  });
});

import { z } from 'zod';

export type ProviderType = 'ollama' | 'openai_compat' | 'none';

export const ChallengeTemplateEnum = z.enum([
  'bandersnatch',
  'wordle',
  'blackjack',
  'cipher',
  'simon',
  'dark_maze'
]);
export type ChallengeTemplate = z.infer<typeof ChallengeTemplateEnum>;

// Minigame 1: Wordle-style
export const WordleParamsSchema = z.object({
  targetWord: z.string().length(5),
  maxAttempts: z.number().int().min(4).max(8).default(6),
  hint: z.string().default('')
});
export type WordleParams = z.infer<typeof WordleParamsSchema>;

// Minigame 2: Blackjack vs the Thing
export const BlackjackParamsSchema = z.object({
  targetPoints: z.number().int().min(1).max(3).default(1), // rounds to win
  stakeDistance: z.number().int().min(1).max(3).default(1),
  dealerPersonality: z.string().default('mocking'),
  initialTaunt: z.string().default('Let us see if luck favors the condemned.')
});
export type BlackjackParams = z.infer<typeof BlackjackParamsSchema>;

// Minigame 3: Cipher / Decrypt
export const CipherTypeEnum = z.enum(['caesar', 'substitution', 'atbash']);
export type CipherType = z.infer<typeof CipherTypeEnum>;

export const CipherParamsSchema = z.object({
  cipherType: CipherTypeEnum,
  ciphertext: z.string().min(3),
  plaintext: z.string().min(3),
  shift: z.number().int().optional(),
  hint: z.string().default('')
});
export type CipherParams = z.infer<typeof CipherParamsSchema>;

// Minigame 4: Memory sequence (Simon)
export const SimonParamsSchema = z.object({
  sequence: z.array(z.string().min(1)).min(3).max(8),
  displaySpeedMs: z.number().int().min(400).max(1500).default(800),
  hint: z.string().default('')
});
export type SimonParams = z.infer<typeof SimonParamsSchema>;

// Minigame 5: Dark maze
export const DarkMazeParamsSchema = z.object({
  width: z.number().int().min(5).max(15),
  height: z.number().int().min(5).max(15),
  visionRadius: z.number().int().min(1).max(4).default(2),
  moveBudget: z.number().int().min(10).max(60),
  grid: z.array(z.string()), // lines of '#' and ' '
  start: z.tuple([z.number().int(), z.number().int()]),
  exit: z.tuple([z.number().int(), z.number().int()]),
  hint: z.string().default('')
});
export type DarkMazeParams = z.infer<typeof DarkMazeParamsSchema>;

// Minigame 6: Bandersnatch Timed Dilemma
export const BandersnatchChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  consequence: z.string(),
  distanceDelta: z.number().int().default(0),
  nextRoomId: z.string().optional(),
  branchId: z.enum(['meta', 'beast']).optional(),
  sanityDelta: z.number().int().default(0),
  requiredItem: z.string().optional()
});
export type BandersnatchChoice = z.infer<typeof BandersnatchChoiceSchema>;

export const BandersnatchParamsSchema = z.object({
  scenario: z.string(),
  timeLimitSec: z.number().int().min(4).max(20).default(10),
  choices: z.array(BandersnatchChoiceSchema).min(2).max(4),
  defaultChoiceIndex: z.number().int().default(0),
  hint: z.string().default('')
});
export type BandersnatchParams = z.infer<typeof BandersnatchParamsSchema>;

export const ChallengeParamsSchema = z.union([
  WordleParamsSchema,
  BlackjackParamsSchema,
  CipherParamsSchema,
  SimonParamsSchema,
  DarkMazeParamsSchema,
  BandersnatchParamsSchema
]);

export const ChallengeItemSchema = z.object({
  id: z.string(),
  template: ChallengeTemplateEnum,
  difficulty: z.number().int().min(1).max(5),
  params: z.record(z.any()),
  hint: z.string().default('')
});
export type ChallengeItem = z.infer<typeof ChallengeItemSchema>;

export const PlayerProfileSchema = z.object({
  sessionId: z.string(),
  totalPlayTimeMs: z.number().default(0),
  typingSpeedWpm: z.number().default(0),
  commandIdleTimeAvgMs: z.number().default(0),
  deaths: z.number().default(0),
  mistakesTotal: z.number().default(0),
  hintsUsedTotal: z.number().default(0),
  roomsRevisitedCount: z.number().default(0),
  itemsIgnoredCount: z.number().default(0),
  solveTimesByTemplate: z.record(z.array(z.number())).default({}),
  tags: z.array(z.string()).default([]),
  recentMistake: z.string().optional()
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

export const DirectorChallengeProposalSchema = z.object({
  template: ChallengeTemplateEnum,
  difficulty: z.number().int().min(1).max(5),
  params: z.record(z.any()),
  hint: z.string().default('')
});

export const DirectorResponseSchema = z.object({
  next_challenges: z.array(DirectorChallengeProposalSchema).default([]),
  narration: z.array(z.string()).default([]),
  taunts: z.array(z.string()).default([]),
  difficulty_adjust: z.record(z.number()).default({})
});
export type DirectorResponse = z.infer<typeof DirectorResponseSchema>;

export const QueueSlotStatusEnum = z.enum([
  'queued',
  'generating',
  'validated',
  'fallback'
]);
export type QueueSlotStatus = z.infer<typeof QueueSlotStatusEnum>;

export interface QueueSlot {
  index: number;
  template: ChallengeTemplate;
  difficulty: number;
  status: QueueSlotStatus;
  challenge?: ChallengeItem;
  generatedAt?: number;
  source: 'director' | 'fallback';
}

export interface GhostProcessStatus {
  provider: ProviderType;
  model: string;
  connected: boolean;
  lastLatencyMs: number;
  lookaheadSlots: QueueSlot[];
  activeTags: string[];
  recentLearnings: string[];
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  provider: ProviderType;
  model: string;
  providerConnected: boolean;
  version: string;
  details?: string;
}

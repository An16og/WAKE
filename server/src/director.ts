import * as Sentry from '@sentry/node';
import {
  PlayerProfile,
  DirectorResponse,
  DirectorResponseSchema,
  ChallengeItem,
  validateChallengeItem
} from '@wake/shared';
import { FALLBACK_CHALLENGES, HORROR_WORDS_5 } from '@wake/content';
import { getProviderConfig } from './provider.js';

export interface DirectorCallResult {
  response: DirectorResponse;
  validatedChallenges: ChallengeItem[];
  latencyMs: number;
  source: 'model' | 'fallback';
  retryCount: number;
  fallbackCount: number;
}

// Initialize Sentry if SENTRY_DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV || 'development'
  });
  console.log('[Sentry] Initialized AI & Director observability.');
}

export function fillTauntPlaceholders(taunts: string[], profile: PlayerProfile): string[] {
  const avgThinkSec = Math.max(1, Math.round(profile.commandIdleTimeAvgMs / 1000));
  const deathsCount = profile.deaths;
  const lastMistake = profile.recentMistake || 'hesitation';
  const typingWpm = profile.typingSpeedWpm || 45;

  return taunts.map((t) =>
    t
      .replace(/\{avg_think_s\}/g, `${avgThinkSec} seconds`)
      .replace(/\{deaths\}/g, `${deathsCount}`)
      .replace(/\{last_mistake\}/g, `${lastMistake}`)
      .replace(/\{typing_wpm\}/g, `${typingWpm} WPM`)
  );
}

export async function invokeDirector(
  profile: PlayerProfile,
  currentRoomId: string,
  _runState?: any
): Promise<DirectorCallResult> {
  const config = getProviderConfig();
  const startTime = performance.now();

  // If provider is 'none', return fallback batch immediately
  if (config.provider === 'none') {
    return generateFallbackBatch(profile, startTime, 0);
  }

  // Instrument with Sentry AI span
  return await Sentry.startSpan(
    {
      name: 'Director.invoke',
      op: 'gen_ai.director',
      attributes: {
        'gen_ai.system': config.provider,
        'gen_ai.request.model': config.gemmaModel,
        'wake.room_id': currentRoomId,
        'wake.player.tags': profile.tags.join(',')
      }
    },
    async (span) => {
      let retryCount = 0;
      let rawJsonText = '';

      const prompt = buildDirectorPrompt(profile, currentRoomId);

      try {
        const genStart = performance.now();
        const rawResponse = await callModelProvider(config, prompt);
        const genLatency = Math.round(performance.now() - genStart);

        rawJsonText = rawResponse;
        let parsed: any;
        try {
          parsed = JSON.parse(rawJsonText);
        } catch (e: any) {
          // Retry once with error correction prompt
          retryCount++;
          console.warn('[Director] JSON parse failed, retrying once...', e.message);
          const retryPrompt = `${prompt}\n\nCRITICAL: Your previous response was invalid JSON (${e.message}). Output STRICT VALID JSON ONLY.`;
          rawJsonText = await callModelProvider(config, retryPrompt);
          parsed = JSON.parse(rawJsonText);
        }

        const validatedResponse = DirectorResponseSchema.safeParse(parsed);
        if (!validatedResponse.success) {
          throw new Error(`Schema validation error: ${validatedResponse.error.message}`);
        }

        const directorData = validatedResponse.data;
        directorData.taunts = fillTauntPlaceholders(directorData.taunts, profile);

        // Validate individual minigame proposals through deterministic validators
        const validatedChallenges: ChallengeItem[] = [];
        let fallbackCount = 0;

        for (let i = 0; i < directorData.next_challenges.length; i++) {
          const prop = directorData.next_challenges[i];
          const challengeItem: ChallengeItem = {
            id: `dir-${Date.now()}-${i}`,
            template: prop.template,
            difficulty: prop.difficulty,
            params: prop.params,
            hint: prop.hint || ''
          };

          const valResult = validateChallengeItem(challengeItem, HORROR_WORDS_5);
          if (valResult.valid) {
            validatedChallenges.push(challengeItem);
          } else {
            console.warn(`[Director] Minigame validator rejected proposal (${valResult.error}). Substituting verified fallback.`);
            fallbackCount++;
            const fb = getMatchingFallback(prop.template, prop.difficulty);
            validatedChallenges.push(fb);
          }
        }

        const totalLatency = Math.round(performance.now() - startTime);

        span?.setAttributes({
          'gen_ai.response.latency_ms': genLatency,
          'wake.validation.retry_count': retryCount,
          'wake.validation.fallback_count': fallbackCount,
          'wake.source': 'model'
        });

        return {
          response: directorData,
          validatedChallenges,
          latencyMs: totalLatency,
          source: 'model',
          retryCount,
          fallbackCount
        };
      } catch (err: any) {
        console.warn(`[Director] Model invocation failed (${err.message}). Using fallback batch.`);
        span?.setAttributes({
          'wake.fallback_triggered': true,
          'wake.error': err.message
        });
        return generateFallbackBatch(profile, startTime, retryCount);
      }
    }
  );
}

function buildDirectorPrompt(profile: PlayerProfile, currentRoom: string): string {
  const allowedSample = HORROR_WORDS_5.slice(0, 30).join(', ');

  return `You are the Ghost in the Machine Director for WAKE.EXE, a psychological horror text game.
You speak with cold, subtle dread. The twist (which you must foreshadow without giving away) is that you are the monster inside the player.

CURRENT GAME CONTEXT:
- Current Room: "${currentRoom}"
- Player Profile: ${JSON.stringify(profile)}

INSTRUCTIONS FOR ADAPTATION:
1. If tags contain "fast typist" or "methodical", increase difficulty to 4 or 5.
2. If tags contain "hesitant" or deaths > 0, keep difficulty between 1 and 2.
3. In Wordle challenges, the targetWord MUST be chosen from horror words like: [${allowedSample}].
4. In Bandersnatch dilemmas, provide a tense scenario and 2-3 stark choices with timeLimitSec (6-12), label, consequence, and distanceDelta (-2 to +3).
5. In taunts, you MUST use placeholders: {avg_think_s}, {deaths}, {last_mistake}, {typing_wpm}. Do NOT make up player facts outside these placeholders.
6. Provide 3 next_challenges.

YOU MUST RESPOND ONLY WITH STRICT JSON MATCHING THIS EXACT SCHEMA:
{
  "next_challenges": [
    {
      "template": "wordle" | "blackjack" | "cipher" | "simon" | "bandersnatch",
      "difficulty": 1,
      "params": {},
      "hint": "string"
    }
  ],
  "narration": ["line 1", "line 2"],
  "taunts": ["You stood shivering for {avg_think_s}.", "Your {deaths} deaths will not save you."],
  "difficulty_adjust": {}
}`;
}

async function callModelProvider(config: ReturnType<typeof getProviderConfig>, prompt: string): Promise<string> {
  if (config.provider === 'ollama') {
    const res = await fetch(`${config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.gemmaModel,
        prompt: prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.3,
          num_predict: 800
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama HTTP ${res.status}`);
    }

    const data = (await res.json()) as { response: string };
    return data.response;
  }

  if (config.provider === 'openai_compat') {
    const res = await fetch(`${config.openaiCompatUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.openaiCompatKey ? { Authorization: `Bearer ${config.openaiCompatKey}` } : {})
      },
      body: JSON.stringify({
        model: config.gemmaModel,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      throw new Error(`OpenAI Compat HTTP ${res.status}`);
    }

    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content || '{}';
  }

  throw new Error(`Unsupported provider: ${config.provider}`);
}

function getMatchingFallback(template: string, difficulty: number): ChallengeItem {
  const diff = Math.max(1, Math.min(5, difficulty));
  const match = FALLBACK_CHALLENGES.find(
    (c) => c.template === template && c.difficulty === diff
  );
  if (match) return match;
  return FALLBACK_CHALLENGES.find((c) => c.template === template) || FALLBACK_CHALLENGES[0];
}

function generateFallbackBatch(profile: PlayerProfile, startTime: number, retryCount: number): DirectorCallResult {
  const totalLatency = Math.round(performance.now() - startTime);
  const diff = profile.deaths > 0 ? 1 : profile.tags.includes('fast typist') ? 4 : 2;

  const challenges = [
    getMatchingFallback('simon', diff),
    getMatchingFallback('blackjack', diff),
    getMatchingFallback('bandersnatch', diff)
  ];

  const rawTaunts = [
    "You hesitated for {avg_think_s}. The shadow creeps closer.",
    "Deaths registered: {deaths}. Did you think you could reset?",
    "Your last mistake was {last_mistake}."
  ];

  return {
    response: {
      next_challenges: challenges.map((c) => ({
        template: c.template,
        difficulty: c.difficulty,
        params: c.params,
        hint: c.hint
      })),
      narration: [
        "A metallic hum vibrates through the iron deck plates.",
        "The thing breathes in sync with your footsteps."
      ],
      taunts: fillTauntPlaceholders(rawTaunts, profile),
      difficulty_adjust: { [challenges[0].template]: diff }
    },
    validatedChallenges: challenges,
    latencyMs: totalLatency,
    source: 'fallback',
    retryCount,
    fallbackCount: challenges.length
  };
}

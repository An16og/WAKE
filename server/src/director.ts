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

        if (parsed && typeof parsed === 'object') {
          if (!parsed.next_challenges && Array.isArray(parsed.challenges)) {
            parsed.next_challenges = parsed.challenges;
          }
          if (typeof parsed.narration === 'string') {
            parsed.narration = [parsed.narration];
          } else if (!Array.isArray(parsed.narration)) {
            parsed.narration = ["A cold presence watches from the darkness."];
          }
          if (typeof parsed.taunts === 'string') {
            parsed.taunts = [parsed.taunts];
          } else if (typeof parsed.taunt === 'string') {
            parsed.taunts = [parsed.taunt];
          } else if (!Array.isArray(parsed.taunts)) {
            parsed.taunts = ["You hesitated for {avg_think_s}."];
          }
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
  return `You are Dr. Alistair Vance, Lead Clinical Observer and Neuromorphic Director for Project WAKE.
You speak with cold, sterile clinical dread. You are running psychological experiment WAKE.EXE on Subject 09 (the player).
You are evaluating whether Subject 09 awakens into THE BEAST (visceral predatory instinct) or THE 4TH-WALL BREAK (meta-psychological realization that they are code controlled by a human at a keyboard).

CURRENT EXPERIMENT CONTEXT:
- Active Sector: "${currentRoom}"
- Subject Profile: ${JSON.stringify(profile)}

DIRECTIVES:
1. Predict and generate the NEXT 3 SEQUENTIAL BANDERSNATCH TIMED DILEMMAS ahead of the player to buffer against latency.
2. For each dilemma, provide:
   - "scenario": A tense, atmospheric 1-2 sentence split-second dilemma shaping their narrative path.
   - "timeLimitSec": Decision countdown (strictly 15 seconds).
   - "choices": 2 choices driving the story. Include "id", "label" (e.g. "A: ...", "B: ..."), "description", "consequence", "distanceDelta" (-2 to +2), "nextRoomId", "branchId" ("meta" or "beast"), and "sanityDelta" (-1 to -4).
3. In "narration", output 2 clinical psychiatric observations as Dr. Vance prefixed with "[DR. VANCE EVALUATION]". Evaluate the subject's latency, typing pace, and psychic collapse.
4. In "taunts", strictly use placeholders: {avg_think_s}, {deaths}, {last_mistake}, {typing_wpm}. Do NOT hallucinate player facts outside these placeholders.

YOU MUST RESPOND ONLY WITH STRICT JSON MATCHING THIS EXACT SCHEMA:
{
  "next_challenges": [
    {
      "template": "bandersnatch",
      "difficulty": 2,
      "params": {
        "scenario": "A pulse of static distorts the corridor. The terminal flashes an override prompt while claws scrape in the duct above.",
        "timeLimitSec": 15,
        "choices": [
          {
            "id": "c1",
            "label": "A: DECRYPT TERMINAL LOGS",
            "description": "Trace the ghost process origin in the mainframe.",
            "consequence": "Phosphor lines burn into your retinas. Dr. Vance's classified terminal log unseals!",
            "distanceDelta": 1,
            "nextRoomId": "simulation_core",
            "branchId": "meta",
            "sanityDelta": -2
          },
          {
            "id": "c2",
            "label": "B: TEAR OPEN CEILING DUCT",
            "description": "Leap upward with predatory fury and confront what breathes above.",
            "consequence": "Your hands sink into warm sinew. A guttural growl rips through your chest!",
            "distanceDelta": 2,
            "nextRoomId": "pulsing_antechamber",
            "branchId": "beast",
            "sanityDelta": -3
          }
        ],
        "defaultChoiceIndex": 0
      },
      "hint": "Decide before the countdown expires."
    }
  ],
  "narration": [
    "[DR. VANCE EVALUATION] Subject 09 displays {avg_think_s} decision hesitation. The boundary between player and simulation is degrading.",
    "[DR. VANCE TELEMETRY] Autonomic nervous system elevated. Keystrokes clocked at {typing_wpm}."
  ],
  "taunts": [
    "Subject stood motionless for {avg_think_s}. The data points accumulate.",
    "Your {deaths} recorded deaths are merely iterations in my ledger."
  ],
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

  const challenges = [
    getMatchingFallback('bandersnatch', 1),
    getMatchingFallback('bandersnatch', 2),
    getMatchingFallback('bandersnatch', 3)
  ];

  const rawTaunts = [
    "Dr. Vance note: Subject hesitated for {avg_think_s}. The shadow creeps closer.",
    "Deaths registered in ledger: {deaths}. Did you think you could reset?",
    "Subject's last behavioral anomaly was {last_mistake}."
  ];

  const rawNarration = [
    `[DR. VANCE EVALUATION] Subject 09 exhibits {avg_think_s} decision latency. Neural synapses are conforming to predictive models.`,
    `[DR. VANCE TELEMETRY] Heart rate erratic. Keystroke telemetry recorded at {typing_wpm}. The subject cannot perceive the true observer.`
  ];

  return {
    response: {
      next_challenges: challenges.map((c) => ({
        template: c.template,
        difficulty: c.difficulty,
        params: c.params,
        hint: c.hint
      })),
      narration: fillTauntPlaceholders(rawNarration, profile),
      taunts: fillTauntPlaceholders(rawTaunts, profile),
      difficulty_adjust: { bandersnatch: 1 }
    },
    validatedChallenges: challenges,
    latencyMs: totalLatency,
    source: 'fallback',
    retryCount,
    fallbackCount: challenges.length
  };
}

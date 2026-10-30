import { BandersnatchParams, BandersnatchParamsSchema } from '../types.js';

export function validateBandersnatchParams(
  params: unknown
): { valid: boolean; error?: string; data?: BandersnatchParams } {
  const parsed = BandersnatchParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { valid: false, error: parsed.error.message };
  }

  const { scenario, choices, timeLimitSec } = parsed.data;

  if (scenario.trim().length === 0) {
    return { valid: false, error: 'Scenario description cannot be empty' };
  }

  if (choices.length < 2) {
    return { valid: false, error: 'Bandersnatch must offer at least 2 distinct choices' };
  }

  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    if (!c.label || c.label.trim().length === 0) {
      return { valid: false, error: `Choice ${i + 1} label is empty` };
    }
    if (!c.consequence || c.consequence.trim().length === 0) {
      return { valid: false, error: `Choice ${i + 1} consequence is empty` };
    }
  }

  if (timeLimitSec < 4 || timeLimitSec > 25) {
    return { valid: false, error: 'timeLimitSec must be between 4 and 25 seconds' };
  }

  return { valid: true, data: parsed.data };
}

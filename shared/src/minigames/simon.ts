import { SimonParams, SimonParamsSchema } from '../types.js';

export function validateSimonParams(
  params: unknown
): { valid: boolean; error?: string; data?: SimonParams } {
  const parsed = SimonParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { valid: false, error: parsed.error.message };
  }

  const { sequence, displaySpeedMs } = parsed.data;

  if (sequence.length < 3 || sequence.length > 8) {
    return { valid: false, error: `Sequence length must be between 3 and 8 (got ${sequence.length})` };
  }

  for (let i = 0; i < sequence.length; i++) {
    if (!sequence[i] || sequence[i].trim().length === 0) {
      return { valid: false, error: `Sequence item at index ${i} is empty` };
    }
  }

  if (displaySpeedMs < 300 || displaySpeedMs > 2000) {
    return { valid: false, error: 'displaySpeedMs must be between 300 and 2000' };
  }

  return { valid: true, data: parsed.data };
}

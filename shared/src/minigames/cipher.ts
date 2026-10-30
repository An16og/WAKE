import { CipherParams, CipherParamsSchema } from '../types.js';

export function caesarShiftChar(char: string, shift: number): string {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    // Uppercase
    return String.fromCharCode(((code - 65 + shift) % 26 + 26) % 26 + 65);
  }
  if (code >= 97 && code <= 122) {
    // Lowercase
    return String.fromCharCode(((code - 97 + shift) % 26 + 26) % 26 + 97);
  }
  return char;
}

export function encryptCaesar(text: string, shift: number): string {
  return text.split('').map((c) => caesarShiftChar(c, shift)).join('');
}

export function decryptCaesar(text: string, shift: number): string {
  return encryptCaesar(text, -shift);
}

export function atbashChar(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(90 - (code - 65));
  }
  if (code >= 97 && code <= 122) {
    return String.fromCharCode(122 - (code - 97));
  }
  return char;
}

export function atbash(text: string): string {
  return text.split('').map(atbashChar).join('');
}

export function validateCipherParams(
  params: unknown
): { valid: boolean; error?: string; data?: CipherParams } {
  const parsed = CipherParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { valid: false, error: parsed.error.message };
  }

  const { cipherType, ciphertext, plaintext, shift } = parsed.data;

  if (ciphertext.trim().length === 0 || plaintext.trim().length === 0) {
    return { valid: false, error: 'ciphertext and plaintext cannot be empty' };
  }

  if (cipherType === 'caesar') {
    if (typeof shift !== 'number') {
      return { valid: false, error: 'Caesar cipher requires an integer shift parameter' };
    }
    const computedPlain = decryptCaesar(ciphertext, shift);
    if (computedPlain.toUpperCase() !== plaintext.toUpperCase()) {
      return {
        valid: false,
        error: `Caesar decryption failed: expected "${plaintext}", got "${computedPlain}" with shift ${shift}`
      };
    }
  } else if (cipherType === 'atbash') {
    const computedPlain = atbash(ciphertext);
    if (computedPlain.toUpperCase() !== plaintext.toUpperCase()) {
      return {
        valid: false,
        error: `Atbash decryption failed: expected "${plaintext}", got "${computedPlain}"`
      };
    }
  } else if (cipherType === 'substitution') {
    if (ciphertext.length !== plaintext.length) {
      return { valid: false, error: 'Substitution ciphertext must match plaintext length' };
    }
    // Verify mapping is injective
    const map: Record<string, string> = {};
    const revMap: Record<string, string> = {};
    for (let i = 0; i < ciphertext.length; i++) {
      const c = ciphertext[i].toUpperCase();
      const p = plaintext[i].toUpperCase();
      if (/[A-Z]/.test(c)) {
        if (map[c] && map[c] !== p) {
          return { valid: false, error: `Inconsistent substitution mapping for character '${c}'` };
        }
        if (revMap[p] && revMap[p] !== c) {
          return { valid: false, error: `Inconsistent substitution reverse mapping for character '${p}'` };
        }
        map[c] = p;
        revMap[p] = c;
      }
    }
  }

  return { valid: true, data: parsed.data };
}

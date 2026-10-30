import type { ProviderType, HealthResponse } from '@wake/shared';

export interface ProviderConfig {
  provider: ProviderType;
  ollamaUrl: string;
  gemmaModel: string;
  openaiCompatUrl?: string;
  openaiCompatKey?: string;
}

export function getProviderConfig(): ProviderConfig {
  const provider = (process.env.GEMMA_PROVIDER as ProviderType) || 'ollama';
  const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  const gemmaModel = process.env.GEMMA_MODEL || 'gemma3:1b';
  const openaiCompatUrl = process.env.OPENAI_COMPAT_URL;
  const openaiCompatKey = process.env.OPENAI_COMPAT_KEY;

  return {
    provider,
    ollamaUrl,
    gemmaModel,
    openaiCompatUrl,
    openaiCompatKey
  };
}

export async function checkProviderHealth(): Promise<HealthResponse> {
  const config = getProviderConfig();

  if (config.provider === 'none') {
    return {
      status: 'ok',
      provider: 'none',
      model: 'deterministic_fallback',
      providerConnected: true,
      version: '0.1.0',
      details: 'Deterministic fallback mode enabled (no AI model).'
    };
  }

  if (config.provider === 'ollama') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${config.ollamaUrl}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          status: 'degraded',
          provider: 'ollama',
          model: config.gemmaModel,
          providerConnected: false,
          version: '0.1.0',
          details: `Ollama returned HTTP ${res.status}`
        };
      }

      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const modelExists = data.models?.some(
        (m) => m.name === config.gemmaModel || m.name.startsWith(config.gemmaModel)
      );

      return {
        status: modelExists ? 'ok' : 'degraded',
        provider: 'ollama',
        model: config.gemmaModel,
        providerConnected: true,
        version: '0.1.0',
        details: modelExists
          ? `Connected to Ollama with model '${config.gemmaModel}'`
          : `Connected to Ollama, but model '${config.gemmaModel}' is not pulled yet.`
      };
    } catch (err: any) {
      return {
        status: 'degraded',
        provider: 'ollama',
        model: config.gemmaModel,
        providerConnected: false,
        version: '0.1.0',
        details: `Failed to connect to Ollama at ${config.ollamaUrl}: ${err.message}`
      };
    }
  }

  if (config.provider === 'openai_compat') {
    try {
      if (!config.openaiCompatUrl) {
        return {
          status: 'degraded',
          provider: 'openai_compat',
          model: config.gemmaModel,
          providerConnected: false,
          version: '0.1.0',
          details: 'OPENAI_COMPAT_URL not configured.'
        };
      }
      return {
        status: 'ok',
        provider: 'openai_compat',
        model: config.gemmaModel,
        providerConnected: true,
        version: '0.1.0',
        details: `OpenAI compatible provider configured at ${config.openaiCompatUrl}`
      };
    } catch (err: any) {
      return {
        status: 'degraded',
        provider: 'openai_compat',
        model: config.gemmaModel,
        providerConnected: false,
        version: '0.1.0',
        details: err.message
      };
    }
  }

  return {
    status: 'error',
    provider: 'none',
    model: 'unknown',
    providerConnected: false,
    version: '0.1.0',
    details: `Unknown provider: ${config.provider}`
  };
}

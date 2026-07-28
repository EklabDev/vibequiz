import * as vscode from 'vscode';
import type { LlmProvider } from './provider';
import { CopilotProvider } from './copilot';
import { OpenAiProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { getApiKey } from '../secrets';
import type { LlmProviderKind } from '../quiz/types';

export async function createLlmProvider(
  secrets: vscode.SecretStorage
): Promise<LlmProvider> {
  const cfg = vscode.workspace.getConfiguration('vibequiz');
  const kind = cfg.get<LlmProviderKind>('llmProvider', 'copilot');

  switch (kind) {
    case 'copilot':
      return new CopilotProvider();
    case 'openai': {
      const key = await getApiKey(secrets, 'openai');
      if (!key) {
        throw new Error(
          'OpenAI is selected but no API key is stored. Run "VibeQuiz: Set API Key".'
        );
      }
      const model = cfg.get<string>('openaiModel', 'gpt-4o');
      return new OpenAiProvider(key, model);
    }
    case 'anthropic': {
      const key = await getApiKey(secrets, 'anthropic');
      if (!key) {
        throw new Error(
          'Anthropic is selected but no API key is stored. Run "VibeQuiz: Set API Key".'
        );
      }
      const model = cfg.get<string>(
        'anthropicModel',
        'claude-sonnet-4-20250514'
      );
      return new AnthropicProvider(key, model);
    }
    default:
      throw new Error(`Unknown LLM provider: ${String(kind)}`);
  }
}

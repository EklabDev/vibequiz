import * as vscode from 'vscode';
import type { LlmProvider } from './provider';

export class CopilotProvider implements LlmProvider {
  readonly kind = 'copilot';

  async generate(
    prompt: string,
    token: vscode.CancellationToken
  ): Promise<string> {
    const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    if (models.length === 0) {
      throw new Error(
        'No Copilot language models are available. Sign in to GitHub Copilot (Enterprise), ensure Editor Preview Features / model access are enabled, or switch vibequiz.llmProvider to openai/anthropic.'
      );
    }

    // Prefer stronger models when present
    const preferred =
      models.find((m) => /gpt-4o|claude|gemini/i.test(m.family)) ?? models[0];

    const messages = [
      vscode.LanguageModelChatMessage.User(prompt),
    ];

    try {
      const response = await preferred.sendRequest(messages, {}, token);
      let text = '';
      for await (const chunk of response.text) {
        text += chunk;
      }
      if (!text.trim()) {
        throw new Error('Copilot returned an empty response.');
      }
      return text;
    } catch (err) {
      if (err instanceof vscode.LanguageModelError) {
        throw new Error(
          `Copilot Language Model error (${err.code}): ${err.message}`
        );
      }
      throw err;
    }
  }
}

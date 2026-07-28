import * as https from 'https';
import type * as vscode from 'vscode';
import type { LlmProvider } from './provider';

export class AnthropicProvider implements LlmProvider {
  readonly kind = 'anthropic';

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async generate(
    prompt: string,
    token: vscode.CancellationToken
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        'Anthropic API key is not set. Run "VibeQuiz: Set API Key".'
      );
    }

    const body = JSON.stringify({
      model: this.model,
      max_tokens: 4096,
      temperature: 0.2,
      system:
        'You generate multiple-choice quizzes about git diffs. Always reply with a single JSON object and no markdown.',
      messages: [{ role: 'user', content: prompt }],
    });

    const result = await httpsJsonRequest<{
      content?: Array<{ type: string; text?: string }>;
      error?: { message?: string };
    }>(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      body,
      token
    );

    if (result.error?.message) {
      throw new Error(`Anthropic API error: ${result.error.message}`);
    }

    const text = (result.content ?? [])
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text)
      .join('\n');

    if (!text.trim()) {
      throw new Error('Anthropic returned an empty response.');
    }
    return text;
  }
}

function httpsJsonRequest<T>(
  options: https.RequestOptions,
  body: string,
  token: vscode.CancellationToken
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (token.isCancellationRequested) {
      reject(new Error('Cancelled'));
      return;
    }

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          resolve(JSON.parse(raw) as T);
        } catch {
          reject(
            new Error(
              `Invalid JSON from Anthropic (HTTP ${res.statusCode}): ${raw.slice(0, 200)}`
            )
          );
        }
      });
    });

    const cancel = token.onCancellationRequested(() => {
      req.destroy(new Error('Cancelled'));
    });

    req.on('error', (err) => {
      cancel.dispose();
      reject(err);
    });
    req.on('close', () => cancel.dispose());
    req.write(body);
    req.end();
  });
}

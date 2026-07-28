import * as https from 'https';
import type * as vscode from 'vscode';
import type { LlmProvider } from './provider';

export class OpenAiProvider implements LlmProvider {
  readonly kind = 'openai';

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
        'OpenAI API key is not set. Run "VibeQuiz: Set API Key".'
      );
    }

    const body = JSON.stringify({
      model: this.model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You generate multiple-choice quizzes about git diffs. Always reply with a single JSON object.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const result = await httpsJsonRequest<{
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    }>(
      {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      body,
      token
    );

    if (result.error?.message) {
      throw new Error(`OpenAI API error: ${result.error.message}`);
    }

    const content = result.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      throw new Error('OpenAI returned an empty response.');
    }
    return content;
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
        const text = Buffer.concat(chunks).toString('utf8');
        try {
          resolve(JSON.parse(text) as T);
        } catch {
          reject(
            new Error(
              `Invalid JSON from OpenAI (HTTP ${res.statusCode}): ${text.slice(0, 200)}`
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

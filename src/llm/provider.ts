import type * as vscode from 'vscode';

export interface LlmProvider {
  readonly kind: string;
  generate(prompt: string, token: vscode.CancellationToken): Promise<string>;
}

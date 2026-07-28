import * as vscode from 'vscode';
import type { LlmProviderKind } from './quiz/types';

export const SECRET_OPENAI = 'vibequiz.openaiApiKey';
export const SECRET_ANTHROPIC = 'vibequiz.anthropicApiKey';

export async function getApiKey(
  secrets: vscode.SecretStorage,
  provider: Exclude<LlmProviderKind, 'copilot'>
): Promise<string | undefined> {
  const key = provider === 'openai' ? SECRET_OPENAI : SECRET_ANTHROPIC;
  return secrets.get(key);
}

export async function setApiKey(
  secrets: vscode.SecretStorage,
  provider: Exclude<LlmProviderKind, 'copilot'>,
  value: string
): Promise<void> {
  const key = provider === 'openai' ? SECRET_OPENAI : SECRET_ANTHROPIC;
  await secrets.store(key, value);
}

export async function promptAndStoreApiKey(
  secrets: vscode.SecretStorage
): Promise<void> {
  const provider = await vscode.window.showQuickPick(
    [
      { label: 'OpenAI', id: 'openai' as const },
      { label: 'Anthropic (Claude)', id: 'anthropic' as const },
    ],
    { placeHolder: 'Which API key do you want to set?' }
  );
  if (!provider) {
    return;
  }

  const value = await vscode.window.showInputBox({
    prompt: `Enter your ${provider.label} API key`,
    password: true,
    ignoreFocusOut: true,
    placeHolder: provider.id === 'openai' ? 'sk-...' : 'sk-ant-...',
  });
  if (!value?.trim()) {
    return;
  }

  await setApiKey(secrets, provider.id, value.trim());
  void vscode.window.showInformationMessage(
    `${provider.label} API key saved securely for VibeQuiz.`
  );
}

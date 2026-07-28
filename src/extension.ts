import * as vscode from 'vscode';
import { SessionStore } from './session';
import { ScmQuizViewProvider } from './views/scmView';
import { QuizPanel } from './views/quizPanel';
import { collectDiffAgainstBase, getActiveRepository } from './git/diff';
import { createLlmProvider } from './llm/factory';
import { generateQuiz } from './quiz/generate';
import { createPullRequestFromSession } from './pr/create';
import { promptAndStoreApiKey } from './secrets';
import type { Difficulty } from './quiz/types';

let sessions: SessionStore | undefined;

export function activate(context: vscode.ExtensionContext): void {
  sessions = new SessionStore();
  const scmProvider = new ScmQuizViewProvider(context.extensionUri, sessions);

  context.subscriptions.push(
    sessions,
    vscode.window.registerWebviewViewProvider(
      ScmQuizViewProvider.viewType,
      scmProvider
    ),
    vscode.commands.registerCommand('vibequiz.createQuiz', () =>
      createQuizCommand(context, sessions!)
    ),
    vscode.commands.registerCommand('vibequiz.createPullRequest', () =>
      createPrCommand(sessions!)
    ),
    vscode.commands.registerCommand('vibequiz.openSettings', async () => {
      await vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:eklabdev.vibequiz'
      );
    }),
    vscode.commands.registerCommand('vibequiz.setApiKey', () =>
      promptAndStoreApiKey(context.secrets)
    ),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('vibequiz')) {
        void scmProvider.refresh();
      }
    })
  );
}

export function deactivate(): void {
  sessions?.dispose();
  sessions = undefined;
}

async function createQuizCommand(
  context: vscode.ExtensionContext,
  store: SessionStore
): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('vibequiz');
  const difficulty = cfg.get<Difficulty>('difficulty', 'medium');
  const questionCount = cfg.get<number>('questionCount', 5);
  const passingScore = cfg.get<number>('passingScore', 70);
  const baseBranch = cfg.get<string>('baseBranch', 'main');

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'VibeQuiz: Generating quiz from git diff…',
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ message: 'Collecting diff…' });
        const repo = await getActiveRepository();
        const diffResult = await collectDiffAgainstBase(repo, baseBranch);
        if (diffResult.truncated) {
          void vscode.window.showWarningMessage(
            'Git diff was truncated for quiz generation. Consider a smaller change set or raise vibequiz.maxDiffChars.'
          );
        }

        progress.report({ message: 'Calling language model…' });
        const provider = await createLlmProvider(context.secrets);
        const quiz = await generateQuiz(provider, {
          diff: diffResult.diff,
          difficulty,
          questionCount,
          branch: diffResult.branch,
          baseBranch: diffResult.baseBranch,
          token,
        });

        await store.start(quiz, {
          branch: diffResult.branch,
          baseBranch: diffResult.baseBranch,
          headCommit: diffResult.headCommit,
        });

        QuizPanel.show(context.extensionUri, store, quiz, passingScore);
      }
    );
  } catch (err) {
    if (tokenCancelled(err)) {
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`VibeQuiz: ${message}`);
  }
}

async function createPrCommand(store: SessionStore): Promise<void> {
  try {
    await createPullRequestFromSession(store);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`VibeQuiz: ${message}`);
  }
}

function tokenCancelled(err: unknown): boolean {
  return (
    err instanceof Error &&
    (/cancel/i.test(err.message) || err.name === 'Canceled')
  );
}

import * as vscode from 'vscode';
import type { SessionStore } from '../session';
import {
  getActiveRepository,
  getCurrentBranch,
} from '../git/diff';
import type { Difficulty, LlmProviderKind } from '../quiz/types';

export class ScmQuizViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vibequiz.scmView';

  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly sessions: SessionStore
  ) {
    sessions.onDidChange(() => {
      void this.refresh();
    });
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'media'),
      ],
    };

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg?.type) {
        case 'createQuiz':
          await vscode.commands.executeCommand('vibequiz.createQuiz');
          break;
        case 'createPr':
          await vscode.commands.executeCommand('vibequiz.createPullRequest');
          break;
        case 'openSettings':
          await vscode.commands.executeCommand('vibequiz.openSettings');
          break;
        case 'setApiKey':
          await vscode.commands.executeCommand('vibequiz.setApiKey');
          break;
        case 'refresh':
          await this.refresh();
          break;
      }
    });

    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.view) {
      return;
    }

    const cfg = vscode.workspace.getConfiguration('vibequiz');
    const provider = cfg.get<LlmProviderKind>('llmProvider', 'copilot');
    const difficulty = cfg.get<Difficulty>('difficulty', 'medium');
    const questionCount = cfg.get<number>('questionCount', 5);
    const passingScore = cfg.get<number>('passingScore', 70);
    const baseBranch = cfg.get<string>('baseBranch', 'main');

    let branch = '—';
    let status = 'Open a folder with a Git repository.';
    try {
      const repo = await getActiveRepository();
      branch = getCurrentBranch(repo);
      const changes =
        repo.state.workingTreeChanges.length +
        repo.state.indexChanges.length;
      status = `${changes} uncommitted change(s)`;
    } catch (err) {
      status = err instanceof Error ? err.message : String(err);
    }

    const session = this.sessions.current;
    const passed = Boolean(session?.passed);
    const score =
      session?.score !== undefined ? `${session.score}%` : '—';

    this.view.webview.html = this.getHtml({
      branch,
      baseBranch,
      status,
      provider,
      difficulty,
      questionCount,
      passingScore,
      passed,
      score,
    });
  }

  private getHtml(state: {
    branch: string;
    baseBranch: string;
    status: string;
    provider: string;
    difficulty: string;
    questionCount: number;
    passingScore: number;
    passed: boolean;
    score: string;
  }): string {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VibeQuiz</title>
  <style nonce="${nonce}">
    :root {
      color-scheme: light dark;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }
    body { margin: 0; padding: 12px; }
    h2 { font-size: 13px; margin: 0 0 8px; font-weight: 600; }
    .meta { opacity: 0.85; font-size: 12px; line-height: 1.5; margin-bottom: 12px; }
    .meta dt { float: left; clear: left; width: 7.5em; opacity: 0.7; }
    .meta dd { margin: 0 0 2px 7.5em; }
    .row { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    button {
      appearance: none;
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      padding: 6px 10px;
      cursor: pointer;
      border-radius: 2px;
      text-align: center;
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .pass {
      margin-top: 10px;
      padding: 8px;
      border-left: 3px solid var(--vscode-testing-iconPassed, #3fb950);
      background: color-mix(in srgb, var(--vscode-testing-iconPassed, #3fb950) 12%, transparent);
      font-size: 12px;
    }
    .fail-hint {
      margin-top: 10px;
      font-size: 12px;
      opacity: 0.8;
    }
    a.link {
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
      text-decoration: underline;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h2>VibeQuiz</h2>
  <dl class="meta">
    <dt>Branch</dt><dd>${escapeHtml(state.branch)}</dd>
    <dt>Base</dt><dd>${escapeHtml(state.baseBranch)}</dd>
    <dt>Status</dt><dd>${escapeHtml(state.status)}</dd>
    <dt>Provider</dt><dd>${escapeHtml(state.provider)}</dd>
    <dt>Difficulty</dt><dd>${escapeHtml(state.difficulty)}</dd>
    <dt>Questions</dt><dd>${state.questionCount}</dd>
    <dt>Pass score</dt><dd>${state.passingScore}%</dd>
    <dt>Last score</dt><dd>${escapeHtml(state.score)}</dd>
  </dl>

  <div class="row">
    <button id="createQuiz">Create Quiz</button>
    <button id="createPr" ${state.passed ? '' : 'disabled'}>Create Pull Request</button>
    <button id="settings" class="secondary">Open Settings</button>
    <button id="apiKey" class="secondary">Set API Key</button>
  </div>

  ${
    state.passed
      ? `<div class="pass">Quiz passed (${escapeHtml(state.score)}). You can create a pull request.</div>`
      : `<p class="fail-hint">Complete and pass the quiz to unlock PR creation. Quiz is generated from your diff vs <code>${escapeHtml(state.baseBranch)}</code>.</p>`
  }

  <p style="margin-top:14px"><a class="link" id="refresh">Refresh</a></p>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('createQuiz').addEventListener('click', () => {
      vscode.postMessage({ type: 'createQuiz' });
    });
    document.getElementById('createPr').addEventListener('click', () => {
      vscode.postMessage({ type: 'createPr' });
    });
    document.getElementById('settings').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSettings' });
    });
    document.getElementById('apiKey').addEventListener('click', () => {
      vscode.postMessage({ type: 'setApiKey' });
    });
    document.getElementById('refresh').addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });
  </script>
</body>
</html>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

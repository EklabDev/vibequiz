import * as vscode from 'vscode';
import type { PublicQuizQuestion, Quiz } from '../quiz/types';
import { toPublicQuestions } from '../quiz/validate';
import { scoreQuiz } from '../quiz/score';
import type { SessionStore } from '../session';

export class QuizPanel {
  public static readonly viewType = 'vibequiz.quizPanel';
  private static current: QuizPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly sessions: SessionStore,
    private readonly quiz: Quiz,
    private readonly passingScore: number
  ) {
    this.panel = panel;
    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
    };

    this.panel.webview.html = this.getHtml(toPublicQuestions(quiz), passingScore);

    this.panel.webview.onDidReceiveMessage(
      async (msg) => {
        if (msg?.type === 'submit') {
          await this.handleSubmit(msg.answers ?? {});
        } else if (msg?.type === 'close') {
          this.panel.dispose();
        }
      },
      undefined,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  static show(
    extensionUri: vscode.Uri,
    sessions: SessionStore,
    quiz: Quiz,
    passingScore: number
  ): QuizPanel {
    if (QuizPanel.current) {
      QuizPanel.current.panel.dispose();
    }

    const panel = vscode.window.createWebviewPanel(
      QuizPanel.viewType,
      'VibeQuiz',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    QuizPanel.current = new QuizPanel(
      panel,
      extensionUri,
      sessions,
      quiz,
      passingScore
    );
    return QuizPanel.current;
  }

  private async handleSubmit(answers: Record<string, number>): Promise<void> {
    const result = scoreQuiz(this.quiz, answers, this.passingScore);
    await this.sessions.markResult(result.score, result.passed, answers);

    this.panel.webview.postMessage({
      type: 'result',
      score: result.score,
      correct: result.correct,
      total: result.total,
      passed: result.passed,
      passingScore: this.passingScore,
    });

    if (result.passed) {
      void vscode.window.showInformationMessage(
        `VibeQuiz passed with ${result.score}%. You can create a pull request from the Source Control VibeQuiz pane.`
      );
    } else {
      void vscode.window.showWarningMessage(
        `VibeQuiz scored ${result.score}% (need ${this.passingScore}%). Try again after reviewing your changes.`
      );
    }
  }

  dispose(): void {
    QuizPanel.current = undefined;
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }

  private getHtml(
    questions: PublicQuizQuestion[],
    passingScore: number
  ): string {
    const nonce = getNonce();
    const data = JSON.stringify({ questions, passingScore });
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
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --muted: var(--vscode-descriptionForeground);
      --accent: var(--vscode-button-background);
      --accent-fg: var(--vscode-button-foreground);
      --border: var(--vscode-panel-border, rgba(127,127,127,0.35));
      --option-bg: var(--vscode-input-background);
      font-family: var(--vscode-font-family);
      color: var(--fg);
      background: var(--bg);
    }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(1200px 500px at 10% -10%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 60%),
        radial-gradient(900px 400px at 100% 0%, color-mix(in srgb, #2aa198 12%, transparent), transparent 55%),
        var(--bg);
    }
    .wrap {
      max-width: 760px;
      margin: 0 auto;
      padding: 28px 20px 64px;
    }
    header {
      margin-bottom: 28px;
      animation: rise 480ms ease-out both;
    }
    .brand {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 6px;
    }
    .sub {
      margin: 0;
      color: var(--muted);
      max-width: 42rem;
      line-height: 1.45;
    }
    .progress {
      margin: 18px 0 8px;
      height: 4px;
      background: color-mix(in srgb, var(--border) 80%, transparent);
      border-radius: 999px;
      overflow: hidden;
    }
    .progress > span {
      display: block;
      height: 100%;
      width: 0%;
      background: var(--accent);
      transition: width 280ms ease;
    }
    .q {
      margin: 0 0 22px;
      padding: 18px 0 0;
      border-top: 1px solid var(--border);
      animation: rise 520ms ease-out both;
    }
    .q:nth-child(2) { animation-delay: 40ms; }
    .q:nth-child(3) { animation-delay: 80ms; }
    .q:nth-child(4) { animation-delay: 120ms; }
    .q:nth-child(5) { animation-delay: 160ms; }
    .q h3 {
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 12px;
      line-height: 1.4;
    }
    .opts {
      display: grid;
      gap: 8px;
    }
    label.opt {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 10px 12px;
      background: var(--option-bg);
      border: 1px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      transition: border-color 160ms ease, transform 160ms ease;
    }
    label.opt:hover {
      border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
      transform: translateX(2px);
    }
    label.opt:has(input:checked) {
      border-color: var(--accent);
    }
    label.opt input { margin-top: 3px; }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 8px;
      animation: rise 600ms ease-out both;
    }
    button {
      appearance: none;
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--accent);
      color: var(--accent-fg);
      padding: 8px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    #result {
      display: none;
      margin-top: 24px;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: 8px;
      animation: rise 400ms ease-out both;
    }
    #result.show { display: block; }
    #result.pass {
      border-color: color-mix(in srgb, #3fb950 70%, var(--border));
    }
    #result.fail {
      border-color: color-mix(in srgb, #f85149 70%, var(--border));
    }
    #result h2 { margin: 0 0 8px; font-size: 20px; }
    #quiz.hidden { display: none; }
    @keyframes rise {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <p class="brand">VibeQuiz</p>
      <p class="sub">Answer these multiple-choice questions about your current git changes. Score at least ${passingScore}% to unlock pull request creation.</p>
      <div class="progress" aria-hidden="true"><span id="bar"></span></div>
    </header>

    <form id="quiz"></form>
    <div class="actions" id="actions">
      <button type="button" id="submit">Submit quiz</button>
    </div>

    <section id="result" aria-live="polite"></section>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const data = ${data};
    const form = document.getElementById('quiz');
    const bar = document.getElementById('bar');
    const resultEl = document.getElementById('result');

    function render() {
      form.innerHTML = '';
      data.questions.forEach((q, qi) => {
        const section = document.createElement('section');
        section.className = 'q';
        section.dataset.id = q.id;
        const h = document.createElement('h3');
        h.textContent = (qi + 1) + '. ' + q.prompt;
        section.appendChild(h);
        const opts = document.createElement('div');
        opts.className = 'opts';
        q.options.forEach((opt, oi) => {
          const id = q.id + '-' + oi;
          const label = document.createElement('label');
          label.className = 'opt';
          label.setAttribute('for', id);
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = q.id;
          input.value = String(oi);
          input.id = id;
          input.addEventListener('change', updateProgress);
          const span = document.createElement('span');
          span.textContent = opt;
          label.appendChild(input);
          label.appendChild(span);
          opts.appendChild(label);
        });
        section.appendChild(opts);
        form.appendChild(section);
      });
      updateProgress();
    }

    function updateProgress() {
      const total = data.questions.length || 1;
      let answered = 0;
      data.questions.forEach((q) => {
        if (form.querySelector('input[name=\"' + q.id + '\"]:checked')) {
          answered += 1;
        }
      });
      bar.style.width = Math.round((answered / total) * 100) + '%';
    }

    document.getElementById('submit').addEventListener('click', () => {
      const answers = {};
      let missing = 0;
      data.questions.forEach((q) => {
        const selected = form.querySelector('input[name=\"' + q.id + '\"]:checked');
        if (selected) {
          answers[q.id] = Number(selected.value);
        } else {
          missing += 1;
        }
      });
      if (missing > 0) {
        const ok = confirm(missing + ' question(s) unanswered. Submit anyway?');
        if (!ok) return;
      }
      vscode.postMessage({ type: 'submit', answers });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg?.type !== 'result') return;
      form.classList.add('hidden');
      document.getElementById('actions').style.display = 'none';
      resultEl.className = 'show ' + (msg.passed ? 'pass' : 'fail');
      resultEl.innerHTML = '<h2>' + (msg.passed ? 'Passed' : 'Not passed') + '</h2>' +
        '<p>You scored <strong>' + msg.score + '%</strong> (' + msg.correct + '/' + msg.total + '). ' +
        'Passing score is ' + msg.passingScore + '%.</p>' +
        (msg.passed
          ? '<p>Return to the Source Control <strong>VibeQuiz</strong> pane and click <strong>Create Pull Request</strong>.</p>'
          : '<p>Review your changes and run <strong>Create Quiz</strong> again when ready.</p>');
      bar.style.width = '100%';
    });

    render();
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

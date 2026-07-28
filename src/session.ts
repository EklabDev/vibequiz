import * as vscode from 'vscode';
import type { PublicQuizQuestion, Quiz, QuizSession } from './quiz/types';
import { toPublicQuestions } from './quiz/validate';

const CONTEXT_PASSED = 'vibequiz.quizPassed';

/**
 * Holds the in-memory quiz session and broadcasts updates to views.
 */
export class SessionStore {
  private session: QuizSession | undefined;
  private readonly _onDidChange = new vscode.EventEmitter<QuizSession | undefined>();
  readonly onDidChange = this._onDidChange.event;

  get current(): QuizSession | undefined {
    return this.session;
  }

  get passed(): boolean {
    return Boolean(this.session?.passed);
  }

  get publicQuestions(): PublicQuizQuestion[] {
    if (!this.session) {
      return [];
    }
    return toPublicQuestions(this.session.quiz);
  }

  async start(
    quiz: Quiz,
    meta: { branch: string; baseBranch: string; headCommit?: string }
  ): Promise<void> {
    this.session = {
      quiz,
      passed: false,
      branch: meta.branch,
      baseBranch: meta.baseBranch,
      headCommit: meta.headCommit,
    };
    await vscode.commands.executeCommand('setContext', CONTEXT_PASSED, false);
    this._onDidChange.fire(this.session);
  }

  async markResult(score: number, passed: boolean, answers: Record<string, number>): Promise<void> {
    if (!this.session) {
      return;
    }
    this.session = {
      ...this.session,
      score,
      passed,
      answers,
    };
    await vscode.commands.executeCommand('setContext', CONTEXT_PASSED, passed);
    this._onDidChange.fire(this.session);
  }

  async clear(): Promise<void> {
    this.session = undefined;
    await vscode.commands.executeCommand('setContext', CONTEXT_PASSED, false);
    this._onDidChange.fire(undefined);
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}

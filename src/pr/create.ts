import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import {
  ensureBranchPushed,
  getActiveRepository,
  getCurrentBranch,
  resolveGithubRemote,
} from '../git/diff';
import { renderTemplate } from './template';
import type { SessionStore } from '../session';
import { toPublicQuestions } from '../quiz/validate';

export async function createPullRequestFromSession(
  sessions: SessionStore
): Promise<void> {
  const session = sessions.current;
  if (!session?.passed || session.score === undefined) {
    throw new Error(
      'You must pass the VibeQuiz before creating a pull request.'
    );
  }

  const cfg = vscode.workspace.getConfiguration('vibequiz');
  const baseBranch = cfg.get<string>('baseBranch', 'main');
  const titleTemplate = cfg.get<string>(
    'prTitleTemplate',
    'VibeQuiz: {{score}}% — ready for review'
  );
  const bodyTemplate = cfg.get<string>(
    'prBodyTemplate',
    '## VibeQuiz Results\n\n**Score:** {{score}}%\n\n## Quiz Questions\n\n{{question}}\n'
  );

  const questions = toPublicQuestions(session.quiz);
  const title = renderTemplate(titleTemplate, {
    score: session.score,
    questions,
  });
  const body = renderTemplate(bodyTemplate, {
    score: session.score,
    questions,
  });

  const repo = await getActiveRepository();
  const branch = getCurrentBranch(repo);
  if (branch === baseBranch) {
    throw new Error(
      `Current branch is "${baseBranch}". Switch to a feature branch before creating a PR.`
    );
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'VibeQuiz: Creating pull request…',
      cancellable: false,
    },
    async () => {
      await ensureBranchPushed(repo);

      const { owner, repo: repoName } = resolveGithubRemote(repo);
      const sessionAuth = await vscode.authentication.getSession(
        'github',
        ['repo'],
        { createIfNone: true }
      );
      if (!sessionAuth) {
        throw new Error('GitHub authentication was cancelled.');
      }

      const octokit = new Octokit({ auth: sessionAuth.accessToken });
      const { data } = await octokit.rest.pulls.create({
        owner,
        repo: repoName,
        title,
        body,
        head: branch,
        base: baseBranch,
      });

      const open = 'Open Pull Request';
      const choice = await vscode.window.showInformationMessage(
        `Pull request #${data.number} created.`,
        open
      );
      if (choice === open && data.html_url) {
        await vscode.env.openExternal(vscode.Uri.parse(data.html_url));
      }
    }
  );
}

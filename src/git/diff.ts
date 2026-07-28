import * as vscode from 'vscode';
import type { API, GitExtension, Repository } from './git';
import { parseGithubRemoteUrl } from './remote';

export { parseGithubRemoteUrl } from './remote';

const MAX_DIFF_DEFAULT = 80_000;

export async function getGitApi(): Promise<API> {
  const ext = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!ext) {
    throw new Error('Built-in Git extension (vscode.git) was not found.');
  }
  const gitExt = ext.isActive ? ext.exports : await ext.activate();
  if (!gitExt.enabled) {
    throw new Error('Git extension is disabled.');
  }
  return gitExt.getAPI(1);
}

export async function getActiveRepository(): Promise<Repository> {
  const api = await getGitApi();
  if (api.repositories.length === 0) {
    throw new Error('No Git repository is open in this workspace.');
  }

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const fromUri = api.getRepository(activeEditor.document.uri);
    if (fromUri) {
      return fromUri;
    }
  }

  const folder = vscode.workspace.workspaceFolders?.[0];
  if (folder) {
    const fromFolder = api.getRepository(folder.uri);
    if (fromFolder) {
      return fromFolder;
    }
  }

  return api.repositories[0];
}

export function getCurrentBranch(repo: Repository): string {
  return repo.state.HEAD?.name ?? 'HEAD';
}

export function getHeadCommit(repo: Repository): string | undefined {
  return repo.state.HEAD?.commit;
}

export type DiffResult = {
  diff: string;
  truncated: boolean;
  branch: string;
  baseBranch: string;
  headCommit?: string;
};

/**
 * Collect a combined diff of commits ahead of base plus uncommitted changes.
 */
export async function collectDiffAgainstBase(
  repo: Repository,
  baseBranch: string,
  maxChars?: number
): Promise<DiffResult> {
  const limit =
    maxChars ??
    vscode.workspace.getConfiguration('vibequiz').get<number>('maxDiffChars') ??
    MAX_DIFF_DEFAULT;

  const branch = getCurrentBranch(repo);
  const headCommit = getHeadCommit(repo);
  const parts: string[] = [];

  try {
    const rangeDiff = await repo.diffWith(baseBranch);
    if (rangeDiff?.trim()) {
      parts.push(rangeDiff);
    }
  } catch {
    // Base branch may not exist locally; fall back to HEAD / working tree.
    try {
      const headDiff = await repo.diffWithHEAD();
      if (headDiff?.trim()) {
        parts.push(typeof headDiff === 'string' ? headDiff : String(headDiff));
      }
    } catch {
      // ignore
    }
  }

  try {
    const unstaged = await repo.diff(false);
    if (unstaged?.trim()) {
      parts.push(unstaged);
    }
  } catch {
    // ignore
  }

  try {
    const staged = await repo.diff(true);
    if (staged?.trim()) {
      parts.push(staged);
    }
  } catch {
    // ignore
  }

  let combined = dedupeDiff(parts.join('\n'));
  if (!combined.trim()) {
    throw new Error(
      `No changes found against base branch "${baseBranch}". Commit or edit files first.`
    );
  }

  let truncated = false;
  if (combined.length > limit) {
    combined =
      combined.slice(0, limit) +
      `\n\n...[diff truncated to ${limit} characters for quiz generation]...`;
    truncated = true;
  }

  return { diff: combined, truncated, branch, baseBranch, headCommit };
}

function dedupeDiff(text: string): string {
  // Simple de-dupe of identical consecutive blocks
  const chunks = text.split(/\n(?=diff --git )/g);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of chunks) {
    const key = chunk.trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(chunk);
  }
  return out.join('\n');
}

export type GithubRemote = {
  owner: string;
  repo: string;
  remoteName: string;
};

export function resolveGithubRemote(repo: Repository): GithubRemote {
  const remotes = repo.state.remotes;
  const preferred =
    remotes.find((r) => r.name === 'origin') ?? remotes[0];
  if (!preferred) {
    throw new Error('No Git remotes configured. Add a GitHub remote first.');
  }

  const url = preferred.fetchUrl ?? preferred.pushUrl;
  if (!url) {
    throw new Error(`Remote "${preferred.name}" has no URL.`);
  }

  const parsed = parseGithubRemoteUrl(url);
  if (!parsed) {
    throw new Error(
      `Remote "${preferred.name}" does not look like a GitHub URL: ${url}`
    );
  }

  return { ...parsed, remoteName: preferred.name };
}

export async function ensureBranchPushed(repo: Repository): Promise<void> {
  const head = repo.state.HEAD;
  if (!head?.name) {
    throw new Error('Detached HEAD is not supported for PR creation.');
  }

  const hasUpstream = Boolean(head.upstream);
  if (hasUpstream && (head.ahead ?? 0) === 0) {
    return;
  }

  const remoteName = head.upstream?.remote ?? 'origin';
  await repo.push(remoteName, head.name, !hasUpstream);
}

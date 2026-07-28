export function parseGithubRemoteUrl(
  url: string
): { owner: string; repo: string } | undefined {
  const cleaned = url.trim().replace(/\.git$/, '');

  // git@github.com:owner/repo
  const ssh = cleaned.match(/^git@github\.com:([^/]+)\/(.+)$/i);
  if (ssh) {
    return { owner: ssh[1], repo: ssh[2] };
  }

  // https://github.com/owner/repo or ssh://git@github.com/owner/repo
  const https = cleaned.match(
    /(?:https?:\/\/|ssh:\/\/git@)github\.com[/:]([^/]+)\/(.+)$/i
  );
  if (https) {
    return { owner: https[1], repo: https[2] };
  }

  return undefined;
}

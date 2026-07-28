import { describe, expect, it } from 'vitest';
import { parseGithubRemoteUrl } from './remote';

describe('parseGithubRemoteUrl', () => {
  it('parses HTTPS remotes', () => {
    expect(
      parseGithubRemoteUrl('https://github.com/EklabDev/vibequiz.git')
    ).toEqual({ owner: 'EklabDev', repo: 'vibequiz' });
  });

  it('parses SSH remotes', () => {
    expect(parseGithubRemoteUrl('git@github.com:acme/app.git')).toEqual({
      owner: 'acme',
      repo: 'app',
    });
  });

  it('returns undefined for non-GitHub URLs', () => {
    expect(
      parseGithubRemoteUrl('https://gitlab.com/acme/app.git')
    ).toBeUndefined();
  });
});

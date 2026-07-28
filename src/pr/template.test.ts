import { describe, expect, it } from 'vitest';
import { renderTemplate } from './template';
import type { PublicQuizQuestion } from '../quiz/types';

const questions: PublicQuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'What changed?',
    options: ['Auth', 'UI', 'DB', 'Tests'],
  },
  {
    id: 'q2',
    prompt: 'Risk?',
    options: ['None', 'Race', 'Leak', 'Crash'],
  },
];

describe('renderTemplate', () => {
  it('replaces {{score}} and {{question}}', () => {
    const body = renderTemplate(
      'Score {{score}}%\n\n{{question}}\n',
      { score: 80, questions }
    );
    expect(body).toContain('Score 80%');
    expect(body).toContain('1. What changed?');
    expect(body).toContain('A. Auth');
    expect(body).toContain('2. Risk?');
    expect(body).not.toContain('correctIndex');
  });

  it('replaces multiple score placeholders', () => {
    const title = renderTemplate('VibeQuiz: {{score}}% ({{score}})', {
      score: 95,
      questions: [],
    });
    expect(title).toBe('VibeQuiz: 95% (95)');
  });
});

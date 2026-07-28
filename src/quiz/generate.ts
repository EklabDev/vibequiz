import type { Difficulty, PublicQuizQuestion } from './types';
import type { LlmProvider } from '../llm/provider';
import { parseQuizJson } from './validate';
import type { Quiz } from './types';

export function buildQuizPrompt(opts: {
  diff: string;
  difficulty: Difficulty;
  questionCount: number;
  branch: string;
  baseBranch: string;
}): string {
  return [
    'You generate a short multiple-choice quiz that checks whether the author understands the code changes in a git diff.',
    'Reply with JSON only. No markdown fences, no commentary.',
    'Schema:',
    '{',
    '  "difficulty": "easy|medium|hard",',
    '  "questions": [',
    '    {',
    '      "id": "q1",',
    '      "prompt": "string",',
    '      "options": ["A", "B", "C", "D"],',
    '      "correctIndex": 0',
    '    }',
    '  ]',
    '}',
    '',
    `Difficulty: ${opts.difficulty}`,
    `Number of questions: ${opts.questionCount}`,
    `Branch: ${opts.branch} (base: ${opts.baseBranch})`,
    'Rules:',
    '- Exactly four options per question.',
    '- correctIndex is 0-based and must match the single best answer.',
    '- Focus on intent, behavior, edge cases, and risks in the diff — not trivia about formatting.',
    '- Questions must be answerable from the provided diff.',
    '',
    'Git diff:',
    '```diff',
    opts.diff,
    '```',
  ].join('\n');
}

export async function generateQuiz(
  provider: LlmProvider,
  opts: {
    diff: string;
    difficulty: Difficulty;
    questionCount: number;
    branch: string;
    baseBranch: string;
    token: import('vscode').CancellationToken;
  }
): Promise<Quiz> {
  const prompt = buildQuizPrompt(opts);
  const raw = await provider.generate(prompt, opts.token);
  return parseQuizJson(raw, opts.questionCount);
}

export function formatQuestionsForTemplate(
  questions: PublicQuizQuestion[]
): string {
  return questions
    .map((q, index) => {
      const opts = q.options
        .map((opt, i) => `   ${String.fromCharCode(65 + i)}. ${opt}`)
        .join('\n');
      return `${index + 1}. ${q.prompt}\n${opts}`;
    })
    .join('\n\n');
}

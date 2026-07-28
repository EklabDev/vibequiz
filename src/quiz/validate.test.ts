import { describe, expect, it } from 'vitest';
import { extractJsonObject, parseQuizJson } from './validate';

describe('parseQuizJson', () => {
  it('parses a clean quiz object', () => {
    const quiz = parseQuizJson(
      JSON.stringify({
        difficulty: 'hard',
        questions: [
          {
            id: 'q1',
            prompt: 'Why?',
            options: ['A', 'B', 'C', 'D'],
            correctIndex: 2,
          },
        ],
      }),
      1
    );
    expect(quiz.difficulty).toBe('hard');
    expect(quiz.questions).toHaveLength(1);
    expect(quiz.questions[0].correctIndex).toBe(2);
  });

  it('extracts JSON from markdown fences', () => {
    const raw = '```json\n{"difficulty":"easy","questions":[{"id":"q1","prompt":"P","options":["A","B","C","D"],"correctIndex":0}]}\n```';
    const quiz = parseQuizJson(raw, 1);
    expect(quiz.questions[0].prompt).toBe('P');
  });

  it('coerces question/answer aliases', () => {
    const quiz = parseQuizJson(
      JSON.stringify({
        questions: [
          {
            question: 'Alias prompt?',
            options: ['A', 'B', 'C', 'D'],
            answer: 1,
          },
        ],
      }),
      1
    );
    expect(quiz.questions[0].prompt).toBe('Alias prompt?');
    expect(quiz.questions[0].correctIndex).toBe(1);
    expect(quiz.questions[0].id).toBe('q1');
  });

  it('limits to expectedCount', () => {
    const quiz = parseQuizJson(
      JSON.stringify({
        questions: [
          {
            id: 'q1',
            prompt: '1',
            options: ['A', 'B', 'C', 'D'],
            correctIndex: 0,
          },
          {
            id: 'q2',
            prompt: '2',
            options: ['A', 'B', 'C', 'D'],
            correctIndex: 0,
          },
        ],
      }),
      1
    );
    expect(quiz.questions).toHaveLength(1);
  });

  it('throws when questions are missing', () => {
    expect(() => parseQuizJson('{"difficulty":"easy"}')).toThrow(
      /questions/i
    );
  });
});

describe('extractJsonObject', () => {
  it('parses embedded object with preamble', () => {
    const value = extractJsonObject(
      'Here you go:\n{"ok":true,"n":1}\nThanks'
    ) as { ok: boolean; n: number };
    expect(value.ok).toBe(true);
    expect(value.n).toBe(1);
  });
});

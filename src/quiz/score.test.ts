import { describe, expect, it } from 'vitest';
import { scoreQuiz } from './score';
import type { Quiz } from './types';

const sampleQuiz: Quiz = {
  difficulty: 'medium',
  questions: [
    {
      id: 'q1',
      prompt: 'What does foo do?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 1,
    },
    {
      id: 'q2',
      prompt: 'What does bar do?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
    },
    {
      id: 'q3',
      prompt: 'What does baz do?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 3,
    },
    {
      id: 'q4',
      prompt: 'Edge case?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 2,
    },
  ],
};

describe('scoreQuiz', () => {
  it('scores 100% when all answers are correct', () => {
    const result = scoreQuiz(
      sampleQuiz,
      { q1: 1, q2: 0, q3: 3, q4: 2 },
      70
    );
    expect(result).toEqual({
      correct: 4,
      total: 4,
      score: 100,
      passed: true,
    });
  });

  it('treats missing answers as incorrect', () => {
    const result = scoreQuiz(sampleQuiz, { q1: 1, q2: 0 }, 50);
    expect(result.correct).toBe(2);
    expect(result.score).toBe(50);
    expect(result.passed).toBe(true);
  });

  it('fails when below passing score', () => {
    const result = scoreQuiz(
      sampleQuiz,
      { q1: 0, q2: 1, q3: 1, q4: 1 },
      70
    );
    expect(result.correct).toBe(0);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('rounds percentage', () => {
    const quiz: Quiz = {
      difficulty: 'easy',
      questions: [
        {
          id: 'a',
          prompt: '1',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
        },
        {
          id: 'b',
          prompt: '2',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
        },
        {
          id: 'c',
          prompt: '3',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
        },
      ],
    };
    const result = scoreQuiz(quiz, { a: 0, b: 0, c: 1 }, 70);
    expect(result.score).toBe(67);
    expect(result.passed).toBe(false);
  });
});

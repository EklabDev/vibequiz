import type { Quiz, ScoreResult } from './types';

/**
 * Score selected answers against the quiz. Missing answers count as incorrect.
 */
export function scoreQuiz(
  quiz: Quiz,
  answers: Record<string, number>,
  passingScore: number
): ScoreResult {
  const total = quiz.questions.length;
  if (total === 0) {
    return { correct: 0, total: 0, score: 0, passed: false };
  }

  let correct = 0;
  for (const question of quiz.questions) {
    const selected = answers[question.id];
    if (typeof selected === 'number' && selected === question.correctIndex) {
      correct += 1;
    }
  }

  const score = Math.round((correct / total) * 100);
  return {
    correct,
    total,
    score,
    passed: score >= passingScore,
  };
}

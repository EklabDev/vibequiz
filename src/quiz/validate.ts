import type { Quiz, QuizQuestion } from './types';

const CORRECT_INDEXES = new Set([0, 1, 2, 3]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isQuestion(value: unknown): value is QuizQuestion {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const q = value as Record<string, unknown>;
  if (!isNonEmptyString(q.id) || !isNonEmptyString(q.prompt)) {
    return false;
  }
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    return false;
  }
  if (!q.options.every(isNonEmptyString)) {
    return false;
  }
  if (typeof q.correctIndex !== 'number' || !CORRECT_INDEXES.has(q.correctIndex)) {
    return false;
  }
  return true;
}

/**
 * Extract a JSON object from model output that may include markdown fences.
 */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error('Model response did not contain valid JSON');
  }
}

export function parseQuizJson(text: string, expectedCount?: number): Quiz {
  const parsed = extractJsonObject(text) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Quiz JSON must be an object');
  }

  const questionsRaw = parsed.questions;
  if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
    throw new Error('Quiz JSON must include a non-empty questions array');
  }

  const questions: QuizQuestion[] = [];
  for (let i = 0; i < questionsRaw.length; i++) {
    const item = questionsRaw[i];
    if (!isQuestion(item)) {
      // Coerce common LLM shapes
      if (item && typeof item === 'object') {
        const q = item as Record<string, unknown>;
        const options = Array.isArray(q.options)
          ? q.options.map(String)
          : [];
        while (options.length < 4) {
          options.push(`Option ${options.length + 1}`);
        }
        const coerced: QuizQuestion = {
          id: isNonEmptyString(q.id) ? q.id : `q${i + 1}`,
          prompt: isNonEmptyString(q.prompt)
            ? q.prompt
            : isNonEmptyString(q.question)
              ? q.question
              : `Question ${i + 1}`,
          options: options.slice(0, 4) as [string, string, string, string],
          correctIndex: (typeof q.correctIndex === 'number' &&
          CORRECT_INDEXES.has(q.correctIndex)
            ? q.correctIndex
            : typeof q.answer === 'number' && CORRECT_INDEXES.has(q.answer)
              ? q.answer
              : 0) as 0 | 1 | 2 | 3,
        };
        if (!isQuestion(coerced)) {
          throw new Error(`Invalid question at index ${i}`);
        }
        questions.push(coerced);
        continue;
      }
      throw new Error(`Invalid question at index ${i}`);
    }
    questions.push(item);
  }

  if (expectedCount !== undefined && questions.length < expectedCount) {
    throw new Error(
      `Expected at least ${expectedCount} questions, got ${questions.length}`
    );
  }

  const limited =
    expectedCount !== undefined ? questions.slice(0, expectedCount) : questions;

  return {
    difficulty: typeof parsed.difficulty === 'string' ? parsed.difficulty : 'medium',
    questions: limited,
  };
}

export function toPublicQuestions(quiz: Quiz) {
  return quiz.questions.map(({ id, prompt, options }) => ({
    id,
    prompt,
    options,
  }));
}

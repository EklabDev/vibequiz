import type { PublicQuizQuestion } from '../quiz/types';
import { formatQuestionsForTemplate } from '../quiz/generate';

export type TemplateVars = {
  score: number | string;
  questions: PublicQuizQuestion[];
};

/**
 * Substitute {{score}} and {{question}} in PR title/body templates.
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  const score = String(vars.score);
  const question = formatQuestionsForTemplate(vars.questions);
  return template
    .replaceAll('{{score}}', score)
    .replaceAll('{{question}}', question);
}

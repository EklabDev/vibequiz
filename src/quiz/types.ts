export type Difficulty = 'easy' | 'medium' | 'hard';
export type LlmProviderKind = 'copilot' | 'openai' | 'anthropic';

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};

export type Quiz = {
  difficulty: Difficulty | string;
  questions: QuizQuestion[];
};

/** Question shape sent to the webview (no correct answers). */
export type PublicQuizQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
};

export type QuizSession = {
  quiz: Quiz;
  score?: number;
  passed: boolean;
  branch: string;
  baseBranch: string;
  headCommit?: string;
  answers?: Record<string, number>;
};

export type ScoreResult = {
  correct: number;
  total: number;
  score: number;
  passed: boolean;
};

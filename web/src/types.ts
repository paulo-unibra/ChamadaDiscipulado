export interface AiIntegration {
  apiKey: string;
  configured: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  scheduleId: string;
  classId: string;
  lessonTitle: string;
  provider: 'chatgpt' | 'deepseek';
  status: 'pending' | 'completed' | 'failed';
  questions: QuizQuestion[];
  error: string;
  createdAt: string;
}

export interface Congregation {
  id: string;
  name: string;
  logoData?: string;
}

export type ApiFetch = (path: string, options?: RequestInit) => Promise<Response>;

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

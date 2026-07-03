export interface Question {
  id: string;
  question: string;
  answer: 'O' | 'X';
  explanation?: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  lastAnswer: 'O' | 'X' | null;
  lastAnswerTime: number; // speed points helper
  isCorrect: boolean | null;
  streak: number;
  joinedAt: number;
}

export interface GameState {
  currentQuestionIndex: number; // -1: lobby, 0+: index of questions, -2: finished
  status: 'lobby' | 'playing' | 'showing_answer' | 'finished';
  questionTimer: number; // countdown in seconds
  timerActive: boolean;
  questions: Question[];
  currentQuestionActiveAt: number; // time when the question was shown (for speed calculations)
  totalPlayers: number;
}

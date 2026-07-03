import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, getDocs, writeBatch, query, orderBy } from 'firebase/firestore';
import { GameState, Player, Question } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific custom databaseId
const databaseId = firebaseConfig.firestoreDatabaseId || (firebaseConfig as any).databaseId;
const db = getFirestore(app, databaseId);

export { db };

// References
export const gameDocRef = doc(db, 'games', 'main');
export const playersCollectionRef = collection(db, 'games', 'main', 'players');

// Default questions to seed if none exist
const defaultQuestions: Question[] = [
  {
    id: 'q1',
    question: '토마토는 채소이다.',
    answer: 'O',
    explanation: '토마토는 생물학적으로 과일(열매채소)로 분류되나, 국내 식생활에서는 채소로 다루어집니다. 영양학 및 농업적 공식 분류는 채소(과채류)가 맞습니다.'
  },
  {
    id: 'q2',
    question: '남극에도 우체국이 있다.',
    answer: 'O',
    explanation: '남극 포트 로크로이(Port Lockroy) 등에 실제 우체국이 운영되고 있어 우편물을 보낼 수 있습니다.'
  },
  {
    id: 'q3',
    question: '달팽이에게는 이빨이 없다.',
    answer: 'X',
    explanation: '달팽이는 치설(Radula)이라고 불리는 미세한 이빨을 수만 개 가지고 있습니다.'
  }
];

// Seed initial game state if it doesn't exist
export async function initializeDefaultGame() {
  try {
    const defaultState: GameState = {
      currentQuestionIndex: -1,
      status: 'lobby',
      questionTimer: 0,
      timerActive: false,
      questions: defaultQuestions,
      currentQuestionActiveAt: 0,
      totalPlayers: 0
    };
    await setDoc(gameDocRef, defaultState, { merge: true });
  } catch (error) {
    console.error('Error seeding game state:', error);
  }
}

// Subscriptions
export function subscribeToGameState(onUpdate: (state: GameState) => void) {
  return onSnapshot(gameDocRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as GameState);
    } else {
      // Seed default
      initializeDefaultGame();
    }
  }, (err) => {
    console.error("Firestore GameState Sub Error:", err);
  });
}

export function subscribeToPlayers(onUpdate: (players: Player[]) => void) {
  const q = query(playersCollectionRef, orderBy('score', 'desc'), orderBy('joinedAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list: Player[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Player);
    });
    onUpdate(list);
  }, (err) => {
    console.error("Firestore Players Sub Error:", err);
  });
}

// Update functions
export async function updateGameState(update: Partial<GameState>) {
  try {
    await updateDoc(gameDocRef, update);
  } catch (err) {
    console.error("Failed to update game state:", err);
  }
}

export async function addPlayer(playerId: string, name: string) {
  const newPlayer: Player = {
    id: playerId,
    name,
    score: 0,
    lastAnswer: null,
    lastAnswerTime: 0,
    isCorrect: null,
    streak: 0,
    joinedAt: Date.now()
  };
  await setDoc(doc(playersCollectionRef, playerId), newPlayer);
}

export async function submitAnswer(playerId: string, answer: 'O' | 'X', timeTakenMs: number, isCorrect: boolean) {
  const pDoc = doc(playersCollectionRef, playerId);
  await updateDoc(pDoc, {
    lastAnswer: answer,
    lastAnswerTime: timeTakenMs,
    isCorrect: isCorrect
  });
}

export async function removePlayer(playerId: string) {
  await deleteDoc(doc(playersCollectionRef, playerId));
}

// Reset/clear game and all players
export async function resetGameDb(newQuestions?: Question[]) {
  const batch = writeBatch(db);
  
  // 1. Reset main game state
  const cleanState: GameState = {
    currentQuestionIndex: -1,
    status: 'lobby',
    questionTimer: 0,
    timerActive: false,
    questions: newQuestions || defaultQuestions,
    currentQuestionActiveAt: 0,
    totalPlayers: 0
  };
  batch.set(gameDocRef, cleanState);

  // 2. Clear all players
  const snapshot = await getDocs(playersCollectionRef);
  snapshot.forEach((pDoc) => {
    batch.delete(pDoc.ref);
  });

  await batch.commit();
}

// Update scores at the end of a question
export async function calculateAndApplyScores(correctAnswer: 'O' | 'X', maxTimerSeconds: number) {
  const snapshot = await getDocs(playersCollectionRef);
  const batch = writeBatch(db);

  snapshot.forEach((pDoc) => {
    const pData = pDoc.data() as Player;
    const isCorrect = pData.lastAnswer === correctAnswer;
    
    let scoreEarned = 0;
    let newStreak = pData.streak;

    if (pData.lastAnswer !== null) {
      if (isCorrect) {
        newStreak = (pData.streak || 0) + 1;
        // Base score: 1000 points
        // Speed bonus: up to 500 points depending on how fast they answered
        // e.g., answered in 0 seconds = +500, answered at last second = +0
        const speedBonus = Math.max(0, Math.round((1 - (pData.lastAnswerTime / (maxTimerSeconds * 1000))) * 500));
        // Streak bonus: +100 points per streak level (max 500)
        const streakBonus = Math.min((newStreak - 1) * 100, 500);
        
        scoreEarned = 1000 + speedBonus + streakBonus;
      } else {
        newStreak = 0;
      }
    }

    batch.update(pDoc.ref, {
      isCorrect: isCorrect,
      score: (pData.score || 0) + scoreEarned,
      streak: newStreak
    });
  });

  await batch.commit();
}

// Prepare players for next question (reset their temporary answer status)
export async function clearPlayerAnswersForNextRound() {
  const snapshot = await getDocs(playersCollectionRef);
  const batch = writeBatch(db);

  snapshot.forEach((pDoc) => {
    batch.update(pDoc.ref, {
      lastAnswer: null,
      lastAnswerTime: 0,
      isCorrect: null
    });
  });

  await batch.commit();
}

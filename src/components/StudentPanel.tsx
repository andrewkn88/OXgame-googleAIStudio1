import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, XCircle, Clock, Trophy, User, ArrowRight, Flame, Sparkles, 
  Smile, Award, BookOpen, Volume2, VolumeX, Loader2
} from 'lucide-react';
import { GameState, Player, Question } from '../types';
import { addPlayer, submitAnswer } from '../lib/firebase';
import { playJoinSound, playCorrectSound, playIncorrectSound } from '../lib/sound';

interface StudentPanelProps {
  gameState: GameState;
  players: Player[];
}

export default function StudentPanel({ gameState, players }: StudentPanelProps) {
  const [playerId, setPlayerId] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [localAnswer, setLocalAnswer] = useState<'O' | 'X' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Track state transitions to play sound effects on Reveal Answer
  const prevStatusRef = useRef<string>('');

  // 1. Check or generate Player ID on mount
  useEffect(() => {
    let id = localStorage.getItem('quiz_player_id');
    const savedName = localStorage.getItem('quiz_player_name');
    if (!id) {
      id = 'std_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('quiz_player_id', id);
    }
    setPlayerId(id);
    if (savedName) {
      setNickname(savedName);
    }
  }, []);

  const currentPlayer = players.find(p => p.id === playerId);
  const isRegistered = !!currentPlayer;

  // 2. Play sound effects on result reveal
  useEffect(() => {
    if (isRegistered && prevStatusRef.current === 'playing' && gameState.status === 'showing_answer') {
      if (currentPlayer) {
        if (currentPlayer.isCorrect) {
          if (soundEnabled) playCorrectSound();
        } else {
          if (soundEnabled) playIncorrectSound();
        }
      }
    }
    prevStatusRef.current = gameState.status;
  }, [gameState.status, isRegistered, currentPlayer, soundEnabled]);

  // Reset local answer selection when a new question starts
  useEffect(() => {
    if (gameState.status === 'playing') {
      setLocalAnswer(null);
    }
  }, [gameState.currentQuestionIndex, gameState.status]);

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !playerId) return;
    
    setIsJoining(true);
    try {
      localStorage.setItem('quiz_player_name', nickname.trim());
      await addPlayer(playerId, nickname.trim());
      if (soundEnabled) playJoinSound();
    } catch (err) {
      console.error('Error joining lobby:', err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleSelectAnswer = async (choice: 'O' | 'X') => {
    if (!isRegistered || localAnswer || gameState.status !== 'playing') return;
    
    setLocalAnswer(choice);
    const timeTakenMs = Date.now() - gameState.currentQuestionActiveAt;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    
    if (currentQ) {
      const isCorrect = choice === currentQ.answer;
      await submitAnswer(playerId, choice, timeTakenMs, isCorrect);
    }
  };

  // Find student's own rank
  const myRank = players.findIndex(p => p.id === playerId) + 1;
  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  // ------------------ 1. ENTRY SCREEN ------------------
  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-linear-to-b from-indigo-50 to-slate-100 flex items-center justify-center px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xl text-center space-y-6"
        >
          <div className="space-y-2">
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">실시간 OX 퀴즈 온!</h1>
            <p className="text-sm text-slate-500">닉네임을 입력하고 실시간 퀴즈 방에 바로 입장해보세요.</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4 pt-4">
            <div className="text-left space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">사용할 닉네임</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                  <User className="w-5 h-5" />
                </span>
                <input 
                  type="text"
                  required
                  placeholder="예: 홍길동, 퀴즈왕"
                  maxLength={12}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800 placeholder-slate-400 transition-all outline-hidden"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isJoining || !nickname.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>대기방 입장 중...</span>
                </>
              ) : (
                <>
                  <span>퀴즈 대기방 입장</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Sound switch inside login screen */}
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center space-x-1 hover:text-slate-600 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span>{soundEnabled ? '효과음 켜짐' : '효과음 꺼짐'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ------------------ 2. LOBBY STATE ------------------
  if (gameState.status === 'lobby') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        {/* Lobby Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <Smile className="w-5 h-5 text-indigo-600 animate-bounce" />
            <h2 className="font-extrabold text-base text-indigo-950">실시간 퀴즈 대기실</h2>
          </div>
          
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-600" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </header>

        {/* Lobby Main Content */}
        <div className="max-w-md w-full mx-auto px-6 py-8 flex-1 flex flex-col justify-center space-y-6">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-indigo-900 text-white rounded-3xl p-6 text-center shadow-lg relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 opacity-10">
              <User className="w-32 h-32" />
            </div>
            
            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">환영합니다!</p>
            <h1 className="text-2xl font-black mt-1">{currentPlayer.name} 님</h1>
            
            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center space-x-3">
              <Loader2 className="w-5 h-5 text-indigo-300 animate-spin" />
              <p className="text-sm font-semibold text-indigo-100">선생님이 퀴즈를 시작하길 기다리고 있습니다.</p>
            </div>
          </motion.div>

          {/* Connected players directory */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex-1 max-h-60 flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">현재 접속한 친구들 ({players.length}명)</h3>
            <div className="overflow-y-auto space-y-2 flex-1 pr-1 text-sm font-medium">
              {players.map((p) => (
                <div 
                  key={p.id}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all ${p.id === playerId ? 'bg-indigo-50 border border-indigo-100 text-indigo-800' : 'bg-slate-50 text-slate-700'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${p.id === playerId ? 'bg-indigo-500 animate-ping' : 'bg-emerald-400'}`} />
                  <span className="truncate">{p.name} {p.id === playerId && '(나)'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="p-4 text-center text-xs text-slate-400 bg-white border-t border-slate-100">
          실시간 퀴즈 게임 • 온스크린 업데이트
        </footer>
      </div>
    );
  }

  // ------------------ 3. ACTIVE PLAYING STATE ------------------
  if (gameState.status === 'playing') {
    const hasAnswered = currentPlayer.lastAnswer !== null;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900">
        
        {/* Active Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
          <span className="font-bold text-sm text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            문제 {gameState.currentQuestionIndex + 1} / {gameState.questions.length}
          </span>
          
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Clock className={`w-4 h-4 ${gameState.questionTimer <= 5 ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
            <span className={`text-base font-black font-mono leading-none ${gameState.questionTimer <= 5 ? 'text-rose-600' : 'text-slate-700'}`}>
              {gameState.questionTimer}초
            </span>
          </div>
        </header>

        {/* Playboard Area */}
        <div className="max-w-lg w-full mx-auto px-6 py-8 flex-1 flex flex-col justify-center space-y-8">
          
          {/* Question Text Box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-3 shadow-xs">
            <span className="text-xs font-black text-indigo-500 uppercase tracking-widest block">질문</span>
            <p className="text-2xl font-black text-slate-900 leading-normal">{currentQ?.question}</p>
          </div>

          <AnimatePresence mode="wait">
            {!hasAnswered ? (
              // Two Giant buttons for O and X
              <motion.div 
                key="input-buttons"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-2 gap-6 h-60"
              >
                {/* O Button */}
                <button 
                  onClick={() => handleSelectAnswer('O')}
                  className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-3xl font-black text-7xl flex flex-col items-center justify-center space-y-2 shadow-lg shadow-emerald-100 transition-all cursor-pointer border-b-8 border-emerald-600"
                >
                  <span>O</span>
                  <span className="text-xs font-black uppercase tracking-widest bg-emerald-600/30 px-3 py-1 rounded-full">O 선택</span>
                </button>

                {/* X Button */}
                <button 
                  onClick={() => handleSelectAnswer('X')}
                  className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-3xl font-black text-7xl flex flex-col items-center justify-center space-y-2 shadow-lg shadow-rose-100 transition-all cursor-pointer border-b-8 border-rose-600"
                >
                  <span>X</span>
                  <span className="text-xs font-black uppercase tracking-widest bg-rose-600/30 px-3 py-1 rounded-full">X 선택</span>
                </button>
              </motion.div>
            ) : (
              // Submitted Screen
              <motion.div 
                key="submitted-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-indigo-900 text-white rounded-3xl p-8 text-center space-y-4 shadow-lg border border-indigo-950"
              >
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-emerald-400 animate-bounce" />
                </div>
                
                <h3 className="text-xl font-bold">답변이 제출되었습니다!</h3>
                <p className="text-sm text-indigo-200">다른 친구들이 모두 답변을 완료할 때까지 잠시 대기해주세요.</p>

                <div className="mt-6 inline-block bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
                  <span className="text-xs text-indigo-300 font-bold block">나의 답변</span>
                  <span className="text-4xl font-black text-white font-mono mt-1 block">{currentPlayer.lastAnswer}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Player Mini Stats */}
        <footer className="p-4 bg-white border-t border-slate-100 flex justify-between items-center px-6">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-sm text-slate-800">{currentPlayer.name}</span>
            {currentPlayer.streak > 0 && (
              <span className="text-[10px] bg-amber-100 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded font-black flex items-center space-x-1">
                <Flame className="w-3 h-3 text-amber-500 fill-current animate-pulse" />
                <span>{currentPlayer.streak}연승</span>
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-indigo-600">{currentPlayer.score}점 ({myRank}위)</span>
        </footer>
      </div>
    );
  }

  // ------------------ 4. SHOWING ANSWER / EXPLANATION STATE ------------------
  if (gameState.status === 'showing_answer') {
    const isCorrect = currentPlayer.isCorrect;
    const submitted = currentPlayer.lastAnswer !== null;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900">
        
        {/* Reveal Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 text-center font-bold text-base text-slate-800 shadow-xs">
          결과 공개!
        </header>

        {/* Main Answer Panel */}
        <div className="max-w-md w-full mx-auto px-6 py-8 flex-1 flex flex-col justify-center space-y-6">
          
          {/* Answer Graphic Card */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`rounded-3xl p-8 text-center border shadow-lg relative overflow-hidden ${
              !submitted 
                ? 'bg-slate-100 border-slate-200 text-slate-700' 
                : isCorrect 
                  ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-100' 
                  : 'bg-rose-500 border-rose-600 text-white shadow-rose-100'
            }`}
          >
            {/* Big floating background icon */}
            <div className="absolute right-4 top-4 opacity-10">
              {isCorrect ? <CheckCircle className="w-32 h-32" /> : <XCircle className="w-32 h-32" />}
            </div>

            <span className="text-xs font-black uppercase tracking-widest block opacity-75">결과</span>
            
            <h1 className="text-3xl font-black mt-2">
              {!submitted 
                ? '시간 초과로 미제출 😢' 
                : isCorrect 
                  ? '정답입니다! 🎉' 
                  : '아쉽게도 오답입니다... 😢'}
            </h1>

            {/* Answer Display */}
            <div className="my-6 inline-flex items-center space-x-3 bg-white/10 border border-white/15 px-6 py-3 rounded-2xl justify-center">
              <div>
                <span className="text-[10px] font-bold block opacity-75">선택한 답변</span>
                <span className="text-2xl font-black font-mono">{currentPlayer.lastAnswer || '미제출'}</span>
              </div>
              <div className="border-l border-white/20 h-8" />
              <div>
                <span className="text-[10px] font-bold block opacity-75">진짜 정답</span>
                <span className="text-2xl font-black font-mono text-amber-200">{currentQ?.answer}</span>
              </div>
            </div>

            {/* Streak Multiplier Banner */}
            {isCorrect && currentPlayer.streak > 1 && (
              <div className="bg-amber-400 text-amber-950 font-black rounded-xl py-2 px-4 text-xs inline-flex items-center space-x-1 justify-center">
                <Flame className="w-4 h-4 fill-current text-amber-900 animate-pulse" />
                <span>연승 보너스 적용! ({currentPlayer.streak}연승 중 🔥)</span>
              </div>
            )}
          </motion.div>

          {/* Explanation text */}
          {currentQ?.explanation && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <span className="text-xs font-black text-indigo-500 flex items-center space-x-1.5">
                <BookOpen className="w-4 h-4" />
                <span>정답 해설</span>
              </span>
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {currentQ.explanation}
              </p>
            </div>
          )}

        </div>

        {/* Score and rank display */}
        <footer className="p-4 bg-white border-t border-slate-100 flex justify-between items-center px-6">
          <span className="font-extrabold text-sm text-slate-800">현재 총점: {currentPlayer.score}점</span>
          <span className="text-sm font-bold text-indigo-600">전체 {myRank}위</span>
        </footer>
      </div>
    );
  }

  // ------------------ 5. FINAL LEADERBOARD VIEW ------------------
  if (gameState.status === 'finished') {
    return (
      <div className="min-h-screen bg-linear-to-b from-indigo-50 to-slate-100 flex flex-col justify-between">
        
        <header className="bg-white border-b border-slate-200 px-6 py-4 text-center font-bold text-base text-indigo-950 shadow-xs">
          최종 순위 발표 🏆
        </header>

        {/* Podium and scores list */}
        <div className="max-w-md w-full mx-auto px-6 py-8 flex-1 flex flex-col justify-center space-y-6">
          <div className="text-center space-y-2">
            <Trophy className="w-12 h-12 text-amber-500 mx-auto animate-bounce" />
            <h1 className="text-2xl font-black text-slate-800">모든 퀴즈가 끝났습니다!</h1>
            <p className="text-sm text-slate-500">당신의 최종 점수와 석차를 확인하세요.</p>
          </div>

          {/* Player Personal Stat Badge */}
          <div className="bg-indigo-900 text-white rounded-3xl p-6 text-center shadow-md space-y-2">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest block">나의 석차</span>
            <p className="text-4xl font-black">{myRank} <span className="text-xl font-normal text-indigo-200">위 / {players.length}명</span></p>
            <p className="text-sm text-indigo-200 font-medium">최종 점수: {currentPlayer.score}점</p>
          </div>

          {/* Quick List of top players */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs max-h-52 overflow-y-auto space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">리더보드 순위</h3>
            {players.slice(0, 10).map((p, idx) => (
              <div 
                key={p.id}
                className={`flex items-center justify-between py-2 px-3 rounded-xl text-sm ${p.id === playerId ? 'bg-indigo-50 border border-indigo-100 font-bold text-indigo-900' : 'text-slate-700'}`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                    {idx + 1}
                  </span>
                  <span className="truncate">{p.name} {p.id === playerId && '(나)'}</span>
                </div>
                <span className="font-mono text-xs">{p.score}점</span>
              </div>
            ))}
          </div>
        </div>

        <footer className="p-4 text-center text-xs text-slate-400 bg-white border-t border-slate-100">
          실시간 OX 퀴즈를 플레이해주셔서 감사합니다.
        </footer>
      </div>
    );
  }

  return null;
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Play, RotateCcw, HelpCircle, ArrowRight, CheckCircle2, AlertCircle, 
  Trash2, Plus, Volume2, VolumeX, ListMusic, Trophy, ChevronRight, Award,
  Clock, Check, X, FileSpreadsheet, Sparkles
} from 'lucide-react';
import { GameState, Player, Question } from '../types';
import { 
  updateGameState, resetGameDb, calculateAndApplyScores, 
  clearPlayerAnswersForNextRound, removePlayer 
} from '../lib/firebase';
import { playFinishSound, playTickSound } from '../lib/sound';

interface AdminPanelProps {
  gameState: GameState;
  players: Player[];
}

export default function AdminPanel({ gameState, players }: AdminPanelProps) {
  const [pasteText, setPasteText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Question[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customQuestion, setCustomQuestion] = useState({ question: '', answer: 'O' as 'O' | 'X', explanation: '' });
  const [pastedStatus, setPastedStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Background timer ticking effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (gameState.timerActive && gameState.questionTimer > 0) {
      intervalId = setInterval(() => {
        const nextTimer = gameState.questionTimer - 1;
        
        // Tick sound
        if (soundEnabled && nextTimer <= 5 && nextTimer > 0) {
          playTickSound();
        }

        if (nextTimer <= 0) {
          // Timer ran out, trigger score calculation
          handleRevealAnswer();
        } else {
          updateGameState({ questionTimer: nextTimer });
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [gameState.timerActive, gameState.questionTimer]);

  // Handle parsing of pasted questions
  const handleParseQuestions = () => {
    if (!pasteText.trim()) return;
    
    const lines = pasteText.split('\n');
    const parsed: Question[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Delimiters: Tab first, then pipe |, then comma
      let parts: string[] = [];
      if (trimmed.includes('\t')) {
        parts = trimmed.split('\t');
      } else if (trimmed.includes('|')) {
        parts = trimmed.split('|');
      } else {
        parts = trimmed.split(',');
      }
      
      if (parts.length >= 1) {
        const questionText = parts[0].trim();
        let answerText: 'O' | 'X' = 'O';
        let explanationText = '';
        
        if (parts.length >= 2) {
          const rawAns = parts[1].trim().toUpperCase();
          if (rawAns === 'X' || rawAns === 'ㅌ' || rawAns === '틀림' || rawAns === 'FALSE' || rawAns === 'F' || rawAns === '정답:X') {
            answerText = 'X';
          }
        }
        
        if (parts.length >= 3) {
          explanationText = parts.slice(2).join(' ').trim();
        }
        
        if (questionText) {
          parsed.push({
            id: `q_${Date.now()}_${index}`,
            question: questionText,
            answer: answerText,
            explanation: explanationText
          });
        }
      }
    });

    if (parsed.length > 0) {
      setParsedPreview(parsed);
      setPastedStatus('success');
    } else {
      setPastedStatus('error');
    }
  };

  const handleApplyPastedQuestions = async () => {
    if (parsedPreview.length === 0) return;
    await resetGameDb(parsedPreview);
    setPasteText('');
    setParsedPreview([]);
    setPastedStatus('idle');
  };

  const handleAddSingleQuestion = () => {
    if (!customQuestion.question.trim()) return;
    const newQ: Question = {
      id: `single_${Date.now()}`,
      question: customQuestion.question.trim(),
      answer: customQuestion.answer,
      explanation: customQuestion.explanation.trim()
    };
    const updatedQs = [...gameState.questions, newQ];
    updateGameState({ questions: updatedQs });
    setCustomQuestion({ question: '', answer: 'O', explanation: '' });
  };

  const handleDeleteQuestion = (id: string) => {
    const updated = gameState.questions.filter(q => q.id !== id);
    updateGameState({ questions: updated });
  };

  const handleStartGame = async () => {
    if (gameState.questions.length === 0) return;
    await clearPlayerAnswersForNextRound();
    await updateGameState({
      status: 'playing',
      currentQuestionIndex: 0,
      questionTimer: 15, // default 15s
      timerActive: true,
      currentQuestionActiveAt: Date.now()
    });
  };

  const handleRevealAnswer = async () => {
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (!currentQ) return;
    
    // 1. Pause timer
    await updateGameState({ timerActive: false });
    
    // 2. Compute and save player scores
    await calculateAndApplyScores(currentQ.answer, 15);
    
    // 3. Move state to showing_answer
    await updateGameState({ status: 'showing_answer' });
  };

  const handleNextQuestion = async () => {
    const nextIndex = gameState.currentQuestionIndex + 1;
    if (nextIndex >= gameState.questions.length) {
      // Game Over! Show Leaderboard
      if (soundEnabled) playFinishSound();
      await updateGameState({ 
        status: 'finished',
        currentQuestionIndex: -2
      });
    } else {
      // Prepare for next round
      await clearPlayerAnswersForNextRound();
      await updateGameState({
        status: 'playing',
        currentQuestionIndex: nextIndex,
        questionTimer: 15,
        timerActive: true,
        currentQuestionActiveAt: Date.now()
      });
    }
  };

  const handleAddTime = () => {
    const newTimer = gameState.questionTimer + 10;
    updateGameState({ questionTimer: newTimer });
  };

  const handleResetAll = async () => {
    if (window.confirm('정말 게임을 초기화하시겠습니까? 모든 참가자와 퀴즈 목록이 초기화됩니다.')) {
      await resetGameDb();
      setPasteText('');
      setParsedPreview([]);
    }
  };

  // Compute round answers count
  const submittedCount = players.filter(p => p.lastAnswer !== null).length;
  const oCount = players.filter(p => p.lastAnswer === 'O').length;
  const xCount = players.filter(p => p.lastAnswer === 'X').length;
  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Teacher Console Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">OX 퀴즈 교사용 제어판</h1>
            <p className="text-xs text-slate-500 font-mono">Status: {gameState.status.toUpperCase()}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-colors border ${soundEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
            title="효과음 토글"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={handleResetAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>전체 초기화</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Controls & Game State */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* LOBBY VIEW */}
          {gameState.status === 'lobby' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">1. 퀴즈 일괄 업로드 (표 형식)</h2>
                  <p className="text-sm text-slate-500 mt-1">엑셀, 한글 표 또는 노션 테이블을 복사해서 붙여넣으세요.</p>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-3">
                <textarea 
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="[형식 1] 질문(Tab)정답(O 또는 X)(Tab)해설(선택)&#10;[형식 2] 대한민국 수도는 서울이다 | O | 서울이 맞습니다.&#10;[형식 3] 1년은 365일이다, O, 맞습니다.&#10;&#10;* 한 줄에 한 문제씩 입력하세요."
                  className="w-full h-40 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm resize-none bg-slate-50"
                />
                
                <div className="flex space-x-3">
                  <button 
                    onClick={handleParseQuestions}
                    className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center space-x-2 shadow-xs"
                  >
                    <span>표 데이터 미리보기 및 파싱</span>
                  </button>
                </div>
              </div>

              {/* Parsed Preview Section */}
              {parsedPreview.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-800 font-bold flex items-center space-x-1.5 text-sm">
                      <Check className="w-4 h-4" />
                      <span>{parsedPreview.length}개의 문제가 파싱되었습니다!</span>
                    </span>
                    <button 
                      onClick={handleApplyPastedQuestions}
                      className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      퀴즈 목록에 일괄 적용
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {parsedPreview.map((q, idx) => (
                      <div key={idx} className="bg-white/80 p-2 rounded-lg border border-emerald-200/50 text-xs flex justify-between items-center">
                        <span className="font-medium text-slate-800 truncate max-w-xs">{idx + 1}. {q.question}</span>
                        <div className="flex items-center space-x-2">
                          <span className={`px-1.5 py-0.5 rounded-md font-bold ${q.answer === 'O' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{q.answer}</span>
                          {q.explanation && <span className="text-slate-400 italic truncate max-w-[120px]">{q.explanation}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <hr className="border-slate-100" />

              {/* Game Start Controller */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">플레이 제어</h3>
                  <p className="text-lg font-extrabold text-indigo-900 mt-1">총 {gameState.questions.length}개 퀴즈 대기 중</p>
                </div>
                
                <button 
                  onClick={handleStartGame}
                  disabled={gameState.questions.length === 0 || players.length === 0}
                  className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>실시간 퀴즈 시작</span>
                </button>
              </div>

              {players.length === 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>최소 한 명 이상의 학생이 메인 주소로 접속해야 게임을 시작할 수 있습니다.</span>
                </div>
              )}
            </motion.div>
          )}

          {/* ACTIVE PLAYING VIEW */}
          {gameState.status === 'playing' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold font-mono">
                    QUESTION {gameState.currentQuestionIndex + 1} OF {gameState.questions.length}
                  </span>
                  <h2 className="text-2xl font-black text-slate-800 mt-2">현재 진행 중인 퀴즈</h2>
                </div>
                
                {/* Visual Countdown Timer */}
                <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
                  <Clock className={`w-5 h-5 ${gameState.questionTimer <= 5 ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
                  <span className={`text-2xl font-black font-mono leading-none ${gameState.questionTimer <= 5 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {gameState.questionTimer}s
                  </span>
                </div>
              </div>

              {/* Large Question Display */}
              <div className="bg-indigo-900/5 border border-indigo-100 rounded-2xl p-6 text-center space-y-4">
                <span className="text-sm font-bold text-indigo-500 uppercase tracking-wider">질문 내용</span>
                <p className="text-3xl font-black text-indigo-950 leading-normal">{currentQ?.question}</p>
                <div className="flex justify-center space-x-4 pt-2">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${currentQ?.answer === 'O' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    정답: {currentQ?.answer}
                  </span>
                </div>
              </div>

              {/* Submission stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                  <span className="text-xs font-bold text-slate-500 block">제출 상태</span>
                  <span className="text-3xl font-black text-slate-800 font-mono mt-1 block">
                    {submittedCount} <span className="text-lg text-slate-400">/ {players.length}</span>
                  </span>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-300"
                      style={{ width: `${players.length ? (submittedCount / players.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-500 block">현재 응답 비율</span>
                    <span className="text-sm font-bold text-slate-700 mt-2 block">
                      O : {players.filter(p => p.lastAnswer === 'O').length}명 | X : {players.filter(p => p.lastAnswer === 'X').length}명
                    </span>
                  </div>
                  <button 
                    onClick={handleAddTime}
                    className="mt-2 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>시간 +10초 연장</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <button 
                onClick={handleRevealAnswer}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100 text-lg"
              >
                <span>지금 정답 공개하기</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* REVEAL ANSWER VIEW */}
          {gameState.status === 'showing_answer' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold font-mono">
                    ANSWER REVEALED
                  </span>
                  <h2 className="text-2xl font-black text-slate-800 mt-2">정답 해설 및 분석</h2>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-6 text-center space-y-4 relative overflow-hidden">
                <div className="absolute right-4 top-4 opacity-10">
                  <Trophy className="w-24 h-24 text-indigo-400" />
                </div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">문제 내용</span>
                <p className="text-xl font-bold leading-normal">{currentQ?.question}</p>
                
                <div className="flex justify-center items-center space-x-3 pt-2">
                  <span className="text-sm font-semibold text-slate-400">공식 정답:</span>
                  <span className={`w-14 h-14 rounded-2xl text-3xl font-black flex items-center justify-center shadow-lg ${currentQ?.answer === 'O' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {currentQ?.answer}
                  </span>
                </div>

                {currentQ?.explanation && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
                    <span className="text-xs text-indigo-300 font-bold block mb-1">정답 해설</span>
                    <p className="text-sm text-slate-200 leading-relaxed">{currentQ.explanation}</p>
                  </div>
                )}
              </div>

              {/* Answers Bar Chart */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">실시간 응답 분포</h3>
                
                <div className="space-y-3">
                  {/* O Answer Bar */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-emerald-700 flex items-center space-x-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>O를 고른 학생</span>
                      </span>
                      <span>{oCount}명 ({players.length ? Math.round((oCount/players.length)*100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${currentQ?.answer === 'O' ? 'bg-emerald-500' : 'bg-emerald-300'}`}
                        style={{ width: `${players.length ? (oCount / players.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* X Answer Bar */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-rose-700 flex items-center space-x-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>X를 고른 학생</span>
                      </span>
                      <span>{xCount}명 ({players.length ? Math.round((xCount/players.length)*100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${currentQ?.answer === 'X' ? 'bg-rose-500' : 'bg-rose-300'}`}
                        style={{ width: `${players.length ? (xCount / players.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Next controls */}
              <button 
                onClick={handleNextQuestion}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold transition-all flex items-center justify-center space-x-2 text-lg shadow-lg"
              >
                <span>
                  {gameState.currentQuestionIndex + 1 >= gameState.questions.length ? '최종 결과 확인하기' : '다음 문제로 넘어가기'}
                </span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* FINISHED VIEW */}
          {gameState.status === 'finished' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-8"
            >
              <div className="space-y-2">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Trophy className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black text-slate-800">모든 퀴즈가 끝났습니다!</h2>
                <p className="text-sm text-slate-500">학생들의 치열한 순위 다툼 결과를 확인해보세요.</p>
              </div>

              {/* Top 3 Podium Visual */}
              {players.length > 0 && (
                <div className="flex justify-center items-end space-x-4 pt-12 pb-6 max-w-md mx-auto">
                  {/* 2nd Place */}
                  {players[1] && (
                    <div className="flex flex-col items-center space-y-2 w-28">
                      <div className="w-12 h-12 rounded-full border-2 border-slate-300 bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-lg shadow-xs">
                        2
                      </div>
                      <span className="font-bold text-sm text-slate-700 truncate max-w-[100px]">{players[1].name}</span>
                      <span className="text-xs font-mono text-slate-500">{players[1].score}점</span>
                      <div className="w-full bg-slate-200/80 rounded-t-xl h-20 flex items-center justify-center border-t border-slate-300">
                        <span className="text-slate-500 font-extrabold text-sm">2위</span>
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {players[0] && (
                    <div className="flex flex-col items-center space-y-2 w-32 -translate-y-4">
                      <div className="relative">
                        <Award className="w-6 h-6 text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                        <div className="w-16 h-16 rounded-full border-4 border-amber-400 bg-amber-50 flex items-center justify-center font-black text-amber-600 text-2xl shadow-md">
                          1
                        </div>
                      </div>
                      <span className="font-black text-base text-amber-950 truncate max-w-[110px]">{players[0].name}</span>
                      <span className="text-sm font-black text-amber-600 font-mono">{players[0].score}점</span>
                      <div className="w-full bg-amber-400/90 rounded-t-2xl h-28 flex items-center justify-center border-t border-amber-300 shadow-sm">
                        <span className="text-amber-950 font-black text-base">우승 🏆</span>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {players[2] && (
                    <div className="flex flex-col items-center space-y-2 w-24">
                      <div className="w-10 h-10 rounded-full border-2 border-amber-700 bg-amber-50/50 flex items-center justify-center font-bold text-amber-800 text-sm shadow-xs">
                        3
                      </div>
                      <span className="font-bold text-sm text-slate-700 truncate max-w-[80px]">{players[2].name}</span>
                      <span className="text-xs font-mono text-slate-500">{players[2].score}점</span>
                      <div className="w-full bg-amber-800/15 rounded-t-xl h-14 flex items-center justify-center border-t border-amber-800/30">
                        <span className="text-amber-900 font-bold text-xs">3위</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reset to Lobby */}
              <button 
                onClick={async () => {
                  if (window.confirm('새로운 게임을 위해 모든 기록을 초기화하고 대기방으로 돌아갑니다.')) {
                    await resetGameDb(gameState.questions);
                  }
                }}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg"
              >
                대기방으로 돌아가기 (동일 문제 유지)
              </button>
            </motion.div>
          )}

          {/* QUESTION MANAGEMENT / LIST (When not started) */}
          {gameState.status === 'lobby' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">2. 개별 문제 직접 등록 & 관리</h3>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">총 {gameState.questions.length}문제</span>
              </div>

              {/* Add Custom Question Mini-Form */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                <input 
                  type="text"
                  placeholder="추가할 퀴즈 질문을 입력하세요"
                  value={customQuestion.question}
                  onChange={(e) => setCustomQuestion({ ...customQuestion, question: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
                
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-500">정답:</span>
                  <button 
                    onClick={() => setCustomQuestion({ ...customQuestion, answer: 'O' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${customQuestion.answer === 'O' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600'}`}
                  >
                    O (참)
                  </button>
                  <button 
                    onClick={() => setCustomQuestion({ ...customQuestion, answer: 'X' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${customQuestion.answer === 'X' ? 'bg-rose-500 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600'}`}
                  >
                    X (거짓)
                  </button>
                </div>

                <input 
                  type="text"
                  placeholder="정답에 대한 해설 설명 (선택 사항)"
                  value={customQuestion.explanation}
                  onChange={(e) => setCustomQuestion({ ...customQuestion, explanation: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />

                <button 
                  onClick={handleAddSingleQuestion}
                  className="w-full py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>새로운 문제 리스트에 추가</span>
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {gameState.questions.map((q, idx) => (
                  <div key={q.id} className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center text-sm shadow-xs">
                    <div className="space-y-1 truncate max-w-[80%]">
                      <p className="font-semibold text-slate-800 truncate">{idx + 1}. {q.question}</p>
                      {q.explanation && <p className="text-xs text-slate-400 truncate">{q.explanation}</p>}
                    </div>
                    
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${q.answer === 'O' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {q.answer}
                      </span>
                      <button 
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Real-time Player List / Standings */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-800">실시간 참가 학생 ({players.length}명)</h3>
              </div>
            </div>

            {players.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Users className="w-8 h-8 mx-auto opacity-40 animate-pulse" />
                <p className="text-sm">입장한 학생이 없습니다.</p>
                <p className="text-xs">학생들은 추가 경로 없이 기본 링크로 접속하면 즉시 대기방에 나타납니다!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {players.map((p, idx) => {
                  const isCurrentQCorrect = p.isCorrect;
                  const isSubmitted = p.lastAnswer !== null;

                  return (
                    <motion.div 
                      key={p.id}
                      layoutId={`player-${p.id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        {/* Rank Badge */}
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        
                        <div className="truncate">
                          <p className="font-bold text-slate-800 truncate flex items-center space-x-1.5">
                            <span>{p.name}</span>
                            {p.streak > 1 && (
                              <span className="text-[10px] bg-amber-100 border border-amber-200 text-amber-700 px-1 py-0.5 rounded font-black">
                                🔥 {p.streak}연승
                              </span>
                            )}
                          </p>
                          <span className="text-xs font-mono font-bold text-indigo-600 block">{p.score} 점</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Status Icon based on current Game State */}
                        {gameState.status === 'playing' && (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isSubmitted ? 'bg-indigo-100 text-indigo-700 animate-pulse' : 'bg-slate-200 text-slate-400'}`}>
                            {isSubmitted ? '답변 제출' : '생각 중...'}
                          </span>
                        )}

                        {gameState.status === 'showing_answer' && (
                          <div className="flex items-center space-x-1">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold ${p.lastAnswer === 'O' ? 'bg-emerald-100 text-emerald-800' : p.lastAnswer === 'X' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-400'}`}>
                              {p.lastAnswer || '-'}
                            </span>
                            <span className={`text-xs font-bold ${isCurrentQCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {isCurrentQCorrect ? '✓' : '✗'}
                            </span>
                          </div>
                        )}

                        {/* Kick Student option */}
                        <button 
                          onClick={async () => {
                            if (window.confirm(`${p.name} 학생을 내보내시겠습니까?`)) {
                              await removePlayer(p.id);
                            }
                          }}
                          className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition-colors"
                          title="학생 추방"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

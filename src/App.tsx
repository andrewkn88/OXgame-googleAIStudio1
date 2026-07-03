import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Sparkles, Wifi, ArrowRight, Laptop, Users } from 'lucide-react';
import { subscribeToGameState, subscribeToPlayers, initializeDefaultGame } from './lib/firebase';
import { GameState, Player } from './types';
import AdminPanel from './components/AdminPanel';
import StudentPanel from './components/StudentPanel';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'both' | 'admin' | 'student'>('both');

  // Simple Location Router
  useEffect(() => {
    const checkPath = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/admin')) {
        setViewMode('admin');
      } else if (path.startsWith('/student')) {
        setViewMode('student');
      } else {
        setViewMode('both');
      }
    };
    checkPath();
    
    // Add event listener for pushState/popState
    window.addEventListener('popstate', checkPath);
    return () => {
      window.removeEventListener('popstate', checkPath);
    };
  }, []);

  // Subscribe to Realtime Firestore updates
  useEffect(() => {
    // 1. First trigger database initialization just in case it's completely blank
    initializeDefaultGame();

    // 2. Subscribe to GameState changes in real-time
    const unsubscribeGameState = subscribeToGameState((state) => {
      setGameState(state);
      setLoading(false);
    });

    // 3. Subscribe to active Players in real-time
    const unsubscribePlayers = subscribeToPlayers((playerList) => {
      setPlayers(playerList);
    });

    return () => {
      unsubscribeGameState();
      unsubscribePlayers();
    };
  }, []);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-12 h-12 bg-indigo-100 rounded-2xl animate-ping opacity-75" />
          <div className="p-3 bg-indigo-600 text-white rounded-2xl relative shadow-md">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-black text-slate-800 tracking-tight">OX 퀴즈 실시간 동기화 중...</p>
          <p className="text-xs text-slate-400">Firebase Firestore 연결 중</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 antialiased flex flex-col">
      {/* Top Navigation Mode Switcher */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-slate-800">실시간 OX 퀴즈</span>
            <span className="ml-2 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5 font-bold">LIVE</span>
          </div>
        </div>

        <div className="bg-slate-100 p-1 rounded-full flex items-center space-x-1 border border-slate-200">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all flex items-center space-x-1.5 ${
              viewMode === 'both'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>강사 + 학생 동시 보기</span>
          </button>
          <button
            onClick={() => setViewMode('admin')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all flex items-center space-x-1.5 ${
              viewMode === 'admin'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>강사 화면만</span>
          </button>
          <button
            onClick={() => setViewMode('student')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all flex items-center space-x-1.5 ${
              viewMode === 'student'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>학생 화면만</span>
          </button>
        </div>
      </nav>

      {/* Tiny live connectivity indicator */}
      <div className="fixed bottom-3 right-3 z-50 bg-slate-900/90 text-white border border-slate-800/80 rounded-full px-2.5 py-1 text-[10px] font-bold flex items-center space-x-1 shadow-sm backdrop-blur-xs">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        <span className="opacity-80">실시간 연동됨</span>
      </div>

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {viewMode === 'both' && (
            <motion.div
              key="combined-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-slate-200"
            >
              {/* Left Column: Admin view */}
              <div className="flex flex-col bg-slate-50">
                <button
                  onClick={() => setViewMode('admin')}
                  className="p-3 bg-indigo-50/80 hover:bg-indigo-100/80 border-b border-indigo-100 flex items-center justify-between transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold text-indigo-700 bg-indigo-100 border border-indigo-200/60 px-2.5 py-1 rounded-full uppercase tracking-wider">강사(교사) 제어 화면</span>
                    <span className="text-[10px] text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">클릭하여 단독 화면으로 전환</span>
                  </div>
                  <div className="text-xs font-bold text-indigo-600 flex items-center space-x-1 bg-white border border-indigo-200 px-2.5 py-1 rounded-md shadow-xs group-hover:shadow-sm transition-all">
                    <span>강사 화면만 보기</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
                <div className="flex-1 overflow-auto">
                  <AdminPanel gameState={gameState!} players={players} />
                </div>
              </div>

              {/* Right Column: Student view */}
              <div className="flex flex-col bg-slate-50">
                <button
                  onClick={() => setViewMode('student')}
                  className="p-3 bg-emerald-50/80 hover:bg-emerald-100/80 border-b border-emerald-100 flex items-center justify-between transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-200/60 px-2.5 py-1 rounded-full uppercase tracking-wider">학생 참가 화면</span>
                    <span className="text-[10px] text-emerald-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">클릭하여 단독 화면으로 전환</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-600 flex items-center space-x-1 bg-white border border-emerald-200 px-2.5 py-1 rounded-md shadow-xs group-hover:shadow-sm transition-all">
                    <span>학생 화면만 보기</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
                <div className="flex-1 overflow-auto">
                  <StudentPanel gameState={gameState!} players={players} />
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === 'admin' && (
            <motion.div
              key="admin-only"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              <AdminPanel gameState={gameState!} players={players} />
            </motion.div>
          )}

          {viewMode === 'student' && (
            <motion.div
              key="student-only"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              <StudentPanel gameState={gameState!} players={players} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

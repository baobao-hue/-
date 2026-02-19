import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState } from './types';
import { fetchQuestions } from './services/geminiService';
import GameEngine from './components/GameEngine';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [questions, setQuestions] = useState<string[]>([]);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [gameOverTitle, setGameOverTitle] = useState<string>('');
  
  // Game stats
  const [failCount, setFailCount] = useState<number>(0);
  const [playTimeStr, setPlayTimeStr] = useState<string>('');
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const initApp = async () => {
      setGameState(GameState.LOADING);
      const fetchedQuestions = await fetchQuestions();
      setQuestions(fetchedQuestions);
      setGameState(GameState.MENU);
    };
    initApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGame = useCallback(() => {
    setGameState(GameState.PLAYING);
    setGameOverReason('');
    setGameOverTitle('');
    startTimeRef.current = Date.now();
  }, []);

  const handleGameOver = useCallback((title: string, reason: string) => {
    setGameOverTitle(title);
    setGameOverReason(reason);
    setFailCount(prev => prev + 1);
    
    // Calculate survive time
    const seconds = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
    setPlayTimeStr(`${seconds}秒`);
    
    setGameState(GameState.GAMEOVER);
  }, []);

  const handleWin = useCallback(() => {
    // Calculate win time
    const seconds = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
    setPlayTimeStr(`${seconds}秒`);
    
    setGameState(GameState.WON);
  }, []);

  return (
    <div className="w-full max-w-md h-full bg-red-900 relative overflow-hidden shadow-2xl border-x-4 border-amber-500 flex flex-col font-sans select-none">
      
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl">🏮</div>
        <div className="absolute top-40 right-10 text-6xl">🏮</div>
        <div className="absolute bottom-40 left-20 text-4xl">🧨</div>
      </div>

      {gameState === GameState.LOADING && (
        <div className="flex-1 flex flex-col items-center justify-center bg-red-800 z-50 text-amber-300">
          <div className="animate-spin text-5xl mb-4">🐴</div>
          <h2 className="text-xl font-bold tracking-widest">备马中...</h2>
        </div>
      )}

      {gameState === GameState.MENU && (
        <div className="flex-1 flex flex-col items-center justify-center z-50 p-6 text-center">
          <h1 className="text-5xl font-extrabold text-amber-400 mb-2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-widest">马到成功</h1>
          <p className="text-amber-200 text-lg mb-12 drop-shadow-md">极简跳跃 (物理意义上的)</p>
          
          <div className="bg-red-950/50 p-6 rounded-xl border-2 border-amber-600/50 mb-12 max-w-xs text-left">
            <h3 className="text-amber-400 font-bold mb-2">玩法说明：</h3>
            <ul className="text-red-100 space-y-2 text-sm">
              <li>1. 跃过新年的种种“门槛”。</li>
              <li>2. 到达终点即为成功。</li>
              <li>3. 保持微笑，不要被亲戚气炸。</li>
              <li className="text-amber-300 font-bold mt-2">💡 提示：积攒福气跨过万难。</li>
            </ul>
          </div>

          <button 
            onClick={startGame}
            className="px-12 py-4 bg-gradient-to-b from-amber-400 to-amber-600 text-red-950 text-2xl font-black rounded-full shadow-[0_6px_0_#92400e,0_15px_20px_rgba(0,0,0,0.4)] active:shadow-[0_2px_0_#92400e,0_5px_10px_rgba(0,0,0,0.4)] active:translate-y-1 transition-all"
          >
            开始挑战
          </button>
        </div>
      )}

      {(gameState === GameState.PLAYING || gameState === GameState.QTE) && (
        <GameEngine 
          questions={questions}
          onGameOver={handleGameOver}
          onWin={handleWin}
          gameState={gameState}
          setGameState={setGameState}
        />
      )}

      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="text-7xl mb-6">💥</div>
          <h2 className="text-4xl font-black text-white mb-4 tracking-wider">{gameOverTitle}</h2>
          <p className="text-xl text-red-400 mb-6 font-bold">{gameOverReason}</p>
          
          {/* Stats Box */}
          <div className="flex space-x-6 text-white/80 text-sm font-medium mb-12 bg-white/10 px-6 py-3 rounded-xl border border-white/20">
            <span>存活时长: <strong className="text-white">{playTimeStr}</strong></span>
            <span>失败次数: <strong className="text-red-400">{failCount} 次</strong></span>
          </div>
          
          <button 
            onClick={startGame}
            className="px-10 py-3 bg-red-600 text-white text-xl font-bold rounded-full shadow-[0_4px_0_#7f1d1d] active:shadow-[0_1px_0_#7f1d1d] active:translate-y-1 transition-all"
          >
            重新来过
          </button>
        </div>
      )}

      {gameState === GameState.WON && (
        <div className="absolute inset-0 z-50 bg-amber-500 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
          <div className="text-8xl mb-6 animate-bounce">🏆</div>
          <h2 className="text-5xl font-black text-red-900 mb-4 tracking-widest drop-shadow-md">不可思议</h2>
          <p className="text-2xl text-red-800 mb-8 font-bold">你居然真的通关了！？</p>
          <p className="text-sm text-red-900/60 mb-8 max-w-xs">这游戏明明设计成了不可能通关的...你开挂了吧？</p>

          {/* Stats Box */}
          <div className="bg-amber-400/50 rounded-xl p-4 mb-8 text-red-900 font-bold border-2 border-red-900/20 shadow-inner w-full max-w-xs flex justify-around">
            <div className="flex flex-col items-center">
              <span className="text-xs opacity-80 mb-1">通关时长</span>
              <span className="text-xl">{playTimeStr}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs opacity-80 mb-1">失败总计</span>
              <span className="text-xl">{failCount} 次</span>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setFailCount(0); // Reset fail count on returning to menu after win
              setGameState(GameState.MENU);
            }}
            className="px-10 py-3 bg-red-900 text-amber-400 text-xl font-bold rounded-full shadow-[0_4px_0_#450a0a] active:shadow-[0_1px_0_#450a0a] active:translate-y-1 transition-all"
          >
            返回标题
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
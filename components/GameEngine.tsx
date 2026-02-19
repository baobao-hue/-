import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GameState, ObstacleData, PhysicsState } from '../types';
import { 
  GRAVITY, JUMP_VELOCITY, FORWARD_SPEED, HORSE_SIZE, GROUND_HEIGHT, 
  WIN_DISTANCE, INVISIBLE_PIT_START, INVISIBLE_PIT_END, QTE_DISTANCES 
} from '../constants';
import QteOverlay from './QteOverlay';

interface GameEngineProps {
  questions: string[];
  onGameOver: (title: string, reason: string) => void;
  onWin: () => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const GameEngine: React.FC<GameEngineProps> = ({ questions, onGameOver, onWin, gameState, setGameState }) => {
  // DOM Refs for direct manipulation to ensure 60fps
  const horseRef = useRef<HTMLDivElement>(null);
  const speechBubbleRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const obstaclesContainerRef = useRef<HTMLDivElement>(null);
  const pitRef = useRef<HTMLDivElement>(null);
  const floatingFuRef = useRef<HTMLDivElement>(null);

  // Core Physics State (mutable, avoids re-renders)
  const pState = useRef<PhysicsState>({
    horseY: 0,
    horseVy: 0,
    distance: 0,
    isSitting: false,
    obstacles: [],
    qteTriggers: [...QTE_DISTANCES],
  });

  // UI State that requires React rendering
  const [progress, setProgress] = useState(0);
  const [qteData, setQteData] = useState({ active: false, question: '' });

  // Generate obstacles based on distance
  useEffect(() => {
    const initialObstacles: ObstacleData[] = [];
    for (let i = 800; i < WIN_DISTANCE - 500; i += Math.floor(Math.random() * 300 + 400)) {
      initialObstacles.push({
        id: i,
        x: i,
        width: 40,
        height: Math.floor(Math.random() * 40 + 50), // 50 to 90 height
        passed: false
      });
    }
    pState.current.obstacles = initialObstacles;
  }, []);

  // --- Troll Feature 2: Real Jump (Floating Fu) ---
  const handleRealJump = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (gameState !== GameState.PLAYING) return;
    
    // Can only jump if near ground and not sitting
    if (pState.current.horseY <= 5 && !pState.current.isSitting) {
      pState.current.horseVy = JUMP_VELOCITY;
    }
  }, [gameState]);

  // --- Troll Feature 1: Fake Jump ---
  const handleFakeJump = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    
    pState.current.isSitting = true;
    pState.current.horseVy = -10; // Slam down immediately
    
    // Recover from sitting after 1 second
    setTimeout(() => {
      pState.current.isSitting = false;
    }, 1000);
  }, [gameState]);

  // Main Game Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      animationFrameId = requestAnimationFrame(loop);
      
      const deltaTime = time - lastTime;
      // Cap deltaTime to prevent huge jumps if tab is inactive
      if (deltaTime > 100) {
        lastTime = time;
        return;
      }
      lastTime = time;

      // Only process physics if actively playing
      if (gameState !== GameState.PLAYING) return;

      const state = pState.current;

      // 1. Update Distance
      // Stop moving forward if sitting
      const currentSpeed = state.isSitting ? 0 : FORWARD_SPEED;
      state.distance += currentSpeed;

      // Update progress bar occasionally
      if (Math.floor(state.distance) % 30 === 0) {
        setProgress(Math.min(100, (state.distance / WIN_DISTANCE) * 100));
      }

      // 2. Update Vertical Physics
      state.horseVy -= GRAVITY;
      state.horseY += state.horseVy;

      // 3. Ground Collision & Troll Feature 3: Invisible Pit
      let currentGroundLevel = 0;
      
      if (state.distance >= INVISIBLE_PIT_START && state.distance <= INVISIBLE_PIT_END) {
         currentGroundLevel = -1000; // The pit opens!
      }

      if (state.horseY <= currentGroundLevel) {
        state.horseY = currentGroundLevel;
        state.horseVy = 0;
      }

      // 4. Death checks
      // Fell in pit
      if (state.horseY < -200) {
        setGameState(GameState.GAMEOVER);
        onGameOver("明年再来", "终点前一步的坑才是最深的！");
        return;
      }

      // Check obstacle collisions (AABB)
      // Horse Hitbox: x fixed at 50, y is state.horseY. Size is HORSE_SIZE
      const horseLeft = 50;
      const horseRight = 50 + HORSE_SIZE - 10; // slightly smaller hitbox
      const horseBottom = state.horseY;
      const horseTop = state.horseY + HORSE_SIZE - 10;

      for (let i = 0; i < state.obstacles.length; i++) {
        const obs = state.obstacles[i];
        // Convert obstacle absolute X to relative screen X
        const obsScreenX = obs.x - state.distance;
        
        // If obstacle is on screen
        if (obsScreenX > -obs.width && obsScreenX < 500) {
           const obsLeft = obsScreenX;
           const obsRight = obsScreenX + obs.width;
           const obsBottom = 0;
           const obsTop = obs.height;

           // Check overlap
           if (horseRight > obsLeft && horseLeft < obsRight && horseTop > obsBottom && horseBottom < obsTop) {
              setGameState(GameState.GAMEOVER);
              onGameOver("碰壁了", "新年第一道坎都没过去...");
              return;
           }
        }
      }

      // 5. Check Win
      if (state.distance >= WIN_DISTANCE) {
         // Unreachable normally due to the pit, but just in case they glitch it
         setGameState(GameState.WON);
         onWin();
         return;
      }

      // 6. Troll Feature 4: Forced QTE
      if (state.qteTriggers.length > 0 && state.distance >= state.qteTriggers[0]) {
         state.qteTriggers.shift(); // Remove triggered QTE
         
         const randomQ = questions[Math.floor(Math.random() * questions.length)];
         setQteData({ active: true, question: randomQ });
         setGameState(GameState.QTE);
         return;
      }

      // 7. Render Updates (Direct DOM Manipulation)
      if (horseRef.current) {
        // Rotate if sitting, otherwise straight
        const rotation = state.isSitting ? 'rotate(90deg)' : 'rotate(0deg)';
        horseRef.current.style.transform = `translateY(${-state.horseY}px) ${rotation}`;
      }

      // Sync speech bubble with horse position
      if (speechBubbleRef.current) {
        speechBubbleRef.current.style.transform = `translateY(${-state.horseY}px)`;
        speechBubbleRef.current.style.opacity = state.isSitting ? '1' : '0';
      }

      if (bgRef.current) {
        // Parallax background
        bgRef.current.style.transform = `translateX(${-(state.distance * 0.2) % 1000}px)`;
      }

      if (pitRef.current) {
        // Move the visual gap
        const pitScreenX = INVISIBLE_PIT_START - state.distance;
        pitRef.current.style.transform = `translateX(${pitScreenX}px)`;
      }

      // Update Obstacles DOM
      if (obstaclesContainerRef.current) {
        const children = obstaclesContainerRef.current.children;
        for (let i = 0; i < state.obstacles.length; i++) {
          const obs = state.obstacles[i];
          const obsScreenX = obs.x - state.distance;
          const el = children[i] as HTMLElement;
          if (el) {
            // Only render if roughly visible
            if (obsScreenX > -100 && obsScreenX < window.innerWidth + 100) {
              el.style.display = 'block';
              el.style.transform = `translateX(${obsScreenX}px)`;
            } else {
              el.style.display = 'none';
            }
          }
        }
      }

      // Update Floating Fu (drift erratically but strictly within screen limits)
      if (floatingFuRef.current) {
         const t = time / 1000;
         // X bounds: 50% base ± 35% (range: 15% to 85%), ensures the 64px button is fully visible
         const fx = 50 + Math.sin(t * 0.4) * 20 + Math.cos(t * 0.25) * 15; 
         // Y bounds: 40% base ± 25% (range: 15% to 65%), ensures it stays clear of the top and bottom UI
         const fy = 40 + Math.cos(t * 0.6) * 15 + Math.sin(t * 0.15) * 10;
         floatingFuRef.current.style.top = `${fy}%`;
         floatingFuRef.current.style.left = `${fx}%`;
      }
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, onGameOver, onWin, questions, setGameState]);

  const handleQteSuccess = useCallback(() => {
    setQteData({ active: false, question: '' });
    setGameState(GameState.PLAYING);
  }, [setGameState]);

  const handleQteFail = useCallback(() => {
    setQteData({ active: false, question: '' });
    setGameState(GameState.GAMEOVER);
    onGameOver("马气炸了", "应对亲戚盘问失败，血压飙升！");
  }, [onGameOver, setGameState]);

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Top Bar: Progress */}
      <div className="h-12 bg-red-950 flex flex-col justify-center px-4 z-10 shadow-md">
        <div className="flex justify-between text-amber-500 text-xs font-bold mb-1">
          <span>起点</span>
          <span>终点(成功)</span>
        </div>
        <div className="w-full h-3 bg-red-900 rounded-full overflow-hidden border border-amber-800">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-red-600 to-red-800">
        
        {/* Parallax Mountains/Clouds */}
        <div ref={bgRef} className="absolute inset-0 flex items-end opacity-30 pb-[100px]">
          <div className="text-8xl whitespace-nowrap">
             ☁️ ☁️ ☁️ ☁️ ☁️ ☁️ ☁️ ☁️ ☁️ ☁️ ☁️ ☁️
          </div>
        </div>

        {/* The Real Jump Button (Floating Fu) */}
        <div 
          ref={floatingFuRef}
          onMouseDown={handleRealJump}
          onTouchStart={handleRealJump}
          className="absolute z-20 w-16 h-16 bg-red-600 rounded-full flex items-center justify-center border-4 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)] cursor-pointer select-none"
          style={{ top: '30%', left: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <span className="text-3xl text-amber-400 font-bold rotate-180">福</span>
        </div>

        {/* Finish Line (Visual only) */}
        <div 
          className="absolute top-0 bottom-[100px] w-4 border-l-4 border-dashed border-amber-400 z-10 flex flex-col justify-center items-center"
          style={{ transform: `translateX(${WIN_DISTANCE - pState.current.distance}px)` }}
        >
          <div className="bg-amber-400 text-red-900 font-bold p-1 rounded -ml-8">成功</div>
        </div>

        {/* Obstacles Container */}
        <div ref={obstaclesContainerRef} className="absolute inset-0 z-10 pointer-events-none">
          {pState.current.obstacles.map((obs) => (
            <div 
              key={obs.id}
              className="absolute bottom-[100px] bg-red-950 border-2 border-amber-600 rounded-t-sm flex items-end justify-center overflow-hidden"
              style={{ width: obs.width, height: obs.height, display: 'none' }}
            >
               <span className="text-2xl mb-1 text-amber-500">🧧</span>
            </div>
          ))}
        </div>

        {/* The Horse & Speech Bubble Wrapper */}
        <div 
          className="absolute z-30 pointer-events-none"
          style={{ left: 50, bottom: GROUND_HEIGHT }}
        >
          {/* Speech Bubble */}
          <div 
            ref={speechBubbleRef}
            className="absolute -top-10 left-4 whitespace-nowrap bg-white text-gray-800 text-xs font-bold px-2 py-1 rounded-md shadow-md opacity-0 transition-opacity duration-150"
          >
            想休息...
            <div className="absolute top-full left-4 -translate-x-1/2 border-[5px] border-transparent border-t-white"></div>
          </div>

          {/* Horse Emoji */}
          <div 
            ref={horseRef} 
            className="w-10 h-10 flex items-center justify-center text-4xl origin-bottom transition-transform duration-75"
          >
            🐎
          </div>
        </div>

        {/* The Ground */}
        <div className="absolute bottom-0 w-full h-[100px] bg-red-950 border-t-4 border-amber-600 z-20 flex">
           {/* Invisible Pit visual trick (masks the ground) */}
           <div 
              ref={pitRef}
              className="absolute top-[-4px] h-[104px] bg-red-950" 
              style={{ width: INVISIBLE_PIT_END - INVISIBLE_PIT_START, borderTop: '4px solid transparent' }}
           >
              {/* No top border, looks like a hole, but hard to notice while moving fast */}
              <div className="w-full h-full bg-gradient-to-b from-black/80 to-black"></div>
           </div>
           
           {/* Ground Pattern */}
           <div className="w-full h-full opacity-20 rendering-crisp bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#f59e0b_10px,#f59e0b_20px)]"></div>
        </div>
      </div>

      {/* Fake Jump Button (Bottom UI) */}
      <div className="h-32 bg-red-900 p-4 shadow-[inset_0_5px_15px_rgba(0,0,0,0.5)] z-30">
        <button 
          onPointerDown={handleFakeJump}
          className="w-full h-full bg-gradient-to-b from-gray-200 to-gray-400 text-gray-800 text-4xl font-black rounded-xl shadow-[0_8px_0_#4b5563,0_15px_20px_rgba(0,0,0,0.4)] active:shadow-[0_2px_0_#4b5563,0_5px_10px_rgba(0,0,0,0.4)] active:translate-y-2 transition-all flex items-center justify-center space-x-2"
        >
          <span>👉</span>
          <span>巨型跳跃键</span>
          <span>👈</span>
        </button>
      </div>

      {/* QTE Overlay */}
      {gameState === GameState.QTE && qteData.active && (
        <QteOverlay 
          question={qteData.question} 
          onSuccess={handleQteSuccess} 
          onFail={handleQteFail} 
        />
      )}
    </div>
  );
};

export default GameEngine;
import React, { useEffect, useState, useRef } from 'react';

interface QteOverlayProps {
  question: string;
  onSuccess: () => void;
  onFail: () => void;
}

const QteOverlay: React.FC<QteOverlayProps> = ({ question, onSuccess, onFail }) => {
  const [timeLeft, setTimeLeft] = useState(100); // 100%
  const timerRef = useRef<number>();

  useEffect(() => {
    // 3 seconds timer (3000ms). Update every 10ms for smooth bar.
    const duration = 3000;
    const interval = 10;
    let elapsed = 0;

    timerRef.current = window.setInterval(() => {
      elapsed += interval;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setTimeLeft(remaining);

      if (elapsed >= duration) {
        clearInterval(timerRef.current);
        onFail();
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onFail]);

  // Position the tiny success button randomly within a safe zone
  const safeArea = { top: 20, bottom: 80, left: 10, right: 90 };
  const [btnPos] = useState({
    top: `${Math.random() * (safeArea.bottom - safeArea.top) + safeArea.top}%`,
    left: `${Math.random() * (safeArea.right - safeArea.left) + safeArea.left}%`
  });

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Dim */}
      <div className="absolute inset-0 bg-black/80 animate-in fade-in duration-100"></div>
      
      {/* Dialogue Box */}
      <div className="relative bg-red-100 border-4 border-red-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10 flex flex-col items-center animate-in zoom-in-95 duration-150">
        
        {/* Speaker Info */}
        <div className="absolute -top-6 left-6 bg-red-800 text-white px-4 py-1 rounded-full text-sm font-bold border-2 border-red-200">
          七大姑/八大姨 突袭！
        </div>

        <h3 className="text-3xl font-black text-red-900 my-6 text-center leading-tight">
          "{question}"
        </h3>

        {/* Timer Bar */}
        <div className="w-full bg-gray-300 h-4 rounded-full overflow-hidden mb-6 border-2 border-gray-400">
          <div 
            className="h-full bg-red-600 transition-all duration-75"
            style={{ width: `${timeLeft}%` }}
          />
        </div>

        {/* Fake Obvious Button - Always fails */}
        <button 
          onClick={onFail}
          className="w-full py-4 bg-red-600 text-white text-2xl font-bold rounded-lg shadow-lg active:scale-95 transition-transform"
        >
          当场掀桌 (发火)
        </button>

      </div>

      {/* The tiny "Keep Smiling" success button */}
      <button
        onClick={() => {
          if (timerRef.current) clearInterval(timerRef.current);
          onSuccess();
        }}
        className="absolute z-20 bg-amber-400 text-red-900 text-[8px] px-1 py-0.5 rounded opacity-80 hover:opacity-100"
        style={{ top: btnPos.top, left: btnPos.left }}
      >
        保持微笑
      </button>

    </div>
  );
};

export default QteOverlay;
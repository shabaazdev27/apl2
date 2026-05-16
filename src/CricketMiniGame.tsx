import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Zap, Target, RotateCcw, Play, Award, Sparkles } from 'lucide-react';

interface CricketMiniGameProps {
  onGameOver: (score: number, coins: number, xp: number) => void;
}

const CricketMiniGame: React.FC<CricketMiniGameProps> = ({ onGameOver }) => {
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [ballsRemaining, setBallsRemaining] = useState(6);
  const [ballPosition, setBallPosition] = useState(0); // 0 to 100
  const [isBallMoving, setIsBallMoving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackColor, setFeedbackColor] = useState('text-white');
  
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const ballSpeedRef = useRef<number>(1.5);

  const startGame = () => {
    setGameState('PLAYING');
    setScore(0);
    setWickets(0);
    setBallsRemaining(6);
    startNewBall();
  };

  const startNewBall = () => {
    if (ballsRemaining <= 0 || wickets >= 1) {
      endGame();
      return;
    }
    setBallPosition(0);
    setIsBallMoving(true);
    setFeedback(null);
    ballSpeedRef.current = 1.2 + (Math.random() * 0.8); // Variable speed
  };

  const endGame = () => {
    setGameState('GAMEOVER');
    setIsBallMoving(false);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    
    // Calculate rewards
    const coins = Math.floor(score * 2);
    const xp = score * 5;
    onGameOver(score, coins, xp);
  };

  useEffect(() => {
    if (gameState === 'PLAYING' && isBallMoving) {
      const update = (time: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = time;
        // const delta = time - lastTimeRef.current;
        
        setBallPosition(prev => {
          const next = prev + ballSpeedRef.current;
          if (next >= 100) {
            handleHit(100); // Auto-miss if it reaches the end
            return 100;
          }
          return next;
        });
        
        gameLoopRef.current = requestAnimationFrame(update);
      };
      gameLoopRef.current = requestAnimationFrame(update);
    } else {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, isBallMoving]);

  const handleHit = (pos?: number) => {
    if (!isBallMoving) return;
    setIsBallMoving(false);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);

    const hitPos = pos !== undefined ? pos : ballPosition;
    let runs = 0;
    let message = "";
    let color = "text-white";

    // Perfect zone: 75-85
    if (hitPos >= 75 && hitPos <= 85) {
      runs = 6;
      message = "SIXER! PERFECT TIMING!";
      color = "text-yellow-400";
    } else if (hitPos >= 65 && hitPos <= 95) {
      runs = 4;
      message = "FOUR! GREAT HIT!";
      color = "text-[#1f80e0]";
    } else if (hitPos >= 50 && hitPos <= 100) {
      runs = 1 + Math.floor(Math.random() * 2);
      message = runs === 1 ? "SINGLE" : "DOUBLE";
      color = "text-green-400";
    } else {
      message = "WICKET! CLEAN BOWLED!";
      color = "text-red-500";
      setWickets(prev => prev + 1);
    }

    setScore(prev => prev + runs);
    setFeedback(message);
    setFeedbackColor(color);
    setBallsRemaining(prev => prev - 1);

    // Visual Polish: Add a "screen flash" effect for big hits
    if (runs >= 4) {
      const flash = document.createElement('div');
      flash.className = `fixed inset-0 z-[100] pointer-events-none ${runs === 6 ? 'bg-yellow-400/20 shadow-[inset_0_0_100px_rgba(250,204,21,0.3)]' : 'bg-[#1f80e0]/20 shadow-[inset_0_0_100px_rgba(31,128,224,0.3)]'} transition-opacity duration-300`;
      document.body.appendChild(flash);
      setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => document.body.removeChild(flash), 300);
      }, 100);
    }

    setTimeout(() => {
      if (wickets < 1 && ballsRemaining > 1) {
        startNewBall();
      } else {
        endGame();
      }
    }, 1500);
  };

  return (
    <div className="bg-[#0c111b] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden glass group min-h-[400px] flex flex-col items-center justify-center">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
        <Target className="w-64 h-64 text-[#1f80e0]" />
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'IDLE' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center space-y-6 z-10"
          >
            <div className="w-20 h-20 bg-[#1f80e0]/10 rounded-3xl flex items-center justify-center mx-auto border border-[#1f80e0]/20">
              <Zap className="w-10 h-10 text-[#1f80e0] fill-[#1f80e0]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black uppercase tracking-tighter">Power Hitter</h3>
              <p className="text-gray-400 text-sm font-medium max-w-[280px]">
                Time your swing to hit maximum sixes in one over. Don't get bowled out!
              </p>
            </div>
            <button 
              onClick={startGame}
              className="px-10 py-4 bg-[#1f80e0] text-white font-black rounded-2xl text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-[#1f80e0]/20 flex items-center gap-3 mx-auto"
            >
              <Play className="w-4 h-4 fill-white" />
              Start Session
            </button>
          </motion.div>
        )}

        {gameState === 'PLAYING' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full flex flex-col items-center justify-between z-10"
          >
            <div className="flex justify-between w-full mb-10">
              <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Score</div>
                <div className="text-3xl font-black text-white">{score}</div>
              </div>
              <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/5 text-right">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Balls Left</div>
                <div className="text-3xl font-black text-[#1f80e0]">{ballsRemaining}</div>
              </div>
            </div>

            <div className="relative w-full max-w-md h-32 flex items-center">
              {/* Pitch */}
              <div className="absolute inset-x-0 h-4 bg-white/5 rounded-full border border-white/5">
                {/* Hit Zones */}
                <div className="absolute right-[15%] left-[25%] inset-y-0 bg-[#1f80e0]/10 rounded-full" /> {/* Good zone */}
                <div className="absolute right-[15%] left-[75%] inset-y-0 bg-yellow-400/40 rounded-full blur-[2px]" /> {/* Perfect zone */}
              </div>

              {/* Ball */}
              <motion.div 
                className="absolute w-8 h-8 bg-white rounded-full shadow-[0_0_20px_white] z-20 flex items-center justify-center text-[10px] text-black font-black"
                style={{ left: `${ballPosition}%` }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
              >
                ⚾
              </motion.div>

              {/* Target Marker */}
              <div className="absolute right-[10%] h-12 w-1 bg-[#1f80e0] shadow-[0_0_10px_#1f80e0]" />
              <div className="absolute right-[10%] -top-6 text-[10px] font-black text-[#1f80e0] uppercase tracking-widest">Sweet Spot</div>
            </div>

            <div className="mt-10 h-10 text-center">
              <AnimatePresence mode="wait">
                {feedback && (
                  <motion.div 
                    key={feedback}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.5 }}
                    className={`text-xl font-black uppercase tracking-tighter ${feedbackColor}`}
                  >
                    {feedback}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onMouseDown={() => handleHit()}
              className="mt-8 w-full max-w-xs py-6 bg-gradient-to-r from-[#1f80e0] to-[#59a2e8] text-white font-black rounded-3xl text-sm uppercase tracking-[0.3em] transition-all hover:shadow-[0_0_30px_rgba(31,128,224,0.4)] active:scale-90"
            >
              HIT NOW!
            </button>
          </motion.div>
        )}

        {gameState === 'GAMEOVER' && (
          <motion.div 
            key="gameover"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8 z-10 w-full max-w-sm"
          >
            <div className="relative inline-block">
               <Trophy className="w-20 h-20 text-yellow-400 mx-auto" />
               <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-yellow-400 blur-3xl rounded-full -z-10"
               />
            </div>

            <div className="space-y-1">
              <h3 className="text-4xl font-black uppercase tracking-tighter">Session End</h3>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Match Summary</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Runs Scored</div>
                <div className="text-3xl font-black text-white">{score}</div>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Coins Earned</div>
                <div className="text-3xl font-black text-yellow-500">+{score * 2}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={startGame}
                className="w-full py-4 bg-[#1f80e0] text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-3"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
              <button 
                onClick={() => setGameState('IDLE')}
                className="w-full py-4 bg-white/5 text-gray-400 font-black rounded-2xl text-xs uppercase tracking-widest hover:text-white transition-colors"
              >
                Back to Fan Zone
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CricketMiniGame;

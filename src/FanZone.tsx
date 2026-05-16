import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Target, 
  Zap, 
  Share2, 
  Flame, 
  Award,
  Newspaper,
  ChevronRight,
  Loader2,
  Sparkles,
  TrendingUp,
  MessageCircle,
  Vote as VoteIcon,
  Timer,
  Play
} from 'lucide-react';
import { UserState, AIChallenge, NewsItem } from './types';
import CricketMiniGame from './CricketMiniGame';

interface FanZoneProps {
  userState: UserState;
  setUserState: React.Dispatch<React.SetStateAction<UserState>>;
  pollResults: Record<string, number>;
  handleVote: (option: string) => void;
  votedPoll: string | null;
  acceptChallenge: () => void;
}

const FanZone: React.FC<FanZoneProps> = ({ userState, setUserState, pollResults, handleVote, votedPoll, acceptChallenge }) => {
  const [challenge, setChallenge] = useState<AIChallenge | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [nextBall, setNextBall] = useState<any>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionFeedback, setPredictionFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchChallenge();
    fetchNews();
    fetchNextBall();
  }, []);

  const fetchNextBall = async () => {
    try {
      const response = await fetch('/api/games/next-ball');
      const data = await response.json();
      setNextBall(data);
      setPrediction(null);
      setPredictionFeedback(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePredictBall = (outcome: string) => {
    setPrediction(outcome);
    // Simulate real-time resolution
    setTimeout(() => {
      const randomOutcome = ['0', '1', '2', '4', '6', 'W'][Math.floor(Math.random() * 6)];
      if (outcome === randomOutcome) {
        setPredictionFeedback(`CORRECT! +50 XP`);
        setUserState(prev => ({ ...prev, xp: prev.xp + 50, coins: prev.coins + 10 }));
      } else {
        setPredictionFeedback(`Outcome was ${randomOutcome}. Better luck next ball!`);
      }
      setTimeout(fetchNextBall, 3000);
    }, 2000);
  };

  const onGameEnd = async (score: number, coins: number, xp: number) => {
    setUserState(prev => ({ 
      ...prev, 
      xp: prev.xp + xp, 
      coins: prev.coins + coins,
      highScore: Math.max(prev.highScore || 0, score)
    }));
    
    try {
      await fetch('/api/games/save-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, coins, xp })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChallenge = async () => {
    setLoadingChallenge(true);
    try {
      const response = await fetch('/api/ai/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streak: userState.streak,
          xp: userState.xp,
          followedTeams: userState.followedTeams,
          tier: userState.tier
        })
      });
      const data = await response.json();
      setChallenge(data);
    } catch (err) {
      console.error("Failed to fetch challenge:", err);
    } finally {
      setLoadingChallenge(false);
    }
  };

  const fetchNews = async () => {
    setLoadingNews(true);
    try {
      const response = await fetch('/api/team-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: userState.followedTeams })
      });
      const data = await response.json();
      setNews(data.news || []);
    } catch (err) {
      console.error("Failed to fetch news:", err);
    } finally {
      setLoadingNews(false);
    }
  };

  const progress = (userState.xp % 100);

  const difficultyColors: Record<string, string> = {
    'EASY': 'bg-green-500/20 text-green-500 border-green-500/20',
    'MEDIUM': 'bg-blue-500/20 text-blue-500 border-blue-500/20',
    'HARD': 'bg-orange-500/20 text-orange-500 border-orange-500/20',
    'EXPERT': 'bg-red-500/20 text-red-500 border-red-500/20'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-10"
    >
      {/* Top Section: Progress & Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0c111b] border border-white/5 rounded-3xl p-8 relative overflow-hidden glass">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
            <Shield className="w-48 h-48 text-[#1f80e0]" />
          </div>
          
          <div className="flex items-center gap-6 mb-8">
            <div className="relative group">
               <div className="absolute inset-0 bg-[#1f80e0] blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
               <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1f80e0] to-[#114b85] flex items-center justify-center text-3xl font-black shadow-2xl border border-white/10">
                 {userState.level}
               </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-3xl font-black tracking-tighter uppercase">{userState.tier}</h2>
                <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Ranked</div>
              </div>
              <p className="text-gray-400 text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1f80e0]" />
                Top {Math.max(1, 10 - userState.level)}% of fans this week
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase">
              <span>Next Level Goal</span>
              <span className="text-white">{progress} / 100 XP</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#1f80e0] to-[#59a2e8] rounded-full shadow-[0_0_15px_rgba(31,128,224,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        <div className="bg-[#0c111b] border border-white/5 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden glass group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
             <Flame className="w-32 h-32 text-orange-500" />
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
              <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />
            </div>
            <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Season Momentum</span>
          </div>
          
          <div>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-6xl font-black tracking-tighter">{userState.streak}</span>
              <span className="text-lg font-black text-[#1f80e0] mb-2">DAYS</span>
            </div>
            <p className="text-sm text-gray-400 font-medium">Consecutive participation</p>
          </div>
          
          <div className="mt-6 bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:border-[#1f80e0]/30 transition-all">
            <div className="flex items-center gap-3 text-xs font-bold text-orange-500">
              <Zap className="w-4 h-4 fill-orange-500" />
              <span>{1 + (userState.streak * 0.1)}x XP Multiplier Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Daily Challenge & Predict Next Ball */}
        <div className="lg:col-span-5 space-y-8">
          {/* Daily Challenge */}
          <div className="bg-gradient-to-br from-[#0c111b] to-[#030b17] border border-white/5 rounded-3xl p-8 relative group overflow-hidden glass">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#1f80e0]/10 blur-[80px] group-hover:bg-[#1f80e0]/20 transition-all" />
            
            {loadingChallenge ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-[#1f80e0] animate-spin mb-6" />
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Consulting Gemini Tactical AI...</p>
              </div>
            ) : challenge ? (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded border ${difficultyColors[challenge.difficulty || 'MEDIUM']}`}>
                        {challenge.difficulty || 'MEDIUM'}
                      </span>
                      <span className="text-[9px] font-black text-[#1f80e0] tracking-widest uppercase bg-[#1f80e0]/10 px-2 py-1 rounded border border-[#1f80e0]/20">
                        {challenge.personaBadge}
                      </span>
                    </div>
                    <h4 className="text-3xl font-black leading-[1.1] tracking-tight group-hover:text-[#1f80e0] transition-colors">{challenge.challengeTitle}</h4>
                  </div>
                </div>
                
                <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">
                  {challenge.challengeDescription}
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-widest">XP Potential</div>
                    <div className="text-xl font-black text-[#1f80e0]">+{challenge.xpReward}</div>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-widest">Coin Loot</div>
                    <div className="text-xl font-black text-yellow-500">+{challenge.coinReward}</div>
                  </div>
                </div>

                <button 
                  onClick={acceptChallenge}
                  disabled={userState.challengeAccepted}
                  className={`w-full ${userState.challengeAccepted ? 'bg-green-600' : 'bg-[#1f80e0] hover:bg-[#2c8be7]'} text-white font-black py-5 rounded-2xl text-xs uppercase tracking-[0.2em] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-[#1f80e0]/20`}
                >
                  {userState.challengeAccepted ? 'MISSION DEPLOYED' : 'DEPLOY MISSION'}
                </button>
              </>
            ) : null}
          </div>

          {/* Predict Next Ball Widget */}
          <div className="bg-[#0c111b] border border-white/5 rounded-3xl p-8 relative overflow-hidden glass group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black tracking-[0.2em] flex items-center gap-3 text-[#1f80e0] uppercase">
                <Timer className="w-4 h-4" />
                Live Ball Predictor
              </h3>
              <div className="px-3 py-1 rounded-full bg-[#1f80e0]/10 border border-[#1f80e0]/20 text-[9px] font-black text-[#1f80e0] animate-pulse">LIVE NOW</div>
            </div>

            {nextBall ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 rounded-xl bg-[#1f80e0]/20 flex items-center justify-center text-xl">🏏</div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">On Strike</div>
                    <div className="text-lg font-black text-white">{nextBall.onStrike} vs {nextBall.bowler}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Predict next outcome:</p>
                  <div className="grid grid-cols-3 gap-3">
                    {['0', '1', '4', '6', 'W', 'WD'].map(opt => (
                      <motion.button 
                        key={opt}
                        whileHover={{ scale: 1.05, translateY: -2 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={!!prediction}
                        onClick={() => handlePredictBall(opt)}
                        className={`py-3 rounded-xl font-black text-xs border transition-all relative overflow-hidden group/btn ${
                          prediction === opt 
                            ? 'bg-[#1f80e0] border-[#1f80e0] text-white shadow-[0_0_20px_rgba(31,128,224,0.6)]' 
                            : 'bg-white/5 border-white/5 text-gray-400 hover:border-[#1f80e0]/30 hover:text-white'
                        }`}
                      >
                        <span className="relative z-10">{opt === 'W' ? 'Wicket' : opt === 'WD' ? 'Wide' : opt}</span>
                        {prediction === opt && (
                          <motion.div 
                            layoutId="btn-active-glow"
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {predictionFeedback && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl text-center text-[10px] font-black uppercase tracking-widest border ${predictionFeedback.includes('CORRECT') ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-white/5 border-white/5 text-gray-400'}`}
                    >
                      {predictionFeedback}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="py-10 flex flex-col items-center justify-center">
                 <Loader2 className="w-8 h-8 text-[#1f80e0] animate-spin mb-4" />
                 <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Waiting for next ball...</span>
              </div>
            )}
          </div>
        </div>

        {/* Arcade Arena & Social */}
        <div className="lg:col-span-7 space-y-8">
          {/* Arcade Arena */}
          <div className="space-y-6">
             <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-6 bg-[#1f80e0] rounded-full" />
                <h3 className="text-sm font-black tracking-[0.2em] text-gray-400 uppercase">Arcade Arena</h3>
             </div>
             <CricketMiniGame onGameOver={onGameEnd} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black tracking-[0.2em] flex items-center gap-3 text-gray-400 uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                Live Pulse Updates
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadingNews ? (
                [1,2,3,4].map(i => (
                  <div key={i} className="h-56 bg-[#0c111b] border border-white/5 rounded-3xl animate-pulse glass" />
                ))
              ) : news.length > 0 ? (
                news.map((item, idx) => (
                  <motion.div 
                    key={item.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-[#0c111b] border border-white/5 rounded-3xl p-6 hover:border-[#1f80e0]/30 transition-all group/news glass flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-[#1f80e0] tracking-[0.2em] uppercase">{item.team}</span>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase">
                         <div className="w-1 h-1 rounded-full bg-green-500" />
                         {item.timestamp}
                      </div>
                    </div>
                    <h5 className="font-black text-lg mb-3 group-hover/news:text-[#1f80e0] transition-colors leading-tight">{item.title}</h5>
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 mb-6 font-medium">{item.snippet}</p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                      <span className="text-[9px] font-black text-gray-500 flex items-center gap-2 uppercase tracking-widest">
                        <Share2 className="w-3 h-3 text-[#1f80e0]" />
                        {item.source}
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FanZone;

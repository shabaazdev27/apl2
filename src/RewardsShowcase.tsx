import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  Coins, 
  Lock, 
  Unlock, 
  Star, 
  Crown,
  Search,
  Filter,
  ShoppingBag,
  ArrowUpRight,
  TrendingUp,
  Award,
  Sparkles
} from 'lucide-react';
import { UserState } from './types';

interface RewardsShowcaseProps {
  userState: UserState;
  setUserState: React.Dispatch<React.SetStateAction<UserState>>;
}

const RewardsShowcase: React.FC<RewardsShowcaseProps> = ({ userState, setUserState }) => {
  const [rewards, setRewards] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rewardsRes, leaderboardRes] = await Promise.all([
          fetch('/api/rewards'),
          fetch('/api/leaderboard')
        ]);
        const rewardsData = await rewardsRes.json();
        const leaderboardData = await leaderboardRes.json();
        setRewards(rewardsData);
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error("Failed to fetch rewards/leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRedeem = (reward: any) => {
    if (userState.coins >= reward.cost) {
      setUserState((prev: any) => {
        const newState = {
          ...prev,
          coins: prev.coins - reward.cost,
          badges: reward.type === 'BADGE' ? [...prev.badges, { id: reward.id, name: reward.name, icon: reward.icon, requirement: 'Redeemed' }] : prev.badges,
          avatar: reward.type === 'AVATAR' ? reward.icon : prev.avatar,
          personaBadge: reward.type === 'BADGE' ? reward.name : prev.personaBadge
        };
        return newState;
      });
      setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, unlocked: true } : r));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10"
    >
      {/* Rewards Catalog */}
      <div className="lg:col-span-8 space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black tracking-[0.2em] flex items-center gap-3 text-gray-400 uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            VIRTUAL VAULT
          </h2>
          <div className="flex gap-2">
             <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-xl">
               <Coins className="w-4 h-4 text-yellow-500 fill-yellow-500" />
               <span className="text-xs font-black text-yellow-500">{userState.coins} AVAILABLE</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            [1,2,3,4].map(i => (
              <div key={i} className="h-64 bg-[#0c111b] border border-white/5 rounded-[2rem] animate-pulse glass" />
            ))
          ) : rewards.map((reward) => (
            <motion.div
              key={reward.id}
              whileHover={{ y: -5 }}
              className="bg-[#0c111b] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group glass transition-all hover:border-yellow-500/30"
            >
              <div className="absolute -top-10 -right-10 p-10 text-8xl opacity-[0.03] group-hover:opacity-[0.08] transition-all rotate-12 group-hover:rotate-0">
                {reward.icon}
              </div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[9px] font-black text-yellow-500 tracking-[0.2em] uppercase bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/10">
                    {reward.type.replace('_', ' ')}
                  </span>
                  <div className="text-4xl">{reward.icon}</div>
                </div>

                <h3 className="text-2xl font-black mb-2 tracking-tight">{reward.name}</h3>
                <p className="text-xs text-gray-500 font-medium mb-8">Exclusive digital asset for {userState.tier} tier fans.</p>
                
                <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xl font-black tracking-tighter">{reward.cost}</span>
                  </div>
                  
                  <button
                    disabled={reward.unlocked || userState.coins < reward.cost}
                    onClick={() => handleRedeem(reward)}
                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      reward.unlocked 
                        ? 'bg-green-500/10 border border-green-500/20 text-green-500' 
                        : userState.coins >= reward.cost
                          ? 'bg-yellow-500 text-black hover:shadow-2xl hover:shadow-yellow-500/20 active:scale-95'
                          : 'bg-white/5 border border-white/5 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {reward.unlocked ? 'UNLOCKED' : 'PURCHASE'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Leaderboard Sidebar */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-[#0c111b] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden glass">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
            <Crown className="w-32 h-32 text-yellow-400" />
          </div>
          
          <h2 className="text-sm font-black tracking-[0.2em] flex items-center gap-3 text-gray-400 uppercase mb-8">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            Global Ranks
          </h2>
 
          <div className="space-y-3">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="h-16 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
              ))
            ) : leaderboard.map((player, idx) => (
              <div 
                key={idx}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  idx === 0 
                    ? 'bg-yellow-400/5 border-yellow-400/20' 
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                    idx === 0 ? 'bg-yellow-400 text-black' : 'bg-white/5 text-gray-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="text-2xl">{player.avatar}</div>
                  <div>
                    <div className="text-sm font-black tracking-tight">{player.name}</div>
                    <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{idx < 3 ? 'Elite Prophet' : 'Active Fan'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-white">{player.points.toLocaleString()}</div>
                  <div className="text-[8px] font-black text-gray-600 uppercase">PTS</div>
                </div>
              </div>
            ))}
          </div>
 
          <button className="w-full mt-8 py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black text-gray-500 hover:text-white hover:border-[#1f80e0]/30 transition-all uppercase tracking-widest flex items-center justify-center gap-2 group">
            Full Stadium Standings
            <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
 
        <div className="bg-gradient-to-br from-[#1f80e0]/20 to-[#ec4899]/10 border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-110 transition-transform">
             <Award className="w-24 h-24 text-white" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-[#1f80e0]" />
            </div>
            <h3 className="font-black text-xs uppercase tracking-widest text-white">Season Milestone</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-6 font-medium">Earn 5,000 more XP to unlock the <span className="text-white font-bold">IPL Oracle</span> title and exclusive match-centre themes.</p>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '45%' }}
              className="h-full bg-gradient-to-r from-[#1f80e0] to-[#ec4899]" 
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RewardsShowcase;

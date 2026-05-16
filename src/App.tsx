import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Target, User, Zap, ChevronRight, BarChart3, AlertCircle, Settings, Edit2, Save, X, Sparkles, MessageCircle, Swords, Vote as VoteIcon, Bell, BellOff, Calendar, TrendingUp, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Match, UserState, AIChallenge, MatchInsight, StreakAnalysis, Badge, Notification, NewsItem } from './types';
import FanZone from './FanZone';
import RewardsShowcase from './RewardsShowcase';

// Mock Initial Data
const INITIAL_BADGES: Badge[] = [
  { id: 'b1', name: 'Early Bird', icon: '🌅', requirement: 'Make a prediction 24h early' },
  { id: 'b2', name: 'Loyal Fan', icon: '🤝', requirement: 'Follow a team for 5 matches' },
];

const AVATARS = ['🦁', '🐯', '🦅', '🐺', '🐉', '⚔️', '🔥', '💎'];
const IPL_TEAMS = ['RCB', 'CSK', 'MI', 'GT', 'LSG', 'KKR', 'SRH', 'DC', 'PBKS', 'RR'];

type Tab = 'MATCHES' | 'LEADERBOARD' | 'FAN_ZONE' | 'REWARDS';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('MATCHES');
  const [user, setUser] = useState<UserState>(() => {
    const defaultState: UserState = {
      name: 'HotstarFan_99',
      avatar: '🐯',
      xp: 250,
      coins: 100,
      level: 5,
      tier: 'BRONZE',
      streak: 3,
      predictions: [],
      rank: 124,
      personaBadge: 'Rising Star',
      badges: INITIAL_BADGES,
      followedTeams: ['RCB'],
      followedMatches: [],
      notificationPrefs: {
        upcomingMatches: true,
        matchEvents: true,
        aiChallenges: true,
        gameResults: true,
      },
      challengeAccepted: false
    };
    const saved = localStorage.getItem('userState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { 
          ...defaultState, 
          ...parsed,
          predictions: parsed.predictions || defaultState.predictions,
          badges: parsed.badges || defaultState.badges,
          followedTeams: parsed.followedTeams || defaultState.followedTeams,
          followedMatches: parsed.followedMatches || defaultState.followedMatches,
          notificationPrefs: { ...defaultState.notificationPrefs, ...(parsed.notificationPrefs || {}) }
        };
      } catch (e) {
        return defaultState;
      }
    }
    return defaultState;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentToast, setCurrentToast] = useState<Notification | null>(null);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      const response = await fetch('/api/matches');
      const data = await response.json();
      setMatches(data);
      // Sync user predictions with initial matches if they don't have predictions yet
      setUser(prev => ({ 
        ...prev, 
        predictions: (prev?.predictions?.length || 0) > 0 ? prev.predictions : data 
      }));
      
      // Auto-fetch insight for relevant matches
      const liveMatch = data.find((m: Match) => m.time === 'LIVE');
      const featuredMatch = liveMatch || data[0];
      
      if (featuredMatch) {
        fetchInsight(featuredMatch.id, featuredMatch.teamA, featuredMatch.teamB, false, featuredMatch.scoreA, featuredMatch.scoreB, featuredMatch.time);
      }
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const [aiChallenge, setAiChallenge] = useState<AIChallenge | null>(() => {
    const saved = localStorage.getItem('aiChallenge');
    return saved ? JSON.parse(saved) : null;
  });
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editAvatar, setEditAvatar] = useState(user.avatar);
  const [editFollowedTeams, setEditFollowedTeams] = useState<string[]>(['RCB']);
  
  const [matchInsights, setMatchInsights] = useState<Record<string, MatchInsight>>(() => {
    const saved = localStorage.getItem('matchInsights');
    return saved ? JSON.parse(saved) : {};
  });
  const [loadingInsights, setLoadingInsights] = useState<Record<string, boolean>>({});
  const [resolvingMatchId, setResolvingMatchId] = useState<string | null>(null);

  const [streakAnalysis, setStreakAnalysis] = useState<StreakAnalysis | null>(() => {
    const saved = localStorage.getItem('streakAnalysis');
    return saved ? JSON.parse(saved) : null;
  });
  const [loadingStreak, setLoadingStreak] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Voting State
  const [votedPoll, setVotedPoll] = useState<string | null>(null);
  const [pollResults, setPollResults] = useState<Record<string, number>>({
    'Spinners': 42,
    'Pacers': 38,
    'Equal': 20
  });



  const pushNotification = (title: string, message: string, type: 'match' | 'ai' | 'system') => {
    const newNotification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    setCurrentToast(newNotification);
    setTimeout(() => setCurrentToast(null), 5000);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const fetchTeamNews = async (force = false) => {
    if (user.followedTeams.length === 0) return;
    // Skip if we already have news and aren't forcing a refresh
    if (!force && teamNews.length > 0) {
      const hasAllTeams = user.followedTeams.every(team => teamNews.some(n => n.team === team));
      if (hasAllTeams) return;
    }
    
    setLoadingNews(true);
    try {
      const response = await fetch('/api/team-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: user.followedTeams })
      });
      const data = await response.json();
      setTeamNews(data.news || []);
    } catch (err) {
      console.error("News error:", err);
    } finally {
      setLoadingNews(false);
    }
  };

  const toggleFollowMatch = (matchId: string) => {
    setUser(prev => {
      const isFollowing = prev.followedMatches.includes(matchId);
      const newFollowed = isFollowing
        ? prev.followedMatches.filter(id => id !== matchId)
        : [...prev.followedMatches, matchId];
      
      if (!isFollowing) {
        pushNotification('Match Followed!', 'You will receive priority updates for this match.', 'match');
      }
      
      return { ...prev, followedMatches: newFollowed };
    });
  };

  const [matchFilter, setMatchFilter] = useState<'ALL' | 'FOLLOWED'>('ALL');

  const [teamNews, setTeamNews] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem('teamNews');
    return saved ? JSON.parse(saved) : [];
  });
  const [loadingNews, setLoadingNews] = useState(false);

  const acceptChallenge = () => {
    setUser(prev => ({ ...prev, challengeAccepted: true }));
    pushNotification('Mission Started!', 'Track your progress in the Fan Zone.', 'ai');
  };

  const fetchAIChallenge = async () => {
    setLoadingChallenge(true);
    setUser(prev => ({ ...prev, challengeAccepted: false }));
    try {
      const response = await fetch('/api/ai/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streak: user.streak,
          xp: user.xp,
          tier: user.tier,
          followedTeams: user.followedTeams,
          history: user.predictions.map(m => ({ 
            teams: `${m.teamA} vs ${m.teamB}`, 
            predicted: m.predicted,
            status: m.time,
            result: m.winner === m.predicted ? 'CORRECT' : (m.winner ? 'INCORRECT' : 'PENDING')
          }))
        })
      });
      const data = await response.json();
      setAiChallenge(data);
      if (data.personaBadge) {
        setUser(prev => ({ ...prev, personaBadge: data.personaBadge }));
      }
      if (user.notificationPrefs.aiChallenges) {
        pushNotification('New AI Challenge!', `${data.challengeTitle} (${data.difficulty})`, 'ai');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChallenge(false);
    }
  };

  const fetchStreakAnalysis = async () => {
    if (loadingStreak) return;
    setLoadingStreak(true);
    try {
      const response = await fetch('/api/ai/streak-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streak: user.streak })
      });
      const data = await response.json();
      setStreakAnalysis(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStreak(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInsight = async (matchId: string, teamA: string, teamB: string, force = false, scoreA?: string, scoreB?: string, time?: string) => {
    if (!force && (matchInsights[matchId] || loadingInsights[matchId])) return;
    setLoadingInsights(prev => ({ ...prev, [matchId]: true }));
    try {
      const response = await fetch('/api/ai/match-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamA, teamB, followedTeams: user.followedTeams, scoreA, scoreB, time })
      });
      const data = await response.json();
      setMatchInsights(prev => ({ ...prev, [matchId]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInsights(prev => ({ ...prev, [matchId]: false }));
    }
  };

  useEffect(() => {
    localStorage.setItem('userState', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (aiChallenge) localStorage.setItem('aiChallenge', JSON.stringify(aiChallenge));
  }, [aiChallenge]);

  useEffect(() => {
    if (Object.keys(matchInsights).length > 0) localStorage.setItem('matchInsights', JSON.stringify(matchInsights));
  }, [matchInsights]);

  useEffect(() => {
    if (streakAnalysis) localStorage.setItem('streakAnalysis', JSON.stringify(streakAnalysis));
  }, [streakAnalysis]);

  useEffect(() => {
    if (teamNews.length > 0) localStorage.setItem('teamNews', JSON.stringify(teamNews));
  }, [teamNews]);

  const userRef = React.useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    fetchMatches();
    if (!aiChallenge && !loadingChallenge) fetchAIChallenge();
    if (!streakAnalysis && !loadingStreak) fetchStreakAnalysis();
    fetchLeaderboard();
    fetchTeamNews();

    // WebSocket for real-time scores
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'SCORE_UPDATE') {
        setMatches(prev => prev.map(m => 
          m.id === data.matchId ? { ...m, scoreA: data.scoreA, scoreB: data.scoreB } : m
        ));
        setUser(prev => ({
          ...prev,
          predictions: prev.predictions.map(m => 
            m.id === data.matchId ? { ...m, scoreA: data.scoreA, scoreB: data.scoreB } : m
          )
        }));
      } else if (data.type === 'INIT_SCORES' || data.type === 'REAL_SCORES_SYNC') {
        const scores = data.scores;
        setMatches(prev => prev.map(m => {
          const scoreData = scores[m.id];
          if (scoreData) {
            return { ...m, scoreA: scoreData.scoreA, scoreB: scoreData.scoreB, time: scoreData.time };
          }
          return m;
        }));
        setUser(prev => {
        const existingMatches = [...prev.predictions];
        const prefs = userRef.current.notificationPrefs;
        const followedMatches = userRef.current.followedMatches;
        const followedTeams = userRef.current.followedTeams;
        
        Object.keys(scores).forEach(matchId => {
          const index = existingMatches.findIndex(m => m.id === matchId);
          const scoreData = scores[matchId];
          
          if (index !== -1) {
            const oldMatch = existingMatches[index];
            // Notify if match just went LIVE
            if (oldMatch.time !== 'LIVE' && scoreData.time === 'LIVE' && prefs.matchEvents) {
              const isFollowed = followedMatches.includes(matchId) || followedTeams.some(t => oldMatch.teamA.includes(t) || oldMatch.teamB.includes(t));
              if (isFollowed) {
                pushNotification('🚨 Priority: Match LIVE!', `${scoreData.teamA || oldMatch.teamA} vs ${scoreData.teamB || oldMatch.teamB} has started. Your followed match is active!`, 'match');
              } else {
                pushNotification('Match is LIVE!', `${scoreData.teamA || oldMatch.teamA} vs ${scoreData.teamB || oldMatch.teamB} has started.`, 'match');
              }
            }
            existingMatches[index] = { ...existingMatches[index], ...scores[matchId] };
          } else if (data.type === 'REAL_SCORES_SYNC') {
             if (prefs.upcomingMatches) {
               const newMatch = scoreData;
               const isFav = followedTeams.some(t => newMatch.teamA?.includes(t) || newMatch.teamB?.includes(t));
               if (isFav) {
                 pushNotification('Upcoming Match Found', `${newMatch.teamA} vs ${newMatch.teamB} is scheduled.`, 'match');
               }
             }
          }
        });

          return {
            ...prev,
            predictions: existingMatches
          };
        });
      }
    };

    return () => socket.close();
  }, []);

  useEffect(() => {
    fetchTeamNews();
  }, [user.followedTeams]);

  const [pendingPredictions, setPendingPredictions] = useState<Record<string, string>>({});

  const handlePredictSelection = (matchId: string, team: string) => {
    setPendingPredictions(prev => ({
      ...prev,
      [matchId]: team
    }));
  };

  const cancelPredict = (matchId: string) => {
    setPendingPredictions(prev => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
  };

  const confirmPredict = (matchId: string) => {
    const team = pendingPredictions[matchId];
    if (!team) return;

    setUser(prev => ({
      ...prev,
      predictions: prev.predictions.map(m => 
        m.id === matchId ? { ...m, predicted: team } : m
      ),
      xp: prev.xp + 10
    }));

    setPendingPredictions(prev => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });

    pushNotification('Prediction Locked!', `You've backed ${team} to win. Good luck!`, 'system');
  };

  const resolveMatch = async (matchId: string, winner: string) => {
    setResolvingMatchId(matchId);
    const match = user.predictions.find(m => m.id === matchId);
    if (!match) return;

    try {
      const response = await fetch('/api/ai/post-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamA: match.teamA,
          teamB: match.teamB,
          winner,
          predictedByFan: match.predicted,
          scoreA: match.scoreA,
          scoreB: match.scoreB
        })
      });
      const data = await response.json();
      
      setUser(prev => {
        const isCorrect = match.predicted === winner;
        const multiplier = streakAnalysis?.multiplier || 1;
        let xpGain = (isCorrect ? 100 : 25) * multiplier;
        let coinGain = (isCorrect ? 50 : 10) * multiplier;
        const newStreak = isCorrect ? prev.streak + 1 : 0;
        
        // Challenge Bonus
        let challengeCompleted = false;
        if (prev.challengeAccepted && isCorrect) {
          xpGain += (aiChallenge?.xpReward || 0);
          coinGain += (aiChallenge?.coinReward || 0);
          challengeCompleted = true;
        }

        const newXp = prev.xp + xpGain;
        const newLevel = Math.floor(newXp / 100);
        
        // Tier Logic
        let newTier = prev.tier;
        if (newLevel >= 50) newTier = 'LEGEND';
        else if (newLevel >= 30) newTier = 'PLATINUM';
        else if (newLevel >= 20) newTier = 'GOLD';
        else if (newLevel >= 10) newTier = 'SILVER';
        else if (newLevel >= 5) newTier = 'BRONZE';

        if (prev.notificationPrefs.gameResults) {
          pushNotification('Match Result!', `Prediction for ${match.teamA} vs ${match.teamB} was ${isCorrect ? 'CORRECT' : 'INCORRECT'}. +${xpGain} XP`, 'system');
        }

        if (challengeCompleted) {
          pushNotification('Mission Accomplished!', `You completed: ${aiChallenge?.challengeTitle}! +${aiChallenge?.coinReward} Coins`, 'ai');
        }

        if (newTier !== prev.tier) {
          pushNotification('Promotion!', `You've been promoted to ${newTier} Tier!`, 'system');
        }

        return {
          ...prev,
          xp: newXp,
          coins: prev.coins + coinGain,
          level: newLevel,
          tier: newTier,
          streak: newStreak,
          challengeAccepted: challengeCompleted ? false : prev.challengeAccepted,
          predictions: prev.predictions.map(m => 
            m.id === matchId ? { ...m, winner, time: 'FINISHED', aiSummary: data.summary, aiReaction: data.reaction } : m
          )
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingMatchId(null);
      fetchStreakAnalysis(); // Update multiplier based on new streak
    }
  };

  const handleVote = (option: string) => {
    if (votedPoll) return;
    setVotedPoll(option);
    setUser(prev => ({ 
      ...prev, 
      xp: prev.xp + 25,
      coins: prev.coins + 5 
    }));
    // Simulate updating weighted results
    setPollResults(prev => ({
      ...prev,
      [option]: prev[option] + 1
    }));
    pushNotification('Vote Recorded!', 'You earned 25 XP and 5 Coins for participating in the poll.', 'system');
  };

  const saveProfile = () => {
    const hasNewTeams = editFollowedTeams.length > user.followedTeams.length || 
                       editFollowedTeams.some(t => !user.followedTeams.includes(t));
    setUser(prev => ({ ...prev, name: editName, avatar: editAvatar, followedTeams: editFollowedTeams }));
    setIsEditingProfile(false);
    if (hasNewTeams) {
      setTimeout(() => fetchTeamNews(), 100);
    }
  };

  const nextLevelXP = user.level * 100;
  const progress = (user.xp % 100);

  return (
    <div className="flex min-h-screen bg-[#030b17] text-white font-sans selection:bg-[#1f80e0] selection:text-white">
      {/* Cinematic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-b from-[#1f80e0]/5 to-transparent" />
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/5 bg-[#030b17] flex flex-col sticky top-0 h-screen z-50 hidden lg:flex">
        <div className="p-8">
          <h1 className="text-2xl font-black italic tracking-tighter text-[#1f80e0]">
            FANPULSE<span className="text-white not-italic font-light">AI</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'MATCHES', label: 'Match Center', icon: Swords },
            { id: 'FAN_ZONE', label: 'Fan Zone', icon: Zap },
            { id: 'REWARDS', label: 'Vault', icon: Sparkles },
            { id: 'LEADERBOARD', label: 'Hall of Fame', icon: Trophy },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  activeTab === item.id
                    ? 'bg-[#1f80e0]/10 text-[#1f80e0] border border-[#1f80e0]/20 shadow-[0_0_15px_rgba(31,128,224,0.1)]'
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${activeTab === item.id ? 'text-[#1f80e0]' : 'text-gray-600 group-hover:text-gray-300'}`} />
                <span className="text-sm font-bold uppercase tracking-widest">{item.label}</span>
                {activeTab === item.id && (
                  <motion.div layoutId="nav-glow" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1f80e0] shadow-[0_0_10px_#1f80e0]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-6">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#1f80e0]/20 flex items-center justify-center text-lg">{user.avatar}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white truncate uppercase tracking-tight">{user.name}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{user.personaBadge}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[8px] font-black text-gray-500 uppercase">
                <span>Lvl {user.level}</span>
                <span className="text-[#1f80e0]">{progress}%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#1f80e0]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header (Top Bar) */}
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#030b17]/80 backdrop-blur-xl px-4 lg:px-10 py-4 h-20 flex items-center justify-between">
          <div className="lg:hidden">
            <h1 className="text-xl font-black italic tracking-tighter text-[#1f80e0]">FANPULSE</h1>
          </div>
          
          <div className="hidden lg:block">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500">
              {activeTab.replace('_', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all relative border border-white/5 group"
              >
                <Bell className="w-5 h-5 text-gray-400 group-hover:text-white" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#1f80e0] rounded-full ring-2 ring-[#030b17]" />
                )}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowNotifications(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-96 bg-[#0c111b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[70] glass"
                    >
                      <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <span className="text-xs font-black uppercase tracking-widest text-[#1f80e0]">Pulse Alerts</span>
                        <div className="flex gap-3">
                          <button onClick={markAllRead} className="text-[10px] font-bold text-gray-500 hover:text-white uppercase transition-colors">Mark all read</button>
                          <button onClick={clearNotifications} className="text-[10px] font-bold text-red-500/50 hover:text-red-500 uppercase transition-colors">Clear</button>
                        </div>
                      </div>
                      <div className="max-h-[32rem] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-10 text-center">
                            <BellOff className="w-10 h-10 text-gray-800 mx-auto mb-4" />
                            <p className="text-xs text-gray-500 font-medium tracking-wide">Your stadium is currently quiet.</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className={`p-5 border-b border-white/5 transition-colors ${n.read ? 'opacity-40' : 'bg-[#1f80e0]/5'}`}>
                              <div className="flex items-start gap-4">
                                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${n.type === 'ai' ? 'bg-pink-500 shadow-[0_0_8px_#ec4899]' : n.type === 'match' ? 'bg-[#1f80e0] shadow-[0_0_8px_#1f80e0]' : 'bg-green-500 shadow-[0_0_8px_#22c55e]'}`} />
                                <div className="flex-1">
                                  <div className="text-[11px] font-black leading-tight mb-1.5 uppercase tracking-tight text-white">{n.title}</div>
                                  <div className="text-[12px] text-gray-400 leading-normal mb-2 font-medium">{n.message}</div>
                                  <div className="text-[9px] text-gray-600 font-bold uppercase">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-xl group hover:border-orange-500/50 transition-all">
              <div className="relative">
                <Flame className={`w-4 h-4 ${user.streak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-gray-600'}`} />
                {user.streak > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full blur-[2px] animate-ping" />
                )}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${user.streak > 0 ? 'text-orange-500' : 'text-gray-500'}`}>
                {user.streak} DAY STREAK
              </span>
            </div>

            <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 px-4 py-2 rounded-xl">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-black text-yellow-400 uppercase tracking-widest">{user.coins} COINS</span>
            </div>

            <div className="flex items-center gap-2 bg-[#1f80e0]/10 border border-[#1f80e0]/20 px-4 py-2 rounded-xl">
              <Trophy className="w-4 h-4 text-[#1f80e0]" />
              <span className="text-xs font-black text-[#1f80e0] uppercase tracking-widest">{user.tier}</span>
            </div>

            <button 
              onClick={() => setIsEditingProfile(true)}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group"
            >
              <Settings className="w-5 h-5 text-gray-400 group-hover:text-white" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-10 py-10 relative z-10 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Active Tab Logic */}
          {activeTab === 'MATCHES' && (
            <motion.div 
              key="matches"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              {/* Featured AI Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 bg-[#1f80e0]" />
                  <h2 className="text-lg font-bold tracking-tight">AI MATCH INSIGHTS</h2>
                </div>
                
                <motion.div 
                  className="relative rounded-xl overflow-hidden bg-[#0c111b] border border-white/5 shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0c111b] via-[#0c111b]/80 to-transparent z-10" />
                  <img 
                    src="https://images.unsplash.com/photo-1540747913346-19e3ad6466b9?auto=format&fit=crop&q=80&w=2000" 
                    className="absolute right-0 top-0 h-full w-2/3 object-cover opacity-50 grayscale"
                    alt="Stadium"
                    referrerPolicy="no-referrer"
                  />
                  
                  <div className="relative z-20 p-10 max-w-2xl">
                    {loadingChallenge ? (
                      <div className="py-12"><div className="w-8 h-8 border-2 border-[#1f80e0] border-t-transparent animate-spin rounded-full" /></div>
                    ) : aiChallenge ? (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-[#1f80e0] font-black text-4xl">01</span>
                          <div>
                            <div className="text-[10px] font-bold text-[#1f80e0] uppercase tracking-[0.2em]">Daily Mission</div>
                            <h3 className="text-3xl font-bold">{aiChallenge.challengeTitle}</h3>
                          </div>
                        </div>
                        <p className="text-gray-400 text-lg mb-8 leading-relaxed font-light">{aiChallenge.challengeDescription}</p>
                        
                        <div className="flex flex-wrap items-center gap-6">
                          <button 
                            onClick={acceptChallenge}
                            disabled={user.challengeAccepted}
                            className={`group relative ${user.challengeAccepted ? 'bg-green-600' : 'bg-[#1f80e0] hover:bg-[#1a6dc0]'} text-white px-8 py-3 rounded-md font-bold text-sm transition-all transform active:scale-95 shadow-lg shadow-[#1f80e0]/20 overflow-hidden`}
                          >
                            <span className="relative z-10">{user.challengeAccepted ? 'MISSION ACTIVE' : 'ACCEPT CHALLENGE'}</span>
                            {!user.challengeAccepted && (
                              <motion.div 
                                initial={{ x: '-100%' }}
                                whileHover={{ x: '100%' }}
                                transition={{ duration: 0.5 }}
                                className="absolute inset-0 bg-white/20 skew-x-12"
                              />
                            )}
                          </button>
                          <div className="flex items-center gap-2 text-gray-500">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-bold uppercase tracking-widest">+{aiChallenge.xpReward} XP REWARD</span>
                          </div>
                        </div>
                        
                        <div className="mt-8 flex items-center gap-10 border-t border-white/5 pt-8">
                           <div>
                             <div className="text-[9px] font-bold text-gray-500 uppercase mb-2 tracking-widest">Your Progress</div>
                             <div className="flex gap-1">
                                {[1, 2, 3].map(i => (
                                  <div key={i} className={`w-8 h-1 rounded-full ${i === 1 ? 'bg-[#1f80e0]' : 'bg-white/5'}`} />
                                ))}
                             </div>
                           </div>
                           <div className="flex-1">
                             <span className="text-xs text-gray-500 italic block"> AI Commentary: "{aiChallenge.motivationQuote}"</span>
                           </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </motion.div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Matches Grid */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-[#1f80e0]" />
                      <h2 className="text-lg font-bold uppercase tracking-tight">Match Center</h2>
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                      <button 
                        onClick={() => setMatchFilter('ALL')}
                        className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${matchFilter === 'ALL' ? 'bg-[#1f80e0] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                      >
                        ALL MATCHES
                      </button>
                      <button 
                        onClick={() => setMatchFilter('FOLLOWED')}
                        className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-2 ${matchFilter === 'FOLLOWED' ? 'bg-[#1f80e0] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                      >
                        <Calendar className="w-3 h-3" />
                        FOLLOWING ({user.followedMatches.length})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xxl:grid-cols-3 gap-6">
                    {user.predictions
                      .filter(m => matchFilter === 'ALL' || user.followedMatches.includes(m.id))
                      .map((match) => (
                      <motion.div 
                        key={match.id}
                        layout
                        whileHover={{ y: -4, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}
                        className="bg-[#0c111b] rounded-2xl border border-white/5 hover:border-[#1f80e0]/40 transition-all shadow-2xl overflow-hidden flex flex-col group/card glass"
                      >
                        <div className="p-6">
                          <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-black px-3 py-1 rounded-sm ${match.time === 'LIVE' ? 'bg-red-600 animate-pulse' : 'bg-gray-800'} uppercase tracking-widest text-white`}>
                                {match.time}
                              </span>
                              <button 
                                onClick={() => toggleFollowMatch(match.id)}
                                className={`p-1.5 rounded-md transition-colors ${user.followedMatches.includes(match.id) ? 'text-[#1f80e0] bg-[#1f80e0]/10' : 'text-gray-600 hover:text-white hover:bg-white/5'}`}
                              >
                                <TrendingUp className={`w-4 h-4 ${user.followedMatches.includes(match.id) ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                            <button 
                                onClick={() => fetchInsight(match.id, match.teamA, match.teamB, false, match.scoreA, match.scoreB, match.time)}
                                disabled={loadingInsights[match.id]}
                                className="text-[10px] flex items-center gap-1.5 text-[#1f80e0] hover:text-white transition-colors font-bold uppercase bg-[#1f80e0]/10 px-2 py-1 rounded-sm border border-[#1f80e0]/20"
                              >
                                 {loadingInsights[match.id] ? (
                                   <div className="w-3 h-3 border border-current border-t-transparent animate-spin rounded-full" />
                                 ) : (
                                   <Sparkles className="w-3 h-3" />
                                 )}
                                 Analysis
                              </button>
                          </div>

                          <div className="flex items-center justify-between mb-8">
                            <div className="text-center group flex-1">
                              <div className="mx-auto w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2 group-hover:bg-[#1f80e0]/20 transition-colors">
                                <span className="font-black text-xl">{match.teamA[0]}</span>
                              </div>
                              <span className="text-sm font-black italic block">{match.teamA}</span>
                              {match.scoreA && <span className="text-[10px] font-bold text-[#1f80e0] block mt-1">{match.scoreA}</span>}
                            </div>
                            <div className="px-4 text-gray-800 font-black text-xl italic shrink-0">VS</div>
                            <div className="text-center group flex-1">
                              <div className="mx-auto w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2 group-hover:bg-[#1f80e0]/20 transition-colors">
                                <span className="font-black text-xl">{match.teamB[0]}</span>
                              </div>
                              <span className="text-sm font-black italic block">{match.teamB}</span>
                              {match.scoreB && <span className="text-[10px] font-bold text-pink-500 block mt-1">{match.scoreB}</span>}
                            </div>
                          </div>

                          <div className="flex flex-col gap-4">
                            <div className="flex gap-2">
                              {match.time === 'FINISHED' ? (
                                <div className="w-full space-y-4">
                                  <div className={`w-full py-2 rounded text-center text-xs font-black uppercase tracking-widest ${match.predicted === match.winner ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                                    {match.predicted === match.winner 
                                      ? `PREDICTION CORRECT +${Math.round(100 * (streakAnalysis?.multiplier || 1))} XP` 
                                      : `PREDICTION FAILED +${Math.round(25 * (streakAnalysis?.multiplier || 1))} XP`}
                                  </div>
                                  
                                  {match.aiSummary && (
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.98 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="p-5 bg-white/[0.03] rounded-2xl border border-white/5 relative overflow-hidden"
                                    >
                                      <div className="absolute top-0 right-0 p-3 opacity-5">
                                        <Trophy className="w-16 h-16 text-[#1f80e0]" />
                                      </div>
                                      <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                          <Sparkles className="w-4 h-4 text-[#1f80e0]" />
                                          <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">Match Narrative Summary</span>
                                        </div>
                                        <p className="text-[13px] text-gray-300 leading-relaxed font-light italic">
                                          "{match.aiSummary}"
                                        </p>
                                        {match.aiReaction && (
                                          <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-[#1f80e0]/10 flex items-center justify-center">
                                              <MessageCircle className="w-3 h-3 text-[#1f80e0]" />
                                            </div>
                                            <span className="text-[11px] font-bold text-[#1f80e0] leading-tight italic">
                                              {match.aiReaction}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              ) : match.time === 'LIVE' ? (
                                <>
                                  <button 
                                    onClick={() => resolveMatch(match.id, match.teamA)}
                                    disabled={resolvingMatchId === match.id}
                                    className="flex-1 py-1.5 rounded transition-all text-[10px] font-bold tracking-widest bg-white/5 text-gray-400 hover:bg-[#1f80e0] hover:text-white border border-white/10"
                                  >
                                    {resolvingMatchId === match.id ? '...' : `END: ${match.teamA} WINS`}
                                  </button>
                                  <button 
                                    onClick={() => resolveMatch(match.id, match.teamB)}
                                    disabled={resolvingMatchId === match.id}
                                    className="flex-1 py-1.5 rounded transition-all text-[10px] font-bold tracking-widest bg-white/5 text-gray-400 hover:bg-[#1f80e0] hover:text-white border border-white/10"
                                  >
                                    {resolvingMatchId === match.id ? '...' : `END: ${match.teamB} WINS`}
                                  </button>
                                </>
                              ) : (
                                <div className="min-h-[40px] flex items-center">
                                  <AnimatePresence mode="wait">
                                    {pendingPredictions[match.id] ? (
                                      <motion.div 
                                        key="confirm"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="w-full flex items-center justify-between gap-3 bg-[#1f80e0]/10 p-2 rounded-lg border border-[#1f80e0]/30"
                                      >
                                        <div className="flex flex-col">
                                          <span className="text-[8px] font-black uppercase text-[#1f80e0] tracking-tighter">Confirm Choice?</span>
                                          <span className="text-[10px] font-black text-white italic">{pendingPredictions[match.id]} WINS</span>
                                        </div>
                                        <div className="flex gap-2">
                                          <button 
                                            onClick={() => cancelPredict(match.id)}
                                            className="px-3 py-1.5 rounded bg-white/5 text-[9px] font-bold hover:bg-white/10 transition-colors"
                                          >
                                            CANCEL
                                          </button>
                                          <motion.button 
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => confirmPredict(match.id)}
                                            className="px-4 py-1.5 rounded bg-[#1f80e0] text-[9px] font-black shadow-lg shadow-[#1f80e0]/40"
                                          >
                                            LOCK IT IN
                                          </motion.button>
                                        </div>
                                      </motion.div>
                                    ) : (
                                      <motion.div 
                                        key="select"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="w-full flex gap-2"
                                      >
                                        <button 
                                          onClick={() => handlePredictSelection(match.id, match.teamA)}
                                          className={`flex-1 py-2 rounded transition-all text-[10px] font-bold tracking-widest ${match.predicted === match.teamA ? 'bg-[#1f80e0] text-white shadow-lg shadow-[#1f80e0]/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 italic'}`}
                                        >
                                          {match.teamA} WINS
                                        </button>
                                        <button 
                                          onClick={() => handlePredictSelection(match.id, match.teamB)}
                                          className={`flex-1 py-2 rounded transition-all text-[10px] font-bold tracking-widest ${match.predicted === match.teamB ? 'bg-[#1f80e0] text-white shadow-lg shadow-[#1f80e0]/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 italic'}`}
                                        >
                                          {match.teamB} WINS
                                        </button>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>

                            {/* Gemini AI Predictions Section */}
                            <AnimatePresence>
                              {matchInsights[match.id] && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="pt-6 border-t border-white/5 space-y-5"
                                >
                                  {/* Win Probability Header */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-[#1f80e0]/10 rounded-lg">
                                        <Sparkles className="w-4 h-4 text-[#1f80e0]" />
                                      </div>
                                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">AI Win Probability</span>
                                      <button 
                                        onClick={() => fetchInsight(match.id, match.teamA, match.teamB, true, match.scoreA, match.scoreB, match.time)}
                                        disabled={loadingInsights[match.id]}
                                        className="p-1 hover:bg-white/5 rounded transition-colors text-gray-600 hover:text-[#1f80e0] disabled:opacity-30"
                                        title="Refresh AI Analysis"
                                      >
                                        <RotateCw className={`w-3 h-3 ${loadingInsights[match.id] ? 'animate-spin' : ''}`} />
                                      </button>
                                    </div>
                                    <div className="flex gap-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{match.teamA}</span>
                                        <span className="text-sm font-black text-[#1f80e0]">{Math.round(matchInsights[match.id].winProbabilityA * 100)}%</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-pink-500">{Math.round(matchInsights[match.id].winProbabilityB * 100)}%</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{match.teamB}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Dynamic Probability Bar */}
                                  <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden flex p-0.5 border border-white/5 shadow-inner">
                                    <motion.div 
                                      initial={{ width: 0 }} 
                                      animate={{ width: `${matchInsights[match.id].winProbabilityA * 100}%` }} 
                                      className="h-full bg-[#1f80e0] rounded-l-full relative group"
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </motion.div>
                                    <motion.div 
                                      initial={{ width: 0 }} 
                                      animate={{ width: `${matchInsights[match.id].winProbabilityB * 100}%` }} 
                                      className="h-full bg-pink-500 rounded-r-full relative group"
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-l from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </motion.div>
                                  </div>

                                  {/* Key Battle Analysis Box */}
                                  <div className="relative group/insight bg-gradient-to-br from-[#1f80e0]/5 to-transparent p-5 rounded-2xl border border-[#1f80e0]/10 hover:border-[#1f80e0]/30 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                      <Swords className="w-4 h-4 text-[#1f80e0]" />
                                      <div className="text-[9px] font-black text-[#1f80e0] uppercase tracking-widest">Key Battle: {matchInsights[match.id].keyBattle}</div>
                                    </div>
                                    <p className="text-[12px] text-gray-300 leading-relaxed font-light italic">
                                      "{matchInsights[match.id].strategicTip}"
                                    </p>
                                    <div className="mt-3 flex items-center gap-1.5 opacity-40 group-hover/insight:opacity-100 transition-opacity">
                                      <BarChart3 className="w-3 h-3 text-gray-500" />
                                      <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter">Strategic Insight Compiled by Gemini 2.0</span>
                                    </div>
                                  </div>

                                  {/* Live AI Commentary */}
                                  {matchInsights[match.id]?.liveCommentary && (
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex gap-5 items-start relative overflow-hidden"
                                    >
                                      <div className="absolute top-0 right-0 p-2 opacity-10">
                                        <Sparkles className="w-12 h-12 text-[#1f80e0]" />
                                      </div>
                                      <div className="p-2.5 bg-pink-500/10 rounded-xl relative z-10">
                                        <MessageCircle className="w-5 h-5 text-pink-500" />
                                      </div>
                                      <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <div className="text-[9px] font-black text-pink-500 uppercase tracking-[0.2em]">Live AI Commentary</div>
                                          {match.time === 'LIVE' && (
                                            <div className="flex items-center gap-1">
                                              <span className="w-1 h-1 rounded-full bg-pink-500 animate-pulse" />
                                              <span className="text-[7px] font-black text-pink-500/50 uppercase tracking-widest">evolving</span>
                                            </div>
                                          )}
                                        </div>
                                        <p className="text-[13px] text-gray-400 leading-relaxed font-light italic">
                                          "{matchInsights[match.id].liveCommentary}"
                                        </p>
                                      </div>
                                    </motion.div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Additional Tip (Optional/Hidden for cleaner look) */}
                        {false && matchInsights[match.id] && (
                           <div className="bg-[#1f80e0]/5 p-5 border-t border-white/5">
                                <p className="text-[10px] text-gray-400 leading-relaxed font-light">
                                  <span className="text-[#1f80e0] font-bold uppercase tracking-widest text-[9px] mr-2">Strategy:</span> {matchInsights[match.id].strategicTip}
                                </p>
                           </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <div className="bg-[#0c111b] rounded-xl p-6 border border-white/5 relative overflow-hidden group">
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#1f80e0] to-[#0a4d8c] rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-[#1f80e0]/20">
                        {user.avatar}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white leading-none mb-1">{user.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] text-[#1f80e0] font-black uppercase tracking-[0.2em]">{user.personaBadge}</p>
                          <div className="w-1 h-1 rounded-full bg-gray-700" />
                          <div className="flex gap-1">
                            {user.followedTeams.map(t => (
                              <span key={t} className="text-[8px] font-black italic text-gray-500">{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                      <div>
                        <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase mb-2">
                          <span>Level {user.level}</span>
                          <span className="text-[#1f80e0]">{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div className="h-full bg-gradient-to-r from-[#1f80e0] to-[#46a3ff]" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5 hover:border-[#1f80e0]/20 transition-colors">
                          <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">STREAK</div>
                          <div className="text-2xl font-black italic flex items-center justify-center gap-1.5">
                            <Flame className="w-5 h-5 text-orange-500" />
                            {user.streak}
                          </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5 hover:border-[#1f80e0]/20 transition-colors">
                          <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">XP</div>
                          <div className="text-2xl font-black italic text-[#1f80e0]">{user.xp}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badges Section */}
                  <div className="bg-[#0c111b] rounded-xl p-6 border border-white/5">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-4 tracking-[0.2em]">Badge Gallery</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.badges.map(badge => (
                        <div key={badge.id} title={badge.requirement} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl cursor-help hover:bg-[#1f80e0]/20 transition-colors">
                          {badge.icon}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'LEADERBOARD' && (
            <motion.div 
              key="leaderboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-5xl mx-auto space-y-10"
            >
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-4xl font-black italic text-[#1f80e0] uppercase tracking-tighter">Hall of Fame</h2>
                  <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">The Pulse Elite Predictions Leaderboard</p>
                </div>
                <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Global Users</p>
                    <p className="text-xl font-black italic">14.2K</p>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-center">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Avg Accuracy</p>
                    <p className="text-xl font-black italic text-green-500">72%</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#0c111b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl glass">
                <div className="grid grid-cols-12 gap-4 px-8 py-5 bg-white/5 border-b border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-5">Predictor</div>
                  <div className="col-span-2 text-center">XP Points</div>
                  <div className="col-span-2 text-center">Accuracy</div>
                  <div className="col-span-2 text-right">Badge</div>
                </div>
                <div className="divide-y divide-white/5">
                  {leaderboard.map((player, idx) => (
                    <div key={idx} className={`grid grid-cols-12 gap-4 px-8 py-6 items-center transition-colors hover:bg-white/[0.02] ${player.name === user.name ? 'bg-[#1f80e0]/5' : ''}`}>
                      <div className="col-span-1 text-2xl font-black italic text-gray-700">
                        {idx < 3 ? (
                          <span className={`${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : 'text-orange-500'}`}>
                            #{idx + 1}
                          </span>
                        ) : `#${idx + 1}`}
                      </div>
                      <div className="col-span-5 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl border border-white/10">
                          {player.avatar}
                        </div>
                        <div>
                          <div className="font-black text-lg text-white">{player.name}</div>
                          <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Active since May '24</div>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="text-lg font-black italic text-white">{player.points.toLocaleString()}</div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="inline-block px-3 py-1 bg-green-500/10 rounded-lg text-green-500 font-bold text-xs">
                          {80 - idx * 2}%
                        </div>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-[10px] font-black italic text-[#1f80e0] uppercase tracking-tighter opacity-80">
                          {idx === 0 ? 'Legendary Backer' : 'Rising Star'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'FAN_ZONE' && (
            <FanZone 
              userState={user} 
              setUserState={setUser} 
              pollResults={pollResults} 
              handleVote={handleVote} 
              votedPoll={votedPoll}
              acceptChallenge={acceptChallenge}
            />
          )}

          {activeTab === 'REWARDS' && (
            <RewardsShowcase userState={user} setUserState={setUser} />
          )}
        </AnimatePresence>

      </main>

      <footer className="border-t border-white/5 py-12 bg-[#0c111b] mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
            <h2 className="text-xl font-black italic tracking-tighter text-[#1f80e0]">HOTSTAR <span className="text-gray-700 not-italic font-light">MATCH CENTRE</span></h2>
            <div className="text-[10px] text-gray-700 font-bold tracking-[0.3em] uppercase flex items-center gap-2">
               <Sparkles className="w-3 h-3" />
               Powered by Gemini 2.5 Flash Lite
            </div>
        </div>
      </footer>
      </div>

      {/* Mobile Navigation (Stick to bottom for mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c111b] border-t border-white/10 flex lg:hidden items-center justify-around p-3 backdrop-blur-xl">
        {[
          { id: 'MATCHES', label: 'Matches', icon: Swords },
          { id: 'FAN_ZONE', label: 'Fan Zone', icon: Zap },
          { id: 'LEADERBOARD', label: 'Leaders', icon: Trophy },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                activeTab === item.id ? 'text-[#1f80e0]' : 'text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile Edit Modal (Moved inside root) */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0c111b] border border-white/10 w-full max-w-md rounded-3xl p-8 shadow-2xl glass"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold tracking-tight">Edit Profile</h2>
                <button onClick={() => setIsEditingProfile(false)} className="text-gray-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-3">Choose Avatar</label>
                  <div className="grid grid-cols-4 gap-3">
                    {AVATARS.map(av => (
                      <button 
                        key={av}
                        onClick={() => setEditAvatar(av)}
                        className={`w-14 h-14 rounded-2xl text-2xl flex items-center justify-center transition-all ${editAvatar === av ? 'bg-[#1f80e0] scale-110 shadow-lg shadow-[#1f80e0]/20' : 'bg-white/5 hover:bg-white/10 filter grayscale'}`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Display Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#1f80e0] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-3">Follow Your Teams</label>
                  <div className="flex flex-wrap gap-2">
                    {IPL_TEAMS.map(team => {
                      const isFollowed = editFollowedTeams.includes(team);
                      return (
                        <button 
                          key={team}
                          onClick={() => {
                            if (isFollowed) {
                              setEditFollowedTeams(prev => prev.filter(t => t !== team));
                            } else {
                              setEditFollowedTeams(prev => [...prev, team]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg font-black italic text-[10px] border transition-all ${isFollowed ? 'bg-[#1f80e0] border-[#1f80e0] text-white shadow-lg shadow-[#1f80e0]/20' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30'}`}
                        >
                          {team}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-4">Pulse Settings</label>
                  <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                    {[
                      { key: 'upcomingMatches', label: 'Match Schedule' },
                      { key: 'matchEvents', label: 'Live Events' },
                      { key: 'aiChallenges', label: 'AI Missions' },
                      { key: 'gameResults', label: 'Final Scores' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 tracking-wide uppercase">{label}</span>
                        <button 
                          onClick={() => setUser(prev => ({
                            ...prev,
                            notificationPrefs: {
                              ...prev.notificationPrefs,
                              [key]: !prev.notificationPrefs[key as keyof typeof prev.notificationPrefs]
                            }
                          }))}
                          className={`w-9 h-4.5 rounded-full transition-colors relative ${user.notificationPrefs[key as keyof typeof user.notificationPrefs] ? 'bg-[#1f80e0]' : 'bg-gray-700'}`}
                        >
                          <motion.div 
                            animate={{ x: user.notificationPrefs[key as keyof typeof user.notificationPrefs] ? 18 : 2 }}
                            className="absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={saveProfile}
                  className="w-full bg-[#1f80e0] py-4 rounded-xl font-black text-xs tracking-widest hover:bg-[#1a6dc0] transition-all shadow-[0_0_20px_rgba(31,128,224,0.3)] flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  SAVE CHANGES
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {currentToast && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-24 right-10 z-[100] w-80 bg-[#0c111b] border border-[#1f80e0]/30 rounded-2xl p-4 shadow-2xl shadow-[#1f80e0]/10 glass flex gap-4 items-center cursor-pointer"
            onClick={() => setCurrentToast(null)}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              currentToast.type === 'ai' ? 'bg-[#1f80e0]/10 text-[#1f80e0]' : 
              currentToast.type === 'match' ? 'bg-pink-500/10 text-pink-500' : 'bg-green-500/10 text-green-500'
            }`}>
              {currentToast.type === 'ai' ? <Sparkles className="w-5 h-5" /> : 
               currentToast.type === 'match' ? <Zap className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-1">{currentToast.title}</h4>
              <p className="text-[11px] text-gray-400 font-medium leading-tight">{currentToast.message}</p>
            </div>
            <div className="absolute top-0 left-0 h-full w-1 bg-[#1f80e0] rounded-l-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

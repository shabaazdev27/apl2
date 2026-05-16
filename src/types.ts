export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  time: string;
  predicted?: string;
  winner?: string;
  scoreA?: string;
  scoreB?: string;
  aiSummary?: string;
  aiReaction?: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  unlockedAt?: string;
  requirement: string;
}

export interface NewsItem {
  id: string;
  team: string;
  title: string;
  snippet: string;
  source: string;
  timestamp: string;
  tags: string[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'match' | 'ai' | 'system';
  timestamp: string;
  read: boolean;
}

export interface NotificationPrefs {
  upcomingMatches: boolean;
  matchEvents: boolean;
  aiChallenges: boolean;
  gameResults: boolean;
}

export interface UserState {
  name: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  predictions: Match[];
  rank: number;
  personaBadge?: string;
  badges: Badge[];
  followedTeams: string[];
  followedMatches: string[];
  notificationPrefs: NotificationPrefs;
}

export interface AIChallenge {
  challengeTitle: string;
  challengeDescription: string;
  xpReward: number;
  personaBadge: string;
  motivationQuote: string;
}

export interface MatchInsight {
  keyBattle: string;
  strategicTip: string;
  winProbabilityA: number;
  winProbabilityB: number;
  liveCommentary?: string;
}

export interface StreakAnalysis {
  rewardTitle: string;
  rewardDescription: string;
  multiplier: number;
  aiCommentary: string;
}

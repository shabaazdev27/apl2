import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FanZone from '../FanZone';
import React from 'react';
import { UserState } from '../types';

const mockUser: UserState = {
  name: 'Test Fan',
  avatar: '🦁',
  xp: 150,
  coins: 50,
  level: 1,
  tier: 'BRONZE' as const,
  streak: 2,
  predictions: [],
  rank: 1,
  badges: [],
  followedTeams: ['RCB'],
  followedMatches: [],
  notificationPrefs: {
    upcomingMatches: true,
    matchEvents: true,
    aiChallenges: true,
    gameResults: true,
  },
  challengeAccepted: false,
  personaBadge: 'Rising Star'
};

const mockPollResults = { 'Spinners': 10, 'Pacers': 5, 'Equal': 2 };

// Mock global fetch
global.fetch = vi.fn();

describe('FanZone', () => {
  it('renders components correctly', async () => {
    (global.fetch as any).mockResolvedValue({
      json: async () => ({
        challengeTitle: 'Test Challenge',
        challengeDescription: 'Do something',
        xpReward: 100,
        coinReward: 50,
        difficulty: 'MEDIUM',
        personaBadge: 'Alpha',
        motivationQuote: 'Keep going'
      })
    });

    render(
      <FanZone 
        userState={mockUser} 
        setUserState={vi.fn()} 
        pollResults={mockPollResults} 
        handleVote={vi.fn()} 
        votedPoll={null} 
        acceptChallenge={vi.fn()} 
      />
    );
    
    expect(screen.getByText('BRONZE')).toBeInTheDocument();
    expect(screen.getByText(/50 \/ 100 XP/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Streak
    
    await waitFor(() => {
      expect(screen.getByText('Test Challenge')).toBeInTheDocument();
    });
  });

  it('shows team news section', async () => {
     (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        challengeTitle: 'Test Challenge',
        challengeDescription: 'Do something',
        xpReward: 100,
        coinReward: 50,
        difficulty: 'MEDIUM',
        personaBadge: 'Alpha',
        motivationQuote: 'Keep going'
      })
    }).mockResolvedValueOnce({
      json: async () => ({
        news: [
          { id: '1', team: 'RCB', title: 'RCB News', snippet: 'Something happened', source: 'Insider', timestamp: '5m ago', tags: ['IPL'] }
        ]
      })
    }).mockResolvedValueOnce({
      json: async () => ({
        onStrike: 'Kohli',
        bowler: 'Bumrah'
      })
    });

    render(
      <FanZone 
        userState={mockUser} 
        setUserState={vi.fn()} 
        pollResults={mockPollResults} 
        handleVote={vi.fn()} 
        votedPoll={null} 
        acceptChallenge={vi.fn()} 
      />
    );
    
    expect(screen.getByText('Live Pulse Updates')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('RCB News')).toBeInTheDocument();
    });
  });
});

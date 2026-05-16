import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CricketMiniGame from '../CricketMiniGame';
import React from 'react';

describe('CricketMiniGame', () => {
  it('renders initial state correctly', () => {
    const onGameOver = vi.fn();
    render(<CricketMiniGame onGameOver={onGameOver} />);
    expect(screen.getByText('Power Hitter')).toBeInTheDocument();
    expect(screen.getByText('Start Session')).toBeInTheDocument();
  });

  it('starts the game when button is clicked', () => {
    const onGameOver = vi.fn();
    render(<CricketMiniGame onGameOver={onGameOver} />);
    const startButton = screen.getByText('Start Session');
    fireEvent.click(startButton);
    expect(screen.getByText('Total Score')).toBeInTheDocument();
    expect(screen.getByText('Balls Left')).toBeInTheDocument();
  });
});

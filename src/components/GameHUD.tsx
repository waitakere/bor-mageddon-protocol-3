import React from 'react';
// Assuming you have this service built! If not, we can mock it.
import { scoreService } from '@/game/services/ScoreService'; 

export interface GameHUDProps {
  score: number;
  health: number;
  maxHealth: number;
  level: number;
  wave: number;
}

// Notice the "export const" right here! This fixes the Named Export error.
export const GameHUD: React.FC<GameHUDProps> = ({ score, health, maxHealth, level, wave }) => {
  return (
    <div className="absolute inset-x-0 top-0 pointer-events-none z-40">
      <div className="flex items-start justify-between p-4">
        {/* Left side - Score & Health */}
        <div className="space-y-2">
          <div className="hud-panel">
            <p className="font-pixel text-xs text-muted-foreground mb-1">SCORE</p>
            <p className="score-display">{scoreService ? scoreService.formatScore(score) : score}</p>
          </div>
          
          <div className="hud-panel">
            <p className="font-pixel text-xs text-muted-foreground mb-1">HEALTH</p>
            <div className="flex gap-1">
              {Array.from({ length: maxHealth }).map((_, i) => (
                <span
                  key={i}
                  className={`text-2xl ${i < health ? 'text-primary' : 'text-muted'}`}
                >
                  {i < health ? '❤' : '♡'}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Level & Wave */}
        <div className="hud-panel text-right">
          <p className="font-pixel text-xs text-muted-foreground mb-1">LEVEL</p>
          <p className="font-pixel text-lg text-secondary">{level}</p>
          <p className="font-retro text-muted-foreground mt-1">WAVE {wave}/3</p>
        </div>
      </div>
    </div>
  );
};
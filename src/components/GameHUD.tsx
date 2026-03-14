import React from 'react';
import { scoreService } from '@/game/services/ScoreService'; 

// Notice the "?" marks. This tells TypeScript these values are optional!
export interface GameHUDProps {
  score?: number;
  health?: number;
  maxHealth?: number;
  level?: number;
  wave?: number;
}

// We set default values right here (score = 0, health = 100)
export const GameHUD: React.FC<GameHUDProps> = ({ 
    score = 0, 
    health = 100, 
    maxHealth = 100, 
    level = 1, 
    wave = 1 
}) => {
  return (
    <div className="absolute inset-x-0 top-0 pointer-events-none z-40">
      <div className="flex items-start justify-between p-6">
        
        {/* Left side - Score & Health */}
        <div className="space-y-4">
          <div className="bg-black/80 border-2 border-red-900/50 p-3 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <p className="font-mono text-xs text-red-500 mb-1 tracking-widest font-bold">SCORE</p>
            <p className="font-metal text-3xl text-white drop-shadow-[2px_2px_0px_#ff3333]">
                {scoreService ? scoreService.formatScore(score) : score}
            </p>
          </div>
          
          <div className="bg-black/80 border-2 border-red-900/50 p-3 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <p className="font-mono text-xs text-red-500 mb-1 tracking-widest font-bold">INTEGRITY</p>
            <div className="flex gap-1">
              {/* Converts 100 health into a 10-block retro arcade meter */}
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-2xl ${i < Math.ceil(health / 10) ? 'text-[#ff3333] drop-shadow-[0_0_8px_#ff0000]' : 'text-zinc-800'}`}
                >
                  ■
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Level & Wave */}
        <div className="bg-black/80 border-2 border-red-900/50 p-3 text-right shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <p className="font-mono text-xs text-red-500 mb-1 tracking-widest font-bold">LEVEL</p>
          <p className="font-metal text-3xl text-white drop-shadow-[2px_2px_0px_#ff3333]">{level}</p>
          <p className="font-mono text-red-500 mt-2 tracking-widest text-xs font-bold">WAVE {wave}/3</p>
        </div>
      </div>
    </div>
  );
};
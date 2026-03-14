import React, { useEffect, useState } from 'react';

interface HUDProps {
  // We'll use a custom event listener to sync this with Phaser
}

export const GameHUD: React.FC = () => {
  const [health, setHealth] = useState(100);
  const [smf, setSmf] = useState(0);
  const [score, setScore] = useState(0);
  const [weapon, setWeapon] = useState<{ type: string; durability: number } | null>(null);

  useEffect(() => {
    // Listen for events from Phaser
    const handleUpdateHUD = (e: any) => {
      if (e.detail.health !== undefined) setHealth(e.detail.health);
      if (e.detail.smf !== undefined) setSmf(e.detail.smf);
      if (e.detail.score !== undefined) setScore(e.detail.score);
      if (e.detail.weapon !== undefined) setWeapon(e.detail.weapon);
    };

    window.addEventListener('update-phaser-hud', handleUpdateHUD);
    return () => window.removeEventListener('update-phaser-hud', handleUpdateHUD);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none p-6 font-mono text-white z-50">
      {/* Top Left: Score & Integrity */}
      <div className="flex flex-col gap-4">
        <div className="bg-black/80 border-2 border-red-900 p-4 w-48 shadow-[4px_4px_0px_#660000]">
          <div className="text-[10px] text-red-500 font-bold tracking-widest mb-1">SCORE</div>
          <div className="text-3xl font-bold italic">{score.toString().padStart(6, '0')}</div>
        </div>

        <div className="bg-black/80 border-2 border-red-900 p-4 w-64 shadow-[4px_4px_0px_#660000]">
          <div className="text-[10px] text-red-500 font-bold tracking-widest mb-2">INTEGRITY</div>
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div 
                key={i} 
                className={`h-4 w-full transition-all duration-300 ${i < health / 10 ? 'bg-red-600 shadow-[0_0_10px_#ff0000]' : 'bg-zinc-900'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* NEW: Weapon Slot (Appears only when holding a weapon) */}
      {weapon && weapon.durability > 0 && (
        <div className="absolute bottom-10 left-6 animate-in fade-in slide-in-from-left-5">
           <div className="bg-black/90 border-2 border-[#b87333] p-3 flex items-center gap-4 shadow-[4px_4px_0px_#442200]">
              <div className="flex flex-col">
                <div className="text-[9px] text-[#b87333] font-bold">EQUIPPED_WPN</div>
                <div className="text-lg font-bold uppercase text-white">{weapon.type.replace('-', ' ')}</div>
              </div>
              <div className="h-10 w-[2px] bg-[#b87333]/30" />
              <div className="flex flex-col items-center">
                <div className="text-[9px] text-[#b87333] font-bold">USES</div>
                <div className="text-2xl font-bold text-[#ff9900]">{weapon.durability}</div>
              </div>
           </div>
        </div>
      )}

      {/* Top Right: Level Info */}
      <div className="absolute top-6 right-6 text-right">
        <div className="bg-black/80 border-2 border-red-900 p-4 shadow-[4px_4px_0px_#660000]">
          <div className="text-[10px] text-red-500 font-bold tracking-widest">LEVEL</div>
          <div className="text-4xl font-bold">1</div>
          <div className="text-[10px] text-zinc-500 mt-2 font-bold">WAVE 1/3</div>
        </div>
      </div>
    </div>
  );
};
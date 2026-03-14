import React, { useEffect, useState } from 'react';

export const GameHUD: React.FC = () => {
  const [health, setHealth] = useState(100);
  const [smf, setSmf] = useState(0);
  const [score, setScore] = useState(0);
  const [showGo, setShowGo] = useState(false);
  const [weapon, setWeapon] = useState<{ type: string; durability: number } | null>(null);

  useEffect(() => {
    // Listen for custom events from the Phaser MainLevel scene
    const handleUpdateHUD = (e: any) => {
      if (e.detail.health !== undefined) setHealth(e.detail.health);
      if (e.detail.smf !== undefined) setSmf(e.detail.smf);
      if (e.detail.score !== undefined) setScore(e.detail.score);
      if (e.detail.weapon !== undefined) setWeapon(e.detail.weapon);
      if (e.detail.showGo !== undefined) setShowGo(e.detail.showGo);
    };

    window.addEventListener('update-phaser-hud', handleUpdateHUD);
    return () => window.removeEventListener('update-phaser-hud', handleUpdateHUD);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none p-6 font-mono text-white z-50 select-none">
      
      {/* --- TOP LEFT: STATUS PANEL --- */}
      <div className="flex flex-col gap-4">
        {/* SCORE BOX */}
        <div className="bg-black/80 border-2 border-red-900 p-4 w-48 shadow-[4px_4px_0px_#660000]">
          <div className="text-[10px] text-red-500 font-bold tracking-widest mb-1">SCORE</div>
          <div className="text-3xl font-bold italic tabular-nums">{score.toString().padStart(6, '0')}</div>
        </div>

        {/* BARS BOX (Health & Special) */}
        <div className="bg-black/80 border-2 border-red-900 p-4 w-72 shadow-[4px_4px_0px_#660000]">
          {/* INTEGRITY / HEALTH */}
          <div className="text-[10px] text-red-500 font-bold tracking-widest mb-2 flex justify-between">
            <span>INTEGRITY</span>
            <span>{health}%</span>
          </div>
          <div className="flex gap-1 mb-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div 
                key={i} 
                className={`h-4 w-full transition-all duration-300 ${i < health / 10 ? 'bg-red-600 shadow-[0_0_10px_#ff0000]' : 'bg-zinc-900'}`}
              />
            ))}
          </div>

          {/* SMF / SPECIAL METER */}
          <div className="text-[10px] text-cyan-500 font-bold tracking-widest mb-1 flex justify-between">
            <span>SMF METER</span>
            <span className={smf >= 100 ? "animate-pulse" : ""}>{smf >= 100 ? "READY" : `${smf}%`}</span>
          </div>
          <div className="h-2 w-full bg-zinc-900 border border-cyan-900 overflow-hidden">
             <div 
               className="h-full bg-cyan-500 transition-all duration-500 shadow-[0_0_8px_#06b6d4]"
               style={{ width: `${smf}%` }}
             />
          </div>
        </div>
      </div>

      {/* --- CENTER RIGHT: CLASSIC "GO!" ARROW --- */}
      {showGo && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="bg-yellow-500 text-black font-black text-5xl px-8 py-2 italic tracking-tighter shadow-[6px_6px_0px_#000] border-4 border-black animate-pulse">
                GO!
            </div>
            <div className="text-yellow-500 text-8xl mt-4 drop-shadow-[6px_6px_0px_#000] animate-bounce">
                ➔
            </div>
        </div>
      )}

      {/* --- BOTTOM LEFT: WEAPON STATUS --- */}
      {weapon && weapon.durability > 0 && (
        <div className="absolute bottom-10 left-6">
           <div className="bg-black/95 border-2 border-[#b87333] p-3 flex items-center gap-4 shadow-[4px_4px_0px_#442200]">
              <div className="flex flex-col">
                <div className="text-[9px] text-[#b87333] font-bold tracking-tighter">EQUIPPED_WPN</div>
                <div className="text-xl font-bold uppercase text-white italic">{weapon.type.replace('-', ' ')}</div>
              </div>
              <div className="h-10 w-[2px] bg-[#b87333]/40" />
              <div className="flex flex-col items-center">
                <div className="text-[9px] text-[#b87333] font-bold">USES</div>
                <div className={`text-3xl font-bold ${weapon.durability === 1 ? 'text-red-500 animate-pulse' : 'text-[#ff9900]'}`}>
                    {weapon.durability === 1 ? "THROW!" : weapon.durability}
                </div>
              </div>
           </div>
        </div>
      )}

      {/* --- TOP RIGHT: LEVEL INFO --- */}
      <div className="absolute top-6 right-6 text-right">
        <div className="bg-black/80 border-2 border-red-900 p-4 shadow-[4px_4px_0px_#660000]">
          <div className="text-[10px] text-red-500 font-bold tracking-widest">LEVEL</div>
          <div className="text-4xl font-bold">1</div>
          <div className="text-[10px] text-zinc-500 mt-2 font-bold tracking-widest">STREETS OF BOR</div>
        </div>
      </div>
    </div>
  );
};
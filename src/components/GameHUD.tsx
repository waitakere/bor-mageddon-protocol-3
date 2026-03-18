import React, { useEffect, useState } from 'react';

export const GameHUD: React.FC = () => {
  const [health, setHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [smf, setSmf] = useState(0);
  const [score, setScore] = useState(0);
  
  const [playerName, setPlayerName] = useState('marko');
  const [playerFlash, setPlayerFlash] = useState(false);

  const [enemyName, setEnemyName] = useState<string | null>(null);
  const [enemyHealth, setEnemyHealth] = useState(0);
  const [enemyMaxHealth, setEnemyMaxHealth] = useState(100);
  const [enemyFlash, setEnemyFlash] = useState(false);

  useEffect(() => {
    const handleHUDUpdate = (e: any) => {
      const data = e.detail;
      if (data.health !== undefined) setHealth(data.health);
      if (data.maxHealth !== undefined) setMaxHealth(data.maxHealth);
      if (data.smf !== undefined) setSmf(data.smf);
      if (data.score !== undefined) setScore(data.score);
      if (data.playerName !== undefined) setPlayerName(data.playerName);
      
      setEnemyName(data.enemyName);
      setEnemyHealth(data.enemyHealth || 0);
      setEnemyMaxHealth(data.enemyMaxHealth || 100);

      // Trigger Red Flashes based on timestamps sent from Phaser
      if (data.playerHitStamp && data.playerHitStamp !== (window as any)._lastPlayerHit) {
        (window as any)._lastPlayerHit = data.playerHitStamp;
        setPlayerFlash(true);
        setTimeout(() => setPlayerFlash(false), 150);
      }

      if (data.enemyHitStamp && data.enemyHitStamp !== (window as any)._lastEnemyHit) {
        (window as any)._lastEnemyHit = data.enemyHitStamp;
        setEnemyFlash(true);
        setTimeout(() => setEnemyFlash(false), 150);
      }
    };

    window.addEventListener('update-phaser-hud', handleHUDUpdate);
    return () => window.removeEventListener('update-phaser-hud', handleHUDUpdate);
  }, []);

  const healthPct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const enemyHealthPct = Math.max(0, Math.min(100, (enemyHealth / enemyMaxHealth) * 100));

  return (
    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-40 pointer-events-none select-none">
      
      {/* LEFT: PLAYER STATS */}
      <div className="flex gap-4 items-start w-[35%]">
        {/* Portrait Box */}
        <div className="relative border-4 border-zinc-500 bg-zinc-900 w-24 h-24 overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
          <img 
            src={`assets/images/portraits/${playerName}.png`} 
            alt={playerName} 
            className="w-full h-full object-cover object-top pixelated"
            onError={(e) => (e.currentTarget.src = 'assets/images/portraits/marko.png')} // Fallback
          />
          {/* Red Flash Overlay */}
          <div className={`absolute inset-0 bg-red-600 mix-blend-overlay transition-opacity duration-75 ${playerFlash ? 'opacity-80' : 'opacity-0'}`} />
        </div>

        {/* Bars */}
        <div className="flex flex-col flex-grow mt-1 gap-2">
          <h2 className="text-white font-mono text-xl font-bold uppercase tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,1)] m-0 leading-none">
            {playerName}
          </h2>
          
          {/* 16-bit segmented style Health Bar */}
          <div className="h-6 w-full border-2 border-white bg-black p-[2px] shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
            <div 
              className="h-full bg-gradient-to-b from-yellow-300 to-yellow-600 transition-all duration-200" 
              style={{ width: `${healthPct}%` }} 
            />
          </div>

          {/* SMF Bar */}
          <div className="h-3 w-3/4 border-2 border-blue-400 bg-black p-[1px] mt-1 shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
            <div 
              className="h-full bg-gradient-to-b from-cyan-300 to-cyan-500 transition-all duration-300" 
              style={{ width: `${smf}%` }} 
            />
          </div>
        </div>
      </div>

      {/* CENTER: SCORE */}
      <div className="flex flex-col items-center mt-2 w-[30%]">
        <h3 className="text-yellow-400 font-mono text-sm font-bold m-0 tracking-[4px] drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
          SCORE
        </h3>
        <div className="text-white font-mono text-4xl font-bold tracking-widest drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
          {score.toString().padStart(6, '0')}
        </div>
      </div>

      {/* RIGHT: ENEMY STATS (Only shows when engaged) */}
      <div className="flex gap-4 items-start justify-end w-[35%] transition-opacity duration-300" style={{ opacity: enemyName ? 1 : 0 }}>
        
        {/* Enemy Bars (Mirrored) */}
        <div className="flex flex-col flex-grow mt-1 gap-2 items-end">
          <h2 className="text-white font-mono text-xl font-bold uppercase tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,1)] m-0 leading-none text-right">
            {enemyName || 'ENEMY'}
          </h2>
          
          <div className="h-6 w-full border-2 border-white bg-black p-[2px] shadow-[4px_4px_0_rgba(0,0,0,0.5)] flex justify-end">
            <div 
              className="h-full bg-gradient-to-b from-red-400 to-red-700 transition-all duration-100" 
              style={{ width: `${enemyHealthPct}%` }} 
            />
          </div>
        </div>

        {/* Enemy Portrait Box */}
        <div className="relative border-4 border-zinc-500 bg-zinc-900 w-24 h-24 overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
          {enemyName && (
            <img 
              src={`assets/images/portraits/${enemyName}.png`} 
              alt={enemyName} 
              className="w-full h-full object-cover object-top pixelated"
              onError={(e) => (e.currentTarget.src = 'assets/images/portraits/mup.png')} // Fallback
            />
          )}
          {/* Enemy Red Flash Overlay */}
          <div className={`absolute inset-0 bg-red-500 mix-blend-overlay transition-opacity duration-75 ${enemyFlash ? 'opacity-80' : 'opacity-0'}`} />
        </div>
      </div>

    </div>
  );
};
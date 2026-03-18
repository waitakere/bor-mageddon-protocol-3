import React, { useEffect, useState, useRef } from 'react';

export const GameHUD: React.FC = () => {
  // Player Stats
  const [health, setHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [smf, setSmf] = useState(0);
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState('marko');
  const [playerFlash, setPlayerFlash] = useState(false);

  // Enemy Stats
  const [enemyName, setEnemyName] = useState<string | null>(null);
  const [enemyHealth, setEnemyHealth] = useState(0);
  const [enemyMaxHealth, setEnemyMaxHealth] = useState(100);
  const [enemyFlash, setEnemyFlash] = useState(false);

  // Refs for timeouts to prevent memory leaks
  const playerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const enemyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleHUDUpdate = (e: any) => {
      const data = e.detail;
      
      // Update Core Stats
      if (data.health !== undefined) setHealth(data.health);
      if (data.maxHealth !== undefined) setMaxHealth(data.maxHealth);
      if (data.smf !== undefined) setSmf(data.smf);
      if (data.score !== undefined) setScore(data.score);
      if (data.playerName !== undefined) setPlayerName(data.playerName);
      
      setEnemyName(data.enemyName);
      setEnemyHealth(data.enemyHealth || 0);
      setEnemyMaxHealth(data.enemyMaxHealth || 100);

      // Trigger Player Red Flash
      if (data.playerHitStamp && data.playerHitStamp !== (window as any)._lastPlayerHit) {
        (window as any)._lastPlayerHit = data.playerHitStamp;
        setPlayerFlash(true);
        if (playerTimeoutRef.current) clearTimeout(playerTimeoutRef.current);
        playerTimeoutRef.current = setTimeout(() => setPlayerFlash(false), 150);
      }

      // Trigger Enemy Red Flash
      if (data.enemyHitStamp && data.enemyHitStamp !== (window as any)._lastEnemyHit) {
        (window as any)._lastEnemyHit = data.enemyHitStamp;
        setEnemyFlash(true);
        if (enemyTimeoutRef.current) clearTimeout(enemyTimeoutRef.current);
        enemyTimeoutRef.current = setTimeout(() => setEnemyFlash(false), 150);
      }
    };

    window.addEventListener('update-phaser-hud', handleHUDUpdate);
    return () => window.removeEventListener('update-phaser-hud', handleHUDUpdate);
  }, []);

  const healthPct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const enemyHealthPct = Math.max(0, Math.min(100, (enemyHealth / enemyMaxHealth) * 100));

  return (
    <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-40 pointer-events-none select-none">
      
      {/* ========================================= */}
      {/* LEFT SIDE: PLAYER STATS                   */}
      {/* ========================================= */}
      <div className="flex gap-4 items-start w-[35%]">
        {/* Portrait Box */}
        <div className="relative border-[4px] border-zinc-400 bg-zinc-800 w-24 h-24 overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.8)] shrink-0">
          <img 
            src={`assets/images/portraits/${playerName}.png`} 
            alt={playerName} 
            className="w-full h-full object-cover object-top"
            style={{ imageRendering: 'pixelated' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }} // Hides broken image icon if missing
          />
          {/* Red Flash Overlay */}
          <div className={`absolute inset-0 bg-red-600 mix-blend-overlay transition-opacity duration-75 ${playerFlash ? 'opacity-90' : 'opacity-0'}`} />
        </div>

        {/* Status Bars */}
        <div className="flex flex-col flex-grow gap-1 mt-1">
          <h2 className="text-white font-mono text-xl font-bold uppercase tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,1)] m-0 leading-none">
            {playerName}
          </h2>
          
          {/* Health Bar (Yellow) */}
          <div className="h-6 w-full border-[3px] border-zinc-300 bg-black p-[2px] shadow-[4px_4px_0_rgba(0,0,0,0.8)]">
            <div 
              className="h-full bg-[#fde047] transition-all duration-200" 
              style={{ width: `${healthPct}%` }} 
            />
          </div>

          {/* SMF Bar (Blue) */}
          <div className="h-3 w-3/4 border-2 border-blue-400 bg-black p-[1px] mt-1 shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
            <div 
              className="h-full bg-[#38bdf8] transition-all duration-300" 
              style={{ width: `${smf}%` }} 
            />
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* CENTER: SCORE                             */}
      {/* ========================================= */}
      <div className="flex flex-col items-center mt-2 w-[20%]">
        <h3 className="text-[#fde047] font-mono text-sm font-bold m-0 tracking-[4px] drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
          SCORE
        </h3>
        <div className="text-white font-mono text-4xl font-bold tracking-widest drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
          {score.toString().padStart(6, '0')}
        </div>
      </div>

      {/* ========================================= */}
      {/* RIGHT SIDE: ENEMY STATS                   */}
      {/* ========================================= */}
      <div className={`flex gap-4 items-start justify-end w-[35%] transition-opacity duration-300 ${enemyName ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Enemy Bars (Mirrored Layout) */}
        <div className="flex flex-col flex-grow gap-1 mt-1 items-end">
          <h2 className="text-white font-mono text-xl font-bold uppercase tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,1)] m-0 leading-none text-right">
            {enemyName || 'ENEMY'}
          </h2>
          
          {/* Enemy Health Bar (Red) */}
          <div className="h-6 w-full border-[3px] border-zinc-300 bg-black p-[2px] shadow-[4px_4px_0_rgba(0,0,0,0.8)] flex justify-end">
            <div 
              className="h-full bg-[#ef4444] transition-all duration-100" 
              style={{ width: `${enemyHealthPct}%` }} 
            />
          </div>
        </div>

        {/* Enemy Portrait Box */}
        <div className="relative border-[4px] border-zinc-400 bg-zinc-800 w-24 h-24 overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.8)] shrink-0">
          {enemyName && (
            <img 
              src={`assets/images/portraits/${enemyName}.png`} 
              alt={enemyName} 
              className="w-full h-full object-cover object-top"
              style={{ imageRendering: 'pixelated' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          {/* Enemy Red Flash Overlay */}
          <div className={`absolute inset-0 bg-red-600 mix-blend-overlay transition-opacity duration-75 ${enemyFlash ? 'opacity-90' : 'opacity-0'}`} />
        </div>
      </div>

    </div>
  );
};
import React, { useEffect, useState } from 'react';
import Phaser from 'phaser'; // Import needed for Scene status enums

export const PauseMenu: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Listen for 'P' or 'p'
      if (e.key.toLowerCase() === 'p') {
        const game = (window as any).phaserGame;
        
        if (!game) {
          console.error("[PAUSE SYSTEM] Error: window.phaserGame is undefined. Make sure GameContainer sets it!");
          return;
        }

        // Safely check strict scene status to prevent "Cannot pause non-running Scene" errors
        const status = game.scene.getStatus('MainLevel');
        
        if (status === Phaser.Scenes.RUNNING) {
            game.scene.pause('MainLevel');
            setIsPaused(true);
        } else if (status === Phaser.Scenes.PAUSED) {
            game.scene.resume('MainLevel');
            setIsPaused(false);
        }
      }
    };

    // Attach to window capture phase so it fires BEFORE Phaser can swallow it
    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const handleResume = () => {
      const game = (window as any).phaserGame;
      if (game) {
          game.scene.resume('MainLevel');
          setIsPaused(false);
      }
  };

  if (!isPaused) return null;

  return (
    <div 
        id="pause-overlay" 
        className="fixed inset-0 z- bg-black/85 backdrop-blur-sm flex justify-center items-center"
    >
      <div className="text-center border-[4px] border-double border-[#ff3333] p-[60px] bg-[#1a0a05] shadow-[0_0_50px_rgba(255,51,51,0.2)]">
        
        <h1 className="font-metal text-[clamp(60px,8vw,120px)] text-white drop-shadow-[6px_6px_0px_#ff3333] m-0 mb-[15px] tracking-[4px]">
          PAUSED
        </h1>
        
        <div className="font-mono text-[#ff3333] text-[24px] tracking-[8px] mb-[40px]">
          [SYSTEM_STANDBY]
        </div>
        
        <button 
            onClick={handleResume} 
            className="bg-[#ff3333] text-black border-none py-[20px] px-[40px] cursor-pointer shadow-[8px_8px_0px_#660000] text-[24px] font-mono font-bold hover:bg-white hover:shadow-[8px_8px_0px_#ff3333] transition-all"
        >
          RESUME PROTOCOL
        </button>
        
        <p className="text-[#00ff00] mt-[30px] animate-pulse text-[12px] font-mono tracking-widest">
          CLICK BUTTON OR PRESS 'P' TO UNPAUSE...
        </p>

      </div>
    </div>
  );
};
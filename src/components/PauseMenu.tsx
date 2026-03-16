import React, { useEffect, useState } from 'react';

export const PauseMenu: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Listen for 'P' or 'p'
      if (e.key.toLowerCase() === 'p') {
        const game = (window as any).phaserGame;
        if (!game) return;

        // Only allow pausing if MainLevel is currently active or already paused
        if (game.scene.isActive('MainLevel')) {
            game.scene.pause('MainLevel');
            setIsPaused(true);
        } else if (game.scene.isPaused('MainLevel')) {
            game.scene.resume('MainLevel');
            setIsPaused(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResume = () => {
      const game = (window as any).phaserGame;
      if (game && game.scene.isPaused('MainLevel')) {
          game.scene.resume('MainLevel');
          setIsPaused(false);
      }
  };

  if (!isPaused) return null;

  return (
    <div 
        id="pause-overlay" 
        style={{ 
            position: 'fixed', inset: 0, zIndex: 4000, 
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center' 
        }}
    >
      <div className="start-box" style={{ textAlign: 'center', border: '4px double #ff3333', padding: '60px', background: '#1a0a05', boxShadow: '0 0 50px rgba(255, 51, 51, 0.2)' }}>
        
        <h1 className="font-metal" style={{ fontFamily: "'Metal Mania', cursive", fontSize: 'clamp(60px, 8vw, 120px)', color: '#fff', textShadow: '6px 6px 0px #ff3333', margin: '0 0 15px 0', letterSpacing: '4px' }}>
          PAUSED
        </h1>
        
        <div className="font-mono-title" style={{ fontFamily: "'Space Mono', monospace", color: '#ff3333', fontSize: '24px', letterSpacing: '8px', marginBottom: '40px' }}>
          [SYSTEM_STANDBY]
        </div>
        
        <button 
            id="initialize-btn" 
            onClick={handleResume} 
            style={{ background: '#ff3333', color: '#000', border: 'none', padding: '20px 40px', cursor: 'pointer', boxShadow: '8px 8px 0px #660000', fontSize: '24px', fontFamily: "'Space Mono', monospace", fontWeight: 'bold' }}
        >
          RESUME PROTOCOL
        </button>
        
        <p style={{ color: '#00ff00', marginTop: '30px', animation: 'pulse 2s infinite', fontSize: '12px', fontFamily: "'Space Mono', monospace" }}>
          CLICK BUTTON OR PRESS 'P' TO UNPAUSE...
        </p>

      </div>
    </div>
  );
};
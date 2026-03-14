import React, { useState, useEffect } from 'react';
import { CharacterSelector } from './components/CharacterSelector';
import { GameContainer } from './components/GameContainer';
import { SettingsMenu, ControlsHUD } from './components/SettingsMenu';
import { WorldMap } from './components/WorldMap';
import { GameHUD } from './components/GameHUD';

export default function App() {
  // --- Core Game Flow State ---
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING'>('MENU');
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  
  // --- UI Overlays & Polish State ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);

  // --- 1993 Particle State ---
  const [particles, setParticles] = useState<{ id: number; left: string; delay: string; duration: string; size: string }[]>([]);

  useEffect(() => {
      // Generate 30 random upward-falling red particles for the menu
      const newParticles = Array.from({ length: 30 }).map((_, i) => ({
          id: i,
          left: `${Math.random() * 100}vw`,
          delay: `${Math.random() * 5}s`,
          duration: `${4 + Math.random() * 6}s`,
          size: `${2 + Math.random() * 4}px`
      }));
      setParticles(newParticles);
  }, []);

  const handleCharacterSelect = (character: string) => {
    setSelectedCharacter(character);
    setGameState('PLAYING');
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      
      {/* --- RED EMBERS (Only show on Menu) --- */}
      {gameState === 'MENU' && particles.map(p => (
          <div 
              key={p.id} 
              className="particle"
              style={{
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                  width: p.size,
                  height: p.size
              }}
          />
      ))}

      {/* Top Right Navigation UI */}
      <div className="absolute top-4 right-4 z-50 flex gap-3">
        {gameState === 'PLAYING' && (
          <button 
            onClick={() => setIsMapOpen(true)}
            className="text-[#b87333] font-mono text-xs border border-[#b87333] px-3 py-1 bg-black/80 hover:bg-[#b87333] hover:text-black transition-colors uppercase tracking-widest"
          >
            [OPERATIVNA MAPA]
          </button>
        )}
        
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="text-white font-mono text-xs border border-zinc-600 px-3 py-1 bg-black/80 hover:bg-white hover:text-black transition-colors uppercase tracking-widest"
        >
          [SETTINGS]
        </button>
      </div>

      {/* --- MAIN GAME STATE ROUTING --- */}
      {gameState === 'MENU' && (
        <CharacterSelector onSelect={handleCharacterSelect} />
      )}
      
      {gameState === 'PLAYING' && selectedCharacter && (
        <div className="absolute inset-0 z-0">
           <GameContainer selectedCharacter={selectedCharacter} />
        </div>
      )}

      {/* --- HUD & OVERLAYS --- */}
      
      {/* Permanent Controls Reminder */}
      {gameState === 'PLAYING' && <ControlsHUD />}

      {/* Modern React Game HUD */}
      {gameState === 'PLAYING' && <GameHUD />}

      {/* Settings Modal */}
      <SettingsMenu 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        crtEnabled={crtEnabled}
        onCrtToggle={setCrtEnabled}
        volume={volume}
        onVolumeChange={setVolume}
      />

      {/* World Map / Level Selector Modal */}
      {isMapOpen && (
        <WorldMap onClose={() => setIsMapOpen(false)} />
      )}

      {/* 1993 CRT Scanline & Phosphor Overlay */}
      {crtEnabled && (
        <div 
          className="pointer-events-none absolute inset-0 z-40 mix-blend-overlay opacity-30"
          style={{
            background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 118, 0.06))",
            backgroundSize: "100% 2px, 3px 100%"
          }}
        />
      )}
    </div>
  );
}
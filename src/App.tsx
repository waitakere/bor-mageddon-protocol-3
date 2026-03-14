import React, { useState, useEffect } from 'react';
import { CharacterSelector } from './components/CharacterSelector';
import { GameContainer } from './components/GameContainer';
import { SettingsMenu, ControlsHUD } from './components/SettingsMenu';
import { WorldMap } from './components/WorldMap';
import { GameHUD } from './components/GameHUD';

export default function App() {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING'>('MENU');
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [particles, setParticles] = useState<{ id: number; left: string; delay: string; duration: string; size: string }[]>([]);

  // Generate background particles for the Character Selection menu
  useEffect(() => {
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
    
    // Safety: Ensure all HTML5 audio elements from the menu are paused
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        try { audio.pause(); } catch(e) {}
    });
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      
      {/* Menu Background Particles */}
      {gameState === 'MENU' && particles.map(p => (
          <div key={p.id} className="particle absolute bg-red-600 rounded-full opacity-20 pointer-events-none"
              style={{ 
                left: p.left, 
                bottom: '-20px',
                animation: `floatUp ${p.duration} linear infinite`,
                animationDelay: p.delay,
                width: p.size, 
                height: p.size 
              }}
          />
      ))}

      {/* UI OVERLAP FIX: 
          Shifted this container to top-40 so it sits below the Level/Wave HUD 
      */}
      <div className="absolute top-40 right-4 z-50 flex flex-col gap-3 items-end">
        {gameState === 'PLAYING' && (
          <button 
            onClick={() => setIsMapOpen(true)}
            className="text-[#b87333] font-mono text-xs border border-[#b87333] px-3 py-1 bg-black/80 hover:bg-[#b87333] hover:text-black transition-colors uppercase tracking-widest pointer-events-auto"
          >
            [OPERATIVNA MAPA]
          </button>
        )}
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="text-white font-mono text-xs border border-zinc-600 px-3 py-1 bg-black/80 hover:bg-white hover:text-black transition-colors uppercase tracking-widest pointer-events-auto"
        >
          [SETTINGS]
        </button>
      </div>

      {/* Main Game States */}
      {gameState === 'MENU' && (
        <CharacterSelector onSelect={handleCharacterSelect} />
      )}
      
      {gameState === 'PLAYING' && selectedCharacter && (
        <div className="absolute inset-0 z-0">
           <GameContainer selectedCharacter={selectedCharacter} />
        </div>
      )}

      {/* Overlays & HUDs */}
      {gameState === 'PLAYING' && <ControlsHUD />}
      {gameState === 'PLAYING' && <GameHUD />}

      <SettingsMenu 
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} 
        crtEnabled={crtEnabled} onCrtToggle={setCrtEnabled}
        volume={volume} onVolumeChange={setVolume}
      />

      {isMapOpen && (
        <WorldMap onClose={() => setIsMapOpen(false)} />
      )}

      {/* Global CRT Post-Processing Filter */}
      {crtEnabled && (
        <div 
          className="pointer-events-none absolute inset-0 z-[100] mix-blend-overlay opacity-30"
          style={{
            background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 118, 0.06))",
            backgroundSize: "100% 2px, 3px 100%"
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 0.4; }
          100% { transform: translateY(-110vh); opacity: 0; }
        }
      `}} />
    </div>
  );
}
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameConfig } from '../game/main';

interface GameContainerProps {
  selectedCharacter: string;
}

export const GameContainer: React.FC<GameContainerProps> = ({ selectedCharacter }) => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // 1. Initialize the Phaser Game Engine
    // We target the 'game-container' div for injection
    const config: Phaser.Types.Core.GameConfig = {
      ...GameConfig,
      parent: 'game-container', 
    };

    // Create the game instance
    const game = new Phaser.Game(config);
    gameRef.current = game;

    // --- CRITICAL FIX: EXPORT ENGINE TO WINDOW ---
    // This allows React (PauseMenu, SettingsMenu) to pause/resume and change volume!
    (window as any).phaserGame = game;

    // 2. Cleanup on unmount
    // This is critical to prevent multiple canvases spawning when you go back to the menu
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        (window as any).phaserGame = undefined; // Clean up global reference
      }
    };
  }, []); // Only runs once on mount

  return (
    /**
     * The data-selected-character attribute is used by BootScene.ts 
     * to determine which character to spawn in the registry.
     * * The id="game-container" is where Phaser injects the canvas.
     */
    <div 
        id="game-container" 
        data-selected-character={selectedCharacter}
        className="w-full h-full bg-[#050505] overflow-hidden flex items-center justify-center" 
    />
  );
};
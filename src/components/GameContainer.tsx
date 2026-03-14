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
    // We add the 'parent' property here, matching the ID of the div below!
    const config: Phaser.Types.Core.GameConfig = {
      ...GameConfig,
      parent: 'game-container', 
    };

    gameRef.current = new Phaser.Game(config);

    // 2. Pass the selected character to the game scene
    // We delay this slightly to ensure the engine has booted
    setTimeout(() => {
        if (gameRef.current) {
            // Find the active scene and pass the character ID
            const activeScene = gameRef.current.scene.getScene('MainLevel');
            if (activeScene) {
                // (Optional: You can use this later to spawn Maja instead of Marko!)
                activeScene.registry.set('selectedCharacter', selectedCharacter);
            }
        }
    }, 500);

    // 3. Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [selectedCharacter]);

  return (
    // The id="game-container" is CRITICAL. It is exactly where Phaser will inject the canvas!
    <div 
        id="game-container" 
        className="w-full h-full bg-[#050505] overflow-hidden" 
    />
  );
};
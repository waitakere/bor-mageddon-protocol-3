import Phaser from 'phaser';

/**
 * BootScene: The System Initialisation Phase.
 * Preloads all heavy assets (audio, spritesheets, backgrounds) into memory 
 * before the MainLevel mounts, preventing cache-miss crashes.
 */
export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // 1. Initialise the retro loading UI
        this.createLoadingBar();

        // ==========================================
        // 2. PRELOAD AUDIO (Fixes the crash)
        // ==========================================
        this.load.audio('1993_ambient', '/assets/audio/bgm/bor_streets_93.mp3');
        
        // Assuming you have generated your audio sprite for the SFX:
        // this.load.audioSprite('sfx_atlas', '/assets/audio/sfx_atlas.json', ['/assets/audio/sfx_atlas.mp3']);

        // ==========================================
        // 3. PRELOAD SPRITES (Fixes the ERR_FAILED)
        // ==========================================
        // Note: Assuming your pixel art is 256x256 based on the PRD specs.
        this.load.spritesheet('marko', '/assets/sprites/marko.png', { frameWidth: 256, frameHeight: 256 });
        this.load.spritesheet('darko', '/assets/sprites/darko.png', { frameWidth: 256, frameHeight: 256 });
        this.load.spritesheet('maja', '/assets/sprites/maja.png', { frameWidth: 256, frameHeight: 256 });
        this.load.spritesheet('enemies_1993', '/assets/sprites/enemies_1993.png', { frameWidth: 256, frameHeight: 256 });

        // ==========================================
        // 4. PRELOAD BACKGROUNDS & VFX
        // ==========================================
        this.load.image('part1_sky', '/assets/backgrounds/1993/part1_sky.png');
        this.load.image('part1_mid', '/assets/backgrounds/1993/part1_mid.png');
        this.load.image('part1_floor', '/assets/backgrounds/1993/part1_floor.png');
        this.load.image('explosion_01', '/assets/vfx/explosion_01.png');

        // Preload the drops from your MainLevel.ts dropItem() method
        this.load.image('item-burek', '/assets/items/item-burek.png');
        this.load.image('item-coffee', '/assets/items/item-coffee.png');
        this.load.image('item-pork', '/assets/items/item-pork.png');
        this.load.image('item-beer', '/assets/items/item-beer.png');
        this.load.image('item-sandwich', '/assets/items/item-sandwich.png');
    }

    create() {
        // Broadcast to your React layer that the engine is fully primed
        window.dispatchEvent(new CustomEvent('phaser-ready'));
        
        // Transition cleanly to the Main Level now that the cache is full
        this.scene.start('MainLevel');
    }

    /**
     * Builds a brutalist, 1993-era loading bar.
     */
    private createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        
        // Dark grey background box
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.add.text(width / 2, height / 2 - 50, 'UČITAVANJE ARHIVE...', {
            font: '20px monospace',
            color: '#39ff14' // SMF Radioactive Green
        }).setOrigin(0.5);

        const percentText = this.add.text(width / 2, height / 2, '0%', {
            font: '18px monospace',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Update the bar as assets stream in
        this.load.on('progress', (value: number) => {
            percentText.setText(`${Math.floor(value * 100)}%`);
            progressBar.clear();
            progressBar.fillStyle(0x39ff14, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        // Clean up the memory once complete
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });
    }
}
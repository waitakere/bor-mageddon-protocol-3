import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        this.createLoadingBar();

        // ==========================================
        // 1. PRELOAD AUDIO (No leading slashes!)
        // ==========================================
        // Assumes you placed the MP3 directly in the audio folder
        this.load.audio('1993_ambient', 'assets/audio/bor_streets_93.mp3');
        
        // If you have your SFX atlas ready, uncomment this:
        // this.load.audioSprite('sfx_atlas', 'assets/audio/sfx_atlas.json', ['assets/audio/sfx_atlas.mp3']);

        // ==========================================
        // 2. PRELOAD SPRITES (Using Atlas, not Spritesheet) 
        // ==========================================
        this.load.atlas('marko', 'assets/sprites/marko.png', 'assets/sprites/marko.json');
        this.load.atlas('darko', 'assets/sprites/darko.png', 'assets/sprites/darko.json');
        this.load.atlas('maja', 'assets/sprites/maja.png', 'assets/sprites/maja.json');
        this.load.atlas('enemies_1993', 'assets/sprites/enemies_1993.png', 'assets/sprites/enemies_1993.json');

        // ==========================================
        // 3. PRELOAD BACKGROUNDS & VFX
        // ==========================================
        // Mapped to your "assets/images/environments/" folder
        this.load.image('part1_sky', 'assets/images/environments/part1_sky.png');
        this.load.image('part1_mid', 'assets/images/environments/part1_mid.png');
        this.load.image('part1_floor', 'assets/images/environments/part1_floor.png');
        
        // Mapped to your "assets/fx/" or "assets/images/" folder (adjust if needed)
        this.load.image('explosion_01', 'assets/fx/explosion_01.png');

        // Mapped to your items (guessing they are in environments or a missing items folder)
        // UPDATE THESE PATHS IF YOUR ITEMS ARE ELSEWHERE
        this.load.image('item-burek', 'assets/images/environments/item-burek.png');
        this.load.image('item-coffee', 'assets/images/environments/item-coffee.png');
        this.load.image('item-pork', 'assets/images/environments/item-pork.png');
        this.load.image('item-beer', 'assets/images/environments/item-beer.png');
        this.load.image('item-sandwich', 'assets/images/environments/item-sandwich.png');
    }

    create() {
        window.dispatchEvent(new CustomEvent('phaser-ready'));
        this.scene.start('MainLevel');
    }

    private createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.add.text(width / 2, height / 2 - 50, 'UČITAVANJE ARHIVE...', {
            font: '20px monospace',
            color: '#39ff14' 
        }).setOrigin(0.5);

        const percentText = this.add.text(width / 2, height / 2, '0%', {
            font: '18px monospace',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.load.on('progress', (value: number) => {
            percentText.setText(`${Math.floor(value * 100)}%`);
            progressBar.clear();
            progressBar.fillStyle(0x39ff14, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });
    }
}
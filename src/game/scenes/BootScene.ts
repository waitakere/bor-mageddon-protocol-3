import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Environment
        this.load.image('part1_sky', 'assets/images/environments/part1_sky.png');
        this.load.image('part1_mid', 'assets/images/environments/part1_mid.png');
        this.load.image('part1_floor', 'assets/images/environments/part1_floor.png');
        this.load.image('barrel', 'assets/images/environments/barrel.png');
        this.load.image('crate', 'assets/images/environments/crate.png');
        this.load.image('kontejner', 'assets/images/environments/kontejner.png');

        // Items & Weapons
        this.load.image('item-sandwich', 'assets/images/environments/item-sandwich.png');
        this.load.image('item-beer', 'assets/images/environments/item-beer.png');
        this.load.image('axe', 'assets/images/environments/axe.png');
        this.load.image('bat-2', 'assets/images/environments/bat-2.png');
        this.load.image('crowbar-1', 'assets/images/environments/crowbar-1.png');

        // Atlases
        this.load.atlas('marko', 'assets/sprites/marko.png', 'assets/sprites/marko.json');
        this.load.atlas('maja', 'assets/sprites/maja.png', 'assets/sprites/maja.json');
        this.load.atlas('darko', 'assets/sprites/darko.png', 'assets/sprites/darko.json');
        this.load.atlas('enemies_1993', 'assets/sprites/enemies_1993.png', 'assets/sprites/enemies_1993.json');

        // Audio
        this.load.audioSprite('sfx_atlas', 'assets/audio/sfx_atlas.json', ['assets/audio/sfx_atlas.mp3']);

        // Global animation crash protector
        const originalPlay = Phaser.GameObjects.Sprite.prototype.play;
        Phaser.GameObjects.Sprite.prototype.play = function(key: any, ignoreIfPlaying?: boolean) {
            try { return originalPlay.call(this, key, ignoreIfPlaying); } 
            catch (e) { return this; }
        };
    }

    create() {
        this.createPlayerAnimations();
        this.createEnemy1993Animations();
        this.scene.start('MainLevel');
    }

    private createAutoAnimation(atlasKey: string, animKey: string, framePrefix: string, isLooping: boolean) {
        const texture = this.textures.get(atlasKey);
        const frames: Phaser.Types.Animations.AnimationFrame[] = [];
        for (let i = 1; i <= 60; i++) {
            const frameName = `${framePrefix}${i.toString().padStart(3, '0')}.png`;
            if (texture.has(frameName)) {
                frames.push({ key: atlasKey, frame: frameName });
            }
        }
        if (frames.length > 0) {
            this.anims.create({ key: animKey, frames, frameRate: 12, repeat: isLooping ? -1 : 0 });
        }
    }

    private createPlayerAnimations() {
        const characters = ['marko', 'maja', 'darko'];
        const actionMap: Record<string, string> = {
            'idle': 'idle',
            'walk': 'walk',
            'run': 'run', // Added run support
            'punch': 'punch',
            'kick': 'kick', // Added kick support
            'damage': 'damage_&_hurt',
            'die': 'knockdown'
        };

        characters.forEach(char => {
            Object.entries(actionMap).forEach(([key, folder]) => {
                this.createAutoAnimation(char, `${char}_${key}`, `${char}-${folder}/frame_`, key === 'idle' || key === 'walk' || key === 'run');
            });
        });
    }

    private createEnemy1993Animations() {
        const keys = ['mup-idle', 'mup-walk', 'mup-punch-1', 'mup-punch-2', 'mup-damage', 'mup-dying'];
        keys.forEach(k => this.createAutoAnimation('enemies_1993', k, `${k}/frame_`, k.includes('idle') || k.includes('walk')));
    }
}
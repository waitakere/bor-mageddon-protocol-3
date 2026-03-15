import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this.load.image('part1_sky', 'assets/images/environments/part1_sky.png');
        this.load.image('part1_mid', 'assets/images/environments/part1_mid.png');
        this.load.image('part1_floor', 'assets/images/environments/part1_floor.png');
        this.load.image('barrel', 'assets/images/environments/barrel.png');
        this.load.image('crate', 'assets/images/environments/crate.png');
        this.load.image('kontejner', 'assets/images/environments/kontejner.png');

        this.load.atlas('marko', 'assets/sprites/marko.png', 'assets/sprites/marko.json');
        this.load.atlas('maja', 'assets/sprites/maja.png', 'assets/sprites/maja.json');
        this.load.atlas('darko', 'assets/sprites/darko.png', 'assets/sprites/darko.json');
        this.load.atlas('enemies_1993', 'assets/sprites/enemies_1993.png', 'assets/sprites/enemies_1993.json');

        this.load.audioSprite('sfx_atlas', 'assets/audio/sfx_atlas.json', ['assets/audio/sfx_atlas.mp3']);
    }

    create() {
        this.createPlayerAnimations();
        this.createEnemyAnimations();

        const selected = this.game.canvas.parentElement?.getAttribute('data-selected-character') || 'marko';
        this.registry.set('selectedCharacter', selected);
        this.scene.start('MainLevel');
    }

    private createPlayerAnimations() {
        const characters = ['marko', 'maja', 'darko'];
        
        // Includes the new special and finisher folders
        const actionMap = { 
            'idle': 'idle', 
            'walk': 'walk', 
            'run': 'run', 
            'punch-1': 'punch-1', 
            'punch-2': 'punch-2', 
            'kick-1': 'kick-1', 
            'kick-2': 'kick-2', 
            'damage': 'damage', 
            'die': 'knockdown',
            'special': 'special', // Uses exactly 'marko-special'
            'finisher': 'finisher' // Uses exactly 'marko-finisher'
        };

        characters.forEach(char => {
            Object.entries(actionMap).forEach(([actionKey, folderName]) => {
                const animKey = `${char}-${actionKey}`; 
                const framePrefix = `${char}-${folderName}/frame_`;
                
                const fps = ['punch-1', 'punch-2', 'kick-1', 'kick-2', 'special', 'finisher'].includes(actionKey) ? 15 : 10;
                const isLoop = ['idle', 'walk', 'run'].includes(actionKey);

                this.createAutoAnimation(char, animKey, framePrefix, isLoop, fps);
            });

            // Failsafes for common naming variations
            this.createFallbackAnimation(`${char}-special`, `${char}-special_attack`);
            this.createFallbackAnimation(`${char}-finisher`, `${char}-finish_move`);
        });
    }

    private createEnemyAnimations() {
        const keys = ['mup-idle', 'mup-walk', 'mup-punch-1', 'mup-punch-2', 'mup-damage', 'mup-dying'];
        keys.forEach(k => this.createAutoAnimation('enemies_1993', k, `${k}/frame_`, k.includes('idle') || k.includes('walk'), 10));
    }

    private createAutoAnimation(atlasKey: string, animKey: string, framePrefix: string, isLooping: boolean, fps: number) {
        const texture = this.textures.get(atlasKey);
        const frames: Phaser.Types.Animations.AnimationFrame[] = [];
        
        // Check frames starting from 000
        for (let i = 0; i <= 60; i++) {
            const frameName = `${framePrefix}${i.toString().padStart(3, '0')}.png`;
            if (texture.has(frameName)) {
                frames.push({ key: atlasKey, frame: frameName });
            }
        }
        
        if (frames.length > 0) {
            this.anims.create({ key: animKey, frames, frameRate: fps, repeat: isLooping ? -1 : 0 });
        }
    }

    private createFallbackAnimation(newKey: string, sourceKey: string) {
        if (!this.anims.exists(newKey) && this.anims.exists(sourceKey)) {
            const sourceAnim = this.anims.get(sourceKey);
            const frameConfig = sourceAnim.frames.map(f => ({ key: f.textureKey, frame: f.textureFrame }));
            this.anims.create({ key: newKey, frames: frameConfig, frameRate: sourceAnim.frameRate, repeat: sourceAnim.repeat ? -1 : 0 });
        }
    }
}
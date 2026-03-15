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

        // Items
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
        
        // Updated to match your exact folder structure
        const actionMap = { 
            'idle': 'idle', 
            'walk': 'walk', 
            'run': 'run', 
            'punch-1': 'punch-1', 
            'punch-2': 'punch-2', 
            'kick-1': 'kick-1', 
            'kick-2': 'kick-2', 
            'damage': 'damage', 
            'die': 'knockdown' // Assuming death is still 'knockdown', change if needed
        };

        characters.forEach(char => {
            Object.entries(actionMap).forEach(([actionKey, folderName]) => {
                const animKey = `${char}-${actionKey}`; 
                const framePrefix = `${char}-${folderName}/frame_`;
                
                // Snappy Timing: Attacks are 15fps, Movement is 10fps
                const fps = actionKey.includes('punch') || actionKey.includes('kick') ? 15 : 10;
                const isLoop = ['idle', 'walk', 'run'].includes(actionKey);

                this.createAutoAnimation(char, animKey, framePrefix, isLoop, fps);
            });

            // =========================================================
            // ALIAS SYSTEM: Prevents game crashes if code calls generic names
            // If the character logic calls 'maja-kick', route it to 'maja-kick-1'
            // =========================================================
            this.createFallbackAnimation(`${char}-punch`, `${char}-punch-1`);
            this.createFallbackAnimation(`${char}-kick`, `${char}-kick-1`);
        });
    }

    private createEnemyAnimations() {
        // MUP animations mapped exactly to your folder structure
        const keys = ['mup-idle', 'mup-walk', 'mup-punch-1', 'mup-punch-2', 'mup-damage', 'mup-dying'];
        keys.forEach(k => this.createAutoAnimation('enemies_1993', k, `${k}/frame_`, k.includes('idle') || k.includes('walk'), 10));
    }

    private createAutoAnimation(atlasKey: string, animKey: string, framePrefix: string, isLooping: boolean, fps: number) {
        const texture = this.textures.get(atlasKey);
        const frames: Phaser.Types.Animations.AnimationFrame[] = [];
        
        // FIX: Start at 0 instead of 1 to catch 'frame_000.png'
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

    // Helper function to create an alias for an animation if the exact key is missing
    private createFallbackAnimation(newKey: string, sourceKey: string) {
        if (!this.anims.exists(newKey) && this.anims.exists(sourceKey)) {
            const sourceAnim = this.anims.get(sourceKey);
            // Map the exact frame objects from the loaded source animation
            const frameConfig = sourceAnim.frames.map(f => ({ key: f.textureKey, frame: f.textureFrame }));
            
            this.anims.create({
                key: newKey,
                frames: frameConfig,
                frameRate: sourceAnim.frameRate,
                repeat: sourceAnim.repeat ? -1 : 0
            });
        }
    }
}
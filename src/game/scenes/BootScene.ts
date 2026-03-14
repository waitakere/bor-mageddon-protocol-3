import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log("REAL BOOT INITIATED: Loading actual assets...");

        // 1. ENVIRONMENT
        this.load.image('part1_sky', 'assets/images/environments/part1_sky.png');
        this.load.image('part1_mid', 'assets/images/environments/part1_mid.png');
        this.load.image('part1_floor', 'assets/images/environments/part1_floor.png');
        this.load.image('barrel', 'assets/images/environments/barrel.png');
        this.load.image('crate', 'assets/images/environments/crate.png');
        this.load.image('kontejner', 'assets/images/environments/kontejner.png');

        // 2. TEXTURE ATLASES
        this.load.atlas('marko', 'assets/sprites/marko.png', 'assets/sprites/marko.json');
        this.load.atlas('maja', 'assets/sprites/maja.png', 'assets/sprites/maja.json');
        this.load.atlas('darko', 'assets/sprites/darko.png', 'assets/sprites/darko.json');
        this.load.atlas('enemies_1993', 'assets/sprites/enemies_1993.png', 'assets/sprites/enemies_1993.json');

        // 3. AUDIO
        this.load.audioSprite('sfx_atlas', 'assets/audio/sfx_atlas.json', [
            'assets/audio/sfx_atlas.mp3'
        ]);

        // 4. PLACEHOLDERS FOR ITEMS
        const graphics = this.add.graphics();
        graphics.fillStyle(0x00ff00, 1); 
        graphics.fillRect(0, 0, 32, 32); 
        graphics.generateTexture('item_dinar', 32, 32); 
        graphics.generateTexture('item_health', 32, 32); 
        graphics.generateTexture('item_pickaxe', 32, 32); 
        graphics.clear();

        // Safety override so missing animations don't crash the engine
        const originalPlay = Phaser.GameObjects.Sprite.prototype.play;
        Phaser.GameObjects.Sprite.prototype.play = function(key: string | Phaser.Types.Animations.PlayAnimationConfig, ignoreIfPlaying?: boolean) {
            try { return originalPlay.call(this, key, ignoreIfPlaying); } 
            catch (e) { return this; }
        };
    }

    create() {
        this.createPlayerAnimations();
        this.createEnemy1993Animations();

        console.log("BOOT COMPLETE. Launching MainLevel...");
        this.scene.start('MainLevel');
    }

    /**
     * SMART ANIMATION GENERATOR: Automatically detects how many frames an animation has
     * and correctly formats the "frame_001.png" syntax based on your JSON!
     */
    private createAutoAnimation(atlasKey: string, animKey: string, framePrefix: string, isLooping: boolean) {
        const texture = this.textures.get(atlasKey);
        if (!texture || texture.key === '__MISSING') return;

        const frames: Phaser.Types.Animations.AnimationFrame[] = [];
        
        // Scan up to 60 frames to see what actually exists in the JSON
        for (let i = 1; i <= 60; i++) {
            const frameName = `${framePrefix}${i.toString().padStart(3, '0')}.png`;
            if (texture.has(frameName)) {
                frames.push({ key: atlasKey, frame: frameName });
            }
        }

        // Only create the animation if we actually found frames for it
        if (frames.length > 0) {
            this.anims.create({
                key: animKey,
                frames: frames,
                frameRate: 10,
                repeat: isLooping ? -1 : 0
            });
        }
    }

    private createPlayerAnimations() {
        const characters = ['marko', 'maja', 'darko'];
        
        // This maps what the Code asks for -> What the JSON folder is named
        const actionMap: Record<string, string> = {
            'idle': 'idle',
            'walk': 'walk',
            'punch': 'punch',
            'shoot_idle': 'shoot-idle',
            'damage_&_hurt': 'damage',
            'knockdown': 'knockdown-get-up'
        };

        characters.forEach(char => {
            Object.entries(actionMap).forEach(([actionKey, folderName]) => {
                const animKey = `${char}_${actionKey}`; // e.g., "marko_idle"
                const framePrefix = `${char}-${folderName}/frame_`; // e.g., "marko-idle/frame_"
                const isLooping = actionKey.includes('idle') || actionKey.includes('walk');
                
                this.createAutoAnimation(char, animKey, framePrefix, isLooping);
            });
        });
    }

    private createEnemy1993Animations() {
        const enemyRoster = [
            { anims: ['mup-idle', 'mup-walk', 'mup-punch-1', 'mup-punch-2', 'mup-damage', 'mup-dying', 'mup-knockdown-get-up'] },
            { anims: ['dizel-walk', 'dizel-run', 'dizel-punch-1', 'dizel-throw', 'dizel-damage', 'dizel-dying', 'dizel-knockdown-get-up'] },
            { anims: ['dizelcic-walk', 'dizelcic-punch-1', 'dizelcic-damage', 'dizelcic-dying', 'dizelcic-knockdown-get-up'] },
            { anims: ['miner-walk', 'miner-melee', 'miner-damage', 'miner-dying', 'miner-knockdown-get-up'] },
            { anims: ['slobodan-walk', 'slobodan-run', 'slobodan-jump', 'slobodan-jump-punch', 'slobodan-punch-1', 'slobodan-punch-2', 'slobodan-damage', 'slobodan-special-attack', 'slobodan-dying', 'slobodan-knockdown-get-up'] }
        ];

        enemyRoster.forEach(enemy => {
            enemy.anims.forEach(animKey => {
                const isLooping = animKey.includes('walk') || animKey.includes('run') || animKey.includes('idle');
                const framePrefix = `${animKey}/frame_`; // e.g., "mup-idle/frame_"
                
                this.createAutoAnimation('enemies_1993', animKey, framePrefix, isLooping);
            });
        });
    }
}
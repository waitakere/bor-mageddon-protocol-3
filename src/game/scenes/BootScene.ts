import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log("REAL BOOT INITIATED: Loading actual assets...");

        // ==========================================
        // 1. ENVIRONMENT & BACKGROUNDS
        // ==========================================
        this.load.image('part1_sky', 'assets/images/environments/part1_sky.png');
        this.load.image('part1_mid', 'assets/images/environments/part1_mid.png');
        this.load.image('part1_floor', 'assets/images/environments/part1_floor.png');
        
        // Breakable Props
        this.load.image('barrel', 'assets/images/environments/barrel.png');
        this.load.image('crate', 'assets/images/environments/crate.png');
        this.load.image('kontejner', 'assets/images/environments/kontejner.png');

        // ==========================================
        // 2. ITEMS & WEAPONS (New additions)
        // ==========================================
        this.load.image('item-sandwich', 'assets/images/environments/item-sandwich.png');
        this.load.image('item-beer', 'assets/images/environments/item-beer.png');
        this.load.image('axe', 'assets/images/environments/axe.png');
        this.load.image('bat-2', 'assets/images/environments/bat-2.png');
        this.load.image('bat-3', 'assets/images/environments/bat-3.png');
        this.load.image('crowbar-1', 'assets/images/environments/crowbar-1.png');
        this.load.image('bullet', 'assets/images/environments/bullet.png');

        // ==========================================
        // 3. TEXTURE ATLASES
        // ==========================================
        this.load.atlas('marko', 'assets/sprites/marko.png', 'assets/sprites/marko.json');
        this.load.atlas('maja', 'assets/sprites/maja.png', 'assets/sprites/maja.json');
        this.load.atlas('darko', 'assets/sprites/darko.png', 'assets/sprites/darko.json');
        this.load.atlas('enemies_1993', 'assets/sprites/enemies_1993.png', 'assets/sprites/enemies_1993.json');

        // ==========================================
        // 4. AUDIO
        // ==========================================
        this.load.audioSprite('sfx_atlas', 'assets/audio/sfx_atlas.json', [
            'assets/audio/sfx_atlas.mp3'
        ]);

        // ==========================================
        // 5. BACKUP PLACEHOLDERS
        // ==========================================
        const graphics = this.add.graphics();
        graphics.fillStyle(0x00ff00, 1); 
        graphics.fillRect(0, 0, 32, 32); 
        graphics.generateTexture('item_dinar', 32, 32); 
        graphics.generateTexture('item_pickaxe', 32, 32); 
        graphics.clear();

        // Safety override to prevent crashes on missing frames
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
     * Helper to automatically find frames in your specific JSON format (frame_001.png)
     */
    private createAutoAnimation(atlasKey: string, animKey: string, framePrefix: string, isLooping: boolean) {
        const texture = this.textures.get(atlasKey);
        if (!texture || texture.key === '__MISSING') return;

        const frames: Phaser.Types.Animations.AnimationFrame[] = [];
        for (let i = 1; i <= 60; i++) {
            const frameName = `${framePrefix}${i.toString().padStart(3, '0')}.png`;
            if (texture.has(frameName)) {
                frames.push({ key: atlasKey, frame: frameName });
            }
        }

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
                const animKey = `${char}_${actionKey}`;
                const framePrefix = `${char}-${folderName}/frame_`;
                const isLooping = actionKey.includes('idle') || actionKey.includes('walk');
                this.createAutoAnimation(char, animKey, framePrefix, isLooping);
            });
        });
    }

    private createEnemy1993Animations() {
        const enemyRoster = [
            'mup-idle', 'mup-walk', 'mup-punch-1', 'mup-punch-2', 'mup-damage', 'mup-dying', 'mup-knockdown-get-up',
            'dizel-walk', 'dizel-run', 'dizel-punch-1', 'dizel-throw', 'dizel-damage', 'dizel-dying', 'dizel-knockdown-get-up',
            'dizelcic-walk', 'dizelcic-punch-1', 'dizelcic-damage', 'dizelcic-dying', 'dizelcic-knockdown-get-up',
            'miner-walk', 'miner-melee', 'miner-damage', 'miner-dying', 'miner-knockdown-get-up',
            'slobodan-walk', 'slobodan-run', 'slobodan-jump', 'slobodan-jump-punch', 'slobodan-punch-1', 'slobodan-punch-2', 'slobodan-damage', 'slobodan-special-attack', 'slobodan-dying', 'slobodan-knockdown-get-up'
        ];

        enemyRoster.forEach(animKey => {
            const isLooping = animKey.includes('walk') || animKey.includes('run') || animKey.includes('idle');
            const framePrefix = `${animKey}/frame_`;
            this.createAutoAnimation('enemies_1993', animKey, framePrefix, isLooping);
        });
    }
}
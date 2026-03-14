import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log("REAL BOOT INITIATED: Loading actual assets...");

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

        this.load.audioSprite('sfx_atlas', 'assets/audio/sfx_atlas.json', [
            'assets/audio/sfx_atlas.mp3'
        ]);

        const graphics = this.add.graphics();
        graphics.fillStyle(0x00ff00, 1); 
        graphics.fillRect(0, 0, 32, 32); 
        graphics.generateTexture('item_dinar', 32, 32); 
        graphics.generateTexture('item_health', 32, 32); 
        graphics.generateTexture('item_pickaxe', 32, 32); 
        graphics.clear();

        const originalPlay = Phaser.GameObjects.Sprite.prototype.play;
        Phaser.GameObjects.Sprite.prototype.play = function(key: string | Phaser.Types.Animations.PlayAnimationConfig, ignoreIfPlaying?: boolean) {
            try {
                return originalPlay.call(this, key, ignoreIfPlaying);
            } catch (e) {
                return this;
            }
        };
    }

    create() {
        this.createEnemy1993Animations();
        
        // NEW: Load player animations!
        this.createPlayerAnimations();

        console.log("BOOT COMPLETE. Launching MainLevel...");
        this.scene.start('MainLevel');
    }

    private createPlayerAnimations() {
        // Build animations for all three characters
        const characters = ['marko', 'maja', 'darko'];
        
        characters.forEach(char => {
            const playerAnimations = [`${char}_idle`, `${char}_walk`, `${char}_punch`, `${char}_shoot_idle`];
            
            playerAnimations.forEach(animName => {
                const isLooping = animName.includes('walk') || animName.includes('idle');
                try {
                    this.anims.create({
                        key: animName, 
                        frames: this.anims.generateFrameNames(char, {
                            prefix: `${animName}/`, 
                            suffix: '.png',
                            start: 1, end: 8, zeroPad: 3 
                        }),
                        frameRate: 10, repeat: isLooping ? -1 : 0
                    });
                } catch (error) {
                    console.warn(`Player animation missing: ${animName}`);
                }
            });
        });
    }

    private createEnemy1993Animations() {
        const enemyRoster = [
            {
                character: 'MUP',
                animations: ['mup-idle', 'mup-walk', 'mup-punch-1', 'mup-punch-2', 'mup-damage', 'mup-dying', 'mup-knockdown-get-up']
            },
            {
                character: 'Dizelaš', 
                animations: ['dizel-walk', 'dizel-run', 'dizel-punch-1', 'dizel-throw', 'dizel-damage', 'dizel-dying', 'dizel-knockdown-get-up']
            },
            {
                character: 'Dizelčić', 
                animations: ['dizelcic-walk', 'dizelcic-punch-1', 'dizelcic-damage', 'dizelcic-dying', 'dizelcic-knockdown-get-up']
            },
            {
                character: 'Miner',
                animations: ['miner-walk', 'miner-melee', 'miner-damage', 'miner-dying', 'miner-knockdown-get-up']
            },
            {
                character: 'SlobodanCEO',
                animations: [
                    'slobodan-walk', 'slobodan-run', 'slobodan-jump', 'slobodan-jump-punch', 
                    'slobodan-punch-1', 'slobodan-punch-2', 'slobodan-damage', 
                    'slobodan-special-attack', 'slobodan-dying', 'slobodan-knockdown-get-up'
                ]
            }
        ];

        enemyRoster.forEach(enemy => {
            enemy.animations.forEach(animName => {
                const isLooping = animName.includes('walk') || animName.includes('run') || animName.includes('idle');
                try {
                    this.anims.create({
                        key: animName, 
                        frames: this.anims.generateFrameNames('enemies_1993', {
                            prefix: `${animName}/`, 
                            suffix: '.png',
                            start: 1, end: 8, zeroPad: 3 
                        }),
                        frameRate: 10, repeat: isLooping ? -1 : 0
                    });
                } catch (error) {
                    console.warn(`Animation missing in JSON: ${animName}`);
                }
            });
        });
    }
}
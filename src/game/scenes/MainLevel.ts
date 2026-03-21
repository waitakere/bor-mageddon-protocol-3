import Phaser from 'phaser';
import { Marko } from '../entities/Marko';
import { Maja } from '../entities/Maja';
import { Darko } from '../entities/Darko';
import { Enemy } from '../entities/Enemy';

// Custom Subclasses
import { Dizel } from '../entities/Dizel';
import { Dizelcic } from '../entities/Dizelcic';
import { Miner } from '../entities/Miner';

export class MainLevel extends Phaser.Scene {
    public player!: any; 
    public enemies!: Phaser.Physics.Arcade.Group;
    public items!: Phaser.Physics.Arcade.Group;
    private shadows!: Phaser.GameObjects.Graphics;
    
    // Reverted back to Images for proper stretching/zooming
    private skyLayer!: Phaser.GameObjects.Image;
    private midLayer!: Phaser.GameObjects.Image;
    private floorLayer!: Phaser.GameObjects.Image;
    
    private sectors = [
        { triggerX: 800, totalEnemies: 4, maxActive: 2 },  
        { triggerX: 1600, totalEnemies: 6, maxActive: 3 }, 
        { triggerX: 2400, totalEnemies: 8, maxActive: 3 }, // Transition to Part 2 textures after this
        { triggerX: 3200, totalEnemies: 5, maxActive: 4 }  
    ];
    
    private currentSectorIndex!: number;
    private isLocked!: boolean;
    private spawnedThisWave!: number;
    public killedThisWave!: number; 
    private bossSpawned!: boolean;
    public score!: number;

    public lastEngagedEnemy: any = null;
    public lastPlayerHitTime!: number;
    public lastEnemyHitTime!: number;

    constructor() { 
        super({ key: 'MainLevel' }); 
    }

    init() {
        this.currentSectorIndex = 0;
        this.isLocked = false;
        this.spawnedThisWave = 0;
        this.killedThisWave = 0;
        this.bossSpawned = false;
        this.score = 0;
        this.lastEngagedEnemy = null;
        this.lastPlayerHitTime = 0;
        this.lastEnemyHitTime = 0;

        this.createEnemyAnimations();
    }

    create() {
        window.addEventListener('request-scene-restart', this.handleRestart);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('request-scene-restart', this.handleRestart);
        });

        this.events.on(Phaser.Scenes.Events.PAUSE, () => this.sound.pauseAll());
        this.events.on(Phaser.Scenes.Events.RESUME, () => this.sound.resumeAll());

        const unlockAudio = () => {
            if (this.sound.context.state === 'suspended') this.sound.context.resume();
        };
        this.input.on('pointerdown', unlockAudio);
        this.input.keyboard?.on('keydown', unlockAudio);

        this.sound.stopAll(); 
        this.sound.play('1993_ambient', { loop: true, volume: 0.4 });

        this.physics.world.setBounds(0, 750, 6000, 330); 
        
        // ==========================================
        // FIXED PARALLAX SCALING & DEPTH
        // Using explicit negative depths (-100 to -300) so they NEVER overlap the characters
        // ==========================================
        this.skyLayer = this.add.image(0, 0, 'part1_sky')
            .setOrigin(0, 0).setDisplaySize(6000, 1080).setScrollFactor(0.1).setDepth(-300);
            
        this.midLayer = this.add.image(0, 750, 'part1_mid')
            .setOrigin(0, 1).setDisplaySize(6000, 650).setScrollFactor(0.5).setDepth(-200);
            
        this.floorLayer = this.add.image(0, 1080, 'part1_floor')
            .setOrigin(0, 1).setDisplaySize(6000, 330).setScrollFactor(1).setDepth(-100);

        this.shadows = this.add.graphics().setAlpha(0.4);
        
        // Shadows must render under feet but above the floor
        this.shadows.setDepth(-50); 
        
        this.items = this.physics.add.group();
        this.enemies = this.physics.add.group();

        const charKey = this.registry.get('selectedCharacter') || 'marko';
        switch(charKey) {
            case 'maja': this.player = new Maja(this, 200, 950); break;
            case 'darko': this.player = new Darko(this, 200, 950); break;
            default: this.player = new Marko(this, 200, 950); break;
        }

        this.player.setScale(1.7);
        
        const firstEnemy = new Dizel(this, 1000, 950);
        this.enemies.add(firstEnemy);

        this.physics.add.collider(this.player, this.enemies);
        this.physics.add.collider(this.enemies, this.enemies);
        this.physics.add.overlap(this.player, this.items, this.collectItem, undefined, this);

        this.cameras.main.setBounds(0, 0, 6000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.updateReactHUD();

        this.scene.pause();
        window.dispatchEvent(new CustomEvent('phaser-ready'));
    }

    private createEnemyAnimations() {
        const texture = this.textures.get('enemies_1993');
        if (!texture || texture.key === '__MISSING') return;

        const enemyPrefixes = [
            { id: 'mup', anims: ['walk', 'attack', 'damage', 'dying', 'knockdown-get-up'] },
            { id: 'dizel', anims: ['walk', 'punch-1', 'damage', 'dying', 'knockdown-get-up'] },
            { id: 'dizelcic', anims: ['walk', 'punch-1', 'damage', 'dying'] },
            { id: 'rudar', anims: ['walk', 'punch-2', 'damage', 'dying'] },
            { id: 'sloba', anims: ['walk', 'attack', 'damage', 'dying'] }
        ];

        enemyPrefixes.forEach(enemy => {
            enemy.anims.forEach(animType => {
                const animKey = `${enemy.id}-${animType}`;
                if (this.anims.exists(animKey)) return;

                const frames = [];
                for (let i = 0; i <= 15; i++) {
                    const frameName = `${animKey}/frame_${i.toString().padStart(3, '0')}.png`;
                    if (texture.has(frameName)) {
                        frames.push({ key: 'enemies_1993', frame: frameName });
                    }
                }

                if (frames.length > 0) {
                    this.anims.create({
                        key: animKey,
                        frames: frames,
                        frameRate: 10,
                        repeat: animKey.includes('walk') ? -1 : 0
                    });
                }
            });
        });
    }

    private handleRestart = () => {
        this.scene.restart();
    };

    update() {
        if (!this.player || this.player.isDead) return;

        this.handleWaveManager();

        this.children.each((child: any) => {
            if (child.body && child.type === 'Sprite') { child.setAngle(0); child.rotation = 0; }
        });

        this.shadows.clear().fillStyle(0x000000, 0.5);
        this.shadows.fillEllipse(this.player.x, this.player.y, 70 * this.player.scale, 20);
        this.enemies.getChildren().forEach((e: any) => { if (!e.isDead) this.shadows.fillEllipse(e.x, e.y, e.width * 0.6, 20); });

        const cursors = this.input.keyboard!.createCursorKeys();
        const kb = this.input.keyboard!;
        const q = kb.addKey('Q'); const w = kb.addKey('W'); const a = kb.addKey('A'); const s = kb.addKey('S');

        const keys = {
            up: cursors.up.isDown, down: cursors.down.isDown, left: cursors.left.isDown, right: cursors.right.isDown,
            space: Phaser.Input.Keyboard.JustDown(kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)),
            p1: Phaser.Input.Keyboard.JustDown(q), p2: Phaser.Input.Keyboard.JustDown(w),
            k1: Phaser.Input.Keyboard.JustDown(a), k2: Phaser.Input.Keyboard.JustDown(s),
            special: (Phaser.Input.Keyboard.JustDown(q) && w.isDown) || (Phaser.Input.Keyboard.JustDown(w) && q.isDown),
            finisher: (Phaser.Input.Keyboard.JustDown(a) && s.isDown) || (Phaser.Input.Keyboard.JustDown(s) && a.isDown)
        };

        this.player.update(keys);
        this.enemies.getChildren().forEach((e: any) => { if (e.updateAI && !e.isDead) e.updateAI(this.player); });
        
        // ==========================================
        // DYNAMIC DEPTH SORTING
        // Now safely ignores our strictly layered background Images
        // ==========================================
        this.children.each((c: any) => { 
            if (c.y && c.type !== 'Image' && c.type !== 'Graphics') {
                c.setDepth(c.y); 
            } 
        });
        
        if (this.lastEngagedEnemy && (!this.lastEngagedEnemy.active || this.lastEngagedEnemy.isDead)) {
            this.lastEngagedEnemy = null;
            this.updateReactHUD();
        }
    }

    public playSFX(marker: string | string[], volume: number = 0.8) {
        try {
            if (this.sound.context.state === 'suspended') this.sound.context.resume();
            const finalMarker = Array.isArray(marker) ? marker[Math.floor(Math.random() * marker.length)] : marker;

            if (this.cache.json.exists('sfx_atlas')) {
                const json = this.cache.json.get('sfx_atlas');
                if (json && json.spritemap && json.spritemap[finalMarker]) {
                    const sound = this.sound.addAudioSprite('sfx_atlas');
                    sound.play(finalMarker, { volume });
                    return sound;
                }
            }
            if (this.cache.audio.exists(finalMarker)) {
                this.sound.play(finalMarker, { volume });
                return;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    public spawnHitEffect(x: number, y: number) {
        const explosion = this.add.sprite(x, y, 'explosion_01');
        explosion.setDepth(9999); 
        explosion.setScale(1.5); 
        this.tweens.add({
            targets: explosion,
            scale: 2.0, alpha: 0, duration: 250,
            ease: 'Quad.easeOut',
            onComplete: () => explosion.destroy()
        });
    }

    public dropItem(x: number, y: number) {
        if (Math.random() > 0.3) return; 
        const items = ['item-burek', 'item-coffee', 'item-pork', 'item-beer', 'item-sandwich'];
        const randomItem = items[Math.floor(Math.random() * items.length)];
        
        const drop = this.physics.add.sprite(x, y - 40, randomItem);
        drop.setOrigin(0.5, 1); 
        this.items.add(drop);
        drop.setScale(0.5);

        const body = drop.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setSize(drop.width, 20);
            body.setOffset(0, drop.height - 20);
        }
        this.tweens.add({ targets: drop, alpha: 0.2, duration: 100, yoyo: true, repeat: 5, ease: 'Linear' });
        this.tweens.add({ targets: drop, y: y, duration: 350, ease: 'Bounce.easeOut' });
    }

    private collectItem(player: any, item: any) {
        if (Math.abs(player.y - item.y) > 30) return;
        item.destroy();
        this.playSFX(['melee_1', 'Metal-Impact-Shield'], 0.8); 
        if (player.playPickupAnim) player.playPickupAnim();
        
        this.player.health = Math.min(this.player.health + 30, this.player.maxHealth || 150);
        const healText = this.add.text(this.player.x, this.player.y - 80, '+HP', { font: '900 20px "Space Mono"', color: '#00ff00' }).setOrigin(0.5);
        this.tweens.add({ targets: healText, y: healText.y - 30, alpha: 0, duration: 1000, onComplete: () => healText.destroy() });
        this.updateReactHUD();
    }

    private handleWaveManager() {
        const cam = this.cameras.main;

        if (!this.isLocked && this.currentSectorIndex < this.sectors.length) {
            const nextSector = this.sectors[this.currentSectorIndex];
            if (this.player.x > nextSector.triggerX) {
                this.isLocked = true;
                cam.stopFollow();
                
                this.physics.world.setBounds(cam.worldView.left, 750, cam.width, 330);
                this.updateReactHUD();
            }
        }

        if (this.isLocked) {
            const currentSector = this.sectors[this.currentSectorIndex];
            const activeEnemies = this.enemies.getChildren().filter((e: any) => !e.isDead).length;
            const isFinalSector = this.currentSectorIndex === this.sectors.length - 1;

            if (activeEnemies < currentSector.maxActive && this.spawnedThisWave < currentSector.totalEnemies) {
                const gangTypes = ['dizel', 'dizelcic', 'rudar'];
                const randomType = gangTypes[Math.floor(Math.random() * gangTypes.length)];
                this.spawnEnemyOffScreen(cam.worldView, randomType);
            }

            if (isFinalSector && this.spawnedThisWave >= currentSector.totalEnemies && activeEnemies === 0 && !this.bossSpawned) {
                this.spawnEnemyOffScreen(cam.worldView, 'sloba');
                this.bossSpawned = true;
            }

            if (this.spawnedThisWave >= currentSector.totalEnemies && activeEnemies === 0) {
                if (isFinalSector && !this.bossSpawned) return; 
                this.unlockCamera();
            }
        }
    }

    private spawnEnemyOffScreen(view: Phaser.Geom.Rectangle, type: string) {
        const spawnOnLeft = Math.random() > 0.5;
        const spawnX = spawnOnLeft ? view.left - 80 : view.right + 80;
        const spawnY = Phaser.Math.Between(800, 1050);
        
        let enemy: any;
        switch (type) {
            case 'dizel': enemy = new Dizel(this, spawnX, spawnY); break;
            case 'dizelcic': enemy = new Dizelcic(this, spawnX, spawnY); break;
            case 'rudar': enemy = new Miner(this, spawnX, spawnY); break;
            default: enemy = new Enemy(this, spawnX, spawnY, type); break;
        }
        
        this.enemies.add(enemy);
        this.spawnedThisWave++;
    }

    private unlockCamera() {
        this.isLocked = false;
        this.spawnedThisWave = 0;
        this.currentSectorIndex++; 
        
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.physics.world.setBounds(0, 750, 6000, 330);
        this.updateReactHUD();

        if (this.currentSectorIndex === 3) {
            this.cameras.main.flash(500, 0, 0, 0);
            
            if (this.textures.exists('part2_sky')) {
                this.skyLayer.setTexture('part2_sky');
                this.midLayer.setTexture('part2_mid');
                this.floorLayer.setTexture('part2_floor');
                
                // Re-apply display size because setting a new texture resets it to native dimensions
                this.skyLayer.setDisplaySize(6000, 1080);
                this.midLayer.setDisplaySize(6000, 650);
                this.floorLayer.setDisplaySize(6000, 330);
            }
        }
        
        if (this.currentSectorIndex < this.sectors.length) {
            const goText = this.add.text(this.player.x + 100, this.player.y - 150, 'GO! ➡', { 
                font: '900 64px "Space Mono"', 
                color: '#39ff14', 
                stroke: '#000', 
                strokeThickness: 8 
            }).setOrigin(0.5);
            
            this.tweens.add({ 
                targets: goText, 
                x: goText.x + 60, 
                scale: 1.2,
                duration: 500, 
                yoyo: true,
                repeat: 3, 
                onComplete: () => {
                    this.tweens.add({ targets: goText, alpha: 0, duration: 500, onComplete: () => goText.destroy() });
                }
            });
        }
    }

    public registerEnemyDeath() {
        this.score += 100;
        this.updateReactHUD();
    }

    public updateReactHUD() {
        let eMaxHealth = 100;
        if (this.lastEngagedEnemy) {
            eMaxHealth = this.lastEngagedEnemy.skinPrefix === 'sloba' ? 600 : 100;
        }

        window.dispatchEvent(new CustomEvent('update-phaser-hud', {
            detail: { 
                health: this.player?.health, 
                maxHealth: this.player?.maxHealth,
                smf: this.player?.smfMeter, 
                score: this.score,
                playerName: this.player?.characterName,
                enemyName: this.lastEngagedEnemy && !this.lastEngagedEnemy.isDead ? this.lastEngagedEnemy.skinPrefix : null,
                enemyHealth: this.lastEngagedEnemy ? this.lastEngagedEnemy.health : 0,
                enemyMaxHealth: eMaxHealth,
                playerHitStamp: this.lastPlayerHitTime,
                enemyHitStamp: this.lastEnemyHitTime
            }
        }));
    }
}
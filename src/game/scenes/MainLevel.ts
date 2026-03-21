import Phaser from 'phaser';
import { Marko } from '../entities/Marko';
import { Maja } from '../entities/Maja';
import { Darko } from '../entities/Darko';
import { Enemy } from '../entities/Enemy';

// ==========================================
// IMPORTING THE NEW SUBCLASSES
// ==========================================
import { Dizel } from '../entities/Dizel';
import { Dizelcic } from '../entities/Dizelcic';
import { Miner } from '../entities/Miner';

export class MainLevel extends Phaser.Scene {
    public player!: any; 
    public enemies!: Phaser.Physics.Arcade.Group;
    public items!: Phaser.Physics.Arcade.Group;
    private shadows!: Phaser.GameObjects.Graphics;
    
    private sectors = [
        { triggerX: 800, totalEnemies: 4, maxActive: 2 },
        { triggerX: 1600, totalEnemies: 6, maxActive: 3 },
        { triggerX: 2400, totalEnemies: 8, maxActive: 3 },
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

        this.events.on(Phaser.Scenes.Events.PAUSE, () => {
            this.sound.pauseAll();
        });
        this.events.on(Phaser.Scenes.Events.RESUME, () => {
            this.sound.resumeAll();
        });

        const unlockAudio = () => {
            if (this.sound.context.state === 'suspended') this.sound.context.resume();
        };
        this.input.on('pointerdown', unlockAudio);
        this.input.keyboard?.on('keydown', unlockAudio);

        this.sound.stopAll(); 
        this.sound.play('1993_ambient', { loop: true, volume: 0.4 });

        this.physics.world.setBounds(0, 750, 4000, 330); 
        
        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setDisplaySize(4000, 1080).setScrollFactor(0.1);
        this.add.image(0, 750, 'part1_mid').setOrigin(0, 1).setDisplaySize(4000, 650).setScrollFactor(0.5);
        this.add.image(0, 1080, 'part1_floor').setOrigin(0, 1).setDisplaySize(4000, 330).setScrollFactor(1);

        this.shadows = this.add.graphics().setAlpha(0.4);
        this.items = this.physics.add.group();
        this.enemies = this.physics.add.group();

        const charKey = this.registry.get('selectedCharacter') || 'marko';
        switch(charKey) {
            case 'maja': this.player = new Maja(this, 200, 950); break;
            case 'darko': this.player = new Darko(this, 200, 950); break;
            default: this.player = new Marko(this, 200, 950); break;
        }

        this.player.setScale(1.7);
        
        // Spawn our newly fixed Dizel subclass as the first encounter
        const firstEnemy = new Dizel(this, 1000, 950);
        this.enemies.add(firstEnemy);

        this.physics.add.collider(this.player, this.enemies);
        this.physics.add.collider(this.enemies, this.enemies);

        this.physics.add.overlap(this.player, this.items, this.collectItem, undefined, this);

        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.updateReactHUD();

        this.scene.pause();
        window.dispatchEvent(new CustomEvent('phaser-ready'));
    }

    private createEnemyAnimations() {
        if (this.anims.exists('mup-walk')) return;

        const enemyTypes = ['mup', 'dizel', 'dizelcic', 'rudar', 'sloba'];
        
        enemyTypes.forEach(enemy => {
            this.anims.create({
                key: `${enemy}-walk`,
                frames: this.anims.generateFrameNames('enemies_1993', { prefix: `${enemy}-walk/frame_`, suffix: '.png', start: 0, end: 8, zeroPad: 3 }),
                frameRate: 10,
                repeat: -1
            });
            
            this.anims.create({
                key: `${enemy}-attack`,
                frames: this.anims.generateFrameNames('enemies_1993', { prefix: `${enemy}-attack/frame_`, suffix: '.png', start: 0, end: 8, zeroPad: 3 }),
                frameRate: 12,
                repeat: 0
            });

            this.anims.create({
                key: `${enemy}-damage`,
                frames: this.anims.generateFrameNames('enemies_1993', { prefix: `${enemy}-damage/frame_`, suffix: '.png', start: 0, end: 3, zeroPad: 3 }),
                frameRate: 12,
                repeat: 0
            });

            this.anims.create({
                key: `${enemy}-dying`,
                frames: this.anims.generateFrameNames('enemies_1993', { prefix: `${enemy}-dying/frame_`, suffix: '.png', start: 0, end: 8, zeroPad: 3 }),
                frameRate: 12,
                repeat: 0
            });

            this.anims.create({
                key: `${enemy}-knockdown-get-up`,
                frames: this.anims.generateFrameNames('enemies_1993', { prefix: `${enemy}-knockdown-get-up/frame_`, suffix: '.png', start: 0, end: 8, zeroPad: 3 }),
                frameRate: 12,
                repeat: 0
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
        
        this.children.each((c: any) => { if (c.y && c.type !== 'Image' && c.type !== 'Graphics') c.setDepth(c.y); });
        
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

            console.warn(`[AUDIO] '${finalMarker}' not found in atlas or cache!`);
            return null;

        } catch (e) {
            console.warn("Audio system error:", e);
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

        this.tweens.add({
            targets: drop,
            alpha: 0.2,
            duration: 100,
            yoyo: true,
            repeat: 5, 
            ease: 'Linear'
        });

        this.tweens.add({
            targets: drop,
            y: y, 
            duration: 350,
            ease: 'Bounce.easeOut'
        });
    }

    private collectItem(player: any, item: any) {
        if (Math.abs(player.y - item.y) > 30) return;

        item.destroy();
        this.playSFX(['melee_1', 'Metal-Impact-Shield'], 0.8); 
        
        if (player.playPickupAnim) {
            player.playPickupAnim();
        }

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
                const gangTypes = ['mup', 'dizel', 'dizelcic', 'rudar'];
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

    // ==========================================
    // THE ENEMY SUBCLASS FACTORY
    // Replaces the generic 'new Enemy' logic
    // ==========================================
    private spawnEnemyOffScreen(view: Phaser.Geom.Rectangle, type: string) {
        const spawnOnLeft = Math.random() > 0.5;
        const spawnX = spawnOnLeft ? view.left - 80 : view.right + 80;
        const spawnY = Phaser.Math.Between(800, 1050);
        
        let enemy: any;

        // Route the type to the highly-optimised custom classes
        switch (type) {
            case 'dizel':
                enemy = new Dizel(this, spawnX, spawnY);
                break;
            case 'dizelcic':
                enemy = new Dizelcic(this, spawnX, spawnY);
                break;
            case 'rudar':
                enemy = new Miner(this, spawnX, spawnY);
                break;
            default:
                // Fallback for MUP or Sloba until you build dedicated classes for them
                enemy = new Enemy(this, spawnX, spawnY, type); 
                break;
        }
        
        this.enemies.add(enemy);
        this.spawnedThisWave++;
    }

    private unlockCamera() {
        this.isLocked = false;
        this.currentSectorIndex++; 
        this.spawnedThisWave = 0;
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.physics.world.setBounds(0, 750, 4000, 330);
        this.updateReactHUD();
        
        if (this.currentSectorIndex < this.sectors.length) {
            const goText = this.add.text(this.player.x, this.player.y - 150, 'GO! ➡', { font: '900 64px "Metal Mania"', color: '#39ff14', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
            this.tweens.add({ targets: goText, x: goText.x + 100, alpha: 0, duration: 1500, onComplete: () => goText.destroy() });
        }
    }

    public registerEnemyDeath() {
        this.score += 100;
        this.updateReactHUD();
    }

    public updateReactHUD() {
        let eMaxHealth = 100;
        if (this.lastEngagedEnemy) {
            // Note: If you add a dedicated Sloba class later, make sure its maxHealth matches here!
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
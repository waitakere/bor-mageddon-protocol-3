import Phaser from 'phaser';
import { Marko } from '../entities/Marko';
import { Maja } from '../entities/Maja';
import { Darko } from '../entities/Darko';
import { Enemy } from '../entities/Enemy';

import { Dizel } from '../entities/Dizel';
import { Dizelcic } from '../entities/Dizelcic';
import { Miner } from '../entities/Miner';
import { SlobodanCEO } from '../entities/SlobodanCEO'; 
import { BreakableObject, BreakableType } from '../entities/BreakableObject';

export class MainLevel extends Phaser.Scene {
    public player!: any; 
    public enemies!: Phaser.Physics.Arcade.Group;
    public breakables!: Phaser.Physics.Arcade.Group; 
    public items!: Phaser.Physics.Arcade.Group;
    private shadows!: Phaser.GameObjects.Graphics;
    
    private skyLayer!: Phaser.GameObjects.Image;
    private midLayer!: Phaser.GameObjects.Image;
    private floorLayer!: Phaser.GameObjects.TileSprite;
    
    private actionKeys!: {
        q: Phaser.Input.Keyboard.Key;
        w: Phaser.Input.Keyboard.Key;
        a: Phaser.Input.Keyboard.Key;
        s: Phaser.Input.Keyboard.Key;
        space: Phaser.Input.Keyboard.Key;
    };

    private sectors = [
        { triggerX: 1000, totalEnemies: 4, maxActive: 2, isBossWave: false },  
        { triggerX: 2000, totalEnemies: 6, maxActive: 3, isBossWave: false }, 
        { triggerX: 3000, totalEnemies: 8, maxActive: 3, isBossWave: false }, 
        { triggerX: 3800, totalEnemies: 4, maxActive: 3, isBossWave: true }  
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

    create(data: any) {
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

        this.actionKeys = this.input.keyboard!.addKeys({
            q: Phaser.Input.Keyboard.KeyCodes.Q,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE
        }) as any;

        this.physics.world.setBounds(0, 750, 6000, 330); 
        
        const camW = this.cameras.main.width;

        this.skyLayer = this.add.image(0, 0, 'part1_sky')
            .setOrigin(0, 0).setDisplaySize(4000, 1080).setScrollFactor(0.1).setDepth(-300);
            
        this.midLayer = this.add.image(0, 750, 'part1_mid')
            .setOrigin(0, 1).setDisplaySize(4000, 650).setScrollFactor(0.5).setDepth(-200);
            
        this.floorLayer = this.add.tileSprite(0, 1080, camW, 330, 'part1_floor')
            .setOrigin(0, 1).setScrollFactor(0).setDepth(-100);

        this.shadows = this.add.graphics().setAlpha(0.4).setDepth(-50);
        
        this.items = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.breakables = this.physics.add.group(); 

        let charKey = 'marko';
        if (this.registry.has('selectedCharacter')) {
            charKey = this.registry.get('selectedCharacter');
        } else if (data && data.selectedCharacter) {
            charKey = data.selectedCharacter;
        } else if (window.localStorage.getItem('selectedCharacter')) {
            charKey = window.localStorage.getItem('selectedCharacter') || 'marko';
        }
        charKey = charKey.toLowerCase();
        
        switch(charKey) {
            case 'maja': this.player = new Maja(this, 200, 950); break;
            case 'darko': this.player = new Darko(this, 200, 950); break;
            default: this.player = new Marko(this, 200, 950); break;
        }

        this.player.setScale(1.7);
        
        const firstEnemy = new Dizel(this, 1000, 950);
        this.enemies.add(firstEnemy);

        this.scatterBreakables();

        this.physics.add.collider(this.player, this.enemies);
        this.physics.add.collider(this.enemies, this.enemies);
        
        this.physics.add.collider(this.player, this.breakables);
        this.physics.add.collider(this.enemies, this.breakables);
        
        this.physics.add.overlap(this.player, this.items, this.collectItem, undefined, this);

        this.cameras.main.setBounds(0, 0, 6000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.updateReactHUD();

        this.scene.pause();
        window.dispatchEvent(new CustomEvent('phaser-ready'));
    }

    private scatterBreakables() {
        const props = [
            { x: 600, y: 880, type: 'barrel' },
            { x: 1200, y: 1000, type: 'crate' },
            { x: 1800, y: 920, type: 'kontejner' },
            // KIOSK Y FIXED: Dropped down from 840 to 980 so it sits on the street!
            { x: 2600, y: 980, type: 'kiosk' }, 
            { x: 3200, y: 1040, type: 'barrel' },
            { x: 3700, y: 900, type: 'crate' }
        ];

        props.forEach(p => {
            const obj = new BreakableObject(this, p.x, p.y, p.type as BreakableType);
            this.breakables.add(obj);
        });
    }

    private createEnemyAnimations() {
        const texture = this.textures.get('enemies_1993');
        if (!texture || texture.key === '__MISSING') return;

        const allFrames = texture.getFrameNames();

        const enemyPrefixes = [
            { id: 'mup', search: 'mup' },
            { id: 'dizel', search: 'dizel' },
            { id: 'dizelcic', search: 'dizelcic' },
            { id: 'miner', search: 'miner' }, 
            { id: 'slobodan', search: 'slobodan' }
        ];

        const animTypes = ['walk', 'run', 'attack', 'punch-1', 'punch-2', 'melee', 'damage', 'dying', 'knockdown-get-up', 'jump', 'jump-punch', 'special-attack'];

        enemyPrefixes.forEach(enemy => {
            animTypes.forEach(animType => {
                const animKey = `${enemy.id}-${animType}`;
                if (this.anims.exists(animKey)) return;

                const searchStr = `${enemy.search}-${animType}/frame_`;
                const matchingFrames = allFrames.filter(f => f.includes(searchStr)).sort();

                if (matchingFrames.length > 0) {
                    const frameConfig: Phaser.Types.Animations.AnimationFrameConfig[] = matchingFrames.map(f => {
                        return { key: 'enemies_1993', frame: f };
                    });

                    this.anims.create({
                        key: animKey,
                        frames: frameConfig,
                        frameRate: 10,
                        repeat: (animType === 'walk' || animType === 'run') ? -1 : 0
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

        this.floorLayer.tilePositionX = this.cameras.main.scrollX;

        this.children.each((child: any) => {
            if (child.body && child.type === 'Sprite') { child.setAngle(0); child.rotation = 0; }
        });

        this.shadows.clear().fillStyle(0x000000, 0.5);
        this.shadows.fillEllipse(this.player.x, this.player.y, 70 * this.player.scale, 20);
        this.enemies.getChildren().forEach((e: any) => { if (!e.isDead) this.shadows.fillEllipse(e.x, e.y, e.width * 0.6, 20); });
        this.breakables.getChildren().forEach((b: any) => { if (!b.isDead) this.shadows.fillEllipse(b.x, b.y, b.displayWidth * 0.7, 15); });

        const cursors = this.input.keyboard!.createCursorKeys();
        const ak = this.actionKeys;

        const qJust = Phaser.Input.Keyboard.JustDown(ak.q);
        const wJust = Phaser.Input.Keyboard.JustDown(ak.w);
        const aJust = Phaser.Input.Keyboard.JustDown(ak.a);
        const sJust = Phaser.Input.Keyboard.JustDown(ak.s);

        const specialPressed = (ak.q.isDown && ak.w.isDown) && (qJust || wJust);
        const finisherPressed = (ak.a.isDown && ak.s.isDown) && (aJust || sJust);

        const keys = {
            up: cursors.up.isDown, 
            down: cursors.down.isDown, 
            left: cursors.left.isDown, 
            right: cursors.right.isDown,
            space: Phaser.Input.Keyboard.JustDown(ak.space),
            special: specialPressed,
            finisher: finisherPressed,
            p1: qJust && !specialPressed,
            p2: wJust && !specialPressed,
            k1: aJust && !finisherPressed,
            k2: sJust && !finisherPressed
        };

        this.player.update(keys);
        this.enemies.getChildren().forEach((e: any) => { if (e.updateAI && !e.isDead) e.updateAI(this.player); });
        
        this.children.each((c: any) => { 
            if (c.y && c.type !== 'Image' && c.type !== 'Graphics' && c.type !== 'TileSprite') {
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

    public triggerScreenGlitch(duration: number = 400) {
        const cam = this.cameras.main;
        cam.shake(duration, 0.02);
        
        try {
            if (cam.postFX) {
                const fx = cam.postFX.addChromaticAberration(0.04, 0.04);
                this.tweens.add({
                    targets: fx,
                    offsetX: 0,
                    offsetY: 0,
                    duration: duration,
                    ease: 'Power2',
                    onComplete: () => {
                        cam.postFX.remove(fx);
                    }
                });
            }
        } catch (e) {
            cam.flash(duration, 255, 0, 0, 0.3);
        }
    }

    public spawnHitEffect(x: number, y: number) {
        const exps = ['explosion_01', 'explosion_02', 'explosion_03', 'explosion_04'];
        const key = Phaser.Utils.Array.GetRandom(exps);

        if (!this.textures.exists(key)) return;

        const explosion = this.add.sprite(x, y, key);
        explosion.setDepth(9999); 
        explosion.setOrigin(0.5, 0.5); 
        
        let baseScale = 1.0;
        if (key === 'explosion_01') baseScale = 2.5; 
        else if (key === 'explosion_03') baseScale = 0.6; 
        else baseScale = 1.2; 

        explosion.setScale(baseScale); 
        
        this.tweens.add({
            targets: explosion,
            scale: baseScale * 1.3, 
            alpha: 0, 
            duration: 250,
            ease: 'Quad.easeOut',
            onComplete: () => explosion.destroy()
        });
    }

    public dropItem(x: number, y: number) {
        const items = ['item-burek', 'item-coffee', 'item-pork', 'item-beer', 'item-sandwich', 'item-rakija'];
        const randomItem = items[Math.floor(Math.random() * items.length)];
        
        const drop = this.physics.add.sprite(x, y - 40, randomItem);
        drop.setOrigin(0.5, 1); 
        this.items.add(drop);
        
        if (randomItem === 'item-pork') {
            drop.setScale(3.5); 
        } else if (randomItem === 'item-rakija') {
            drop.setScale(3.0); 
        } else if (randomItem === 'item-burek') {
            drop.setScale(2.5); 
        } else if (randomItem === 'item-beer') {
            drop.setScale(0.45); 
        } else if (randomItem === 'item-sandwich') {
            drop.setScale(0.8);
        } else {
            drop.setScale(1.5); 
        }

        const body = drop.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setSize(drop.width, drop.height);
            body.setOffset(0, 0);
        }
        
        this.tweens.add({ targets: drop, alpha: 0.2, duration: 100, yoyo: true, repeat: 5, ease: 'Linear' });
        this.tweens.add({ targets: drop, y: y, duration: 350, ease: 'Bounce.easeOut' });
    }

    private collectItem(player: any, item: any) {
        if (Math.abs(player.y - item.y) > 80) return; 
        
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

            if (currentSector.isBossWave) {
                if (activeEnemies < currentSector.maxActive && this.spawnedThisWave < currentSector.totalEnemies) {
                    const gangTypes = ['dizel', 'dizelcic', 'miner'];
                    const randomType = gangTypes[Math.floor(Math.random() * gangTypes.length)];
                    this.spawnEnemyOffScreen(cam.worldView, randomType);
                }
                
                if (this.spawnedThisWave >= currentSector.totalEnemies && activeEnemies === 0 && !this.bossSpawned) {
                    this.spawnEnemyOffScreen(cam.worldView, 'slobodan');
                    this.bossSpawned = true;
                }
                
                if (this.bossSpawned && activeEnemies === 0) {
                    this.unlockCamera();
                }
            } else {
                if (activeEnemies < currentSector.maxActive && this.spawnedThisWave < currentSector.totalEnemies) {
                    const gangTypes = ['dizel', 'dizelcic', 'miner'];
                    const randomType = gangTypes[Math.floor(Math.random() * gangTypes.length)];
                    this.spawnEnemyOffScreen(cam.worldView, randomType);
                }
                if (this.spawnedThisWave >= currentSector.totalEnemies && activeEnemies === 0) {
                    this.unlockCamera();
                }
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
            case 'miner': enemy = new Miner(this, spawnX, spawnY); break; 
            case 'slobodan': enemy = new SlobodanCEO(this, spawnX, spawnY); break; 
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
            eMaxHealth = this.lastEngagedEnemy.skinPrefix === 'slobodan' ? 600 : 100;
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
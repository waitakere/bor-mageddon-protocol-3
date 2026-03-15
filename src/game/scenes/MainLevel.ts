import Phaser from 'phaser';
import { Marko } from '../entities/Marko';
import { Maja } from '../entities/Maja';
import { Darko } from '../entities/Darko';
import { Enemy } from '../entities/Enemy';

export class MainLevel extends Phaser.Scene {
    public player!: any; 
    public enemies!: Phaser.Physics.Arcade.Group;
    public breakables!: Phaser.Physics.Arcade.Group;
    public items!: Phaser.Physics.Arcade.Group;
    public projectiles!: Phaser.Physics.Arcade.Group;
    private shadows!: Phaser.GameObjects.Graphics;
    
    // Wave Manager Data
    private sectors = [
        { triggerX: 800, totalEnemies: 4, maxActive: 2 },
        { triggerX: 1600, totalEnemies: 6, maxActive: 3 },
        { triggerX: 2400, totalEnemies: 8, maxActive: 3 },
        { triggerX: 3200, totalEnemies: 4, maxActive: 4 } // Final Sector (Sloba appears here)
    ];
    private currentSectorIndex: number = 0;
    private isLocked: boolean = false;
    private spawnedThisWave: number = 0;
    public killedThisWave: number = 0; 
    private bossSpawned: boolean = false;
    public score: number = 0;

    constructor() { super({ key: 'MainLevel' }); }

    create() {
        this.physics.world.setBounds(0, 750, 4000, 330); 
        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setDisplaySize(4000, 1080).setScrollFactor(0.1);
        this.add.image(0, 1080, 'part1_mid').setOrigin(0, 1).setDisplaySize(4000, 650).setScrollFactor(0.4);
        this.add.image(0, 1080, 'part1_floor').setOrigin(0, 1).setDisplaySize(4000, 450).setScrollFactor(1);

        this.shadows = this.add.graphics().setAlpha(0.4);
        this.breakables = this.physics.add.group({ immovable: true });
        this.items = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.projectiles = this.physics.add.group();

        const charKey = this.registry.get('selectedCharacter') || 'marko';
        switch(charKey) {
            case 'maja': this.player = new Maja(this, 200, 950); break;
            case 'darko': this.player = new Darko(this, 200, 950); break;
            default: this.player = new Marko(this, 200, 950); break;
        }

        this.player.setScale(1);
        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.updateReactHUD();
    }

    update() {
        if (!this.player || this.player.isDead) return;

        this.handleWaveManager();

        this.children.each((child: any) => {
            if (child.body && child.type === 'Sprite') { child.setAngle(0); child.rotation = 0; }
        });

        // Shadows
        this.shadows.clear().fillStyle(0x000000, 0.5);
        this.shadows.fillEllipse(this.player.x, this.player.y, 70, 20);
        this.enemies.getChildren().forEach((e: any) => { if (!e.isDead) this.shadows.fillEllipse(e.x, e.y, e.width*0.6, 20); });

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
        
        // Depth sorting and AI
        this.enemies.getChildren().forEach((e: any) => { if (e.updateAI && !e.isDead) e.updateAI(this.player); });
        this.children.each((c: any) => { if (c.y && c.type !== 'Image' && c.type !== 'Graphics') c.setDepth(c.y); });
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

            // Spawn Regular Enemies
            if (activeEnemies < currentSector.maxActive && this.spawnedThisWave < currentSector.totalEnemies) {
                // Array of regular gangs
                const gangTypes = ['mup', 'dizel', 'dizelcic', 'rudar'];
                const randomType = gangTypes[Math.floor(Math.random() * gangTypes.length)];
                this.spawnEnemyOffScreen(cam.worldView, randomType);
            }

            // Spawn Sloba in the final sector
            if (isFinalSector && !this.bossSpawned && this.killedThisWave >= currentSector.totalEnemies - 1) {
                this.spawnEnemyOffScreen(cam.worldView, 'sloba');
                this.bossSpawned = true;
            }

            const totalToKill = isFinalSector ? currentSector.totalEnemies + 1 : currentSector.totalEnemies;
            if (this.killedThisWave >= totalToKill) {
                this.unlockCamera();
            }
        }
    }

    private spawnEnemyOffScreen(view: Phaser.Geom.Rectangle, type: string) {
        const spawnOnLeft = Math.random() > 0.5;
        const spawnX = spawnOnLeft ? view.left - 80 : view.right + 80;
        const spawnY = Phaser.Math.Between(800, 1050);
        
        const enemy = new Enemy(this, spawnX, spawnY, type); 
        this.enemies.add(enemy);
        this.spawnedThisWave++;
    }

    private unlockCamera() {
        this.isLocked = false;
        this.currentSectorIndex++; 
        this.spawnedThisWave = 0;
        this.killedThisWave = 0;
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
        this.killedThisWave++;
        this.updateReactHUD();
    }

    public updateReactHUD() {
        window.dispatchEvent(new CustomEvent('update-phaser-hud', {
            detail: { health: this.player?.health, smf: this.player?.smfMeter, score: this.score, showGo: false }
        }));
    }
}
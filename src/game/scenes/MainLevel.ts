import Phaser from 'phaser';
import { Marko } from '../entities/Marko';
import { MUP } from '../entities/MUP';
import { SlobodanCEO } from '../entities/SlobodanCEO';

export class MainLevel extends Phaser.Scene {
    public player!: Marko;
    public enemies!: Phaser.Physics.Arcade.Group;
    public breakables!: Phaser.Physics.Arcade.Group;
    public items!: Phaser.Physics.Arcade.Group;
    public projectiles!: Phaser.Physics.Arcade.Group;
    private shadows!: Phaser.GameObjects.Graphics;
    
    // Beat 'em up Lock System
    private currentLockX: number = 0;
    private isLocked: boolean = false;
    private sectors: number[] = [800, 1600, 2400, 3200];

    // Player State Sync
    private equippedWeapon: string | null = null;
    private weaponDurability: number = 0;
    private score: number = 0;

    constructor() {
        super({ key: 'MainLevel' });
    }

    create() {
        // 1. WORLD & PHYSICS BOUNDS (The Walkable Road)
        // Restricted Y so they can't walk into the sky/factories
        this.physics.world.setBounds(0, 750, 4000, 330); 

        // 2. PARALLAX BACKGROUNDS
        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setDisplaySize(4000, 1080).setScrollFactor(0.1);
        this.add.image(0, 1080, 'part1_mid').setOrigin(0, 1).setDisplaySize(4000, 650).setScrollFactor(0.4);
        this.add.image(0, 1080, 'part1_floor').setOrigin(0, 1).setDisplaySize(4000, 450).setScrollFactor(1);

        // 3. SHADOW LAYER (Rendered below characters)
        this.shadows = this.add.graphics();
        this.shadows.setAlpha(0.4);

        // 4. GROUPS
        this.breakables = this.physics.add.group({ immovable: true });
        this.items = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.projectiles = this.physics.add.group();

        // 5. PROPS
        const propLocations = [
            { x: 600, y: 980, type: 'barrel', hp: 2 },
            { x: 1400, y: 950, type: 'crate', hp: 3 },
            { x: 2200, y: 1020, type: 'kontejner', hp: 5 },
            { x: 2800, y: 850, type: 'barrel', hp: 2 }
        ];

        propLocations.forEach(loc => {
            const prop = this.physics.add.sprite(loc.x, loc.y, loc.type).setOrigin(0.5, 1);
            prop.setScale(loc.type === 'kontejner' ? 1.2 : 0.8);
            prop.setData('health', loc.hp);
            this.breakables.add(prop);
        });

        // 6. PLAYER SETUP
        this.player = new Marko(this, 200, 950);
        this.player.setScale(1.5).setOrigin(0.5, 1);

        // 7. ENEMY SETUP
        this.spawnInitialEnemies();

        // 8. CAMERA
        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // 9. COLLISION & OVERLAP RULES
        this.physics.add.collider(this.player, this.breakables);
        this.physics.add.collider(this.enemies, this.breakables);
        this.physics.add.overlap(this.player, this.items, (p, item) => this.handleItemPickup(item as Phaser.GameObjects.Sprite));
        
        // Projectile vs Enemy (Weapon Throw)
        this.physics.add.overlap(this.projectiles, this.enemies, (proj, enemy) => {
            (enemy as any).takeDamage(50);
            this.applyDeathEffect(proj as Phaser.GameObjects.Sprite);
        });

        // 10. INPUTS
        this.input.keyboard!.on('keydown-A', () => this.handlePlayerAttack());

        this.updateReactHUD();
    }

    private spawnInitialEnemies() {
        const mup1 = new MUP(this, 1000, 950);
        const mup2 = new MUP(this, 1200, 850);
        this.enemies.addMultiple([mup1, mup2]);
    }

    private handlePlayerAttack() {
        // Weapon Throw Mechanic (on final hit)
        if (this.weaponDurability === 1) {
            this.throwWeapon();
            return;
        }

        const range = this.equippedWeapon ? 120 : 80;
        const attackX = this.player.flipX ? this.player.x - range : this.player.x + range;
        const attackBounds = new Phaser.Geom.Rectangle(attackX - 40, this.player.y - 100, 80, 200);

        let hitAnything = false;

        // Hit Enemies
        this.enemies.getChildren().forEach((enemy: any) => {
            if (!enemy.isDead && attackBounds.contains(enemy.x, enemy.y)) {
                enemy.takeDamage(this.equippedWeapon ? 45 : 25);
                hitAnything = true;
                if (enemy.health <= 0) {
                    this.score += 500;
                    this.applyDeathEffect(enemy);
                }
            }
        });

        // Hit Breakables
        this.breakables.getChildren().forEach((prop: any) => {
            if (attackBounds.contains(prop.x, prop.y)) {
                let hp = prop.getData('health') - 1;
                prop.setData('health', hp);
                hitAnything = true;
                if (hp <= 0) {
                    this.spawnLoot(prop.x, prop.y);
                    this.applyDeathEffect(prop);
                }
            }
        });

        if (hitAnything && this.equippedWeapon) {
            this.weaponDurability--;
            this.updateReactHUD();
        }
    }

    private throwWeapon() {
        if (!this.equippedWeapon) return;
        const weapon = this.projectiles.create(this.player.x, this.player.y - 60, this.equippedWeapon).setScale(1.2);
        weapon.body.setVelocity(this.player.flipX ? -750 : 750, -350);
        weapon.body.setAngularVelocity(700);
        weapon.body.setGravityY(800);
        
        this.equippedWeapon = null;
        this.weaponDurability = 0;
        this.updateReactHUD();
    }

    private spawnLoot(x: number, y: number) {
        const lootTable = ['item-sandwich', 'item-beer', 'axe', 'bat-2', 'crowbar-1'];
        const type = lootTable[Math.floor(Math.random() * lootTable.length)];
        const item = this.items.create(x, y - 50, type).setScale(1.2).setOrigin(0.5, 1);
        
        this.tweens.add({
            targets: item,
            y: y - 100,
            duration: 300,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }

    private handleItemPickup(item: Phaser.GameObjects.Sprite) {
        const type = item.texture.key;
        if (type.includes('item')) {
            if (type === 'item-sandwich') this.player.health = Math.min(this.player.health + 30, 100);
            if (type === 'item-beer') this.player.smfMeter = Math.min(this.player.smfMeter + 40, 100);
        } else {
            this.equippedWeapon = type;
            this.weaponDurability = 6;
        }
        item.destroy();
        this.updateReactHUD();
    }

    private applyDeathEffect(target: any) {
        if (target.body) target.body.enable = false;
        target.setTint(0xff0000);
        this.tweens.add({
            targets: target,
            alpha: 0,
            duration: 100,
            repeat: 5,
            onComplete: () => target.destroy()
        });
    }

    update() {
        if (!this.player) return;

        this.handleCameraLock();

        // --- ARCADE SHADOW RENDERING ---
        this.shadows.clear();
        this.shadows.fillStyle(0x000000, 0.5);
        this.shadows.fillEllipse(this.player.x, this.player.y, 70, 20); // Player shadow
        
        this.enemies.getChildren().forEach((e: any) => {
            if (!e.isDead) this.shadows.fillEllipse(e.x, e.y, 70, 20);
        });

        this.items.getChildren().forEach((i: any) => {
            this.shadows.fillEllipse(i.x, i.y, 40, 15);
        });

        // --- INPUT UPDATE ---
        const cursors = this.input.keyboard!.createCursorKeys();
        (this.player as any).update({
            up: cursors.up.isDown, down: cursors.down.isDown,
            left: cursors.left.isDown, right: cursors.right.isDown,
            punch: this.input.keyboard!.addKey('A').isDown,
            kicking: this.input.keyboard!.addKey('S').isDown
        });

        // --- AI & DEPTH ---
        this.enemies.getChildren().forEach((enemy: any) => {
            if (enemy.updateAI && !enemy.isDead) enemy.updateAI(this.player);
        });

        this.children.each((child: any) => {
            if (child.y && child.type !== 'Image' && child.type !== 'Graphics') { 
                child.setDepth(child.y);
            }
        });
    }

    private handleCameraLock() {
        const cam = this.cameras.main;
        for (const lockPoint of this.sectors) {
            if (this.player.x > lockPoint && this.player.x < lockPoint + 50 && !this.isLocked) {
                const enemiesInSect = this.enemies.getChildren().filter((e: any) => !e.isDead && e.x < lockPoint + 1000);
                if (enemiesInSect.length > 0) {
                    this.isLocked = true;
                    this.currentLockX = lockPoint;
                    cam.stopFollow();
                    cam.setScroll(lockPoint - (cam.width / 2), 0);
                    this.physics.world.setBounds(lockPoint - (cam.width / 2), 750, cam.width, 330);
                    this.updateReactHUD();
                }
            }
        }

        if (this.isLocked) {
            const screenEnemies = this.enemies.getChildren().filter((e: any) => 
                !e.isDead && Math.abs(e.x - this.currentLockX) < 600
            );
            if (screenEnemies.length === 0) {
                this.isLocked = false;
                cam.startFollow(this.player, true, 0.08, 0.08);
                this.physics.world.setBounds(0, 750, 4000, 330);
                this.updateReactHUD();
            }
        }
    }

    private updateReactHUD() {
        window.dispatchEvent(new CustomEvent('update-phaser-hud', {
            detail: {
                health: this.player?.health,
                smf: this.player?.smfMeter,
                score: this.score,
                weapon: this.equippedWeapon ? { type: this.equippedWeapon, durability: this.weaponDurability } : null,
                showGo: !this.isLocked && this.player?.x < 3600
            }
        }));
    }
}
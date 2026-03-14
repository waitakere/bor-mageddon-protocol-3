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
    
    // Beat 'em up Lock System
    private currentLockX: number = 0;
    private isLocked: boolean = false;
    private sectors: number[] = [800, 1600, 2400, 3200];

    // Weapon System State
    private equippedWeapon: string | null = null;
    private weaponDurability: number = 0;

    constructor() {
        super({ key: 'MainLevel' });
    }

    create() {
        // ==========================================
        // 1. WORLD SETUP & WALKING BOUNDARIES
        // ==========================================
        this.physics.world.setBounds(0, 650, 4000, 430); 
        
        // ==========================================
        // 2. GROUPS
        // ==========================================
        this.breakables = this.physics.add.group({ immovable: true });
        this.items = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.projectiles = this.physics.add.group();

        // ==========================================
        // 3. ENVIRONMENT
        // ==========================================
        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setScrollFactor(0.1); 
        this.add.image(0, 1080, 'part1_mid').setOrigin(0, 1).setScrollFactor(0.4); 
        this.add.image(0, 1080, 'part1_floor').setOrigin(0, 1).setScrollFactor(1); 

        // ==========================================
        // 4. POPULATE PROPS
        // ==========================================
        const propLocations = [
            { x: 600, y: 800, type: 'barrel' },
            { x: 1400, y: 750, type: 'crate' },
            { x: 2200, y: 900, type: 'kontejner' },
            { x: 2800, y: 800, type: 'barrel' }
        ];

        propLocations.forEach(loc => {
            const prop = this.physics.add.sprite(loc.x, loc.y, loc.type).setOrigin(0.5, 1);
            prop.setData('health', 2); 
            this.breakables.add(prop);
        });

        // ==========================================
        // 5. PLAYER & CAMERA
        // ==========================================
        this.player = new Marko(this, 200, 850);
        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // ==========================================
        // 6. SPAWN ENEMIES
        // ==========================================
        const mup1 = new MUP(this, 1000, 850);
        const boss = new SlobodanCEO(this, 3800, 850);
        this.enemies.addMultiple([mup1, boss]);

        // ==========================================
        // 7. COLLISIONS & OVERLAPS
        // ==========================================
        this.physics.add.collider(this.player, this.breakables);
        this.physics.add.collider(this.enemies, this.breakables);
        
        // Item Pickup
        this.physics.add.overlap(this.player, this.items, (p, item) => this.handleItemPickup(item as Phaser.GameObjects.Sprite));
        
        // Projectile Hit
        this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => {
            (enemy as any).takeDamage(50);
            this.applyDeathEffect(projectile as Phaser.GameObjects.Sprite);
        });

        // Attack Input
        this.input.keyboard!.on('keydown-A', () => this.handlePlayerAttack());

        // Initialize HUD
        this.updateReactHUD();
    }

    private handlePlayerAttack() {
        // If we have 1 durability left, the 6th hit is a THROW
        if (this.weaponDurability === 1) {
            this.throwWeapon();
            return;
        }

        const range = this.equippedWeapon ? 110 : 70;
        const attackX = this.player.flipX ? this.player.x - range : this.player.x + range;
        const attackBounds = new Phaser.Geom.Rectangle(attackX - 30, this.player.y - 60, 60, 120);

        let hitSomething = false;

        // Check Enemies
        this.enemies.getChildren().forEach((enemy: any) => {
            if (!enemy.isDead && attackBounds.contains(enemy.x, enemy.y)) {
                enemy.takeDamage(this.equippedWeapon ? 40 : 25);
                hitSomething = true;
                if (enemy.health <= 0) this.applyDeathEffect(enemy);
            }
        });

        // Check Breakables
        this.breakables.getChildren().forEach((prop: any) => {
            if (attackBounds.contains(prop.x, prop.y)) {
                let hp = prop.getData('health') - 1;
                prop.setData('health', hp);
                hitSomething = true;
                if (hp <= 0) {
                    this.spawnLoot(prop.x, prop.y);
                    this.applyDeathEffect(prop);
                }
            }
        });

        if (hitSomething && this.equippedWeapon) {
            this.weaponDurability--;
            this.updateReactHUD();
        }
    }

    private throwWeapon() {
        if (!this.equippedWeapon) return;

        const weaponSprite = this.projectiles.create(this.player.x, this.player.y - 40, this.equippedWeapon);
        weaponSprite.setFlipX(this.player.flipX);
        
        const velocity = this.player.flipX ? -600 : 600;
        weaponSprite.body.setVelocity(velocity, -200);
        weaponSprite.body.setAngularVelocity(500);
        weaponSprite.body.setGravityY(500);

        this.equippedWeapon = null;
        this.weaponDurability = 0;
        this.updateReactHUD();
    }

    private spawnLoot(x: number, y: number) {
        const lootTable = ['item-sandwich', 'item-beer', 'axe', 'crowbar-1', 'bat-2'];
        const randomItem = lootTable[Math.floor(Math.random() * lootTable.length)];
        const item = this.items.create(x, y - 20, randomItem).setOrigin(0.5, 1);
        
        this.tweens.add({
            targets: item,
            y: y - 60,
            duration: 300,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }

    private handleItemPickup(item: Phaser.GameObjects.Sprite) {
        const type = item.texture.key;
        
        if (type.includes('item')) {
            if (type === 'item-sandwich') this.player.health = Math.min(this.player.health + 30, 100);
            if (type === 'item-beer') this.player.smfMeter = Math.min(this.player.smfMeter + 50, 100);
        } else {
            // Pick up Melee Weapon
            this.equippedWeapon = type;
            this.weaponDurability = 6;
        }

        item.destroy();
        this.updateReactHUD();
    }

    private updateReactHUD() {
        window.dispatchEvent(new CustomEvent('update-phaser-hud', {
            detail: {
                health: this.player?.health || 100,
                smf: this.player?.smfMeter || 0,
                weapon: this.equippedWeapon ? { type: this.equippedWeapon, durability: this.weaponDurability } : null
            }
        }));
    }

    private applyDeathEffect(target: Phaser.GameObjects.Sprite) {
        if (target.body) (target.body as Phaser.Physics.Arcade.Body).enable = false;
        target.setTint(0xff3333);
        this.tweens.add({
            targets: target,
            alpha: { from: 0.6, to: 0 },
            duration: 100,
            repeat: 5,
            onComplete: () => target.destroy()
        });
    }

    update(time: number, delta: number) {
        if (!this.player) return;

        this.handleCameraLock();

        const cursors = this.input.keyboard!.createCursorKeys();
        
        (this.player as any).update({
            up: cursors.up.isDown,
            down: cursors.down.isDown,
            left: cursors.left.isDown,
            right: cursors.right.isDown,
            punch: this.input.keyboard!.addKey('A').isDown,
            kicking: this.input.keyboard!.addKey('S').isDown
        });

        // AI Update
        this.enemies.getChildren().forEach((enemy: any) => {
            if (enemy.updateAI && !enemy.isDead) enemy.updateAI(this.player);
        });

        // Depth Sorting
        this.children.each((child: any) => {
            if (child.y && child.type !== 'Image') { 
                child.setDepth(child.y);
            }
        });
    }

    private handleCameraLock() {
        const cam = this.cameras.main;
        for (const lockPoint of this.sectors) {
            if (this.player.x > lockPoint && this.player.x < lockPoint + 50 && !this.isLocked) {
                const activeEnemies = this.enemies.getChildren().filter((e: any) => !e.isDead && e.x < lockPoint + 1000);
                if (activeEnemies.length > 0) {
                    this.isLocked = true;
                    this.currentLockX = lockPoint;
                    cam.stopFollow();
                    cam.setScroll(lockPoint - (cam.width / 2), 0);
                    this.physics.world.setBounds(lockPoint - (cam.width / 2), 650, cam.width, 430);
                }
            }
        }

        if (this.isLocked) {
            const screenEnemies = this.enemies.getChildren().filter((e: any) => 
                !e.isDead && e.x > (this.currentLockX - 500) && e.x < (this.currentLockX + 500)
            );
            if (screenEnemies.length === 0) {
                this.isLocked = false;
                cam.startFollow(this.player, true, 0.08, 0.08);
                this.physics.world.setBounds(0, 650, 4000, 430);
            }
        }
    }
}
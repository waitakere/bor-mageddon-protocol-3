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
        // 1. PHYSICS & WORLD
        this.physics.world.setBounds(0, 650, 4000, 430); 
        this.breakables = this.physics.add.group({ immovable: true });
        this.items = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.projectiles = this.physics.add.group();

        // 2. ENVIRONMENT
        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setScrollFactor(0.1); 
        this.add.image(0, 1080, 'part1_mid').setOrigin(0, 1).setScrollFactor(0.4); 
        this.add.image(0, 1080, 'part1_floor').setOrigin(0, 1).setScrollFactor(1); 

        // 3. PROPS
        const propLocations = [
            { x: 600, y: 800, type: 'barrel' },
            { x: 1400, y: 750, type: 'crate' },
            { x: 2200, y: 900, type: 'kontejner' }
        ];
        propLocations.forEach(loc => {
            const prop = this.physics.add.sprite(loc.x, loc.y, loc.type).setOrigin(0.5, 1);
            prop.setData('health', 2); 
            this.breakables.add(prop);
        });

        // 4. PLAYER & CAMERA
        this.player = new Marko(this, 200, 850);
        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // 5. ENEMIES
        this.enemies.add(new MUP(this, 1000, 850));

        // 6. INTERACTIONS
        this.physics.add.collider(this.player, this.breakables);
        this.physics.add.overlap(this.player, this.items, (p, item) => this.handleItemPickup(item as Phaser.GameObjects.Sprite));
        
        // Weapon Projectile vs Enemies
        this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => {
            (enemy as any).takeDamage(50);
            this.applyDeathEffect(projectile as Phaser.GameObjects.Sprite);
        });

        this.input.keyboard!.on('keydown-A', () => this.handlePlayerAttack());
    }

    private handlePlayerAttack() {
        if (this.weaponDurability === 1) {
            this.throwWeapon();
            return;
        }

        const range = this.equippedWeapon ? 120 : 70;
        const attackX = this.player.flipX ? this.player.x - range : this.player.x + range;
        const attackBounds = new Phaser.Geom.Rectangle(attackX - 30, this.player.y - 60, 60, 120);

        let hitSomething = false;

        this.enemies.getChildren().forEach((enemy: any) => {
            if (!enemy.isDead && attackBounds.contains(enemy.x, enemy.y)) {
                enemy.takeDamage(this.equippedWeapon ? 40 : 25);
                hitSomething = true;
                if (enemy.health <= 0) this.applyDeathEffect(enemy);
            }
        });

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
            console.log(`Weapon Durability: ${this.weaponDurability}`);
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
        console.log("WEAPON THROWN!");
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
            this.events.emit('update-health', this.player.health);
        } else {
            // Pick up Melee Weapon
            this.equippedWeapon = type;
            this.weaponDurability = 6;
            console.log(`Equipped: ${type} (6 hits)`);
        }
        item.destroy();
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
            up: cursors.up.isDown, down: cursors.down.isDown,
            left: cursors.left.isDown, right: cursors.right.isDown,
            punch: this.input.keyboard!.addKey('A').isDown,
            kicking: this.input.keyboard!.addKey('S').isDown
        });

        this.enemies.getChildren().forEach((enemy: any) => {
            if (enemy.updateAI && !enemy.isDead) enemy.updateAI(this.player);
        });

        this.children.each((child: any) => {
            if (child.y && child.type !== 'Image') child.setDepth(child.y);
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
                    this.physics.world.setBounds(lockPoint - (cam.width / 2), 650, cam.width, 430);
                }
            }
        }
        if (this.isLocked && this.enemies.getChildren().filter((e: any) => !e.isDead && Math.abs(e.x - this.currentLockX) < 600).length === 0) {
            this.isLocked = false;
            cam.startFollow(this.player, true, 0.08, 0.08);
            this.physics.world.setBounds(0, 650, 4000, 430);
        }
    }
}
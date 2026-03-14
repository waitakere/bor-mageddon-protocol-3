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
    
    private sectors: number[] = [800, 1600, 2400, 3200];
    private isLocked: boolean = false;
    private currentLockX: number = 0;
    private equippedWeapon: string | null = null;
    private weaponDurability: number = 0;

    constructor() {
        super({ key: 'MainLevel' });
    }

    create() {
        // 1. PHYSICS BOUNDS (The Walkable Pavement)
        this.physics.world.setBounds(0, 720, 4000, 360); 

        // 2. BACKGROUNDS (Scaling & Positioning)
        // Sky
        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setDisplaySize(4000, 1080).setScrollFactor(0.1);
        // Midground (Factories) - Scaled to fit height
        this.add.image(0, 1080, 'part1_mid').setOrigin(0, 1).setDisplaySize(4000, 600).setScrollFactor(0.4);
        // Floor (Road)
        this.add.image(0, 1080, 'part1_floor').setOrigin(0, 1).setDisplaySize(4000, 400).setScrollFactor(1);

        // 3. GROUPS
        this.breakables = this.physics.add.group({ immovable: true });
        this.items = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.projectiles = this.physics.add.group();

        // 4. PROPS (Fixed Proportions)
        const propLocations = [
            { x: 600, y: 950, type: 'barrel', scale: 1.5 },
            { x: 1400, y: 920, type: 'crate', scale: 1.2 },
            { x: 2200, y: 980, type: 'kontejner', scale: 1.8 }
        ];

        propLocations.forEach(loc => {
            const prop = this.physics.add.sprite(loc.x, loc.y, loc.type).setOrigin(0.5, 1);
            prop.setScale(loc.scale); // Scale them down to look natural
            prop.setData('health', 2);
            this.breakables.add(prop);
        });

        // 5. PLAYER
        this.player = new Marko(this, 200, 950);
        this.player.setScale(1.8); // Ensure Marko is sized appropriately

        // 6. ENEMIES (Fixed Rotation & Scale)
        const mup1 = new MUP(this, 1000, 950);
        mup1.setScale(1.8);
        // CRITICAL: Stop the MUP from rotating when walking
        if (mup1.body) {
            (mup1.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
        this.enemies.add(mup1);

        // 7. CAMERA
        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // 8. COLLISIONS
        this.physics.add.collider(this.player, this.breakables);
        this.physics.add.collider(this.enemies, this.breakables);
        this.physics.add.overlap(this.player, this.items, (p, item) => this.handleItemPickup(item as Phaser.GameObjects.Sprite));
        
        this.input.keyboard!.on('keydown-A', () => this.handlePlayerAttack());
        this.updateReactHUD();
    }

    private handlePlayerAttack() {
        if (this.weaponDurability === 1) { this.throwWeapon(); return; }

        const range = this.equippedWeapon ? 120 : 80;
        const attackX = this.player.flipX ? this.player.x - range : this.player.x + range;
        const attackBounds = new Phaser.Geom.Rectangle(attackX - 40, this.player.y - 100, 80, 200);

        this.enemies.getChildren().forEach((enemy: any) => {
            if (!enemy.isDead && attackBounds.contains(enemy.x, enemy.y)) {
                enemy.takeDamage(this.equippedWeapon ? 40 : 25);
                if (enemy.health <= 0) this.applyDeathEffect(enemy);
                if (this.equippedWeapon) this.weaponDurability--;
            }
        });

        this.breakables.getChildren().forEach((prop: any) => {
            if (attackBounds.contains(prop.x, prop.y)) {
                let hp = prop.getData('health') - 1;
                prop.setData('health', hp);
                if (hp <= 0) { this.spawnLoot(prop.x, prop.y); this.applyDeathEffect(prop); }
                if (this.equippedWeapon) this.weaponDurability--;
            }
        });
        this.updateReactHUD();
    }

    private spawnLoot(x: number, y: number) {
        const lootTable = ['item-sandwich', 'item-beer', 'axe', 'bat-2'];
        const type = lootTable[Math.floor(Math.random() * lootTable.length)];
        const item = this.items.create(x, y - 50, type).setScale(1.5);
        this.tweens.add({ targets: item, y: y - 100, duration: 300, yoyo: true, ease: 'Back.easeOut' });
    }

    private handleItemPickup(item: Phaser.GameObjects.Sprite) {
        const type = item.texture.key;
        if (type.includes('item')) {
            if (type === 'item-sandwich') this.player.health = Math.min(this.player.health + 30, 100);
        } else {
            this.equippedWeapon = type;
            this.weaponDurability = 6;
        }
        item.destroy();
        this.updateReactHUD();
    }

    private throwWeapon() {
        const weapon = this.projectiles.create(this.player.x, this.player.y - 60, this.equippedWeapon!).setScale(1.5);
        weapon.body.setVelocity(this.player.flipX ? -700 : 700, -300);
        weapon.body.setAngularVelocity(600);
        weapon.body.setGravityY(600);
        this.equippedWeapon = null;
        this.weaponDurability = 0;
        this.updateReactHUD();
    }

    private updateReactHUD() {
        window.dispatchEvent(new CustomEvent('update-phaser-hud', {
            detail: {
                health: this.player?.health,
                weapon: this.equippedWeapon ? { type: this.equippedWeapon, durability: this.weaponDurability } : null
            }
        }));
    }

    private applyDeathEffect(target: any) {
        if (target.body) target.body.enable = false;
        target.setTint(0xff0000);
        this.tweens.add({ targets: target, alpha: 0, duration: 100, repeat: 5, onComplete: () => target.destroy() });
    }

    update() {
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
            // Ensure enemy rotation stays at 0
            enemy.setRotation(0); 
        });

        this.children.each((child: any) => {
            if (child.y && child.type !== 'Image') child.setDepth(child.y);
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
                    this.physics.world.setBounds(lockPoint - (cam.width / 2), 720, cam.width, 360);
                }
            }
        }
        if (this.isLocked && this.enemies.getChildren().filter((e: any) => !e.isDead && Math.abs(e.x - this.currentLockX) < 600).length === 0) {
            this.isLocked = false;
            cam.startFollow(this.player, true, 0.08, 0.08);
            this.physics.world.setBounds(0, 720, 4000, 360);
        }
    }
}
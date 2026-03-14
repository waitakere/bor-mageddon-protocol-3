import Phaser from 'phaser';
import { Marko } from '../entities/Marko';
import { MUP } from '../entities/MUP';
import { SlobodanCEO } from '../entities/SlobodanCEO';

export class MainLevel extends Phaser.Scene {
    public player!: Marko;
    public enemies!: Phaser.Physics.Arcade.Group;
    public breakables!: Phaser.Physics.Arcade.Group;
    
    private currentLockX: number = 0;
    private isLocked: boolean = false;
    private sectors: number[] = [800, 1600, 2400, 3200];

    constructor() {
        super({ key: 'MainLevel' });
    }

    create() {
        // 1. WORLD SETUP
        this.physics.world.setBounds(0, 650, 4000, 430); 
        
        // 2. ENVIRONMENT
        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setScrollFactor(0.1); 
        this.add.image(0, 1080, 'part1_mid').setOrigin(0, 1).setScrollFactor(0.4); 
        this.add.image(0, 1080, 'part1_floor').setOrigin(0, 1).setScrollFactor(1); 

        // 3. BREAKABLES
        this.breakables = this.physics.add.group({ immovable: true });
        const propLocations = [
            { x: 500, y: 800, type: 'barrel' },
            { x: 1200, y: 750, type: 'crate' },
            { x: 1800, y: 900, type: 'kontejner' }
        ];
        propLocations.forEach(loc => {
            const prop = this.physics.add.sprite(loc.x, loc.y, loc.type).setOrigin(0.5, 1);
            prop.setData('health', 3); // Props take 3 hits
            this.breakables.add(prop);
        });

        // 4. PLAYER
        this.player = new Marko(this, 200, 850);

        // 5. ENEMIES
        this.enemies = this.physics.add.group();
        const mup1 = new MUP(this, 700, 850);
        const boss = new SlobodanCEO(this, 3800, 850);
        this.enemies.addMultiple([mup1, boss]);

        // 6. CAMERA
        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // 7. PHYSICS OVERLAPS (Collisions)
        this.physics.add.collider(this.player, this.breakables);
        this.physics.add.collider(this.enemies, this.breakables);
        
        // This is where the punching logic happens
        this.input.keyboard!.on('keydown-A', () => this.handlePlayerAttack());
    }

    private handlePlayerAttack() {
        // Define an attack hitbox in front of the player
        const range = 60;
        const attackX = this.player.flipX ? this.player.x - range : this.player.x + range;
        const attackBounds = new Phaser.Geom.Rectangle(attackX - 25, this.player.y - 50, 50, 100);

        // 1. Check Enemies
        this.enemies.getChildren().forEach((enemy: any) => {
            if (!enemy.isDead && attackBounds.contains(enemy.x, enemy.y)) {
                enemy.takeDamage(20); // Custom damage logic
                if (enemy.health <= 0) this.applyDeathEffect(enemy);
            }
        });

        // 2. Check Breakables
        this.breakables.getChildren().forEach((prop: any) => {
            if (attackBounds.contains(prop.x, prop.y)) {
                let hp = prop.getData('health') - 1;
                prop.setData('health', hp);
                if (hp <= 0) this.applyDeathEffect(prop);
            }
        });
    }

    /**
     * The Red Flash Death Effect
     */
    private applyDeathEffect(target: Phaser.GameObjects.Sprite) {
        // Disable physics so player can walk through it while it's dying
        if (target.body) (target.body as Phaser.Physics.Arcade.Body).enable = false;

        // Apply Red Overlay (Tint)
        target.setTint(0xff3333);

        // Create the flashing red animation
        this.tweens.add({
            targets: target,
            alpha: { from: 0.5, to: 0 },
            ease: 'Linear',
            duration: 100,
            repeat: 5, // Flash 5 times
            onComplete: () => {
                target.destroy(); // Final removal
            }
        });
    }

    update(time: number, delta: number) {
        if (!this.player) return;

        this.handleCameraLock();

        const cursors = this.input.keyboard!.createCursorKeys();
        const punchKey = this.input.keyboard!.addKey('A');
        const kickKey = this.input.keyboard!.addKey('S');
        
        (this.player as any).update({
            up: cursors.up.isDown, down: cursors.down.isDown,
            left: cursors.left.isDown, right: cursors.right.isDown,
            punch: punchKey.isDown, kicking: kickKey.isDown
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
        const playerX = this.player.x;

        for (const lockPoint of this.sectors) {
            if (playerX > lockPoint && playerX < lockPoint + 50 && !this.isLocked) {
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
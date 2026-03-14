import Phaser from 'phaser';
import { Marko } from '../entities/Marko';
// Assuming you have these created or use Marko as a base with different props
import { Maja } from '../entities/Maja'; 
import { Darko } from '../entities/Darko';
import { MUP } from '../entities/MUP';

export class MainLevel extends Phaser.Scene {
    public player!: any; 
    public enemies!: Phaser.Physics.Arcade.Group;
    public breakables!: Phaser.Physics.Arcade.Group;
    public items!: Phaser.Physics.Arcade.Group;
    public projectiles!: Phaser.Physics.Arcade.Group;
    private shadows!: Phaser.GameObjects.Graphics;
    
    private sectors: number[] = [800, 1600, 2400, 3200];
    private isLocked: boolean = false;
    private currentLockX: number = 0;
    private score: number = 0;

    constructor() {
        super({ key: 'MainLevel' });
    }

    create() {
        this.physics.world.setBounds(0, 750, 4000, 330); 

        // Parallax Layers
        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setDisplaySize(4000, 1080).setScrollFactor(0.1);
        this.add.image(0, 1080, 'part1_mid').setOrigin(0, 1).setDisplaySize(4000, 650).setScrollFactor(0.4);
        this.add.image(0, 1080, 'part1_floor').setOrigin(0, 1).setDisplaySize(4000, 450).setScrollFactor(1);

        this.shadows = this.add.graphics().setAlpha(0.4);
        this.breakables = this.physics.add.group({ immovable: true });
        this.items = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.projectiles = this.physics.add.group();

        // CHARACTER SPAWNING LOGIC
        const charKey = this.registry.get('selectedCharacter') || 'marko';
        
        switch(charKey) {
            case 'maja': this.player = new Maja(this, 200, 950); break;
            case 'darko': this.player = new Darko(this, 200, 950); break;
            default: this.player = new Marko(this, 200, 950); break;
        }

        this.player.setScale(1.5);
        if (this.player.body) (this.player.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);

        // Initial Enemies
        this.enemies.add(new MUP(this, 1000, 950));

        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        this.updateReactHUD();
    }

    private handlePlayerAttack() {
        if (this.player.weaponDurability === 1) { this.player.throwWeapon(); return; }

        const range = this.player.equippedWeapon ? 120 : 80;
        const attackX = this.player.flipX ? this.player.x - range : this.player.x + range;
        const attackBounds = new Phaser.Geom.Rectangle(attackX - 40, this.player.y - 100, 80, 200);

        // Apply class-based damage multiplier
        const baseDmg = this.player.equippedWeapon ? 45 : 25;
        const finalDmg = baseDmg * (this.player.damageMultiplier || 1);

        this.enemies.getChildren().forEach((enemy: any) => {
            if (!enemy.isDead && attackBounds.contains(enemy.x, enemy.y)) {
                enemy.takeDamage(finalDmg);
                if (enemy.health <= 0) {
                    this.score += 500;
                    this.applyDeathEffect(enemy);
                }
            }
        });

        // Breakables
        this.breakables.getChildren().forEach((prop: any) => {
            if (attackBounds.contains(prop.x, prop.y)) {
                let hp = prop.getData('health') - 1;
                prop.setData('health', hp);
                if (hp <= 0) { this.spawnLoot(prop.x, prop.y); this.applyDeathEffect(prop); }
            }
        });
        this.updateReactHUD();
    }

    update() {
        if (!this.player) return;
        this.handleCameraLock();

        // THE NUCLEAR ROTATION FIX
        this.children.each((child: any) => {
            if (child.body && child.type === 'Sprite') {
                child.setAngle(0);
                child.rotation = 0;
            }
        });

        // Shadow system
        this.shadows.clear().fillStyle(0x000000, 0.5);
        this.shadows.fillEllipse(this.player.x, this.player.y, 70, 20);
        this.enemies.getChildren().forEach((e: any) => { if (!e.isDead) this.shadows.fillEllipse(e.x, e.y, 70, 20); });

        // Input
        const cursors = this.input.keyboard!.createCursorKeys();
        this.player.update({
            up: cursors.up.isDown, down: cursors.down.isDown,
            left: cursors.left.isDown, right: cursors.right.isDown,
            punch: Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey('A')),
            kicking: Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey('S'))
        });

        this.enemies.getChildren().forEach((e: any) => { if (e.updateAI && !e.isDead) e.updateAI(this.player); });
        this.children.each((c: any) => { if (c.y && c.type !== 'Image' && c.type !== 'Graphics') c.setDepth(c.y); });
    }

    private handleCameraLock() {
        const cam = this.cameras.main;
        for (const lockPoint of this.sectors) {
            if (this.player.x > lockPoint && this.player.x < lockPoint + 50 && !this.isLocked) {
                const enemies = this.enemies.getChildren().filter((e: any) => !e.isDead && e.x < lockPoint + 1000);
                if (enemies.length > 0) {
                    this.isLocked = true;
                    this.currentLockX = lockPoint;
                    cam.stopFollow();
                    this.physics.world.setBounds(lockPoint - (cam.width / 2), 750, cam.width, 330);
                    this.updateReactHUD();
                }
            }
        }
        if (this.isLocked && this.enemies.getChildren().filter((e: any) => !e.isDead && Math.abs(e.x - this.currentLockX) < 600).length === 0) {
            this.isLocked = false;
            cam.startFollow(this.player, true, 0.08, 0.08);
            this.physics.world.setBounds(0, 750, 4000, 330);
            this.updateReactHUD();
        }
    }

    private spawnLoot(x: number, y: number) {
        const lootTable = ['item-sandwich', 'item-beer', 'axe', 'bat-2'];
        const item = this.items.create(x, y - 50, lootTable[Math.floor(Math.random()*lootTable.length)]).setScale(1.2).setOrigin(0.5, 1);
        this.tweens.add({ targets: item, y: y - 100, duration: 300, yoyo: true, ease: 'Back.easeOut' });
    }

    private applyDeathEffect(target: any) {
        if (target.body) target.body.enable = false;
        target.setTint(0xff0000);
        this.tweens.add({ targets: target, alpha: 0, duration: 100, repeat: 5, onComplete: () => target.destroy() });
    }

    private updateReactHUD() {
        window.dispatchEvent(new CustomEvent('update-phaser-hud', {
            detail: { health: this.player?.health, score: this.score, showGo: !this.isLocked && this.player?.x < 3600 }
        }));
    }
}
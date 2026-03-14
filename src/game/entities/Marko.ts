import Phaser from 'phaser';

export class Marko extends Phaser.Physics.Arcade.Sprite {
    public health: number = 100;
    public smfMeter: number = 0;
    public damageMultiplier: number = 1.0;
    public isAttacking: boolean = false;
    public isDead: boolean = false;
    private walkSpeed: number = 160;
    private runSpeed: number = 320;
    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'marko', 'marko-idle/frame_001.png');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setOrigin(0.5, 1);
        if (this.body) {
            this.body.setSize(80, 30);
            this.body.setOffset(this.width / 2 - 40, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    public update(input: any) {
        if (this.isDead) return;
        this.setAngle(0);
        
        // Handle Specials
        if (input.special && this.smfMeter >= 25 && !this.isAttacking) this.executeSpecial();
        if (input.finisher && this.smfMeter >= 100 && !this.isAttacking) this.executeFinisher();

        // Double tap run
        const now = this.scene.time.now;
        if (input.left || input.right) {
            const dir = input.left ? 'left' : 'right';
            if (this.lastKey !== dir) {
                if (now - this.lastKeyTime < 250) this.isRunning = true;
                this.lastKey = dir; this.lastKeyTime = now;
            }
        } else { this.isRunning = false; this.lastKey = ''; }

        // Combat
        if ((input.punch || input.kicking) && !this.isAttacking) {
            this.isAttacking = true;
            this.play(input.punch ? 'marko_punch' : 'marko_kick', true);
            this.once('animationcomplete', () => { 
                this.isAttacking = false;
                this.smfMeter = Math.min(this.smfMeter + 5, 100);
                (this.scene as any).updateReactHUD();
            });
            return;
        }

        // Move
        if (!this.isAttacking) {
            const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
            let vx = input.left ? -speed : (input.right ? speed : 0);
            let vy = input.up ? -speed * 0.6 : (input.down ? speed * 0.6 : 0);
            this.setVelocity(vx, vy);
            if (vx !== 0) this.setFlipX(vx < 0);
            if (vx !== 0 || vy !== 0) this.play(this.isRunning ? 'marko_run' : 'marko_walk', true);
            else this.play('marko_idle', true);
        }
    }

    private executeSpecial() {
        this.isAttacking = true;
        this.smfMeter -= 25;
        this.play('marko_kick', true); // Reusing kick for spin effect
        this.scene.cameras.main.shake(100, 0.005);
        this.checkAreaHit(150, 40 * this.damageMultiplier);
        this.once('animationcomplete', () => { this.isAttacking = false; (this.scene as any).updateReactHUD(); });
    }

    private executeFinisher() {
        this.isAttacking = true;
        this.smfMeter = 0;
        this.play('marko_punch', true); 
        this.scene.cameras.main.flash(500, 255, 0, 0);
        this.checkAreaHit(300, 150 * this.damageMultiplier);
        this.once('animationcomplete', () => { this.isAttacking = false; (this.scene as any).updateReactHUD(); });
    }

    private checkAreaHit(range: number, damage: number) {
        const enemies = (this.scene as any).enemies;
        enemies.getChildren().forEach((e: any) => {
            if (Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y) < range) e.takeDamage(damage);
        });
    }

    public takeDamage(amount: number) {
        this.health -= amount;
        this.play('marko_damage', true);
        if (this.health <= 0) this.die();
        (this.scene as any).updateReactHUD();
    }

    private die() { this.isDead = true; this.setVelocity(0, 0); this.play('marko_die', true); }
}
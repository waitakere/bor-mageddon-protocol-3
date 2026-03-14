import Phaser from 'phaser';

export class Darko extends Phaser.Physics.Arcade.Sprite {
    public health: number = 90;
    public smfMeter: number = 0;
    public damageMultiplier: number = 0.7;
    public isAttacking: boolean = false;
    public isDead: boolean = false;
    private walkSpeed: number = 210;
    private runSpeed: number = 420;
    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'darko', 'darko-idle/frame_001.png');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setOrigin(0.5, 1);
        if (this.body) {
            this.body.setSize(70, 30);
            this.body.setOffset(this.width/2-35, this.height-30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    public update(input: any) {
        if (this.isDead) return;
        this.setAngle(0);

        if (input.special && this.smfMeter >= 20 && !this.isAttacking) this.executeWave();
        if (input.finisher && this.smfMeter >= 100 && !this.isAttacking) this.executeRiff();

        const now = this.scene.time.now;
        if (input.left || input.right) {
            const dir = input.left ? 'left' : 'right';
            if (this.lastKey !== dir) {
                if (now - this.lastKeyTime < 250) this.isRunning = true;
                this.lastKey = dir; this.lastKeyTime = now;
            }
        } else { this.isRunning = false; this.lastKey = ''; }

        if ((input.punch || input.kicking) && !this.isAttacking) {
            this.isAttacking = true;
            this.play(input.punch ? 'darko_punch' : 'darko_kick', true);
            this.once('animationcomplete', () => { 
                this.isAttacking = false; 
                this.smfMeter = Math.min(this.smfMeter + 4, 100);
                (this.scene as any).updateReactHUD();
            });
            return;
        }

        if (!this.isAttacking) {
            const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
            let vx = input.left ? -speed : (input.right ? speed : 0);
            let vy = input.up ? -speed * 0.6 : (input.down ? speed * 0.6 : 0);
            this.setVelocity(vx, vy);
            if (vx !== 0) this.setFlipX(vx < 0);
            if (vx !== 0 || vy !== 0) this.play(this.isRunning ? 'darko_run' : 'darko_walk', true);
            else this.play('darko_idle', true);
        }
    }

    private executeWave() {
        this.isAttacking = true;
        this.smfMeter -= 20;
        this.play('darko_punch', true);
        this.scene.cameras.main.shake(50, 0.003);
        // Projectile pop up logic
        this.checkAreaHit(200, 20 * this.damageMultiplier);
        this.once('animationcomplete', () => { this.isAttacking = false; (this.scene as any).updateReactHUD(); });
    }

    private executeRiff() {
        this.isAttacking = true;
        this.smfMeter = 0;
        this.play('darko_punch', true);
        this.scene.cameras.main.shake(1000, 0.01);
        this.checkAreaHit(1000, 80 * this.damageMultiplier); // Full screen
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
        this.play('darko_damage', true);
        if (this.health <= 0) this.die();
        (this.scene as any).updateReactHUD();
    }

    private die() { this.isDead = true; this.setVelocity(0, 0); this.play('darko_die', true); }
}
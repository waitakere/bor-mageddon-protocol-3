import Phaser from 'phaser';

export class Maja extends Phaser.Physics.Arcade.Sprite {
    public health: number = 150; // Tankier
    public smfMeter: number = 0;
    public characterName: string = 'maja';
    public damageMultiplier: number = 1.5; // High Power
    public isAttacking: boolean = false;
    public isDead: boolean = false;

    // Movement Stats: Heavy
    private walkSpeed: number = 110; 
    private runSpeed: number = 220;
    
    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'maja', 'maja-idle/frame_001.png');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setOrigin(0.5, 1);
        this.setCollideWorldBounds(true);
        
        if (this.body) {
            this.body.setSize(90, 30);
            this.body.setOffset(this.width / 2 - 45, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    public update(input: any) {
        if (this.isDead) return;
        this.setAngle(0);
        this.setRotation(0);
        if (this.body) this.body.angularVelocity = 0;

        const now = this.scene.time.now;

        if (input.left || input.right) {
            const currentDir = input.left ? 'left' : 'right';
            if (this.lastKey !== currentDir) {
                if (now - this.lastKeyTime < 250) this.isRunning = true;
                this.lastKey = currentDir;
                this.lastKeyTime = now;
            }
        } else { this.isRunning = false; this.lastKey = ''; }

        if ((input.punch || input.kicking) && !this.isAttacking) {
            this.isAttacking = true;
            this.setVelocity(0, 0);
            this.play(input.punch ? 'maja_punch' : 'maja_kick', true);
            this.once('animationcomplete', () => { this.isAttacking = false; });
            return;
        }

        if (!this.isAttacking) {
            const currentSpeed = this.isRunning ? this.runSpeed : this.walkSpeed;
            let vx = 0; let vy = 0;

            if (input.left) { vx = -currentSpeed; this.setFlipX(true); }
            else if (input.right) { vx = currentSpeed; this.setFlipX(false); }
            if (input.up) vy = -currentSpeed * 0.6;
            else if (input.down) vy = currentSpeed * 0.6;

            this.setVelocity(vx, vy);
            if (vx !== 0 || vy !== 0) {
                const anim = this.isRunning ? 'maja_run' : 'maja_walk';
                this.play(this.scene.anims.exists(anim) ? anim : 'maja_walk', true);
            } else { this.play('maja_idle', true); }
        }
    }

    public takeDamage(amount: number) {
        this.health -= amount;
        this.play('maja_damage', true);
        if (this.health <= 0) this.die();
    }

    private die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        this.play('maja_die', true);
    }
}
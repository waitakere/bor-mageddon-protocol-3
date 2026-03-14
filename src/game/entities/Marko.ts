import Phaser from 'phaser';

export class Marko extends Phaser.Physics.Arcade.Sprite {
    public health: number = 100;
    public smfMeter: number = 0;
    public characterName: string = 'marko';
    public damageMultiplier: number = 1.0;
    public isAttacking: boolean = false;
    public isDead: boolean = false;

    // Movement Stats: Balanced
    private walkSpeed: number = 160;
    private runSpeed: number = 320;
    
    // Dash/Run logic
    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'marko', 'marko-idle/frame_001.png');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setOrigin(0.5, 1);
        this.setCollideWorldBounds(true);
        
        if (this.body) {
            this.body.setSize(80, 30);
            this.body.setOffset(this.width / 2 - 40, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    public update(input: any) {
        if (this.isDead) return;

        // Force rotation lock
        this.setAngle(0);
        this.setRotation(0);
        if (this.body) this.body.angularVelocity = 0;

        const now = this.scene.time.now;

        // Double-Tap Dash Logic
        if (input.left || input.right) {
            const currentDir = input.left ? 'left' : 'right';
            if (this.lastKey !== currentDir) {
                if (now - this.lastKeyTime < 250) this.isRunning = true;
                this.lastKey = currentDir;
                this.lastKeyTime = now;
            }
        } else {
            this.isRunning = false;
            this.lastKey = '';
        }

        // Combat Input
        if ((input.punch || input.kicking) && !this.isAttacking) {
            this.isAttacking = true;
            this.setVelocity(0, 0);
            const animKey = input.punch ? `${this.characterName}_punch` : `${this.characterName}_kick`;
            this.play(animKey, true);
            this.once('animationcomplete', () => { this.isAttacking = false; });
            return;
        }

        // Standard Movement
        if (!this.isAttacking) {
            const currentSpeed = this.isRunning ? this.runSpeed : this.walkSpeed;
            let vx = 0; let vy = 0;

            if (input.left) { vx = -currentSpeed; this.setFlipX(true); }
            else if (input.right) { vx = currentSpeed; this.setFlipX(false); }

            if (input.up) vy = -currentSpeed * 0.6;
            else if (input.down) vy = currentSpeed * 0.6;

            this.setVelocity(vx, vy);

            if (vx !== 0 || vy !== 0) {
                const anim = this.isRunning ? `${this.characterName}_run` : `${this.characterName}_walk`;
                this.play(this.scene.anims.exists(anim) ? anim : `${this.characterName}_walk`, true);
            } else {
                this.play(`${this.characterName}_idle`, true);
            }
        }
    }

    public takeDamage(amount: number) {
        this.health -= amount;
        this.play(`${this.characterName}_damage`, true);
        if (this.health <= 0) this.die();
    }

    private die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        this.play(`${this.characterName}_die`, true);
    }
}
import Phaser from 'phaser';

export class Marko extends Phaser.Physics.Arcade.Sprite {
    public health: number = 100;
    public smfMeter: number = 0;
    public characterName: string = 'marko';
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
            this.body.setOffset(this.width/2 - 40, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    public update(input: any) {
        if (this.isDead) return;
        this.setAngle(0);

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
            this.setVelocity(0, 0);
            this.play(`${this.characterName}-${input.punch ? 'punch' : 'kick'}`, true);
            this.once('animationcomplete', () => { 
                this.isAttacking = false;
                this.smfMeter = Math.min(this.smfMeter + 5, 100);
            });
            return;
        }

        if (!this.isAttacking) {
            const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
            let vx = input.left ? -speed : (input.right ? speed : 0);
            let vy = input.up ? -speed * 0.6 : (input.down ? speed * 0.6 : 0);
            this.setVelocity(vx, vy);
            if (vx !== 0) this.setFlipX(vx < 0);
            if (vx !== 0 || vy !== 0) {
                const anim = this.isRunning ? `${this.characterName}-run` : `${this.characterName}-walk`;
                this.play(this.scene.anims.exists(anim) ? anim : `${this.characterName}-walk`, true);
            } else {
                this.play(`${this.characterName}-idle`, true);
            }
        }
    }

    public takeDamage(amount: number) {
        this.health -= amount;
        this.play(`${this.characterName}-damage`, true);
        if (this.health <= 0) this.die();
    }

    private die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        this.play(`${this.characterName}-die`, true);
    }
}
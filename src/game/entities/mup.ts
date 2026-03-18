import Phaser from 'phaser';

export class MUP extends Phaser.Physics.Arcade.Sprite {
    public health: number = 100;
    public isDead: boolean = false;
    public isAttacking: boolean = false;
    private speed: number = 80;
    private attackRange: number = 70;
    private attackCooldown: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemies_1993', 'mup-idle/frame_000.png');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setOrigin(0.5, 1);
        
        // UPGRADED SCALE: Makes the enemy physically imposing
        this.setScale(1.7);
        
        if (this.body) {
            this.body.setSize(50, 30);
            this.body.setOffset(this.width/2 - 25, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    public updateAI(player: any) {
        if (this.isDead || this.isAttacking || player.isDead) return;
        this.setAngle(0);

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        if (dist > this.attackRange) {
            // Chase the player
            this.scene.physics.moveToObject(this, player, this.speed);
            this.setFlipX(player.x < this.x);
            if (this.scene.anims.exists('mup-walk')) {
                this.play('mup-walk', true);
            }
        } else {
            // In Range: Stop and Attack
            this.setVelocity(0, 0);
            if (!this.attackCooldown) {
                this.executeAttack(player);
            } else {
                if (this.scene.anims.exists('mup-idle')) this.play('mup-idle', true);
            }
        }
    }

    private executeAttack(player: any) {
        this.isAttacking = true;
        this.setFlipX(player.x < this.x);

        const attackAnim = 'mup-punch-1';

        if (this.scene.anims.exists(attackAnim)) {
            this.play(attackAnim, true);
            this.once('animationcomplete', () => {
                this.isAttacking = false;
                this.triggerCooldown();
                
                // If player is still in range, deal damage
                if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= this.attackRange + 20) {
                    if (player.takeDamage) player.takeDamage(10);
                }
            });
        } else {
            // Failsafe if enemy animation is missing
            this.scene.time.delayedCall(400, () => {
                this.isAttacking = false;
                this.triggerCooldown();
                if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= this.attackRange + 20) {
                    if (player.takeDamage) player.takeDamage(10);
                }
            });
        }
    }

    private triggerCooldown() {
        this.attackCooldown = true;
        this.scene.time.delayedCall(1200, () => { this.attackCooldown = false; });
    }

    public takeDamage(amount: number) {
        if (this.isDead) return;
        
        this.health -= amount;
        this.isAttacking = false; // Interrupt their attack
        this.setVelocity(0, 0);

        if (this.health <= 0) {
            this.isDead = true;
            if (this.scene.anims.exists('mup-dying')) {
                this.play('mup-dying', true);
                this.once('animationcomplete', () => this.destroy());
            } else {
                this.setTint(0xff0000);
                this.scene.time.delayedCall(300, () => this.destroy());
            }
            (this.scene as any).score += 100;
        } else {
            if (this.scene.anims.exists('mup-damage')) {
                this.play('mup-damage', true);
            } else {
                this.setTint(0xff0000);
                this.scene.time.delayedCall(150, () => this.clearTint());
            }
        }
        (this.scene as any).updateReactHUD();
    }
}

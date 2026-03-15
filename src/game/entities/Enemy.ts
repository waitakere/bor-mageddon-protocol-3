import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    public health: number = 100;
    public isDead: boolean = false;
    public isAttacking: boolean = false;
    public skinPrefix: string; 
    public damageMultiplier: number = 1.0;
    
    private speed: number = 80;
    private attackRange: number = 70;
    private attackCooldown: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, skinPrefix: string = 'mup') {
        // Loads dynamically based on the prefix passed in (mup, dizel, rudar, sloba)
        super(scene, x, y, 'enemies_1993', `${skinPrefix}-idle/frame_000.png`);
        this.skinPrefix = skinPrefix;
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setOrigin(0.5, 1);
        
        // --- BOSS vs GRUNT SCALING ---
        if (skinPrefix === 'sloba') {
            this.setScale(2.1); // Boss is massive
            this.health = 600;
            this.damageMultiplier = 2.0;
            this.speed = 110; // Slightly faster to pressure the player
        } else {
            this.setScale(1.7); // Standard enemy size
            this.health = 100;
        }
        
        // 2.5D HITBOX CALIBRATION (Pancake Hitbox at feet)
        this.setCollideWorldBounds(true);
        if (this.body) {
            this.body.setSize(60, 30);
            this.body.setOffset(this.width/2 - 30, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    // --- 2.5D STALKER AI ---
    public updateAI(player: any) {
        if (this.isDead || this.isAttacking || player.isDead) return;
        this.setAngle(0);

        const distanceX = player.x - this.x;
        const distanceY = player.y - this.y;
        const absDistX = Math.abs(distanceX);
        const absDistY = Math.abs(distanceY);

        // 1. Lane Alignment (Move UP/DOWN to match player's depth)
        if (absDistY > 15) {
            this.setVelocityY(distanceY > 0 ? this.speed : -this.speed);
        } else {
            this.setVelocityY(0);
        }

        // 2. Approach (Move LEFT/RIGHT to get into attack range)
        if (absDistX > this.attackRange) {
            this.setVelocityX(distanceX > 0 ? this.speed : -this.speed);
            this.setFlipX(distanceX < 0);
            
            if (this.scene.anims.exists(`${this.skinPrefix}-walk`)) {
                this.play(`${this.skinPrefix}-walk`, true);
            }
        } 
        // 3. Attack Trigger (Only attack if in range AND aligned on the Y-axis)
        else if (absDistX <= this.attackRange && absDistY <= 20) {
            this.setVelocityX(0);
            this.setVelocityY(0); // Stop moving to swing
            if (!this.attackCooldown) {
                this.executeAttack(player);
            } else {
                if (this.scene.anims.exists(`${this.skinPrefix}-idle`)) {
                    this.play(`${this.skinPrefix}-idle`, true);
                }
            }
        } else {
            // Waiting to align
            this.setVelocityX(0);
            if (this.scene.anims.exists(`${this.skinPrefix}-idle`)) {
                this.play(`${this.skinPrefix}-idle`, true);
            }
        }
    }

    private executeAttack(player: any) {
        this.isAttacking = true;
        this.setFlipX(player.x < this.x);

        // Mix up attacks slightly if multiple punches exist
        const attackAnim = `${this.skinPrefix}-punch-1`;

        if (this.scene.anims.exists(attackAnim)) {
            this.play(attackAnim, true);
            this.once('animationcomplete', () => {
                this.isAttacking = false;
                this.triggerCooldown();
                
                // Damage calculation
                if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= this.attackRange + 20) {
                    if (player.takeDamage) player.takeDamage(10 * this.damageMultiplier);
                }
            });
        } else {
            // Failsafe
            this.scene.time.delayedCall(400, () => {
                this.isAttacking = false;
                this.triggerCooldown();
                if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= this.attackRange + 20) {
                    if (player.takeDamage) player.takeDamage(10 * this.damageMultiplier);
                }
            });
        }
    }

    private triggerCooldown() {
        this.attackCooldown = true;
        // Bosses attack faster!
        const delay = this.skinPrefix === 'sloba' ? 800 : 1200;
        this.scene.time.delayedCall(delay, () => { this.attackCooldown = false; });
    }

    public takeDamage(amount: number) {
        if (this.isDead) return;
        
        this.health -= amount;
        this.isAttacking = false; 
        this.setVelocity(0, 0);
        
        // Final Fight Red Flash
        this.setTint(0xff0000);

        if (this.health <= 0) {
            this.isDead = true;
            (this.scene as any).registerEnemyDeath();

            if (this.scene.anims.exists(`${this.skinPrefix}-dying`)) {
                this.play(`${this.skinPrefix}-dying`, true);
                
                // Sinking / Blinking Body Effect from your old code
                this.once('animationcomplete', () => {
                    this.scene.tweens.add({
                        targets: this, alpha: 0, duration: 150, repeat: 3, yoyo: true,
                        onComplete: () => {
                            this.scene.tweens.add({
                                targets: this, alpha: 0, y: this.y + 20, duration: 800,
                                onComplete: () => this.destroy()
                            });
                        }
                    });
                });
            } else {
                this.scene.time.delayedCall(300, () => this.destroy());
            }
        } else {
            if (this.scene.anims.exists(`${this.skinPrefix}-damage`)) {
                this.play(`${this.skinPrefix}-damage`, true);
            }
            this.scene.time.delayedCall(150, () => this.clearTint());
        }
    }
}
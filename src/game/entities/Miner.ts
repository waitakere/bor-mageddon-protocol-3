import Phaser from 'phaser';

/**
 * Miner: The "Shambling Tank" of the Bor Copper Mine.
 * Features high endurance, devastating heavy melee attacks, and a sinking death logic.
 */
export class Miner extends Phaser.Physics.Arcade.Sprite {
    public health: number = 250; 
    public isDead: boolean = false;
    public isHurt: boolean = false; // Stun-lock flag
    public skinPrefix: string = 'rudar'; // For HUD portrait (maps to rudar.png)
    
    private isAttacking: boolean = false;
    private attackCooldown: boolean = false;

    private speed: number = 50; 
    private attackRange: number = 90; 

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemies_1993', 'rudar-walk/frame_000.png');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(50, 30);
        body.setOffset(this.width/2 - 25, this.height - 30);
        this.setOrigin(0.5, 1);
        
        body.setCollideWorldBounds(true);
        body.setAllowGravity(false); 

        this.play('rudar-walk', true);
    }

    public updateAI(player: any) {
        if (this.isDead || this.isHurt || this.isAttacking || player.isDead) {
            this.setVelocity(0, 0);
            return;
        }

        const distX = Math.abs(player.x - this.x);
        const distY = Math.abs(player.y - this.y);

        this.setFlipX(player.x < this.x);

        if (distX <= this.attackRange && distY <= 30 && !this.attackCooldown) {
            this.executeHeavyMelee(player);
        } else {
            const dirX = player.x > this.x ? 1 : -1;
            const dirY = player.y > this.y ? 1 : -1;

            let vx = dirX * this.speed;
            let vy = distY > 10 ? dirY * (this.speed * 0.7) : 0;

            this.setVelocity(vx, vy);
            
            if (this.anims.currentAnim?.key !== 'rudar-walk') {
                this.play('rudar-walk', true);
            }
        }
    }

    private executeHeavyMelee(player: any) {
        this.isAttacking = true;
        this.setVelocity(0, 0);

        if (this.scene.anims.exists('rudar-punch-2')) {
            this.play('rudar-punch-2', true); // Fallback to heavy punch if melee doesn't exist
        }
        
        (this.scene as any).playSFX(['melee_1', 'melee_2']);

        this.scene.time.delayedCall(400, () => {
            if (this.isDead || this.isHurt) return;

            const distX = Math.abs(player.x - this.x);
            const distY = Math.abs(player.y - this.y);

            if (distX <= this.attackRange + 15 && distY <= 35) {
                (this.scene as any).lastEngagedEnemy = this; // Lock to HUD
                player.takeDamage(35); 
                (this.scene as any).playSFX(['punch_2', 'kick_4']);
                this.scene.cameras.main.shake(200, 0.015);
            }
        });

        this.scene.time.delayedCall(800, () => {
            this.isAttacking = false;
            this.attackCooldown = true;
            this.scene.time.delayedCall(3000, () => (this.attackCooldown = false));
            this.play('rudar-walk', true);
        });
    }

    public takeDamage(amount: number) {
        if (this.isDead) return;
        
        this.health -= amount;
        
        // Miners have heavy poise! Only stun-lock if damage >= 20
        if (amount >= 20) {
            this.isAttacking = false;
            this.isHurt = true;
        }

        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(50, () => this.clearTint());

        // --- HUD FLASH TRIGGER ---
        (this.scene as any).lastEngagedEnemy = this;
        (this.scene as any).lastEnemyHitTime = Date.now();
        (this.scene as any).updateReactHUD();

        (this.scene as any).spawnHitEffect(this.x, this.y - 80);
        (this.scene as any).playSFX(['agony_m_1', 'agony_m_2', 'agony_m_3']);

        if (this.health <= 0) {
            this.die();
        } else if (amount >= 20) {
            if (this.scene.anims.exists('rudar-damage')) {
                this.play('rudar-damage', true);
            }
            
            this.scene.time.delayedCall(400, () => {
                if (!this.isDead) {
                    this.isHurt = false;
                    this.play('rudar-walk', true);
                }
            });
        }
    }

    protected die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        (this.body as Phaser.Physics.Arcade.Body).enable = false;

        (this.scene as any).playSFX(['Break_1', 'Break_2']);
        (this.scene as any).registerEnemyDeath();

        if (this.scene.anims.exists('rudar-dying')) {
            this.play('rudar-dying', true);
        }

        this.once('animationcomplete', () => {
            this.scene.tweens.add({
                targets: this,
                alpha: 0,           
                y: this.y + 50,      
                duration: 2500,     
                onComplete: () => {
                    if (Phaser.Math.Between(1, 100) <= 80) {
                        (this.scene as any).dropItem(this.x, this.y - 50);
                    }
                    this.destroy(); 
                }
            });
        });
    }
}
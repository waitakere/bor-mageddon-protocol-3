import Phaser from 'phaser';

/**
 * Dizel: The "Stabbing Brute" / Tracksuit Thug of Bor 1993.
 * Focused on high-speed approach, butterfly knife area denial, and weighted physics.
 */
export class Dizel extends Phaser.Physics.Arcade.Sprite {
    public health: number = 120; 
    public isDead: boolean = false;
    public isHurt: boolean = false; // STUN LOCK FLAG
    public skinPrefix: string = 'dizel'; // For HUD
    
    private isSlashing: boolean = false;
    private slashCooldown: boolean = false;
    private isKnockedDown: boolean = false;
    public isInvulnerable: boolean = false;

    private speed: number = 140; 
    private attackRange: number = 100;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemies_1993', 'dizel-walk/frame_000.png');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.7); 
        this.setOrigin(0.5, 1);

        const body = this.body as Phaser.Physics.Arcade.Body;
        // FIX: Hardcoded 256px math prevents the Atlas width bug
        body.setSize(60, 40);
        body.setOffset(98, 216); // (256/2) - 30, and 256 - 40
        
        body.setCollideWorldBounds(true);
        body.setAllowGravity(false); 

        this.play('dizel-walk', true); 
    }

    public updateAI(player: any) {
        if (this.isDead || this.isHurt || this.isSlashing || this.isKnockedDown || player.isDead) {
            this.setVelocity(0, 0);
            return;
        }

        const distX = Math.abs(player.x - this.x);
        const distY = Math.abs(player.y - this.y);

        this.setFlipX(player.x < this.x);

        if (distX <= this.attackRange && distY <= 20 && !this.slashCooldown) {
            this.executeKnifeSlash(player);
        } else {
            const dirX = player.x > this.x ? 1 : -1;
            const dirY = player.y > this.y ? 1 : -1;

            let vx = dirX * this.speed;
            let vy = distY > 10 ? dirY * (this.speed * 0.8) : 0;

            this.setVelocity(vx, vy);
            
            if (this.anims.currentAnim?.key !== 'dizel-walk') {
                this.play('dizel-walk', true);
            }
        }
    }

    private executeKnifeSlash(player: any) {
        this.isSlashing = true;
        this.setVelocity(0, 0);

        this.play('dizel-punch-1', true);
        (this.scene as any).playSFX(['melee_1', 'melee_2']); 

        this.scene.time.delayedCall(200, () => {
            if (this.isDead || this.isHurt || this.isKnockedDown) return;

            const distX = Math.abs(player.x - this.x);
            const distY = Math.abs(player.y - this.y);

            if (distX <= this.attackRange + 20 && distY <= 30) {
                (this.scene as any).lastEngagedEnemy = this; 
                player.takeDamage(25); 
                
                (this.scene as any).spawnHitEffect(player.x, player.y - 80);
                (this.scene as any).playSFX('dizel_stab_1'); 
                
                this.scene.physics.world.pause();
                this.scene.time.delayedCall(50, () => this.scene.physics.world.resume());
            }
        });

        this.once('animationcomplete', (anim: any) => {
            if (anim.key === 'dizel-punch-1') {
                this.isSlashing = false;
                this.slashCooldown = true;
                this.scene.time.delayedCall(1500, () => (this.slashCooldown = false));
                this.play('dizel-walk', true);
            }
        });
    }

    public takeDamage(amount: number) {
        if (this.isDead || this.isInvulnerable) return;

        this.health -= amount;
        this.isSlashing = false;
        this.isHurt = true; 
        this.setVelocity(0, 0);
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(50, () => this.clearTint());

        (this.scene as any).lastEngagedEnemy = this;
        (this.scene as any).lastEnemyHitTime = Date.now();
        (this.scene as any).updateReactHUD();

        (this.scene as any).spawnHitEffect(this.x, this.y - 50);
        (this.scene as any).playSFX(['agony_m_1', 'agony_m_2', 'agony_m_3']);

        if (this.health <= 0) {
            this.takeKnockdown();
        } else {
            if (this.scene.anims.exists('dizel-damage')) {
                this.play('dizel-damage', true);
            }
            
            this.x += this.flipX ? 15 : -15;

            this.scene.time.delayedCall(400, () => {
                if (!this.isDead && !this.isKnockedDown) {
                    this.isHurt = false;
                    this.play('dizel-walk', true);
                }
            });
        }
    }

    public takeKnockdown() {
        if (this.isDead || this.isKnockedDown) return;

        this.isKnockedDown = true;
        this.isInvulnerable = true; 
        
        this.x += this.flipX ? 40 : -40; 
        
        if (this.scene.anims.exists('dizel-knockdown-get-up')) {
             this.play('dizel-knockdown-get-up', true);
        } else {
             this.play('dizel-dying', true);
        }

        this.once('animationcomplete', () => {
            if (this.health <= 0) {
                this.isDead = true;
                (this.body as Phaser.Physics.Arcade.Body).enable = false;
                
                (this.scene as any).playSFX(['Break_1', 'Break_2']);
                (this.scene as any).registerEnemyDeath();
                
                if (this.scene.anims.exists('dizel-dying')) {
                    this.play('dizel-dying', true);
                }
                
                if (Phaser.Math.Between(1, 100) <= 40) {
                    (this.scene as any).dropItem(this.x, this.y);
                }

                this.scene.tweens.add({ targets: this, alpha: 0, y: this.y + 20, duration: 800, delay: 500, onComplete: () => this.destroy() });

            } else {
                this.isKnockedDown = false;
                this.isInvulnerable = false;
                this.isHurt = false;
                this.play('dizel-walk', true);
            }
        });
    }
}
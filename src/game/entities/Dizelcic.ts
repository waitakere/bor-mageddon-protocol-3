import Phaser from 'phaser';

/**
 * Dizelčić: The younger tracksuit thug of Bor 1993.
 * Uses an aerosol spray can for close-range area denial.
 */
export class Dizelcic extends Phaser.Physics.Arcade.Sprite {
    public health: number = 80; 
    public isDead: boolean = false;
    public isHurt: boolean = false;
    public skinPrefix: string = 'dizelcic'; // For HUD portrait
    
    private isSpraying: boolean = false;
    private sprayCooldown: boolean = false;

    private speed: number = 110;
    private attackRange: number = 150;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemies_1993', 'dizelcic-walk/frame_000.png');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // FIX: Added the missing scale and correct offset math
        this.setScale(1.7);
        this.setOrigin(0.5, 1);
        
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(50, 40);
        body.setOffset(103, 216); // (256/2) - 25, and 256 - 40
        
        body.setCollideWorldBounds(true);
        body.setAllowGravity(false);

        this.play('dizelcic-walk', true);
    }

    public updateAI(player: any) {
        if (this.isDead || this.isHurt || this.isSpraying || player.isDead) {
            this.setVelocity(0, 0);
            return;
        }

        const distX = Math.abs(player.x - this.x);
        const distY = Math.abs(player.y - this.y);

        this.setFlipX(player.x < this.x);

        if (distX <= this.attackRange && distY <= 20 && !this.sprayCooldown) {
            this.executeAerosolAttack(player);
        } else {
            const dirX = player.x > this.x ? 1 : -1;
            const dirY = player.y > this.y ? 1 : -1;

            let vx = dirX * this.speed;
            let vy = distY > 15 ? dirY * (this.speed * 0.8) : 0;

            this.setVelocity(vx, vy);
            
            if (this.anims.currentAnim?.key !== 'dizelcic-walk') {
                this.play('dizelcic-walk', true);
            }
        }
    }

    private executeAerosolAttack(player: any) {
        this.isSpraying = true;
        this.setVelocity(0, 0);
        
        this.play('dizelcic-punch-1', true); 
        (this.scene as any).playSFX(['Dizelcic-Aerosol_1', 'Dizelcic-Aerosol_2']); 

        this.scene.time.delayedCall(200, () => {
            if (!this.isDead && !this.isHurt) {
                this.spawnMistCloud(player);
            }
        });

        this.once('animationcomplete', (anim: any) => {
            if (anim.key === 'dizelcic-punch-1') {
                this.isSpraying = false;
                this.sprayCooldown = true;
                this.scene.time.delayedCall(2000, () => (this.sprayCooldown = false));
                this.play('dizelcic-walk', true);
            }
        });
    }

    private spawnMistCloud(player: any) {
        const xDir = this.flipX ? -1 : 1;
        const impactZone = this.scene.add.zone(this.x + (70 * xDir), this.y - 80, 80, 80);
        this.scene.physics.add.existing(impactZone);

        (this.scene as any).spawnHitEffect(impactZone.x, impactZone.y);

        this.scene.physics.add.overlap(impactZone, player, () => {
            if (!player.isInvulnerable) {
                (this.scene as any).lastEngagedEnemy = this; 
                player.takeDamage(10); 
            }
        });

        this.scene.time.delayedCall(400, () => impactZone.destroy());
    }

    public takeDamage(amount: number) {
        if (this.isDead) return;
        
        this.health -= amount;
        this.isSpraying = false;
        this.isHurt = true; 

        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(50, () => this.clearTint());

        (this.scene as any).lastEngagedEnemy = this;
        (this.scene as any).lastEnemyHitTime = Date.now();
        (this.scene as any).updateReactHUD();

        (this.scene as any).spawnHitEffect(this.x, this.y - 70);
        (this.scene as any).playSFX(['agony_m_1', 'agony_m_2', 'agony_m_3']);

        if (this.health <= 0) {
            this.die();
        } else {
            if (this.scene.anims.exists('dizelcic-damage')) {
                this.play('dizelcic-damage', true);
            }
            
            this.x += this.flipX ? 15 : -15; 

            this.scene.time.delayedCall(400, () => {
                if (!this.isDead) {
                    this.isHurt = false;
                    this.play('dizelcic-walk', true);
                }
            });
        }
    }

    private die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        (this.body as Phaser.Physics.Arcade.Body).enable = false;

        (this.scene as any).playSFX(['Break_1', 'Break_2']);
        (this.scene as any).registerEnemyDeath();

        if (this.scene.anims.exists('dizelcic-dying')) {
            this.play('dizelcic-dying', true);
        }

        this.x += this.flipX ? 30 : -30;

        if (Phaser.Math.Between(1, 100) <= 25) {
            (this.scene as any).dropItem(this.x, this.y);
        }

        this.scene.tweens.add({ targets: this, alpha: 0, y: this.y + 20, duration: 800, delay: 500, onComplete: () => this.destroy() });
    }
}
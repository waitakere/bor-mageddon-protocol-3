import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    public health: number = 100;
    public isDead: boolean = false;
    public isAttacking: boolean = false;
    public skinPrefix: string; 
    public damageMultiplier: number = 1.0;
    
    private speed: number = 80;
    private attackRange: number = 80; // Slightly bigger for safety
    private attackCooldown: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, skinPrefix: string = 'mup') {
        super(scene, x, y, 'enemies_1993', `${skinPrefix}-idle/frame_000.png`);
        this.skinPrefix = skinPrefix;
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setOrigin(0.5, 1);
        
        if (skinPrefix === 'sloba') {
            this.setScale(2.1);
            this.health = 600;
            this.damageMultiplier = 2.0;
            this.speed = 110; 
        } else {
            this.setScale(1.7);
            this.health = 100;
        }
        
        this.setCollideWorldBounds(true);
        if (this.body) {
            this.body.setSize(50, 30);
            this.body.setOffset(this.width/2 - 25, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    public updateAI(player: any) {
        if (this.isDead || this.isAttacking || player.isDead) return;
        this.setAngle(0);

        const distanceX = player.x - this.x;
        const distanceY = player.y - this.y;
        const absDistX = Math.abs(distanceX);
        const absDistY = Math.abs(distanceY);

        // Lane Alignment (Only move on Y if they are far away on Z-depth)
        if (absDistY > 20) {
            this.setVelocityY(distanceY > 0 ? this.speed : -this.speed);
        } else {
            this.setVelocityY(0);
        }

        if (absDistX > this.attackRange) {
            this.setVelocityX(distanceX > 0 ? this.speed : -this.speed);
            this.setFlipX(distanceX < 0);
            if (this.scene.anims.exists(`${this.skinPrefix}-walk`)) this.play(`${this.skinPrefix}-walk`, true);
        } 
        // 2.5D CHECK: Only swing if close horizontally AND aligned on the lane vertically!
        else if (absDistX <= this.attackRange && absDistY <= 40) { 
            this.setVelocityX(0);
            this.setVelocityY(0);
            if (!this.attackCooldown) this.executeAttack(player);
            else if (this.scene.anims.exists(`${this.skinPrefix}-idle`)) this.play(`${this.skinPrefix}-idle`, true);
        } else {
            this.setVelocityX(0);
            if (this.scene.anims.exists(`${this.skinPrefix}-idle`)) this.play(`${this.skinPrefix}-idle`, true);
        }
    }

    private executeAttack(player: any) {
        this.isAttacking = true;
        this.setFlipX(player.x < this.x);
        const attackAnim = `${this.skinPrefix}-punch-1`;
        
        (this.scene as any).playSFX('woosh');

        if (this.scene.anims.exists(attackAnim)) {
            this.play(attackAnim, true);
            this.once('animationcomplete', () => {
                this.isAttacking = false;
                this.triggerCooldown();
                // 2.5D Depth Check on impact
                if (Math.abs(this.x - player.x) <= this.attackRange + 20 && Math.abs(this.y - player.y) <= 45) {
                    if (player.takeDamage) player.takeDamage(10 * this.damageMultiplier);
                }
            });
        } else {
            this.scene.time.delayedCall(400, () => {
                this.isAttacking = false;
                this.triggerCooldown();
                if (Math.abs(this.x - player.x) <= this.attackRange + 20 && Math.abs(this.y - player.y) <= 45) {
                    if (player.takeDamage) player.takeDamage(10 * this.damageMultiplier);
                }
            });
        }
    }

    private triggerCooldown() {
        this.attackCooldown = true;
        const delay = this.skinPrefix === 'sloba' ? 800 : 1200;
        this.scene.time.delayedCall(delay, () => { this.attackCooldown = false; });
    }

    public takeDamage(amount: number) {
        if (this.isDead) return;
        this.health -= amount;
        this.isAttacking = false; 
        this.setVelocity(0, 0);
        this.setTint(0xff0000);
        
        // Effects handled by Player attack code already (Hit Spark & Audio)

        if (this.health <= 0) {
            this.isDead = true;
            (this.scene as any).registerEnemyDeath();
            (this.scene as any).dropItem(this.x, this.y); 
            
            if (this.scene.anims.exists(`${this.skinPrefix}-dying`)) {
                this.play(`${this.skinPrefix}-dying`, true);
                this.once('animationcomplete', () => {
                    this.scene.tweens.add({
                        targets: this, alpha: 0, duration: 150, repeat: 3, yoyo: true,
                        onComplete: () => {
                            this.scene.tweens.add({ targets: this, alpha: 0, y: this.y + 20, duration: 800, onComplete: () => this.destroy() });
                        }
                    });
                });
            } else {
                this.scene.time.delayedCall(300, () => this.destroy());
            }
        } else {
            if (this.scene.anims.exists(`${this.skinPrefix}-damage`)) this.play(`${this.skinPrefix}-damage`, true);
            this.scene.time.delayedCall(150, () => this.clearTint());
        }
    }
}
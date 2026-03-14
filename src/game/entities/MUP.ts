import Phaser from 'phaser';

/**
 * MUP (Ministarstvo Unutrašnjih Poslova) - 1993 Riot Police
 * Heavy, armored melee unit.
 */
export class MUP extends Phaser.Physics.Arcade.Sprite {
    public health: number = 120; // Tankier than standard enemies
    public maxHealth: number = 120;
    public isDead: boolean = false;
    public isHurt: boolean = false;
    public isAttacking: boolean = false;
    
    private speed: number = 90;
    private attackRange: number = 110; // Nightstick reach
    private attackCooldown: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        // Start with the default frame from the mega-atlas
        super(scene, x, y, 'enemies_1993', 'mup-idle/frame_001.png');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;

        // 1. FIX: ANCHORING & ORIENTATION
        this.setOrigin(0.5, 1); // Anchor at feet
        this.setRotation(0);     // Force upright
        
        // 2. BELT-SCROLLER HITBOX
        // Wide at feet, thin height for 2.5D lane movement
        body.setSize(70, 30);
        body.setOffset(this.width / 2 - 35, this.height - 30); 
        
        body.setCollideWorldBounds(true);
        body.setAllowGravity(false); 
        
        // 3. FIX: PREVENT PHYSICS ROTATION
        body.setAllowRotation(false);

        this.play('mup-idle');
    }

    /**
     * AI Logic: Called every frame by MainLevel.ts
     */
    public updateAI(player: any) {
        if (this.isDead || this.isHurt || this.isAttacking) {
            this.setVelocity(0, 0);
            return;
        }

        // Safeguard to ensure he never tilts
        this.setRotation(0);

        const distanceX = Math.abs(this.x - player.x);
        const distanceY = Math.abs(this.y - player.y);

        // Turn to face the player
        this.setFlipX(player.x < this.x);

        // 1. Check if in attack range (X reach and Y 'lane' alignment)
        if (distanceX < this.attackRange && distanceY < 30) {
            this.setVelocity(0, 0);
            
            if (this.scene.time.now > this.attackCooldown) {
                this.executeAttack(player);
            } else if (this.anims.currentAnim?.key !== 'mup-idle') {
                this.play('mup-idle', true);
            }
        } else {
            // 2. Move towards the player
            const dirX = player.x > this.x ? 1 : -1;
            const dirY = player.y > this.y ? 1 : -1;

            // Lane Alignment: Move vertically to get into the same 'lane' as player
            let vx = distanceX > (this.attackRange - 20) ? dirX * this.speed : 0;
            let vy = distanceY > 10 ? dirY * (this.speed * 0.7) : 0;

            this.setVelocity(vx, vy);
            
            if (vx !== 0 || vy !== 0) {
                this.play('mup-walk', true);
            } else {
                this.play('mup-idle', true);
            }
        }
    }

    private executeAttack(player: any) {
        this.isAttacking = true;
        
        // Randomly choose between nightstick swing 1 or 2
        const attackAnim = Phaser.Math.Between(0, 1) === 0 ? 'mup-punch-1' : 'mup-punch-2';
        this.play(attackAnim, true);

        // Heavy swing sound
        this.scene.sound.playAudioSprite('sfx_atlas', 'woosh_heavy', { volume: 0.6 });

        // Apply damage at the apex of the swing
        this.scene.time.delayedCall(300, () => {
            if (this.isDead || this.isHurt || !this.scene) return;

            const distanceX = Math.abs(this.x - player.x);
            const distanceY = Math.abs(this.y - player.y);

            // Re-check range (did player dodge?)
            if (distanceX < this.attackRange + 10 && distanceY < 40) {
                player.takeDamage(15);
                this.scene.cameras.main.shake(100, 0.002);
            }
        });

        this.on('animationcomplete', (anim: Phaser.Animations.Animation) => {
            if (anim.key.includes('mup-punch')) {
                this.isAttacking = false;
                this.attackCooldown = this.scene.time.now + 1500; 
                this.play('mup-idle', true);
            }
        }, this);
    }

    public takeDamage(amount: number) {
        if (this.isDead) return;

        this.health -= amount;
        this.isHurt = true;
        this.isAttacking = false;

        // Visual feedback: Flash Red
        this.setTint(0xff0000);
        this.scene.time.delayedCall(150, () => {
            if (!this.isDead) this.clearTint();
        });

        // Pushback
        const pushDir = this.flipX ? 20 : -20;
        this.scene.tweens.add({
            targets: this,
            x: this.x + pushDir,
            duration: 100
        });

        if (this.health <= 0) {
            this.die();
        } else {
            this.play('mup-damage', true);
            this.scene.time.delayedCall(400, () => {
                if (!this.isDead) {
                    this.isHurt = false;
                    this.play('mup-idle', true);
                }
            });
        }
    }

    private die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        
        if (this.body) (this.body as Phaser.Physics.Arcade.Body).enable = false;

        this.play('mup-dying', true);

        // Red Flash Death Flicker (Final Fight Style)
        this.setTint(0xff0000);
        this.scene.tweens.add({
            targets: this,
            alpha: { from: 0.7, to: 0 },
            duration: 100,
            repeat: 5,
            onComplete: () => {
                // Sink into floor effect
                this.scene.tweens.add({
                    targets: this,
                    y: this.y + 30,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => this.destroy()
                });
            }
        });
    }
}
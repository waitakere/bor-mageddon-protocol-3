import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { GoreManager } from '../systems/GoreManager';

/**
 * Enemy: Represents industrial-era threats in Bor.
 * Handles AI movement, damage states, and Armor Break logic.
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
    public hp: number = 100;
    public maxHealth: number = 100;
    public enemyType: string;
    public isDead: boolean = false;
    public isHurt: boolean = false;
    public isAttacking: boolean = false;
    public isKnockedDown: boolean = false;
    public isArmorBroken: boolean = false;

    protected audio: AudioManager;
    protected gore: GoreManager;
    private armorBreakTimer: Phaser.Time.TimerEvent | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, gore: GoreManager, audio: AudioManager) {
        super(scene, x, y, texture);
        this.enemyType = texture;
        this.gore = gore;
        this.audio = audio;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // 1. FIX: ANCHORING & ORIENTATION
        this.setOrigin(0.5, 1); // Anchor at feet for proper depth sorting and floor alignment
        this.setRotation(0);     // Force upright
        
        // 2. HITBOX CALIBRATION
        // Hitbox is now a flat "pancake" at the feet for better 2.5D collisions
        this.setCollideWorldBounds(true);
        if (this.body) {
            this.body.setSize(80, 30); 
            this.body.setOffset(this.width / 2 - 40, this.height - 30);
            
            // 3. FIX: PREVENT ROTATION DRIFT
            // This stops Arcade Physics from tilting the sprite when it hits walls or moves
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    /**
     * "The Stalker" AI Logic: Aligns with player's vertical lane then approaches on X-axis.
     */
    public updateAI(player: Phaser.Physics.Arcade.Sprite) {
        if (this.isDead || this.isHurt || this.isAttacking || this.isKnockedDown) {
            this.setVelocity(0, 0);
            return;
        }

        // Always force rotation to 0 in case external forces impact the body
        this.setRotation(0);

        const distanceX = player.x - this.x;
        const distanceY = player.y - this.y;
        const absDistX = Math.abs(distanceX);
        const absDistY = Math.abs(distanceY);

        // 1. Lane Alignment (Z-axis/Y movement)
        if (absDistY > 15) {
            this.setVelocityY(distanceY > 0 ? 100 : -100);
        } else {
            this.setVelocityY(0);
        }

        // 2. Approach (X-axis movement)
        if (absDistX > 100) { // Tighter follow distance for 16-bit feel
            this.setVelocityX(distanceX > 0 ? 120 : -120);
            this.setFlipX(distanceX < 0);
            this.play(`${this.enemyType}_walk`, true);
        } 
        // 3. Attack Trigger
        else if (absDistX <= 100 && absDistY <= 30) {
            this.setVelocityX(0);
            this.executeEnemyAttack();
        } else {
            this.setVelocityX(0);
            this.play(`${this.enemyType}_idle`, true);
        }
    }

    protected executeEnemyAttack() {
        // Overridden by specific enemy classes (e.g., MUP nightstick swing)
    }

    /**
     * Damage Logic: Accounts for Armor Break multipliers and gore feedback.
     */
    public takeDamage(amount: number) {
        if (this.isDead) return;

        const finalDamage = this.isArmorBroken ? Math.floor(amount * 1.5) : amount;
        this.hp -= finalDamage;
        
        this.isHurt = true;
        
        // Final Fight red flash effect
        this.setTint(0xff0000); 

        // Audio & Juice
        this.audio.playMaleDamageGrunt();
        this.scene.cameras.main.shake(100, 0.005);

        // Spawn particles 
        this.scene.events.emit('spawn-gore', this.x, this.y - (this.height / 2), 'BUREAUCRATIC', 'HIT');

        this.scene.time.delayedCall(200, () => {
            if (!this.isDead) {
                this.isHurt = false;
                // If armor is broken, return to Copper tint, otherwise clear
                this.isArmorBroken ? this.setTint(0xB87333) : this.clearTint();
            }
        });

        if (this.hp <= 0) this.die();
    }

    /**
     * Applies Armor Break state: Reduces defense and tints sprite Copper/Rust.
     */
    public applyArmorBreak() {
        if (this.isDead) return;

        this.isArmorBroken = true;
        this.setTint(0xB87333); 
        
        this.scene.events.emit('spawn-industrial-debris', { x: this.x, y: this.y - (this.height / 2) });

        if (this.armorBreakTimer) this.armorBreakTimer.remove();
        this.armorBreakTimer = this.scene.time.delayedCall(5000, () => {
            this.isArmorBroken = false;
            if (!this.isDead) this.clearTint();
        });
    }

    protected die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        if (this.body) this.body.enable = false; 

        this.scene.events.emit('spawn-gore', this.x, this.y - (this.height / 2), 'BUREAUCRATIC', 'FINISHER');
        this.audio.playRandomSFX(['Break_1', 'Break_2', 'Break_3'], 0.8);
        
        this.play(`${this.enemyType}_die`);

        // Sinking Archive Tween: Final Fight style fade out
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 100,
            repeat: 5,
            yoyo: true,
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this,
                    alpha: 0,
                    y: this.y + 20,
                    duration: 1000,
                    onComplete: () => this.destroy()
                });
            }
        });
    }
}
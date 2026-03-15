import Phaser from 'phaser';

export class Darko extends Phaser.Physics.Arcade.Sprite {
    public health: number = 90; // Fragile health
    public smfMeter: number = 0;
    public characterName: string = 'darko';
    public damageMultiplier: number = 0.7; // Lower damage, hits faster
    public isAttacking: boolean = false;
    public isDead: boolean = false;
    
    // NEW JUMP STATE
    public isJumping: boolean = false;

    // Movement Stats
    private walkSpeed: number = 210;
    private runSpeed: number = 420;
    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;

    // --- COMBO SYSTEM VARIABLES ---
    private comboStep: number = 1;
    private comboResetTimer: Phaser.Time.TimerEvent | null = null;
    private queuedAttackType: 'punch' | 'kick' | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'darko', 'darko-idle/frame_000.png');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setOrigin(0.5, 1);
        if (this.body) {
            this.body.setSize(50, 30);
            this.body.setOffset(this.width / 2 - 25, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    public update(input: any) {
        if (this.isDead) return;
        this.setAngle(0);

        // --- JUMP LOGIC (2.5D) ---
        if (input.space && !this.isJumping && !this.isAttacking) {
            this.isJumping = true;
            
            // Visual jump only (physics body stays on ground for shadows)
            this.scene.tweens.add({
                targets: this,
                displayOriginY: this.height + 150, // Moves sprite visual UP
                duration: 350,
                yoyo: true,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    this.isJumping = false;
                    this.displayOriginY = this.height; // Reset origin
                }
            });
        }

        // --- DASH LOGIC ---
        const now = this.scene.time.now;
        if (input.left || input.right) {
            const dir = input.left ? 'left' : 'right';
            if (this.lastKey !== dir) {
                if (now - this.lastKeyTime < 250) this.isRunning = true;
                this.lastKey = dir; this.lastKeyTime = now;
            }
        } else { this.isRunning = false; this.lastKey = ''; }

        // --- COMBO INPUT LOGIC (Disabled while jumping) ---
        if ((input.punch || input.kicking) && !this.isJumping) {
            const attackType = input.punch ? 'punch' : 'kick';
            if (!this.isAttacking) {
                this.executeAttack(attackType);
            } else {
                this.queuedAttackType = attackType;
            }
            return; 
        }

        // --- MOVEMENT LOGIC (Only if not attacking) ---
        if (!this.isAttacking) {
            const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
            let vx = input.left ? -speed : (input.right ? speed : 0);
            
            // Prevent up/down movement while mid-air
            let vy = 0;
            if (!this.isJumping) {
                vy = input.up ? -speed * 0.6 : (input.down ? speed * 0.6 : 0);
            }
            
            this.setVelocity(vx, vy);
            if (vx !== 0) this.setFlipX(vx < 0);
            
            if (vx !== 0 || vy !== 0) {
                const anim = this.isRunning ? `${this.characterName}-run` : `${this.characterName}-walk`;
                this.play(this.scene.anims.exists(anim) ? anim : `${this.characterName}-walk`, true);
            } else {
                if (!this.isJumping) this.play(`${this.characterName}-idle`, true);
            }
        }
    }

    // --- COMBO EXECUTION ENGINE ---
    private executeAttack(type: 'punch' | 'kick') {
        this.isAttacking = true;
        this.setVelocity(0, 0);

        const animName = `${this.characterName}-${type}-${this.comboStep}`;
        const animToPlay = this.scene.anims.exists(animName) ? animName : `${this.characterName}-${type}-1`;
        
        if (this.scene.anims.exists(animToPlay)) {
            this.play(animToPlay, true);
        }

        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -50 : 50), this.y - 40, 60, 60);
        this.scene.physics.add.existing(hitZone);
        this.scene.physics.add.overlap(hitZone, (this.scene as any).enemies, (hz, enemy: any) => {
            const damage = (this.comboStep === 2 ? 15 : 10) * this.damageMultiplier;
            if (enemy.takeDamage) enemy.takeDamage(damage);
            hitZone.destroy(); 
        });

        this.comboStep = this.comboStep === 1 ? 2 : 1;

        if (this.comboResetTimer) this.comboResetTimer.remove();
        this.comboResetTimer = this.scene.time.delayedCall(600, () => {
            this.comboStep = 1;
            this.queuedAttackType = null;
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            
            if (this.queuedAttackType) {
                const nextAttack = this.queuedAttackType;
                this.queuedAttackType = null;
                this.executeAttack(nextAttack);
            } else {
                this.isAttacking = false;
                this.smfMeter = Math.min(this.smfMeter + 5, 100);
                (this.scene as any).updateReactHUD();
            }
        });
    }

    public takeDamage(amount: number) {
        this.health -= amount;
        this.comboStep = 1;
        this.queuedAttackType = null;
        
        if (this.health <= 0) {
            this.die();
        } else {
            const dmgAnim = `${this.characterName}-damage`;
            if (this.scene.anims.exists(dmgAnim)) {
                this.isAttacking = true; 
                this.play(dmgAnim, true);
                this.once('animationcomplete', () => { this.isAttacking = false; });
            } else {
                this.setTint(0xff0000);
                this.scene.time.delayedCall(200, () => this.clearTint());
            }
        }
        (this.scene as any).updateReactHUD();
    }

    private die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        const dieAnim = `${this.characterName}-die`;
        if (this.scene.anims.exists(dieAnim)) this.play(dieAnim, true);
    }
}
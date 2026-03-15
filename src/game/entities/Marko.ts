import Phaser from 'phaser';

export class Marko extends Phaser.Physics.Arcade.Sprite {
    public health: number = 100;
    public smfMeter: number = 0;
    public characterName: string = 'marko';
    public damageMultiplier: number = 1.0;
    public isAttacking: boolean = false;
    public isDead: boolean = false;

    // Movement Stats
    private walkSpeed: number = 160;
    private runSpeed: number = 320;
    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;

    // --- COMBO SYSTEM VARIABLES ---
    private comboStep: number = 1; // Tracks if we are on -1 or -2
    private comboResetTimer: Phaser.Time.TimerEvent | null = null;
    private queuedAttackType: 'punch' | 'kick' | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'marko', 'marko-idle/frame_000.png');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setOrigin(0.5, 1);
        if (this.body) {
            this.body.setSize(80, 30);
            this.body.setOffset(this.width / 2 - 40, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    public update(input: any) {
        if (this.isDead) return;
        this.setAngle(0);

        // --- DASH LOGIC ---
        const now = this.scene.time.now;
        if (input.left || input.right) {
            const dir = input.left ? 'left' : 'right';
            if (this.lastKey !== dir) {
                if (now - this.lastKeyTime < 250) this.isRunning = true;
                this.lastKey = dir; this.lastKeyTime = now;
            }
        } else { this.isRunning = false; this.lastKey = ''; }

        // --- COMBO INPUT LOGIC ---
        if (input.punch || input.kicking) {
            const attackType = input.punch ? 'punch' : 'kick';
            
            if (!this.isAttacking) {
                // If not attacking, start the attack immediately
                this.executeAttack(attackType);
            } else {
                // If already animating, queue the next move so it chains smoothly!
                this.queuedAttackType = attackType;
            }
            return; 
        }

        // --- MOVEMENT LOGIC (Only if not attacking) ---
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

    // --- THE COMBO EXECUTION ENGINE ---
    private executeAttack(type: 'punch' | 'kick') {
        this.isAttacking = true;
        this.setVelocity(0, 0); // Stop moving while hitting

        // 1. Determine which animation to play (e.g., 'marko-punch-1' or 'marko-punch-2')
        const animName = `${this.characterName}-${type}-${this.comboStep}`;
        
        // Failsafe: If -2 doesn't exist, just play -1 again
        const animToPlay = this.scene.anims.exists(animName) ? animName : `${this.characterName}-${type}-1`;
        
        // 2. Play it!
        if (this.scene.anims.exists(animToPlay)) {
            this.play(animToPlay, true);
        }

        // 3. Deal Damage Hitbox (Simplified)
        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -50 : 50), this.y - 40, 60, 60);
        this.scene.physics.add.existing(hitZone);
        this.scene.physics.add.overlap(hitZone, (this.scene as any).enemies, (hz, enemy: any) => {
            // If it's the 2nd combo step, deal slightly more damage!
            const damage = (this.comboStep === 2 ? 15 : 10) * this.damageMultiplier;
            if (enemy.takeDamage) enemy.takeDamage(damage);
            hitZone.destroy(); 
        });

        // 4. Advance the combo step (1 becomes 2, 2 resets to 1)
        this.comboStep = this.comboStep === 1 ? 2 : 1;

        // 5. Reset the Combo Timer (600ms window to press the next button)
        if (this.comboResetTimer) this.comboResetTimer.remove();
        this.comboResetTimer = this.scene.time.delayedCall(600, () => {
            this.comboStep = 1; // Reset back to step 1 if player stops attacking
            this.queuedAttackType = null;
        });

        // 6. When the animation finishes, check if they queued up another hit!
        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy(); // Cleanup hitbox if it missed
            
            if (this.queuedAttackType) {
                // Instantly chain into the next attack
                const nextAttack = this.queuedAttackType;
                this.queuedAttackType = null;
                this.executeAttack(nextAttack);
            } else {
                // Combo finished, return to idle/movement
                this.isAttacking = false;
                this.smfMeter = Math.min(this.smfMeter + 5, 100);
                (this.scene as any).updateReactHUD();
            }
        });
    }

    public takeDamage(amount: number) {
        this.health -= amount;
        
        // Getting hit breaks your combo!
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
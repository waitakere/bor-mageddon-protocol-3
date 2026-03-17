import Phaser from 'phaser';

export class Maja extends Phaser.Physics.Arcade.Sprite {
    public health: number = 150;
    public maxHealth: number = 150; 
    public smfMeter: number = 0;
    public characterName: string = 'maja';
    public damageMultiplier: number = 1.5;
    public isAttacking: boolean = false;
    public isDead: boolean = false;
    public isJumping: boolean = false;

    // SPEED BUFFS (Increased to cover more ground)
    private walkSpeed: number = 160;
    private runSpeed: number = 320;
    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;
    private queuedAction: string | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'maja', 'maja-idle/frame_000.png');
        scene.add.existing(this); scene.physics.add.existing(this);
        
        this.setOrigin(0.5, 1);
        this.setScale(1.7); 

        if (this.body) {
            this.body.setSize(60, 30); this.body.setOffset(this.width / 2 - 30, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    public update(input: any) {
        if (this.isDead) return;
        this.setAngle(0);

        if (input.space && !this.isJumping && !this.isAttacking) {
            this.isJumping = true;
            (this.scene as any).playSFX('jump'); 
            this.scene.tweens.add({ targets: this, displayOriginY: this.height + 150, duration: 350, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => { this.isJumping = false; this.displayOriginY = this.height; }});
        }

        const now = this.scene.time.now;
        if (input.left || input.right) {
            const dir = input.left ? 'left' : 'right';
            if (this.lastKey !== dir) { if (now - this.lastKeyTime < 250) this.isRunning = true; this.lastKey = dir; this.lastKeyTime = now; }
        } else { this.isRunning = false; this.lastKey = ''; }

        let requestedAction: string | null = null;
        if (input.special) requestedAction = 'special';
        else if (input.finisher) requestedAction = 'finisher';
        else if (input.p1) requestedAction = 'punch-1';
        else if (input.p2) requestedAction = 'punch-2';
        else if (input.k1) requestedAction = 'kick-1';
        else if (input.k2) requestedAction = 'kick-2';

        if (requestedAction) {
            // AERIAL COMBAT TRIGGER
            if (this.isJumping && !this.isAttacking) {
                if (requestedAction.includes('punch') || requestedAction.includes('kick')) {
                    this.executeJumpAttack(requestedAction);
                }
            } else if (!this.isJumping && !this.isAttacking) {
                this.executeAction(requestedAction);
            } else {
                this.queuedAction = requestedAction;
            }
            return; 
        }

        if (!this.isAttacking) {
            const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
            let vx = input.left ? -speed : (input.right ? speed : 0);
            let vy = 0;
            if (!this.isJumping) vy = input.up ? -speed * 0.6 : (input.down ? speed * 0.6 : 0);
            this.setVelocity(vx, vy);
            if (vx !== 0) this.setFlipX(vx < 0);
            if (vx !== 0 || vy !== 0) {
                const anim = this.isRunning ? `${this.characterName}-run` : `${this.characterName}-walk`;
                this.play(this.scene.anims.exists(anim) ? anim : `${this.characterName}-walk`, true);
            } else { if (!this.isJumping) this.play(`${this.characterName}-idle`, true); }
        }
    }

    // NEW: JUMP ATTACKS
    private executeJumpAttack(action: string) {
        this.isAttacking = true;
        const type = action.includes('punch') ? 'jump-punch' : 'jump-kick';
        const animToPlay = `${this.characterName}-${type}`;
        
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true);
        else this.play(`${this.characterName}-kick-1`, true); // Fallback if sprite missing
        
        (this.scene as any).playSFX('woosh');

        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -60 : 60), this.y - 100, 90, 90);
        this.scene.physics.add.existing(hitZone);
        
        this.scene.physics.add.overlap(hitZone, (this.scene as any).enemies, (hz, enemy: any) => {
            if (Math.abs(this.y - enemy.y) <= 45) { 
                const damage = 15 * this.damageMultiplier;
                const hitX = (this.x + enemy.x) / 2;
                (this.scene as any).spawnHitEffect(hitX, enemy.y - 80);
                if (enemy.takeDamage) enemy.takeDamage(damage); 
                hitZone.destroy(); 
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            this.isAttacking = false;
        });
    }

    private executeAction(action: string) {
        if (action === 'special') { if (this.smfMeter >= 25) { this.executeBalkanSuplex(); return; } action = 'punch-2'; }
        if (action === 'finisher') { if (this.smfMeter >= 100) { this.executeIndustrialDrill(); return; } action = 'kick-2'; }

        this.isAttacking = true; this.setVelocity(0, 0);
        const animToPlay = `${this.characterName}-${action}`;
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true);

        (this.scene as any).playSFX('woosh'); 

        // REACH BUFF: Width increased to 110, X-offset pushed to 80
        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -80 : 80), this.y - 40, 110, 80);
        this.scene.physics.add.existing(hitZone);
        
        this.scene.physics.add.overlap(hitZone, (this.scene as any).enemies, (hz, enemy: any) => {
            if (Math.abs(this.y - enemy.y) <= 45) { 
                const damage = (action.includes('2') ? 15 : 10) * this.damageMultiplier;
                const hitX = (this.x + enemy.x) / 2;
                (this.scene as any).spawnHitEffect(hitX, enemy.y - 50);
                if (enemy.takeDamage) enemy.takeDamage(damage); 
                hitZone.destroy(); 
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            if (this.queuedAction) { const next = this.queuedAction; this.queuedAction = null; this.executeAction(next); } 
            else { this.isAttacking = false; this.smfMeter = Math.min(this.smfMeter + 5, 100); (this.scene as any).updateReactHUD(); }
        });
    }

    // ... [executeBalkanSuplex, executeIndustrialDrill, takeDamage, die remain exactly the same as previous] ...
import Phaser from 'phaser';

export class Marko extends Phaser.Physics.Arcade.Sprite {
    public health: number = 100;
    public maxHealth: number = 100;
    public smfMeter: number = 0;
    public characterName: string = 'marko';
    public damageMultiplier: number = 1.0;
    public isAttacking: boolean = false;
    public isDead: boolean = false;
    public isJumping: boolean = false;

    private walkSpeed: number = 160;
    private runSpeed: number = 320;
    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;
    private queuedAction: string | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'marko', 'marko-idle/frame_000.png');
        scene.add.existing(this); scene.physics.add.existing(this);
        
        this.setOrigin(0.5, 1);
        this.setScale(1.7); 

        if (this.body) {
            this.body.setSize(80, 30); this.body.setOffset(this.width / 2 - 40, this.height - 30);
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

        if (requestedAction && !this.isJumping) {
            if (!this.isAttacking) this.executeAction(requestedAction);
            else this.queuedAction = requestedAction;
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

    private executeAction(action: string) {
        if (action === 'special') { if (this.smfMeter >= 25) { this.executeMegaphoneScream(); return; } action = 'punch-1'; }
        if (action === 'finisher') { if (this.smfMeter >= 100) { this.executeChainWhip(); return; } action = 'kick-2'; }

        this.isAttacking = true; this.setVelocity(0, 0);
        const animToPlay = `${this.characterName}-${action}`;
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true);
        
        (this.scene as any).playSFX('woosh');

        // Expanded hitbox for depth leeway
        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -60 : 60), this.y - 40, 80, 80);
        this.scene.physics.add.existing(hitZone);
        
        this.scene.physics.add.overlap(hitZone, (this.scene as any).enemies, (hz, enemy: any) => {
            // --- 2.5D DEPTH TOLERANCE CHECK (Y-Axis Lane) ---
            if (Math.abs(this.y - enemy.y) <= 45) { // 45px vertical leeway
                const damage = (action.includes('2') ? 15 : 10) * this.damageMultiplier;
                
                // Spawn explosion dead center between them
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

    private executeMegaphoneScream() {
        this.isAttacking = true; this.setVelocity(0, 0); this.smfMeter -= 25; (this.scene as any).updateReactHUD();
        const anim = this.scene.anims.exists('marko-special') ? 'marko-special' : 'marko-punch-2';
        this.play(anim, true);
        (this.scene as any).playSFX('special_sound');
        
        this.scene.cameras.main.shake(300, 0.01);
        const direction = this.flipX ? -1 : 1;
        const waveZone = this.scene.add.zone(this.x + (100 * direction), this.y - 40, 200, 100);
        this.scene.physics.add.existing(waveZone);
        
        this.scene.physics.add.overlap(waveZone, (this.scene as any).enemies, (wz, enemy: any) => {
            if (Math.abs(this.y - enemy.y) <= 60) { // Slightly wider depth for special
                if (enemy.takeDamage) { enemy.takeDamage(20 * this.damageMultiplier); if (enemy.body) enemy.setVelocityX(200 * direction); }
                (this.scene as any).spawnHitEffect(enemy.x, enemy.y - 50);
            }
        });
        this.scene.time.delayedCall(250, () => { if (waveZone.active) waveZone.destroy(); });
        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    private executeChainWhip() {
        this.isAttacking = true; this.smfMeter = 0; (this.scene as any).updateReactHUD();
        const anim = this.scene.anims.exists('marko-finisher') ? 'marko-finisher' : 'marko-kick-2';
        this.play(anim, true);
        (this.scene as any).playSFX('special_sound');

        this.scene.cameras.main.shake(600, 0.02);
        const spinZone = this.scene.add.circle(this.x, this.y - 40, 150);
        this.scene.physics.add.existing(spinZone);
        
        this.scene.physics.overlap(spinZone, (this.scene as any).enemies, (sz, enemy: any) => {
            if (Math.abs(this.y - enemy.y) <= 80) { // Big radius
                if (enemy.takeDamage) { enemy.takeDamage(90 * this.damageMultiplier); if (enemy.body) enemy.setVelocityY(-200); }
                (this.scene as any).spawnHitEffect(enemy.x, enemy.y - 50);
            }
        });
        this.scene.time.delayedCall(200, () => { if (spinZone.active) spinZone.destroy(); });
        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    public takeDamage(amount: number) {
        this.health -= amount; this.queuedAction = null;
        
        (this.scene as any).spawnHitEffect(this.x, this.y - 40);
        (this.scene as any).playSFX('hit_light');

        if (this.health <= 0) { this.die(); } 
        else {
            const dmgAnim = `${this.characterName}-damage`;
            if (this.scene.anims.exists(dmgAnim)) { this.isAttacking = true; this.play(dmgAnim, true); this.once('animationcomplete', () => { this.isAttacking = false; }); } 
            else { this.setTint(0xff0000); this.scene.time.delayedCall(200, () => this.clearTint()); }
        }
        (this.scene as any).updateReactHUD();
    }

    private die() { this.isDead = true; this.setVelocity(0, 0); const dieAnim = `${this.characterName}-die`; if (this.scene.anims.exists(dieAnim)) this.play(dieAnim, true); }
}
import Phaser from 'phaser';

export class Maja extends Phaser.Physics.Arcade.Sprite {
    public health: number = 150;
    public maxHealth: number = 150; // Added for item healing cap
    public smfMeter: number = 0;
    public characterName: string = 'maja';
    public damageMultiplier: number = 1.5;
    public isAttacking: boolean = false;
    public isDead: boolean = false;
    public isJumping: boolean = false;

    private walkSpeed: number = 110;
    private runSpeed: number = 220;
    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;
    private queuedAction: string | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'maja', 'maja-idle/frame_000.png');
        scene.add.existing(this); scene.physics.add.existing(this);
        
        this.setOrigin(0.5, 1);
        this.setScale(1.7); // SCALING FIX: Match enemy proportions

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
            (this.scene as any).playSFX('jump'); // JUMP AUDIO
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
        if (action === 'special') { if (this.smfMeter >= 25) { this.executeBalkanSuplex(); return; } action = 'punch-2'; }
        if (action === 'finisher') { if (this.smfMeter >= 100) { this.executeIndustrialDrill(); return; } action = 'kick-2'; }

        this.isAttacking = true; this.setVelocity(0, 0);
        const animToPlay = `${this.characterName}-${action}`;
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true);

        (this.scene as any).playSFX('woosh'); // ATTACK AUDIO

        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -60 : 60), this.y - 40, 70, 60);
        this.scene.physics.add.existing(hitZone);
        this.scene.physics.add.overlap(hitZone, (this.scene as any).enemies, (hz, enemy: any) => {
            const damage = (action.includes('2') ? 15 : 10) * this.damageMultiplier;
            if (enemy.takeDamage) enemy.takeDamage(damage); hitZone.destroy(); 
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            if (this.queuedAction) { const next = this.queuedAction; this.queuedAction = null; this.executeAction(next); } 
            else { this.isAttacking = false; this.smfMeter = Math.min(this.smfMeter + 5, 100); (this.scene as any).updateReactHUD(); }
        });
    }

    private executeBalkanSuplex() {
        this.isAttacking = true; this.setVelocity(0, 0);
        const grabZone = this.scene.add.zone(this.x + (this.flipX ? -50 : 50), this.y - 40, 60, 60);
        this.scene.physics.add.existing(grabZone);
        let grabbedEnemy: any = null;
        this.scene.physics.overlap(grabZone, (this.scene as any).enemies, (gz, enemy: any) => { if (!grabbedEnemy && !enemy.isDead) grabbedEnemy = enemy; });
        grabZone.destroy(); 

        if (grabbedEnemy) {
            this.smfMeter -= 25; (this.scene as any).updateReactHUD();
            const anim = this.scene.anims.exists('maja-special') ? 'maja-special' : 'maja-punch-1';
            this.play(anim, true);
            grabbedEnemy.setVelocity(0, 0);
            
            this.scene.time.delayedCall(200, () => { 
                this.scene.cameras.main.shake(300, 0.02); 
                grabbedEnemy.takeDamage(40 * this.damageMultiplier); 
                (this.scene as any).playSFX('hit_heavy'); // SUPLEX IMPACT
            });
            this.once('animationcomplete', () => { this.isAttacking = false; });
        } else { this.play('maja-idle', true); this.scene.time.delayedCall(300, () => { this.isAttacking = false; }); }
    }

    private executeIndustrialDrill() {
        this.isAttacking = true; this.smfMeter = 0; (this.scene as any).updateReactHUD();
        const anim = this.scene.anims.exists('maja-finisher') ? 'maja-finisher' : 'maja-run';
        this.play(anim, true);
        
        (this.scene as any).playSFX('special_sound');

        const direction = this.flipX ? -1 : 1;
        this.setVelocityX(500 * direction); this.scene.cameras.main.shake(600, 0.01);
        const drillZone = this.scene.add.zone(this.x, this.y, 100, 80);
        this.scene.physics.add.existing(drillZone);
        const drillUpdate = () => {
            if (!drillZone.active) return;
            drillZone.setPosition(this.x + (60 * direction), this.y - 40);
            this.scene.physics.overlap(drillZone, (this.scene as any).enemies, (dz, enemy: any) => { if (enemy.takeDamage) enemy.takeDamage(5); });
        };
        this.scene.events.on('update', drillUpdate);
        this.scene.time.delayedCall(600, () => { this.setVelocityX(0); drillZone.destroy(); this.scene.events.off('update', drillUpdate); this.isAttacking = false; });
    }

    public takeDamage(amount: number) {
        this.health -= amount; this.queuedAction = null;

        // IMPACT VISUALS & AUDIO
        (this.scene as any).spawnHitEffect(this.x, this.y - 40);
        (this.scene as any).playSFX('hit_heavy');

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